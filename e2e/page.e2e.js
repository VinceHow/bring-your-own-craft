// Her page appears when it's built, on every look: build.done opens the sheet it lives on, so a look that keeps the
// closed sheet small (painted) still shows the page. Uses the recorded rehearsal's page; no model calls.
// Run: node --test e2e/page.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3500 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
let srv, logs = '', browser;

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 80 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); });

for (const [name, look] of [['plain', ''], ['painted', '?look=painted']]) {
  test(`${name}: build.done puts her page on screen, large`, async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto(BASE + '/' + look);
    await page.waitForFunction(() => window.BYOC && BYOC.stage && BYOC.dispatch);
    await page.evaluate(() => {
      BYOC.stage(8, { instant: true }); BYOC.run = 'stub-run';
      BYOC.dispatch({ run: 'stub-run', type: 'run.start', idea: "An ordering website for my friend's small bakery" }, 'live');
      BYOC.dispatch({ run: 'stub-run', type: 'build.done', url: '/runs/rehearsal/page/' }, 'live');
    });
    await page.waitForFunction(() => { const s = document.getElementById('page-sheet'); if (!s || s.hidden) return false; const r = s.getBoundingClientRect(); return getComputedStyle(s).display !== 'none' && r.width > 600 && r.height > 300; }, null, { timeout: 5000 });
    assert.strictEqual(await page.getAttribute('#page-iframe', 'src'), '/runs/rehearsal/page/');
    assert.strictEqual(await page.getAttribute('#her-sheet', 'data-open'), 'true', 'the sheet opens large for her page');
    assert.deepStrictEqual(errors, []);
    await page.close();
  });
}
