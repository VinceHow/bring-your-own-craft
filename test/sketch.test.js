// Design's first sketch, her reshape, her box edits, the prepared fallback and leaning in. Offline: a fake model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-sketch-'));
const { firstSketch, reshape, editFlow, sketchForIdea, currentLines, cleanShape, installLean } = await import('../lib/sketch.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');
const { parseFlow } = await import('../lib/flow.js');

const YOGA = 'A booking page for a small yoga studio.';
const newRun = (idea = YOGA) => { const run = newRunId('t'); logEvent(run, 'run.start', { mode: 'craft', idea, seat: 'product' }); return run; };
const types = run => readEvents(run).map(e => e.type);
const fake = shape => async () => shape;
const FIRST = { users: ['First-timers', 'Regulars', 'The studio owner'], stages: ['Find a class', 'Pick one', 'Confirm', 'Booked'] };
const opts = { dripMs: 0, withGuest: false }; // the guest chair has its own tests (test/guest.test.js)

test('first sketch: users then stages, each stage a flow.line through parseFlow; boxes as typed lines made', async () => {
  const run = newRun();
  const r = await firstSketch({ run, callModel: fake(FIRST), ...opts });
  assert.equal(r.code, 200);
  assert.deepEqual(r.body.users, [{ id: 'u1', label: 'First-timers' }, { id: 'u2', label: 'Regulars' }, { id: 'u3', label: 'The studio owner' }]);
  assert.deepEqual(types(run), ['run.start', 'sketch.user', 'sketch.user', 'sketch.user', 'flow.line', 'flow.line', 'flow.line', 'flow.line', 'sketch.done']);
  const lines = readEvents(run).filter(e => e.type === 'flow.line');
  assert.deepEqual(lines.at(-1).nodes, parseFlow(FIRST.stages).nodes, 'same boxes as if she had typed the lines');
  assert.equal(lines.at(-1).edges.length, 3);
  assert.ok(lines.every(e => !e.mode), "Design's lines are not her craft on the meter");
  const done = readEvents(run).at(-1);
  assert.equal(done.prepared, false);
  assert.equal(typeof done.ms, 'number');
  assert.deepEqual(currentLines(readEvents(run)), FIRST.stages);
  assert.equal((await firstSketch({ run, callModel: fake(FIRST), ...opts })).code, 409, 'one first sketch per run');
});

test('code owns the limits: 2-4 users, at most 7 main stages and two branches', () => {
  const s = cleanShape({ users: ['a', 'b', 'A', 'c', 'd', 'e'], stages: ['1', '2', '3', 'x → y', '4', '5', '6', '7', '8', 'p → q', 'r → s'] });
  assert.deepEqual(s.users, ['a', 'b', 'c', 'd']);
  assert.deepEqual(s.stages, ['1', '2', '3', 'x → y', '4', '5', '6', '7', 'p → q']);
  assert.throws(() => cleanShape({ users: [], stages: ['a', 'b'] }));
  assert.throws(() => cleanShape({ users: ['a'], stages: ['a'] }));
});

test('prepared fallback: over the limit, the yoga sketch comes in labelled prepared', async () => {
  const run = newRun();
  const never = () => new Promise(() => {});
  const t0 = Date.now();
  const r = await firstSketch({ run, callModel: never, limitMs: 150, ...opts });
  assert.ok(Date.now() - t0 < 1000, 'gives up at the limit');
  assert.equal(r.code, 200);
  assert.equal(r.body.prepared, true);
  const evs = readEvents(run);
  const done = evs.find(e => e.type === 'sketch.done');
  assert.equal(done.prepared, true);
  assert.match(done.error, /over/);
  assert.ok(evs.filter(e => e.type === 'sketch.user' || e.type === 'flow.line').every(e => e.prepared === true), 'every piece marked prepared');
  assert.deepEqual(currentLines(evs), ['Find a class', 'Pick one', 'Confirm', 'Booked']);
});

test('prepared fallback on a model error too; a non-yoga idea gets no prepared sketch, just an error', async () => {
  const boom = async () => { throw new Error('model error'); };
  const run = newRun();
  assert.equal((await firstSketch({ run, callModel: boom, ...opts })).body.prepared, true);
  const other = newRun('A pre-order page for a bakery.');
  const r = await firstSketch({ run: other, callModel: boom, ...opts });
  assert.equal(r.code, 502);
  assert.deepEqual(types(other), ['run.start', 'sketch.error']);
});

test('she started typing her own journey while Design sketched: nothing is drawn over it', async () => {
  const run = newRun();
  const slow = async () => { logEvent(run, 'flow.line', { mode: 'craft', text: 'classes', nodes: [], edges: [] }); return FIRST; };
  const r = await firstSketch({ run, callModel: slow, ...opts });
  assert.equal(r.body.skipped, true);
  assert.deepEqual(currentLines(readEvents(run)), ['classes']);
});

test('reshape replaces the flow: reshape (craft), flow.reset, the new users and lines', async () => {
  const run = newRun();
  await firstSketch({ run, callModel: fake(FIRST), ...opts });
  let seen;
  const model = async ({ system, user }) => { seen = { system, user }; return {
    users: ['Regulars', 'First-timers', 'The studio owner'],
    stages: ['Find a class', 'Pick one', 'Regulars → Book your usual', 'Confirm', 'Booked'] }; };
  const text = 'regulars matter most; they rebook the same class every week';
  const r = await reshape({ run, text, callModel: model, ...opts });
  assert.equal(r.code, 200);
  assert.match(seen.user, /rebook the same class/);
  assert.match(seen.system, /- Find a class/, 'Design sees its own sketch');
  assert.match(seen.system, /- First-timers/);
  const evs = readEvents(run);
  const i = evs.findIndex(e => e.type === 'reshape');
  assert.equal(evs[i].mode, 'craft');
  assert.equal(evs[i].text, text);
  assert.equal(evs[i + 1].type, 'flow.reset');
  assert.deepEqual(evs[i + 1].touched, ['Book your usual']);
  assert.deepEqual(currentLines(evs), ['Find a class', 'Pick one', 'Regulars → Book your usual', 'Confirm', 'Booked']);
  const flow = parseFlow(currentLines(evs));
  assert.equal(flow.nodes.length, 5, 'replaced, not appended');
  assert.deepEqual(flow.edges.find(e => e.label === 'Regulars'), { from: 'n1', to: 'n3', label: 'Regulars' });
  assert.equal(evs.at(-1).type, 'sketch.done');
  assert.equal(evs.at(-1).reshape, true);
  assert.equal(r.body.users[0].label, 'Regulars');
});

test('a failed reshape leaves her flow as it was', async () => {
  const run = newRun();
  await firstSketch({ run, callModel: fake(FIRST), ...opts });
  const r = await reshape({ run, text: 'more for regulars', callModel: async () => { throw new Error('nope'); }, ...opts });
  assert.equal(r.code, 502);
  assert.deepEqual(currentLines(readEvents(run)), FIRST.stages);
  assert.ok(!types(run).includes('flow.reset'));
});

test('a direct box edit: no model; flow.reset (craft, once) then the lines; touched = renamed or added', async () => {
  const run = newRun();
  await firstSketch({ run, callModel: fake(FIRST), ...opts });
  const r = editFlow({ run, lines: ['Find a class', 'Pick one', 'Book it', '  '] });
  assert.equal(r.code, 200);
  assert.deepEqual(r.body.nodes.map(n => n.label), ['Find a class', 'Pick one', 'Book it']);
  const evs = readEvents(run);
  const reset = evs.findLast(e => e.type === 'flow.reset');
  assert.equal(reset.mode, 'craft');
  assert.deepEqual(reset.touched, ['Book it']);
  assert.deepEqual(currentLines(evs), ['Find a class', 'Pick one', 'Book it']);
  assert.equal(editFlow({ run, lines: [] }).code, 400);
});

test('lean: emitted only when a candidate attaches to a box she touched, once per seat and box', async () => {
  installLean();
  const run = newRun();
  await firstSketch({ run, callModel: fake(FIRST), ...opts });
  editFlow({ run, lines: ['Find a class', 'Pick one', 'Book your usual', 'Booked'] }); // n3 is hers now
  logEvent(run, 'candidate', { id: 'c1', seat: 'strategy', decision: 'Class pass first', reason: 'Regulars buy passes', attachTo: 'n3' });
  logEvent(run, 'candidate', { id: 'c2', seat: 'strategy', decision: 'Another on it', attachTo: 'n3' });
  logEvent(run, 'candidate', { id: 'c3', seat: 'data', decision: 'Count searches', attachTo: 'n1' });
  logEvent(run, 'candidate', { id: 'c4', seat: 'data', decision: 'Nowhere', attachTo: null });
  const leans = readEvents(run).filter(e => e.type === 'lean');
  assert.equal(leans.length, 1);
  assert.deepEqual({ seat: leans[0].seat, nodeId: leans[0].nodeId, reason: leans[0].reason, label: leans[0].label },
    { seat: 'strategy', nodeId: 'n3', reason: 'Regulars buy passes', label: 'Book your usual' });
  const plain = newRun();
  await firstSketch({ run: plain, callModel: fake(FIRST), ...opts });
  logEvent(plain, 'candidate', { id: 'c1', seat: 'strategy', decision: 'x', attachTo: 'n1' });
  assert.ok(!types(plain).includes('lean'), 'no lean without her touching anything');
});

test('the close: sketchForIdea returns the shape without logging a run', async () => {
  const r = await sketchForIdea('A page for a bike repair pop-up.', { callModel: fake({ users: ['Commuters', 'The mechanic'], stages: ['Find a slot', 'Drop off', 'Pick up'] }) });
  assert.equal(r.code, 200);
  assert.deepEqual(r.body.stages, ['Find a slot', 'Drop off', 'Pick up']);
  assert.equal(r.body.nodes.length, 3);
  assert.equal(r.body.prepared, false);
  const slow = await sketchForIdea(YOGA, { callModel: () => new Promise(() => {}), limitMs: 100 });
  assert.equal(slow.body.prepared, true);
});

test('prepared sketches: yoga, and the bakery once its file exists; nothing for other ideas', async () => {
  const { preparedFor } = await import('../lib/sketch.js');
  const fsm = await import('node:fs'), pathm = await import('node:path');
  assert.ok(preparedFor('A booking page for a small yoga studio.'));
  const bakery = pathm.join(pathm.dirname(new URL(import.meta.url).pathname), '..', 'data', 'prepared-sketch-bakery.json');
  assert.equal(!!preparedFor('A pre-order page for my bakery'), fsm.existsSync(bakery));
  assert.equal(preparedFor('Flash day sign-ups for my tattoo shop'), null);
});
