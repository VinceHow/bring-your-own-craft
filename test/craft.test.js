// "Your own craft" (DIY): her name tag, her tag in every prompt, and "in her seat" as the scorer's inCraft for DIY
// only, with the ceiling of three and the out-of-seat rule still in code. Offline: a fake model. A baker and a
// tattoo artist (a craft we've never listed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-craft-'));
const { nameTag, cleanTag, tagText, roughTag, templateFor } = await import('../lib/craft.js');
const { systemFor, propose, SEATS } = await import('../lib/teammates.js');
const { pickAsks, select, scoreCandidates } = await import('../lib/select.js');
const { MAX_ASKS } = await import('../lib/policy.js');
const { readEvents, newRunId } = await import('../lib/events.js');
const { initTaste, readTaste } = await import('../lib/taste.js');
const runRoutes = (await import('../routes/run.js')).default;
const buildRoutes = (await import('../routes/build.js')).default;

const BAKER = { craft: 'Baker', goodAt: 'mixing dough', loves: 'the first batch out at 6am' };
const TATTOO = { craft: 'Tattoo artist', goodAt: 'fine-line flowers', loves: 'the moment the stencil comes off' };
const flow = { nodes: [{ id: 'n1', label: 'Pick a pastry' }, { id: 'n2', label: 'Pick a time' }, { id: 'n3', label: 'Collect' }], edges: [] };
// Distinct wording per decision (the selector merges two that share words).
const WORDS = ['oven', 'flour', 'queue', 'ticket', 'stencil', 'needle', 'deposit', 'refund', 'menu', 'pickup', 'apron', 'crust',
  'glaze', 'basket', 'locker', 'parking', 'invoice', 'voucher', 'sticker', 'ribbon', 'candle', 'mirror', 'bucket', 'ladder',
  'lantern', 'marble', 'pebble', 'saddle', 'thimble', 'velvet', 'walnut'];
const cand = (i, extra = {}) => ({ id: `c${i}`, seat: ['design', 'data', 'strategy', 'engineering', 'research', 'product'][i % 6],
  decision: `${WORDS[i]} ${WORDS[(i + 13) % WORDS.length]}`, options: ['A', 'B'], recommendation: 'A', reason: 'r', cost: 'low', undoable: true, attachTo: null, ...extra });
const task = system => (system.match(/^# Task: ([\w-]+)/m) || [])[1];

test('her name tag: one call, her words; a failed call keeps her words, split roughly, craft left for her', async () => {
  let seen;
  const r = await nameTag("I'm good at mixing dough, and I love the first batch out at 6am", { callModel: async a => { seen = a; return { craft: 'baker', goodAt: "I'm good at mixing dough", loves: 'I love the first batch out at 6am.' }; } });
  assert.equal(r.code, 200);
  assert.deepEqual({ craft: r.body.craft, goodAt: r.body.goodAt, loves: r.body.loves }, BAKER);
  assert.match(seen.user, /mixing dough/);
  assert.match(seen.system, /in her own way/);
  const rough = await nameTag("I'm good at mixing dough, and I love the first batch out at 6am", { callModel: async () => { throw new Error('down'); } });
  assert.equal(rough.body.rough, true);
  assert.equal(rough.body.goodAt, 'mixing dough');
  assert.equal(rough.body.loves, 'the first batch out at 6am');
  assert.deepEqual(roughTag("I'm a tattoo artist and I love clean lines").craft, 'tattoo artist');
  assert.equal((await nameTag('')).code, 400);
  assert.equal(cleanTag({ craft: '', goodAt: 'x', loves: 'y' }), null);
  assert.equal(tagText(BAKER), 'Baker (good at mixing dough; loves the first batch out at 6am)');
});

test('every teammate prompt carries her tag in the DIY seat; the listed seats are unchanged', () => {
  for (const tag of [BAKER, TATTOO]) {
    for (const seat of SEATS) {
      const s = systemFor(seat, { idea: 'x', flow, taste: [], herSeat: 'diy', herTag: tag });
      assert.match(s, new RegExp(`The person in the ${tag.craft} seat owns the work`), seat);
      assert.ok(s.includes(tagText(tag)), `${seat} hears her tag`);
      assert.ok(!/\{\{|\}\}/.test(s), 'no unfilled slot');
    }
  }
  const p = systemFor('design', { idea: 'x', flow, taste: [], herSeat: 'product' });
  assert.match(p, /The person in the product seat owns the work/);
  assert.ok(!/About her, in her own words/.test(p), 'Priya in Product: no tag line');
});

test('propose and the scorer hear her tag; the scorer is asked inCraft only in the DIY seat', async () => {
  const systems = [];
  const fake = async ({ system, user }) => {
    systems.push(system);
    if (task(system) === 'teammate') return { note: 'n', candidates: [] };
    return { scores: JSON.parse(user).map(c => ({ id: c.id, changes: 2, silent: 3, expertise: 3, dupOf: null, kind: 'fork', inCraft: true })) };
  };
  await propose({ idea: 'tattoo bookings', flow, taste: [], herSeat: 'diy', herTag: TATTOO, callModel: fake, seats: ['design'] });
  assert.ok(systems[0].includes(tagText(TATTOO)));
  const diy = await scoreCandidates({ idea: 'x', flow, taste: [], herSeat: 'diy', herTag: TATTOO, candidates: [cand(1)], callModel: fake });
  assert.match(systems.at(-1), /`inCraft`: true only if answering it needs her craft as Tattoo artist/);
  assert.match(systems.at(-1), /She sits in the Tattoo artist seat/);
  assert.equal(diy.get('c1').inCraft, true);
  const prod = await scoreCandidates({ idea: 'x', flow, taste: [], herSeat: 'product', candidates: [cand(1)], callModel: fake });
  assert.ok(!/inCraft/.test(systems.at(-1)), 'Product: no inCraft question');
  assert.equal(prod.get('c1').inCraft, undefined, 'and an inCraft the model volunteers is dropped');
});

test('DIY: "in her seat" is inCraft (missing = out); out of her craft, cheap and undoable is refused; never more than 3', () => {
  const cs = [cand(1), cand(2), cand(3, { cost: 'high' }), cand(4)];
  const sc = new Map(cs.map(c => [c.id, { id: c.id, changes: 3, silent: 3, expertise: 3, dupOf: null, kind: 'fork', inCraft: c.id === 'c1' }]));
  const { picks, refused } = pickAsks(cs, sc, { flow, herSeat: 'diy' });
  assert.deepEqual(picks.map(p => p.candidate.id), ['c1', 'c3'], 'in her craft, or out of it but costly');
  assert.ok(picks[0].score.inSeat && !picks[1].score.inSeat);
  assert.match(picks[0].why, /^In your craft/);
  assert.match(picks[1].why, /^Outside your craft/);
  assert.deepEqual(refused.map(r => r.candidate.id).sort(), ['c2', 'c4']);
  // Product stays seat-equality: inCraft means nothing there.
  const prod = pickAsks(cs, sc, { flow, herSeat: 'product' });
  assert.ok(prod.picks.every(p => p.score.inSeat === (p.candidate.seat === 'product')));
  // The ceiling holds in the DIY seat whatever the scorer says.
  for (let k = 0; k < 300; k++) {
    const n = 1 + Math.floor(Math.random() * 30);
    const many = Array.from({ length: n }, (_, i) => cand(i + 1, { cost: Math.random() < 0.5 ? 'low' : 'high', attachTo: null }));
    const s = new Map(many.map(c => [c.id, { id: c.id, inCraft: Math.random() < 0.7, changes: 3, silent: 3, expertise: 3, dupOf: null, kind: 'fork' }]));
    assert.ok(pickAsks(many, s, { max: 99, flow, herSeat: 'diy' }).picks.length <= MAX_ASKS);
  }
});

test('select end to end in the DIY seat: at most 3 asks, the rest decided', async () => {
  const run = newRunId(`craft-${Math.random().toString(36).slice(2, 8)}`); initTaste(run);
  const cs = Array.from({ length: 10 }, (_, i) => cand(i + 1));
  const fake = async ({ system, user }) => task(system) === 'select'
    ? { scores: JSON.parse(user).map(c => ({ id: c.id, changes: 3, silent: 3, expertise: 3, dupOf: null, kind: 'fork', inCraft: true })) }
    : { decisions: JSON.parse(user).map(c => ({ id: c.id, choice: c.recommendation, cites: 'team default' })) };
  const r = await select({ run, idea: 'A pre-order page for my bakery', flow, taste: readTaste(run), herSeat: 'diy', herTag: BAKER, candidates: cs, callModel: fake });
  assert.equal(r.asks.length, 3);
  assert.equal(readEvents(run).filter(e => e.type === 'ask').length, 3);
});

// ---- the routes: her seat and tag on the run; no wrong page for an idea no template fits ----
function call(routes, method, pathname, body) {
  const url = new URL('http://x' + pathname);
  const r = routes.find(r => r.method === method && (r.match ? r.match(url) : r.path === url.pathname));
  return new Promise(resolve => {
    const res = { writeHead(code) { this.code = code; }, setHeader() {}, end(s) { resolve({ code: this.code, body: s ? JSON.parse(s) : null }); } };
    r.handler({ method }, res, { body, url });
  });
}

test('a DIY run logs her seat, her tag and the template her idea fits (none for a tattoo studio)', async () => {
  const baker = await call(runRoutes, 'POST', '/api/run', { idea: 'A pre-order page for my bakery', seat: 'diy', tag: BAKER });
  const s1 = readEvents(baker.body.run).find(e => e.type === 'run.start');
  assert.deepEqual([s1.seat, s1.tag, s1.template], ['diy', BAKER, 'cafe']);
  const ink = await call(runRoutes, 'POST', '/api/run', { idea: 'Flash day sign-ups for my tattoo shop', seat: 'diy', tag: TATTOO });
  const s2 = readEvents(ink.body.run).find(e => e.type === 'run.start');
  assert.equal(s2.template, null);
  const built = await call(buildRoutes, 'POST', `/api/run/${ink.body.run}/build`);
  assert.equal(built.code, 409);
  assert.equal(built.body.noTemplate, true);
  assert.ok(!readEvents(ink.body.run).some(e => e.type === 'build.step'), 'no build started, no wrong page');
  const priya = await call(runRoutes, 'POST', '/api/run', { idea: 'A booking page for a small yoga studio.', seat: 'product', tag: BAKER });
  const s3 = readEvents(priya.body.run).find(e => e.type === 'run.start');
  assert.deepEqual([s3.seat, s3.tag, s3.template], ['product', undefined, undefined], 'Product: no tag, no template gate');
  const odd = await call(runRoutes, 'POST', '/api/run', { idea: 'x', seat: 'nonsense' });
  assert.equal(readEvents(odd.body.run).find(e => e.type === 'run.start').seat, 'product');
  assert.equal(templateFor('Tattoo appointments at my studio'), 'yoga', 'bookable sessions fit the booking template');
});
