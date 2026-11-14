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
const strongScores = cs => ({ scores: cs.map(c => ({ id: c.id, inSeat: true, changes: 3, silent: 3, dupOf: null, kind: 'fork' })) });

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

test('a cheap out-of-seat pick is refused, decided and logged; a costly one may go through', async () => {
  const run = newRun();
  const cs = [
    cand(1, { seat: 'design', decision: 'Card or list layout', cost: 'low', undoable: true }),
    cand(2, { seat: 'engineering', decision: 'Which database', cost: 'high', undoable: true }),
    cand(3, { seat: 'data', decision: 'Keep emails forever', cost: 'low', undoable: false }),
    cand(4), cand(5),
  ];
  const score = items => ({ scores: items.map(c => ({ id: c.id, inSeat: c.seat === 'product', changes: 3, silent: 3, dupOf: null, kind: 'pin' })) });
  const r = await select({ run, idea: 'x', flow, taste: readTaste(run), candidates: cs, callModel: fakeModel({ score }) });
  const evs = readEvents(run);
  assert.ok(!r.asks.some(a => a.id === 'c1'));
  assert.ok(evs.some(e => e.type === 'ask.refused' && e.id === 'c1' && /out of her seat/.test(e.reason)));
  assert.ok(evs.some(e => e.type === 'decided' && e.id === 'c1' && e.refused));
  // Out of seat but costly, or not undoable: allowed to compete (ranked by score; here in-seat ones win ties).
  const { picks } = pickAsks([cs[1], cs[2]], new Map(score([cs[1], cs[2]]).scores.map(s => [s.id, s])), { flow });
  assert.deepEqual(picks.map(p => p.candidate.id), ['c2', 'c3']);
});

test('seat is code\'s call: an engineering candidate the model scores as in-seat, cheap and undoable, is refused', async () => {
  const run = newRun();
  const cs = [cand(1, { seat: 'engineering', decision: 'Which hosting provider', cost: 'low', undoable: true }), cand(2), cand(3)];
  const score = items => ({ scores: items.map(c => ({ id: c.id, inSeat: true, changes: 3, silent: 3, dupOf: null, kind: 'fork' })) });
  const r = await select({ run, idea: 'x', flow, taste: readTaste(run), candidates: cs, callModel: fakeModel({ score }) });
  assert.ok(!r.asks.some(a => a.id === 'c1'));
  assert.deepEqual(r.asks.map(a => a.id), ['c2', 'c3']);
  const evs = readEvents(run);
  assert.ok(evs.some(e => e.type === 'ask.refused' && e.id === 'c1' && /out of her seat/.test(e.reason)));
  assert.ok(evs.some(e => e.type === 'decided' && e.id === 'c1'));
  // The same candidate, costly or not undoable, may compete.
  for (const extra of [{ cost: 'high' }, { undoable: false }]) {
    const c = cand(1, { seat: 'engineering', cost: 'low', undoable: true, ...extra });
    assert.equal(pickAsks([c], new Map([['c1', { id: 'c1', inSeat: false, changes: 3, silent: 3, dupOf: null, kind: 'fork' }]]), { flow }).picks.length, 1);
  }
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

test('a different idea changes the picks (offline: picks come from what the team raised, not a script)', async () => {
  const team = system => {
    const cafe = /pastr/i.test(system);
    const seat = (system.match(/You are the (\w+) teammate/) || [])[1];
    return { note: 'Listed decisions.', candidates: [0, 1].map(i => ({
      decision: `${seat} ${cafe ? 'pickup' : 'class'} decision ${i}`, options: ['A', 'B'], recommendation: 'A', reason: 'r',
      cost: 'high', undoable: true, attachTo: 'n1', usesFinding: false })) };
  };
  const score = items => ({ scores: items.map(c => ({ id: c.id, inSeat: /Product/.test(c.decision), changes: 3, silent: 3, dupOf: null, kind: 'fork' })) });
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
  const r = await proposeAndSelect({ run, idea: 'x', flow, taste: readTaste(run), callModel: fakeModel({ team }) });
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
