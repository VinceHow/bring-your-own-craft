// A focus moment: her answer -> one interpret call -> decisions (each one of its options), one or two chime-ins,
// her brief; her brief -> her file. Room chatter from real events. Offline: a fake model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-interpret-'));
const { interpret, saveTakeaways, saveBrief, cleanInterpret, NAMES } = await import('../lib/interpret.js');
const { readProfile } = await import('../lib/profile.js');
const { installChatter, lineFor, okLine, CHATTER_PER_SEAT } = await import('../lib/chatter.js');
const { firstSketch, currentLines } = await import('../lib/sketch.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');
const { initTaste, readTaste } = await import('../lib/taste.js');

const task = system => (system.match(/^# Task: ([\w-]+)/m) || [])[1];
const C1 = { id: 'c1', seat: 'design', decision: 'What leads the class list', options: ['Your usual class first', 'This week by day'], recommendation: 'This week by day', reason: 'r', cost: 'high', undoable: true, attachTo: 'n1' };
const C2 = { id: 'c2', seat: 'strategy', decision: 'How regulars pay', options: ['Class pass', 'Pay per class'], recommendation: 'Pay per class', reason: 'r', cost: 'high', undoable: false, attachTo: null };
const REPLY = {
  decisions: [{ id: 'c1', choice: 'your usual class first' }, { id: 'c2', choice: 'A subscription' }, { id: 'c9', choice: 'x' }],
  chimes: [{ seat: 'design', text: 'Then their usual class goes first, one tap.' }, { seat: 'research', text: 'That matches what small studios report.' },
    { seat: 'data', text: 'A third one.' }],
  takeaways: { believe: 'Sounds like: Regulars should never hunt for what is already theirs.', guidance: 'Put their usual class first, one tap.' },
};
function newRun({ seat = 'product', sketch = false } = {}) {
  const run = newRunId(`i-${Math.random().toString(36).slice(2, 8)}`);
  initTaste(run);
  logEvent(run, 'run.start', { mode: 'craft', idea: 'A booking page for a small yoga studio.', seat });
  for (const c of [C1, C2]) logEvent(run, 'candidate', c);
  logEvent(run, 'ask', { id: 'a1', seat: 'design', by: 'Mika', question: 'What makes someone come back to a studio week after week?',
    artifact: { kind: sketch ? 'journey' : 'wires' }, decisionIds: ['c1', 'c2'] });
  return run;
}
const fake = (reply = REPLY, seen = {}) => async a => {
  if (task(a.system) === 'interpret') { seen.interpret = a; return reply; }
  if (task(a.system) === 'profile') { seen.profile = a; return {}; }
  if (/You handed her a rough sketch/.test(a.system)) { seen.reshape = a; return { users: ['Regulars', 'First-timers'], stages: ['Your usual class', 'Find a class', 'Confirm', 'Booked'] }; }
  if (/Hand them a rough shape/.test(a.system)) return { users: ['First-timers', 'Regulars'], stages: ['Find a class', 'Pick one', 'Confirm', 'Booked'] };
  throw new Error('unexpected call');
};

test('her answer: logged first (craft); chime, ~1 s, chime, then the takeaways, then the mapped decisions', async () => {
  const run = newRun();
  const seen = {};
  const t0 = Date.now();
  const r = await interpret({ run, askId: 'a1', text: 'Knowing their spot is theirs. My regulars do the same Tuesday class every week.', callModel: fake(REPLY, seen), gapMs: 120 });
  await r.body.profile;
  assert.equal(r.code, 200);
  const evs = readEvents(run).filter(e => ['answer', 'chime', 'takeaways', 'answer.mapped'].includes(e.type));
  assert.deepEqual(evs.map(e => e.type), ['answer', 'chime', 'chime', 'takeaways', 'answer.mapped']);
  assert.ok(!('why' in evs[3]), 'takeaways: what I believe / guidance, nothing else');
  assert.equal(evs[0].mode, 'craft');
  assert.ok(evs[2].t - evs[1].t >= 100, 'the second chime comes about a gap later');
  assert.ok(Date.now() - t0 >= 200);
  assert.deepEqual(evs.slice(1, 3).map(c => [c.by, c.seat]), [['Mika', 'design'], ['Noor', 'research']], 'at most two, by name');
  assert.deepEqual(evs[4].decisions.map(d => [d.id, d.choice]), [['c1', 'Your usual class first']], 'only options, only its own decisions');
  assert.equal(evs[3].believe, 'Regulars should never hunt for what is already theirs.');
  assert.match(seen.interpret.system, /What makes someone come back/);
  assert.match(seen.interpret.system, /c2 \(Strategy\): How regulars pay\. Options: "Class pass", "Pay per class"/);
  assert.match(seen.interpret.system, /- Ines, Strategy: who pays, and why now/);
  assert.ok(!/- Product, Product/.test(seen.interpret.system), 'her own seat is not on her team');
  assert.match(seen.interpret.user, /Tuesday class/);
  assert.ok(seen.profile, 'her profile is updated after her answer');
  assert.equal((await interpret({ run, askId: 'a1', text: 'again', callModel: fake() })).code, 409);
  assert.equal((await interpret({ run, askId: 'nope', text: 'x', callModel: fake() })).code, 404);
  assert.equal((await interpret({ run, askId: 'a1', text: '  ', callModel: fake() })).code, 400);
});

test('chime-ins are never questions and never addressed to her; her seat never chimes in', () => {
  const out = cleanInterpret({ decisions: [], brief: {}, chimes: [
    { seat: 'design', text: 'Should regulars go first?' }, { seat: 'data', text: 'I will count what you said.' },
    { seat: 'product', text: 'Product line.' }, { seat: 'engineering', text: 'One tap to rebook.' }, { seat: 'engineering', text: 'Again.' }] },
  { cands: [C1], herSeat: 'product' });
  assert.deepEqual(out.chimes, [{ by: 'Bo', seat: 'engineering', text: 'One tap to rebook.' }]);
  const diy = cleanInterpret({ decisions: [], brief: {}, chimes: [{ seat: 'product', text: 'The spec takes the pickup slot.' }] }, { cands: [], herSeat: 'diy' });
  assert.equal(diy.chimes[0].by, NAMES.product, 'in her own craft, Product is on her team');
});

test('a failed interpret call: her answer stays logged, nothing is invented', async () => {
  const run = newRun();
  const r = await interpret({ run, askId: 'a1', text: 'Knowing their spot is theirs.', callModel: async () => { throw new Error('down'); } });
  assert.equal(r.code, 502);
  assert.deepEqual(readEvents(run).filter(e => ['answer', 'chime', 'takeaways', 'answer.mapped', 'interpret.error'].includes(e.type)).map(e => e.type), ['answer', 'interpret.error']);
});

test('a question about her journey: the journey redraws from her words at the same time (her answer counts once)', async () => {
  const run = newRun({ sketch: true });
  await firstSketch({ run, callModel: fake(), dripMs: 0, withGuest: false });
  const seen = {};
  const r = await interpret({ run, askId: 'a1', text: 'Regulars want their usual class first.', callModel: fake(REPLY, seen), gapMs: 0 });
  await r.body.profile;
  assert.ok(seen.reshape, 'redrawn');
  assert.match(seen.reshape.user, /usual class first/);
  assert.deepEqual(currentLines(readEvents(run)), ['Your usual class', 'Find a class', 'Confirm', 'Booked']);
  const crafts = readEvents(run).filter(e => e.mode === 'craft' && (e.type === 'answer' || e.type === 'reshape'));
  assert.deepEqual(crafts.map(e => e.type), ['answer'], 'the redraw is not a second craft event');
});

test('the takeaways she keeps: "what I believe" goes to her hidden file and her profile\'s philosophy; reworded when she changed it', async () => {
  const run = newRun();
  const r = await interpret({ run, askId: 'a1', text: 'Fast. Never ask for anything you already know.', callModel: fake(), gapMs: 0 });
  await r.body.profile;
  const before = readTaste(run).length;
  const kept = saveTakeaways({ run, askId: 'a1', believe: 'Regulars should never hunt for what is already theirs.' });
  assert.equal(kept.code, 200);
  assert.equal(kept.body.id, `L${before + 1}`);
  let w = readEvents(run).findLast(e => e.type === 'taste.written');
  assert.deepEqual([w.mode, w.reworded, w.askId, w.guidance, w.hidden], ['craft', false, 'a1', 'Put their usual class first, one tap.', true]);
  assert.deepEqual(readProfile(run).philosophy.map(x => x.believe), ['Regulars should never hunt for what is already theirs.']);
  saveBrief({ run, askId: 'a1', believe: 'Never ask for anything you could remember or skip.' }); // /brief stays as an alias
  w = readEvents(run).findLast(e => e.type === 'taste.written');
  assert.equal(w.reworded, true);
  assert.equal(readTaste(run).at(-1).text, 'Never ask for anything you could remember or skip.');
  assert.equal(readProfile(run).philosophy.length, 2);
  assert.equal(saveTakeaways({ run, askId: 'a1', believe: ' ' }).code, 400);
  assert.equal(saveTakeaways({ run, askId: 'zz', believe: 'x' }).code, 404);
});

test('room chatter: from real events, by name, never to her, never a question, calm', () => {
  installChatter();
  const run = newRunId(`ch-${Math.random().toString(36).slice(2, 8)}`);
  logEvent(run, 'run.start', { idea: 'x', seat: 'product' });
  logEvent(run, 'candidate', { id: 'c1', seat: 'research', decision: 'Waitlist', source: { title: 'Full classes at small studios' } });
  logEvent(run, 'teammate.done', { seat: 'engineering', count: 4, note: "Taking the booking form" });
  logEvent(run, 'teammate.done', { seat: 'data', count: 4, note: 'Would you like a counter?' });
  logEvent(run, 'teammate.done', { seat: 'product', count: 4, note: 'Spec drafted' });
  logEvent(run, 'decided', { id: 'c5', seat: 'strategy', decision: 'Whether regulars get a class pass', choice: 'Class pass shown first', cites: 'team default' });
  for (let i = 0; i < 5; i++) logEvent(run, 'decided', { id: `d${i}`, seat: 'design', decision: `Layout ${i}`, choice: `Option ${i}`, cites: 'team default' });
  const chatter = readEvents(run).filter(e => e.type === 'chatter');
  assert.deepEqual(chatter.slice(0, 3).map(c => c.text), ['Noor: found a source on full classes at small studios.', 'Bo: taking the booking form.',
    'Ines: regulars get a class pass, class pass shown first.']);
  assert.ok(chatter.every(c => okLine(c.text)));
  assert.ok(!chatter.some(c => c.seat === 'product'), 'her seat never chatters');
  assert.ok(!chatter.some(c => c.seat === 'data'), 'a question is never chatter');
  assert.equal(chatter.filter(c => c.seat === 'design').length, CHATTER_PER_SEAT);
  assert.equal(lineFor({ type: 'decided', seat: 'design', decision: 'x', choice: 'y', cites: 'L3' }), null, 'her file deciding it is not chatter');
});

test('her page reflects what her answer settled: the fill gets the mapped choices; the build never re-decides them', async () => {
  const { gatherRun } = await import('../lib/fill.js');
  const { buildRun, _setDecideRest } = await import('../routes/build.js');
  const run = newRun();
  const r = await interpret({ run, askId: 'a1', text: 'Knowing their spot is theirs.', callModel: fake(), gapMs: 0 });
  await r.body.profile;
  const g = gatherRun(readEvents(run), '- [L1] x');
  assert.deepEqual(g.answers.filter(a => a.mapped).map(a => [a.decision, a.choice]), [['What leads the class list', 'Your usual class first']]);
  assert.ok(g.answers.some(a => a.herWords && a.choice === 'Knowing their spot is theirs.' && /come back/.test(a.decision)), 'her words, with the question');
  let given = null;
  _setDecideRest(async cands => { given = cands.map(c => c.id); throw new Error('stop here'); });
  try { await buildRun(run); } catch {}
  _setDecideRest(null);
  assert.ok(given && !given.includes('c1') && given.includes('c2'), `re-decided: ${given}`);
});
