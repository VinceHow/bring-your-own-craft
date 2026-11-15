// Meet the team, tailored to her idea (lib/meet.js): one call, a flat schema, the chimes' rules, a hard limit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meetLines, meetLine, MEET_SCHEMA, MEET_SEATS } from '../lib/meet.js';

process.env.MODEL_QUIET = '1';
test('one call for all five, a flat schema, her idea in the message', async () => {
  let calls = 0, seen;
  const r = await meetLines('A booking page for my yoga studio', { callModel: async a => { calls++; seen = a; return {
    design: "I'll sketch the booking page, calm and quick.", research: "I'll find out who books yoga every week.", data: "I'll count repeat bookings a month.",
    strategy: "I'll work out who pays, and when.", engineering: "I'm building the page, boring and correct." }; } });
  assert.equal(calls, 1);
  for (const v of Object.values(MEET_SCHEMA.properties)) assert.equal(v.type, 'string', 'flat');
  assert.match(seen.user, /yoga studio/);
  assert.deepEqual(Object.keys(r.body.lines), MEET_SEATS);
  assert.equal(r.body.lines.research, "I'll find out who books yoga every week.");
});
test('lines that break the rules are dropped (the client keeps that seat static): questions, "you", too long, service text', () => {
  assert.equal(meetLine('Who books yoga every week?'), null);
  assert.equal(meetLine("I'll make sure your page loads fast."), null);
  assert.equal(meetLine("I'll " + 'really '.repeat(20) + 'build it.'), null);
  assert.equal(meetLine('You have hit your usage limit'), null);
  assert.equal(meetLine('Wren: I’ll find the regulars'), 'I’ll find the regulars.');
});
test('slow or failing: static, never waits past the limit, never throws', async () => {
  const t0 = Date.now();
  const r = await meetLines('A bakery page', { limitMs: 200, callModel: () => new Promise(() => {}) });
  assert.ok(Date.now() - t0 < 1000);
  assert.deepEqual(r.body, { ...r.body, lines: {}, static: true });
  const f = await meetLines('A bakery page', { callModel: async () => { throw new Error('model timeout'); } });
  assert.equal(f.body.static, true);
  assert.equal((await meetLines('')).code, 400);
});
