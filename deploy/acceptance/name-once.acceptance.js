// Acceptance: a device gives its first name once (Vincent, 15 Nov: every other loaf asked for his name again).
// Over HTTP, against BASE_URL with ADMIN_TOKEN, like bakery.acceptance.js. Starts with Reset demo, so not during a talk.
// The storefront reads GET /api/me and shows "Reserving as <name> · not you?" instead of the name field; the browser
// half of this is checked in deploy/acceptance/name-once.browser.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL;
const TOKEN = process.env.ADMIN_TOKEN;
const admin = (p, method = 'GET') => fetch(BASE + p, { method, headers: { Authorization: `Bearer ${TOKEN}` } });

function device() {
  let cookie = '';
  return async (p, opts = {}) => {
    const r = await fetch(BASE + p, { ...opts, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(opts.headers || {}) } });
    const set = (r.headers.getSetCookie?.() || []).find(c => c.startsWith('device='));
    if (set) cookie = set.split(';')[0];
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
}

test('a device gives its first name once: remembered after the first reservation, per device, forgotten on Reset demo', async t => {
  if (!BASE || !TOKEN) return t.skip('BASE_URL and ADMIN_TOKEN are needed');
  assert.equal((await admin('/api/admin/reset', 'POST')).status, 200);
  const ana = device(), ben = device();
  assert.equal((await ana('/api/me')).body.first_name, null, 'a new device has no name yet');
  assert.equal((await ana('/api/reservations', { method: 'POST', body: JSON.stringify({ loaf_id: 'sourdough', first_name: 'Ana' }) })).status, 201);
  assert.equal((await ana('/api/me')).body.first_name, 'Ana', 'remembered for this device');
  assert.equal((await ben('/api/me')).body.first_name, null, 'another device does not see it');
  // The second item on the same device goes in under the remembered name.
  const second = await ana('/api/reservations', { method: 'POST', body: JSON.stringify({ loaf_id: 'rye', first_name: (await ana('/api/me')).body.first_name }) });
  assert.equal(second.status, 201);
  assert.match(second.body.message, /, Ana\./);
  const orders = (await (await admin('/api/admin/orders')).json()).orders;
  assert.deepEqual(orders.map(o => o.first_name), ['Ana', 'Ana'], 'the admin still shows the name on each order');
  // "not you?": the next reservation under a new name becomes the device's name.
  assert.equal((await ana('/api/reservations', { method: 'POST', body: JSON.stringify({ loaf_id: 'brioche', first_name: 'Anna' }) })).status, 201);
  assert.equal((await ana('/api/me')).body.first_name, 'Anna');
  assert.equal((await admin('/api/admin/reset', 'POST')).status, 200);
  assert.equal((await ana('/api/me')).body.first_name, null, 'Reset demo forgets the names');
});
