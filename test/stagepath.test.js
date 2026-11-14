// The stage path end to end with a fake model (DEMO stage flow): exactly three things reach her, each through the ask
// policy: the first decision ("Who is this really for?", from Design's fast sketch), the quick unblock, and one focus
// moment from the selector. A fourth is refused. Offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-stage-'));
const { proposeAndSelect, askOne } = await import('../lib/select.js');
const { firstAsk, firstAnswer, selectorMax, cleanFirst, addsContact, FIRST_SCHEMA } = await import('../lib/first.js');
const { answerUnblock } = await import('../lib/unblock.js');
const { firstSketch } = await import('../lib/sketch.js');
const { MAX_ASKS, askCount } = await import('../lib/policy.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');
const { initTaste, readTaste } = await import('../lib/taste.js');
const { parseFlow } = await import('../lib/flow.js');

const BAKERY = "An ordering website for my friend's small bakery, so customers can order bread ahead";
const SHAPE = { users: ['Morning regulars', 'Weekend pastry crowd', 'The bakers'], stages: ['Choose bread', 'Order ahead', 'Pick up'] };
const RESHAPED = { users: ['Morning regulars', 'The bakers'], stages: ['Reserve your usual', 'Held till 10', 'Pick up warm'] };
const FIRST = { decisions: [
  { seat: 'design', decision: 'The home screen', choice: 'Their usual loaf one tap away' },
  { seat: 'engineering', decision: 'How long a loaf is held', choice: 'Held until 10am' },
  { seat: 'engineering', decision: 'Accounts', choice: 'No login' },
  { seat: 'design', decision: 'The order form', choice: 'No phone field' },
  { seat: 'product', decision: 'not a teammate', choice: 'dropped' },
  { seat: 'data', decision: 'A question?', choice: 'What should we count?' },
] };
const task = system => (system.match(/^# Task: ([\w-]+)/m) || [])[1];
const strong = c => ({ id: c.id, changes: 3, silent: 3, big: 3, hers: 3, granular: false, showable: true, dupOf: null, kind: 'fork',
  question: `What should ${c.id} feel like?`, artifact: 'wires', settles: [c.id] });
let reshaped = 0;
const fake = async ({ system, user, schema }) => {
  if (schema === FIRST_SCHEMA) return FIRST;
  const t = task(system);
  if (t === 'select') return { scores: JSON.parse(user).map(strong) };
  if (t === 'decide') return { decisions: JSON.parse(user).map(c => ({ id: c.id, choice: c.recommendation, cites: 'team default' })) };
  if (t === 'teammate') return { note: 'ok', candidates: [1, 2].map(i => ({ decision: `Call ${i} ${Math.random().toString(36).slice(2, 6)}`,
    options: ['A', 'B'], recommendation: 'A', reason: 'r', cost: 'high', undoable: false, attachTo: null })) };
  if (/Her reaction/.test(user)) { reshaped++; return RESHAPED; }
  if (/The idea, in her words/.test(user)) return SHAPE;
  throw new Error('unexpected call: ' + (t || system.slice(0, 60)));
};
const newRun = stagePath => {
  const run = newRunId(`s-${Math.random().toString(36).slice(2, 10)}`);
  initTaste(run);
  logEvent(run, 'run.start', { mode: 'craft', idea: BAKERY, seat: 'product', ...(stagePath ? { stagePath: true } : {}) });
  return run;
};

test('the stage path: the first decision, then the unblock, then one focus moment are the three grants, in order; a fourth is refused', async () => {
  const run = newRun(true);
  assert.equal((await firstSketch({ run, callModel: fake, dripMs: 0, withGuest: false })).code, 200);
  // 1. The first decision, from Design's sketch (no selector, no model call).
  const a1 = firstAsk({ run });
  assert.equal(a1.code, 200);
  assert.equal(a1.body.question, 'Who is this really for?');
  assert.equal(a1.body.by, 'Mika');
  assert.deepEqual(a1.body.users, SHAPE.users);
  assert.equal(firstAsk({ run }).code, 409, 'asked once');
  // Her answer: the journey redraws and a run of decisions settles at once, each with its teammate.
  const r = await firstAnswer({ run, askId: a1.body.id, text: "It's really for the regulars. They come every morning and hate it when the sourdough's gone by nine.", callModel: fake, unblockDelayMs: 0 });
  assert.equal(r.code, 200);
  assert.equal(reshaped, 1, 'Design reshaped from her answer');
  const evs = readEvents(run);
  assert.ok(evs.some(e => e.type === 'reshape' && e.askId === a1.body.id));
  const dec = evs.filter(e => e.type === 'decided' && e.round === 'first');
  assert.deepEqual(dec.map(d => d.choice), ['Their usual loaf one tap away', 'Held until 10am', 'No login', 'No phone field']);
  assert.ok(dec.every(d => d.cites === 'her answer' && d.follows === a1.body.id && ['design', 'engineering'].includes(d.seat) && d.by));
  assert.ok(evs.some(e => e.type === 'first.done' && e.decided === 4 && e.reshaped));
  // 2. The quick unblock (builder 1's card) is raised once the decisions have settled: Bo, with the team's suggestion.
  const ub = readEvents(run).filter(e => e.type === 'ask' && e.unblock);
  assert.equal(ub.length, 1, 'the unblock is granted');
  assert.equal(ub[0].seat, 'engineering');
  assert.match(ub[0].question, /When do orders close/);
  assert.deepEqual(answerUnblock(run, { askId: ub[0].id, yes: true })[0], 200);
  assert.ok(readEvents(run).some(e => e.type === 'decided' && e.unblock && e.choice === '8pm the night before'));
  // 3. The selector, on the stage path, brings one focus moment.
  assert.equal(selectorMax(run), 1);
  const lines = readEvents(run).filter(e => e.type === 'flow.line').slice(-3).map(e => e.text);
  const sel = await proposeAndSelect({ run, idea: BAKERY, flow: parseFlow(lines), taste: readTaste(run), callModel: fake, max: selectorMax(run) });
  assert.equal(sel.asks.length, 1, 'one focus moment');
  assert.equal(askCount(run), MAX_ASKS);
  assert.deepEqual(readEvents(run).filter(e => e.type === 'ask').map(e => e.id), [a1.body.id, ub[0].id, sel.asks[0].id], 'first decision, unblock, focus moment');
  // 4. A fourth, by any door, is refused and decided for her.
  assert.equal(askOne(run, { id: 'extra', seat: 'data', decision: 'One more', question: 'One more?' }, { source: 'test' }), null);
  const refused = readEvents(run).filter(e => e.type === 'ask.refused' && e.id === 'extra');
  assert.equal(refused.length, 1);
  assert.match(refused[0].reason, /cap of 3/);
  assert.equal(askCount(run), 3);
});

test('off the stage path the selector may bring up to the rest of the three', async () => {
  const run = newRun(false);
  await firstSketch({ run, callModel: fake, dripMs: 0, withGuest: false });
  assert.equal(selectorMax(run), 3);
  firstAsk({ run });
  assert.equal(selectorMax(run), 2);
  assert.equal(selectorMax(newRun(true)), 1);
});

test('the first decision waits for the sketch; her answer needs words; the model never adds a question or a stranger', async () => {
  const run = newRun(true);
  assert.equal(firstAsk({ run }).code, 409);
  assert.equal((await firstAnswer({ run, text: 'x', callModel: fake })).code, 404);
  assert.deepEqual(cleanFirst(FIRST).map(d => d.seat), ['design', 'engineering', 'engineering', 'design']);
  await firstSketch({ run, callModel: fake, dripMs: 0, withGuest: false });
  const a = firstAsk({ run }).body;
  assert.equal((await firstAnswer({ run, askId: a.id, text: '  ', callModel: fake })).code, 400);
});

test('her first decision never brings back a field she didn\'t ask for: "name and phone" is dropped, "No phone field" stays', () => {
  const raw = { decisions: [
    { seat: 'engineering', decision: 'Accounts', choice: 'No login; order with name and phone only' },
    { seat: 'design', decision: 'The order form', choice: 'Ask for their email for receipts' },
    { seat: 'design', decision: 'The order form', choice: 'Add a delivery address field' },
    { seat: 'design', decision: 'The order form', choice: 'No phone field' },
    { seat: 'engineering', decision: 'Accounts', choice: 'No login' },
    { seat: 'design', decision: 'The home screen', choice: 'Their usual loaf one tap away' },
  ] };
  const said = "An ordering website for my friend's bakery. It's really for the regulars.";
  assert.deepEqual(cleanFirst(raw, said).map(d => d.choice), ['No phone field', 'No login', 'Their usual loaf one tap away']);
  // She mentioned it herself: kept.
  assert.equal(addsContact({ decision: 'Confirmations', choice: 'Text them on their phone when it is ready' }, 'text me on my phone when it is ready'), false);
  assert.equal(addsContact({ decision: 'Confirmations', choice: 'Text them on their phone when it is ready' }, said), true);
});
