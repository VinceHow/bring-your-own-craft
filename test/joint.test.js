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

test('with her takeaways in mind when the closer heard them (read from the log at that call); the cite only when it is hers', async () => {
  const run = newRun({ takeaway: true });
  const seen = [];
  await J.runJoint(run, { max: 1, callModel: fakeModel({ seen, close: { cites: '[L5]' } }) });
  assert.match(seen[0].system, /\[L5\] Never ask for what we could remember\./);
  const a = readEvents(run).find(e => e.type === 'joint.agreed');
  assert.equal(a.withTakeaways, true);
  assert.equal(readEvents(run).findLast(e => e.type === 'decided' && e.jointId).cites, 'L5');
  // A cite to a line that isn't one of her takeaways: the decision cites the team, not L1.
  const run2 = newRun({ takeaway: true });
  await J.runJoint(run2, { max: 1, callModel: fakeModel({ close: { cites: 'L1' } }) });
  assert.equal(readEvents(run2).findLast(e => e.type === 'decided' && e.jointId).cites, 'team');
  // No takeaways yet: not "with your takeaways".
  const run3 = newRun();
  await J.runJoint(run3, { max: 1, callModel: fakeModel() });
  assert.equal(readEvents(run3).find(e => e.type === 'joint.agreed').withTakeaways, false);
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

test('in the background after select.done, once per run; never for a judge\'s fast run', async t => {
  delete process.env.JOINT_OFF;
  let calls = 0;
  const base = fakeModel();
  J.installJoint({ callModel: async a => { calls++; return base(a); } });
  t.after(() => { J.uninstallJoint(); process.env.JOINT_OFF = '1'; }); // the hook is this test's only
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

// ---- at Build: her takeaways revisit what the team agreed before she spoke ----
const FORM = { id: 'c24', seat: 'engineering', decision: 'What the order form asks for', options: ['Name, email and optional phone', 'Name and email only'],
  recommendation: 'Name, email and optional phone', reason: 'r', cost: 'high', undoable: true, attachTo: null, seats: ['engineering', 'design'] };
function agreedRun({ takeaway = true, mapped = null } = {}) {
  const run = newRunId(`jr-${Math.random().toString(36).slice(2, 8)}`);
  initTaste(run);
  logEvent(run, 'run.start', { idea: 'A website for a small bakery, so customers can order bread ahead.', seat: 'product' });
  logEvent(run, 'candidate', FORM);
  logEvent(run, 'joint.agreed', { id: 'j-c24', candidateId: 'c24', headline: 'Name, email and an optional phone.', seats: ['engineering', 'design'], withTakeaways: false, turns: [], choice: FORM.options[0] });
  logEvent(run, 'decided', { id: 'c24', seat: 'engineering', decision: FORM.decision, choice: FORM.options[0], cites: 'team', round: 'joint', jointId: 'j-c24' });
  if (takeaway) logEvent(run, 'taste.written', { mode: 'craft', id: 'L5', text: 'Never ask for anything you could remember or skip.', askId: 'a3' });
  if (mapped) logEvent(run, 'answer.mapped', { askId: 'a1', decisions: [{ id: 'c24', seat: 'engineering', decision: FORM.decision, choice: mapped }] });
  return run;
}

test('a takeaway that touches a joint agreement changes it at Build, and its card says so', async () => {
  const run = agreedRun();
  let asked = null;
  const out = await J.revisitJoint(run, { decide: async cands => { asked = cands.map(c => c.id); return { decided: [{ id: 'c24', choice: 'Name and email only', cites: 'L5' }] }; } });
  assert.deepEqual(asked, ['c24']);
  assert.deepEqual(out.map(d => [d.id, d.choice, d.cites]), [['c24', 'Name and email only', 'L5']]);
  const evs = readEvents(run);
  const rev = evs.find(e => e.type === 'joint.revised');
  assert.deepEqual([rev.id, rev.withTakeaways, rev.headline, rev.was], ['j-c24', true, 'Name and email only.', FORM.options[0]]);
  const d = evs.findLast(e => e.type === 'decided' && e.id === 'c24');
  assert.deepEqual([d.choice, d.cites, d.round], ['Name and email only', 'L5', 'build']);
});

test('joint agreements she didn\'t touch stay as agreed', async () => {
  // no takeaways yet: nothing is re-decided at all
  let called = false;
  const out = await J.revisitJoint(agreedRun({ takeaway: false }), { decide: async () => { called = true; return { decided: [] }; } });
  assert.equal(called, false);
  assert.equal(out[0].choice, FORM.options[0]);
  // a re-decision that doesn't rest on her takeaways (team default, or the same choice) leaves the agreement alone
  for (const x of [{ id: 'c24', choice: 'Name and email only', cites: 'team default' }, { id: 'c24', choice: FORM.options[0], cites: 'L5' }]) {
    const run = agreedRun();
    const r = await J.revisitJoint(run, { decide: async () => ({ decided: [x] }) });
    assert.equal(r[0].choice, FORM.options[0]);
    assert.ok(!readEvents(run).some(e => e.type === 'joint.revised'));
  }
  // a failing call keeps the agreements
  const r = await J.revisitJoint(agreedRun(), { decide: async () => { throw new Error('model down'); } });
  assert.equal(r[0].choice, FORM.options[0]);
});

test('a joint decision she settled herself in a focus moment is hers', async () => {
  const run = agreedRun({ mapped: 'Name and email only' });
  let called = false;
  const out = await J.revisitJoint(run, { decide: async () => { called = true; return { decided: [] }; } });
  assert.equal(called, false);
  assert.deepEqual([out[0].choice, out[0].cites], ['Name and email only', 'her answer']);
  assert.ok(readEvents(run).some(e => e.type === 'joint.revised' && e.withTakeaways));
});

test('the build: her takeaway "never ask for anything you could remember or skip" turns the phone field off', async () => {
  const { buildRun, _setDecideRest, _setDecideCore, _setDeal } = await import('../routes/build.js');
  const { loadTemplate } = await import('../lib/fill.js');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const run = agreedRun();
  const tpl = loadTemplate('bakery');
  _setDecideRest(async () => []);
  _setDeal(async () => ({ skipped: 'test' }));
  _setDecideCore(async () => ({ decided: [{ id: 'c24', choice: 'Name and email only', cites: 'L5' }] }));
  try {
    // the fill's model keeps the phone on; the team's revised agreement must win
    await buildRun(run, { call: async () => ({ words: tpl.defaults.words, steps: tpl.defaults.steps, switches: { ...tpl.defaults.switches, phone: true }, decidedShown: [] }) });
  } finally { _setDecideRest(null); _setDecideCore(null); _setDeal(null); }
  const html = fs.readFileSync(path.join(process.env.RUNS_DIR, run, 'page', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /type="tel"/);
  assert.ok(readEvents(run).some(e => e.type === 'joint.revised'));
});

// ---- when her takeaways rule out every option the team listed ----
const KEEP = { id: 'c20', seat: 'data', decision: 'What we keep about customers from each order',
  options: ['Name, phone and order history', 'Name, phone and email', 'Phone number only'], recommendation: 'Name, phone and order history',
  reason: 'r', cost: 'high', undoable: true, attachTo: null, seats: ['data', 'engineering'] };
function keepRun() {
  const run = newRunId(`jk-${Math.random().toString(36).slice(2, 8)}`);
  initTaste(run);
  logEvent(run, 'run.start', { idea: 'A website for a small bakery, so customers can order bread ahead.', seat: 'product' });
  logEvent(run, 'candidate', KEEP);
  logEvent(run, 'joint.agreed', { id: 'j-c20', candidateId: 'c20', headline: 'Name, phone and order history.', seats: ['data', 'engineering'], withTakeaways: false, turns: [], choice: KEEP.options[0] });
  logEvent(run, 'decided', { id: 'c20', seat: 'data', decision: KEEP.decision, choice: KEEP.options[0], cites: 'team', round: 'joint', jointId: 'j-c20' });
  logEvent(run, 'taste.written', { mode: 'craft', id: 'L5', text: 'Ordering ahead should feel like the baker already knows me, so never ask for anything we could remember or skip.', askId: 'a3' });
  return run;
}

test('all three options carry the phone and her line rules it out: a new choice that follows her line, logged newOption', async () => {
  const run = keepRun();
  const seen = {};
  // the real revisit call, with a fake model: it sees her takeaways and the options, and writes a new choice
  const out = await J.revisitJoint(run, { callModel: async a => {
    seen.system = a.system; seen.user = a.user; seen.model = a.model;
    return { decisions: [{ id: 'c20', choice: 'Name and order history; no phone', cites: 'L5', newOption: true }] };
  } });
  assert.match(seen.system, /# Task: revisit the team's agreements/);
  assert.match(seen.system, /\[L5\] Ordering ahead should feel like the baker already knows me/);
  assert.deepEqual(JSON.parse(seen.user)[0].options, KEEP.options);
  assert.deepEqual(out.map(d => [d.choice, d.cites]), [['Name and order history; no phone', 'L5']]);
  const evs = readEvents(run);
  const rev = evs.find(e => e.type === 'joint.revised');
  assert.deepEqual([rev.newOption, rev.withTakeaways, rev.cites], [true, true, 'L5']);
  assert.equal(evs.findLast(e => e.type === 'decided' && e.id === 'c20').newOption, true);
});

test('a new choice must cite her line and drop what every option had; else the agreement stands', async () => {
  for (const x of [
    { id: 'c20', choice: 'Name, phone and order notes', cites: 'L5', newOption: true }, // re-adds the phone
    { id: 'c20', choice: 'Name and order history; no phone', cites: 'team', newOption: true }, // not her line
    { id: 'c20', choice: 'Should we ask for a phone?', cites: 'L5', newOption: true }, // a question
  ]) {
    const run = keepRun();
    const out = await J.revisitJoint(run, { decide: async () => ({ decided: [x] }) });
    assert.equal(out[0].choice, KEEP.options[0], `kept for: ${x.choice} / ${x.cites}`);
    assert.ok(!readEvents(run).some(e => e.type === 'joint.revised'));
  }
  assert.equal(J.dropsRuledOut(KEEP.options, 'Name and order history; no phone'), true);
  assert.equal(J.dropsRuledOut(KEEP.options, 'Name, phone and order notes'), false);
  // dropping only a verb, negating the verb, or a synonym of the thing ruled out: not a new option
  const ASK = ['Ask for the phone at sign-up', 'Ask for the phone at checkout', 'Ask for the phone after the first order'];
  assert.equal(J.dropsRuledOut(ASK, 'Phone number at checkout'), false);
  assert.equal(J.dropsRuledOut(ASK, 'Never ask for the phone at sign-up'), false);
  assert.equal(J.dropsRuledOut(ASK, 'Ask for their mobile number once'), false);
  assert.equal(J.dropsRuledOut(ASK, 'No phone; the name on the order is enough'), true);
});

test('the build: three options all with the phone + her L5 -> no phone field on her page', async () => {
  const { buildRun, _setDecideRest, _setDecideCore, _setDeal } = await import('../routes/build.js');
  const { loadTemplate } = await import('../lib/fill.js');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const run = keepRun();
  const tpl = loadTemplate('bakery');
  _setDecideRest(async () => []);
  _setDeal(async () => ({ skipped: 'test' }));
  _setDecideCore(async () => ({ decisions: [{ id: 'c20', choice: 'Name and order history; no phone', cites: 'L5', newOption: true }] }));
  try {
    await buildRun(run, { call: async () => ({ words: tpl.defaults.words, steps: tpl.defaults.steps, switches: { ...tpl.defaults.switches, phone: true }, decidedShown: [] }) });
  } finally { _setDecideRest(null); _setDecideCore(null); _setDeal(null); }
  const html = fs.readFileSync(path.join(process.env.RUNS_DIR, run, 'page', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /type="tel"/);
  assert.ok(readEvents(run).some(e => e.type === 'joint.revised' && e.newOption));
});

// The race the yoga e2e hit: she writes her pin and presses Build while a joint talk is still going. The build waits
// for the talk (bounded), so its agreement is revisited against her pin instead of landing after the build and winning.
test('Build pressed mid-talk: the build waits for the joint talk, then revisits it against her pin (no phone field)', async () => {
  const { buildRun, _setDecideRest, _setDecideCore, _setDeal } = await import('../routes/build.js');
  const { loadTemplate } = await import('../lib/fill.js');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const run = newRunId(`jr-${Math.random().toString(36).slice(2, 8)}`);
  initTaste(run);
  logEvent(run, 'run.start', { mode: 'craft', idea: 'A website for a small bakery, so customers can order bread ahead.', seat: 'product' });
  logEvent(run, 'candidate', KEEP);
  logEvent(run, 'decided', { id: 'c20', seat: 'data', decision: KEEP.decision, choice: KEEP.options[0], cites: 'team default', round: 'select' });
  logEvent(run, 'select.done', { came: 1, brought: 0, ms: 1 });
  const slow = fakeModel({ close: { choice: KEEP.options[0], headline: 'Name, phone and order history' } });
  const talk = J.runJoint(run, { callModel: async a => { await new Promise(r => setTimeout(r, 150)); return slow(a); } });
  await new Promise(r => setTimeout(r, 50)); // the talk has started; her pin lands, then Build
  assert.ok(readEvents(run).some(e => e.type === 'joint.start') && !readEvents(run).some(e => e.type === 'joint.agreed'));
  logEvent(run, 'taste.written', { mode: 'craft', id: 'L5', text: 'Never ask for anything we could remember or skip.', askId: 'a3' });
  const tpl = loadTemplate('bakery');
  _setDecideRest(async cs => { assert.ok(!cs.some(c => c.id === 'c20'), 'the talked-out decision is not re-decided with the rest'); return []; });
  _setDeal(async () => ({ skipped: 'test' }));
  _setDecideCore(async () => ({ decisions: [{ id: 'c20', choice: 'Name and order history; no phone', cites: 'L5', newOption: true }] }));
  try {
    await buildRun(run, { call: async () => ({ words: tpl.defaults.words, steps: tpl.defaults.steps, switches: { ...tpl.defaults.switches, phone: true }, decidedShown: [] }) });
  } finally { _setDecideRest(null); _setDecideCore(null); _setDeal(null); }
  await talk;
  const evs = readEvents(run);
  const agreedAt = evs.findIndex(e => e.type === 'joint.agreed'), revisedAt = evs.findIndex(e => e.type === 'joint.revised');
  assert.ok(agreedAt > 0 && revisedAt > agreedAt, 'the agreement landed first, then the build revised it');
  assert.equal(evs.filter(e => e.type === 'decided' && e.id === 'c20').at(-1).round, 'build', 'the last word on c20 is the build\'s');
  const html = fs.readFileSync(path.join(process.env.RUNS_DIR, run, 'page', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /type="tel"/);
});

// The tech lead's case: her L5 lands after one agreement (j-c20) and during another talk (j-c21). Code revisits both on
// its own (the hook: on each takeaway and each agreement), each ends without the phone, and the page has no phone field.
test('L5 after one agreement and during another: both revisited in code, both end without the phone', async () => {
  const { buildRun, _setDecideRest, _setDeal } = await import('../routes/build.js');
  const { loadTemplate } = await import('../lib/fill.js');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const KEEP2 = { ...KEEP, id: 'c21', seat: 'design', decision: 'What the order form asks for', seats: ['design', 'engineering'],
    options: ['Name, phone and email', 'Phone and email', 'Name and phone'], recommendation: 'Name, phone and email' };
  const run = newRunId(`jl-${Math.random().toString(36).slice(2, 8)}`);
  initTaste(run);
  logEvent(run, 'run.start', { mode: 'craft', idea: 'A website for a small bakery, so customers can order bread ahead.', seat: 'product' });
  for (const c of [KEEP, KEEP2]) {
    logEvent(run, 'candidate', c);
    logEvent(run, 'decided', { id: c.id, seat: c.seat, decision: c.decision, choice: c.options[0], cites: 'team default', round: 'select' });
  }
  logEvent(run, 'select.done', { came: 2, brought: 0, ms: 1 });
  const decideSeen = [];
  const decide = async (cs, tk) => { decideSeen.push(cs.map(c => c.id)); assert.ok(tk.some(l => l.id === 'L5'));
    return { decisions: cs.map(c => ({ id: c.id, choice: 'Name and email only', cites: 'L5', newOption: true })) }; };
  const hook = () => J.queueRevisit(run, { decide }); // what installJoint does on each takeaway and each agreement
  const fake = fakeModel({ close: { headline: 'We keep the phone' } });
  let c21Agreed;
  const agreedC21 = new Promise(r => (c21Agreed = r));
  const talk = J.runJoint(run, { callModel: async a => {
    const slow = /What the order form asks for/.test(a.system);
    await new Promise(r => setTimeout(r, slow ? 120 : 5));
    const out = await fake(a);
    if (a.schema.required.includes('choice')) out.choice = slow ? KEEP2.options[0] : KEEP.options[0]; // the closers keep the phone
    return out;
  } });
  // j-c20 agrees fast; then her L5, while j-c21 is still talking
  for (let i = 0; i < 100 && !readEvents(run).some(e => e.type === 'joint.agreed' && e.id === 'j-c20'); i++) await new Promise(r => setTimeout(r, 10));
  assert.ok(!readEvents(run).some(e => e.type === 'joint.agreed' && e.id === 'j-c21'), 'j-c21 still talking');
  logEvent(run, 'taste.written', { mode: 'craft', id: 'L5', text: 'Never ask for anything we could remember or skip.', askId: 'a3' });
  await hook(); // on the takeaway: j-c20 is revisited
  assert.ok(readEvents(run).some(e => e.type === 'joint.revised' && e.id === 'j-c20'));
  (async () => { while (!readEvents(run).some(e => e.type === 'joint.agreed' && e.id === 'j-c21')) await new Promise(r => setTimeout(r, 10)); c21Agreed(); })();
  await agreedC21;
  await hook(); // on the agreement: j-c21 (agreed during L5, closer kept the phone) is revisited
  await talk;
  const evs = readEvents(run);
  assert.ok(evs.some(e => e.type === 'joint.revised' && e.id === 'j-c21' && e.against.includes('L5')), JSON.stringify(evs.filter(e => /joint\.(agreed|revised|kept)|taste|decided/.test(e.type)).map(e => [e.type, e.id, e.round, e.choice, e.reason])));
  assert.deepEqual(decideSeen, [['c20'], ['c21']], 'each agreement revisited once, nothing twice');
  for (const id of ['c20', 'c21']) assert.doesNotMatch(evs.filter(e => e.type === 'decided' && e.id === id).at(-1).choice, /phone/i, id);
  // Build: nothing left to check; the page has no phone field
  const tpl = loadTemplate('bakery');
  _setDecideRest(async () => []); _setDeal(async () => ({ skipped: 'test' }));
  try {
    await buildRun(run, { call: async () => ({ words: tpl.defaults.words, steps: tpl.defaults.steps, switches: { ...tpl.defaults.switches, phone: true }, decidedShown: [] }) });
  } finally { _setDecideRest(null); _setDeal(null); }
  assert.equal(decideSeen.length, 2, 'the build did not check again');
  assert.doesNotMatch(fs.readFileSync(path.join(process.env.RUNS_DIR, run, 'page', 'index.html'), 'utf8'), /type="tel"/);
});

test('a revisit that keeps the agreement logs joint.kept { reason }; a revisit past its wait lets Build go on as logged', async () => {
  const run = keepRun();
  await J.queueRevisit(run, { decide: async () => ({ decisions: [{ id: 'c20', choice: KEEP.options[0], cites: 'L5' }] }) });
  const kept = readEvents(run).find(e => e.type === 'joint.kept');
  assert.deepEqual([kept.id, kept.reason, kept.against], ['j-c20', 'still fits her takeaways', ['L5']]);
  await J.queueRevisit(run, { decide: async () => { throw new Error('should not run: already checked against L5'); } });
  assert.equal(readEvents(run).filter(e => e.type === 'joint.kept').length, 1, 'checked once per line');
  // a failed call is logged too
  const run2 = keepRun();
  await J.queueRevisit(run2, { decide: async () => { throw new Error('model down'); } });
  const failedKept = readEvents(run2).find(e => e.type === 'joint.kept');
  assert.match(failedKept.reason, /revisit call failed: model down/);
  assert.deepEqual(failedKept.against, [], 'a failed call checked nothing');
  await J.queueRevisit(run2, { decide: async () => ({ decisions: [{ id: 'c20', choice: KEEP.options[1], cites: 'L5' }] }) });
  assert.ok(readEvents(run2).some(e => e.type === 'joint.revised' && e.id === 'j-c20'), 'tried again, and it took');
  // a revisit that hangs: the wait gives up at its cap
  const run3 = keepRun();
  J.queueRevisit(run3, { decide: () => new Promise(() => {}) });
  const t0 = Date.now();
  assert.deepEqual(await J.revisitSettled(run3, 60), { pending: true, timedOut: true });
  assert.ok(Date.now() - t0 < 1000);
});
