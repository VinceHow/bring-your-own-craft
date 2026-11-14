// Counter, reasons and meter from a fixed log. Pure; offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { counter, meter, reasons, tally } from '../lib/tally.js';

const R = 'r1';
const log = [
  { type: 'run.start', mode: 'craft', idea: 'yoga' },
  { type: 'flow.line', mode: 'craft', text: 'classes' },
  { type: 'flow.line', mode: 'craft', text: 'confirm' },
  ...['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].map(id => ({ type: 'candidate', id, seat: 'product', decision: `D ${id}` })),
  { type: 'ask', mode: 'craft', id: 'c1', seat: 'product', decision: 'D c1', why: 'In your seat; changes the journey itself.', source: { title: 'F', url: 'u' } },
  { type: 'ask', mode: 'craft', id: 'c2', seat: 'product', decision: 'D c2', why: 'In your seat.' },
  { type: 'ask.refused', id: 'c3', reason: 'out of her seat, cheap and undoable' },
  { type: 'decided', id: 'c3', seat: 'design', decision: 'D c3', choice: 'list', cites: 'team default', refused: true },
  { type: 'decided', id: 'c4', decision: 'D c4', choice: 'x', cites: 'L1' },
  { type: 'decided', id: 'c5', decision: 'D c5', choice: 'y', cites: 'team default' },
  { type: 'decided', id: 'c6', decision: 'Cancel', choice: 'reason asked', cites: 'team default' },
  { type: 'stamp', mode: 'stamp', source: 'design', text: 'Do you want photos?' },
  { type: 'answer', mode: 'craft', askId: 'c1', choice: 'waitlist' },
  { type: 'pin', mode: 'craft', nodeId: 'n2', text: 'Never ask for a phone number. Regulars hate it.' },
  { type: 'taste.suggested', text: 'Sounds like: never ask for what you could remember.' },
  { type: 'taste.written', mode: 'craft', id: 'L3', text: 'never ask for anything you could remember or skip.', reworded: true },
  { type: 'decided', id: 'c6', decision: 'Cancel', choice: 'one tap, no reason', cites: 'L3', round: 'build' },
  { type: 'build.step', step: 'fill' },
].map((e, i) => ({ t: 1000 + i, run: R, ...e }));

test('counter: came = candidates, brought = asks, decided = the rest, once each', () => {
  assert.deepEqual(counter(log), { came: 6, brought: 2, decided: 4 });
});

test('meter: craft / (craft + stamp); waiting events count for neither', () => {
  assert.deepEqual(meter(log), { craft: 8, stamp: 1, pct: 89 });
  assert.deepEqual(meter([]), { craft: 0, stamp: 0, pct: null });
});

test('reasons: why her asks made the cut; for the rest, the line that decided it (latest decision wins)', () => {
  const rs = reasons(log, [{ id: 'L1', text: 'Say it the way the customer would.' }, { id: 'L2', text: 'Smallest version.' }]);
  assert.deepEqual(rs.filter(r => r.kind === 'asked').map(r => [r.id, r.answer ?? null]), [['c1', 'waitlist'], ['c2', null]]);
  assert.equal(rs.find(r => r.id === 'c1').source.title, 'F');
  const c6 = rs.find(r => r.id === 'c6');
  assert.equal(c6.cites, 'L3');
  assert.equal(c6.line, 'never ask for anything you could remember or skip.'); // her new line, from the log
  assert.equal(rs.find(r => r.id === 'c4').line, 'Say it the way the customer would.');
  assert.equal(rs.find(r => r.id === 'c5').line, null);
  assert.equal(rs.find(r => r.id === 'c3').refused, 'out of her seat, cheap and undoable');
});

test('tally has the API shape', () => {
  const t = tally(log, []);
  assert.deepEqual(Object.keys(t).sort(), ['brought', 'came', 'decided', 'meter', 'reasons']);
  assert.equal(t.reasons.length, 6);
});
