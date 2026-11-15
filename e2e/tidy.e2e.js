// Every line she types or speaks is tidied in place before it's sent (BYOC.tidyInto): her idea, her lines and her
// reaction (the room's input), and the close. The input carries data-raw (her words) and data-state tidying -> tidied,
// and what's sent is the cleaned line. A slow tidy falls back to her raw words. The tidy itself (cut, never reworded)
// is unit-tested in test/tidy.test.js; here /api/tidy and the run routes are stubbed (no model calls), on both looks.
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3400 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-tidy-e2e-');
let srv, logs = '', browser;
before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 80 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

// The stubbed tidy: cuts fillers and lead-ins, as the real one may (deletion only); "slow" never answers in time.
const CLEAN = { 'um so the idea is, uh, a website for a small bakery so people can order bread ahead': 'A website for a small bakery so people can order bread ahead.',
  'uh regulars come every, every morning': 'Regulars come every morning.', 'so basically a booking page for my yoga studio': 'A booking page for my yoga studio.' };

for (const [lookName, look] of [['plain', ''], ['painted', '?look=painted']]) test(`${lookName}: her idea, a line and the close are tidied in place before they're sent; slow falls back to raw`, async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const sent = { idea: null, line: null, close: null };
  await page.route('**/api/tidy', async r => {
    const { text } = JSON.parse(r.request().postData());
    if (/slow/.test(text)) { await new Promise(res => setTimeout(res, 4000)); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: 'never used', tidied: true }) }).catch(() => {}); }
    await new Promise(res => setTimeout(res, 300));
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: CLEAN[text] || text, tidied: !!CLEAN[text] }) });
  });
  await page.route('**/api/run', r => { sent.idea = JSON.parse(r.request().postData()).idea; r.fulfill({ status: 200, contentType: 'application/json', body: '{"run":"stub-tidy"}' }); });
  await page.route('**/api/run/stub-tidy/**', r => { const u = r.request().url(); if (/\/line$/.test(u)) sent.line = JSON.parse(r.request().postData()).text; r.fulfill({ status: 404, contentType: 'application/json', body: '{}' }); });
  await page.route('**/api/sketch-for-idea', r => { sent.close = JSON.parse(r.request().postData()).idea; r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"stubbed"}' }); });
  await page.route('**/api/select-for-idea', r => { sent.close = JSON.parse(r.request().postData()).idea; r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"stubbed"}' }); });
  await page.goto(BASE + '/' + look);
  await page.evaluate(() => { BYOC.stage(3, { instant: true }); });
  await page.waitForSelector('#her-input', { state: 'visible' });
  const inp = page.locator('#her-input');
  // her idea: tidying (raw kept), then tidied; the cleaned idea starts the run
  const raw = 'um so the idea is, uh, a website for a small bakery so people can order bread ahead';
  await inp.fill(raw); await inp.press('Enter');
  await page.waitForFunction(() => document.getElementById('her-input').dataset.state === 'tidying');
  assert.equal(await inp.getAttribute('data-raw'), raw);
  await page.waitForFunction(() => document.getElementById('her-input').dataset.state === 'tidied');
  for (let i = 0; i < 40 && !sent.idea; i++) await page.waitForTimeout(50);
  assert.equal(sent.idea, 'A website for a small bakery so people can order bread ahead.');
  assert.equal(await page.textContent('#her-idea'), 'A website for a small bakery so people can order bread ahead.');
  // a line, cleaned before it's sent
  await page.waitForFunction(() => document.getElementById('her-input').offsetParent !== null);
  await inp.fill('uh regulars come every, every morning'); await inp.press('Enter');
  for (let i = 0; i < 60 && !sent.line; i++) await page.waitForTimeout(50);
  assert.equal(sent.line, 'Regulars come every morning.');
  // a slow tidy: her raw words go, after at most ~2.5 s
  sent.line = null;
  const t0 = Date.now();
  await inp.fill('this one is slow and stays as she said it'); await inp.press('Enter');
  for (let i = 0; i < 100 && !sent.line; i++) await page.waitForTimeout(50);
  assert.equal(sent.line, 'this one is slow and stays as she said it');
  assert.ok(Date.now() - t0 < 4000, `never blocks for long (${Date.now() - t0} ms)`);
  // the close: the judge's idea, tidied in its input, cleaned idea sent
  await page.evaluate(() => BYOC.close.open());
  const ci = page.locator('#close-input');
  await ci.fill('so basically a booking page for my yoga studio'); await ci.press('Enter');
  await page.waitForFunction(() => document.getElementById('close-input').dataset.state === 'tidied');
  assert.equal(await ci.getAttribute('data-raw'), 'so basically a booking page for my yoga studio');
  for (let i = 0; i < 40 && !sent.close; i++) await page.waitForTimeout(50);
  assert.equal(sent.close, 'A booking page for my yoga studio.');
  assert.deepStrictEqual(errors, []);
  await page.close();
});
