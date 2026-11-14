import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFlow, normLabel } from '../lib/flow.js';

const labels = g => g.nodes.map(n => n.label);
const arrows = g => g.edges.map(e => `${e.from}>${e.to}${e.label ? ':' + e.label : ''}`);

test("Priya's journey: four steps in order, regulars branch off the first", () => {
  const g = parseFlow(['classes', 'a class', 'confirm', 'booked', 'regulars → "Book your usual"']);
  assert.deepEqual(labels(g), ['classes', 'a class', 'confirm', 'booked', 'Book your usual']);
  assert.deepEqual(g.nodes.map(n => n.id), ['n1', 'n2', 'n3', 'n4', 'n5']);
  assert.deepEqual(arrows(g), ['n1>n2', 'n2>n3', 'n3>n4', 'n1>n5:regulars']);
});

test('ids are stable as lines are added one by one', () => {
  const lines = ['classes', 'a class', 'confirm', 'booked', 'regulars → "Book your usual"'];
  const full = parseFlow(lines);
  for (let i = 1; i <= lines.length; i++) {
    const part = parseFlow(lines.slice(0, i));
    assert.deepEqual(part.nodes, full.nodes.slice(0, part.nodes.length));
  }
});

test('ascii arrow works the same as the unicode one', () => {
  const a = parseFlow(['classes', 'a class', 'regulars -> Book your usual']);
  const b = parseFlow(['classes', 'a class', 'regulars → Book your usual']);
  assert.deepEqual(a, b);
});

test('a branch starts from the earlier node it names (case and quotes ignored)', () => {
  const g = parseFlow(['classes', 'a class', 'confirm', 'booked', '"A Class" → waitlist']);
  assert.deepEqual(arrows(g).at(-1), 'n2>n5');
  assert.equal(g.edges.at(-1).label, undefined);
});

test('a branch can link back to an existing step', () => {
  const g = parseFlow(['classes', 'a class', 'confirm', 'booked', 'regulars → Book your usual → booked']);
  assert.deepEqual(arrows(g).slice(-2), ['n1>n5:regulars', 'n5>n4']);
  assert.equal(g.nodes.length, 5);
});

test('the main path continues from the last plain step, not the branch', () => {
  const g = parseFlow(['classes', 'regulars → Book your usual', 'a class']);
  assert.deepEqual(arrows(g), ['n1>n2:regulars', 'n1>n3']);
});

test('a whole path on the first line becomes a chain', () => {
  const g = parseFlow(['classes → a class → confirm → booked', 'regulars → "Book your usual"']);
  assert.deepEqual(labels(g), ['classes', 'a class', 'confirm', 'booked', 'Book your usual']);
  assert.deepEqual(arrows(g), ['n1>n2', 'n2>n3', 'n3>n4', 'n1>n5:regulars']);
});

test('blank lines, list markers and stray arrows are ignored', () => {
  const g = parseFlow(['', '  - classes  ', '2. a class', '   ', '→', null]);
  assert.deepEqual(labels(g), ['classes', 'a class']);
  assert.deepEqual(arrows(g), ['n1>n2']);
  assert.deepEqual(parseFlow([]), { nodes: [], edges: [] });
  assert.deepEqual(parseFlow(undefined), { nodes: [], edges: [] });
});

test('normLabel folds case, quotes, spaces and end punctuation', () => {
  assert.equal(normLabel('  "Book   your Usual." '), 'book your usual');
});
