// The question bar (DEMO.md): a question reaches her only if it is big, draws on what she's good at or loves, is
// natural to ask and can be shown on the page. Granular decisions are always the team's. No number is promised.
import { test } from 'node:test';
import assert from 'node:assert';
import { pickAsks, clearsBar, isGranular } from '../lib/select.js';
import { parseFlow } from '../lib/flow.js';

const flow = parseFlow(['classes', 'a class', 'confirm', 'booked']);
const cand = (n, extra = {}) => ({ id: 'c' + n, seat: 'product', decision: 'Decision number ' + n + ' about the journey',
  options: ['a', 'b'], recommendation: 'a', reason: 'r', cost: 'high', undoable: false, attachTo: 'n' + ((n % 4) + 1), ...extra });
const ok = id => ({ id, changes: 3, silent: 3, big: 3, hers: 3, granular: false, showable: true,
  question: `What does ${id} mean to the people who book?` });
const scores = list => new Map(list.map(s => [s.id, { dupOf: null, kind: 'pin', ...ok(s.id), ...s }]));

test('each part of the bar is needed: big, hers, showable, open in her file', () => {
  const cs = [1, 2, 3, 4, 5].map(n => cand(n, { attachTo: null }));
  const { picks } = pickAsks(cs, scores([
    { id: 'c1', big: 1 }, { id: 'c2', hers: 1 }, { id: 'c3', showable: false }, { id: 'c4', silent: 0 }, { id: 'c5' },
  ]), { flow });
  assert.deepStrictEqual(picks.map(p => p.candidate.id), ['c5']);
});

test('granular: the scorer\'s flag or the decision\'s own words, never its options', () => {
  for (const d of ['Whether customers need an account or just name and email', 'Remember regulars on this device',
    'Whether the waitlist takes payment or a hold', 'Whether full classes offer a waitlist and how spots get offered', 'Which fields the form asks for', 'What to measure at confirm', 'Which accent colour'])
    assert.ok(isGranular({ decision: d }, {}), d);
  for (const d of ['Who the page is for first', 'What happens when a class is full', 'What booking should feel like', 'Whether full classes get a waitlist'])
    assert.ok(!isGranular({ decision: d, options: ['Offer a waitlist', 'Ask for email'] }, {}), d);
  assert.ok(isGranular({ decision: 'Who it is for' }, { granular: true }));
  assert.ok(!clearsBar({ decision: 'Whether the waitlist switch is on' }, ok('x')));
});

test('a duplicate\'s question carries the group when the anchor has none, in the voice of who wrote it', () => {
  const cs = [cand(1, { seat: 'research', attachTo: null }), cand(2, { seat: 'product', attachTo: null })];
  const { picks } = pickAsks(cs, scores([{ id: 'c1' }, { id: 'c2', dupOf: 'c1', question: null }]), { flow });
  assert.strictEqual(picks.length, 1);
  assert.strictEqual(picks[0].candidate.id, 'c1');
  assert.deepStrictEqual(picks[0].decisionIds, ['c1', 'c2']);
});

test('fewer than three is fine: no fixed number is promised', () => {
  const cs = [cand(1), cand(2), cand(3), cand(4)];
  const { picks } = pickAsks(cs, scores(cs.map((c, i) => ({ id: c.id, hers: i === 0 ? 3 : 0 }))), { flow });
  assert.strictEqual(picks.length, 1);
});

test('each decision is settled by at most one question', () => {
  const cs = [cand(1, { attachTo: 'n1' }), cand(2, { attachTo: 'n2', decision: 'Mornings at the counter' }), cand(3, { attachTo: 'n3', decision: 'Another topic entirely' })];
  const { picks } = pickAsks(cs, scores([{ id: 'c1', settles: ['c1', 'c3'] }, { id: 'c2', settles: ['c2', 'c3'], question: 'Who comes back every single week?' },
    { id: 'c3', hers: 1, question: null }]), { flow });
  const all = picks.flatMap(p => p.decisionIds);
  assert.strictEqual(new Set(all).size, all.length);
  assert.deepStrictEqual(picks.map(p => p.decisionIds), [['c1', 'c3'], ['c2']]);
});

test('a decision that clears the bar on its own is never swallowed into another question', () => {
  const cs = [cand(1, { attachTo: 'n1' }), cand(2, { attachTo: 'n2', decision: 'Another topic entirely' })];
  const { picks } = pickAsks(cs, scores([{ id: 'c1', settles: ['c1', 'c2'] }, { id: 'c2', question: 'Where does the morning start?' }]), { flow });
  assert.deepStrictEqual(picks.map(p => p.decisionIds), [['c1'], ['c2']]);
});

test('spread across her work: the journey, the finding and the wireframes before a second question on any one', () => {
  const finding = { title: 'A finding', url: 'https://example.org' };
  const cs = [cand(1, { attachTo: 'n1', decision: 'Alpha topic' }), cand(2, { attachTo: 'n2', decision: 'Bravo topic' }),
    cand(3, { seat: 'design', attachTo: 'n3', decision: 'Charlie topic' }), cand(4, { seat: 'research', attachTo: 'n4', decision: 'Delta topic', source: finding })];
  const { picks } = pickAsks(cs, scores([{ id: 'c1' }, { id: 'c2', question: 'Who comes back every single week?' },
    { id: 'c3', hers: 2, question: 'How should booking feel late at night?' }, { id: 'c4', hers: 2, big: 2, question: 'When a class is full, what then?' }]), { flow, max: 3 });
  // With a budget of three (max is an optional argument, not a rule), the spread fills each piece before a second on any one.
  assert.deepStrictEqual(picks.map(p => [p.candidate.id, p.artifact.kind]), [['c1', 'journey'], ['c4', 'finding'], ['c3', 'wires']]);
});

test('a group is asked through the teammate whose work it sits on: Design over Research when there is no finding', () => {
  const cs = [cand(1, { seat: 'research', attachTo: null, decision: 'How the page should feel' }),
    cand(2, { seat: 'design', attachTo: null, decision: 'What booking should feel like' })];
  const { picks } = pickAsks(cs, scores([{ id: 'c1' }, { id: 'c2', dupOf: 'c1', silent: 2, question: 'What should booking a class feel like?' }]), { flow });
  assert.deepStrictEqual(picks.map(p => [p.candidate.id, p.artifact.kind]), [['c2', 'wires']]);
});

test('the question is the one the teammate drafted in its own call, when the scorer writes none; it must still be natural', () => {
  const cs = [cand(1, { attachTo: 'n1', question: 'What makes someone come back to a studio week after week?' }),
    cand(2, { attachTo: 'n2', decision: 'Other topic', question: 'Should regulars get a button?' })];
  const { picks } = pickAsks(cs, scores([{ id: 'c1', question: null }, { id: 'c2', question: null }]), { flow });
  assert.deepStrictEqual(picks.map(p => [p.candidate.id, p.question]), [['c1', 'What makes someone come back to a studio week after week?']]);
});

test('her domains: a big question outside them stays with the team; inside one, it can reach her', async () => {
  const { domainsFor, inDomains } = await import('../lib/teammates.js');
  assert.deepStrictEqual(domainsFor(null, 'product'), ['target customer', 'customer problem', 'user journey']);
  assert.deepStrictEqual(domainsFor(null, 'product', { domains: ['Target customer', 'the bake'] }), ['target customer', 'the bake']);
  assert.deepStrictEqual(domainsFor(null, 'product', { domains: { text: 'customers, the morning bake', confidence: 'high' } }), ['customers', 'the morning bake']);
  assert.ok(inDomains('User journey', ['user journey']) && !inDomains(null, ['user journey']) && !inDomains('pricing', ['user journey']));
  const cs = [cand(1, { attachTo: 'n1' }), cand(2, { attachTo: 'n2', decision: 'Other topic' })];
  const { picks } = pickAsks(cs, scores([{ id: 'c1', inDomain: false }, { id: 'c2', inDomain: true, question: 'Who comes back every single week?' }]), { flow });
  assert.deepStrictEqual(picks.map(p => p.candidate.id), ['c2']);
});

test('the scorer must name a domain; code checks it against hers', async () => {
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  process.env.RUNS_DIR ||= fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-bar-'));
  const { scoreCandidates, SCORE_SCHEMA } = await import('../lib/select.js');
  assert.ok(SCORE_SCHEMA.properties.scores.items.required.includes('domain'));
  let sys = '';
  const callModel = async ({ system }) => { sys = system; return { scores: [
    { id: 'c1', big: 3, hers: 3, silent: 3, dupOf: null, domain: 'pricing' },
    { id: 'c2', big: 3, hers: 3, silent: 3, dupOf: null, domain: 'target customer' }] }; };
  const m = await scoreCandidates({ idea: 'x', flow, taste: [], candidates: [cand(1), cand(2)], callModel, profile: null });
  assert.match(sys, /Her domains, the areas that are hers: target customer, customer problem, user journey/);
  assert.deepStrictEqual([m.get('c1').inDomain, m.get('c2').inDomain], [false, true]);
});

const TWO = 'What brings someone back to this bakery week after week, and what do they want to be done with in under a minute?';

test('one question at a time: one "?", no second clause, about 20 words', async () => {
  const { oneBreath, firstQuestion } = await import('../lib/select.js');
  assert.ok(!oneBreath(TWO));
  assert.strictEqual(firstQuestion(TWO), 'What brings someone back to this bakery week after week?');
  assert.ok(!oneBreath('Who is it for? What do they need?'));
  assert.strictEqual(firstQuestion('Who is it for? What do they need?'), 'Who is it for?');
  assert.ok(!oneBreath('How early can a customer know what bread they want, and how early does the baker need to know?'));
  assert.ok(!oneBreath('What do people need to feel before they trust a studio enough to put money down for something permanent and lasting forever?'), 'over 20 words');
  for (const ok of ['What makes someone come back to the same bakery week after week?',
    'What do you want a customer to feel in the minute after they\'ve ordered their bread?',
    "What makes someone feel at ease booking, whether it's their first visit or their fiftieth?"])
    assert.ok(oneBreath(ok), ok);
});

test('a two-in-one is sent back once; a good rewrite is kept, else it is trimmed to the first question', async () => {
  const { oneQuestion } = await import('../lib/select.js');
  let calls = 0;
  const good = async ({ system }) => { calls++; assert.match(system, /Task: one-question/); return { question: 'What brings someone back to this bakery every week?' }; };
  assert.deepStrictEqual(await oneQuestion(TWO, { callModel: good }), { question: 'What brings someone back to this bakery every week?', fixed: 'rewritten' });
  assert.strictEqual(calls, 1);
  const stillTwo = async () => { calls++; return { question: TWO }; };
  assert.deepStrictEqual(await oneQuestion(TWO, { callModel: stillTwo }), { question: 'What brings someone back to this bakery week after week?', fixed: 'trimmed' });
  const broken = async () => { throw new Error('down'); };
  assert.strictEqual((await oneQuestion(TWO, { callModel: broken })).fixed, 'trimmed');
  calls = 0;
  const fine = 'What makes someone come back to the same bakery week after week?';
  assert.deepStrictEqual(await oneQuestion(fine, { callModel: good }), { question: fine, fixed: null });
  assert.strictEqual(calls, 0, 'a good question costs no call');
});

test('end to end: a teammate\'s two-in-one reaches her as one question, and the log says it was fixed', async () => {
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  process.env.RUNS_DIR ||= fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-bar-'));
  const { select } = await import('../lib/select.js');
  const { newRunId, readEvents } = await import('../lib/events.js');
  const { initTaste } = await import('../lib/taste.js');
  const run = newRunId(`b-${Math.random().toString(36).slice(2, 8)}`); initTaste(run);
  const callModel = async ({ system, user }) => {
    const t = (system.match(/^# Task: ([\w-]+)/m) || [])[1];
    const items = JSON.parse(user);
    if (t === 'select') return { scores: items.map(c => ({ id: c.id, big: 3, hers: 3, silent: 3, changes: 3, dupOf: null, kind: 'pin', domain: 'target customer' })) };
    if (t === 'decide') return { decisions: items.map(c => ({ id: c.id, choice: c.recommendation, cites: 'team default' })) };
    if (t === 'one-question') return { question: 'Still two, and what else?' };
    throw new Error(t);
  };
  const r = await select({ run, idea: 'A website for a small bakery.', flow, taste: [], candidates: [cand(1, { question: TWO })], callModel });
  assert.strictEqual(r.asks[0].question, 'What brings someone back to this bakery week after week?');
  const ev = readEvents(run).find(e => e.type === 'ask');
  assert.strictEqual(ev.question, r.asks[0].question);
  assert.strictEqual(ev.questionFixed, 'trimmed');
});
