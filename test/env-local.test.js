// .env.local (scripts/env-local.mjs, scripts/local.mjs): the demo machine's keys. Part of the leak test: the file can't
// be committed, and a canary value never reaches the console, runs/ or an HTTP response.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { parseEnv, loadEnvLocal, describe, ROOT } from '../scripts/env-local.mjs';

const CANARY = 'canary-ENVLOCAL-7c1e5a9d3f20b864';

test('parseEnv: KEY=value, # comments and blank lines skipped, quotes stripped, export allowed', () => {
  const v = parseEnv(`# keys\n\nFAL_KEY=abc:def\nexport ELEVENLABS_API_KEY="sk 1"\nLINKUP_API_KEY='x#y'\nADMIN_TOKEN=tok # a comment\nnot a line\n`);
  assert.deepEqual(v, { FAL_KEY: 'abc:def', ELEVENLABS_API_KEY: 'sk 1', LINKUP_API_KEY: 'x#y', ADMIN_TOKEN: 'tok' });
});

test('loadEnvLocal sets only the known keys, only when not already set; describe names them, never values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-env-'));
  const file = path.join(dir, '.env.local');
  fs.writeFileSync(file, `FAL_KEY=${CANARY}\nELEVENLABS_API_KEY=${CANARY}\nLINKUP_API_KEY=${CANARY}\nOTHER=${CANARY}\nMODEL_BACKEND=fal\n`);
  const env = { LINKUP_API_KEY: 'already' };
  const r = loadEnvLocal(env, file);
  assert.deepEqual(r.loaded, ['FAL_KEY', 'ELEVENLABS_API_KEY', 'MODEL_BACKEND']);
  assert.deepEqual(r.kept, ['LINKUP_API_KEY']);
  assert.equal(env.LINKUP_API_KEY, 'already');
  assert.equal(env.OTHER, undefined);
  const msg = describe(r);
  assert.match(msg, /loaded 3 keys from \.env\.local/);
  assert.ok(!msg.includes(CANARY));
  assert.deepEqual(loadEnvLocal({}, path.join(dir, 'missing')).found, false);
});

test('.env.local is git-ignored, and none is tracked', () => {
  const ignored = execFileSync('git', ['check-ignore', '.env.local'], { cwd: ROOT, encoding: 'utf8' }).trim();
  assert.equal(ignored, '.env.local');
  const tracked = execFileSync('git', ['ls-files', '.env.local', '.env', '**/.env.local'], { cwd: ROOT, encoding: 'utf8' }).trim();
  assert.equal(tracked, '');
});

test('npm run local: a canary in .env.local never reaches the console, runs/ or an HTTP response', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-local-'));
  const file = path.join(dir, '.env.local'), runs = path.join(dir, 'runs');
  fs.mkdirSync(runs);
  fs.writeFileSync(file, `FAL_KEY=${CANARY}\nELEVENLABS_API_KEY=${CANARY}x\nLINKUP_API_KEY=${CANARY}y\nADMIN_TOKEN=${CANARY}z\n`);
  const port = 4250 + Math.floor(Math.random() * 40);
  const env = { ...process.env, ENV_LOCAL_FILE: file, PORT: String(port), RUNS_DIR: runs, THREAD_WARM: '0', JOINT_OFF: '1' };
  for (const k of ['FAL_KEY', 'ELEVENLABS_API_KEY', 'LINKUP_API_KEY', 'ADMIN_TOKEN', 'MODEL_BACKEND']) delete env[k];
  const p = spawn(process.execPath, [path.join(ROOT, 'scripts', 'local.mjs')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  p.stdout.on('data', d => (out += d)); p.stderr.on('data', d => (out += d));
  try {
    const t0 = Date.now();
    while (!/room on http/.test(out) && Date.now() - t0 < 15000) await new Promise(r => setTimeout(r, 100));
    assert.match(out, /room on http/, 'the server starts');
    assert.match(out, /loaded 4 keys from \.env\.local/);
    const bodies = [];
    for (const u of ['/', '/api/health', '/api/run']) {
      const r = await fetch(`http://127.0.0.1:${port}${u}`, u === '/api/run' ? { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } } : {});
      bodies.push(await r.text());
    }
    assert.ok(JSON.parse(bodies[1]).falKey === true, 'the key reached the server');
    for (const b of bodies) assert.ok(!b.includes(CANARY), 'no canary in an HTTP response');
  } finally { p.kill('SIGTERM'); await new Promise(r => p.on('exit', r)); }
  assert.ok(!out.includes(CANARY), 'no canary on the console');
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk(runs)) assert.ok(!fs.readFileSync(f, 'utf8').includes(CANARY), `no canary in ${f}`);
});
