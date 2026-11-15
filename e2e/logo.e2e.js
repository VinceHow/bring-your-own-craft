// The live logo on her built page, in a real browser (stubbed: the image call is a stand-in, no fal). Success: the
// brand mark is the local logo.jpg (loaded, served from the page folder), the footer says "painted live with fal", and
// no fal URL is anywhere in the page. Timeout: the page keeps its usual mark and says nothing about a live logo.
// Her page is the same in both looks; E2E_LOOK only changes the room, so the room is loaded once in each look too.
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
const RUNS = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-logo-'));
const PORT = 4440 + Math.floor(Math.random() * 30);
const BASE = `http://localhost:${PORT}`;
const LOOK = process.env.E2E_LOOK || 'painted';
let srv, browser;

// A real JPEG: the 1x1 white pixel, padded is not needed; the browser only has to decode it.
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

before(async () => {
  process.env.RUNS_DIR = RUNS; process.env.MODEL_QUIET = '1';
  const { fillPage, loadTemplate } = await import('../lib/fill.js');
  const tpl = loadTemplate('bakery');
  const call = async () => ({ words: tpl.defaults.words, steps: tpl.defaults.steps, switches: tpl.defaults.switches, decidedShown: [] });
  const base = run => ({ run, outDir: path.join(RUNS, run, 'page'), idea: 'An ordering website for a small bakery.', flow: { nodes: [], edges: [] }, template: 'bakery', call });
  await fillPage({ ...base('run-logo-live'), paint: async ({ outDir }) => { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'logo.jpg'), JPEG); return { ok: true, file: 'logo.jpg', ms: 5 }; } });
  // the timeout path, as lib/logo.js reports it after 6 s: never waited for, so the fill writes the usual mark
  await fillPage({ ...base('run-logo-timeout'), paint: () => new Promise(r => setTimeout(() => r({ ok: false, why: 'timeout after 6000 ms' }), 2000)) });
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  let logs = ''; srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 80 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); });

test(`the live logo lands: the local image on her page, credited, no fal URL (${LOOK})`, async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`${BASE}/?look=${LOOK}`); await p.waitForFunction(() => window.BYOC && BYOC.dispatch); // the room, in this look
  await p.goto(`${BASE}/runs/run-logo-live/page/`);
  const img = p.locator('img.mark--live').first();
  await img.waitFor();
  assert.ok(await img.evaluate(i => i.complete && i.naturalWidth > 0), 'the logo loaded from the page folder');
  assert.strictEqual(await img.getAttribute('src'), 'logo.jpg');
  assert.match(await p.textContent('.logo-credit'), /Logo painted live with fal/);
  const html = await (await p.request.get(`${BASE}/runs/run-logo-live/page/`)).text();
  assert.doesNotMatch(html, /fal\.(run|media|ai)|https?:\/\/[^"']*fal/i, 'no fal URL in the page');
  assert.doesNotMatch(html, /Key [A-Za-z0-9_-]{12,}|FAL_KEY/, 'nothing key-shaped');
  assert.strictEqual((await p.request.get(`${BASE}/runs/run-logo-live/page/logo.jpg`)).status(), 200);
  assert.deepStrictEqual(errs, []);
  await p.close();
});

test(`the logo times out: the page keeps its usual mark, says nothing (${LOOK})`, async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`${BASE}/runs/run-logo-timeout/page/`);
  assert.strictEqual(await p.locator('img.mark--live').count(), 0);
  assert.ok(await p.locator('.mark[data-mark="dots"]').count() > 0, 'the usual mark');
  assert.strictEqual(await p.locator('.logo-credit').count(), 0);
  await p.close();
});
