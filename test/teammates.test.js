// The team: six seats propose in parallel, and each seat's "Brings" line (DEMO.md, the team cards) is true of the
// prompt it runs on. Offline: a fake model is injected.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-team-'));
const { SEATS, STANCES, INKS, PER_SEAT, propose, systemFor, normalise } = await import('../lib/teammates.js');
const { readEvents, newRunId } = await import('../lib/events.js');
const { initTaste, readTaste } = await import('../lib/taste.js');

const flow = { nodes: [{ id: 'n1', label: 'classes' }, { id: 'n2', label: 'a class' }, { id: 'n3', label: 'confirm' }], edges: [] };
const newRun = () => { const r = newRunId(`t-${Math.random().toString(36).slice(2, 10)}`); initTaste(r); return r; };
const seatOf = system => (system.match(/You are the (\w+) teammate on a small product team/) || [])[1]?.toLowerCase();
const ctx = run => ({ idea: 'A booking page for a small yoga studio.', flow, taste: readTaste(run) });

// A fake teammate: Strategy answers with pricing and payment decisions; the others with one generic decision each.
const strategyReply = {
  note: 'Worked out who pays and when.',
  candidates: [
    { decision: 'Pass or drop-in', options: ['Class packs', 'Drop-in only', 'Both'], recommendation: 'Both',
      reason: 'Regulars save, newcomers try once.', cost: 'high', undoable: true, attachTo: 'n1', usesFinding: false },
    { decision: 'Pay online or at the desk', options: ['Online when booking', 'At the desk'], recommendation: 'Online when booking',
      reason: 'A paid spot is a kept spot.', cost: 'high', undoable: false, attachTo: 'n3', usesFinding: false },
    { decision: 'Refund on late cancel', options: ['Credit', 'No refund'], recommendation: 'Credit', reason: 'Keeps goodwill.',
      cost: 'low', undoable: false, attachTo: 'n9', usesFinding: true },
  ],
};
async function fakeTeam({ system }) {
  const seat = seatOf(system);
  if (seat === 'strategy') return strategyReply;
  return { note: `${seat} sheet`, candidates: [{ decision: `A ${seat} decision`, options: ['A', 'B'], recommendation: 'A',
    reason: 'r', cost: 'low', undoable: true, attachTo: null, usesFinding: false }] };
}

test('six seats, Strategy among them, with its stance and gold ink', () => {
  assert.deepEqual(SEATS, ['product', 'design', 'data', 'research', 'strategy', 'engineering']);
  assert.equal(STANCES.strategy, 'who pays, and why now');
  assert.equal(INKS.strategy, '#BB8B41');
  for (const s of SEATS) assert.ok(STANCES[s] && INKS[s], s);
  assert.ok(PER_SEAT * SEATS.length <= 25, 'no more candidates to select over than the five-seat team sent');
});

test('six teammates run in parallel, each logs start and done, Strategy candidates are well-formed', async () => {
  const run = newRun();
  let inFlight = 0, peak = 0;
  const callModel = async args => { inFlight++; peak = Math.max(peak, inFlight); await new Promise(r => setTimeout(r, 20)); inFlight--; return fakeTeam(args); };
  const r = await propose({ run, ...ctx(run), callModel });
  assert.equal(peak, 6, 'all six called at once');
  assert.deepEqual(Object.keys(r.timings).sort(), [...SEATS].sort());
  const evs = readEvents(run);
  for (const s of SEATS) {
    assert.ok(evs.some(e => e.type === 'teammate.start' && e.seat === s), `${s} started`);
    assert.ok(evs.some(e => e.type === 'teammate.done' && e.seat === s), `${s} done`);
  }
  const st = r.candidates.filter(c => c.seat === 'strategy');
  assert.equal(st.length, 3);
  assert.equal(r.candidates.length, 8);
  assert.equal(new Set(r.candidates.map(c => c.id)).size, 8, 'ids unique across seats');
  for (const c of st) {
    assert.match(c.id, /^c\d+$/);
    assert.ok(typeof c.decision === 'string' && c.decision);
    assert.ok(Array.isArray(c.options) && c.options.length >= 2 && c.options.includes(c.recommendation));
    assert.ok(['low', 'high'].includes(c.cost));
    assert.equal(typeof c.undoable, 'boolean');
    assert.ok(c.attachTo === null || flow.nodes.some(n => n.id === c.attachTo));
    assert.equal(c.source, undefined, 'only Research carries a source');
  }
  assert.equal(st[1].undoable, false); // taking money stays not undoable
  assert.equal(st[2].attachTo, null); // n9 isn't one of her boxes
  assert.equal(evs.filter(e => e.type === 'candidate' && e.seat === 'strategy').length, 3);
});

test('Strategy normalises: a recommendation outside its options is added, never dropped', () => {
  let n = 0;
  const [c] = normalise('strategy', { candidates: [{ decision: 'Deposit to hold a spot', options: ['No deposit'], recommendation: '£5 deposit',
    reason: 'r', cost: 'high', undoable: false, attachTo: 'n3' }] }, { flow, nextId: () => `c${++n}` });
  assert.deepEqual(c.options, ['£5 deposit', 'No deposit']);
  assert.equal(c.recommendation, '£5 deposit');
  assert.equal(c.attachTo, 'n3');
});

// "Brings" lines (DEMO.md, the team cards) checked against what each seat actually runs on.
test('Brings: Design runs on taste-skill\'s design rules', () => {
  const run = newRun();
  const rules = fs.readFileSync(new URL('../vendor/taste-skill/RULES-FOR-THE-ROOM.md', import.meta.url), 'utf8');
  const sys = systemFor('design', ctx(run));
  assert.ok(sys.includes(rules.trim()), 'the whole rules file is in Design\'s system prompt');
  for (const s of SEATS.filter(x => x !== 'design')) assert.ok(!systemFor(s, ctx(run)).includes('taste-skill design rules'), s);
  assert.ok(fs.existsSync(new URL('../vendor/taste-skill/LICENSE', import.meta.url)), 'taste-skill licence kept');
});

test('Brings: Research cites only data/research-finding.json', () => {
  const run = newRun();
  const finding = JSON.parse(fs.readFileSync(new URL('../data/research-finding.json', import.meta.url)));
  const sys = systemFor('research', ctx(run));
  assert.ok(sys.includes(finding.url) && sys.includes(finding.title));
  assert.match(sys, /Cite only this finding/);
  let n = 0;
  const [c] = normalise('research', { candidates: [{ decision: 'd', options: ['a', 'b'], recommendation: 'a', reason: 'r', cost: 'low',
    undoable: true, attachTo: null, usesFinding: true, source: { title: 'Made up', url: 'http://x' } }] }, { flow, nextId: () => `c${++n}` });
  assert.equal(c.source.url, finding.url); // code, not the model, sets the source
  for (const s of SEATS.filter(x => x !== 'research')) assert.ok(!systemFor(s, ctx(run)).includes(finding.url), s);
});

test('Brings: Data proposes what to measure at each step; Engineering speaks for the template and the live build; Strategy for pricing and payment', () => {
  const run = newRun();
  assert.match(systemFor('data', ctx(run)), /box by box through her journey: for each step, what single thing we'd measure/);
  const eng = systemFor('engineering', ctx(run));
  assert.match(eng, /speak for the page template and the live build/);
  assert.match(eng, /switches/);
  const st = systemFor('strategy', ctx(run));
  assert.match(st, /Strategy teammate on a small product team\. Your stance, printed on your place card: "who pays, and why now"/);
  for (const w of ['price', 'pass or drop-in', 'at the desk', 'deposit', 'refunds']) assert.match(st, new RegExp(w, 'i'));
});
