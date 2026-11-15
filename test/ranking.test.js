// What reaches her is decided by the selector's ranking and threshold (VISION: the question bar), never by a number.
// Only big questions in her craft get through; everything granular or low-stakes is the team's call; zero is a fine
// answer; and what she is asked follows the idea.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickAsks } from '../lib/select.js';
import { parseFlow } from '../lib/flow.js';

const flow = parseFlow(['choose', 'order ahead', 'pick up']);
const cand = (id, decision, extra = {}) => ({ id, seat: 'product', decision, options: ['a', 'b'], recommendation: 'a',
  reason: 'r', cost: 'high', undoable: false, attachTo: null, ...extra });
const big = id => ({ id, changes: 3, silent: 3, big: 3, hers: 3, granular: false, showable: true, dupOf: null, kind: 'pin',
  question: `What does ${id} mean to the people who come?` });
const low = id => ({ ...big(id), changes: 1, big: 1, hers: 1 });   // small, not in her craft: the team's call
const scores = list => new Map(list.map(s => [s.id, s]));
const picked = r => r.picks.map(p => p.candidate.id);

test('the threshold: a low-stakes candidate is never asked, however many there are', () => {
  const cs = Array.from({ length: 8 }, (_, i) => cand(`l${i}`, `Small call number ${i} about the page`, { cost: 'low', undoable: true }));
  const r = pickAsks(cs, scores(cs.map(c => low(c.id))), { flow });
  assert.deepEqual(picked(r), [], 'nothing low-stakes reaches her: zero is a fine answer, no number is promised');
  // Mixed in with one big question in her craft, only the big one reaches her.
  const withBig = [...cs, cand('b1', 'Who this is really for first')];
  assert.deepEqual(picked(pickAsks(withBig, scores([...cs.map(c => low(c.id)), big('b1')]), { flow })), ['b1']);
});

test('the threshold: a big question outside her craft, or one that would not change the build, stays the team\'s', () => {
  const cs = [cand('notHers', 'Which hosting provider runs the page'), cand('noChange', 'What the footer says'), cand('yes', 'What ordering should feel like')];
  const r = pickAsks(cs, scores([{ ...big('notHers'), hers: 0 }, { ...big('noChange'), changes: 0 }, big('yes')]), { flow });
  assert.deepEqual(picked(r), ['yes']);
});

test('the ranking follows the idea: a different idea raises different candidates, so the picks change', () => {
  const bakery = [cand('k1', 'Who the bread is for first'), cand('k2', 'How long a loaf is held')];
  const yoga = [cand('y1', 'Who the classes are for first'), cand('y2', 'What happens when a class is full')];
  const a = picked(pickAsks(bakery, scores(bakery.map(c => big(c.id))), { flow }));
  const b = picked(pickAsks(yoga, scores(yoga.map(c => big(c.id))), { flow }));
  assert.ok(a.length >= 1 && b.length >= 1);
  assert.notDeepEqual(a, b);
  // The same idea with the scorer's ranking turned around picks differently too: the ranking decides, not a script.
  const flipped = picked(pickAsks(bakery, scores([low('k1'), big('k2')]), { flow }));
  assert.deepEqual(flipped, ['k2']);
});
