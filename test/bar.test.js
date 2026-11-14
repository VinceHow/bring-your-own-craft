// The question bar (DEMO.md): a question reaches her only if it is big, draws on what she's good at or loves, is
// natural to ask and can be shown on the page. Granular decisions are always the team's. The ceiling of 3 holds.
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

test('the ceiling of three still holds when every question passes the bar', () => {
  const cs = Array.from({ length: 10 }, (_, i) => cand(i + 1, { attachTo: null, decision: `Topic ${'abcdefghij'[i]}xxxx` }));
  const { picks } = pickAsks(cs, scores(cs.map(c => ({ id: c.id, question: `What does ${'qwertyuiopasdf'[Number(c.id.slice(1))]}zzzzz mean to people?` }))), { flow, max: 99 });
  assert.strictEqual(picks.length, 3);
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
    { id: 'c3', hers: 2, question: 'How should booking feel late at night?' }, { id: 'c4', hers: 2, big: 2, question: 'When a class is full, what then?' }]), { flow });
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
