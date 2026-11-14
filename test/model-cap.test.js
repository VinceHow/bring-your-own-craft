// The team's first round on a laptop: MODEL_CONCURRENCY caps how many `claude` processes run at once (off by default),
// and a round where every teammate fails says so in the run log (propose.error), not a quiet empty round.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BIN = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-claude-cap-'));
const LOG = path.join(BIN, 'spans.log');
fs.writeFileSync(path.join(BIN, 'claude'), `#!/usr/bin/env node
const fs = require('fs');
const a = process.argv.slice(2);
const start = Date.now();
setTimeout(() => {
  fs.appendFileSync(${JSON.stringify(LOG)}, JSON.stringify([start, Date.now()]) + '\\n');
  if (a[a.indexOf('-p') + 1].startsWith('List the decisions')) { console.error('Error: overloaded'); process.exit(3); }
  console.log(JSON.stringify({ is_error: false, result: '{"ok":"ok"}' }));
}, 250);
`, { mode: 0o755 });
process.env.PATH = `${BIN}:${process.env.PATH}`;
process.env.MODEL_BACKEND = 'claude-code';
process.env.MODEL_CONCURRENCY = '2';
process.env.MODEL_QUIET = '1';
process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-cap-'));
const M = await import('../lib/model.js');

test('MODEL_CONCURRENCY=2: six calls at once never run more than two claude processes together', async () => {
  fs.writeFileSync(LOG, '');
  const schema = { type: 'object', properties: { ok: { type: 'string' } }, required: ['ok'] };
  await Promise.all(Array.from({ length: 6 }, () => M.callModel({ system: 's', user: 'Say ok.', schema, timeoutMs: 20000 })));
  const spans = fs.readFileSync(LOG, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  assert.equal(spans.length, 6);
  const most = Math.max(...spans.map(([s]) => spans.filter(([a, b]) => a <= s && s < b).length));
  assert.ok(most <= 2, `at most 2 at once, saw ${most}`);
});

test('every teammate fails: the run log says so (propose.error), with the first reason', async () => {
  const { propose } = await import('../lib/teammates.js');
  const { logEvent, readEvents, newRunId } = await import('../lib/events.js');
  const { initTaste } = await import('../lib/taste.js');
  const run = newRunId('cap');
  initTaste(run);
  logEvent(run, 'run.start', { idea: 'A bakery site.', seat: 'product' });
  const out = await propose({ run, idea: 'A bakery site.', flow: { nodes: [], edges: [] }, taste: [] });
  assert.equal(out.candidates.length, 0);
  const evs = readEvents(run);
  assert.equal(evs.filter(e => e.type === 'teammate.error').length, 6);
  const pe = evs.find(e => e.type === 'propose.error');
  assert.ok(pe, 'a visible error in the run log');
  assert.match(pe.error, /^every teammate failed: exit code 3 after \d+ ms: Error: overloaded/);
});
