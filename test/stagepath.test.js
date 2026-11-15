// The stage path end to end with a fake model (DEMO stage flow): the stage path raises exactly its three moments, each
// through the ask policy: the first decision ("Who is this really for?", from Design's fast sketch), the quick unblock,
// and one focus moment; the selector brings nothing else there. Offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-stage-'));
const { proposeAndSelect, askOne } = await import('../lib/select.js');
const { noPronouns, regularsFinding, firstAsk, firstAnswer, followFirst, feelAsk, rewriteFeel, installStagePath, selectorMax, cleanFirst, addsContact, FIRST_SCHEMA, STEPS_SCHEMA } = await import('../lib/first.js');
const { answerUnblock } = await import('../lib/unblock.js');
const { firstSketch } = await import('../lib/sketch.js');
const { askCount } = await import('../lib/policy.js');
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

const FINDING = { title: 'A third of artisan-bakery visitors buy bread there every week', claim: 'A third buy bread weekly.',
  quote: 'A third (33%) of UK adults who visit artisan bakeries now buy bread there at least once a week', url: 'https://example.org/report',
  site: 'Bakery Business', fetched: '2026-11-14', label: 'researched before the demo' };
const STEPS = { steps: [{ time: '7:05', text: 'Sam leaves for work, thinking of the sourdough' }, { time: '7:10', text: 'Sam reserves the usual on the bus' },
  { time: '7:40', text: 'Sam picks it up, still warm' }, { time: '', text: 'The baker knows how many to bake' }] };
const fake2 = async (o) => o.schema === STEPS_SCHEMA
  ? (/herWords/.test(o.user) ? { steps: STEPS.steps.map((x, i) => i === 1 ? { ...x, text: 'Sam does nothing: the usual is already held' } : x) } : STEPS)
  : fake(o);

test('the stage path raises exactly its moments, in order: Focus 1, the unblock, Focus 2; the selector brings none', async () => {
  const run = newRun(true);
  assert.equal((await firstSketch({ run, callModel: fake, dripMs: 0, withGuest: false })).code, 200);
  // 1. Focus 1: Noor asks who to build it for first, with the verified finding (quote, URL, date) in front of her.
  const a1 = firstAsk({ run, finding: FINDING });
  assert.equal(a1.code, 200);
  assert.equal(a1.body.question, 'Who should we build this for first?');
  assert.deepEqual([a1.body.seat, a1.body.by, a1.body.artifact.kind], ['research', 'Noor', 'finding']);
  assert.equal(a1.body.artifact.ref.quote, FINDING.quote);
  assert.equal(a1.body.artifact.ref.url, FINDING.url);
  assert.deepEqual(a1.body.users, SHAPE.users);
  assert.equal(firstAsk({ run, finding: FINDING }).code, 409, 'asked once');
  // Her answer (logged by the meeting, POST /answer) is followed: the journey redraws, a run of decisions settles.
  logEvent(run, 'answer', { askId: a1.body.id, text: "It's really for the regulars." });
  const r = await followFirst({ run, askId: a1.body.id, text: "It's really for the regulars. They come every morning and hate it when the sourdough's gone by nine.", callModel: fake, unblockDelayMs: 0 });
  assert.equal(r.code, 200);
  assert.equal((await followFirst({ run, askId: a1.body.id, text: 'again', callModel: fake })).code, 409, 'followed once');
  const evs = readEvents(run);
  assert.ok(evs.some(e => e.type === 'reshape' && e.askId === a1.body.id), 'Design redrew the journey from her answer');
  const dec = evs.filter(e => e.type === 'decided' && e.round === 'first');
  assert.deepEqual(dec.map(d => d.choice), ['Their usual loaf one tap away', 'Held until 10am', 'No login', 'No phone field']);
  assert.ok(dec.every(d => d.cites === 'her answer' && d.follows === a1.body.id && ['design', 'engineering'].includes(d.seat) && d.by));
  assert.ok(evs.some(e => e.type === 'first.done' && e.decided === 4 && e.reshaped));
  // 2. The quick unblock follows: Bo, with the team's suggestion; she says yes.
  const ub = readEvents(run).filter(e => e.type === 'ask' && e.unblock);
  assert.equal(ub.length, 1, 'the unblock is granted');
  assert.match(ub[0].question, /When do orders close/);
  assert.equal(answerUnblock(run, { askId: ub[0].id, yes: true })[0], 200);
  // 3. Focus 2: Mika's rough morning journey in words, then her answer, then Mika's rewrite.
  const a2 = await feelAsk({ run, callModel: fake2 });
  assert.equal(a2.code, 200);
  assert.deepEqual([a2.body.question, a2.body.by, a2.body.artifact.kind], ['What should this feel like for a regular?', 'Mika', 'journey-words']);
  assert.equal(a2.body.steps.length, 4);
  assert.ok(readEvents(run).some(e => e.type === 'journey.words' && e.steps.length === 4));
  const rw = await rewriteFeel({ run, text: 'Like the baker already knows you.', callModel: fake2 });
  assert.equal(rw.code, 200);
  assert.deepEqual(rw.body.steps.map(x => !!x.new), [false, true, false, false], 'only the steps her words change are rewritten');
  // The selector brings none on the stage path: only its moments, in order.
  assert.equal(selectorMax(run), 0);
  const lines = readEvents(run).filter(e => e.type === 'flow.line').slice(-3).map(e => e.text);
  const sel = await proposeAndSelect({ run, idea: BAKERY, flow: parseFlow(lines), taste: readTaste(run), callModel: fake, max: selectorMax(run) });
  assert.equal(sel.asks.length, 0);
  assert.equal(askCount(run), 3, 'Focus 1, the unblock and Focus 2: the stage path\'s moments, raised by the server');
  assert.deepEqual(readEvents(run).filter(e => e.type === 'ask').map(e => e.id), [a1.body.id, ub[0].id, a2.body.id], 'Focus 1, unblock, Focus 2');
  // 4. The same question twice is refused (each decision is settled by at most one ask).
  assert.equal(askOne(run, { id: a2.body.id, seat: 'design', decision: 'again', question: 'Again?' }, { source: 'test' }), null);
  assert.equal(askCount(run), 3);
});

test('her answers drive it: the installed listener follows Focus 1, raises Focus 2 after the unblock, and rewrites', async () => {
  installStagePath({ callModel: fake2 });
  const run = newRun(true);
  await firstSketch({ run, callModel: fake, dripMs: 0, withGuest: false });
  firstAsk({ run, finding: FINDING });
  const a1 = readEvents(run).find(e => e.type === 'ask' && e.first); // raised by the listener on sketch.done, or just now
  const until = async (fn, what) => { for (let i = 0; i < 250; i++) { if (fn(readEvents(run))) return; await new Promise(r => setTimeout(r, 30)); } throw new Error('timed out: ' + what); };
  // the unblock follows UNBLOCK_DELAY_MS (3.5 s) after the decisions, as on stage
  logEvent(run, 'answer', { askId: a1.id, text: "It's for the regulars." });
  await until(evs => evs.some(e => e.type === 'first.done'), 'Focus 1 followed');
  await until(evs => evs.some(e => e.type === 'ask' && e.unblock), 'the unblock');
  const ub = readEvents(run).find(e => e.type === 'ask' && e.unblock);
  answerUnblock(run, { askId: ub.id, yes: true });
  await until(evs => evs.some(e => e.type === 'ask' && e.feel), 'Focus 2');
  logEvent(run, 'answer', { askId: 'feel', text: 'Like being known.' });
  await until(evs => evs.some(e => e.type === 'journey.words.rewritten'), 'Mika rewrote it');
  assert.deepEqual(readEvents(run).filter(e => e.type === 'ask').map(e => e.first ? 'first' : e.unblock ? 'unblock' : e.feel ? 'feel' : 'other'), ['first', 'unblock', 'feel']);
});

test('off the stage path the selector brings only what passes its bar (no count), and nothing of Act 2 runs; with no verified finding Focus 1 makes no claim', async () => {
  const run = newRun(false);
  await firstSketch({ run, callModel: fake, dripMs: 0, withGuest: false });
  assert.equal(selectorMax(run), undefined, 'no count off the stage path: the ranking and threshold decide');
  assert.equal((await feelAsk({ run, callModel: fake2 })).code, 409);
  assert.equal(selectorMax(newRun(true)), 0);
  const run2 = newRun(true); // no sketch yet, so the listener hasn't raised it
  const plain = firstAsk({ run: run2, finding: null, early: true }).body;
  assert.deepEqual([plain.seat, plain.artifact.kind], ['design', 'journey']);
  assert.equal(JSON.stringify(plain).includes('researched before the demo'), false);
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

test('Mika\'s morning never puts a pronoun in the room: any that slip through become the regular\'s name', () => {
  assert.equal(noPronouns('She reorders her usual loaf; they hold it for him.'), "Sam reorders Sam's usual loaf; Sam hold it for Sam.");
  assert.equal(noPronouns('Sam picks it up, still warm.'), 'Sam picks it up, still warm.');
  assert.equal(noPronouns('The baker knows how many to bake'), 'The baker knows how many to bake');
});

test('Focus 1 says why it fell back to the journey (never silently): no finding, unreadable file, or not a bakery idea', async () => {
  const run = newRun(true);
  const a = firstAsk({ run, finding: null, why: 'could not read the data file: ENOENT', early: true }).body;
  assert.equal(a.findingFallback, 'could not read the data file: ENOENT');
  const fs2 = await import('node:fs'), os2 = await import('node:os'), path2 = await import('node:path');
  const dir = fs2.mkdtempSync(path2.join(os2.tmpdir(), 'with space '));
  assert.equal(regularsFinding(dir), null);
  assert.match(regularsFinding.why, /could not read/);
  fs2.writeFileSync(path2.join(dir, 'research-finding-bakery.json'), JSON.stringify({ regulars: { quote: 'q', url: 'https://x', fetched: '2026-11-14', title: 't' } }));
  assert.equal(regularsFinding(dir).quote, 'q', 'reads from a folder with a space in its name');
  assert.ok(regularsFinding().quote.startsWith('A third (33%)'), 'the repo\'s verified finding');
});

test('an old client (no stagePath sent) with the team started before Design\'s sketch: Focus 1 with Noor\'s finding is still her first question', async () => {
  const { gateFirst } = await import('../lib/first.js');
  const run = newRunId(`s-${Math.random().toString(36).slice(2, 10)}`);
  initTaste(run);
  // routes/run.js marks every run the stage path unless the room asks for ?path=full; an old client sends nothing.
  logEvent(run, 'run.start', { mode: 'craft', idea: BAKERY, seat: 'product', stagePath: true });
  const sel = await proposeAndSelect({ run, idea: BAKERY, flow: parseFlow([]), taste: readTaste(run), callModel: fake, gate: () => gateFirst(run) });
  assert.equal(sel.asks.length, 0, 'the selector brings none on the stage path');
  const asks = readEvents(run).filter(e => e.type === 'ask');
  assert.equal(asks.length, 1);
  assert.equal(asks[0].first, true);
  assert.equal(asks[0].artifact.kind, 'finding', "Noor's finding, not a model-written question");
  assert.match(asks[0].artifact.ref.quote, /^A third \(33%\)/);
});
