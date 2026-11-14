#!/usr/bin/env node
// Builds the yoga page from a FIXED SAMPLE run (Priya's flow, three answers, her file) through the real build
// route code and the real fill call, and prints the timings. The re-decision here is a sample fixture, not
// lib/select.js: it stands in for piece 3 so the page can be built and looked at on its own.
//
//   node scripts/fill-demo.mjs [--runs 3] [--run fill-demo] [--template yoga|cafe]
import fs from 'node:fs';
import path from 'node:path';
import { RUNS_DIR, logEvent } from '../lib/events.js';
import { buildRun, _setDecideRest } from '../routes/build.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg('runs', 1));
const RUN = arg('run', 'fill-demo');
const CAFE = arg('template', 'yoga') === 'cafe';

const sample = CAFE ? {
  idea: 'A pre-order page for a café’s morning pastries.',
  lines: ['pastries', 'a pastry', 'confirm', 'ordered', 'regulars → "Order your usual"'],
  labels: ['pastries', 'a pastry', 'confirm', 'ordered', 'Order your usual'],
} : {
  idea: 'A booking page for a small yoga studio.',
  lines: ['classes', 'a class', 'confirm', 'booked', 'regulars → "Book your usual"'],
  labels: ['classes', 'a class', 'confirm', 'booked', 'Book your usual'],
};
const nodes = sample.labels.map((label, i) => ({ id: `n${i + 1}`, label }));
const edges = [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' }, { from: 'n1', to: 'n5', label: 'regulars' }];

const taste = [
  '# Her file',
  '- [L1] Regulars come first; a newcomer can find their own way. (prepared for the demo)',
  '- [L2] Nobody needs an account to do the one thing they came for. (prepared for the demo)',
  '- [L3] Never ask for anything you could remember or skip.',
  '',
].join('\n');

const C = (id, seat, decision, options, recommendation, cost = 'low', attachTo = null) =>
  ({ id, seat, decision, options, recommendation, reason: 'sample', cost, undoable: true, attachTo });
const candidates = [
  C('c1', 'research', 'Do full classes get a waitlist?', ['Waitlist', 'Show as full'], 'Waitlist', 'high', 'n2'),
  C('c2', 'product', 'How is a regular recognised?', ['Remembered on this device', 'Log in'], 'Remembered on this device', 'high', 'n5'),
  C('c3', 'product', 'What does confirm ask for?', ['Name and email', 'Name, email and phone'], 'Name and email', 'low', 'n3'),
  C('c4', 'product', 'How does cancelling work?', ['One tap, no reason', 'One tap, with a reason'], 'One tap, with a reason'),
  C('c5', 'engineering', 'Ask for a phone number?', ['No', 'Optional'], 'Optional'),
  C('c6', 'product', 'Does booking need an account?', ['No account', 'Account'], 'No account'),
  C('c7', 'design', 'Where do regulars land?', ['Their usual first', 'The timetable first'], 'Their usual first'),
  C('c8', 'design', 'Offer "remember me on this device"?', ['Yes', 'No'], 'Yes'),
];
const asks = candidates.slice(0, 3).map((c, i) => ({ ...c, kind: i === 1 ? 'pin' : 'fork', why: 'sample' }));
const answers = [{ askId: 'c1', choice: 'Waitlist' }, { askId: 'c2', choice: 'Remembered on this device' }, { askId: 'c3', choice: 'Name and email' }];

// SAMPLE re-decision (what decideRest should return after her new line L3).
const sampleDecideRest = () => [
  { id: 'c4', seat: 'product', decision: 'How does cancelling work?', choice: 'Cancel is one tap, no reason asked', cites: 'L3' },
  { id: 'c5', seat: 'engineering', decision: 'Ask for a phone number?', choice: 'No phone field', cites: 'L3' },
  { id: 'c6', seat: 'product', decision: 'Does booking need an account?', choice: 'No account needed to book', cites: 'L2' },
  { id: 'c7', seat: 'design', decision: 'Where do regulars land?', choice: 'Regulars see their usual class first', cites: 'L1' },
  { id: 'c8', seat: 'design', decision: 'Offer "remember me on this device"?', choice: 'Remembered on this device, so she is never asked twice', cites: 'L3' },
];

function writeSampleRun() {
  const dir = path.join(RUNS_DIR, RUN);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'taste.md'), taste);
  logEvent(RUN, 'run.start', { idea: sample.idea, seat: 'product', mode: 'craft', sample: true });
  sample.lines.forEach((text, i) => logEvent(RUN, 'flow.line', { text, nodes: nodes.slice(0, i + 1), edges: edges.filter(e => +e.to.slice(1) <= i + 1), mode: 'craft' }));
  for (const c of candidates) logEvent(RUN, 'candidate', c);
  for (const a of asks) logEvent(RUN, 'ask', { ...a, mode: 'craft' });
  for (const a of answers) logEvent(RUN, 'answer', { ...a, mode: 'craft' });
  logEvent(RUN, 'pin', { nodeId: 'n3', text: 'Never ask for a phone number. Regulars hate it.', mode: 'craft' });
  logEvent(RUN, 'taste.written', { id: 'L3', text: 'Never ask for anything you could remember or skip.', reworded: true, mode: 'craft' });
}

_setDecideRest(sampleDecideRest);
const times = [];
for (let i = 0; i < N; i++) {
  writeSampleRun();
  const r = await buildRun(RUN);
  times.push(r);
  console.log(`build ${i + 1}: total ${r.ms} ms, fill call ${r.fillMs} ms, template ${r.template} -> ${r.url}`);
}
if (N > 1) {
  const f = times.map(t => t.fillMs).sort((a, b) => a - b);
  console.log(`fill call ms: min ${f[0]}, median ${f[Math.floor(f.length / 2)]}, max ${f[f.length - 1]} (n=${N}, backend ${process.env.MODEL_BACKEND || 'claude-code'}, model ${process.env.FILL_MODEL || 'default'})`);
}
