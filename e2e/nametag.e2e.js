// Her name tag on paper (the first live beat): name "Priya", Product, her sentence, Enter in that field. There is always
// a visible state within 300 ms, then a tag; a slow call says so; a failed or empty one says so plainly and offers
// Try again (Enter or the button); the "Make my tag" button is the click path. The model routes are stubbed (no model
// calls). Run: node --test e2e/nametag.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3700 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-nametag-e2e-');
const SAID = 'figuring out customer journeys and understanding customer problems and shipping';
const TAG = { title: 'the Journey Mapper', traits: ['customer-obsessed', 'ships it'], superpower: 'sees the whole path' };
let srv, logs = '', browser;

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 80 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

// A fresh page with the tidy and the name-tag call stubbed: tag(route) decides what the name-tag call does.
async function card(tag, { tidyMs = 0 } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const calls = { tag: 0, tidy: 0 };
  await page.route('**/api/tidy', async r => { calls.tidy++; await new Promise(f => setTimeout(f, tidyMs)); await r.fulfill({ status: 200, json: { text: JSON.parse(r.request().postData()).text, tidied: false } }); });
  await page.route('**/api/name-tag', async r => { calls.tag++; await tag(r, calls.tag); });
  await page.goto(BASE + '/');
  await page.waitForFunction(() => window.BYOC && BYOC.introOpen && BYOC.introOpen(), null, { timeout: 8000 });
  await page.fill('#nt-name', 'Priya');
  await page.click('.pick-option[data-pick="product"]');
  await page.fill('#intro-input', SAID);
  await page.focus('#intro-input');
  return { page, errors, calls };
}
const status = page => page.evaluate(() => { const s = document.querySelector('.nt-status'); return { state: s?.dataset.state, text: s?.textContent || '', card: document.querySelector('.nt-paper')?.dataset.state }; });
const visible = page => page.evaluate(() => { const s = document.querySelector('.nt-status'); if (!s) return false; const r = s.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(s).visibility !== 'hidden' && getComputedStyle(s).display !== 'none'; });
const ok = ms => async r => { await new Promise(f => setTimeout(f, ms)); await r.fulfill({ status: 200, json: TAG }); };

test('Enter in her love/bring field: a visible "making your name tag" within 300 ms, then her tag', async () => {
  const { page, errors, calls } = await card(ok(1500), { tidyMs: 800 });
  const t0 = Date.now();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-status')?.dataset.state === 'thinking', null, { timeout: 300 });
  assert.ok(Date.now() - t0 <= 300 + 150, `progress shown in ${Date.now() - t0} ms`);
  assert.match((await status(page)).text, /making your name tag/i);
  assert.ok(await visible(page), 'the progress line is on screen');
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
  assert.match(await page.textContent('.nt-paper'), /Priya, the Journey Mapper/);
  assert.equal(await page.textContent('.nt-make'), 'Meet your team');
  assert.equal(calls.tag, 1);
  // Enter again (or the clicker): she meets the team.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => BYOC.beat === 1, null, { timeout: 3000 });
  assert.deepStrictEqual(errors, []);
  await page.close();
});

test('Shift+Enter adds a new line instead of sending', async () => {
  const { page } = await card(ok(0));
  await page.keyboard.press('Shift+Enter');
  await page.waitForTimeout(200);
  assert.equal((await status(page)).card, 'asking');
  assert.match(await page.inputValue('#intro-input'), /\n$/);
  await page.close();
});

test('the click path: "Make my tag" makes it, with the same visible progress', async () => {
  const { page } = await card(ok(500));
  await page.click('.nt-make');
  await page.waitForFunction(() => document.querySelector('.nt-status')?.dataset.state === 'thinking', null, { timeout: 300 });
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
  await page.close();
});

test('slow: it says it is still working; it still lands', async () => {
  const { page } = await card(ok(7500));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-status')?.dataset.state === 'slow', null, { timeout: 8000 });
  assert.match((await status(page)).text, /still making your name tag/i);
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
  await page.close();
});

test('failed, or back with nothing usable: a plain line and Try again; Enter retries and it lands', async () => {
  const { page, calls } = await card(async (r, n) => n === 1 ? r.fulfill({ status: 502, json: { error: 'model timeout' } }) : r.fulfill({ status: 200, json: TAG }));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-status')?.dataset.state === 'failed', null, { timeout: 5000 });
  assert.match((await status(page)).text, /couldn’t make your name tag/i);
  assert.equal(await page.textContent('.nt-make'), 'Try again');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'intro-input', 'her field is back in focus');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 5000 });
  assert.equal(calls.tag, 2);
  await page.close();
  // An empty reply (no title, no traits) is a failure too, never a blank tag.
  const b = await card(async r => r.fulfill({ status: 200, json: { title: '', traits: [] } }));
  await b.page.keyboard.press('Enter');
  await b.page.waitForFunction(() => document.querySelector('.nt-status')?.dataset.state === 'failed', null, { timeout: 5000 });
  await b.page.click('.nt-make');
  await b.page.waitForFunction(() => document.querySelector('.nt-status')?.dataset.state === 'thinking' || document.querySelector('.nt-status')?.dataset.state === 'failed', null, { timeout: 2000 });
  await b.page.close();
});

test('after the mic (her words land through BYOC.typeInto), Enter still makes the tag', async () => {
  const { page } = await card(ok(300));
  await page.fill('#intro-input', '');
  await page.focus('#nt-name'); // the mic can be used from anywhere on the card
  await page.evaluate(s => BYOC.typeInto(s), SAID);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'intro-input');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-status')?.dataset.state === 'thinking', null, { timeout: 300 });
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 5000 });
  await page.close();
});
