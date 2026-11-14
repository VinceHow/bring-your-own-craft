// The bar (po/tray): a question reaches her only if her answer changes what gets built AND needs her expertise.
import { test } from 'node:test';
import assert from 'node:assert';
import { pickAsks } from '../lib/select.js';
import { parseFlow } from '../lib/flow.js';

const flow = parseFlow(['classes', 'a class', 'confirm', 'booked']);
const cand = (n, extra = {}) => ({ id: 'c' + n, seat: 'product', decision: 'Decision number ' + n + ' about the journey',
  options: ['a', 'b'], recommendation: 'a', reason: 'r', cost: 'high', undoable: false, attachTo: 'n' + ((n % 4) + 1), ...extra });
const scores = list => new Map(list.map(s => [s.id, { dupOf: null, kind: 'pin', ...s }]));

test('a question that needs no expertise is decided, not brought', () => {
  const cs = [cand(1), cand(2)];
  const { picks } = pickAsks(cs, scores([
    { id: 'c1', changes: 3, silent: 3, expertise: 1 },
    { id: 'c2', changes: 3, silent: 3, expertise: 3 },
  ]), { flow });
  assert.deepStrictEqual(picks.map(p => p.candidate.id), ['c2']);
});

test('fewer than three is fine: no fixed number is promised', () => {
  const cs = [cand(1), cand(2), cand(3), cand(4)];
  const { picks } = pickAsks(cs, scores(cs.map((c, i) => ({ id: c.id, changes: 3, silent: 3, expertise: i === 0 ? 3 : 0 }))), { flow });
  assert.strictEqual(picks.length, 1);
});

test('the ceiling of three still holds when every question passes the bar', () => {
  const cs = Array.from({ length: 10 }, (_, i) => cand(i + 1, { attachTo: 'n' + ((i % 4) + 1) }));
  const { picks } = pickAsks(cs, scores(cs.map(c => ({ id: c.id, changes: 3, silent: 3, expertise: 3 }))), { flow, max: 99 });
  assert.ok(picks.length <= 3);
});
