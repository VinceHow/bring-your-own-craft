// The claude-code backend on an older Claude Code (Vincent's Mac, 14 Nov): a fake `claude` on PATH that doesn't know
// --effort or --json-schema, and is slow. The name tag must still come back made (not the rough fallback), the flags
// are dropped once and remembered, and the Terminal says why each time something fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BIN = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-claude-'));
const LOG = path.join(BIN, 'calls.log');
fs.writeFileSync(path.join(BIN, 'claude'), `#!/usr/bin/env node
const fs = require('fs');
const a = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(LOG)}, JSON.stringify(a) + '\\n');
if (a[0] === '--version') { console.log('1.0.0 (Claude Code)'); process.exit(0); }
if (a[a.indexOf('-p') + 1] === 'leak') { console.error('boom: upstream said Key sk-secret-123456789 is not allowed'); process.exit(2); }
for (const f of ['--effort', '--json-schema']) if (a.includes(f)) { console.error("error: unknown option '" + f + "'"); process.exit(1); }
const sys = a[a.indexOf('--system-prompt') + 1] || '';
const wantsJson = /Reply with one JSON object only/.test(sys);
setTimeout(() => {
  const tag = { ok: 'ok', craft: 'Baker', title: 'the dawn shaper', traits: ['patient'], superpower: 'reads dough', goodAt: 'sourdough', loves: 'the 7am queue' };
  console.log(JSON.stringify({ is_error: false, result: wantsJson ? JSON.stringify(tag) : 'Sure! Here is your card.' }));
}, Number(process.env.FAKE_SLEEP_MS || 300));
`, { mode: 0o755 });
process.env.PATH = `${BIN}:${process.env.PATH}`;
process.env.MODEL_BACKEND = 'claude-code';
const M = await import('../lib/model.js');
const { nameTag } = await import('../lib/tag.js');

function captureStderr() {
  const lines = [], orig = console.error;
  console.error = (...a) => lines.push(a.join(' '));
  return { lines, restore: () => { console.error = orig; } };
}

test('an older Claude Code without --effort and --json-schema: the tag is still made; the flags dropped once, said why', async () => {
  const cap = captureStderr();
  let r;
  try { r = await nameTag('I bake sourdough for my village and I love the 7am queue', { limitMs: 10000 }); } finally { cap.restore(); }
  assert.equal(r.body.rough, undefined, `not the rough card: ${r.body.error}`);
  assert.equal(r.body.craft, 'Baker');
  assert.deepEqual([...M.droppedFlags].sort(), ['--effort', '--json-schema']);
  assert.ok(cap.lines.some(l => /\[model\] this Claude Code doesn't know --effort/.test(l)), cap.lines.join('\n'));
  assert.ok(cap.lines.some(l => /npm i -g @anthropic-ai\/claude-code/.test(l)));
  // the next call goes straight through without them: one spawn, and the prompt asks for JSON only
  fs.writeFileSync(LOG, '');
  const cap2 = captureStderr();
  try { r = await nameTag('I fix bikes and I love a quiet workshop', { limitMs: 10000 }); } finally { cap2.restore(); }
  assert.equal(r.body.rough, undefined);
  const calls = fs.readFileSync(LOG, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  assert.equal(calls.length, 1, 'one call, no retries');
  assert.ok(!calls[0].includes('--effort') && !calls[0].includes('--json-schema') && calls[0].includes('--model'));
  assert.deepEqual(cap2.lines, [], 'nothing to say when it works');
});

test('too slow for the tag\'s limit: the rough card, and the Terminal says why (no key, one line)', async () => {
  process.env.FAKE_SLEEP_MS = '2000';
  const cap = captureStderr();
  let r;
  try { r = await nameTag('I bake sourdough', { limitMs: 500 }); } finally { cap.restore(); delete process.env.FAKE_SLEEP_MS; }
  assert.equal(r.body.rough, true);
  assert.ok(cap.lines.some(l => /^\[model\] name tag \(rough card shown\) failed: over 0\.5 s$/.test(l)), cap.lines.join('\n'));
});

test('a model call that fails prints [model] <label> failed: <reason>, scrubbed', async () => {
  M.setFalKey('sk-secret-123456789');
  const cap = captureStderr();
  try {
    await assert.rejects(M.callModel({ system: 's', user: 'leak', schema: { type: 'object', properties: { x: { type: 'number' } }, required: ['x'] },
      label: 'tidy', timeoutMs: 5000 }));
  } finally { cap.restore(); M.setFalKey(null); }
  assert.ok(cap.lines.some(l => l.startsWith('[model] tidy failed: ')), cap.lines.join('\n'));
  assert.ok(cap.lines.some(l => /exit code 2 after \d+ ms: boom/.test(l)), 'exit code and the first stderr line');
  assert.ok(cap.lines.every(l => !l.includes('sk-secret-123456789')));
});

test('warm-up: prints the CLI version and makes one call in the room\'s shape', async () => {
  const out = [], orig = console.log;
  console.log = (...a) => out.push(a.join(' '));
  try { assert.equal(await M.warmUp(), '1.0.0 (Claude Code)'); } finally { console.log = orig; }
  assert.ok(out.some(l => /\[model\] claude-code backend: 1\.0\.0 \(Claude Code\)/.test(l)), out.join('\n'));
  assert.ok(out.some(l => /\[model\] warm: first call answered in [\d.]+ s \(without --effort, --json-schema\)/.test(l)), out.join('\n'));
});
