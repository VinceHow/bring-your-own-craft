// The meet card follows the role worn (lib/kit.js cardFor): she takes Engineering, Bo wears Product, and Bo's card is
// the product card in Bo's name, with a line asked as Product. Nobody shows the engineering card. Stubbed models.
// Run: node --test e2e/role-card.e2e.js   (SHOT=path writes Bo's card at 1920×1080)
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4400 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-rolecard-e2e-');
let srv, logs = '', browser;
before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 100 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

const HOME = { engineering: 'I’m building a fast, reliable checkout.', design: 'I’ll sketch the order page, warm and quick.' };
const AS_PRODUCT = 'I’ll keep the order journey to three clear steps.';

test('Engineering: Bo’s meet card is the product card, in Bo’s name; no engineering card anywhere', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const asked = [];
  await page.route('**/api/tidy', r => r.fulfill({ json: { text: JSON.parse(r.request().postData()).text, tidied: false } }));
  await page.route('**/api/name-tag', r => r.fulfill({ status: 200, json: { title: 'the Journey Mapper', traits: ['ships it'], superpower: 'sees the path' } }));
  await page.route('**/api/meet-lines', r => { const b = JSON.parse(r.request().postData()); asked.push(b);
    r.fulfill({ json: { lines: b.wearing ? { [b.wearing]: AS_PRODUCT } : HOME } }); });
  await page.goto(BASE + '/');
  await page.waitForFunction(() => window.BYOC && BYOC.ideaOpen && BYOC.ideaOpen(), null, { timeout: 8000 });
  await page.fill('#idea-input', 'A website for my bakery'); await page.press('#idea-input', 'Enter');
  await page.waitForFunction(() => BYOC.introOpen && BYOC.introOpen(), null, { timeout: 10000 });
  await page.click('.pick-option[data-seat="engineering"]');
  await page.fill('#nt-name', 'Priya');
  await page.fill('#intro-input', 'I love getting the details right'); await page.press('#intro-input', 'Enter');
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
  await page.waitForFunction(() => BYOC.cast && BYOC.cast.roles && BYOC.cast.roles.engineering === 'product', null, { timeout: 8000 });
  await page.waitForTimeout(300); // the worn-role line lands
  await page.keyboard.press('Enter'); // meet your team
  const seen = {};
  for (let i = 0; i < 8; i++) {
    const c = await page.waitForSelector('#setup .meet-card', { timeout: 10000 });
    const seat = await c.getAttribute('data-seat');
    if (!seen[seat]) {
      seen[seat] = await page.evaluate(() => { const c = document.querySelector('#setup .meet-card'); const t = s => [...c.querySelectorAll(s)].map(x => x.textContent.trim());
        return { name: t('.meet-name')[0], role: t('.meet-role')[0], intro: t('.meet-intro')[0], line: t('.meet-line')[0], chips: t('.meet-chip') }; });
      if (seat === 'engineering' && process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
    }
    if (Object.keys(seen).length >= 5) break;
    await page.evaluate(() => BYOC.meetNext()); await page.waitForTimeout(500);
  }
  const bo = seen.engineering;
  assert.ok(bo, 'met Bo');
  assert.equal(bo.name, 'Bo'); assert.equal(bo.role, 'Product');
  assert.equal(bo.intro, 'I’m Bo. Today I hold the product: what we build, and for whom.');
  assert.doesNotMatch(bo.intro, /Boring, correct/);
  assert.equal(bo.line, `“${AS_PRODUCT}”`, 'the line asked as Product, not the checkout line');
  assert.ok(!bo.chips.some(x => /Builds her page|Schema-checked|Playwright|Railway/.test(x)), 'no engineering chips: ' + bo.chips.join(' | '));
  assert.ok(bo.chips.some(x => /write-spec/.test(x)), 'the product method');
  assert.ok(asked.some(b => b.wearing === 'engineering'), 'asked as Product');
  assert.ok(asked.some(b => !b.wearing), 'the plain call is still made');
  for (const [s, c] of Object.entries(seen)) {
    if (s === 'engineering') continue;
    assert.doesNotMatch(c.intro || '', /Boring, correct/, `${s}: not the engineering card`);
    assert.ok(!c.chips.some(x => /Builds her page/.test(x)), `${s}: not the engineering card`);
  }
  assert.equal(seen.design.line, `“${HOME.design}”`, 'Mika keeps her own tailored line');
  assert.deepStrictEqual(errors, []);
  await page.close();
});

test('Product (the stage path): Bo keeps his engineering card, and nothing is asked with `wearing`', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const asked = [];
  await page.route('**/api/tidy', r => r.fulfill({ json: { text: JSON.parse(r.request().postData()).text, tidied: false } }));
  await page.route('**/api/name-tag', r => r.fulfill({ status: 200, json: { title: 'the Journey Mapper', traits: ['ships it'], superpower: 'sees the path' } }));
  await page.route('**/api/meet-lines', r => { asked.push(JSON.parse(r.request().postData())); r.fulfill({ json: { lines: {} } }); });
  await page.goto(BASE + '/');
  await page.waitForFunction(() => window.BYOC && BYOC.ideaOpen && BYOC.ideaOpen(), null, { timeout: 8000 });
  await page.fill('#idea-input', 'A website for my bakery'); await page.press('#idea-input', 'Enter');
  await page.waitForFunction(() => BYOC.introOpen && BYOC.introOpen(), null, { timeout: 10000 });
  await page.fill('#nt-name', 'Priya');
  await page.fill('#intro-input', 'I love getting the details right'); await page.press('#intro-input', 'Enter');
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
  await page.keyboard.press('Enter'); // meet your team
  let bo = null;
  for (let i = 0; i < 6 && !bo; i++) {
    await page.waitForSelector('#setup .meet-card', { timeout: 10000 });
    bo = await page.evaluate(() => { const c = document.querySelector('#setup .meet-card'); return c.dataset.seat === 'engineering' ? c.querySelector('.meet-intro').textContent : null; });
    if (!bo) { await page.evaluate(() => BYOC.meetNext()); await page.waitForTimeout(500); }
  }
  assert.equal(bo, 'I’m Bo. Boring, correct, shipped, in that order.');
  assert.ok(asked.every(b => !('wearing' in b)), 'no worn-role ask on the Product path');
  await page.close();
});
