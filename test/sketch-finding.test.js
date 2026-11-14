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

test('bakery: the bakery finding reaches the sketch, never the yoga one; ordering ahead in the shape counts as used', async () => {
  const run = newRun('A website for a small bakery, so customers can order bread ahead.');
  const callModel = recorder({ users: ['Morning regulars', 'Weekend crowd'], stages: ['Choose bread', 'Order ahead', 'Pick up'] });
  await firstSketch({ run, callModel, ...opts });
  assert.match(callModel.seen[0], /guess how many loaves/);
  assert.doesNotMatch(callModel.seen[0], /group fitness/);
  assert.equal(done(run).usedFinding, true);
  const { shapeUsesFinding } = await import('../lib/sketch.js');
  const { findingFor } = await import('../lib/teammates.js');
  const shows = findingFor('a bakery').shows;
  assert.ok(shapeUsesFinding({ stages: ['Place order', 'Baker sees total', 'Pick up bread'] }, shows), 'real sketch, 14 Nov');
  assert.ok(!shapeUsesFinding({ stages: ['Browse breads', 'Pick loaves', 'Pick up bread'] }, shows));
});

test('a bike shop and a tattoo studio: no finding reaches the sketch, the flag is false', async () => {
  for (const idea of ['A shop for second-hand bikes.', 'A booking site for a tattoo studio.']) {
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
