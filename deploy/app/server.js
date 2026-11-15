// The bakery: storefront, reservations, live updates and the baker's locked admin. Plain Node, no dependencies.
// Logging rule: only "bakery on <port>". No names, tokens, headers or bodies ever reach a log line.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PORT, DEMO, DB_PATH, VOLUME_DIR } from './config.js';
import { openBakery, NAME_MAX } from './bakery.js';

const here = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC_DIR = path.join(here, 'public');
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim(); // empty = every admin route answers 401
const bakery = openBakery(DB_PATH);

// ---------- volume health (kept from the placeholder) ----------
let volumeError = null; // an error code such as EACCES, never a path or secret
function volumeOk() {
  if (!VOLUME_DIR) { volumeError = 'no volume'; return false; }
  if (!DB_PATH.startsWith(VOLUME_DIR + '/')) { volumeError = 'DB_PATH is not on the volume'; return false; }
  try { const f = path.join(VOLUME_DIR, '.health'); fs.writeFileSync(f, String(Date.now())); fs.unlinkSync(f); volumeError = null; return true; }
  catch (e) { volumeError = e.code || 'write failed'; return false; }
}

// ---------- small helpers ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
};

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

const isHttps = (req) => req.headers['x-forwarded-proto'] === 'https';
function addCookie(res, cookie) {
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : cookie);
}

/** The device id: a random cookie, set on the first request that has none. */
function deviceOf(req, res) {
  const have = parseCookies(req).device;
  if (have && /^[a-f0-9]{32}$/.test(have)) return have;
  const id = crypto.randomBytes(16).toString('hex');
  addCookie(res, `device=${id}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${isHttps(req) ? '; Secure' : ''}`);
  return id;
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
function tokenMatches(candidate) {
  if (!ADMIN_TOKEN || typeof candidate !== 'string' || !candidate) return false;
  return crypto.timingSafeEqual(sha(candidate), sha(ADMIN_TOKEN)); // equal-length digests, constant time
}
function isAdmin(req) {
  if (!ADMIN_TOKEN) return false;
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (m && tokenMatches(m[1].trim())) return true;
  const c = parseCookies(req).admin;
  if (c) { try { return tokenMatches(decodeURIComponent(c)); } catch { return false; } }
  return false;
}

/** "Now" for this request. Only a valid admin token can move the clock. */
function nowFor(req, admin) {
  const h = req.headers['x-test-now'];
  if (admin && typeof h === 'string') { const t = Date.parse(h); if (Number.isFinite(t)) return t; }
  return Date.now();
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('too big'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const text = await readBody(req);
  if (!text.trim()) return { value: undefined };
  try { return { value: JSON.parse(text) }; } catch { return { invalid: true }; }
}

// ---------- live streams ----------
const statusStreams = new Map(); // reservation id -> Set(res)
const shelfWatchers = new Set(); // storefronts
const adminWatchers = new Set(); // the baker's page

function openStream(req, res, set) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  set.add(res);
  req.on('close', () => { set.delete(res); if (set.size === 0) for (const [k, v] of statusStreams) if (v === set) statusStreams.delete(k); });
}
const send = (res, data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

function publishStatus(id) {
  const r = bakery.reservation(id);
  const set = statusStreams.get(id);
  if (!r || !set) return;
  for (const res of set) send(res, { status: r.status, message: r.message });
}
function shelfChanged() { for (const res of shelfWatchers) send(res, { changed: true }); }
function adminChanged() { for (const res of adminWatchers) send(res, { changed: true }); }
function changed() { shelfChanged(); adminChanged(); }

function sweep(now) {
  const released = bakery.sweep(now);
  if (released.length) { released.forEach(publishStatus); changed(); }
}
const timer = setInterval(() => { sweep(Date.now()); bakery.tidyAttempts(); for (const s of [shelfWatchers, adminWatchers]) for (const r of s) r.write(': ping\n\n'); for (const set of statusStreams.values()) for (const r of set) r.write(': ping\n\n'); }, 5000);
timer.unref();

// ---------- customer API ----------
async function postReservation(req, res, device) {
  if (!bakery.allowAttempt(device)) return sendJson(res, 429, { error: 'rate_limited' });
  let body;
  try { body = await readJson(req); } catch (e) { return sendJson(res, e.status || 400, { error: 'bad_reservation', message: 'That request was too large.' }); }
  const b = body.value;
  if (body.invalid || !b || typeof b !== 'object' || Array.isArray(b)) {
    return sendJson(res, 400, { error: 'bad_reservation', message: 'Tell us the loaf and your first name.' });
  }
  for (const k of Object.keys(b)) if (k !== 'loaf_id' && k !== 'first_name') return sendJson(res, 400, { error: 'field_not_allowed', field: k });
  if (typeof b.loaf_id !== 'string' || !bakery.loafExists(b.loaf_id)) return sendJson(res, 400, { error: 'bad_reservation', message: "We don't have that loaf." });
  const name = typeof b.first_name === 'string' ? b.first_name.trim() : '';
  if (!name) return sendJson(res, 400, { error: 'bad_reservation', message: 'We just need a first name.' });
  if ([...name].length > NAME_MAX) return sendJson(res, 400, { error: 'bad_reservation', message: `A first name is enough, ${NAME_MAX} letters at most.` });
  if (/[\u0000-\u001f\u007f]/.test(name)) return sendJson(res, 400, { error: 'bad_reservation', message: 'Letters only, please.' });

  const out = bakery.reserve(device, b.loaf_id, name, Date.now());
  if (out.error === 'already_reserved') {
    return sendJson(res, 409, { error: 'already_reserved', message: `You already have a ${out.loaf.name.toLowerCase()} this bake, ${name}. One of each per person, so everyone gets a turn.` });
  }
  if (out.error === 'sold_out') return sendJson(res, 409, { error: 'sold_out', message: 'Sold out for today' });
  changed();
  return sendJson(res, 201, out.reservation);
}

// ---------- admin ----------
const lockedPage = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Locked</title><body style="font:24px Georgia,serif;background:#F4EEE4;color:#241A12;padding:15vh 10vw"><h1>Locked</h1><p>This is the baker\'s page.</p>';

function sendAdminPage(res) {
  const html = fs.readFileSync(path.join(here, 'views', 'admin.html'));
  res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
  res.end(html);
}

async function adminRoute(req, res, url, now) {
  const p = url.pathname, m = req.method;
  const routes = {
    'GET /api/admin/orders': () => sendJson(res, 200, { orders: bakery.orders() }),
    'GET /api/admin/stock': () => sendJson(res, 200, { loaves: bakery.stock() }),
    'GET /api/admin/settings': () => sendJson(res, 200, bakery.settings()),
    'POST /api/admin/deliver': () => {
      const ids = bakery.deliver();
      ids.forEach(publishStatus); changed();
      sendJson(res, 200, { delivered: ids.length });
    },
    'POST /api/admin/restock': () => { const out = bakery.restock(); changed(); sendJson(res, 200, out); },
    'POST /api/admin/reset': () => {
      const ids = bakery.reset();
      for (const id of ids) {
        const set = statusStreams.get(id);
        if (set) for (const r of set) { send(r, { status: 'released', message: 'The bakery was reset. Reserve again whenever you like.' }); r.end(); }
        statusStreams.delete(id);
      }
      changed(); sendJson(res, 200, { ok: true });
    },
  };
  if (m === 'GET' && p === '/api/admin/events') {
    openStream(req, res, adminWatchers); send(res, { changed: true }); return;
  }
  if (m === 'POST' && p === '/api/admin/settings') {
    let body;
    try { body = await readJson(req); } catch { return sendJson(res, 400, { error: 'bad_settings', message: 'Too large.' }); }
    if (body.invalid || body.value === undefined) return sendJson(res, 400, { error: 'bad_settings', message: 'Send JSON.' });
    const problem = bakery.updateSettings(body.value);
    if (problem) return sendJson(res, 400, { error: 'bad_settings', message: problem });
    changed();
    return sendJson(res, 200, bakery.settings());
  }
  const handler = routes[`${m} ${p}`];
  if (handler) return handler();
  const known = Object.keys(routes).some((k) => k.split(' ')[1] === p) || ['/api/admin/settings'].includes(p);
  return sendJson(res, known ? 405 : 404, { error: known ? 'method_not_allowed' : 'not_found' });
}

// ---------- static files ----------
function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return sendJson(res, 400, { error: 'bad_request' }); }
  if (rel === '/') rel = '/index.html';
  if (rel.includes('\0') || rel.split('/').includes('..')) return sendJson(res, 404, { error: 'not_found' });
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 404, { error: 'not_found' });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return sendJson(res, 404, { error: 'not_found' });
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size,
      'Cache-Control': rel.startsWith('/img/') ? 'public, max-age=86400' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

// ---------- the server ----------
async function handle(req, res) {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/health') {
    return sendJson(res, 200, { ok: true, demo: DEMO, volume: volumeOk(), mount: process.env.RAILWAY_VOLUME_MOUNT_PATH || null, volumeError, uid: process.getuid?.() ?? null });
  }

  // The baker's side: everything here is locked unless the token is right.
  if (p === '/admin' || p.startsWith('/api/admin/')) {
    if (p === '/admin' && req.method === 'GET' && url.searchParams.has('t')) {
      // One-time link: swap the token for an HttpOnly cookie, then land on a clean address.
      if (!tokenMatches(url.searchParams.get('t'))) { res.writeHead(401, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' }); return res.end(lockedPage); }
      addCookie(res, `admin=${encodeURIComponent(ADMIN_TOKEN)}; Path=/; Max-Age=43200; HttpOnly; SameSite=Strict${isHttps(req) ? '; Secure' : ''}`);
      res.writeHead(302, { Location: '/admin', 'Cache-Control': 'no-store' });
      return res.end();
    }
    if (!isAdmin(req)) {
      if (p === '/admin') { res.writeHead(401, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' }); return res.end(lockedPage); }
      return sendJson(res, 401, { error: 'locked' });
    }
    const now = nowFor(req, true);
    sweep(now);
    if (p === '/admin') return req.method === 'GET' || req.method === 'HEAD' ? sendAdminPage(res) : sendJson(res, 405, { error: 'method_not_allowed' });
    return adminRoute(req, res, url, now);
  }

  // Customer side
  const admin = isAdmin(req);
  sweep(nowFor(req, admin));

  if (p === '/api/loaves' && req.method === 'GET') { deviceOf(req, res); return sendJson(res, 200, bakery.loaves()); }
  if (p === '/api/events' && req.method === 'GET') { openStream(req, res, shelfWatchers); send(res, { changed: true }); return; }
  if (p === '/api/reservations' && req.method === 'POST') return postReservation(req, res, deviceOf(req, res));
  const m = /^\/api\/reservations\/([A-Za-z0-9_-]{1,64})(\/events)?$/.exec(p);
  if (m && req.method === 'GET') {
    const r = bakery.reservation(m[1]);
    if (!r) return sendJson(res, 404, { error: 'not_found' });
    if (!m[2]) return sendJson(res, 200, r);
    let set = statusStreams.get(r.id);
    if (!set) { set = new Set(); statusStreams.set(r.id, set); }
    openStream(req, res, set);
    send(res, { status: r.status, message: r.message });
    return;
  }
  if (p.startsWith('/api/')) return sendJson(res, 404, { error: 'not_found' });

  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'method_not_allowed' });
  if (p === '/' || p === '/index.html') deviceOf(req, res); // a visitor gets their device id as they arrive
  return serveStatic(req, res, p);
}

const server = http.createServer((req, res) => {
  Promise.resolve(handle(req, res)).catch((e) => {
    console.error('request failed', e?.name || 'Error'); // the name of the failure only; never its message
    if (!res.headersSent) sendJson(res, 500, { error: 'server_error' }); else res.end();
  });
});
server.listen(PORT, () => console.log(`bakery on ${PORT}`));

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { server.close(); bakery.close(); process.exit(0); });
