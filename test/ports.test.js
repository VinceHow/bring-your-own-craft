// Another app on 3000 (Vincent's Mac): doctor says NOTE, npm run local takes the next free port, and Stop BYOC.command
// stops only our server, never the other app. Offline: no model calls (doctor runs its port check only).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ROOT, PID_FILE, PORT_FILE, pickPort, portFree } from '../scripts/env-local.mjs';

const listen = port => new Promise((ok, no) => { const s = net.createServer(c => c.end()); s.once('error', no); s.listen(port, () => ok(s)); });
const cleanEnv = () => { const e = { ...process.env, THREAD_WARM: '0', JOINT_OFF: '1', ENV_LOCAL_FILE: path.join(os.tmpdir(), 'no-such-env-local') }; delete e.PORT; return e; };
// Our state files live in the repo root (that's where the Stop script looks); never clobber a real running room.
const busy = fs.existsSync(PID_FILE);

test('pickPort skips a port another app holds; portFree sees it', async () => {
  const base = 3000 + 0;
  let dummy = null;
  if (await portFree(base)) dummy = await listen(base);
  try {
    assert.equal(await portFree(base), false);
    const p = await pickPort(base, base + 10);
    assert.ok(p > base && p <= base + 10, `picked ${p}`);
  } finally { dummy && dummy.close(); }
});

test('doctor: port 3000 busy is a NOTE ("we\'ll use 3001"), never a FAIL', async () => {
  let dummy = null;
  if (await portFree(3000)) dummy = await listen(3000);
  try {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'doctor.mjs'), '--only', 'port'], { env: cleanEnv(), encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /NOTE {2}port 3000 is busy \(another app\), so we'll use 30\d\d/);
    assert.doesNotMatch(r.stdout, /FAIL/);
  } finally { dummy && dummy.close(); }
});

test('npm run local starts on the next free port, writes the port file, prints the URL; Stop leaves the other app alone', { skip: busy && 'a room is running from this folder' }, async () => {
  let dummy = null;
  if (await portFree(3000)) dummy = await listen(3000);
  const expected = await pickPort();
  const runs = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-ports-'));
  const p = spawn(process.execPath, [path.join(ROOT, 'scripts', 'local.mjs')], { env: { ...cleanEnv(), RUNS_DIR: runs }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  p.stdout.on('data', d => (out += d)); p.stderr.on('data', d => (out += d));
  try {
    const t0 = Date.now();
    while (!/Open {2}http:\/\/localhost:\d+\//.test(out) && Date.now() - t0 < 20000) await new Promise(r => setTimeout(r, 100));
    assert.match(out, new RegExp(`Open  http://localhost:${expected}/`), out);
    assert.match(out, /port 3000 is busy \(another app\), so we use/);
    assert.equal(fs.readFileSync(PORT_FILE, 'utf8').trim(), String(expected));
    assert.equal(fs.readFileSync(PID_FILE, 'utf8').trim(), String(p.pid));
    assert.equal((await fetch(`http://localhost:${expected}/api/health`)).status, 200);
    // Stop BYOC.command: our server goes, the other app on 3000 stays.
    if (spawnSync('bash', ['-c', 'command -v ps'], { encoding: 'utf8' }).status === 0) {
      const s = spawnSync('bash', [path.join(ROOT, 'Stop BYOC.command')], { input: '', encoding: 'utf8', timeout: 20000 });
      assert.match(s.stdout, /Stopped the room/, s.stdout + s.stderr);
      await new Promise(r => p.exitCode !== null ? r() : p.on('exit', r));
      assert.equal(await portFree(expected), true, 'our port is free again');
      assert.equal(await portFree(3000), false, 'the other app on 3000 is untouched');
      assert.ok(!fs.existsSync(PID_FILE) && !fs.existsSync(PORT_FILE), 'state files removed');
    }
  } finally {
    if (p.exitCode === null) { p.kill('SIGTERM'); await new Promise(r => p.on('exit', r)); }
    dummy && dummy.close();
  }
});
