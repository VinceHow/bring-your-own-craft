// The team space: joint decisions talked out in a real short exchange (3-4 turns, each its own call reading the
// thread so far), lines as room chatter, the agreement as joint.agreed, the decision logged. Offline: a fake model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-joint-'));
process.env.JOINT_OFF = '1';
const J = await import('../lib/joint.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');
const { initTaste } = await import('../lib/taste.js');
const { counter } = await import('../lib/tally.js');
const { loadRest } = await import('../lib/select.js');

const cand = (id, seat, decision, extra = {}) => ({ id, seat, decision, options: ['A way', 'B way'], recommendation: 'A way',
  reason: 'r', cost: 'high', undoable: true, attachTo: null, ...extra });
const CANDS = [
  cand('c1', 'engineering', 'Whether people book as guests or must log in', { seats: ['engineering', 'design'] }),
  cand('c2', 'strategy', 'Whether payment is taken online or at the desk', { seats: ['strategy', 'engineering', 'design'] }),
  cand('c3', 'design', 'Which single accent colour the page uses', { seats: ['design'], cost: 'low' }),
  cand('c4', 'research', 'Whether full classes get a waitlist', { seats: ['research', 'design'] }), // brought to her
  cand('c5', 'data', 'What single number says the page worked', { seats: ['data', 'design'], cost: 'low' }),
];
function newRun({ takeaway = false } = {}) {
  const run = newRunId(`j-${Math.random().toString(36).slice(2, 8)}`);
  initTaste(run);
  logEvent(run, 'run.start', { mode: 'craft', idea: 'A booking page for a small yoga studio.', seat: 'product' });
  for (const c of CANDS) logEvent(run, 'candidate', c);
  logEvent(run, 'ask', { id: 'c4', seat: 'research', by: 'Noor', question: 'What makes someone come back week after week?', decisionIds: ['c4'] });
  for (const c of CANDS) if (c.id !== 'c4') logEvent(run, 'decided', { id: c.id, seat: c.seat, decision: c.decision, choice: 'A way', cites: 'team default', round: 'select' });
  if (takeaway) logEvent(run, 'taste.written', { mode: 'craft', id: 'L5', text: 'Never ask for what we could remember.', askId: 'c4' });
  logEvent(run, 'select.done', { came: CANDS.length, brought: 1, ms: 1 });
  return run;
}
// Each call: records what it saw (the thread so far) and replies in that speaker's voice.
function fakeModel({ lines = {}, close = {}, seen = [] } = {}) {
  return async a => {
    assert.match(a.system, /^# Task: one turn in a quick team huddle/m);
    assert.equal(a.model, 'haiku');
    const name = a.system.match(/You are (\w+), the/)[1];
    const turn = Number(a.system.match(/Your turn \((\d+) of/)[1]);
    seen.push({ name, turn, user: a.user, system: a.system, schema: a.schema });
    const text = (lines[name] && lines[name][turn]) || `${name} line ${turn}, plain and short.`;
    if (a.schema.required.includes('choice')) return { text, choice: 'B way', headline: 'Guests book in one tap, no logins', cites: 'none', ...close };
    return { text };
  };
}

test('seats: the candidate\'s own seats when given, else a cheap rule on its words; her seat never counts', () => {
  assert.deepEqual(J.seatsFor(CANDS[1]), ['strategy', 'engineering', 'design']);
  assert.deepEqual(J.seatsFor({ seat: 'product', seats: ['product', 'design'] }), ['design']);
  const inferred = J.seatsFor({ id: 'x', seat: 'engineering', decision: 'Whether people must create an account or book as guests on the booking form' });
  assert.deepEqual(inferred, ['engineering', 'design']);
  assert.deepEqual(J.seatsFor({ id: 'y', seat: 'design', decision: 'Which single accent colour the page uses' }), ['design']);
});

test('the biggest 2-3 joint candidates: touch >= 2 teammates, never one brought to her', () => {
  const asked = new Set(['c4']);
  const picks = J.pickJoint(CANDS, { asked });
  assert.deepEqual(picks.map(c => c.id), ['c2', 'c1', 'c5']);
  assert.ok(!picks.some(c => c.id === 'c3'), 'one seat is not joint');
  assert.ok(!picks.some(c => c.id === 'c4'), 'brought to her: not the team\'s to settle');
  assert.equal(J.pickJoint(CANDS, { asked, max: 2 }).length, 2);
});

test('voice rules in code: one line, <= 15 words, no question, never to her, no AI phrases', () => {
  assert.equal(J.cleanLine('Bo: Logins slow regulars down.', 'Bo'), 'Logins slow regulars down.');
  assert.equal(J.cleanLine('{"text": "Then remember them on the device."}', 'Mika'), 'Then remember them on the device.');
  assert.equal(J.cleanLine('Should we drop logins?'), null);
  assert.equal(J.cleanLine('Your regulars hate logins.'), null);
  assert.equal(J.cleanLine('Great point, let\'s ensure a seamless flow.'), null);
  assert.equal(J.cleanLine('Keep it short. ' + 'and then this goes on and on and on and on for far too long really'), 'Keep it short.');
  assert.equal(J.cleanLine('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen'), null);
  assert.equal(J.cleanHeadline('guests book in one tap'), 'Guests book in one tap.');
  assert.equal(J.cleanHeadline('Should guests log in?'), null);
});

test('a real exchange: each turn its own call reading the thread so far; lines as chatter; agreement and decision logged', async () => {
  const run = newRun();
  const seen = [];
  const out = await J.runJoint(run, { callModel: fakeModel({ seen, lines: { Ines: { 1: 'Taking cards online means a deposit step.' }, Bo: { 2: 'Card forms slow regulars down.' } } }) });
  assert.equal(out.length, 3);
  const evs = readEvents(run);
  // c2 touches three teammates: four turns, Ines opens and closes; each call saw exactly the lines before it.
  const c2 = seen.filter(s => /Whether payment is taken online/.test(s.system));
  assert.deepEqual(c2.map(s => s.name), ['Ines', 'Bo', 'Mika', 'Ines']);
  assert.equal(c2[0].user, 'You open. Your line:');
  assert.match(c2[1].user, /^Ines: Taking cards online means a deposit step\.\n\nYour line:$/);
  assert.match(c2[2].user, /Ines: Taking cards online[\s\S]*Bo: Card forms slow regulars down\./);
  assert.match(c2[3].user, /Mika: Mika line 3/);
  // c1 touches two: three turns.
  assert.deepEqual(seen.filter(s => /guests or must log in/.test(s.system)).map(s => s.name), ['Bo', 'Mika', 'Bo']);
  // chatter per turn, with its jointId; never a question, never to her
  const chat = evs.filter(e => e.type === 'chatter' && e.jointId === 'j-c2');
  assert.deepEqual(chat.map(c => c.by), ['Ines', 'Bo', 'Mika', 'Ines']);
  assert.ok(chat.every(c => !/\?/.test(c.text) && !/\byou\b/i.test(c.text) && c.seat && c.pane === 'room'));
  const agreed = evs.find(e => e.type === 'joint.agreed' && e.id === 'j-c2');
  assert.deepEqual(agreed.seats, ['strategy', 'engineering', 'design']);
  assert.equal(agreed.headline, 'Guests book in one tap, no logins.');
  assert.equal(agreed.withTakeaways, false);
  assert.deepEqual(agreed.turns.map(t => t.by), ['Ines', 'Bo', 'Mika', 'Ines']);
  const d = evs.findLast(e => e.type === 'decided' && e.id === 'c2');
  assert.deepEqual([d.choice, d.cites, d.round, d.jointId], ['B way', 'team', 'joint', 'j-c2']);
  // the tally counts each decision once, latest wins; nothing new was brought to her
  assert.equal(counter(evs).brought, 1);
  assert.equal(counter(evs).decided, 4);
  assert.ok(!evs.some(e => e.type === 'ask' && e.id !== 'c4'));
});

test('with her takeaways in mind only when the closer cites one of her takeaway lines', async () => {
  const run = newRun({ takeaway: true });
  const seen = [];
  await J.runJoint(run, { max: 1, callModel: fakeModel({ seen, close: { cites: '[L5]' } }) });
  assert.match(seen[0].system, /\[L5\] Never ask for what we could remember\./);
  const a = readEvents(run).find(e => e.type === 'joint.agreed');
  assert.equal(a.withTakeaways, true);
  assert.equal(readEvents(run).findLast(e => e.type === 'decided' && e.jointId).cites, 'L5');
  // A cite to a line that isn't one of her takeaways: not "with your takeaways".
  const run2 = newRun({ takeaway: true });
  await J.runJoint(run2, { max: 1, callModel: fakeModel({ close: { cites: 'L1' } }) });
  assert.equal(readEvents(run2).find(e => e.type === 'joint.agreed').withTakeaways, false);
});

test('a choice outside the options keeps the team\'s lean; a line that breaks the rules twice drops the exchange', async () => {
  const run = newRun();
  await J.runJoint(run, { max: 1, callModel: fakeModel({ close: { choice: 'C way' } }) }).catch(() => {});
  // the schema enum would stop this at the model; code checks it too
  assert.equal(readEvents(run).find(e => e.type === 'joint.agreed').choice, 'A way');
  const run2 = newRun();
  const r = await J.runJoint(run2, { max: 1, callModel: fakeModel({ lines: { Bo: { 2: 'Should we drop logins?' } } }) });
  assert.equal(r.length, 0, 'only real agreements become cards');
  const evs = readEvents(run2);
  assert.ok(!evs.some(e => e.type === 'joint.agreed'));
  assert.equal(evs.filter(e => e.type === 'joint.error').length, 1);
  assert.ok(!evs.some(e => e.type === 'chatter' && /\?/.test(e.text)));
});

test('in the background after select.done, once per run; never for a judge\'s fast run', async () => {
  delete process.env.JOINT_OFF;
  let calls = 0;
  const base = fakeModel();
  J.installJoint({ callModel: async a => { calls++; return base(a); } });
  const run = newRun();
  for (let i = 0; i < 100 && readEvents(run).filter(e => e.type === 'joint.agreed').length < 3; i++) await new Promise(r => setTimeout(r, 10));
  assert.equal(readEvents(run).filter(e => e.type === 'joint.agreed').length, 3);
  assert.equal(calls, 10); // 4 + 3 + 3 turns
  assert.deepEqual(await J.runJoint(run, { callModel: base }), [], 'not twice');
  const fast = newRunId('judge-x');
  logEvent(fast, 'run.start', { idea: 'x', seat: 'product', fast: true });
  for (const c of CANDS) logEvent(fast, 'candidate', c);
  logEvent(fast, 'select.done', { came: 5, brought: 0 });
  await new Promise(r => setTimeout(r, 50));
  assert.ok(!readEvents(fast).some(e => e.type === 'joint.start'));
});

test('at Build, what the team agreed in the team space is never re-decided', async () => {
  const run = newRun();
  await J.runJoint(run, { max: 1, callModel: fakeModel() });
  const rest = loadRest(run).map(c => c.id);
  assert.ok(!rest.includes('c2'), 'agreed: not re-decided');
  assert.ok(rest.includes('c1') && rest.includes('c3'), 'the rest still are');
});

test('the build passes the team\'s agreement to her page as agreed, and re-decides only the rest', async () => {
  const { buildRun, _setDecideRest } = await import('../routes/build.js');
  const run = newRun();
  await J.runJoint(run, { max: 1, callModel: fakeModel() });
  let given = null, filled = null;
  _setDecideRest(async cands => { given = cands.map(c => c.id); return []; });
  // the fill's model call: capture the decisions it was handed, then stop
  try { await buildRun(run, { call: async a => { filled = a; throw new Error('stop here'); } }); } catch {}
  _setDecideRest(null);
  assert.ok(given && !given.includes('c2'), `re-decided: ${given}`);
  const agreedIn = readEvents(run).some(e => e.type === 'build.step') && JSON.stringify(filled ?? '').includes('Whether payment is taken online');
  assert.ok(agreedIn, 'the agreed decision reached the fill');
});

test('a decision her file already decides is hers: never talked out by the team', async () => {
  const run = newRun();
  logEvent(run, 'decided', { id: 'c2', seat: 'strategy', decision: CANDS[1].decision, choice: 'A way', cites: 'L2', round: 'select' });
  const out = await J.runJoint(run, { callModel: fakeModel() });
  assert.ok(!out.some(a => a.candidateId === 'c2'));
  assert.deepEqual(out.map(a => a.candidateId).sort(), ['c1', 'c5']);
});
