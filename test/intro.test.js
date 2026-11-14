import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-intro-'));
const { initTaste, readTaste, cleanIntro } = await import('../lib/taste.js');

test('her "I love" line becomes L1; one prepared line stays as L2', () => {
  const lines = initTaste('intro-run-1', { intro: 'turning a messy idea into a journey people can follow' });
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0].id, 'L1');
  assert.match(lines[0].text, /^I love turning a messy idea/);
  assert.match(lines[0].text, /her own words, today/);
  assert.strictEqual(lines[1].id, 'L2');
  assert.match(lines[1].text, /prepared for the demo/);
  assert.deepStrictEqual(readTaste('intro-run-1'), lines);
});
test('no intro keeps both prepared lines', () => {
  const lines = initTaste('intro-run-2');
  assert.strictEqual(lines.length, 2);
  assert.ok(lines.every(l => /prepared for the demo/.test(l.text)));
});
test('cleanIntro adds "I love" once and trims', () => {
  assert.strictEqual(cleanIntro('  i love   maps '), 'I love maps');
  assert.strictEqual(cleanIntro('maps'), 'I love maps');
  assert.strictEqual(cleanIntro(''), '');
});
