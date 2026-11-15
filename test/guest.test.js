// The guest chair: a stand-in for the sketch's main user type. Offline: a fake model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-guest-'));
const { pullUpGuest, cleanGuest, guestLines, STAND_IN } = await import('../lib/guest.js');
const { firstSketch } = await import('../lib/sketch.js');
const { decideRest, checkCitation } = await import('../lib/select.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');

const YOGA = 'A booking page for a small yoga studio.';
const newRun = () => { const run = newRunId('g'); logEvent(run, 'run.start', { mode: 'craft', idea: YOGA, seat: 'product' }); return run; };
const GUEST = { persona: 'A regular at a small yoga studio', reaction: "I book the same Tuesday class every week. Don't make me find it again.",
  points: [{ text: 'I rebook the same class every week.', confidence: 'high' }, { text: 'I hate typing my details again.', confidence: 'medium' },
    { text: 'I would pay for a pass up front.', confidence: 'low' }, { text: 'a fourth', confidence: 'high' }] };
const SHAPE = { users: ['Regulars', 'First-timers'], stages: ['Find a class', 'Pick one', 'Confirm', 'Booked'] };

test('the guest: persona from the main user type; G ids; a few, within the safety ceiling; low confidence says check with a real one', async () => {
  const run = newRun();
  let seen;
  const g = await pullUpGuest({ run, idea: YOGA, ...SHAPE, callModel: async a => { seen = a; return GUEST; } });
  assert.match(seen.system, /You are: Regulars/);
  assert.deepEqual(g.points.map(p => p.id), ['G1', 'G2', 'G3']);
  assert.equal(g.points[2].check, 'check with a real regular');
  assert.ok(!g.points[0].check);
  assert.equal(g.label, STAND_IN);
  const evs = readEvents(run);
  assert.deepEqual(evs.map(e => e.type), ['run.start', 'guest'], 'a guest event and nothing else: never an ask');
});

test('a guest that fails logs guest.error and changes nothing else', async () => {
  const run = newRun();
  assert.equal(await pullUpGuest({ run, idea: YOGA, ...SHAPE, callModel: async () => { throw new Error('x'); } }), null);
  assert.deepEqual(readEvents(run).map(e => e.type), ['run.start', 'guest.error']);
  assert.throws(() => cleanGuest({ persona: 'x', reaction: '', points: [] }, 'Regulars'));
});

test('off by default (optional, only if time): no guest call, no guest event', async () => {
  const run = newRun();
  let calls = 0;
  await firstSketch({ run, callModel: async () => { calls++; return SHAPE; }, dripMs: 0 });
  assert.equal(calls, 1);
  assert.ok(!readEvents(run).some(e => /^guest/.test(e.type)));
});

test('with the flag, the first sketch pulls up the guest after it lands', async () => {
  const run = newRun();
  const model = async ({ system }) => (/guest/.test(system) ? GUEST : SHAPE);
  await firstSketch({ run, callModel: model, dripMs: 0, withGuest: true });
  const types = readEvents(run).map(e => e.type);
  assert.ok(types.indexOf('guest') > types.indexOf('sketch.done'), types.join(' '));
  assert.ok(!types.includes('ask'));
});

test('decideRest may cite a logged G point; a G citation to a missing point falls back to team default', async () => {
  const run = newRun();
  await pullUpGuest({ run, idea: YOGA, ...SHAPE, callModel: async () => GUEST });
  assert.equal(guestLines(readEvents(run)).length, 3);
  const cands = [1, 2, 3].map(i => ({ id: `c${i}`, seat: 'design', decision: `D${i}`, options: ['A', 'B'], recommendation: 'A', reason: '', cost: 'low', undoable: true, attachTo: null }));
  let system;
  const fake = async a => { system = a.system; return { decisions: [
    { id: 'c1', choice: 'B', cites: 'G1', alsoCites: [] },
    { id: 'c2', choice: 'B', cites: 'G7', alsoCites: [] },
    { id: 'c3', choice: 'A', cites: 'G2', alsoCites: ['L1'] }] }; };
  const out = await decideRest(cands, [{ id: 'L1', text: 'Her line' }], { run, idea: YOGA, callModel: fake });
  assert.match(system, /\[G1\] Guest/);
  assert.match(system, /not a real one/);
  assert.equal(out.find(d => d.id === 'c1').cites, 'G1');
  assert.equal(out.find(d => d.id === 'c2').cites, 'team default');
  assert.equal(out.find(d => d.id === 'c3').cites, 'L1', 'her own line wins over the guest');
  assert.ok(readEvents(run).some(e => e.type === 'cite.rejected' && e.cited === 'G7'));
  // Without a logged guest, a G citation is rejected.
  assert.equal(checkCitation('G1', [{ id: 'L1', text: 'x' }]).cites, 'team default');
});
