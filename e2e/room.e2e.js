// The room in a real browser: rolling numbers settle on the true value, and replays never double-draw.
// Run: npm run e2e (or node --test e2e/room.e2e.js). Piece 1 owns this file.
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3800 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-room-e2e-');
let srv, logs = '', browser, page, posts = [], errors = [];

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 50 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('request', r => r.method() === 'POST' && posts.push(r.url()));
  page.on('pageerror', e => errors.push(String(e)));
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

// The number a roller shows, read from where each digit column actually sits.
const shown = id => page.evaluate(id => [...document.querySelectorAll(`#${id} .col`)]
  .map(c => Math.round(-parseFloat((c.style.transform.match(/-?[\d.]+/) || ['0'])[0]))).join(''), id);

test('a roller hit by changes 130ms apart settles on the last value', async () => {
  await page.goto(BASE + '/');
  await page.evaluate(() => { BYOC.stage(5, { instant: true }); BYOC._rollers.pct.set(88, false); });
  await page.evaluate(async () => {
    const r = BYOC._rollers.pct, w = ms => new Promise(f => setTimeout(f, ms));
    r.set(89); await w(130); r.set(90);
  });
  await page.waitForTimeout(1500);
  assert.strictEqual(await shown('pct'), '90');
});

test('the fake run at 20x settles the counter and meter on the log\'s numbers, drawn once', async () => {
  posts = [];
  await page.goto(BASE + '/?fixture=1&speed=20');
  await page.waitForTimeout(4500);
  const t = await page.evaluate(() => BYOC.tallyFromEvents(BYOC.events()));
  assert.strictEqual(t.meter.pct, 90);
  assert.strictEqual(await shown('pct'), String(t.meter.pct));
  assert.strictEqual(await shown('came'), String(t.came));
  assert.strictEqual(await shown('brought'), String(t.brought));
  const d = await page.evaluate(() => ({
    label: !document.getElementById('replay-label').hidden,
    hasFlow: !!(BYOC.flow && BYOC.flow.addLine),
    boxes: document.querySelectorAll('#her-flow .fl-box').length,
    asks: document.querySelectorAll('#her-flow .fl-fork, #her-flow .fl-pin').length,
    plain: document.querySelectorAll('#her-flow .plain-line').length,
    notes: document.querySelectorAll('#her-notes .note').length,
  }));
  assert.ok(d.label, 'FAKE label on screen');
  if (d.hasFlow) {
    assert.deepStrictEqual({ boxes: d.boxes, asks: d.asks, plain: d.plain, notes: d.notes }, { boxes: 6, asks: 3, plain: 0, notes: 0 });
  } else {
    assert.deepStrictEqual({ plain: d.plain, notes: d.notes }, { plain: 5, notes: 3 });
  }
  assert.deepStrictEqual(posts, [], 'a replay posts nothing');
  assert.deepStrictEqual(errors, []);
});
