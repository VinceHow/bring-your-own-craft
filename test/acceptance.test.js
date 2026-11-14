// Proves the bakery acceptance suite (deploy/acceptance/bakery.acceptance.js) runs, and has teeth: it passes against a
// throwaway stub that keeps the contract (deploy/ACCEPTANCE.md), and fails against stubs that break one rule each.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SUITE = path.join(ROOT, 'deploy/acceptance/bakery.acceptance.js');
const STUB = path.join(ROOT, 'test/fixtures/bakery-stub.mjs');
const TOKEN = 'test-admin-token-1234';
// A child `node --test` inherits NODE_TEST_CONTEXT from this runner and would report to it instead of running on its own.
const cleanEnv = extra => { const e = { ...process.env, ...extra }; delete e.NODE_TEST_CONTEXT; return e; };

// Start a stub (its output captured to a log file, as the app's would be), run fn(base, logFile), stop it.
async function withStub(flaw, fn, { token = TOKEN } = {}) {
  const logFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bakery-')), 'app.log');
  const p = spawn(process.execPath, [STUB], { env: cleanEnv({ PORT: '0', STUB_FLAW: flaw, ADMIN_TOKEN: token }) });
  let out = '';
  const capture = d => { out += d; fs.appendFileSync(logFile, d); };
  p.stdout.on('data', capture); p.stderr.on('data', capture);
  const port = await new Promise((ok, no) => {
    const t = setInterval(() => { const m = out.match(/on (\d+)/); if (m) { clearInterval(t); ok(Number(m[1])); } }, 20);
    p.on('exit', c => { clearInterval(t); no(new Error('stub exited ' + c)); });
    setTimeout(() => { clearInterval(t); no(new Error('stub did not start')); }, 5000);
  });
  try { return await fn(`http://127.0.0.1:${port}`, logFile); } finally { p.kill(); }
}
// Run the suite as its own process (async, so the stub in this process keeps serving).
function runSuite(base, { token = TOKEN, log } = {}) {
  return new Promise(resolve => {
    const c = spawn(process.execPath, ['--test', '--test-reporter=tap', SUITE], { env: cleanEnv({ BASE_URL: base, ADMIN_TOKEN: token, APP_LOG: log || '' }) });
    let out = '';
    c.stdout.on('data', d => (out += d)); c.stderr.on('data', d => (out += d));
    const kill = setTimeout(() => c.kill(), 90000);
    c.on('close', code => {
      clearTimeout(kill);
      const failed = [...out.matchAll(/^not ok \d+ - ([^:\s]+)/gm)].map(m => m[1].replace(/\.$/, ''));
      resolve({ code, failed, out });
    });
  });
}

test('the acceptance suite passes against a stub that keeps the contract (all 12, logs included)', async () => {
  await withStub('', async (base, log) => {
    const r = await runSuite(base, { log });
    assert.equal(r.code, 0, r.out.slice(-4000));
    assert.match(r.out, /# pass 12/);
    assert.match(r.out, /# skipped 0/);
  });
});

for (const [flaw, test_] of [['field', '2'], ['twice', '3'], ['nodrop', '3'], ['soldout', '4'], ['race', '5'], ['nosse', '6'], ['restock', '7'],
  ['hold', '9'], ['clock', '9'], ['reset', '10'], ['ratelimit', '+'], ['logname', '11']]) {
  test(`the suite catches a broken bakery: "${flaw}" fails test ${test_}`, async () => {
    await withStub(flaw, async (base, log) => {
      const r = await runSuite(base, { log });
      assert.notEqual(r.code, 0, `the ${flaw} flaw went unnoticed`);
      assert.ok(r.failed.includes(test_), `test ${test_} should fail; failed: ${r.failed.join(', ')}\n${r.out.slice(-2500)}`);
    });
  });
}

test('with no ADMIN_TOKEN anywhere, only "admin locked" runs, and passes; the rest skip, saying why', async () => {
  await withStub('', async base => {
    const r = await runSuite(base, { token: '' });
    assert.equal(r.code, 0, r.out.slice(-3000));
    assert.match(r.out, /# pass 1\b/);
    assert.match(r.out, /# skipped 11/);
  }, { token: '' });
});

test('the suite catches an admin left open when no token is set (fail-open)', async () => {
  await withStub('adminopen', async base => {
    const r = await runSuite(base, { token: '' });
    assert.notEqual(r.code, 0);
    assert.ok(r.failed.includes('8'), `failed: ${r.failed.join(', ')}`);
  }, { token: '' });
});

test('without BASE_URL the suite refuses to run, instead of passing by accident', async () => {
  const c = spawn(process.execPath, ['--test', SUITE], { env: (() => { const e = cleanEnv({}); delete e.BASE_URL; return e; })() });
  const code = await new Promise(r => c.on('close', r));
  assert.notEqual(code, 0);
});

test('the slim gate (BAKERY_SLIM=1) passes a bakery without the collection, and still checks one-per-drop', async () => {
  await withStub('nocollection', async (base, log) => {
    const full = await runSuite(base, { log });
    assert.ok(full.failed.includes('3'), 'the full gate needs the collection');
    const slim = await new Promise(resolve => {
      const c = spawn(process.execPath, ['--test', '--test-reporter=tap', SUITE], { env: cleanEnv({ BASE_URL: base, ADMIN_TOKEN: TOKEN, APP_LOG: log, BAKERY_SLIM: '1' }) });
      let out = ''; c.stdout.on('data', d => (out += d)); c.stderr.on('data', d => (out += d));
      c.on('close', code => resolve({ code, out }));
    });
    assert.equal(slim.code, 0, slim.out.slice(-3000));
  });
  await withStub('twice', async (base, log) => {
    const c = spawn(process.execPath, ['--test', SUITE], { env: cleanEnv({ BASE_URL: base, ADMIN_TOKEN: TOKEN, APP_LOG: log, BAKERY_SLIM: '1' }) });
    assert.notEqual(await new Promise(r => c.on('close', r)), 0, 'slim still catches a second of the same item');
  });
});
