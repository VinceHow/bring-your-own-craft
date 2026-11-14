// The app button: always visible from the first frame, a sensible state at every beat (stubbed events), and in the
// ready state it opens the app this run built, served live (200, the app's own HTML). The page route serves only a
// run's built page: traversal, other run files and data files are refused. No model calls: the page is filled by a
// fake model and the build's events are dispatched into the room.
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = new URL('..', import.meta.url).pathname;
const RUNS = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-app-'));
const PORT = 4320 + Math.floor(Math.random() * 30);
const BASE = `http://localhost:${PORT}`;
const RUN = 'run-app-e2e-1';
let srv, browser;

before(async () => {
  // A real built page for RUN, filled from the template's own defaults (a fake model), plus a private file beside it.
  process.env.RUNS_DIR = RUNS;
  const { fillPage, loadTemplate } = await import('../lib/fill.js');
  const tpl = loadTemplate('bakery');
  await fillPage({ run: RUN, outDir: path.join(RUNS, RUN, 'page'), idea: 'A website for a small bakery.', flow: { nodes: [], edges: [] },
    template: 'bakery', call: async () => ({ words: tpl.defaults.words, steps: tpl.defaults.steps, switches: { ...tpl.defaults.switches, phone: false }, decidedShown: [] }) });
  fs.writeFileSync(path.join(RUNS, RUN, 'events.jsonl'), JSON.stringify({ type: 'run.start', run: RUN, idea: 'private idea', t: Date.now() }) + '\n');
  fs.writeFileSync(path.join(RUNS, RUN, 'profile.json'), '{"private":true}');
  fs.mkdirSync(path.join(RUNS, 'other-run', 'page'), { recursive: true });
  fs.writeFileSync(path.join(RUNS, 'other-run', 'taste.md'), 'her file');
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, DEPLOY_URL: 'https://bakery.example.org/' } });
  let logs = ''; srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 60 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); });

// Visible and on top: the element at the button's centre is the button (or inside it).
const onTop = p => p.evaluate(() => {
  const b = document.querySelector('[data-component="app-button"] .app-open').getBoundingClientRect();
  const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  return b.width > 0 && !!at && !!at.closest('[data-component="app-button"]');
});

test('the app button: there from the first frame, never covered, a sensible state at every beat; opens the built app', async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  // the build's events are dispatched under a stub run the server doesn't know, and no run call reaches the server:
  // nothing here can start a real build or a model call
  await p.route('**/api/run/**', r => r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"stubbed"}' }));
  await p.goto(BASE + '/?hold=200');
  const state = () => p.getAttribute('[data-component="app-button"]', 'data-state');
  // first frame, her name tag on paper (beat 0)
  assert.equal(await state(), 'none');
  assert.match(await p.textContent('.app-button'), /No app yet · ?|No app yet/);
  assert.match(await p.textContent('.app-hint'), /Bo starts once you agree the page/);
  assert.ok(await p.isDisabled('.app-open'), 'nothing to open yet');
  assert.ok(await onTop(p), 'on top of the setup');
  // through the setup and the reveal, into the room (beat 4)
  await p.focus('#intro-input'); await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelectorAll('.seat .card[data-component="place-card"]').length >= 5, null, { timeout: 30000 });
  assert.equal(await state(), 'none'); assert.ok(await onTop(p), 'on top of the room');
  // the live site link (DEPLOY_URL is set for this server)
  await p.waitForSelector('.app-live:not([hidden])');
  assert.equal(await p.getAttribute('.app-live', 'href'), 'https://bakery.example.org/');
  // a build: building with its live step, then ready, with what changed
  await p.evaluate(() => { BYOC.run = 'stub-app'; BYOC.dispatch({ run: 'stub-app', type: 'build.step', step: 'Writing the page words from her flow, answers and file', t: Date.now() }, 'replay'); });
  assert.equal(await state(), 'building');
  assert.match(await p.textContent('.app-label'), /Building v1…/);
  assert.match(await p.textContent('.app-hint'), /Writing the page words/);
  await p.evaluate(run => BYOC.dispatch({ run: 'stub-app', type: 'build.done', url: `/runs/${run}/page/`, version: 1, changes: ['no phone field', 'Order by 8pm'], t: Date.now() }, 'replay'), RUN);
  assert.equal(await state(), 'ready');
  assert.match(await p.textContent('.app-label'), /Open the app/);
  assert.match(await p.textContent('.app-hint'), /v1, just now/);
  assert.equal(await p.textContent('.app-change'), 'v1 · no phone field, Order by 8pm');
  assert.equal(await p.getAttribute('[data-component="app-button"]', 'data-pulse'), '1', 'a new version pulses once');
  assert.ok(await onTop(p));
  // the click opens the app, live, in a new tab: 200 and the app's own HTML (its order form posts to /api/book)
  const [tab] = await Promise.all([p.context().waitForEvent('page'), p.click('.app-open')]);
  await tab.waitForLoadState('domcontentloaded');
  assert.equal(new URL(tab.url()).pathname, `/runs/${RUN}/page/`);
  const r = await p.request.get(BASE + `/runs/${RUN}/page/`);
  assert.equal(r.status(), 200);
  assert.match(await r.text(), /action="\/api\/book"/);
  assert.ok(await tab.locator('form.form').count() > 0, 'the app is a working page: its order form is there');
  assert.equal(await tab.locator('input[type="tel"]').count(), 0, 'it is this build (no phone field)');
  await tab.close();
  // v2 lands: pulses again and says what changed; a failed build keeps the last app openable
  await p.waitForTimeout(1900);
  await p.evaluate(run => { BYOC.dispatch({ run: 'stub-app', type: 'build.step', step: 'Re-deciding the rest against her file', t: Date.now() }, 'replay'); }, RUN);
  assert.equal(await state(), 'building'); assert.match(await p.textContent('.app-label'), /Building v2…/);
  assert.ok(!(await p.isDisabled('.app-open')), 'v1 stays openable while v2 builds');
  await p.evaluate(run => BYOC.dispatch({ run: 'stub-app', type: 'build.step', step: 'Build failed: model timeout after 120000 ms', t: Date.now() }, 'replay'), RUN);
  assert.equal(await state(), 'ready'); assert.match(await p.textContent('.app-hint'), /stopped/);
  await p.evaluate(run => BYOC.dispatch({ run: 'stub-app', type: 'build.done', url: `/runs/${run}/page/`, version: 2, changes: ['remembers no one'], t: Date.now() }, 'replay'), RUN);
  assert.match(await p.textContent('.app-hint'), /v2, just now/);
  assert.equal(await p.textContent('.app-change'), 'v2 · remembers no one');
  assert.equal(await p.getAttribute('[data-component="app-button"]', 'data-pulse'), '1');
  // reset (a new run): back to none
  await p.evaluate(() => BYOC.reset && BYOC.reset());
  if (await p.evaluate(() => typeof BYOC.reset === 'function')) assert.equal(await state(), 'none');
  assert.deepStrictEqual(errors, []);
  await p.close();
});

test('the page route serves only a run\'s built page: traversal, other run files and data files are refused', async () => {
  const get = async u => (await fetch(BASE + u)).status;
  assert.equal(await get(`/runs/${RUN}/page/`), 200);
  assert.equal(await get(`/runs/${RUN}/page/index.html`), 200);
  for (const u of [`/runs/${RUN}/events.jsonl`, `/runs/${RUN}/profile.json`, `/runs/${RUN}/page/slots.json`, '/runs/other-run/taste.md',
    `/runs/${RUN}/page/..%2fevents.jsonl`, `/runs/${RUN}/page/..%2f..%2fother-run%2ftaste.md`, '/runs/..%2fpackage.json', '/runs/..%2f..%2fetc%2fpasswd',
    `/runs/${RUN}/page/%2e%2e/profile.json`, '/runs/%2e%2e/server.js']) {
    const s = await get(u);
    assert.ok(s === 403 || s === 404 || s === 400, `${u} refused (got ${s})`);
  }
});
