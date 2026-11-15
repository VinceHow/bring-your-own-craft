// The first screen's tidy (Vincent's Mac, Sun 09:07): "So, um, I wanna build a bakery shop" on the idea card stayed raw.
// Through the real /api/tidy on this server, with the model forced out of time (TIDY_LIMIT_MS=1), so code's filler cut is
// what lands: on Enter and on Next, both looks, #idea-input goes tidying -> tidied (cut), her idea is "I wanna build a
// bakery shop", and in the painted look the pen strikes "So," and "um,". No model calls. Run: node --test e2e/tidy-first.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4300 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-tidy-first-e2e-');
const SAID = 'So, um, I wanna build a bakery shop';
let srv, logs = '', browser;
before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0', TIDY_LIMIT_MS: '1', MODEL_QUIET: '1' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 100 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

for (const [lookName, look] of [['plain', ''], ['painted', '?look=painted']]) for (const how of ['Enter', 'Next']) test(`${lookName}, ${how}: "${SAID}" tidies on the first screen`, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/api/meet-lines', r => r.fulfill({ json: { lines: {} } }));
  await page.goto(BASE + '/' + look);
  await page.waitForFunction(() => window.BYOC && BYOC.ideaOpen && BYOC.ideaOpen(), null, { timeout: 8000 });
  await page.evaluate(() => { const i = document.getElementById('idea-input'); window.__trail = []; window.__strikes = null;
    new MutationObserver(() => window.__trail.push([i.dataset.state, i.dataset.tidy || '', i.value])).observe(i, { attributes: true, attributeFilter: ['data-state'] });
    new MutationObserver(() => { const ov = document.querySelector('[data-component="tidy-moment"]'); if (ov && !window.__strikes) window.__strikes = [...ov.querySelectorAll('[data-state="cut"]')].map(w => w.textContent.trim()); })
      .observe(document.body, { childList: true, subtree: true }); });
  await page.fill('#idea-input', SAID);
  if (how === 'Enter') await page.press('#idea-input', 'Enter'); else await page.click('.idea-make');
  await page.waitForFunction(() => window.BYOC.pendingIdea, null, { timeout: 8000 });
  assert.equal(await page.evaluate(() => BYOC.pendingIdea), 'I wanna build a bakery shop');
  const trail = await page.evaluate(() => window.__trail);
  assert.deepStrictEqual(trail.map(t => t[0]).slice(0, 2), ['tidying', 'tidied'], JSON.stringify(trail));
  assert.equal(trail[1][1], 'cut'); assert.equal(trail[1][2], 'I wanna build a bakery shop');
  if (look) assert.deepStrictEqual(await page.evaluate(() => window.__strikes), ['So,', 'um,'], 'the pen strikes her fillers');
  assert.deepStrictEqual(errors, []);
  await page.close();
});
