// Meet the team is hers to pace (Vincent, 15 Nov): in a live run (stage mode or not) no card advances on its own;
// Next / Enter / → / PageDown go forward, Back / ← / PageUp go back (on the first card she stays); small progress
// dots (.meet-dots[data-step][data-total]); the last card's button reads "Into the studio". Stubbed: no models.
// Run: node --test e2e/meet-paced.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4800 + Math.floor(Math.random() * 90);
const RUNS = fs.mkdtempSync('/tmp/byoc-meet-e2e-');
let srv, logs = '', browser;
before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('server did not start:\n' + logs)), 20000);
    const check = d => { logs += d || ''; if (logs.includes('room on')) { clearTimeout(t); res(); } }; srv.stdout.on('data', check); srv.stderr.on('data', check); });
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

async function meet(query) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/api/tidy', r => r.fulfill({ status: 200, json: { text: JSON.parse(r.request().postData()).text, tidied: false } }));
  await page.route('**/api/name-tag', r => r.fulfill({ status: 200, json: { title: 'the Journey Mapper', traits: ['ships it'], superpower: 'sees the path' } }));
  await page.route('**/api/kit**', r => r.fulfill({ status: 200, json: {} }));
  await page.goto(`http://localhost:${PORT}/?setup=classic${query}`); // live: no ?hold=, as she has it
  await page.waitForFunction(() => window.BYOC && BYOC.introOpen && BYOC.introOpen(), null, { timeout: 8000 });
  await page.fill('#intro-input', 'figuring out what people really need'); await page.focus('#intro-input');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
  await page.keyboard.press('Enter'); // meet your team
  await page.waitForFunction(() => document.querySelector('#setup .meet-card')?.dataset.step === '1', null, { timeout: 8000 });
  return { page, errors };
}
const where = page => page.evaluate(() => { const c = document.querySelector('#setup .meet-card'); const d = c?.querySelector('.meet-dots');
  return { beat: BYOC.beat, step: c?.dataset.step, total: c?.dataset.total, dots: d && [d.dataset.step, d.dataset.total, [...d.children].map(x => x.dataset.state).join(',')],
    back: c ? !c.querySelector('.meet-back').hidden : null, next: c?.querySelector('.meet-next')?.textContent }; });
const go = async (page, key, step) => { await page.keyboard.press(key); await page.waitForFunction(s => document.querySelector('#setup .meet-card')?.dataset.step === s, String(step), { timeout: 3000 }); };

for (const [name, q] of [['live', ''], ['live, stage mode', '&stage=1']]) test(`${name}: no card advances on its own (10 s); Back and the clicker keys move one at a time; the last reads "Into the studio"`, async () => {
  const { page, errors } = await meet(q);
  let w = await where(page);
  assert.deepStrictEqual(w, { beat: 1, step: '1', total: '5', dots: ['1', '5', 'current,todo,todo,todo,todo'], back: false, next: 'Next' });
  await page.waitForTimeout(10000);
  assert.strictEqual((await where(page)).step, '1', 'still on the first card after 10 s');
  await go(page, 'ArrowRight', 2); await go(page, 'PageDown', 3);
  w = await where(page); assert.deepStrictEqual(w.dots, ['3', '5', 'done,done,current,todo,todo']); assert.strictEqual(w.back, true);
  await go(page, 'ArrowLeft', 2); await go(page, 'PageUp', 1);
  await page.keyboard.press('PageUp'); await page.waitForTimeout(300);
  assert.deepStrictEqual([(await where(page)).beat, (await where(page)).step], [1, '1'], 'on the first card, back stays');
  await page.click('#setup .meet-next'); await page.waitForFunction(() => document.querySelector('#setup .meet-card')?.dataset.step === '2');
  await page.click('#setup .meet-back'); await page.waitForFunction(() => document.querySelector('#setup .meet-card')?.dataset.step === '1');
  await go(page, 'Enter', 2); await go(page, 'ArrowRight', 3); await go(page, 'ArrowRight', 4); await go(page, 'ArrowRight', 5);
  w = await where(page); assert.strictEqual(w.next, 'Into the studio'); assert.strictEqual(w.dots[2], 'done,done,done,done,current');
  await page.waitForTimeout(3000); assert.strictEqual((await where(page)).beat, 1, 'the last card waits too');
  await page.click('#setup .meet-next');
  await page.waitForFunction(() => BYOC.beat >= 2, null, { timeout: 3000 });
  assert.deepStrictEqual(errors, []);
  await page.close();
});
