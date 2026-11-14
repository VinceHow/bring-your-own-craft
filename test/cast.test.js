// Any seat is hers: the seat-to-role table (design/studio/SEATS.md), the flex teammate written by one fast call (with
// a default on a slow or failed call), the cast on run.start, and prompts that speak in the role each seat wears.
// The Product path is untouched. Offline: fake models.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-cast-'));
const C = await import('../lib/cast.js');
const T = await import('../lib/teammates.js');
const { readEvents } = await import('../lib/events.js');
const runRoutes = (await import('../routes/run.js')).default;
const castRoutes = (await import('../routes/cast.js')).default;

// Call a route handler and read back the JSON it sent.
async function call(routes, p, body) {
  const r = routes.find(x => x.path === p);
  let code = 0, out = '';
  const res = { writeHead: c => { code = c; }, setHeader() {}, end: s => { out = s; } };
  await r.handler({ method: 'POST' }, res, { body, url: new URL('http://x' + p) });
  return { code, body: JSON.parse(out) };
}
const IDEA = 'A website for a small bakery, so customers can order bread ahead.';

test('the table: whose craft she takes moves to Product; a flex seat or her own craft moves Ines to Product', () => {
  const row = craft => C.TEAM.map(s => `${C.AGENTS[s]}:${C.rolesFor(craft)[s]}`).join(' ');
  assert.equal(row('product'), 'Mika:design Theo:data Noor:research Ines:strategy Bo:engineering');
  assert.equal(row('design'), 'Mika:product Theo:data Noor:research Ines:strategy Bo:engineering');
  assert.equal(row('research'), 'Mika:design Theo:data Noor:product Ines:strategy Bo:engineering');
  assert.equal(row('engineering'), 'Mika:design Theo:data Noor:research Ines:strategy Bo:product');
  assert.equal(row('data'), 'Mika:design Theo:flex Noor:research Ines:product Bo:engineering');
  assert.equal(row('strategy'), 'Mika:design Theo:data Noor:research Ines:product Bo:engineering');
  assert.equal(row('diy'), 'Mika:design Theo:flex Noor:research Ines:product Bo:engineering');
  // Product, Design, Research and Engineering are always at the table, whatever she takes
  for (const craft of [...C.CRAFTS, 'diy']) {
    const worn = new Set([craft, ...Object.values(C.rolesFor(craft))]);
    for (const core of ['product', 'design', 'research', 'engineering']) assert.ok(worn.has(core), `${craft}: ${core}`);
  }
});

test('the flex teammate: one fast call writes the card; slow, failed or unusable -> the default role', async () => {
  const good = await C.writeFlex('diy', { tag: { craft: 'Baker' }, callModel: async a => {
    assert.equal(a.model, 'haiku');
    assert.match(a.system, /her own craft: Baker/);
    return { name: 'operations', focus: 'the morning bake list and pickup', stance: 'nothing wasted', loves: 'Every loaf has a home.' };
  } });
  assert.deepEqual([good.role, good.flex.name, good.flex.brings], ['flex', 'Operations', 'the morning bake list and pickup calls for this page']);
  const slow = await C.writeFlex('diy', { limitMs: 30, callModel: () => new Promise(r => setTimeout(() => r({ name: 'Ops', focus: 'x' }), 200)) });
  assert.deepEqual([slow.role, /over 30 ms/.test(slow.fallback)], ['data', true]);
  const failed = await C.writeFlex('data', { callModel: async () => { throw new Error('boom'); } });
  assert.equal(failed.role, 'strategy', 'she took Data: the open flex seat defaults to Strategy');
  const taken = await C.writeFlex('diy', { callModel: async () => ({ name: 'Design', focus: 'x', stance: 'y', loves: 'z' }) });
  assert.equal(taken.role, 'data', 'a fixed craft name is not a flex role');
  assert.deepEqual(await C.writeFlex('design'), { role: null, ms: 0 }, 'no flex seat to write');
});

test('Product path: run.start is exactly what it was (no cast, no new fields)', async () => {
  const r = await call(runRoutes, '/api/run', { idea: IDEA, intro: 'I love the customer journey.' });
  const start = readEvents(r.body.run).find(e => e.type === 'run.start');
  assert.deepEqual(Object.keys(start).sort(), ['idea', 'intro', 'mode', 'pane', 'run', 'seat', 't', 'type']);
  assert.equal(start.seat, 'product');
  // a stray craft "product" or a flex card changes nothing either
  const r2 = await call(runRoutes, '/api/run', { idea: IDEA, craft: 'product', flex: { name: 'Ops', focus: 'x' } });
  assert.ok(!('cast' in readEvents(r2.body.run).find(e => e.type === 'run.start')));
});

test('another craft: run.start records the cast; the flex card is re-cleaned; a bad one falls back to the default', async () => {
  const r = await call(runRoutes, '/api/run', { idea: IDEA, craft: 'design' });
  const start = readEvents(r.body.run).find(e => e.type === 'run.start');
  assert.equal(start.seat, 'product', 'her seat id stays');
  assert.deepEqual(start.cast, { craft: 'design', roles: C.rolesFor('design') });
  const d = await call(runRoutes, '/api/run', { idea: IDEA, seat: 'diy', tag: { craft: 'Baker', goodAt: 'bread', loves: 'mornings' },
    flex: { name: 'Operations', focus: 'the <b>bake</b> list', stance: 'nothing wasted', loves: 'Every loaf has a home.' } });
  const ds = readEvents(d.body.run).find(e => e.type === 'run.start');
  assert.equal(ds.cast.roles.data, 'flex');
  assert.equal(ds.cast.flex.focus, 'the bbake/b list');
  const bad = await call(runRoutes, '/api/run', { idea: IDEA, craft: 'data', flex: { name: 'Strategy', focus: 'x' } });
  assert.equal(readEvents(bad.body.run).find(e => e.type === 'run.start').cast.roles.data, 'strategy');
});

test('/api/cast gives the table at once; the flex seat shows its default until the card is written', async () => {
  const r = await call(castRoutes, '/api/cast', { craft: 'diy' });
  assert.deepEqual([r.code, r.body.roles.strategy, r.body.roles.data, r.body.flexSeat], [200, 'product', 'data', 'data']);
  assert.equal((await call(castRoutes, '/api/cast', { craft: 'pirate' })).code, 400);
});

test('prompts speak in the role each seat wears; her seat speaks her craft; Product path prompts unchanged', async () => {
  const pr = await call(runRoutes, '/api/run', { idea: IDEA });
  const args = run => ({ run, idea: IDEA, flow: { nodes: [], edges: [] }, taste: [], herSeat: 'product' });
  // Product path: each seat as itself
  assert.match(T.systemFor('design', args(pr.body.run)), /You are the Design teammate/);
  // She took Design: Mika (seat 'design') wears Product with write-spec; her seat's engine speaks Design
  const dr = await call(runRoutes, '/api/run', { idea: IDEA, craft: 'design' });
  const mika = T.systemFor('design', args(dr.body.run));
  assert.match(mika, /You are the Product teammate/);
  assert.match(mika, /The person in the design seat owns the work/);
  assert.match(T.systemFor('product', args(dr.body.run)), /You are the Design teammate/);
  // Her own craft with a flex card: Theo speaks the flex role, Ines speaks Product, her seat has no separate engine
  const fr = await call(runRoutes, '/api/run', { idea: IDEA, seat: 'diy', tag: { craft: 'Baker' },
    flex: { name: 'Operations', focus: 'the morning bake list', stance: 'nothing wasted', loves: 'x' } });
  const theo = T.systemFor('data', { ...args(fr.body.run), herSeat: 'diy' });
  assert.match(theo, /You are the Operations teammate/);
  assert.match(theo, /Your craft is the morning bake list/);
  assert.match(T.systemFor('strategy', { ...args(fr.body.run), herSeat: 'diy' }), /You are the Product teammate/);
  const seen = [];
  await T.propose({ run: fr.body.run, idea: IDEA, flow: { nodes: [], edges: [] }, taste: [], herSeat: 'diy',
    callModel: async a => { seen.push(a.system.match(/You are the (\w+) teammate/)[1]); return { note: '', candidates: [] }; } });
  assert.deepEqual(seen.sort(), ['Design', 'Engineering', 'Operations', 'Product', 'Research']);
});

test('a question from the engine at her own seat is her craft\'s teammate (Design\'s), on the Product path still Product\'s', async () => {
  const { select } = await import('../lib/select.js');
  const cand = { id: 'c1', seat: 'product', decision: 'What leads the page for a regular', options: ['Their usual first', 'Today\'s bread first'],
    recommendation: 'Their usual first', reason: 'r', cost: 'high', undoable: true, attachTo: null };
  const fake = async a => (a.schema?.required?.includes('scores')
    ? { scores: [{ id: 'c1', big: 3, hers: 3, silent: 3, changes: 3, granular: false, showable: true, dupOf: null, kind: 'fork',
      question: 'What should ordering feel like for someone who comes every morning?', artifact: 'journey', settles: [] }] }
    : { decisions: [{ id: 'c1', choice: 'Their usual first', cites: 'team default' }] });
  const by = async craft => {
    const r = await call(runRoutes, '/api/run', { idea: IDEA, ...(craft ? { craft } : {}) });
    const out = await select({ run: r.body.run, idea: IDEA, flow: { nodes: [], edges: [] }, taste: [], candidates: [cand], callModel: fake });
    return out.asks[0]?.by;
  };
  assert.equal(await by('design'), "Design's teammate");
  assert.equal(await by(null), "Product's teammate");
});
