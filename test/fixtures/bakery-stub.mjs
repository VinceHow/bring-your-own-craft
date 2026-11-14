// A throwaway stand-in for the team-built bakery, only to prove deploy/acceptance/bakery.acceptance.js runs and has
// teeth. In-memory node:http keeping deploy/ACCEPTANCE.md. STUB_FLAW=<flaw> breaks one rule on purpose so
// test/acceptance.test.js can check the suite catches it:
//   field · twice · nodrop · nocollection · soldout · race · nosse · restock · reset · adminopen · logname · ratelimit · hold · clock
// Never deployed.
import http from 'node:http';
import crypto from 'node:crypto';

// `npm test` (node --test) globs test/**, so it loads this file as a test: there it does nothing, rather than listen forever.
if (process.env.NODE_TEST_CONTEXT) process.exit(0);

const PORT = Number(process.env.PORT) || 0;
const FLAW = process.env.STUB_FLAW || '';
const TOKEN = process.env.ADMIN_TOKEN || '';
const ITEMS = [
  { id: 'sourdough', name: 'Sourdough', tier: 'rare', description: 'Still warm at 7.', start: 3 },
  { id: 'baguette', name: 'Baguette', tier: 'medium', description: 'Crackly, made this morning.', start: 8 },
  { id: 'roll', name: 'Morning roll', tier: 'plentiful', description: 'Your usual?', start: 40 },
];
let stock, orders, seq, rate, drop, holdMin = 15;
const watchers = new Map(); // reservation id -> Set of open SSE responses
function restock() { stock = Object.fromEntries(ITEMS.map(l => [l.id, l.start])); }
function reset() { restock(); orders = []; seq = 0; rate = new Map(); drop = 1; }
reset();

const log = (...a) => console.log(new Date().toISOString(), ...a);
const send = (res, status, body, extra = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...extra }); res.end(JSON.stringify(body)); };
const item = id => ITEMS.find(l => l.id === id);
const loafView = l => { const left = stock[l.id]; return { id: l.id, name: l.name, tier: l.tier, description: l.description, start: l.start, left, sold_out: left <= 0, label: left <= 0 && FLAW !== 'soldout' ? 'Sold out for today' : `${left} left` }; };
const statusMsg = o => o.status === 'released' ? 'Your reservation was released.' : o.status === 'delivered' ? `Delivered: your ${item(o.loaf_id).name.toLowerCase()} is here` : `Your ${item(o.loaf_id).name.toLowerCase()} is reserved, ${o.first_name}.`;
const view = o => ({ id: o.id, loaf_id: o.loaf_id, first_name: o.first_name, status: o.status, drop: o.drop, message: statusMsg(o) });
const push = o => { if (FLAW === 'nosse') return; for (const r of watchers.get(o.id) || []) r.write(`data: ${JSON.stringify({ status: o.status, message: statusMsg(o) })}\n\n`); };

// The device: a random id in a cookie, set on first contact.
function deviceOf(req) { const m = String(req.headers.cookie || '').match(/(?:^|;\s*)bakery_device=([\w-]+)/); return m ? m[1] : null; }
// The test clock: X-Test-Now only with a valid admin token (the 'clock' flaw honours it for anyone).
const authed = req => !!TOKEN && req.headers.authorization === `Bearer ${TOKEN}`;
const nowOf = req => { const h = req.headers['x-test-now']; const d = h && (authed(req) || FLAW === 'clock') ? Date.parse(h) : NaN; return isNaN(d) ? Date.now() : d; };
function sweep(now) { // lazily release reservations older than the hold (the 'hold' flaw never does)
  if (FLAW === 'hold') return;
  for (const o of orders) if (o.status === 'reserved' && now - Date.parse(o.at) > holdMin * 60000) { o.status = 'released'; stock[o.loaf_id] += 1; push(o); }
}

async function reserve(body, dev) {
  if (!body || typeof body !== 'object') return [400, { error: 'bad_reservation', message: 'no body' }];
  const extra = Object.keys(body).find(k => k !== 'loaf_id' && k !== 'first_name');
  if (extra && FLAW !== 'field') return [400, { error: 'field_not_allowed', field: extra }];
  const name = String(body.first_name ?? '').trim();
  const l = item(body.loaf_id);
  if (!l || !name || name.length > 30) return [400, { error: 'bad_reservation', message: 'an item and a first name (up to 30 letters)' }];
  const now = Date.now(), hits = (rate.get(dev) || []).filter(t => now - t < 60000); hits.push(now); rate.set(dev, hits);
  if (hits.length > 10 && FLAW !== 'ratelimit') return [429, { error: 'rate_limited' }];
  const mine = o => o.loaf_id === l.id && o.device === dev && o.status !== 'released';
  const held = FLAW === 'twice' ? false : FLAW === 'nodrop' ? orders.some(mine) : orders.some(o => mine(o) && o.drop === drop);
  if (held) return [409, { error: 'already_reserved', message: `You've already got a ${l.name.toLowerCase()} from this bake.` }];
  if (FLAW === 'race') { const seen = stock[l.id]; await new Promise(r => setTimeout(r, 30)); if (seen <= 0) return [409, { error: 'sold_out', message: 'Sold out for today' }]; stock[l.id] = seen - 1; }
  else { if (stock[l.id] <= 0) return [409, { error: 'sold_out', message: 'Sold out for today' }]; stock[l.id] -= 1; }
  const o = { id: 'r' + (++seq), loaf_id: l.id, first_name: name, device: dev, drop, status: 'reserved', at: new Date().toISOString() };
  orders.unshift(o);
  log('reserved', o.id, l.id, ...(FLAW === 'logname' ? [name] : []));
  return [201, view(o)];
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  let raw = ''; for await (const c of req) raw += c;
  let body = null; try { body = raw ? JSON.parse(raw) : null; } catch { return send(res, 400, { error: 'bad_reservation', message: 'not JSON' }); }
  sweep(nowOf(req));
  let dev = deviceOf(req); const cookie = {};
  if (!dev && !u.pathname.startsWith('/api/admin') && u.pathname !== '/admin') { dev = crypto.randomUUID(); cookie['set-cookie'] = `bakery_device=${dev}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`; }
  if (u.pathname === '/admin' || u.pathname.startsWith('/api/admin/')) {
    const ok = TOKEN ? authed(req) : FLAW === 'adminopen'; // fail closed
    if (!ok) return send(res, 401, { error: 'locked' });
    if (u.pathname === '/admin') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<h1>Orders</h1>'); }
    if (req.method === 'GET' && u.pathname === '/api/admin/orders') return send(res, 200, { orders: orders.map(o => ({ id: o.id, first_name: o.first_name, loaf_id: o.loaf_id, drop: o.drop, at: o.at, status: o.status })) });
    if (req.method === 'GET' && u.pathname === '/api/admin/stock') return send(res, 200, { drop, loaves: ITEMS.map(l => { const v = loafView(l); return { id: v.id, name: v.name, tier: v.tier, start: v.start, left: v.left, sold_out: v.sold_out }; }) });
    if (u.pathname === '/api/admin/settings') {
      if (req.method === 'POST') {
        const m = body?.hold_minutes, st = body?.stock;
        if (m === undefined && st === undefined) return send(res, 400, { error: 'bad_settings' });
        if (m !== undefined && !(Number.isInteger(m) && m >= 1 && m <= 240)) return send(res, 400, { error: 'bad_settings' });
        if (st !== undefined && (typeof st !== 'object' || Object.entries(st).some(([k, v]) => !item(k) || !(Number.isInteger(v) && v >= 0 && v <= 500)))) return send(res, 400, { error: 'bad_settings' });
        if (m !== undefined) holdMin = m;
        if (st) for (const [k, v] of Object.entries(st)) item(k).start = v;
      }
      return send(res, 200, { hold_minutes: holdMin, stock: Object.fromEntries(ITEMS.map(l => [l.id, l.start])) });
    }
    if (req.method === 'POST' && u.pathname === '/api/admin/deliver') { const r = orders.filter(o => o.status === 'reserved'); r.forEach(o => { o.status = 'delivered'; push(o); }); log('delivered', r.length); return send(res, 200, { delivered: r.length }); }
    if (req.method === 'POST' && u.pathname === '/api/admin/restock') { if (FLAW !== 'restock') restock(); drop += 1; return send(res, 200, { drop, loaves: ITEMS.map(loafView) }); }
    if (req.method === 'POST' && u.pathname === '/api/admin/reset') { if (FLAW === 'reset') restock(); else reset(); log('reset'); return send(res, 200, { ok: true }); }
    return send(res, 404, { error: 'not_found' });
  }
  if (req.method === 'GET' && u.pathname === '/api/loaves') return send(res, 200, { loaves: ITEMS.map(loafView) }, cookie);
  if (req.method === 'POST' && u.pathname === '/api/reservations') { const [s, b] = await reserve(body, dev); return send(res, s, b, cookie); }
  if (req.method === 'GET' && u.pathname === '/api/collection' && FLAW !== 'nocollection')
    return send(res, 200, { items: orders.filter(o => o.device === dev && o.status === 'delivered').map(o => ({ reservation_id: o.id, loaf_id: o.loaf_id, name: item(o.loaf_id).name, drop: o.drop })) }, cookie);
  const ev = u.pathname.match(/^\/api\/reservations\/([\w-]+)\/events$/);
  if (req.method === 'GET' && ev) {
    const o = orders.find(x => x.id === ev[1]); if (!o) return send(res, 404, { error: 'not_found' });
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify({ status: o.status, message: statusMsg(o) })}\n\n`);
    if (!watchers.has(o.id)) watchers.set(o.id, new Set());
    watchers.get(o.id).add(res); req.on('close', () => watchers.get(o.id)?.delete(res));
    return;
  }
  const one = u.pathname.match(/^\/api\/reservations\/([\w-]+)$/);
  if (req.method === 'GET' && one) { const o = orders.find(x => x.id === one[1]); return o ? send(res, 200, view(o)) : send(res, 404, { error: 'not_found' }); }
  send(res, 404, { error: 'not_found' });
});
server.listen(PORT, '127.0.0.1', () => console.log(`bakery stub on ${server.address().port}`));
