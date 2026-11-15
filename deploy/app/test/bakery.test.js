// Each test is named after the decision or brief rule it proves, with its source in brackets.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const APP = path.resolve(import.meta.dirname, '..');
const TOKEN = 'unit-test-token';
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bakery-test-'));

const freePort = () => new Promise((res) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

async function startApp(env = {}, name = 'main') {
  const port = await freePort();
  const dbPath = path.join(tmp, `${name}.db`);
  const logPath = path.join(tmp, `${name}.log`);
  const out = fs.openSync(logPath, 'w');
  const proc = spawn('node', ['server.js'], { cwd: APP, stdio: ['ignore', out, out], env: { ...process.env, PORT: String(port), DB_PATH: dbPath, ...env } });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/health')).ok) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 50)); }
  return { base, dbPath, logPath, stop: () => proc.kill('SIGTERM') };
}

let app, noToken;
before(async () => { app = await startApp({ ADMIN_TOKEN: TOKEN }); noToken = await startApp({ ADMIN_TOKEN: '' }, 'locked'); });
after(() => { app.stop(); noToken.stop(); fs.rmSync(tmp, { recursive: true, force: true }); });

// ---- helpers ----
const j = async (r) => ({ status: r.status, body: await r.json().catch(() => null), headers: r.headers });
const admin = (p, opts = {}) => fetch(app.base + p, { ...opts, headers: { ...AUTH, 'Content-Type': 'application/json', ...(opts.headers || {}) } }).then(j);
const reset = () => admin('/api/admin/reset', { method: 'POST' });

/** A device: its own cookie. */
async function device() {
  const r = await fetch(app.base + '/api/loaves');
  const cookie = r.headers.get('set-cookie').split(';')[0];
  return {
    cookie,
    reserve: (loaf_id, first_name, extra = {}) => fetch(app.base + '/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ loaf_id, first_name, ...extra }) }).then(j),
  };
}
const loaves = async () => (await j(await fetch(app.base + '/api/loaves'))).body.loaves;
const left = async (id) => (await loaves()).find((l) => l.id === id).left;

/** Reads an event stream and lets a test wait for a matching message. */
function watchEvents(url, headers = {}) {
  const seen = []; const ctl = new AbortController(); let wake = () => {};
  (async () => {
    const r = await fetch(url, { headers, signal: ctl.signal });
    const dec = new TextDecoder(); let buf = '';
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      let i; while ((i = buf.indexOf('\n\n')) >= 0) { const block = buf.slice(0, i); buf = buf.slice(i + 2); for (const line of block.split('\n')) if (line.startsWith('data: ')) { seen.push(JSON.parse(line.slice(6))); wake(); } }
    }
  })().catch(() => {});
  return {
    seen, close: () => ctl.abort(),
    until: (pred, ms = 1500) => new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('no matching event in time')), ms);
      const check = () => { const m = seen.find(pred); if (m) { clearTimeout(t); resolve(m); } };
      wake = check; check();
    }),
  };
}

// ================= the baker's decisions =================
test('[first-d1 · Mika] reservation takes a single name input and nothing else', async () => {
  await reset();
  const d = await device();
  for (const field of ['phone', 'email', 'last_name', 'address']) {
    const r = await d.reserve('sourdough', 'Ana', { [field]: 'x' });
    assert.equal(r.status, 400); assert.equal(r.body.error, 'field_not_allowed'); assert.equal(r.body.field, field);
  }
  const page = await (await fetch(app.base + '/app.js')).text();
  assert.equal((page.match(/input\.name = /g) || []).length, 1, 'one input per loaf form');
  assert.match(page, /input\.name = 'first_name'/);
});

test('[first-d2 · Bo] one loaf per person per batch: a second of the same item is refused kindly', async () => {
  await reset();
  const d = await device();
  assert.equal((await d.reserve('rye', 'Ana')).status, 201);
  const again = await d.reserve('rye', 'Anna');
  assert.equal(again.status, 409); assert.equal(again.body.error, 'already_reserved'); assert.ok(again.body.message.length > 10);
  assert.equal((await d.reserve('sourdough', 'Ana')).status, 201, 'a different item is still allowed (brief: one of each)');
  assert.equal(await left('rye'), 7);
});

test('[first-d3 · Ines] sold out is said warmly, not as an error', async () => {
  await reset();
  for (let i = 0; i < 3; i++) await (await device()).reserve('sourdough', `P${i}`);
  const l = (await loaves()).find((x) => x.id === 'sourdough');
  assert.equal(l.sold_out, true); assert.equal(l.label, 'Sold out for today');
  const late = await (await device()).reserve('sourdough', 'Late');
  assert.equal(late.status, 409); assert.equal(late.body.message, 'Sold out for today');
  const js = await (await fetch(app.base + '/app.js')).text();
  assert.match(js, /Sold out for today/);
});

test('[first-d4 · Wren] no login: a customer reserves with no account or token', async () => {
  await reset();
  const r = await (await device()).reserve('brioche', 'Ana');
  assert.equal(r.status, 201); assert.equal(r.body.status, 'reserved');
  assert.match(r.body.message, /Your butter brioche is reserved, Ana\. It'll be with you before the end of this talk\./);
});

test('[first-d5 · Theo, c6 · Theo] the stored record is first name, loaf, time (and a device id): nothing else', async () => {
  await reset(); await (await device()).reserve('rye', 'Ana');
  const db = new DatabaseSync(app.dbPath, { readOnly: true });
  const cols = db.prepare('PRAGMA table_info(reservations)').all().map((c) => c.name).sort();
  db.close();
  assert.deepEqual(cols, ['created_at', 'device', 'drop_no', 'first_name', 'id', 'loaf_id', 'status']);
});

test('[c15 · Mika, c18 · Wren] sold-out loaves stay on the page, marked sold out (stock reads 0, label says so)', async () => {
  await reset();
  for (let i = 0; i < 3; i++) await (await device()).reserve('sourdough', `P${i}`);
  const sour = (await loaves()).find((l) => l.id === 'sourdough');
  assert.equal(sour.left, 0); assert.equal(sour.sold_out, true);
});

test('[c10 · Ines, c9 · Ines] no payment or deposit anywhere: reserving takes only a name', async () => {
  const html = await (await fetch(app.base + '/')).text();
  assert.match(html, /nothing to pay/);
  assert.doesNotMatch(html, /card number|checkout|deposit/i);
});

test('[c11 · Ines, c22 · Priya] an unpicked reservation is released with a note to try again next bake', async () => {
  await reset();
  const d = await device(); const r = await d.reserve('rye', 'Ana');
  const later = new Date(Date.now() + 16 * 60_000).toISOString();
  await admin('/api/admin/orders', { headers: { 'X-Test-Now': later } });
  const got = (await j(await fetch(`${app.base}/api/reservations/${r.body.id}`))).body;
  assert.equal(got.status, 'released'); assert.match(got.message, /try again at the next bake/i);
});

test('[c8 · Theo, c20/c21 · set aside] the demo needs no earlier visit and keeps records until Reset (documented in BUILT.md)', async () => {
  await reset();
  const r = await (await device()).reserve('brioche', 'Newcomer');
  assert.equal(r.status, 201);
});

test('[c14 · Mika] each loaf shows name, short description and count', async () => {
  const l = await loaves();
  assert.deepEqual(l.map((x) => x.id), ['sourdough', 'rye', 'brioche']);
  assert.deepEqual(l.map((x) => x.tier), ['rare', 'medium', 'plentiful']);
  for (const x of l) { assert.ok(x.name && x.description.length > 20 && x.label); assert.doesNotMatch(x.description, /!|[\u{1F300}-\u{1FAFF}]/u); }
});

test('[brief · photos] the three photos and the logo are served', async () => {
  for (const f of ['sourdough', 'rye', 'brioche', 'logo']) {
    const r = await fetch(`${app.base}/img/${f}.jpg`); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'image/jpeg');
  }
});

// ================= the brief's rules =================
test('[brief · rules] stock never below 0, and two judges racing for the last loaf: exactly one gets it', async () => {
  await reset();
  for (let i = 0; i < 2; i++) await (await device()).reserve('sourdough', `P${i}`);
  const [a, b] = await Promise.all([device(), device()]);
  const rs = await Promise.all([a.reserve('sourdough', 'A'), b.reserve('sourdough', 'B')]);
  assert.deepEqual(rs.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await left('sourdough'), 0);
  assert.equal((await (await device()).reserve('sourdough', 'C')).status, 409);
  assert.equal(await left('sourdough'), 0);
});

test('[brief · rules] first name only: 1 to 30 characters, trimmed', async () => {
  await reset();
  const d = await device();
  for (const bad of ['', '   ', 'x'.repeat(31)]) assert.equal((await d.reserve('rye', bad)).status, 400);
  assert.equal((await d.reserve('nope', 'Ana')).status, 400);
  const ok = await d.reserve('rye', `  ${'x'.repeat(30)}  `);
  assert.equal(ok.status, 201); assert.equal(ok.body.first_name.length, 30);
});

test('[brief · rules] a new drop starts at each Restock, and the same device may reserve again', async () => {
  await reset();
  const d = await device();
  const first = await d.reserve('sourdough', 'Ana'); assert.equal(first.body.drop, 1);
  assert.equal((await d.reserve('sourdough', 'Ana')).status, 409);
  const rs = await admin('/api/admin/restock', { method: 'POST' }); assert.equal(rs.body.drop, 2);
  const second = await d.reserve('sourdough', 'Ana'); assert.equal(second.status, 201); assert.equal(second.body.drop, 2);
});

test('[brief · rules] rate limit: the 11th attempt in a minute from one device is 429; Reset clears it', async () => {
  await reset();
  const d = await device();
  const codes = []; for (let i = 0; i < 11; i++) codes.push((await d.reserve('rye', 'Ana')).status);
  assert.equal(codes[10], 429); assert.ok(codes.slice(0, 10).every((c) => c !== 429));
  await reset();
  assert.notEqual((await d.reserve('rye', 'Ana')).status, 429);
});

test('[brief · rules] the hold is 15 minutes by default, settable 1 to 240, and the test clock obeys only the admin', async () => {
  await reset();
  assert.deepEqual((await admin('/api/admin/settings')).body.hold_minutes, 15);
  assert.equal((await admin('/api/admin/settings', { method: 'POST', body: JSON.stringify({ hold_minutes: 5 }) })).body.hold_minutes, 5);
  const d = await device(); const r = await d.reserve('rye', 'Ana'); const id = r.body.id;
  const at = (min) => new Date(Date.now() + min * 60_000).toISOString();
  // a customer sending the header (no token) moves nothing
  await fetch(app.base + '/api/loaves', { headers: { 'X-Test-Now': at(30) } });
  assert.equal((await j(await fetch(`${app.base}/api/reservations/${id}`, { headers: { 'X-Test-Now': at(30) } }))).body.status, 'reserved');
  assert.equal((await admin('/api/admin/orders', { headers: { 'X-Test-Now': at(4) } })).body.orders[0].status, 'reserved');
  assert.equal((await admin('/api/admin/orders', { headers: { 'X-Test-Now': at(6) } })).body.orders[0].status, 'released');
  assert.equal(await left('rye'), 8);
  assert.equal((await admin('/api/admin/deliver', { method: 'POST' })).body.delivered, 0);
  for (const bad of [0, 241, 1.5, '5', null]) assert.equal((await admin('/api/admin/settings', { method: 'POST', body: JSON.stringify({ hold_minutes: bad }) })).status, 400);
  await admin('/api/admin/settings', { method: 'POST', body: JSON.stringify({ hold_minutes: 15 }) });
});

test('[brief · rules] a released loaf may be reserved again by the same device', async () => {
  await reset();
  const d = await device(); await d.reserve('rye', 'Ana');
  await admin('/api/admin/orders', { headers: { 'X-Test-Now': new Date(Date.now() + 16 * 60_000).toISOString() } });
  assert.equal((await d.reserve('rye', 'Ana')).status, 201);
});

test('[brief · rules] starting stock is adjustable, applies at the next Restock, and is validated', async () => {
  await reset();
  const set = await admin('/api/admin/settings', { method: 'POST', body: JSON.stringify({ stock: { sourdough: 5 } }) });
  assert.equal(set.body.stock.sourdough, 5);
  assert.equal((await loaves()).find((l) => l.id === 'sourdough').start, 3, 'not yet');
  await admin('/api/admin/restock', { method: 'POST' });
  const s = (await loaves()).find((l) => l.id === 'sourdough'); assert.deepEqual([s.start, s.left], [5, 5]);
  for (const bad of [{ sourdough: -1 }, { sourdough: 501 }, { sourdough: 1.5 }, { sourdough: '3' }, { toast: 3 }]) {
    assert.equal((await admin('/api/admin/settings', { method: 'POST', body: JSON.stringify({ stock: bad }) })).status, 400);
  }
  await admin('/api/admin/settings', { method: 'POST', body: JSON.stringify({ stock: { sourdough: 3 } }) }); await reset();
  assert.equal(await left('sourdough'), 3);
});

test('[brief · delivered] Deliver flips every reserved order within a second, over server-sent events', async () => {
  await reset();
  const ds = await Promise.all([device(), device()]);
  const rs = [await ds[0].reserve('sourdough', 'Ana'), await ds[1].reserve('rye', 'Tom')];
  const streams = rs.map((r) => watchEvents(`${app.base}/api/reservations/${r.body.id}/events`));
  for (const s of streams) assert.equal((await s.until(() => true)).status, 'reserved');
  const t0 = Date.now();
  assert.equal((await admin('/api/admin/deliver', { method: 'POST' })).body.delivered, 2);
  const m0 = await streams[0].until((m) => m.status === 'delivered'); const m1 = await streams[1].until((m) => m.status === 'delivered');
  assert.equal(m0.message, 'Delivered: your sourdough is here'); assert.equal(m1.message, 'Delivered: your seeded rye is here');
  assert.ok(Date.now() - t0 < 1000);
  streams.forEach((s) => s.close());
  assert.ok((await admin('/api/admin/orders')).body.orders.every((o) => o.status === 'delivered'));
});

test('[brief · storefront] the shelf streams changes, so a Restock shows at once', async () => {
  await reset();
  const w = watchEvents(`${app.base}/api/events`); await w.until(() => true);
  const n = w.seen.length;
  await (await device()).reserve('rye', 'Ana');
  await w.until(() => w.seen.length > n); w.close();
});

test('[brief · baker] the admin is locked: 401 without or with a wrong token, and always when no token is set', async () => {
  for (const p of ['/admin', '/api/admin/orders', '/api/admin/stock', '/api/admin/settings', '/api/admin/events']) {
    assert.equal((await fetch(app.base + p)).status, 401, p);
    assert.equal((await fetch(app.base + p, { headers: { Authorization: 'Bearer wrong' } })).status, 401, p);
    assert.equal((await fetch(noToken.base + p, { headers: AUTH })).status, 401, `unset: ${p}`);
    assert.equal((await fetch(noToken.base + p, { headers: { Authorization: 'Bearer ' } })).status, 401);
  }
  for (const p of ['deliver', 'restock', 'reset', 'settings']) {
    assert.equal((await fetch(`${app.base}/api/admin/${p}`, { method: 'POST' })).status, 401);
    assert.equal((await fetch(`${noToken.base}/api/admin/${p}`, { method: 'POST', headers: AUTH })).status, 401);
  }
  assert.equal((await fetch(noToken.base + '/admin?t=')).status, 401);
});

test('[brief · baker] the admin page opens in a browser: one-time ?t= becomes an HttpOnly cookie and a clean address', async () => {
  const bad = await fetch(app.base + '/admin?t=nope', { redirect: 'manual' }); assert.equal(bad.status, 401);
  const r = await fetch(app.base + '/admin?t=' + TOKEN, { redirect: 'manual' });
  assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/admin');
  const cookie = r.headers.get('set-cookie'); assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
  const page = await fetch(app.base + '/admin', { headers: { Cookie: cookie.split(';')[0] } });
  assert.equal(page.status, 200); assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
  const html = await page.text(); assert.match(html, /Deliver all/); assert.match(html, /Reset demo/); assert.match(html, /Restock/);
  assert.equal((await fetch(app.base + '/admin', { headers: AUTH })).status, 200);
});

test('[brief · baker] Reset demo clears every order and restocks to drop 1', async () => {
  await (await device()).reserve('rye', 'Ana'); await admin('/api/admin/restock', { method: 'POST' });
  assert.equal((await reset()).body.ok, true);
  assert.equal((await admin('/api/admin/orders')).body.orders.length, 0);
  const s = (await admin('/api/admin/stock')).body.loaves;
  assert.deepEqual(s.map((l) => l.left), [3, 8, 40]);
  assert.equal((await j(await fetch(app.base + '/api/loaves'))).body.drop, 1);
});

test('[brief · cut] the collection is not built', async () => {
  assert.equal((await fetch(app.base + '/api/collection')).status, 404);
});

test('[brief · look] the honest banner, the real-text name and the icon-only logo are on the storefront', async () => {
  const html = await (await fetch(app.base + '/')).text();
  assert.match(html, /Demo bakery for a hackathon: no real bread, nothing to pay\./);
  assert.match(html, /<h1>Proof of Concept<\/h1>/); assert.match(html, /src="\/img\/logo\.jpg"/);
  assert.doesNotMatch(html + await (await fetch(app.base + '/app.js')).text(), /[\u{1F300}-\u{1FAFF}]/u, 'no emoji');
});

test('[brief · look] the device id is a random HttpOnly cookie, set on first visit and reused', async () => {
  const r = await fetch(app.base + '/'); const c = r.headers.get('set-cookie');
  assert.match(c, /^device=[a-f0-9]{32}; /); assert.match(c, /HttpOnly/);
  const again = await fetch(app.base + '/api/loaves', { headers: { Cookie: c.split(';')[0] } });
  assert.equal(again.headers.get('set-cookie'), null);
});

test('[rule 2 · no leaks] no first name, token or key in the app log, and no secret in a response', async () => {
  await reset();
  const d = await device(); await d.reserve('rye', 'Zebediah'); await d.reserve('sourdough', 'Zebediah');
  await admin('/api/admin/deliver', { method: 'POST' });
  const log = fs.readFileSync(app.logPath, 'utf8');
  assert.doesNotMatch(log, /Zebediah/); assert.ok(!log.includes(TOKEN)); assert.doesNotMatch(log, /fal|api[_-]?key|FAL_KEY/i);
  for (const p of ['/', '/app.js', '/style.css', '/api/loaves', '/health']) {
    const body = await (await fetch(app.base + p)).text(); assert.ok(!body.includes(TOKEN)); assert.doesNotMatch(body, /FAL_KEY/);
  }
});
