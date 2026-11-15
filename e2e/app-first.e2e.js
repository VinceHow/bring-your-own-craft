// The app button's first version (Vincent, Sun): on "Team, go" a background v1 builds from her idea and the team's
// first proposals; the button goes "Building your app…" -> "Open the app · v1" (well within 35 s; the stub fills in
// 1.5 s), the room's beats never move for it, and the page it opens answers 200. The press at beat 8 (audit F1's one
// forward) builds v2 with a one-line "what changed" and one pulse: no second concurrent build, no 409. Server:
// BUILD_STUB=1 (template defaults, no model). Run: node --test e2e/app-first.e2e.js
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
const RUNS = fs.mkdtempSync('/tmp/byoc-app-first-e2e-');
let srv, logs = '', browser;
before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0', BUILD_STUB: '1', BUILD_STUB_MS: '1500', LIVE_LOGO: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 100 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

for (const [lookName, look] of [['plain', ''], ['painted', '?look=painted']]) test(`${lookName}: Team, go builds v1 in the background; the press builds v2 with what changed`, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const builds = []; const codes = [];
  page.on('response', r => { if (/\/build$/.test(r.url())) codes.push(r.status()); });
  // the team's model routes stubbed; the build route is real (BUILD_STUB on the server)
  await page.route('**/api/run/*/**', r => { if (/\/build$/.test(r.request().url())) { builds.push(JSON.parse(r.request().postData() || '{}')); return r.continue(); } r.fulfill({ json: { ok: true } }); });
  await page.goto(BASE + '/' + look);
  await page.waitForFunction(() => window.BYOC && BYOC.stage && BYOC.app);
  const run = await page.evaluate(async () => (await (await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idea: 'A website for a small bakery, so customers can order bread ahead.', path: 'full' }) })).json()).run);
  await page.evaluate(run => { BYOC.stage(4, { instant: true }); BYOC.run = run; }, run);
  const t0 = Date.now();
  await page.evaluate(() => BYOC.stage(5)); // "Team, go", live
  await page.waitForFunction(() => document.querySelector('[data-component="app-button"]').dataset.state === 'building', null, { timeout: 5000 });
  assert.match(await page.textContent('.app-label'), /Building your app…/);
  await page.waitForFunction(() => document.querySelector('[data-component="app-button"]').dataset.version === '1', null, { timeout: 35000 });
  assert.ok(Date.now() - t0 < 35000, 'v1 within 35 s');
  assert.match(await page.textContent('.app-label'), /Open the app · v1/);
  assert.equal(await page.getAttribute('[data-component="app-button"]', 'data-state'), 'ready');
  assert.equal(await page.evaluate(() => BYOC.beat), 5, 'the room stays on its beat');
  const url = await page.evaluate(() => BYOC.app.url());
  assert.equal(await page.evaluate(async u => (await fetch(u)).status, url), 200, 'the app answers 200');
  // the press (beat 8): v2, with what changed and one pulse; no 409, one build at a time
  await page.evaluate(() => BYOC.stage(8));
  await page.waitForFunction(() => document.querySelector('[data-component="app-button"]').dataset.version === '2', null, { timeout: 35000 });
  assert.match(await page.textContent('.app-label'), /Open the app · v2/);
  assert.match(await page.textContent('.app-change'), /^v2 · /, 'what changed, in one line');
  assert.equal(await page.getAttribute('[data-component="app-button"]', 'data-pulse'), '1');
  assert.deepStrictEqual(builds.map(b => !!b.background), [true, false], 'one background v1, one press');
  assert.ok(codes.every(c => c === 200), `no 409 (${codes})`);
  assert.deepStrictEqual(errors, []);
  await page.close();
});

test('a press while v1 is still building queues v2: both land, never two at once', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const codes = [];
  page.on('response', r => { if (/\/build$/.test(r.url())) codes.push(r.status()); });
  await page.route('**/api/run/*/**', r => (/\/build$/.test(r.request().url()) ? r.continue() : r.fulfill({ json: { ok: true } })));
  await page.goto(BASE + '/');
  await page.waitForFunction(() => window.BYOC && BYOC.stage && BYOC.app);
  const run = await page.evaluate(async () => (await (await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idea: 'A website for a small bakery', path: 'full' }) })).json()).run);
  await page.evaluate(run => { BYOC.stage(4, { instant: true }); BYOC.run = run; BYOC.stage(5); }, run);
  await page.waitForFunction(() => document.querySelector('[data-component="app-button"]').dataset.state === 'building', null, { timeout: 5000 });
  await page.evaluate(() => BYOC.stage(8)); // the press, mid-v1
  await page.waitForFunction(() => document.querySelector('[data-component="app-button"]').dataset.version === '2', null, { timeout: 35000 });
  const evs = fs.readFileSync(path.join(RUNS, run, 'events.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(e => e.type === 'build.done');
  assert.deepStrictEqual(evs.map(e => [e.version, !!e.background]), [[1, true], [2, false]]);
  assert.ok(codes.every(c => c === 200), `no 409 (${codes})`);
  await page.waitForFunction(() => BYOC.beat === 9, null, { timeout: 5000 }); // her page comes over the table, as before
  await page.close();
});
