// Any seat (Vincent, 15 Nov): her name tag offers every seat (Product, Design, Data, Research, Engineering, Strategy)
// and "Your own craft", as one compact chip row with Product preselected. For each pick, stubbed (no models): the pick
// card's hooks (data-seat, data-selected), she sits in her chair wearing that seat, the teammate whose craft she took
// steps aside (its card says so; its pad says so), her run starts with that seat, and the page has 0 errors. Product
// stays the default: no seat sent, no one aside. Plain look for every seat; painted for Product and Design.
// Run: node --test e2e/any-seat.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4700 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-anyseat-e2e-');
const TAG = { title: 'the Journey Mapper', traits: ['customer-obsessed', 'ships it'], superpower: 'sees the whole path' };
const AGENT = { design: 'Mika', data: 'Theo', research: 'Noor', strategy: 'Ines', engineering: 'Bo' };
let srv, logs = '', browser;

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('server did not start in 20 s:\n' + logs)), 20000);
    const check = d => { logs += d || ''; if (logs.includes('room on')) { clearTimeout(t); res(); } };
    srv.stdout.on('data', check); srv.stderr.on('data', check);
  });
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

async function takeSeat(pick, look = '') {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const runs = [];
  await page.route('**/api/tidy', r => r.fulfill({ status: 200, json: { text: JSON.parse(r.request().postData()).text, tidied: false } }));
  await page.route('**/api/name-tag', r => r.fulfill({ status: 200, json: pick === 'craft' ? { ...TAG, craft: 'Tattoo artist' } : TAG }));
  await page.route('**/api/run', r => { runs.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 200, json: { run: 'stub-run' } }); });
  await page.route('**/api/run/**', r => r.fulfill({ status: 200, json: { ok: true } })); // nothing reaches a model
  await page.goto(BASE + '/' + (look ? look + '&' : '?') + 'setup=classic');
  await page.waitForFunction(() => window.BYOC && BYOC.introOpen && BYOC.introOpen(), null, { timeout: 8000 });
  // One chip row, every seat, Product preselected.
  const chips = await page.$$eval('.pick-card .pick-option', bs => bs.map(b => [b.dataset.seat, b.dataset.selected, b.textContent.trim()]));
  assert.deepStrictEqual(chips, [['product', 'true', 'Product'], ['design', 'false', 'Design'], ['data', 'false', 'Data'], ['research', 'false', 'Research'],
    ['engineering', 'false', 'Engineering'], ['strategy', 'false', 'Strategy'], ['diy', 'false', 'Your own craft']]);
  const rows = await page.$$eval('.pick-card .pick-option', bs => new Set(bs.map(b => Math.round(b.getBoundingClientRect().top))).size);
  assert.ok(rows <= 2, `a compact chip row (${rows} lines)`);
  await page.fill('#nt-name', 'Priya');
  await page.click(`.pick-option[data-pick="${pick}"]`);
  assert.deepStrictEqual(await page.$$eval('.pick-option[data-selected="true"]', bs => bs.map(b => b.dataset.pick)), [pick], 'one selected');
  await page.fill('#intro-input', 'figuring out what people really need');
  await page.focus('#intro-input');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
  await page.keyboard.press('Enter');
  for (let i = 0; i < 10 && !(await page.evaluate(() => !document.getElementById('her-form').hidden && document.querySelectorAll('.seat .card').length === 6)); i++) {
    await page.keyboard.press('PageDown'); await page.waitForTimeout(700);
  }
  await page.waitForFunction(() => document.activeElement?.id === 'her-input', null, { timeout: 8000 });
  await page.fill('#her-input', 'A website for a small bakery, so regulars can order bread ahead.');
  await page.press('#her-input', 'Enter');
  await page.waitForFunction(() => BYOC.run === 'stub-run', null, { timeout: 8000 });
  return { page, errors, runs };
}

const SEATS = ['product', 'design', 'data', 'research', 'engineering', 'strategy', 'craft'];
const cases = [...SEATS.map(s => [s, 'plain', '']), ['product', 'painted', '?look=painted'], ['design', 'painted', '?look=painted']];
for (const [pick, lookName, look] of cases) {
  test(`${lookName}: she takes ${pick === 'craft' ? 'her own craft' : 'the ' + pick + ' seat'}; the room starts with 0 page errors`, async () => {
    const { page, errors, runs } = await takeSeat(pick, look);
    const her = await page.evaluate(() => { const c = document.querySelector('#room [data-component="her-place-card"], .seat-product .card, [data-seat-id="product"] .card') || document.querySelector('.card-diy');
      return { seat: c?.dataset.seat || null, room: document.getElementById('room').dataset.herSeat || null, name: c?.querySelector('.card-name')?.textContent || null }; });
    const aside = await page.$$eval('.seat .card[data-state="aside"]', cs => cs.map(c => [c.closest('.seat')?.dataset.seat || c.dataset.seat, c.querySelector('[data-slot="aside"]')?.textContent]));
    assert.strictEqual(runs.length, 1, 'one run');
    if (pick === 'product') {
      assert.strictEqual(runs[0].seat, undefined, 'Product: no seat sent, as before (the stage path, DEMO, R unchanged)');
      assert.deepStrictEqual(aside, [], 'Product: no one steps aside');
    } else if (pick === 'craft') {
      assert.strictEqual(runs[0].seat, 'diy');
      assert.strictEqual(her.seat, 'diy');
      assert.deepStrictEqual(aside, []);
    } else {
      assert.strictEqual(runs[0].seat, pick, 'her run starts in that seat');
      assert.strictEqual(her.seat, pick); assert.strictEqual(her.room, pick);
      assert.strictEqual(her.name, pick[0].toUpperCase() + pick.slice(1), 'her card wears the seat');
      assert.strictEqual(aside.length, 1, 'exactly one teammate steps aside');
      assert.match(aside[0][1], new RegExp(`^${AGENT[pick]} steps aside`));
      await page.evaluate(s => BYOC.openSketchpad(s), pick);
      const st = await page.evaluate(() => { const e = document.querySelector('#room-panel [data-component="pad-status"]'); return e && [e.dataset.state, e.textContent]; });
      assert.strictEqual(st?.[0], 'aside'); assert.match(st[1], new RegExp(`^${AGENT[pick]} steps aside today`));
    }
    assert.deepStrictEqual(errors, [], 'no page errors');
    await page.close();
  });
}
