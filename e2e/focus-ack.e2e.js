// Vincent's Focus 1 test: after "Add this", the document says who's listening and that the team replies on Send, and
// Send pulses once; the helper line says the same before she starts. Model routes stubbed. Run: node --test e2e/focus-ack.e2e.js
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
const RUNS = fs.mkdtempSync('/tmp/byoc-ack-e2e-');
let srv, logs = '', browser;
before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 80 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

for (const [lookName, look] of [['plain', ''], ['painted', '?look=painted']]) test(`${lookName}: Add this is acknowledged: who's listening, replies come on Send, Send pulses once`, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/api/run/stub-run/**', r => r.fulfill({ json: { ok: true } }));
  await page.goto(BASE + '/' + look);
  await page.waitForFunction(() => window.BYOC && BYOC.dispatch && BYOC.focusDoc);
  await page.evaluate(() => {
    BYOC.stage(4, { instant: true }); BYOC.run = 'stub-run';
    BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'first', first: true, seat: 'research', by: 'Wren', question: 'Who should we build this for first?',
      artifact: { kind: 'finding', ref: { title: 'A finding', quote: 'A third of visitors buy weekly.', url: 'https://example.org/f', label: 'researched before the demo' } } }, 'live');
    BYOC.openNote('first');
  });
  await page.waitForFunction(() => BYOC.focusDoc.isOpen(), null, { timeout: 3000 });
  assert.equal((await page.textContent('#focus-doc [data-slot="help"]')).trim(), 'Add this keeps a thought · Send when you’re ready, and the team replies · End meeting for the takeaways', 'in a meeting, the third clause');
  assert.ok(await page.isHidden('#focus-doc [data-slot="ack"]'), 'no acknowledgement before a thought');
  await page.fill('#focus-doc .fd-input', "It's really for the regulars");
  await page.click('#focus-doc [data-slot="add-piece"]');
  await page.waitForFunction(() => document.querySelector('#focus-doc [data-slot="ack"]')?.dataset.state === 'shown', null, { timeout: 1000 });
  assert.equal((await page.textContent('#focus-doc [data-slot="ack"]')).trim(), 'Wren is listening · Send when you’re done and the team will reply');
  assert.ok(await page.isVisible('#focus-doc [data-slot="ack"]'));
  assert.equal(await page.getAttribute('#focus-doc [data-slot="send"]', 'data-state'), 'nudge', 'Send pulses');
  await page.waitForFunction(() => document.querySelector('#focus-doc [data-slot="send"]')?.dataset.state === 'idle', null, { timeout: 2500 });
  // Removing her only thought takes the line away.
  await page.click('#focus-doc .fd-piece [data-slot="remove"]');
  assert.ok(await page.isHidden('#focus-doc [data-slot="ack"]'));
  assert.deepStrictEqual(errors, []);
  await page.close();
});
