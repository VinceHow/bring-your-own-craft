// Acceptance suite for the team-built bakery (docs/BAKERY-BRIEF.md, its 10 tests): the gate before it ships. HTTP only,
// against BASE_URL; never imports the app. Contract: deploy/ACCEPTANCE.md. Every test starts with Reset demo.
// Run: BASE_URL=http://localhost:8787 ADMIN_TOKEN=<token> APP_LOG=app.log node --test deploy/acceptance/bakery.acceptance.js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
if (!BASE) throw new Error('BASE_URL is not set: point it at the bakery app');
const TOKEN = process.env.ADMIN_TOKEN || '';
const APP_LOG = process.env.APP_LOG || '';
const NO_TOKEN = TOKEN ? false : 'ADMIN_TOKEN is not set: the suite assumes the app has none either, and only checks the admin stays locked (test 8)';

const device = () => 'dev-' + crypto.randomUUID();
const names = new Set(); // every first name used, for the log check
const NAME = s => { names.add(s); return s; };

async function req(method, path, { body, dev, token, raw } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (dev) headers['x-device-id'] = dev;
  if (token != null) headers.authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: res.status, json, text };
}
const admin = (method, path, body) => req(method, path, { body, token: TOKEN });
const reserve = (loaf_id, first_name, dev = device(), extra = {}) => req('POST', '/api/reservations', { body: { loaf_id, first_name: first_name && NAME(first_name), ...extra }, dev });
const loaves = async () => (await req('GET', '/api/loaves')).json.loaves;
const loaf = async id => (await loaves()).find(l => l.id === id);
// Poll until fn() is truthy, within ms (the brief's "within 1 s").
async function within(ms, fn, what) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { last = await fn(); if (last) return last; await new Promise(r => setTimeout(r, 50)); }
  assert.fail(`not within ${ms} ms: ${what}`);
}
// Read a reservation's event stream until a message matches, or time out. Returns every message seen.
async function watch(id, until, ms) {
  const ac = new AbortController(); const seen = [];
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(`${BASE}/api/reservations/${encodeURIComponent(id)}/events`, { signal: ac.signal, headers: { accept: 'text/event-stream' } });
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
  const before = await loaf('sourdough');
  const r = await reserve('sourdough', 'Ana');
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.status, 'reserved');
  assert.equal(r.json.first_name, 'Ana');
  assert.equal((await loaf('sourdough')).left, before.left - 1);
  assert.equal((await loaf('sourdough')).label, `${before.left - 1} left`, '"N left" on the storefront');
  await within(1000, async () => (await admin('GET', '/api/admin/orders')).json?.orders?.find(o => o.id === r.json.id && o.first_name === 'Ana' && o.loaf_id === 'sourdough' && o.status === 'reserved'), 'the order on the admin page');
});

test('2. any field other than a first name is rejected', { skip: NO_TOKEN }, async () => {
  for (const extra of [{ phone: '07700 900123' }, { email: 'ana@example.org' }, { last_name: 'Silva' }, { address: '1 High St' }]) {
    const r = await reserve('sourdough', 'Ana', device(), extra);
    assert.equal(r.status, 400, `${Object.keys(extra)[0]} answered ${r.status}`);
    assert.equal(r.json?.error, 'field_not_allowed');
  }
  for (const bad of ['', '   ', 'A'.repeat(31)]) assert.equal((await reserve('sourdough', bad)).status, 400, `name ${JSON.stringify(bad)}`);
  assert.equal((await reserve('cake', 'Ana')).status, 400, 'unknown loaf');
  assert.equal((await loaf('sourdough')).left, (await loaf('sourdough')).start, 'nothing reserved');
});

test('3. a second reservation of the same loaf by the same person is refused, kindly', { skip: NO_TOKEN }, async () => {
  const dev = device();
  assert.equal((await reserve('sourdough', 'Ana', dev)).status, 201);
  const sameDevice = await reserve('sourdough', 'Bea', dev);
  assert.equal(sameDevice.status, 409, 'same device');
  assert.equal(sameDevice.json?.error, 'already_reserved');
  assert.ok((sameDevice.json?.message || '').trim().length > 0, 'a kind message');
  const sameName = await reserve('sourdough', 'ana', device());
  assert.equal(sameName.status, 409, 'same first name, any case');
  assert.equal((await reserve('baguette', 'Ana', dev)).status, 201, 'one of EACH loaf: another loaf is fine');
});

test('4. stock 0: "Sold out for today", and the reservation is refused', { skip: NO_TOKEN }, async () => {
  const s = await loaf('sourdough');
  assert.equal(s.start, 4, 'sourdough starts at 4');
  for (let i = 0; i < 4; i++) assert.equal((await reserve('sourdough', `Judge${i}`)).status, 201);
  const out = await loaf('sourdough');
  assert.deepEqual([out.left, out.sold_out, out.label], [0, true, 'Sold out for today']);
  const r = await reserve('sourdough', 'Late');
  assert.equal(r.status, 409);
  assert.equal(r.json?.error, 'sold_out');
  assert.equal(r.json?.message, 'Sold out for today');
  assert.equal((await loaf('sourdough')).left, 0, 'never below 0');
});

test('5. two simultaneous reservations for the last loaf: exactly one succeeds', { skip: NO_TOKEN }, async () => {
  for (let i = 0; i < 3; i++) assert.equal((await reserve('sourdough', `Early${i}`)).status, 201);
  assert.equal((await loaf('sourdough')).left, 1);
  const race = await Promise.all([reserve('sourdough', 'Racer A'), reserve('sourdough', 'Racer B'), reserve('sourdough', 'Racer C')]);
  assert.equal(race.filter(r => r.status === 201).length, 1, `statuses ${race.map(r => r.status)}`);
  assert.ok(race.filter(r => r.status !== 201).every(r => r.status === 409 && r.json?.error === 'sold_out'));
  assert.equal((await loaf('sourdough')).left, 0);
  assert.equal((await admin('GET', '/api/admin/orders')).json.orders.filter(o => o.loaf_id === 'sourdough').length, 4, 'four sourdough orders, not five');
});

test('6. Deliver: every reserved page shows "Delivered" within 1 s (SSE), and the admin shows it delivered', { skip: NO_TOKEN }, async () => {
  const a = await reserve('sourdough', 'Ana'), b = await reserve('baguette', 'Ben');
  for (const r of [a, b]) assert.equal(r.status, 201, r.text);
  const done = m => m.status === 'delivered';
  const watching = [watch(a.json.id, done, 4000), watch(b.json.id, done, 4000)];
  await new Promise(r => setTimeout(r, 300)); // both pages open, as on the judges' phones
  const t0 = Date.now();
  const d = await admin('POST', '/api/admin/deliver');
  assert.equal(d.status, 200, d.text);
  assert.equal(d.json.delivered, 2);
  const [sa, sb] = await Promise.all(watching);
  const ms = Date.now() - t0;
  assert.ok(sa.some(done) && sb.some(done), `both pages flipped (saw ${JSON.stringify(sa)} / ${JSON.stringify(sb)})`);
  assert.ok(ms <= 1000, `within 1 s, took ${ms} ms`);
  assert.equal(sa.find(done).message, 'Delivered: your sourdough is here');
  assert.equal(sb.find(done).message, 'Delivered: your baguette is here');
  assert.ok(sa[0].status === 'reserved', 'the stream starts with the current status');
  const orders = (await admin('GET', '/api/admin/orders')).json.orders;
  assert.ok(orders.length === 2 && orders.every(o => o.status === 'delivered'));
  assert.equal((await req('GET', `/api/reservations/${a.json.id}`)).json.status, 'delivered');
});

test('7. Restock: stock back to the starting values; the storefront shows it within 1 s', { skip: NO_TOKEN }, async () => {
  for (let i = 0; i < 4; i++) await reserve('sourdough', `R${i}`);
  await reserve('baguette', 'Rb');
  assert.equal((await loaf('sourdough')).left, 0);
  const r = await admin('POST', '/api/admin/restock');
  assert.equal(r.status, 200, r.text);
  await within(1000, async () => (await loaves()).every(l => l.left === l.start && !l.sold_out), 'the storefront back to starting stock');
  assert.equal((await loaf('sourdough')).label, '4 left');
});

test('8. the admin is locked without the token, and when no token is set: 401, never open', async () => {
  const routes = [['GET', '/admin'], ['GET', '/api/admin/orders'], ['GET', '/api/admin/stock'], ['POST', '/api/admin/deliver'],
    ['POST', '/api/admin/restock'], ['POST', '/api/admin/reset']];
  for (const [method, path] of routes) {
    for (const token of [null, '', 'wrong-token', 'undefined', 'null']) {
      const r = await req(method, path, { token });
      assert.equal(r.status, 401, `${method} ${path} with ${JSON.stringify(token)} answered ${r.status}`);
    }
    if (TOKEN) assert.equal((await req(method, path, { token: TOKEN })).status, 200, `${method} ${path} with the token`);
  }
});

test('9. Reset demo: no orders, starting stock (sourdough 4)', { skip: NO_TOKEN }, async () => {
  await reserve('sourdough', 'Ana'); await reserve('baguette', 'Ben');
  assert.equal((await admin('POST', '/api/admin/reset')).status, 200);
  assert.deepEqual((await admin('GET', '/api/admin/orders')).json.orders, []);
  const ls = await loaves();
  assert.ok(ls.length >= 2, 'a few loaves');
  assert.ok(ls.every(l => l.left === l.start), 'starting stock');
  assert.equal(ls.find(l => l.id === 'sourdough').start, 4);
  assert.ok(ls.filter(l => l.id !== 'sourdough').every(l => l.start >= 4), 'the other loaves a few more');
  assert.equal((await reserve('sourdough', 'Ana')).status, 201, 'the same name can reserve again after a reset');
});

test('+ rate limit: one device cannot empty the shop by accident (the brief\'s rules)', { skip: NO_TOKEN }, async () => {
  const dev = device(); const statuses = [];
  for (let i = 0; i < 11; i++) statuses.push((await reserve(i % 2 ? 'baguette' : 'sourdough', `Burst${i}`, dev)).status);
  assert.equal(statuses[10], 429, `the 11th attempt in a minute: ${statuses}`);
  assert.equal((await reserve('baguette', 'Other', device())).status, 201, 'another device is unaffected');
});

test('10. no API key and no first name appears in any log line', { skip: !APP_LOG ? 'APP_LOG is not set: capture the app\'s output to a file and point APP_LOG at it' : NO_TOKEN }, async () => {
  await reserve('sourdough', 'Zephyrine'); await admin('POST', '/api/admin/deliver');
  await new Promise(r => setTimeout(r, 200)); // let the app flush
  const log = fs.readFileSync(APP_LOG, 'utf8');
  assert.ok(log.trim().length > 0, 'the app wrote a log (capture its stdout and stderr)');
  for (const n of names) if (n.trim().length >= 3) assert.ok(!log.includes(n), `a first name is in the log: ${n}`);
  assert.ok(!log.includes(TOKEN), 'ADMIN_TOKEN is in the log');
  for (const re of [/sk-[A-Za-z0-9_-]{16,}/, /\bfal_[A-Za-z0-9]{16,}/i, /Bearer\s+[A-Za-z0-9._-]{12,}/, /api[_-]?key["':=\s]+[A-Za-z0-9._-]{12,}/i])
    assert.ok(!re.test(log), `something like an API key is in the log (${re})`);
});
