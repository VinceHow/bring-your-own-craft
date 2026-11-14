// Acceptance suite for the agent-built bakery app: the gate before deploy. HTTP only, against BASE_URL; never
// imports the app. The contract is deploy/ACCEPTANCE.md. Each test names its rule, the decision behind it and its
// author (rules, not run ids, so a fresh recorded run keeps the same tests).
// Run: BASE_URL=http://localhost:8787 node --test deploy/acceptance/bakery.acceptance.js   (app started with TEST_MODE=1)
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
if (!BASE) throw new Error('BASE_URL is not set: point it at the bakery app running with TEST_MODE=1');

// Winter dates, so Europe/London is +00:00 and "20:00" means 20:00Z.
const TODAY = '2027-01-14', TOMORROW = '2027-01-15', DAY_AFTER = '2027-01-16';
const at = (date, hhmm) => `${date}T${hhmm}:00+00:00`;
const MORNING = at(TODAY, '09:30');

const LOAVES = [
  { id: 'sourdough', name: 'Sourdough', price_pence: 450, limit: 3 },
  { id: 'rye', name: 'Seeded rye', price_pence: 400, limit: 10 },
  { id: 'baguette', name: 'Baguette', price_pence: 250, limit: 10 },
];
// Fields the app must never hand back. first_name is the only personal field allowed.
const PERSONAL = ['phone', 'phone_number', 'mobile', 'email', 'last_name', 'surname', 'address', 'postcode'];
const PHONE = '07700 900123';

async function call(method, path, { body, now = MORNING } = {}) {
  const res = await fetch(BASE + path, {
    method, headers: { 'content-type': 'application/json', 'x-test-now': now },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: res.status, json, text };
}
const order = (items, extra = {}, now) => call('POST', '/api/orders', { body: { pickup_date: TOMORROW, items, ...extra }, now });
// Nothing personal beyond an optional first name, anywhere in a response, at any depth; and never the phone number.
function assertNoPersonalData(r, what) {
  assert.ok(!r.text.includes(PHONE) && !r.text.includes(PHONE.replace(/\s/g, '')), `${what}: the phone number came back`);
  const walk = (v, path) => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
      assert.ok(!PERSONAL.includes(k.toLowerCase()), `${what}: personal field "${k}" at ${path}`);
      walk(x, `${path}.${k}`);
    }
  };
  walk(r.json, '$');
}

beforeEach(async () => {
  const r = await call('POST', '/api/test/reset', { body: { loaves: LOAVES } });
  assert.equal(r.status, 200, `reset (TEST_MODE=1?) answered ${r.status}`);
});

test('ordering: a valid order is held, priced per loaf, total = what she pays at pickup [Ines · Strategy: "Show each loaf\'s price and total, pay the same at pickup"]', async () => {
  const r = await order([{ loaf_id: 'sourdough', qty: 1 }, { loaf_id: 'rye', qty: 2 }], { first_name: 'Ana' });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.status, 'held');
  assert.equal(r.json.pickup_date, TOMORROW);
  assert.deepEqual(r.json.items.map(i => [i.loaf_id, i.qty, i.price_pence]), [['sourdough', 1, 450], ['rye', 2, 400]]);
  assert.equal(r.json.total_pence, 450 + 2 * 400);
  assert.equal(r.json.first_name, 'Ana');
  const back = await call('GET', `/api/orders/${encodeURIComponent(r.json.id)}`);
  assert.equal(back.status, 200);
  assert.equal(back.json.total_pence, r.json.total_pence);
  // A malformed order is a plain 400, never a 500.
  for (const bad of [[], [{ loaf_id: 'cake', qty: 1 }], [{ loaf_id: 'rye', qty: 0 }]]) {
    const b = await order(bad);
    assert.equal(b.status, 400, `bad order ${JSON.stringify(bad)} answered ${b.status}`);
  }
});

test('cutoff-8pm: orders for tomorrow close at 20:00 [Bo · Engineering, with Ines and Mika: "Orders close at 8pm for the next morning"]', async () => {
  const before = await order([{ loaf_id: 'rye', qty: 1 }], {}, at(TODAY, '19:59'));
  assert.equal(before.status, 201, `19:59 should still order: ${before.text}`);
  for (const t of ['20:00', '20:01', '23:30']) {
    const late = await order([{ loaf_id: 'rye', qty: 1 }], {}, at(TODAY, t));
    assert.equal(late.status, 422, `${t} for tomorrow should be refused, got ${late.status}`);
    assert.equal(late.json?.error, 'cutoff');
  }
  // Late tonight, the day after is still open; and a same-day order is never possible.
  const later = await call('POST', '/api/orders', { body: { pickup_date: DAY_AFTER, items: [{ loaf_id: 'rye', qty: 1 }] }, now: at(TODAY, '21:00') });
  assert.equal(later.status, 201, later.text);
  const sameDay = await call('POST', '/api/orders', { body: { pickup_date: TODAY, items: [{ loaf_id: 'rye', qty: 1 }] }, now: at(TODAY, '06:00') });
  assert.equal(sameDay.status, 422, 'a same-day order is past the cut-off');
  // The refused order took no stock.
  const loaves = await call('GET', `/api/loaves?date=${TOMORROW}`);
  assert.equal(loaves.json.loaves.find(l => l.id === 'rye').left, 10 - 1);
});

test('hold-until-10: a held order shows its pickup window, held till ten [Bo · Engineering: "we hold it for them till ten"]', async () => {
  const r = await order([{ loaf_id: 'sourdough', qty: 1 }]);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.status, 'held');
  assert.equal(r.json.pickup_window?.to, '10:00');
  assert.match(r.json.pickup_window?.from || '', /^\d\d:\d\d$/);
  assert.ok(r.json.pickup_window.from < r.json.pickup_window.to, 'the window opens before it closes');
  const back = await call('GET', `/api/orders/${encodeURIComponent(r.json.id)}`);
  assert.deepEqual(back.json.pickup_window, r.json.pickup_window);
});

test('no-phone: an order carrying a phone is refused or the phone is dropped, and it never comes back [Mika · Design: "the phone field goes"]', async () => {
  const r = await order([{ loaf_id: 'rye', qty: 1 }], { first_name: 'Ana', phone: PHONE });
  assert.ok([201, 400].includes(r.status), `refuse (400) or drop (201), got ${r.status}`);
  if (r.status === 400) assert.equal(r.json?.error, 'field_not_allowed');
  assertNoPersonalData(r, 'the order reply');
  if (r.status === 201) {
    assertNoPersonalData(await call('GET', `/api/orders/${encodeURIComponent(r.json.id)}`), 'the order read back');
    assertNoPersonalData(await call('GET', `/api/bake-list?date=${TOMORROW}`), 'the bake list');
  }
});

test('stock: counts down per pickup day; at zero she is refused with "hold one for tomorrow" [Bo · Engineering: "Cap each loaf per pickup day"; Noor · Research: "Guaranteed up to a daily limit per loaf"]', async () => {
  const left = async date => (await call('GET', `/api/loaves?date=${date}`)).json.loaves.find(l => l.id === 'sourdough').left;
  assert.equal(await left(TOMORROW), 3);
  assert.equal((await order([{ loaf_id: 'sourdough', qty: 2 }])).status, 201);
  assert.equal(await left(TOMORROW), 1);
  assert.equal((await order([{ loaf_id: 'sourdough', qty: 1 }])).status, 201);
  assert.equal(await left(TOMORROW), 0);
  const out = await order([{ loaf_id: 'sourdough', qty: 1 }]);
  assert.equal(out.status, 409, `sold out should refuse, got ${out.status}`);
  assert.equal(out.json?.error, 'sold_out');
  assert.equal(out.json?.loaf_id, 'sourdough');
  assert.equal(out.json?.offer?.action, 'hold_for_tomorrow');
  assert.equal(out.json?.offer?.pickup_date, DAY_AFTER, 'the offer is the next day');
  // The offer is real: the next day still has the loaf, and ordering it works.
  assert.equal(await left(DAY_AFTER), 3);
  const held = await call('POST', '/api/orders', { body: { pickup_date: out.json.offer.pickup_date, items: [{ loaf_id: 'sourdough', qty: 1 }] } });
  assert.equal(held.status, 201, held.text);
  // Asking for more than is left is refused too, and takes nothing.
  assert.equal((await order([{ loaf_id: 'rye', qty: 11 }])).status, 409);
  assert.equal((await call('GET', `/api/loaves?date=${TOMORROW}`)).json.loaves.find(l => l.id === 'rye').left, 10);
});

test('bake-list: equals the sum of tomorrow\'s orders per loaf [Noor · Research: "Both totals and list"]', async () => {
  const orders = [
    [{ loaf_id: 'sourdough', qty: 2 }, { loaf_id: 'rye', qty: 1 }],
    [{ loaf_id: 'rye', qty: 3 }],
    [{ loaf_id: 'sourdough', qty: 1 }, { loaf_id: 'rye', qty: 2 }],
  ];
  for (const items of orders) assert.equal((await order(items)).status, 201);
  // Another day's order and a refused order must not count.
  assert.equal((await call('POST', '/api/orders', { body: { pickup_date: DAY_AFTER, items: [{ loaf_id: 'rye', qty: 4 }] } })).status, 201);
  assert.equal((await order([{ loaf_id: 'rye', qty: 1 }], {}, at(TODAY, '21:00'))).status, 422);
  const want = { sourdough: 3, rye: 6, baguette: 0 };
  const r = await call('GET', `/api/bake-list?date=${TOMORROW}`);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.date, TOMORROW);
  const got = Object.fromEntries(r.json.loaves.map(l => [l.loaf_id, l.qty]));
  assert.deepEqual(got, want);
});

test('personal-data: nothing beyond an optional first name is ever returned [her takeaway: "Never ask for what we could remember"; Bo · Engineering: contact stays on her device]', async () => {
  const r = await order([{ loaf_id: 'baguette', qty: 1 }], { first_name: 'Ana', email: 'ana@example.org', last_name: 'Silva', address: '1 High St' });
  assert.ok([201, 400].includes(r.status), `refuse (400) or drop (201), got ${r.status}`);
  assertNoPersonalData(r, 'the order reply');
  // With only a first name, or none, the order goes through, and every read stays clean.
  const ok = await order([{ loaf_id: 'baguette', qty: 1 }], { first_name: 'Ana' });
  assert.equal(ok.status, 201, ok.text);
  const anon = await order([{ loaf_id: 'baguette', qty: 1 }]);
  assert.equal(anon.status, 201, anon.text);
  assert.ok(!('first_name' in anon.json) || anon.json.first_name == null || anon.json.first_name === '', 'no name made up');
  for (const [what, path] of [['the order', `/api/orders/${encodeURIComponent(ok.json.id)}`], ['the loaves', `/api/loaves?date=${TOMORROW}`], ['the bake list', `/api/bake-list?date=${TOMORROW}`]]) {
    const g = await call('GET', path);
    assert.equal(g.status, 200, `${what}: ${g.status}`);
    assertNoPersonalData(g, what);
    assert.ok(!g.text.includes('ana@example.org') && !g.text.includes('Silva') && !g.text.includes('High St'), `${what}: personal data came back`);
  }
});

// ---- the baker's side: admin routes behind ADMIN_TOKEN, restock, deliver; and what is stored ----------------------
const TOKEN = process.env.ADMIN_TOKEN || '';
async function admin(method, path, { body, token = TOKEN, now = MORNING } = {}) {
  const headers = { 'content-type': 'application/json', 'x-test-now': now };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: res.status, json, text };
}
const ADMIN_ROUTES = [['GET', `/api/admin/orders?date=${TOMORROW}`], ['GET', `/api/admin/stock?date=${TOMORROW}`],
  ['POST', '/api/admin/restock', { date: TOMORROW, loaf_id: 'sourdough', qty: 5 }], ['POST', '/api/admin/deliver', { date: TOMORROW }]];
const noToken = TOKEN ? false : 'ADMIN_TOKEN is not set for the suite: the app should have none either (admin-auth checks it stays closed)';

test('admin-auth: the baker\'s routes need ADMIN_TOKEN, and stay closed when it is unset [security rule: secrets server-side only, fail closed]', async () => {
  for (const [method, path, body] of ADMIN_ROUTES) {
    for (const token of [null, '', 'wrong-token', 'Bearer']) {
      const r = await admin(method, path, { body, token });
      assert.ok([401, 403, 503].includes(r.status), `${method} ${path} with token ${JSON.stringify(token)} answered ${r.status}`);
    }
    if (TOKEN) {
      const ok = await admin(method, path, { body });
      assert.equal(ok.status, 200, `${method} ${path} with the right token: ${ok.status} ${ok.text}`);
    }
  }
  // Nothing was changed by the refused calls: the stock is as seeded.
  const loaves = await call('GET', `/api/loaves?date=${TOMORROW}`);
  assert.equal(loaves.json.loaves.find(l => l.id === 'sourdough').left, TOKEN ? 3 + 5 : 3);
});

test('restock: the baker adds loaves for a day and the stock left goes up by that much [Bo · Engineering: "Cap each loaf per pickup day"]', { skip: noToken }, async () => {
  assert.equal((await order([{ loaf_id: 'sourdough', qty: 3 }])).status, 201);
  assert.equal((await order([{ loaf_id: 'sourdough', qty: 1 }])).status, 409, 'sold out first');
  const r = await admin('POST', '/api/admin/restock', { body: { date: TOMORROW, loaf_id: 'sourdough', qty: 4 } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.left, 4);
  assert.equal((await call('GET', `/api/loaves?date=${TOMORROW}`)).json.loaves.find(l => l.id === 'sourdough').left, 4);
  assert.equal((await call('GET', `/api/loaves?date=${DAY_AFTER}`)).json.loaves.find(l => l.id === 'sourdough').left, 3, 'only that day');
  assert.equal((await order([{ loaf_id: 'sourdough', qty: 2 }])).status, 201, 'orderable again');
  for (const bad of [{ date: TOMORROW, loaf_id: 'cake', qty: 1 }, { date: TOMORROW, loaf_id: 'rye', qty: 0 }])
    assert.equal((await admin('POST', '/api/admin/restock', { body: bad })).status, 400, `bad restock ${JSON.stringify(bad)}`);
});

test('deliver: every held order flips to delivered, and her customer sees "Delivered: your sourdough is here" [Vincent\'s stage flow; Bo · Engineering]', { skip: noToken }, async () => {
  const a = await order([{ loaf_id: 'sourdough', qty: 1 }], { first_name: 'Ana' });
  const b = await order([{ loaf_id: 'rye', qty: 2 }]);
  const later = await call('POST', '/api/orders', { body: { pickup_date: DAY_AFTER, items: [{ loaf_id: 'rye', qty: 1 }] } });
  for (const o of [a, b, later]) assert.equal(o.status, 201, o.text);
  const before = await call('GET', `/api/orders/${a.json.id}/status`);
  assert.equal(before.status, 200, before.text);
  assert.equal(before.json.status, 'held');
  const d = await admin('POST', '/api/admin/deliver', { body: { date: TOMORROW } });
  assert.equal(d.status, 200, d.text);
  assert.equal(d.json.delivered, 2);
  const after = await call('GET', `/api/orders/${a.json.id}/status`);
  assert.equal(after.json.status, 'delivered');
  assert.equal(after.json.message, 'Delivered: your sourdough is here');
  assert.match((await call('GET', `/api/orders/${b.json.id}/status`)).json.message, /^Delivered: your .+ (is|are) here$/);
  assert.equal((await call('GET', `/api/orders/${later.json.id}/status`)).json.status, 'held', 'another day stays held');
  const list = await admin('GET', `/api/admin/orders?date=${TOMORROW}`);
  assert.deepEqual(list.json.orders.map(o => o.status).sort(), ['delivered', 'delivered']);
});

test('first-name-only: only a first name is stored about a customer: the admin list and status page show nothing else [her takeaway; Bo · Engineering]', { skip: noToken }, async () => {
  const r = await order([{ loaf_id: 'baguette', qty: 1 }], { first_name: 'Ana', phone: PHONE, email: 'ana@example.org', last_name: 'Silva' });
  // Refusing the order is fine too; then place it with the first name only.
  const o = r.status === 201 ? r : await order([{ loaf_id: 'baguette', qty: 1 }], { first_name: 'Ana' });
  assert.equal(o.status, 201, o.text);
  const list = await admin('GET', `/api/admin/orders?date=${TOMORROW}`);
  assert.equal(list.status, 200, list.text);
  assertNoPersonalData(list, 'the admin order list');
  assert.ok(!/ana@example\.org|Silva/.test(list.text), 'the admin order list holds personal data beyond a first name');
  assert.ok(list.json.orders.some(x => x.first_name === 'Ana'), 'the first name is kept');
  const st = await call('GET', `/api/orders/${o.json.id}/status`);
  assertNoPersonalData(st, 'the status page');
});
