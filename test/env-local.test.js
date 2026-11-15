// .env.local (scripts/env-local.mjs, scripts/local.mjs): the demo machine's keys. Part of the leak test: the file can't
// be committed, and a canary value never reaches the console, runs/ or an HTTP response.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
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

test('the route line: fal, claude-code, the company-gateway fallback (all six on sonnet), and a WARN for fal with sonnet overrides', async () => {
  const { routeLine, ROUTE_VARS } = await import('../scripts/env-local.mjs');
  assert.deepEqual(ROUTE_VARS, ['TAG_MODEL', 'THREAD_MODEL', 'JOINT_MODEL', 'FIRST_MODEL', 'GUEST_MODEL', 'TIDY_MODEL']);
  const sonnet = Object.fromEntries(ROUTE_VARS.map(k => [k, 'sonnet']));
  assert.deepEqual(routeLine({ MODEL_BACKEND: 'fal', FAL_KEY: CANARY }), { line: 'route: fal', warn: null });
  assert.deepEqual(routeLine({}), { line: 'route: claude-code', warn: null });
  assert.deepEqual(routeLine({ ...sonnet }), { line: 'route: claude-code (company gateway: haiku roles → sonnet)', warn: null });
  assert.equal(routeLine({ TAG_MODEL: 'sonnet' }).line, 'route: claude-code (TAG_MODEL=sonnet)');
  const both = routeLine({ MODEL_BACKEND: 'fal', FAL_KEY: CANARY, ...sonnet });
  assert.match(both.line, /^route: fal \(TAG_MODEL=sonnet, THREAD_MODEL=sonnet/);
  assert.match(both.warn, /^WARN {2}MODEL_BACKEND=fal with TAG_MODEL, THREAD_MODEL, JOINT_MODEL, FIRST_MODEL, GUEST_MODEL, TIDY_MODEL set to sonnet/);
  assert.ok(![both.line, both.warn].join(' ').includes(CANARY), 'never a key');
});

test('.env.local carries the route (the six *_MODEL lines); the doctor prints the route on its first line, with the WARN', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-route-'));
  const file = path.join(dir, '.env.local');
  fs.writeFileSync(file, `MODEL_BACKEND=fal\nFAL_KEY=${CANARY}\nTAG_MODEL=sonnet\n# THREAD_MODEL=sonnet\n`);
  const env = {};
  loadEnvLocal(env, file);
  assert.deepEqual([env.MODEL_BACKEND, env.TAG_MODEL, env.THREAD_MODEL], ['fal', 'sonnet', undefined], 'a commented line stays off');
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(MODEL_BACKEND|FAL_KEY|[A-Z]+_MODEL|HTTPS?_PROXY|https?_proxy)$/.test(k)));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'doctor.mjs'), '--only', 'port'], { env: { ...clean, ENV_LOCAL_FILE: file }, encoding: 'utf8' });
  const lines = r.stdout.split('\n');
  assert.equal(lines[0], 'route: fal (TAG_MODEL=sonnet)');
  assert.match(lines[1], /^WARN {2}MODEL_BACKEND=fal with TAG_MODEL set to sonnet/);
  assert.ok(!(r.stdout + r.stderr).includes(CANARY), 'no key on the console');
});
