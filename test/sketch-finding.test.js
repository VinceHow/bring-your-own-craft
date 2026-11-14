// Research's finding feeds Design's first sketch only when it fits the idea, and sketch.done says whether it was used,
// so "proposed by Noor and Mika" is only ever true. Offline: a fake model that records the prompt it got.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-sketchf-'));
const { firstSketch, sketchForIdea } = await import('../lib/sketch.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');

const newRun = idea => { const run = newRunId(`f-${Math.random().toString(36).slice(2, 8)}`); logEvent(run, 'run.start', { mode: 'craft', idea, seat: 'product' }); return run; };
const recorder = shape => { const seen = []; const fn = async ({ system }) => { seen.push(system); return shape; }; fn.seen = seen; return fn; };
const WITH = { users: ['Regulars', 'First-timers'], stages: ['Find a class', 'Book it', 'Booked', 'Class full → Waitlist'] };
const WITHOUT = { users: ['Regulars', 'First-timers'], stages: ['Find a class', 'Book it', 'Booked'] };
const opts = { dripMs: 0, withGuest: false };
const done = run => readEvents(run).find(e => e.type === 'sketch.done');

test('yoga: the finding goes into the sketch prompt; a shape that shows it is flagged used, by Noor and Mika', async () => {
  const run = newRun('A booking page for a small yoga studio.');
  const callModel = recorder(WITH);
  await firstSketch({ run, callModel, ...opts });
  assert.match(callModel.seen[0], /Noor \(Research\) found/);
  assert.match(callModel.seen[0], /waitlist on full group fitness classes/);
  assert.equal(done(run).usedFinding, true);
  assert.deepEqual(done(run).by, ['research', 'design']);
  assert.ok(!JSON.stringify(readEvents(run)).includes('activemonash') || done(run).finding.url, 'the source travels only as the finding');
});

test('yoga: given the finding but the shape ignores it, the flag stays false', async () => {
  const run = newRun('A booking page for a small yoga studio.');
  await firstSketch({ run, callModel: recorder(WITHOUT), ...opts });
  assert.equal(done(run).usedFinding, false);
  assert.equal(done(run).by, undefined);
});

test('café and tattoo studio: the finding never reaches the sketch, the flag is false', async () => {
  for (const idea of ["A pre-order page for a café's morning pastries.", 'A booking site for a tattoo studio.']) {
    const run = newRun(idea);
    const callModel = recorder(WITH); // even a shape that mentions "full" isn't Noor's work here
    await firstSketch({ run, callModel, ...opts });
    assert.doesNotMatch(callModel.seen[0], /Noor|Research/, idea);
    assert.equal(done(run).usedFinding, false, idea);
  }
});

test('the close\'s sketch carries the same flag', async () => {
  const a = await sketchForIdea('Sign-ups for a pilates class.', { callModel: recorder(WITH) });
  const b = await sketchForIdea('A booking site for a tattoo studio.', { callModel: recorder(WITH) });
  assert.equal(a.body.usedFinding, true);
  assert.equal(b.body.usedFinding, false);
});
