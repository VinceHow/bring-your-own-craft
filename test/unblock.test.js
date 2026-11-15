// Quick unblocks go through the ask policy: each is an ask, anything refused is decided on the team's suggestion,
// only her facts and calls qualify, and only lib/unblock.js can raise one. Offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-unblock-'));
const { select } = await import('../lib/select.js'); // claims the selector's grantor as it loads
const { raiseUnblock, answerUnblock } = await import('../lib/unblock.js'); // claims the unblocker as it loads
const { askUnblock, claimUnblocker, askCount } = await import('../lib/policy.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');
const uid = () => `u-${Math.random().toString(36).slice(2, 10)}`;
const BO = { seat: 'engineering', question: 'When do orders close?', suggestion: '8pm the night before', kind: 'call' };

test('Bo raises an unblock: it is an ask (counted), with the team suggestion, and the seat raised it', () => {
  const run = newRunId(uid());
  const a = raiseUnblock(run, BO);
  assert.ok(a && a.unblock && a.type === 'ask');
  assert.deepEqual([a.seat, a.by, a.suggestion, a.kind], ['engineering', 'Bo', '8pm the night before', 'call']);
  assert.equal(askCount(run), 1, 'it is an ask');
  const evs = readEvents(run);
  assert.ok(evs.some(e => e.type === 'ask.unblock' && e.id === a.id), 'the seat\'s raise is logged');
  assert.ok(evs.some(e => e.type === 'owner.action' && e.id === a.id && e.suggestion === '8pm the night before'), 'the studio\'s owner.action event');
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

test('a topic makes the team-space headline from her choice ("Orders close 8pm the night before")', () => {
  const run = newRunId(uid());
  const a = raiseUnblock(run, { ...BO, topic: 'Orders close', doing: 'Setting up ordering' });
  assert.equal(a.doing, 'Setting up ordering');
  const [, body] = answerUnblock(run, { askId: a.id, yes: true });
  assert.equal(body.decided.headline, 'Orders close 8pm the night before');
});

// The mixed case (the lead's condition): two asks through the selector's own door plus one unblock spend her three;
// after that a further unblock AND a further selector ask are both refused, and the log never holds a fourth ask.
