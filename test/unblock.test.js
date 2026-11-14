// Quick unblocks go through the ask policy: they count toward her three, are refused once the cap is spent (then
// decided on the team's suggestion), only her facts and calls qualify, and only lib/unblock.js can raise one. Offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-unblock-'));
const { raiseUnblock, answerUnblock } = await import('../lib/unblock.js'); // claims the unblocker as it loads
const { askUnblock, claimUnblocker, askCount, MAX_ASKS } = await import('../lib/policy.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');
const uid = () => `u-${Math.random().toString(36).slice(2, 10)}`;
const BO = { seat: 'engineering', question: 'When do orders close?', suggestion: '8pm the night before', kind: 'call' };

test('Bo raises an unblock: it is an ask (counted), with the team suggestion, and the seat raised it', () => {
  const run = newRunId(uid());
  const a = raiseUnblock(run, BO);
  assert.ok(a && a.unblock && a.type === 'ask');
  assert.deepEqual([a.seat, a.by, a.suggestion, a.kind], ['engineering', 'Bo', '8pm the night before', 'call']);
  assert.equal(askCount(run), 1, 'counts toward her three');
  const evs = readEvents(run);
  assert.ok(evs.some(e => e.type === 'ask.unblock' && e.id === a.id), 'the seat\'s raise is logged');
});

test('"Yes" takes the suggestion; it lands as a decided item owned by the seat, and the seat carries on', () => {
  const run = newRunId(uid());
  const a = raiseUnblock(run, BO);
  const [code, body] = answerUnblock(run, { askId: a.id, yes: true });
  assert.equal(code, 200);
  assert.deepEqual([body.decided.seat, body.decided.choice, body.decided.cites, body.decided.unblock], ['engineering', '8pm the night before', 'her yes', true]);
  const evs = readEvents(run);
  assert.ok(evs.some(e => e.type === 'answer' && e.askId === a.id && e.took === 'suggestion'));
  assert.ok(evs.some(e => e.type === 'chatter' && e.seat === 'engineering' && /carrying on/i.test(e.text)));
  assert.equal(answerUnblock(run, { askId: a.id, yes: true })[0], 409, 'answered once');
});

test('her own words replace the suggestion; empty is refused', () => {
  const run = newRunId(uid());
  const a = raiseUnblock(run, BO);
  assert.equal(answerUnblock(run, { askId: a.id, text: '   ' })[0], 400);
  const [code, body] = answerUnblock(run, { askId: a.id, text: '7pm, so the starter can rise' });
  assert.equal(code, 200);
  assert.equal(body.decided.choice, '7pm, so the starter can rise');
  assert.equal(body.decided.cites, 'her words');
  assert.equal(answerUnblock(run, { askId: 'nope', yes: true })[0], 404);
});

test('the cap holds: with three asks spent, an unblock is refused and decided on the suggestion', () => {
  const run = newRunId(uid());
  for (let i = 0; i < MAX_ASKS; i++) logEvent(run, 'ask', { id: `c${i}`, seat: 'design', decision: 'x' });
  assert.equal(raiseUnblock(run, BO), null);
  const evs = readEvents(run);
  assert.equal(askCount(run), MAX_ASKS, 'no fourth ask');
  assert.ok(evs.some(e => e.type === 'ask.refused' && /cap of 3/.test(e.reason)));
  const d = evs.find(e => e.type === 'decided' && e.unblock);
  assert.deepEqual([d.choice, d.cites, d.refused], ['8pm the night before', 'team suggestion', true]);
});

test('only her facts and calls; only lib/unblock.js holds the door; a look-alike grant is refused', () => {
  const run = newRunId(uid());
  assert.throws(() => raiseUnblock(run, { ...BO, kind: 'preference' }), /facts and calls/);
  assert.throws(() => raiseUnblock(run, { ...BO, seat: 'product' }), /unknown seat/);
  assert.throws(() => claimUnblocker(), /belongs to lib\/unblock/);
  const u = { id: 'u-x', ...BO };
  assert.equal(askUnblock(run, u, Object.freeze({ run, id: 'u-x' })), null, 'forged grant');
  assert.equal(askCount(run), 0);
  assert.ok(readEvents(run).some(e => e.type === 'ask.refused' && /not from the unblock door/.test(e.reason)));
});
