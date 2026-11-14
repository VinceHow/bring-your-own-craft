// A throwaway stand-in for the bakery app, only to prove deploy/acceptance/bakery.acceptance.js runs and has teeth.
// In-memory, node:http, the deploy/ACCEPTANCE.md contract in test mode. STUB_FLAW=<rule> breaks one rule on purpose
// (phone · cutoff · stock · bakelist) so test/acceptance.test.js can check the suite catches it. Never deployed.
import http from 'node:http';

// `npm test` (node --test) globs test/**, so it loads this file as a test: there it does nothing, rather than listen forever.
if (process.env.NODE_TEST_CONTEXT) process.exit(0);

const PORT = Number(process.env.PORT) || 0;
const FLAW = process.env.STUB_FLAW || '';
let loaves = [], orders = [], seq = 0;
const ALLOWED = new Set(['pickup_date', 'items', 'first_name']);

const nowOf = req => { const u = new URL(req.url, 'http://x'); const n = req.headers['x-test-now'] || u.searchParams.get('now'); const d = n ? new Date(n) : new Date(); return isNaN(d) ? new Date() : d; };
const ymd = d => d.toISOString().slice(0, 10); // winter Europe/London = UTC, enough for a stub
const addDays = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const used = (date, id) => orders.filter(o => o.pickup_date === date).reduce((s, o) => s + o.items.filter(i => i.loaf_id === id).reduce((a, i) => a + i.qty, 0), 0);
const left = (date, l) => FLAW === 'stock' ? l.limit : l.limit - used(date, l.id);
const view = o => ({ id: o.id, status: 'held', pickup_date: o.pickup_date, pickup_window: { from: '07:00', to: '10:00' }, items: o.items, total_pence: o.total_pence,
  ...(o.first_name ? { first_name: o.first_name } : {}), ...(FLAW === 'phone' && o.phone ? { phone: o.phone } : {}) });
const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };

function placeOrder(body, now) {
  if (!body || typeof body !== 'object') return [400, { error: 'bad_order', message: 'no body' }];
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length || items.some(i => !loaves.find(l => l.id === i.loaf_id) || !(Number.isInteger(i.qty) && i.qty >= 1)))
    return [400, { error: 'bad_order', message: 'items need a known loaf and qty >= 1' }];
  const today = ymd(now), date = String(body.pickup_date || '');
  const late = date <= today || (date === addDays(today, 1) && now.getUTCHours() >= 20);
  if (late && FLAW !== 'cutoff') return [422, { error: 'cutoff', message: 'Orders for tomorrow close at 8pm.' }];
  for (const i of items) {
    const l = loaves.find(x => x.id === i.loaf_id);
    const want = items.filter(x => x.loaf_id === i.loaf_id).reduce((a, x) => a + x.qty, 0);
    if (left(date, l) < want) {
      let d = addDays(date, 1), n = 0; while (l.limit - used(d, l.id) < want && n++ < 14) d = addDays(d, 1);
      const offer = l.limit - used(d, l.id) >= want ? { action: 'hold_for_tomorrow', pickup_date: d } : undefined; // more than a day's limit: no day can take it
      return [409, { error: 'sold_out', loaf_id: l.id, ...(offer ? { offer } : {}) }];
    }
  }
  const o = { id: 'o' + (++seq), pickup_date: date, items: items.map(i => ({ loaf_id: i.loaf_id, qty: i.qty, price_pence: loaves.find(l => l.id === i.loaf_id).price_pence })),
    first_name: typeof body.first_name === 'string' ? body.first_name.slice(0, 40) : undefined };
  if (FLAW === 'phone') o.phone = body.phone; // the flaw: keeps and echoes the phone
  o.total_pence = o.items.reduce((s, i) => s + i.qty * i.price_pence, 0);
  orders.push(o);
  return [201, view(o)];
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  let raw = ''; for await (const c of req) raw += c;
  let body = null; try { body = raw ? JSON.parse(raw) : null; } catch { return send(res, 400, { error: 'bad_order', message: 'not JSON' }); }
  const now = nowOf(req);
  if (req.method === 'POST' && u.pathname === '/api/test/reset') { loaves = (body?.loaves || []).map(l => ({ ...l })); orders = []; seq = 0; return send(res, 200, { ok: true }); }
  if (req.method === 'GET' && u.pathname === '/api/loaves') { const date = u.searchParams.get('date'); return send(res, 200, { date, loaves: loaves.map(l => ({ ...l, left: left(date, l) })) }); }
  if (req.method === 'POST' && u.pathname === '/api/orders') {
    // Personal data: anything but first_name is dropped here (the contract allows refusing or dropping).
    if (body && typeof body === 'object') for (const k of Object.keys(body)) if (!ALLOWED.has(k) && !(FLAW === 'phone' && k === 'phone')) delete body[k];
    const [s, b] = placeOrder(body, now); return send(res, s, b);
  }
  const m = u.pathname.match(/^\/api\/orders\/([\w-]+)$/);
  if (req.method === 'GET' && m) { const o = orders.find(x => x.id === m[1]); return o ? send(res, 200, view(o)) : send(res, 404, { error: 'not_found' }); }
  if (req.method === 'GET' && u.pathname === '/api/bake-list') {
    const date = u.searchParams.get('date');
    const count = id => FLAW === 'bakelist' ? orders.reduce((s, o) => s + o.items.filter(i => i.loaf_id === id).reduce((a, i) => a + i.qty, 0), 0) : used(date, id);
    return send(res, 200, { date, loaves: loaves.map(l => ({ loaf_id: l.id, name: l.name, qty: count(l.id) })) });
  }
  send(res, 404, { error: 'not_found' });
});
server.listen(PORT, '127.0.0.1', () => console.log(`bakery stub on ${server.address().port}`));
