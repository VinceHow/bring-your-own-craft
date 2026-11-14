// Acceptance suite for the team-built bakery (docs/BAKERY-BRIEF.md, its 11 tests): the gate before it ships. HTTP only,
// against BASE_URL; never imports the app. Contract: deploy/ACCEPTANCE.md. Every test starts with Reset demo.
// A "device" is a cookie jar: the app sets a device cookie on first contact and the helper sends it back.
// Run: BASE_URL=http://localhost:8787 ADMIN_TOKEN=<token> APP_LOG=app.log node --test deploy/acceptance/bakery.acceptance.js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
if (!BASE) throw new Error('BASE_URL is not set: point it at the bakery app');
const TOKEN = process.env.ADMIN_TOKEN || '';
const APP_LOG = process.env.APP_LOG || '';
const NO_TOKEN = TOKEN ? false : 'ADMIN_TOKEN is not set: the suite assumes the app has none either, and only checks the admin stays locked (test 8)';
const TIERS = { rare: 3, medium: 8, plentiful: 40 }; // the brief's starting stock per drop

const names = new Set(); // every first name used, for the log check
const NAME = s => { names.add(s); return s; };

// A device: its own cookie jar (only the cookies the app sets; nothing else is kept).
function newDevice() {
  const jar = new Map();
  return {
    jar,
    header() { return [...jar].map(([k, v]) => `${k}=${v}`).join('; '); },
    keep(res) {
      const set = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
      for (const c of set) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (i > 0) jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); }
    },
  };
}
async function req(method, path, { body, dev, token, raw, now } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (now) headers['x-test-now'] = now;
  if (dev && dev.jar.size) headers.cookie = dev.header();
  if (token != null) headers.authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  if (dev) dev.keep(res);
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: res.status, json, text };
}
// A fresh phone: it opens the storefront first, which is when the app hands it a device cookie.
async function device() {
  const d = newDevice();
  const r = await req('GET', '/api/loaves', { dev: d });
  assert.equal(r.status, 200, `storefront: ${r.status}`);
  assert.ok(d.jar.size > 0, 'the app sets a device cookie on the first visit');
  return d;
}
const admin = (method, path, body, now) => req(method, path, { body, token: TOKEN, now });
async function reserve(loaf_id, first_name, dev, extra = {}) {
  dev = dev || await device();
  return req('POST', '/api/reservations', { body: { loaf_id, first_name: first_name && NAME(first_name), ...extra }, dev });
}
const loaves = async () => (await req('GET', '/api/loaves')).json.loaves;
const byTier = async tier => (await loaves()).find(l => l.tier === tier);
const loaf = async id => (await loaves()).find(l => l.id === id);
async function within(ms, fn, what) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { last = await fn(); if (last) return last; await new Promise(r => setTimeout(r, 50)); }
  assert.fail(`not within ${ms} ms: ${what}`);
}
// Read a reservation's event stream until a message matches, or time out. Returns every message seen.
async function watch(id, until, ms, dev) {
  const ac = new AbortController(); const seen = [];
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    const headers = { accept: 'text/event-stream' }; if (dev && dev.jar.size) headers.cookie = dev.header();
    const res = await fetch(`${BASE}/api/reservations/${encodeURIComponent(id)}/events`, { signal: ac.signal, headers });
    assert.match(res.headers.get('content-type') || '', /text\/event-stream/);
    const dec = new TextDecoder(); let buf = '';
    for await (const chunk of res.body) {
      buf += dec.decode(chunk, { stream: true });
      let i; while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        let m; try { m = JSON.parse(line.slice(5)); } catch { continue; }
        seen.push(m); if (until(m)) return seen;
      }
    }
  } catch (e) { if (e.name !== 'AbortError') throw e; } finally { clearTimeout(timer); ac.abort(); }
  return seen;
}

beforeEach(async () => {
  if (!TOKEN) return;
  const r = await admin('POST', '/api/admin/reset');
  assert.equal(r.status, 200, `Reset demo answered ${r.status}: ${r.text}`);
});

test('1. reserve with a first name: reserved, stock -1, on the admin page within 1 s', { skip: NO_TOKEN }, async () => {
  const item = await byTier('medium');
  const r = await reserve(item.id, 'Ana');
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.status, 'reserved');
  assert.equal(r.json.first_name, 'Ana');
  const now = await loaf(item.id);
  assert.equal(now.left, item.left - 1);
  assert.equal(now.label, `${item.left - 1} left`, '"N left" on the storefront');
  await within(1000, async () => (await admin('GET', '/api/admin/orders')).json?.orders?.find(o => o.id === r.json.id && o.first_name === 'Ana' && o.loaf_id === item.id && o.status === 'reserved'), 'the order on the admin page');
});

test('2. any field other than a first name is rejected', { skip: NO_TOKEN }, async () => {
  const item = await byTier('plentiful');
  for (const extra of [{ phone: '07700 900123' }, { email: 'ana@example.org' }, { last_name: 'Silva' }, { address: '1 High St' }]) {
    const r = await reserve(item.id, 'Ana', null, extra);
    assert.equal(r.status, 400, `${Object.keys(extra)[0]} answered ${r.status}`);
    assert.equal(r.json?.error, 'field_not_allowed');
  }
  for (const bad of ['', '   ', 'A'.repeat(31)]) assert.equal((await reserve(item.id, bad)).status, 400, `name ${JSON.stringify(bad)}`);
  assert.equal((await reserve('cake', 'Ana')).status, 400, 'unknown item');
  assert.equal((await loaf(item.id)).left, item.start, 'nothing reserved');
});

test('3. one of each item per device per drop: a second is refused, kindly; after a Restock it is allowed, and the collection shows both', { skip: NO_TOKEN }, async () => {
  const dev = await device();
  const item = await byTier('medium'), other = await byTier('plentiful');
  const a = await reserve(item.id, 'Ana', dev);
  assert.equal(a.status, 201, a.text);
  assert.equal(a.json.drop, 1, 'the first drop');
  const again = await reserve(item.id, 'Ana', dev);
  assert.equal(again.status, 409, 'same item, same device, same drop');
  assert.equal(again.json?.error, 'already_reserved');
  assert.ok((again.json?.message || '').trim().length > 0, 'a kind message');
  assert.equal((await reserve(item.id, 'Bea', dev)).status, 409, 'a different name on the same device is still the same person');
  assert.equal((await reserve(other.id, 'Ana', dev)).status, 201, 'one of EACH item: another item is fine');
  assert.equal((await admin('POST', '/api/admin/deliver')).status, 200);
  assert.equal((await reserve(item.id, 'Ana', dev)).status, 409, 'delivered still counts within the drop');
  // A new drop: Restock.
  assert.equal((await admin('POST', '/api/admin/restock')).status, 200);
  const b = await reserve(item.id, 'Ana', dev);
  assert.equal(b.status, 201, `after a Restock (new drop): ${b.text}`);
  assert.equal(b.json.drop, 2, 'the second drop');
  assert.equal((await admin('POST', '/api/admin/deliver')).status, 200);
  const col = await req('GET', '/api/collection', { dev });
  assert.equal(col.status, 200, col.text);
  const mine = col.json.items.filter(x => x.loaf_id === item.id);
  assert.deepEqual(mine.map(x => x.drop).sort(), [1, 2], `two of the item, one from each drop: ${col.text}`);
  assert.ok(col.json.items.some(x => x.loaf_id === other.id && x.drop === 1));
  const stranger = await device();
  assert.deepEqual((await req('GET', '/api/collection', { dev: stranger })).json.items, [], 'a collection is only its own device\'s');
});

test('4. stock 0: "Sold out for today", and the reservation is refused', { skip: NO_TOKEN }, async () => {
  const rare = await byTier('rare');
  assert.equal(rare.start, TIERS.rare, 'the rare drop starts at 3');
  for (let i = 0; i < rare.start; i++) assert.equal((await reserve(rare.id, `Judge${i}`)).status, 201);
  const out = await loaf(rare.id);
  assert.deepEqual([out.left, out.sold_out, out.label], [0, true, 'Sold out for today']);
  const r = await reserve(rare.id, 'Late');
  assert.equal(r.status, 409);
  assert.equal(r.json?.error, 'sold_out');
  assert.equal(r.json?.message, 'Sold out for today');
  assert.equal((await loaf(rare.id)).left, 0, 'never below 0');
});

test('5. two simultaneous reservations for the last loaf: exactly one succeeds', { skip: NO_TOKEN }, async () => {
  const rare = await byTier('rare');
  for (let i = 0; i < rare.start - 1; i++) assert.equal((await reserve(rare.id, `Early${i}`)).status, 201);
  assert.equal((await loaf(rare.id)).left, 1);
  const devs = await Promise.all([device(), device(), device()]);
  const race = await Promise.all(devs.map((d, i) => reserve(rare.id, `Racer${i}`, d)));
  assert.equal(race.filter(r => r.status === 201).length, 1, `statuses ${race.map(r => r.status)}`);
  assert.ok(race.filter(r => r.status !== 201).every(r => r.status === 409 && r.json?.error === 'sold_out'));
  assert.equal((await loaf(rare.id)).left, 0);
  assert.equal((await admin('GET', '/api/admin/orders')).json.orders.filter(o => o.loaf_id === rare.id).length, rare.start, 'never more orders than stock');
});

test('6. Deliver: every reserved page shows "Delivered" within 1 s (SSE), and the admin shows it delivered', { skip: NO_TOKEN }, async () => {
  const rare = await byTier('rare'), medium = await byTier('medium');
  const da = await device(), db = await device();
  const a = await reserve(rare.id, 'Ana', da), b = await reserve(medium.id, 'Ben', db);
  for (const r of [a, b]) assert.equal(r.status, 201, r.text);
  const done = m => m.status === 'delivered';
  const watching = [watch(a.json.id, done, 4000, da), watch(b.json.id, done, 4000, db)];
  await new Promise(r => setTimeout(r, 300)); // both pages open, as on the judges' phones
  const t0 = Date.now();
  const d = await admin('POST', '/api/admin/deliver');
  assert.equal(d.status, 200, d.text);
  assert.equal(d.json.delivered, 2);
  const [sa, sb] = await Promise.all(watching);
  const ms = Date.now() - t0;
  assert.ok(sa.some(done) && sb.some(done), `both pages flipped (saw ${JSON.stringify(sa)} / ${JSON.stringify(sb)})`);
  assert.ok(ms <= 1000, `within 1 s, took ${ms} ms`);
  assert.equal(sa.find(done).message, `Delivered: your ${rare.name.toLowerCase()} is here`);
  assert.equal(sb.find(done).message, `Delivered: your ${medium.name.toLowerCase()} is here`);
  assert.equal(sa[0].status, 'reserved', 'the stream starts with the current status');
  const orders = (await admin('GET', '/api/admin/orders')).json.orders;
  assert.ok(orders.length === 2 && orders.every(o => o.status === 'delivered'));
  assert.equal((await req('GET', `/api/reservations/${a.json.id}`)).json.status, 'delivered');
});

test('7. Restock: stock back to the starting values; the storefront shows it within 1 s', { skip: NO_TOKEN }, async () => {
  const rare = await byTier('rare');
  for (let i = 0; i < rare.start; i++) await reserve(rare.id, `R${i}`);
  await reserve((await byTier('medium')).id, 'Rb');
  assert.equal((await loaf(rare.id)).left, 0);
  const r = await admin('POST', '/api/admin/restock');
  assert.equal(r.status, 200, r.text);
  await within(1000, async () => (await loaves()).every(l => l.left === l.start && !l.sold_out), 'the storefront back to starting stock');
  assert.equal((await loaf(rare.id)).label, `${rare.start} left`);
});

test('8. the admin is locked without the token, and when no token is set: 401, never open', async () => {
  const routes = [['GET', '/admin'], ['GET', '/api/admin/orders'], ['GET', '/api/admin/stock'], ['GET', '/api/admin/settings'],
    ['POST', '/api/admin/settings'], ['POST', '/api/admin/deliver'], ['POST', '/api/admin/restock'], ['POST', '/api/admin/reset']];
  for (const [method, path] of routes) {
    for (const token of [null, '', 'wrong-token', 'undefined', 'null']) {
      const r = await req(method, path, { token });
      assert.equal(r.status, 401, `${method} ${path} with ${JSON.stringify(token)} answered ${r.status}`);
    }
    if (TOKEN && !(method === 'POST' && path === '/api/admin/settings')) assert.equal((await req(method, path, { token: TOKEN })).status, 200, `${method} ${path} with the token`);
  }
});

test('9. the hold: a reservation older than the hold is released, its stock returns, and Deliver skips it', { skip: NO_TOKEN }, async () => {
  const set = await admin('POST', '/api/admin/settings', { hold_minutes: 5 });
  assert.equal(set.status, 200, `settings: ${set.text}`);
  try {
    assert.equal((await admin('GET', '/api/admin/settings')).json.hold_minutes, 5);
    const item = await byTier('rare');
    const r = await reserve(item.id, 'Hana');
    assert.equal(r.status, 201, r.text);
    const at = Date.now();
    const plus = min => new Date(at + min * 60000).toISOString();
    const stockAt = async now => (await admin('GET', '/api/admin/stock', undefined, now)).json.loaves.find(l => l.id === item.id).left;
    // A customer can't move the clock: the header is ignored without the admin token.
    const cheat = await req('GET', `/api/reservations/${r.json.id}`, { now: plus(60) });
    assert.equal(cheat.json.status, 'reserved', 'X-Test-Now without the admin token is ignored');
    assert.equal(await stockAt(plus(4)), item.start - 1, 'within the hold: still reserved at +4 min');
    assert.equal(await stockAt(plus(6)), item.start, 'past the hold: back on the shelf at +6 min');
    assert.equal((await admin('GET', '/api/admin/orders', undefined, plus(6))).json.orders.find(o => o.id === r.json.id)?.status, 'released');
    const d = await admin('POST', '/api/admin/deliver', undefined, plus(6));
    assert.equal(d.status, 200, d.text);
    assert.equal(d.json.delivered, 0, 'Deliver skips a released reservation');
    assert.equal((await admin('POST', '/api/admin/settings', { hold_minutes: 0 })).status, 400, 'a hold under a minute is refused');
  } finally { await admin('POST', '/api/admin/settings', { hold_minutes: 15 }); }
});

test('10. Reset demo: no orders, starting stock (rare 3, medium 8, plentiful 40; adjustable)', { skip: NO_TOKEN }, async () => {
  await reserve((await byTier('rare')).id, 'Ana'); await reserve((await byTier('medium')).id, 'Ben');
  assert.equal((await admin('POST', '/api/admin/reset')).status, 200);
  assert.deepEqual((await admin('GET', '/api/admin/orders')).json.orders, []);
  const ls = await loaves();
  assert.deepEqual(Object.fromEntries(ls.map(l => [l.tier, l.start])), TIERS, 'three tiers at the brief\'s starting stock');
  assert.ok(ls.every(l => l.left === l.start), 'starting stock');
  // Adjustable on the admin page: the new starting stock takes effect at the next Restock.
  const rare = ls.find(l => l.tier === 'rare');
  const s = await admin('POST', '/api/admin/settings', { stock: { [rare.id]: 5 } });
  assert.equal(s.status, 200, s.text);
  try {
    assert.equal((await admin('POST', '/api/admin/restock')).status, 200);
    assert.deepEqual([(await loaf(rare.id)).start, (await loaf(rare.id)).left], [5, 5]);
  } finally { await admin('POST', '/api/admin/settings', { stock: { [rare.id]: TIERS.rare } }); await admin('POST', '/api/admin/reset'); }
});

test('+ rate limit: one device cannot empty the shop by accident (the brief\'s rules)', { skip: NO_TOKEN }, async () => {
  const dev = await device(); const statuses = [];
  const item = await byTier('plentiful');
  for (let i = 0; i < 11; i++) statuses.push((await reserve(item.id, `Burst${i}`, dev)).status);
  assert.equal(statuses[10], 429, `the 11th attempt in a minute: ${statuses}`);
  assert.equal((await reserve(item.id, 'Other')).status, 201, 'another device is unaffected');
});

test('11. no API key and no first name appears in any log line', { skip: !APP_LOG ? 'APP_LOG is not set: capture the app\'s output to a file and point APP_LOG at it' : NO_TOKEN }, async () => {
  await reserve((await byTier('medium')).id, 'Zephyrine'); await admin('POST', '/api/admin/deliver');
  await new Promise(r => setTimeout(r, 200)); // let the app flush
  const log = fs.readFileSync(APP_LOG, 'utf8');
  assert.ok(log.trim().length > 0, 'the app wrote a log (capture its stdout and stderr)');
  for (const n of names) if (n.trim().length >= 3) assert.ok(!log.includes(n), `a first name is in the log: ${n}`);
  assert.ok(!log.includes(TOKEN), 'ADMIN_TOKEN is in the log');
  for (const re of [/sk-[A-Za-z0-9_-]{16,}/, /\bfal_[A-Za-z0-9]{16,}/i, /Bearer\s+[A-Za-z0-9._-]{12,}/, /api[_-]?key["':=\s]+[A-Za-z0-9._-]{12,}/i])
    assert.ok(!re.test(log), `something like an API key is in the log (${re})`);
});
