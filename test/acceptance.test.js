// Proves the bakery acceptance suite (deploy/acceptance/bakery.acceptance.js) runs, and has teeth: it passes against a
// throwaway stub that keeps the contract (deploy/ACCEPTANCE.md), and fails against stubs that break one rule each.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SUITE = path.join(ROOT, 'deploy/acceptance/bakery.acceptance.js');
const STUB = path.join(ROOT, 'test/fixtures/bakery-stub.mjs');
// A child `node --test` inherits NODE_TEST_CONTEXT from this runner and would report to it instead of running on its own.
const cleanEnv = extra => { const e = { ...process.env, ...extra }; delete e.NODE_TEST_CONTEXT; return e; };

async function withStub(flaw, fn) {
  const p = spawn(process.execPath, [STUB], { env: cleanEnv({ PORT: '0', STUB_FLAW: flaw }) });
  let out = '';
  const port = await new Promise((ok, no) => {
    p.stdout.on('data', d => { out += d; const m = out.match(/on (\d+)/); if (m) ok(Number(m[1])); });
    p.on('exit', c => no(new Error('stub exited ' + c)));
    setTimeout(() => no(new Error('stub did not start')), 5000);
  });
  try { return await fn(`http://127.0.0.1:${port}`); } finally { p.kill(); }
}
function runSuite(base) {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', SUITE], { env: cleanEnv({ BASE_URL: base }), encoding: 'utf8', timeout: 60000 });
  const failed = [...r.stdout.matchAll(/^not ok \d+ - (.+)$/gm)].map(m => m[1].split(':')[0]);
  return { code: r.status, failed, out: r.stdout + r.stderr };
}

test('the acceptance suite passes against a stub that keeps the contract', async () => {
  await withStub('', async base => {
    const r = runSuite(base);
    assert.equal(r.code, 0, r.out.slice(-3000));
    assert.match(r.out, /# pass 7/);
  });
});

for (const [flaw, rule] of [['phone', 'no-phone'], ['cutoff', 'cutoff-8pm'], ['stock', 'stock'], ['bakelist', 'bake-list']]) {
  test(`the suite catches a broken app: ${flaw} breaks "${rule}"`, async () => {
    await withStub(flaw, async base => {
      const r = runSuite(base);
      assert.notEqual(r.code, 0, `the ${flaw} flaw went unnoticed`);
      assert.ok(r.failed.includes(rule), `"${rule}" should fail; failed: ${r.failed.join(', ')}`);
    });
  });
}

test('without BASE_URL the suite refuses to run, instead of passing by accident', () => {
  const env = cleanEnv({}); delete env.BASE_URL;
  const r = spawnSync(process.execPath, ['--test', SUITE], { env, encoding: 'utf8', timeout: 20000 });
  assert.notEqual(r.status, 0);
});
