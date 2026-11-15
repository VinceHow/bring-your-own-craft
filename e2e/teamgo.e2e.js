// "Sounds good. Let's build it" (the next Mac report): at "What's the idea?", a short go-phrase starts the team like an
// empty Enter, and the "Team, go →" button does too; a longer reaction stays a redraw. The team's start is visible within
// 300 ms and never silent: working, slow, failed with Retry, done. Model routes stubbed. Run: node --test e2e/teamgo.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3600 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-teamgo-e2e-');
let srv, logs = '', browser;

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 80 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

// Her idea written, the sheet in "shape the journey" mode. propose(route, n) decides what the team-start call does.
async function atTheIdea(propose, query = '') {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const calls = { propose: 0, line: 0, reshape: 0 };
  await page.route('**/api/tidy', r => r.fulfill({ json: { text: JSON.parse(r.request().postData() || '{}').text || '', tidied: false } })); // the tidy answers at once: no model
  await page.route(/\/api\/run$/, r => r.fulfill({ status: 200, json: { run: 'stub-run' } }));
  await page.route('**/api/run/*/sketch', r => r.fulfill({ status: 202, json: { started: true } }));
  await page.route('**/api/run/*/line', r => { calls.line++; return r.fulfill({ status: 200, json: { ok: true } }); });
  await page.route('**/api/run/*/reshape', r => { calls.reshape++; return r.fulfill({ status: 202, json: { ok: true } }); });
  await page.route('**/api/run/*/propose', async r => { calls.propose++; await propose(r, calls.propose); });
  await page.route('**/api/taste/**', r => r.fulfill({ status: 404, json: {} }));
  await page.goto(BASE + '/' + query);
  await page.waitForFunction(() => window.BYOC && BYOC.stage && BYOC.isGo);
  await page.evaluate(() => BYOC.stage(3));
  await page.waitForFunction(() => !document.getElementById('her-form').hidden, null, { timeout: 5000 });
  await page.fill('#her-input', 'A website for a small bakery, so customers can order bread ahead.');
  await page.press('#her-input', 'Enter');
  await page.waitForFunction(() => BYOC.run === 'stub-run' && BYOC.beat === 4 && !document.getElementById('her-form').hidden, null, { timeout: 5000 });
  return { page, errors, calls };
}
const teamState = page => page.evaluate(() => ({ state: document.getElementById('team-status')?.dataset.state, text: document.getElementById('team-status')?.textContent || '', hidden: document.getElementById('team-status')?.hidden }));
const started = r => r.fulfill({ status: 202, json: { started: true } });
const live = (page, evs) => page.evaluate(evs => { for (const e of evs) BYOC.dispatch({ run: 'stub-run', ...e }, 'live'); }, evs);

test('"Sounds good. Let\'s build it" + Enter starts the team, visibly, within 300 ms; then progress; then done', async () => {
  const { page, errors, calls } = await atTheIdea(started);
  await page.fill('#her-input', "Sounds good. Let's build it");
  const t0 = Date.now();
  await page.press('#her-input', 'Enter');
  await page.waitForFunction(() => document.getElementById('team-status')?.dataset.state === 'working', null, { timeout: 300 });
  assert.ok(Date.now() - t0 <= 450, `visible in ${Date.now() - t0} ms`);
  const s = await teamState(page);
  assert.equal(s.hidden, false);
  assert.match(s.text, /are on it/);
  assert.equal(await page.evaluate(() => document.getElementById('room').dataset.team), 'working');
  await page.waitForFunction(() => BYOC.beat === 5, null, { timeout: 3000 });
  assert.equal(calls.propose, 1);
  assert.equal(calls.reshape + calls.line, 0, 'not taken as a redraw');
  await live(page, [{ type: 'teammate.done', seat: 'design' }, { type: 'teammate.done', seat: 'data' }]);
  assert.match((await teamState(page)).text, /2 of 5 done/);
  await live(page, [{ type: 'select.done' }]);
  assert.equal((await teamState(page)).state, 'done');
  assert.deepStrictEqual(errors, []);
  await page.close();
});

test('the "Team, go →" button starts the team too', async () => {
  const { page, calls } = await atTheIdea(started);
  assert.ok(await page.isVisible('#team-go'), 'the button shows while she shapes the journey');
  await page.click('#team-go');
  await page.waitForFunction(() => document.getElementById('team-status')?.dataset.state === 'working', null, { timeout: 300 });
  await page.waitForFunction(() => BYOC.beat === 5, null, { timeout: 3000 });
  assert.equal(calls.propose, 1);
  await page.close();
});

test('a longer reaction stays a redraw: the team does not start', async () => {
  const { page, calls } = await atTheIdea(started);
  await page.fill('#her-input', "It's really for the regulars, who come every morning");
  await page.press('#her-input', 'Enter');
  await page.waitForTimeout(500);
  assert.equal(calls.propose, 0);
  assert.equal((await teamState(page)).state, 'idle');
  assert.ok(await page.evaluate(() => BYOC.beat === 4));
  await page.close();
});

test('slow: no teammate has reported yet, so it says it is still starting', async () => {
  const { page } = await atTheIdea(started, '?teamslow=1200');
  await page.fill('#her-input', 'go');
  await page.press('#her-input', 'Enter');
  await page.waitForFunction(() => document.getElementById('team-status')?.dataset.state === 'slow', null, { timeout: 4000 });
  assert.match((await teamState(page)).text, /still starting/i);
  await page.close();
});

test('failed: a plain line and Retry; Retry starts the team again', async () => {
  const { page, calls } = await atTheIdea((r, n) => n === 1 ? r.fulfill({ status: 500, json: { error: 'model timeout' } }) : started(r));
  await page.fill('#her-input', 'looks good');
  await page.press('#her-input', 'Enter');
  await page.waitForFunction(() => document.getElementById('team-status')?.dataset.state === 'failed', null, { timeout: 4000 });
  assert.match((await teamState(page)).text, /couldn’t start/);
  await page.click('#team-status [data-slot="retry"]');
  await page.waitForFunction(() => document.getElementById('team-status')?.dataset.state === 'working', null, { timeout: 1000 });
  assert.equal(calls.propose, 2);
  // A failure the server reports later (propose.error) also shows, with Retry.
  await live(page, [{ type: 'propose.error', error: 'model timeout' }]);
  assert.equal((await teamState(page)).state, 'failed');
  await page.close();
});
