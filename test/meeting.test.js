// A focus moment as a meeting: rounds of discussion (no takeaways), then End meeting (the reading over all rounds).
// Rounds never touch the policy: five rounds are still one ask. Offline: a fake model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-meeting-'));
process.env.THREAD_WARM = '0'; process.env.TURN_GAP_MS = '0';
const { round, end, roundText } = await import('../lib/meeting.js');
const { askOne } = await import('../lib/select.js');
const { askCount, MAX_ASKS } = await import('../lib/policy.js');
const { raiseUnblock } = await import('../lib/unblock.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');
const { initTaste } = await import('../lib/taste.js');

const task = s => (String(s).match(/^# Task: ([\w-]+)/m) || [])[1];
const seen = [];
const fake = async ({ system, user, schema }) => {
  seen.push({ task: task(system), user });
  if (schema?.properties?.takeaways) return { decisions: [], takeaways: { believe: 'I believe regulars come first.', guidance: 'Their usual loaf, one tap away.' } };
  if (schema?.properties?.text) return { text: 'Then the usual loaf comes first on the page.' };
  return {};
};
const newRun = () => {
  const run = newRunId(`mt-${Math.random().toString(36).slice(2, 8)}`); initTaste(run);
  logEvent(run, 'run.start', { mode: 'craft', idea: 'An ordering website for a small bakery', seat: 'product', path: 'full' });
  const a = askOne(run, { id: 'q1', seat: 'design', by: 'Mika', question: 'What should ordering feel like?', decision: 'Ordering feel', decisionIds: [] }, { source: 'test' });
  return { run, ask: a };
};
const types = (run, t) => readEvents(run).filter(e => e.type === t);

test('two rounds of discussion, no takeaways until End meeting; End reads all her rounds once', async () => {
  const { run } = newRun();
  const r1 = await round({ run, askId: 'q1', text: 'Like the baker already knows you.', callModel: fake, wait: true });
  assert.equal(r1.code, 200);
  assert.ok(types(run, 'chime').length >= 1, 'the team replies in round 1');
  assert.equal(types(run, 'takeaways').length, 0, 'no takeaways after a round');
  assert.equal(types(run, 'answer').length, 0, 'no answer until End');
  const r2 = await round({ run, askId: 'q1', text: "And don't ask for anything you already know.", callModel: fake, wait: true });
  assert.equal(r2.body.round, 2);
  assert.equal(types(run, 'takeaways').length, 0, 'still no takeaways after round 2');
  // Round 2's thread reads the conversation so far, then her new words.
  const heard = roundText(readEvents(run).filter(e => !(e.type === 'answer.round' && e.round === 2)), 'q1', 'x');
  assert.match(heard, /She said: Like the baker already knows you\.[\s\S]*Now she says: x/);
  const e = await end({ run, askId: 'q1', callModel: fake });
  assert.equal(e.code, 200);
  assert.equal(types(run, 'takeaways').length, 1, 'takeaways at End');
  assert.equal(types(run, 'answer.mapped').length, 1);
  const ans = types(run, 'answer');
  assert.equal(ans.length, 1);
  assert.match(ans[0].text, /Like the baker already knows you\. And don't ask for anything you already know\./, 'the reading is over all her rounds');
  assert.equal((await round({ run, askId: 'q1', text: 'one more', callModel: fake })).code, 409, 'no round after End');
  assert.equal((await end({ run, askId: 'q1', callModel: fake })).code, 409, 'End once');
});

test('five rounds on one ask are still one ask: rounds never touch the policy or its safety ceiling', async () => {
  const { run } = newRun();
  for (let i = 1; i <= 5; i++) assert.equal((await round({ run, askId: 'q1', text: `Round ${i} words.`, callModel: fake, wait: true })).code, 200);
  await end({ run, askId: 'q1', callModel: fake });
  assert.equal(askCount(run), 1);
  assert.equal(types(run, 'ask.refused').length, 0);
  assert.equal(types(run, 'answer.round').length, 5);
  // The cap is untouched: two more asks are allowed, a fourth is refused.
  assert.ok(askOne(run, { id: 'q2', seat: 'data', question: 'Two?' }, { source: 'test' }));
  assert.ok(askOne(run, { id: 'q3', seat: 'data', question: 'Three?' }, { source: 'test' }));
  assert.equal(askOne(run, { id: 'q4', seat: 'data', question: 'Four?' }, { source: 'test' }), null);
  assert.equal(askCount(run), MAX_ASKS);
});

test('the quick unblock is not a meeting; an empty round is refused; End needs a round', async () => {
  const { run } = newRun();
  const u = raiseUnblock(run, { seat: 'engineering', question: 'When do orders close?', suggestion: '8pm the night before', kind: 'call' });
  assert.equal((await round({ run, askId: u.id, text: '9pm', callModel: fake })).code, 409);
  assert.equal((await round({ run, askId: 'q1', text: '  ', callModel: fake })).code, 400);
  assert.equal((await end({ run, askId: 'q1', callModel: fake })).code, 409);
  assert.equal((await round({ run, askId: 'nope', text: 'x', callModel: fake })).code, 404);
});
