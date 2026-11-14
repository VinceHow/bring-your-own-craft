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
    'Whether full classes get a waitlist', 'Which fields the form asks for', 'What to measure at confirm', 'Which accent colour'])
    assert.ok(isGranular({ decision: d }, {}), d);
  for (const d of ['Who the page is for first', 'What happens when a class is full', 'What booking should feel like'])
    assert.ok(!isGranular({ decision: d, options: ['Offer a waitlist', 'Ask for email'] }, {}), d);
  assert.ok(isGranular({ decision: 'Who it is for' }, { granular: true }));
  assert.ok(!clearsBar({ decision: 'Whether to keep a waitlist' }, ok('x')));
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
  const cs = [cand(1, { attachTo: 'n1' }), cand(2, { attachTo: 'n2' }), cand(3, { attachTo: 'n3', decision: 'Another topic entirely' })];
  const { picks } = pickAsks(cs, scores([{ id: 'c1', settles: ['c1', 'c3'] }, { id: 'c2', settles: ['c2', 'c3'], question: 'Who comes back every single week?' },
    { id: 'c3', question: 'Where does the morning start?' }]), { flow });
  const all = picks.flatMap(p => p.decisionIds);
  assert.strictEqual(new Set(all).size, all.length);
  assert.ok(!picks.some(p => p.candidate.id === 'c3'), 'c3 is settled by an earlier question');
});
