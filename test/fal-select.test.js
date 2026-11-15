// The fal backend's select reply (recorded 15 Nov, OpenRouter structured output): every score carries changes 0, a
// field the select prompt never asks for. Through the real callModel on MODEL_BACKEND=fal (a fake fetch replays the
// reply), the selector still brings 1 to 3 questions, as it does on claude-code. The cap is lib/policy.js's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-falsel-'));
process.env.MODEL_BACKEND = 'fal';
process.env.MODEL_QUIET = '1';
const REC = JSON.parse(fs.readFileSync(new URL('./fixtures/fal-select-reply.json', import.meta.url), 'utf8'));
const M = await import('../lib/model.js');
const { scoreCandidates, pickAsks } = await import('../lib/select.js');
const { MAX_ASKS } = await import('../lib/policy.js');

test('fal: a recorded select reply (changes 0 on every score) still brings 1 to 3 questions', async () => {
  assert.ok(JSON.parse(REC.reply.choices[0].message.content.match(/\{[\s\S]*\}/)[0]).scores.every(s => s.changes === 0), 'the recording is the failing shape');
  M.setFalKey('test-key-not-real');
  const orig = globalThis.fetch;
  let body;
  globalThis.fetch = async (url, opts) => { body = JSON.parse(opts.body); return new Response(JSON.stringify(REC.reply), { status: 200 }); };
  let scores;
  try {
    scores = await scoreCandidates({ run: null, idea: REC.idea, flow: { nodes: [], edges: [] }, taste: [], candidates: REC.candidates, callModel: M.callModel });
  } finally { globalThis.fetch = orig; M.setFalKey(null); }
  assert.equal(body.response_format?.type, 'json_schema', 'the schema went as structured output');
  assert.equal(scores.size, REC.candidates.length);
  const { picks } = pickAsks(REC.candidates, scores, { flow: { nodes: [], edges: [] } });
  assert.ok(picks.length >= 1 && picks.length <= MAX_ASKS, `1 to ${MAX_ASKS} questions, got ${picks.length}`);
  assert.ok(picks.every(p => p.question && p.score.big >= 2 && p.score.hers >= 2));
});

test('a scorer that leaves changes out (claude-code) reads exactly as before: changes is big', async () => {
  const cands = [{ id: 'c1', seat: 'design', decision: 'Who the page is for', options: ['A', 'B'] }];
  const call = async () => ({ scores: [{ id: 'c1', big: 3, hers: 3, silent: 2, dupOf: null, domain: null, question: 'Who comes back every week?' }] });
  const s = (await scoreCandidates({ run: null, idea: 'x', flow: { nodes: [], edges: [] }, taste: [], candidates: cands, callModel: call })).get('c1');
  assert.deepEqual([s.changes, s.big], [3, 3]);
});
