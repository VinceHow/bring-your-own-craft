// End-to-end, the studio main path (DEMO.md §1): her idea -> Design's first sketch -> her reaction redraws it -> a box
// edit -> the team works on that shape -> her check-ins -> her page. Real model backend. Owned by the first-sketch piece.
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4100 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const SENTINEL = 'fal-sentinel-' + Math.random().toString(36).slice(2) + '-DO-NOT-LEAK';
const RUNS = fs.mkdtempSync('/tmp/byoc-studio-runs-');
let srv, logs = '', browser, page, consoleErrors = [], bodies = [], RUN = null;
const T = {}; let tBeat = Date.now();
const lap = name => { const now = Date.now(); T[name] = ((now - tBeat) / 1000).toFixed(1) + ' s'; tBeat = now; };
const events = () => page.evaluate(() => BYOC.events());
const waitFor = async (fn, ms, what, arg) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await page.evaluate(fn, arg).catch(() => false)) return; await page.waitForTimeout(150); }
  throw new Error('timed out waiting for ' + what);
};
const boxLabels = () => page.evaluate(() => [...document.querySelectorAll('#her-flow .fl-box .fl-label')].map(e => e.textContent));
const lastFlow = evs => evs.filter(e => e.type === 'flow.line').at(-1);

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, FAL_KEY: SENTINEL } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 50 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  page.on('console', m => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', e => consoleErrors.push(String(e)));
  page.on('response', async r => { try { bodies.push(await r.text()); } catch {} });
});
after(async () => { console.log('studio timings:', JSON.stringify(T)); await browser?.close(); srv?.kill(); });

test('1. her seat, the team, her line, then her idea', async () => {
  await page.goto(BASE + '/?hold=300');
  await page.click('.seat-product');
  await waitFor(() => document.activeElement?.id === 'intro-input', 40000, 'her card open');
  await page.keyboard.type('getting the journey right before anyone draws a screen.');
  await page.keyboard.press('Enter');
  await waitFor(() => document.activeElement?.id === 'her-input', 5000, 'her input focused');
  tBeat = Date.now();
  await page.keyboard.type('A booking page for a small yoga studio.');
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.run && !BYOC.run.startsWith('local-'), 5000, 'a run id');
  RUN = await page.evaluate(() => BYOC.run);
});

test('2. Design sketches it: user cards and boxes draw in, within 10 s, not typed by her', async t => {
  if (!RUN) return t.skip('needs step 1');
  await waitFor(() => document.querySelectorAll('.fs-user').length >= 1, 12000, 'the first user card');
  lap('first user card');
  await waitFor(() => BYOC.events().some(e => e.type === 'sketch.done'), 15000, 'sketch.done');
  lap('whole sketch drawn');
  const evs = await events();
  const done = evs.find(e => e.type === 'sketch.done');
  T.sketchModelMs = done.ms;
  assert.ok(!done.skipped, 'sketch drawn');
  const users = evs.filter(e => e.type === 'sketch.user');
  assert.ok(users.length >= 2 && users.length <= 4, `2-4 user types, got ${users.length}`);
  assert.strictEqual(await page.locator('.fs-user').count(), users.length, 'one card per user type');
  const flow = lastFlow(evs);
  assert.ok(flow.nodes.length >= 4 && flow.nodes.length <= 9, `4-7 stages (plus branches), got ${flow.nodes.length}`);
  await waitFor(n => document.querySelectorAll('#her-flow .fl-box').length === n, 3000, 'one box per stage', flow.nodes.length);
  assert.deepStrictEqual(await boxLabels(), flow.nodes.map(n => n.label));
  if (done.prepared) assert.match(await page.locator('.fs-tag').innerText(), /PREPARED/, 'a prepared sketch says so');
  else assert.ok(done.ms <= 10000, `sketch in ${done.ms} ms`);
});

test('3. her reaction redraws the shape: replaced, not appended; her words shown', async t => {
  if (!RUN) return t.skip('needs step 1');
  const said = "It's really for the regulars. Most bookings are the same class every week.";
  // Through the voice hook, as speech would arrive, then Enter.
  assert.ok(await page.evaluate(s => BYOC.typeInto(s), said), 'BYOC.typeInto reached her input');
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.events().some(e => e.type === 'sketch.done' && e.reshape), 15000, 'the redraw');
  lap('reshape');
  const evs = await events();
  const r = evs.find(e => e.type === 'reshape');
  assert.strictEqual(r.text, said);
  assert.strictEqual(r.mode, 'craft');
  T.reshapeModelMs = evs.find(e => e.type === 'sketch.done' && e.reshape).ms;
  const reset = evs.findIndex(e => e.type === 'flow.reset');
  assert.ok(reset > evs.indexOf(r), 'flow.reset after her reaction');
  const flow = lastFlow(evs);
  await waitFor(n => document.querySelectorAll('#her-flow .fl-box').length === n, 3000, 'the redrawn boxes only', flow.nodes.length);
  assert.deepStrictEqual(await boxLabels(), flow.nodes.map(n => n.label));
  assert.match(await page.locator('.fs-said').innerText(), /regulars/);
  assert.match(flow.nodes.map(n => n.label).join(' ') + ' ' + evs.filter(e => e.type === 'sketch.user').map(e => e.label).join(' '), /regular|usual/i, 'the shape follows what she said');
});

test('4. she renames a box by clicking it; no model', async t => {
  if (!RUN) return t.skip('needs step 1');
  const before = (await events()).filter(e => e.type === 'flow.reset').length;
  const box = page.locator('#her-flow .fl-box').last();
  await box.click();
  await waitFor(() => document.activeElement?.matches('.fs-pop input'), 2000, 'the rename box focused');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('See you next week');
  await page.keyboard.press('Enter');
  await waitFor(n => BYOC.events().filter(e => e.type === 'flow.reset').length > n, 3000, 'her edit logged', before);
  await waitFor(() => [...document.querySelectorAll('#her-flow .fl-label')].some(e => e.textContent === 'See you next week'), 3000, 'the renamed box');
  const evs = await events();
  const reset = evs.filter(e => e.type === 'flow.reset').at(-1);
  assert.strictEqual(reset.by, 'her');
  assert.deepStrictEqual(reset.touched, ['See you next week']);
  assert.ok(!evs.some(e => e.type === 'pin'), 'a click in this beat edits; it does not pin a note');
});

test('5. the team works on her shape; check-ins sit on its boxes; leans are real', async t => {
  if (!RUN) return t.skip('needs step 1');
  await page.locator('#her-input').focus();
  await page.keyboard.press('Enter'); // an empty line: team, go
  await waitFor(() => BYOC.events().some(e => e.type === 'select.done' || e.type === 'propose.error'), 150000, 'the team and the selector');
  lap('team works');
  const evs = await events();
  assert.ok(!evs.some(e => e.type === 'propose.error'), 'propose ran');
  const ids = new Set(lastFlow(evs).nodes.map(n => n.id));
  const cands = evs.filter(e => e.type === 'candidate');
  assert.ok(cands.some(c => c.attachTo && ids.has(c.attachTo)), 'candidates attach to the sketched boxes');
  assert.ok(cands.every(c => c.attachTo === null || ids.has(c.attachTo)));
  // Every lean is a candidate on a box she touched; every such candidate's seat leaned on it.
  const touched = lastFlow(evs).nodes.filter(n => evs.filter(e => e.type === 'flow.reset').flatMap(e => e.touched || []).includes(n.label)).map(n => n.id);
  const want = new Set(cands.filter(c => touched.includes(c.attachTo)).map(c => `${c.seat}:${c.attachTo}`));
  const got = new Set(evs.filter(e => e.type === 'lean').map(l => `${l.seat}:${l.nodeId}`));
  assert.deepStrictEqual([...got].sort(), [...want].sort(), 'leans match the log');
  T.leans = got.size;
  const asks = evs.filter(e => e.type === 'ask');
  assert.ok(asks.length >= 1 && asks.length <= 3, `1 to 3 check-ins, got ${asks.length}`);
  assert.ok(asks.every(a => a.attachTo === null || ids.has(a.attachTo)), 'check-ins on her shape');
});

test('6. she answers the check-ins, overruling once', async t => {
  if (!RUN) return t.skip('needs step 1');
  const asks = (await events()).filter(e => e.type === 'ask');
  let overruled = false;
  for (let i = 0; i < asks.length; i++) {
    await waitFor(() => !!document.querySelector('#her-flow .fl-item.is-open'), 8000, 'an open check-in');
    const id = await page.locator('#her-flow .fl-item.is-open').getAttribute('data-ask');
    const item = page.locator(`#her-flow .fl-item[data-ask="${id}"]`);
    const rec = item.locator('.fl-opt.is-rec'), other = item.locator('.fl-opt:not(.is-rec)');
    if (!overruled && (await rec.count()) && (await other.count())) { overruled = true; await other.first().click(); }
    else await ((await rec.count()) ? rec.first() : item.locator('.fl-opt').first()).click();
    await waitFor(n => new Set(BYOC.events().filter(e => e.type === 'answer').map(e => e.askId)).size >= n, 5000, 'answer logged', i + 1);
    await page.waitForTimeout(1300);
  }
  assert.ok(overruled, 'she overruled the team once');
  lap('check-ins answered');
});

test('7. her page is built on her shape', async t => {
  if (!RUN) return t.skip('needs step 1');
  await page.evaluate(() => BYOC.build());
  await waitFor(() => BYOC.events().some(e => e.type === 'build.done' || /^Build failed/.test(e.step || '')), 150000, 'build.done');
  lap('build');
  const done = (await events()).find(e => e.type === 'build.done');
  assert.ok(done, 'built');
  const pg = await browser.newPage();
  await pg.goto(BASE + done.url, { waitUntil: 'networkidle' });
  assert.match(await pg.locator('h1').innerText(), /\S/);
  await pg.close();
});

test('8. no console errors; the fal key appears nowhere', async () => {
  assert.deepStrictEqual(consoleErrors, []);
  const hits = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name); f.isDirectory() ? walk(p) : fs.readFileSync(p, 'utf8').includes(SENTINEL) && hits.push(p); } };
  walk(RUNS);
  if (logs.includes(SENTINEL)) hits.push('server logs');
  bodies.forEach((b, i) => b.includes(SENTINEL) && hits.push('response ' + i));
  assert.deepStrictEqual(hits, []);
});
