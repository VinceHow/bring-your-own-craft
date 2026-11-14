// The selector and its cap. Offline: a fake model is injected; nothing here touches the network except the one
// test marked LIVE, which runs only with LIVE=1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-select-'));
const { pickAsks, select, decideRest, checkCitation, proposeAndSelect, selectForIdea, loadRest } = await import('../lib/select.js');
const { MAX_ASKS, claimGrantor } = await import('../lib/policy.js');
const { readEvents, newRunId } = await import('../lib/events.js');
const { initTaste, writeLine, readTaste } = await import('../lib/taste.js');

const flow = { nodes: [{ id: 'n1', label: 'classes' }, { id: 'n2', label: 'a class' }, { id: 'n3', label: 'confirm' }], edges: [] };
const task = system => (system.match(/^# Task: ([\w-]+)/m) || [])[1];
const cand = (i, extra = {}) => ({ id: `c${i}`, seat: 'product', decision: `Decision ${i}`, options: ['A', 'B'],
  recommendation: 'A', reason: 'r', cost: 'high', undoable: false, attachTo: null, ...extra });
// Every fixture score clears the bar and carries its own natural question (the scorer writes one per pick).
const q = c => `What does ${c.id} mean to the people who book?`;
const strong = c => ({ id: c.id, changes: 3, silent: 3, big: 3, hers: 3, granular: false, showable: true, dupOf: null, kind: 'fork', question: q(c), artifact: 'journey', settles: [c.id] });
const strongScores = cs => ({ scores: cs.map(strong) });

// A fake model: select and decide answers from the given functions; teammates from `team`.
function fakeModel({ score, decide, team, soundsLike } = {}) {
  return async ({ system, user }) => {
    const t = task(system);
    const items = t === 'select' || t === 'decide' ? JSON.parse(user) : null;
    if (t === 'select') return score ? score(items, system) : strongScores(items);
    if (t === 'decide') return decide ? decide(items) : { decisions: items.map(c => ({ id: c.id, choice: c.recommendation, cites: 'team default' })) };
    if (t === 'teammate') return team(system);
    if (t === 'sounds-like') return { text: soundsLike || 'Sounds like: never ask for what you could remember.' };
    throw new Error('unexpected task ' + t);
  };
}
// newRunId is millisecond-based; two in the same ms collide, so tests add a random part.
const newRun = () => { const r = newRunId(`t-${Math.random().toString(36).slice(2, 10)}`); initTaste(r); return r; };

test('a fourth never gets through: 10 strong candidates, at most 3 asks', async () => {
  const cs = Array.from({ length: 10 }, (_, i) => cand(i + 1));
  const run = newRun();
  const r = await select({ run, idea: 'x', flow, taste: readTaste(run), candidates: cs, callModel: fakeModel() });
  assert.equal(MAX_ASKS, 3);
  assert.equal(r.asks.length, 3);
  assert.equal(readEvents(run).filter(e => e.type === 'ask').length, 3);
  assert.equal(readEvents(run).filter(e => e.type === 'decided').length, 7); // the rest are decided, none dropped
  const done = readEvents(run).find(e => e.type === 'select.done');
  assert.deepEqual([done.came, done.brought], [10, 3]);
});

test('a fourth never gets through: whatever max is passed, and over random scores', () => {
  const cs = Array.from({ length: 10 }, (_, i) => cand(i + 1));
  const scores = new Map(strongScores(cs).scores.map(s => [s.id, s]));
  for (const max of [3, 4, 10, Infinity, NaN, undefined]) assert.ok(pickAsks(cs, scores, { max, flow }).picks.length <= 3, `max=${max}`);
  for (let k = 0; k < 500; k++) {
    const n = 1 + Math.floor(Math.random() * 30);
    const many = Array.from({ length: n }, (_, i) => cand(i + 1, { cost: Math.random() < 0.5 ? 'low' : 'high', undoable: Math.random() < 0.5 }));
    const sc = new Map(many.map(c => [c.id, { id: c.id, inSeat: Math.random() < 0.5, changes: Math.floor(Math.random() * 4),
      silent: Math.floor(Math.random() * 4), dupOf: Math.random() < 0.2 ? `c${1 + Math.floor(Math.random() * n)}` : null, kind: 'fork' }]));
    assert.ok(pickAsks(many, sc, { max: 99, flow }).picks.length <= 3);
  }
});

test('a fourth never gets through: the door re-counts the log, across selector runs on the same run', async () => {
  const run = newRun();
  const cs = Array.from({ length: 10 }, (_, i) => cand(i + 1));
  await select({ run, idea: 'x', flow, taste: readTaste(run), candidates: cs.slice(0, 5), callModel: fakeModel() });
  await select({ run, idea: 'x', flow, taste: readTaste(run), candidates: cs.slice(5), callModel: fakeModel() });
  const evs = readEvents(run);
  assert.equal(evs.filter(e => e.type === 'ask').length, 3);
  assert.equal(evs.filter(e => e.type === 'ask.refused' && /cap of 3/.test(e.reason)).length, 3);
  assert.throws(() => claimGrantor(), /belongs to the selector/); // nobody else can mint a grant
});

test('the bar replaces the seat rule: a big question from any teammate can reach her; a small one cannot', async () => {
  const run = newRun();
  const cs = [
    cand(1, { seat: 'design', decision: 'What booking should feel like', cost: 'low', undoable: true }),
    cand(2, { seat: 'engineering', decision: 'Which hosting provider', cost: 'high', undoable: false }),
    cand(3, { decision: 'Who the page is for first' }),
  ];
  const score = items => ({ scores: items.map(c => c.id === 'c2' ? { ...strong(c), big: 1, hers: 0 } : strong(c)) });
  const r = await select({ run, idea: 'x', flow, taste: readTaste(run), candidates: cs, callModel: fakeModel({ score }) });
  assert.deepEqual(r.asks.map(a => a.id).sort(), ['c1', 'c3']);
  assert.ok(readEvents(run).some(e => e.type === 'decided' && e.id === 'c2'));
});

test('granular candidates are never asked, whatever the scorer says, and never in an ask\'s decisionIds', async () => {
  const run = newRun();
  const cs = [
    cand(1, { decision: 'Whether customers need an account or just a name and email' }),
    cand(2, { decision: 'Whether regulars are remembered on this device' }),
    cand(3, { decision: 'Whether full classes get a waitlist' }),
    cand(4, { decision: 'Which fields the booking form asks for' }),
    cand(5, { decision: 'Something the scorer itself calls granular' }),
    cand(6, { decision: 'Who the page is for first' }),
  ];
  // The scorer rates every one big and hers, misses the granular flag on c1-c4, and says c6's answer settles them all.
  const score = items => ({ scores: items.map(c => ({ ...strong(c), granular: c.id === 'c5', settles: c.id === 'c6' ? items.map(x => x.id) : [c.id] })) });
  const r = await select({ run, idea: 'A booking page for a small yoga studio.', flow, taste: readTaste(run), candidates: cs, callModel: fakeModel({ score }) });
  assert.deepEqual(r.asks.map(a => a.id), ['c6']);
  assert.deepEqual(r.asks[0].decisionIds, ['c6']);
  const evs = readEvents(run);
  assert.deepEqual(evs.filter(e => e.type === 'ask').map(e => e.id), ['c6']);
  for (const id of ['c1', 'c2', 'c3', 'c4', 'c5']) assert.ok(evs.some(e => e.type === 'decided' && e.id === id && !e.follows), id);
});

test('the Ask shape: one open question by a named teammate, on one piece of her work, naming what it settles', async () => {
  const run = newRun();
  const finding = { title: 'A leisure centre runs a waitlist', url: 'https://example.org/f' };
  const cs = [
    cand(1, { seat: 'product', decision: 'Who the page is for first', attachTo: 'n1' }),
    cand(2, { seat: 'research', decision: 'What happens when a class is full', attachTo: 'n2', source: finding }),
    cand(3, { seat: 'design', decision: 'How the booking steps should feel', attachTo: 'n3' }),
    cand(4, { seat: 'product', decision: 'What leads the class list' }),
  ];
  const questions = { c1: 'Who walks through the door that this page should welcome first?',
    c2: 'When a class is full, what should a regular feel?', c3: 'If booking could feel like one thing, what should it feel like?' };
  const score = items => ({ scores: items.map(c => ({ ...strong(c), question: questions[c.id] ?? 'Should it be A or B?',
    artifact: c.id === 'c3' ? 'wires' : 'journey', settles: c.id === 'c1' ? ['c1', 'c4', 'c99'] : [c.id] })) });
  const r = await select({ run, idea: 'A booking page for a small yoga studio.', flow, taste: readTaste(run), candidates: cs, callModel: fakeModel({ score }) });
  const { validAsk } = await import('../lib/select.js');
  assert.equal(r.asks.length, 3);
  for (const a of r.asks) assert.ok(validAsk(a), JSON.stringify(a));
  const by = Object.fromEntries(r.asks.map(a => [a.id, a]));
  assert.deepEqual([by.c1.by, by.c2.by, by.c3.by], ["Product's teammate", 'Noor', 'Mika']);
  assert.deepEqual(by.c1.artifact, { kind: 'journey', ref: 'n1' });
  assert.deepEqual(by.c2.artifact, { kind: 'finding', ref: finding.url });
  assert.equal(by.c3.artifact.kind, 'wires');
  assert.deepEqual(by.c1.decisionIds, ['c1', 'c4']); // c99 isn't a candidate
  assert.equal(by.c2.question, questions.c2);
  // logged the same way, and the decision her answer settles is marked as following it
  const evs = readEvents(run);
  assert.ok(evs.filter(e => e.type === 'ask').every(validAsk));
  assert.equal(evs.find(e => e.type === 'decided' && e.id === 'c4').follows, 'c1');
});

test('a question that is not natural is never asked: closed, offering options, or two sentences', async () => {
  const { naturalQuestion } = await import('../lib/select.js');
  for (const bad of ['Should regulars get a Book your usual button?', 'What should booking feel like: fast or calm?',
    'Do you want a waitlist?', 'What matters. Who books?', 'Account or email?', '', null, 'What is it'])
    assert.equal(naturalQuestion(bad), null, String(bad));
  for (const good of ['What makes someone come back to a studio week after week?', 'If booking could feel like one thing, what should it feel like?',
    'Who is this page really for?']) assert.equal(naturalQuestion(good), good);
  const run = newRun();
  const cs = [cand(1), cand(2)];
  const score = items => ({ scores: items.map(c => ({ ...strong(c), question: c.id === 'c1' ? 'Should we add a waitlist?' : q(c) })) });
  const r = await select({ run, idea: 'x', flow, taste: readTaste(run), candidates: cs, callModel: fakeModel({ score }) });
  assert.deepEqual(r.asks.map(a => a.id), ['c2']);
  assert.ok(readEvents(run).some(e => e.type === 'decided' && e.id === 'c1'));
});

test('policy still blocks an ask that did not come from the selector, even in the new shape', async () => {
  const { ask } = await import('../lib/policy.js');
  const run = newRun();
  const a = ask(run, { ...cand(1), by: 'Mika', question: 'What should it feel like?', artifact: { kind: 'wires' }, decisionIds: ['c1'] }, { source: 'design' });
  assert.equal(a, null);
  const evs = readEvents(run);
  assert.equal(evs.filter(e => e.type === 'ask').length, 0);
  assert.ok(evs.some(e => e.type === 'ask.refused' && /not from the selector/.test(e.reason)));
  assert.ok(evs.some(e => e.type === 'decided' && e.id === 'c1'));
});

test('a citation to a missing line is rejected, falls back to team default, and is logged', async () => {
  const run = newRun();
  const cs = [cand(1), cand(2), cand(3)];
  const decide = items => ({ decisions: items.map((c, i) => ({ id: c.id, choice: 'B', cites: ['L1', 'L9', 'line 2'][i] })) });
  const out = await decideRest(cs, readTaste(run), { run, callModel: fakeModel({ decide }) });
  assert.deepEqual(out.map(d => d.cites), ['L1', 'team default', 'team default']);
  const rej = readEvents(run).filter(e => e.type === 'cite.rejected');
  assert.deepEqual(rej.map(e => e.cited), ['L9', 'line 2']);
  assert.deepEqual(checkCitation('[L2]', readTaste(run)), { cites: 'L2' });
  assert.equal(checkCitation('L3', readTaste(run)).cites, 'team default');
});

test('after her file grows, decideRest can cite her new line (the build beat)', async () => {
  const run = newRun();
  const line = writeLine(run, 'Sounds like: never ask for anything you could remember or skip.');
  assert.equal(line.id, 'L3');
  assert.equal(line.text, 'never ask for anything you could remember or skip.');
  const decide = items => ({ decisions: items.map(c => ({ id: c.id, choice: 'A', cites: 'L3' })) });
  const out = await decideRest([cand(7, { decision: 'Whether cancel asks for a reason' })], readTaste(run), { run, callModel: fakeModel({ decide }), round: 'build' });
  assert.equal(out[0].cites, 'L3');
  assert.ok(fs.readFileSync(path.join(process.env.RUNS_DIR, run, 'taste.md'), 'utf8').includes('- [L3] never ask'));
});

test('when an older and her newest line both settle a decision, it cites the newest; her file reaches the model newest first', async () => {
  const run = newRun();
  writeLine(run, 'Never ask for anything you could remember or skip.'); // L3
  let seen = '';
  // The model names the older line first and lists the newer one as also settling it (and one bogus id).
  const decide = items => ({ decisions: items.map(c => ({ id: c.id, choice: 'A', cites: 'L2', alsoCites: ['L3', 'L9'] })) });
  const callModel = async args => { seen = args.system; return fakeModel({ decide })(args); };
  const out = await decideRest([cand(4, { decision: 'Does cancel ask for a reason?', options: ['No, one tap', 'Yes'], recommendation: 'Yes' })],
    readTaste(run), { run, callModel, round: 'build' });
  assert.equal(out[0].cites, 'L3');
  assert.ok(seen.indexOf('[L3]') < seen.indexOf('[L2]') && seen.indexOf('[L2]') < seen.indexOf('[L1]'), 'newest line first');
  // Only one line holds: it stays (no stretching to the newest).
  const one = await decideRest([cand(5)], readTaste(run), { callModel: fakeModel({ decide: items => ({ decisions: items.map(c => ({ id: c.id, choice: 'A', cites: 'L1', alsoCites: [] })) }) }) });
  assert.equal(one[0].cites, 'L1');
  // A missing alsoCites is fine, and a bogus cites with a valid alsoCites takes the valid one.
  const bog = await decideRest([cand(6)], readTaste(run), { callModel: fakeModel({ decide: items => ({ decisions: items.map(c => ({ id: c.id, choice: 'A', cites: 'L7', alsoCites: ['L2'] })) }) }) });
  assert.equal(bog[0].cites, 'L2');
});

test('a different idea changes the picks (offline: picks come from what the team raised, not a script)', async () => {
  const team = system => {
    const cafe = /pastr/i.test(system);
    const seat = (system.match(/You are the (\w+) teammate/) || [])[1];
    return { note: 'Listed decisions.', candidates: [0, 1].map(i => ({
      decision: `${seat} ${cafe ? 'pickup' : 'class'} decision ${i}`, options: ['A', 'B'], recommendation: 'A', reason: 'r',
      cost: 'high', undoable: true, attachTo: 'n1', usesFinding: false })) };
  };
  const score = items => ({ scores: items.map(c => ({ ...strong(c), question: `What does ${c.decision.split(' ')[1]} mean to the people who come?` })) });
  const a = await selectForIdea('A booking page for a small yoga studio.', ['classes'], { callModel: fakeModel({ team, score }) });
  const b = await selectForIdea("A pre-order page for a café's morning pastries.", ['pastries'], { callModel: fakeModel({ team, score }) });
  assert.ok(a.brought <= 3 && b.brought <= 3);
  assert.notDeepEqual(a.asks.map(x => x.decision), b.asks.map(x => x.decision));
  assert.equal(a.came, 12); // six seats x 2
  assert.equal(loadRest(a.run).length, a.came - a.brought);
});

test('LIVE: a different idea changes the picks (real model, fast path)', { skip: !process.env.LIVE && 'set LIVE=1 to call the real model' }, async () => {
  const [a, b] = await Promise.all([
    selectForIdea('A booking page for a small yoga studio.', ['classes', 'a class', 'confirm', 'booked']),
    selectForIdea("A pre-order page for a café's morning pastries.", ["today's pastries", 'pick a pastry', 'pickup time', 'pay']),
  ]);
  console.log('yoga:', a.asks.map(x => x.decision), 'cafe:', b.asks.map(x => x.decision), 'ms:', a.ms.total, b.ms.total);
  assert.ok(a.brought >= 1 && a.brought <= 3 && b.brought >= 1 && b.brought <= 3);
  const words = asks => new Set(asks.flatMap(x => x.decision.toLowerCase().match(/[a-z]{5,}/g) || []));
  const wa = words(a.asks), wb = words(b.asks);
  assert.ok([...wa].some(w => !wb.has(w)), 'the two ideas brought the same questions');
});

test('proposeAndSelect: Research cites only its prepared finding; a teammate failure costs only its own seat', async () => {
  const run = newRun();
  const team = system => {
    if (/You are the Data teammate/.test(system)) throw new Error('boom');
    return { note: 'ok', candidates: [{ decision: 'Whether full classes get a waitlist', options: ['Yes', 'No'], recommendation: 'Yes',
      reason: 'r', cost: 'high', undoable: true, attachTo: 'n9', usesFinding: true, source: { title: 'Made up', url: 'http://x' } }] };
  };
  const r = await proposeAndSelect({ run, idea: 'A booking page for a small yoga studio.', flow, taste: readTaste(run), callModel: fakeModel({ team }) });
  assert.equal(r.candidates.length, 5); // six seats, Data failed
  const research = r.candidates.find(c => c.seat === 'research');
  const finding = JSON.parse(fs.readFileSync(new URL('../data/research-finding.json', import.meta.url)));
  assert.deepEqual(research.source, { title: finding.title, url: finding.url, label: finding.label, how_verified: finding.how_verified, prepared: true });
  assert.ok(r.candidates.filter(c => c.seat !== 'research').every(c => !c.source));
  assert.ok(r.candidates.every(c => c.attachTo === null)); // n9 isn't a box of hers
  assert.ok(readEvents(run).some(e => e.type === 'teammate.error' && e.seat === 'data'));
});

test('picks spread across her work: one per box, no two that are the same question in other words', () => {
  const cs = [
    cand(1, { decision: 'How customers cancel or change a booking', attachTo: 'n3' }),
    cand(2, { decision: 'Cancellation and rescheduling policy shown at booking' }),
    cand(3, { decision: 'Whether payment is taken', attachTo: 'n3' }),
    cand(4, { decision: 'Who the page is for first', attachTo: 'n1' }),
    cand(5, { decision: 'What a full class shows' }),
  ];
  const scores = new Map(strongScores(cs).scores.map(s => [s.id, s]));
  assert.deepEqual(pickAsks(cs, scores, { flow }).picks.map(p => p.candidate.id), ['c1', 'c4', 'c5']);
});
