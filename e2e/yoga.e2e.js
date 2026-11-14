// End-to-end: walks the yoga script through the real UI (BRIEF §5 "one shot"). Lead-owned.
// Run: npm run e2e. Steps whose piece hasn't merged yet are `todo` (pending), never skipped silently.
// Uses the real model backend unless E2E_FAKE_MODEL=1 (not built yet).
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const SENTINEL = 'fal-sentinel-' + Math.random().toString(36).slice(2) + '-DO-NOT-LEAK';
const RUNS = fs.mkdtempSync('/tmp/byoc-e2e-runs-');
let srv, logs = '', browser, page, consoleErrors = [], bodies = [];

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, FAL_KEY: SENTINEL } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 50 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('console', m => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', e => consoleErrors.push(String(e)));
  page.on('response', async r => { try { bodies.push(await r.text()); } catch {} });
});
after(async () => { await browser?.close(); srv?.kill(); });

const has = expr => page.evaluate(expr).catch(() => false);

test('1. the room loads with no console errors', async () => {
  await page.goto(BASE + '/');
  await page.waitForTimeout(1500);
  assert.deepStrictEqual(consoleErrors, []);
});

test('2. five seats, her card in Product, BYOC seams present', async t => {
  if (!(await has('!!(window.BYOC && BYOC.el && BYOC.el.herSheet)'))) return t.todo('room not merged');
  for (const s of ['product', 'design', 'data', 'research', 'engineering'])
    assert.ok(await page.locator(`[data-seat="${s}"]`).count(), `seat ${s} on the table`);
});

test('3. she writes the idea and her journey; lines become boxes', async t => {
  if (!(await has('!!(window.BYOC && BYOC.flow && BYOC.flow.addLine)'))) return t.todo('flow not merged');
  if (!(await has('fetch("/api/run",{method:"POST",body:"{}"}).then(r=>r.status!==404)'))) return t.todo('run routes not merged');
  t.todo('drive the idea + 5 journey lines through her sheet; assert 5 boxes and 4 arrows + 1 branch');
});

test('4. at most three asks arrive, inside her work (fork or pin), never a pop-up', async t => {
  t.todo('selector + room: count ask events == fork/pin elements on her flow, <= 3, no [role=dialog]');
});

test('5. her pin -> "Sounds like" -> written to her file', async t => {
  t.todo('pin "Cut the phone field. Name's enough; regulars hate forms." on the confirm node; reword; assert runs/<id>/taste.md has the new line');
});

test('6. Build -> page reflects her choices; a decision cites her new line', async t => {
  t.todo('press build; wait build.done; page has no phone field; "decided for you" cites the new line id');
});

test('7. counter and meter match the log', async t => {
  t.todo('compare on-screen counter/meter with tally computed from runs/<id>/events.jsonl');
});

test('8. the fal key appears nowhere (runs/, logs, any HTTP response)', async () => {
  const hits = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name); f.isDirectory() ? walk(p) : fs.readFileSync(p, 'utf8').includes(SENTINEL) && hits.push(p); } };
  walk(RUNS);
  if (logs.includes(SENTINEL)) hits.push('server logs');
  bodies.forEach((b, i) => b.includes(SENTINEL) && hits.push('response ' + i));
  const health = await (await fetch(BASE + '/api/health')).text();
  if (health.includes(SENTINEL)) hits.push('/api/health');
  assert.deepStrictEqual(hits, []);
});
