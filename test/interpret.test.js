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
const { installChatter, lineFor, okLine, chatterLine, CHATTER_PER_SEAT } = await import('../lib/chatter.js');
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
const LINES = { Mika: 'Then their usual class goes first, one tap.', Ines: 'Mika, regulars buy passes too. The pass goes first.',
  Bo: 'Pass right under it, but one tap stays one tap.', Theo: 'Then I count rebooks, so we know the tap works.' };
const fake = (reply = REPLY, seen = {}) => async a => {
  if (task(a.system) === 'thread') { const who = a.user.match(/^You are (\w+)/)[1]; (seen.turns ||= []).push(a.user); return { text: LINES[who] }; }
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
  // Her words touch the page (design) and paying (strategy, twice): Mika, then Ines; nobody else adds filler.
  const r = await interpret({ run, askId: 'a1', text: 'Knowing their spot is theirs: show their usual class on the page, and let regulars pay with a pass.', callModel: fake(REPLY, seen), gapMs: 120 });
  await r.body.profile;
  assert.equal(r.code, 200);
  const evs = readEvents(run).filter(e => ['answer', 'chime', 'takeaways', 'answer.mapped'].includes(e.type));
  assert.deepEqual(evs.map(e => e.type), ['answer', 'chime', 'chime', 'takeaways', 'answer.mapped']);
  assert.ok(!('why' in evs[3]), 'takeaways: what I believe / guidance, nothing else');
  assert.equal(evs[0].mode, 'craft');
  assert.ok(evs[2].t - evs[1].t >= 100, 'the second line comes about a gap later');
  assert.ok(Date.now() - t0 >= 100);
  assert.deepEqual(evs.slice(1, 3).map(c => [c.by, c.seat, c.turn]), [['Mika', 'design', 1], ['Ines', 'strategy', 2]],
    'routed by relevance: the crafts her words touch, best match first');
  assert.match(seen.turns[1], /Mika \(Design\): Then their usual class goes first/, 'each turn hears the thread so far');
  assert.match(seen.turns[1], /Answer Mika directly: start with "Mika,"/, 'turn 2 answers turn 1 by name');
  assert.equal(seen.turns.length, 2, 'no retries needed');
  assert.match(seen.turns[1], /You speak last/);
  assert.match(seen.turns[0], /She answered \(everything follows from this\): "Knowing their spot is theirs/);
  assert.match(seen.turns[1], /How regulars pay: Class pass \/ Pay per class/, 'grounded in what the page can show');
  assert.deepEqual(evs[4].decisions.map(d => [d.id, d.choice]), [['c1', 'Your usual class first']], 'only options, only its own decisions');
  assert.equal(evs[3].believe, 'Regulars should never hunt for what is already theirs.');
  assert.match(seen.interpret.system, /What makes someone come back/);
  assert.match(seen.interpret.system, /c2 \(Strategy\): How regulars pay\. Options: "Class pass", "Pay per class"/);
  assert.match(seen.interpret.user, /pay with a pass/);
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
  assert.deepEqual(chatter.slice(0, 2).map(c => [c.by, c.text]), [['Noor', 'found a source on full classes at small studios.'], ['Ines', 'class pass shown first.']]);
  assert.ok(!chatter.some(c => /^[A-Z][a-z]+:/.test(c.text)), 'no "Name:" prefix: the room shows the speaker');
  assert.ok(!chatter.some(c => c.from === 'teammate.done'), 'a work note is a log, never chatter');
  assert.ok(chatter.every(c => c.text.split(' ').length <= 15 && !/…/.test(c.text)), 'short, never cut');
  assert.equal(lineFor({ type: 'decided', seat: 'engineering', decision: 'x', choice: 'Name and email, no account', cites: 'team default' }), 'name and email, no account.');
  const ev = { type: 'decided', id: 'd7', seat: 'design', decision: 'x', choice: 'Usual loaf first', cites: 'team default' };
  assert.equal(lineFor(ev), lineFor({ ...ev }), 'the same event says the same line (R replays it)');
  assert.ok(!chatterLine('Ines: pricing and payment decisions for a single-bakery pre-order site: when customers pay…'), 'a log line is not chatter');
  assert.ok(chatter.every(c => okLine(c.text)));
  assert.ok(!chatter.some(c => c.seat === 'product'), 'her seat never chatters');
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

test('the thread: lines are spoken (≤15 words, no filler, never to her); 3 turns unless someone pushed back', async () => {
  const { cleanLine, okLine, problem, speakers, runThread } = await import('../lib/thread.js');
  assert.equal(cleanLine('Mika: "Great point! Their usual class goes first."'), 'Their usual class goes first.');
  assert.equal(cleanLine('Love that. Then pass holders first.'), 'Then pass holders first.');
  assert.equal(cleanLine("You've hit your weekly limit · resets Nov 15, 9pm (UTC)"), null, 'the service talking is never a line');
  assert.equal(cleanLine('API Error: 529 overloaded'), null);
  const limited = async () => ({ text: "You've hit your weekly limit · resets Nov 15, 9pm (UTC)" });
  const long = 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen.';
  assert.equal(cleanLine(long), long, 'never cut mid-sentence');
  assert.match(problem(long), /Shorter/);
  assert.match(problem('Nice.'), /concrete/);
  assert.match(problem('Her point about passes is right.'), /not to her or about her/);
  assert.match(problem('Then pass holders go first, always.', [{ text: 'Then pass holders sit on top.' }]), /repeat/);
  assert.match(problem('Ines, pass holders first, then?'), /Never end on a question/, 'a trailing question lands on her');
  assert.ok(!okLine('Then your regulars go first.'), 'never addressed to her');

  assert.match(problem('Pass price right beside it.', [], { by: 'Mika' }), /Answer Mika by name/);
  assert.equal(problem('Mika, pass price right beside it.', [], { by: 'Mika' }), null);
  const run = newRun();
  const evs = readEvents(run);
  const ask = evs.find(e => e.type === 'ask');
  assert.deepEqual(speakers(ask, evs, 'product'), ['design'], 'nothing in her words: the seat nearest the work, alone');
  assert.ok(speakers({ ...ask, artifact: { kind: 'finding' } }, evs, 'product').includes('research'), 'Research speaks on her finding');
  assert.ok(!speakers(ask, evs, 'strategy').includes('strategy'), 'her seat never speaks');
  const calm = async a => ({ text: { Mika: 'Mika here: usual class first, one tap.', Ines: 'Mika, then the usual class reads as theirs, by name.', Bo: 'One tap to rebook, signed in.', Theo: 'Counting rebooks from day one.' }[a.user.match(/^You are (\w+)/)[1]] });
  const t0 = Date.now();
  const thread = await runThread({ run, ask, text: 'Show their usual on the page first, and count how often they rebook it.', callModel: calm, gapMs: 150 });
  assert.deepEqual(thread.map(t => t.seat), ['data', 'design'], 'only the crafts her words touch, best match first');
  assert.equal(thread.find(t => t.seat === 'design').text, 'Usual class first, one tap.', 'nobody calls themselves by name');
  // Gaps are measured between the logged lines themselves; a loaded machine can only make them longer.
  assert.ok(thread.every((t, i) => !i || t.ms - thread[i - 1].ms >= 150), 'lines at least a gap apart: ' + thread.map(t => t.ms).join(', '));
  assert.equal((await runThread({ run, ask, text: 'x', callModel: limited, gapMs: 0 })).length, 0, 'a usage-limit message is never said');
  const askHer = async () => ({ text: 'Do you want your regulars first?' });
  assert.equal((await runThread({ run, ask, text: 'x', callModel: askHer, gapMs: 0 })).length, 0, 'a question to her is never said');
  let n = 0;
  const firstToHer = async () => ({ text: n++ % 2 ? 'Then your regulars go first, one tap.' : 'Then your regulars go first, one tap.' });
  assert.equal((await runThread({ run, ask, text: 'x', callModel: firstToHer, gapMs: 0 })).length >= 1, true, 'better a whole line about her regulars than silence');
});

test('each teammate only brings its own work that touches what was raised (no pet topics)', async () => {
  const { workOf } = await import('../lib/thread.js');
  const evs = [
    { type: 'candidate', id: 'w1', seat: 'engineering', decision: 'Whether full classes get a waitlist', options: ['Waitlist', 'No waitlist'], recommendation: 'Waitlist' },
    { type: 'candidate', id: 'w2', seat: 'engineering', decision: 'Whether regulars stay signed in', options: ['Remember them on the device', 'Sign in each time'], recommendation: 'Remember them on the device' },
  ];
  const w = workOf('engineering', evs, { decisionIds: [] }, '', 'Fast. Never ask regulars for anything you already know; remember them.');
  assert.match(w, /signed in/);
  assert.ok(!/waitlist/i.test(w), 'the waitlist was never raised, so it never comes up');
  assert.match(workOf('engineering', evs, { decisionIds: [] }, '', 'The smell of fresh bread.'), /nothing of yours touches this yet/);
});

test('seat rules: Noor only cites her prepared finding; Ines talks price only when money came up', async () => {
  const { seatProblem, seatRule, aboutMoney, runThread } = await import('../lib/thread.js');
  assert.match(seatProblem("I'll write up the standing-order study, with sources.", 'research', 'x'), /prepared finding/);
  assert.equal(seatProblem('Small bakeries guess how much to bake; orders ahead fix the guess.', 'research', 'x'), null);
  assert.ok(!aboutMoney('The smell of fresh bread at 7am.'));
  assert.ok(aboutMoney('Regulars prepay for a weekly loaf.'));
  assert.match(seatProblem('Then I will price the sourdough higher.', 'strategy', 'The smell of fresh bread.'), /how the offer reads/);
  assert.equal(seatProblem('Then I will price the sourdough higher.', 'strategy', 'They prepay for it.'), null);
  assert.match(seatRule('strategy', 'The smell.'), /how the offer reads/);
  assert.match(seatRule('research', ''), /never promise a write-up/i);
  // In a thread: Noor's promise is sent back once; a second promise is dropped, never said.
  const run = newRun();
  const ask = { ...readEvents(run).find(e => e.type === 'ask'), seat: 'research', by: 'Noor', artifact: { kind: 'finding' } };
  const seen = [];
  const model = async a => { const who = a.user.match(/^You are (\w+)/)[1]; seen.push(who);
    return { text: { Noor: "I'll pull the study and write it up with sources.", Mika: 'Noor, then sold-out loaves show what is still warm.',
      Ines: 'Mika, the warm row reads as today\'s bake, not leftovers.', Bo: 'Ines, warm row first, sold-out loaves below.' }[who] }; };
  const thread = await runThread({ run, ask, text: "Customers told me, and most people say it: show what's still warm on the page.", callModel: model, gapMs: 0 });
  assert.ok(!thread.some(t => t.seat === 'research'), 'a promise the run cannot keep is never said');
  assert.equal(seen.filter(w => w === 'Noor').length, 2, 'Noor was asked once more first');
  assert.ok(thread.length >= 1);
});

test('a chime-in never ends on a question to her: sent back once, then the trailing question is cut', async () => {
  const { runThread, endsInQuestion, dropTrailingQuestion } = await import('../lib/thread.js');
  assert.ok(endsInQuestion('Show the pass first?') && endsInQuestion('Pass first, then?"') && !endsInQuestion('Pass first. Done.'));
  assert.equal(dropTrailingQuestion('Regulars buy passes too. Show the pass first?'), 'Regulars buy passes too.');
  assert.equal(dropTrailingQuestion('What do you think?'), null);
  const run = newRun();
  const ask = readEvents(run).find(e => e.type === 'ask');
  // First try ends on a question; the retry is a statement: the retry is said.
  let calls = 0;
  const fixed = async a => { calls++; return { text: /first try was/.test(a.user) ? 'Then the pass sits right under the usual class.' : 'Then the pass sits right under it. Pass first, then?' }; };
  const t1 = await runThread({ run, ask, text: 'Their spot is theirs.', callModel: fixed, gapMs: 0 });
  assert.ok(t1.length >= 1 && t1.every(t => !endsInQuestion(t.text)), JSON.stringify(t1));
  assert.equal(t1[0].text, 'Then the pass sits right under the usual class.');
  // Both tries end on a question: the trailing question is cut, the statement before it is said.
  const stubborn = async () => ({ text: 'Regulars buy passes on Mondays too. Show the pass first?' });
  const t2 = await runThread({ run, ask, text: 'Their spot is theirs.', callModel: stubborn, gapMs: 0 });
  assert.ok(t2.length >= 1);
  assert.ok(t2.every(t => t.text === 'Regulars buy passes on Mondays too.'), JSON.stringify(t2));
  // Only a question, twice: nothing is said for that turn.
  const onlyQ = async () => ({ text: 'Should regulars see the pass first?' });
  assert.equal((await runThread({ run, ask, text: 'x', callModel: onlyQ, gapMs: 0 })).length, 0);
  const logged = readEvents(run).filter(e => e.type === 'chime');
  assert.ok(logged.every(e => !endsInQuestion(e.text)), 'no logged chime ends on a question');
});

test('routed by relevance: a design-only comment gets Mika alone; a money comment brings in Ines; never zero', async () => {
  const { speakers, relevance, runThread } = await import('../lib/thread.js');
  const run = newRun();
  const evs = readEvents(run);
  const ask = evs.find(e => e.type === 'ask');
  assert.deepEqual(speakers(ask, evs, 'product', 'It should feel calm and simple, with their loaf right at the front of the page.'), ['design']);
  const money = speakers(ask, evs, 'product', 'Regulars would pay ahead for a weekly loaf if the price felt fair.');
  assert.ok(money.includes('strategy'), JSON.stringify(money));
  assert.equal(money[0], 'strategy', 'money first when it is mostly about money');
  assert.deepEqual(speakers(ask, evs, 'product', 'Mm.'), ['design'], 'nothing matches: the seat closest to the wireframes');
  assert.deepEqual(speakers({ ...ask, artifact: { kind: 'finding' }, seat: 'research' }, evs, 'product', 'Mm.'), ['research'], 'on a finding: Research');
  assert.ok(!speakers(ask, evs, 'design', 'It should feel calm and simple on the page.').includes('design'), 'her own seat never replies');
  assert.ok(!speakers(ask, evs, 'product', 'Show it calm on the page.').includes('research'), 'Research only when her words are about what is known, or on its finding');
  assert.ok(relevance('pay the price').strategy === 2);
  // End to end: one comment about the look, one reply.
  const said = [];
  const one = await runThread({ run, ask, text: 'It should feel calm and simple, with their loaf right at the front of the page.', gapMs: 0,
    callModel: async a => { said.push(a.user.match(/^You are (\w+)/)[1]); return { text: 'Then their loaf leads the page, nothing else above it.' }; } });
  assert.deepEqual(one.map(t => t.seat), ['design']);
  assert.deepEqual(said, ['Mika'], 'no other teammate is even called');
});

// ---- never a dead page (Vincent's Mac, 14 Nov): who's reading is logged at once; failures are logged; Retry is safe ----
test('her answer logs who is reading before any model call; a failing teammate call is logged as chime.error', async () => {
  const run = newRun();
  let firstCallAt = null; const order = [];
  const failing = async a => {
    firstCallAt ??= readEvents(run).filter(e => e.type === 'thread.start').length;
    if (task(a.system) === 'thread') { order.push('thread'); throw new Error('claude exited 1: boom'); }
    return fake()(a);
  };
  const r = await interpret({ run, askId: 'a1', text: 'show their usual class on the page, and let regulars pay with a pass', callModel: failing, gapMs: 0 });
  await r.body.profile;
  const evs = readEvents(run);
  const start = evs.find(e => e.type === 'thread.start');
  assert.deepEqual(start.by, ['Mika', 'Ines']); assert.equal(start.askId, 'a1');
  assert.equal(firstCallAt, 1, 'thread.start is in the log before the first model call');
  const errs = evs.filter(e => e.type === 'chime.error');
  assert.ok(errs.length >= 1 && errs.every(e => e.askId === 'a1' && /boom/.test(e.error)), 'each silent teammate says why');
});

test('Retry after a 502 re-reads the same answer (never logs a second one); 202 while it is still being heard; 409 once heard', async () => {
  const run = newRun();
  let fail = true;
  const flaky = async a => { if (task(a.system) === 'interpret' && fail) throw new Error('claude timed out'); return fake()(a); };
  const said = 'Knowing their spot is theirs: show their usual class on the page.';
  const r1 = await interpret({ run, askId: 'a1', text: said, callModel: flaky, gapMs: 0 });
  assert.equal(r1.code, 502);
  assert.ok(readEvents(run).some(e => e.type === 'interpret.error' && e.askId === 'a1'));
  const chimesBefore = readEvents(run).filter(e => e.type === 'chime').length;
  fail = false;
  // While a resend is being heard, another resend is told to wait, not run twice.
  let release; const gate = new Promise(r => { release = r; });
  const slow = async a => { if (task(a.system) === 'interpret') await gate; return fake()(a); };
  const p2 = interpret({ run, askId: 'a1', text: 'ignored: the logged answer is what is re-read', callModel: slow, gapMs: 0 });
  await new Promise(r => setTimeout(r, 20));
  assert.equal((await interpret({ run, askId: 'a1', text: said, callModel: fake(), gapMs: 0 })).code, 202);
  release();
  const r2 = await p2; await r2.body.profile;
  assert.equal(r2.code, 200);
  const evs = readEvents(run);
  assert.equal(evs.filter(e => e.type === 'answer' && e.askId === 'a1').length, 1, 'her answer is logged once');
  assert.equal(evs.find(e => e.type === 'answer').text, said);
  assert.ok(evs.some(e => e.type === 'answer.retry'));
  assert.equal(evs.filter(e => e.type === 'chime').length, chimesBefore, 'the team already spoke: no second thread');
  assert.ok(evs.some(e => e.type === 'takeaways') && evs.some(e => e.type === 'answer.mapped'));
  assert.equal((await interpret({ run, askId: 'a1', text: said, callModel: fake() })).code, 409);
});
