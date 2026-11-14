// End-to-end, "Your own craft": her name tag from her words, then a run in the DIY seat (a tattoo artist, a craft we
// never listed): first sketch, the team, check-ins in her craft (at most 3), and at the build press the quiet known
// limit, no page, never the wrong one. Real model backend. Owned by the first-sketch piece.
// Until the dashed seat is on the table (beats), the tag opens through BYOC.nameTag.open() and the walk-in goes
// through the Product seat; her seat on the run is still 'diy'.
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4100 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-craft-runs-');
let srv, logs = '', browser, page, consoleErrors = [], RUN = null;
const waitFor = async (fn, ms, what, arg) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await page.evaluate(fn, arg).catch(() => false)) return; await page.waitForTimeout(150); }
  throw new Error('timed out waiting for ' + what);
};
const events = () => page.evaluate(() => BYOC.events());

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 50 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('console', m => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', e => consoleErrors.push(String(e)));
});
after(async () => { await browser?.close(); srv?.kill(); });

test('1. her character card: the team\'s fun read of her words, each piece swappable, her craft editable', async () => {
  await page.goto(BASE + '/?hold=300');
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__tag = BYOC.nameTag.open(); });
  await waitFor(() => document.activeElement?.classList.contains('tag-input'), 3000, 'her tag input');
  await page.keyboard.type('I do fine-line tattoos, flowers mostly, and I love the moment the stencil comes off');
  await page.keyboard.press('Enter');
  await waitFor(() => !document.querySelector('.name-tag .tag-card').hidden, 15000, 'her card');
  assert.match(await page.locator('.tag-craft').innerText(), /tattoo/i);
  assert.match(await page.locator('.tag-title').innerText(), /^the /);
  assert.ok((await page.locator('.tag-trait').count()) >= 2, 'two or three traits');
  const before = await page.locator('.tag-trait').first().innerText();
  await page.locator('.tag-trait').first().click();
  const after = await page.locator('.tag-trait').first().innerText();
  assert.notStrictEqual(after, before, 'a click swaps a trait');
  await page.keyboard.press('Enter');
  await waitFor(() => !document.querySelector('.name-tag'), 3000, 'her card kept');
  const tag = await page.evaluate(() => window.__tag);
  assert.strictEqual(tag.traits[0], after, 'her swap kept');
  assert.ok(!('alternates' in tag), 'the pools stay behind');
  console.log('card:', JSON.stringify(tag));
  assert.deepStrictEqual(await page.evaluate(() => [BYOC.herSeat, BYOC.herTag.craft]), ['diy', tag.craft]);
});

test('2. a run in her own craft: sketch, team, at most 3 check-ins, the build press says "no page" quietly', async () => {
  await page.click('.seat-product'); // until the dashed seat is on the table
  await waitFor(() => document.activeElement?.id === 'intro-input' || document.activeElement?.id === 'her-input', 40000, 'her card or her sheet');
  if (await page.evaluate(() => document.activeElement?.id === 'intro-input')) {
    await page.keyboard.press('Enter'); // her "I love…" already came from her tag
    await waitFor(() => document.activeElement?.id === 'her-input', 5000, 'her sheet');
  }
  await page.keyboard.type('Flash day sign-ups for my tattoo shop');
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.run && !BYOC.run.startsWith('local-'), 5000, 'a run');
  RUN = await page.evaluate(() => BYOC.run);
  const start = (await events()).find(e => e.type === 'run.start');
  assert.deepStrictEqual([start.seat, start.tag.craft, start.template], ['diy', (await page.evaluate(() => BYOC.herTag.craft)), null]);
  await waitFor(() => BYOC.events().some(e => e.type === 'sketch.done'), 15000, 'the first sketch');
  await page.locator('#her-input').focus();
  await page.keyboard.press('Enter'); // team, go
  await waitFor(() => BYOC.events().some(e => e.type === 'select.done' || e.type === 'propose.error'), 150000, 'the team');
  const evs = await events();
  const asks = evs.filter(e => e.type === 'ask');
  assert.ok(asks.length <= 3, `at most 3 check-ins, got ${asks.length}`);
  console.log('craft check-ins:', JSON.stringify(asks.map(a => `${a.seat}: ${a.question || a.decision}`)));
  for (let i = 0; i < asks.length; i++) {
    // After her first answer nothing opens by itself (DEMO focus rules): she picks the next note from her tray.
    if (i > 0) { await page.waitForSelector('#tray:not([hidden]) .tray-note', { timeout: 5000 }); await page.locator('#tray .tray-note').first().click(); }
    await waitFor(() => !!document.querySelector('#her-flow .fl-item.is-open'), 8000, 'an open check-in');
    await page.locator('#her-flow .fl-item.is-open .fl-opt').first().click();
    await waitFor(n => BYOC.events().filter(e => e.type === 'answer').length >= n, 5000, 'answer', i + 1);
    await page.waitForTimeout(1300);
  }
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowRight'); // Design's screens
  await waitFor(() => document.querySelectorAll('#sketch-sheet .sk-frame').length > 0, 90000, 'screens');
  await page.keyboard.press('ArrowRight'); // her build press
  await waitFor(() => !document.querySelector('.idea-note')?.hidden && /No page today/.test(document.querySelector('.idea-note')?.textContent || ''), 5000, 'the quiet note');
  await page.waitForTimeout(1500);
  assert.ok(!(await events()).some(e => e.type === 'build.step' || e.type === 'build.done'), 'no build, no wrong page');
});

test('3. no console errors', () => assert.deepStrictEqual(consoleErrors, []));
