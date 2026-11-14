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
// E2E_SCREENS=docs/screens saves the live screenshots there. Beat timings print at the end.
const SCREENS = process.env.E2E_SCREENS ? path.resolve(ROOT, process.env.E2E_SCREENS) : null;
const shot = name => SCREENS && page.screenshot({ path: path.join(SCREENS, name) });
const T = {}; let tBeat = Date.now();
const lap = name => { const now = Date.now(); T[name] = ((now - tBeat) / 1000).toFixed(1) + ' s'; tBeat = now; };
const events = () => page.evaluate(() => BYOC.events());
const waitFor = async (fn, ms, what, arg) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await page.evaluate(fn, arg).catch(() => false)) return; await page.waitForTimeout(250); }
  throw new Error('timed out waiting for ' + what);
};
// The number a rolling counter shows, read from where each digit column sits.
const shown = id => page.evaluate(id => [...document.querySelectorAll(`#${id} .col`)]
  .map(c => Math.round(-parseFloat((c.style.transform.match(/-?[\d.]+/) || ['0'])[0]))).join(''), id);
let RUN = null;

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, FAL_KEY: SENTINEL } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 50 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: SCREENS ? 2 : 1 });
  page.on('console', m => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', e => consoleErrors.push(String(e)));
  page.on('response', async r => { try { bodies.push(await r.text()); } catch {} });
});
after(async () => { console.log('beat timings:', JSON.stringify(T)); await browser?.close(); srv?.kill(); });

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
  tBeat = Date.now();
  await page.keyboard.press('ArrowRight'); // her card
  await page.keyboard.press('ArrowRight'); // the team, one by one
  await waitFor(() => document.querySelectorAll('.seat .card').length === 5, 8000, 'five cards');
  await page.waitForTimeout(1200); // the last card settles
  lap('0:00 walk-in');
  assert.ok(await page.locator('.seat-product .card').count(), 'her card in Product');
  for (const stance of ['sketch first, polish last', 'only what we’ll measure', 'what’s known, with sources', 'boring and correct'])
    assert.ok(await page.getByText(stance).count(), `stance "${stance}" on a place card`);
  assert.strictEqual(await page.getByText('Own mode for this seat: coming.').count(), 4);
  for (const k of ['api', 'on', 'stage', 'el']) assert.ok(await has(`!!BYOC.${k}`), `BYOC.${k}`);
  await shot('live-walk-in.png');
});

test('3. she writes the idea and her journey; lines become boxes', async t => {
  if (!(await has('!!(window.BYOC && BYOC.flow && BYOC.flow.addLine)'))) return t.todo('flow not merged');
  if (!(await has('fetch("/api/run",{method:"POST",body:"{}"}).then(r=>r.status!==404)'))) return t.todo('run routes not merged');
  await page.keyboard.press('ArrowRight'); // her sheet
  await waitFor(() => document.activeElement && document.activeElement.id === 'her-input', 3000, 'her input focused');
  assert.ok(await page.getByText('What are we building today?').count());
  await page.keyboard.type('A booking page for a small yoga studio.');
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.run && !BYOC.run.startsWith('local-'), 5000, 'a run id');
  RUN = await page.evaluate(() => BYOC.run);
  for (const l of ['classes', 'a class', 'confirm', 'booked', 'regulars → "Book your usual"']) {
    await page.keyboard.type(l); await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
  }
  await waitFor(() => document.querySelectorAll('#her-flow .fl-box').length === 5, 5000, 'five boxes');
  lap('0:22 idea + journey');
  const edges = await page.evaluate(() => BYOC.flow._state.edges);
  // classes -> a class -> confirm -> booked is 3 arrows; regulars -> "Book your usual" is the 4th, a labelled branch.
  assert.strictEqual(edges.length, 4, '4 arrows');
  assert.deepStrictEqual(edges.filter(e => e.label).map(e => e.label), ['regulars'], 'one of them the regulars branch');
  const logged = (await events()).filter(e => e.type === 'flow.line');
  assert.strictEqual(logged.length, 5, 'each line logged once');
});

test('4. at most three asks arrive, inside her work (fork or pin), never a pop-up', async t => {
  if (!RUN) return t.todo('needs step 3');
  await page.keyboard.press('Enter'); // an empty line: team, go
  await waitFor(() => BYOC.events().some(e => e.type === 'select.done' || e.type === 'propose.error'), 110000, 'the team and the selector');
  lap('0:55 team works (propose + select)');
  const evs = await events();
  assert.ok(!evs.some(e => e.type === 'propose.error'), 'propose ran');
  const asks = evs.filter(e => e.type === 'ask');
  assert.ok(asks.length >= 1 && asks.length <= 3, `1 to 3 asks, got ${asks.length}`);
  await waitFor(n => document.querySelectorAll('#her-flow .fl-fork, #her-flow .fl-pin').length >= n, 5000, 'asks in her flow', asks.length);
  await page.waitForTimeout(800);
  assert.strictEqual(await page.locator('#her-flow .fl-fork, #her-flow .fl-pin').count(), asks.length, 'one fork or pin per ask');
  assert.strictEqual(await page.locator('[role=dialog], dialog, .modal').count(), 0, 'no pop-up');
  await shot('live-asks.png');
  // She overrules the team on the first, and takes the recommendation on the rest.
  let overruled = null;
  for (let i = 0; i < asks.length; i++) {
    const item = page.locator('#her-flow .fl-fork, #her-flow .fl-pin').nth(i);
    const rec = item.locator('.fl-opt.is-rec'), other = item.locator('.fl-opt:not(.is-rec)');
    if (!overruled && (await rec.count()) && (await other.count())) {
      overruled = i + 1;
      await other.first().click();
      await page.waitForTimeout(400);
      const struck = item.locator('.fl-opt.is-rec.is-dropped .fl-otext');
      assert.strictEqual(await struck.count(), 1, 'the recommendation she passed over is marked dropped');
      assert.match(await struck.evaluate(e => getComputedStyle(e).textDecorationLine), /line-through/, 'and struck through');
      assert.strictEqual(await item.locator('.fl-opt.is-chosen .fl-yours').innerText(), 'YOUR CALL');
    } else {
      await ((await rec.count()) ? rec.first() : item.locator('.fl-opt').first()).click();
    }
    await page.waitForTimeout(300);
  }
  assert.ok(overruled, 'she overruled the team at least once');
  await waitFor(n => new Set(BYOC.events().filter(e => e.type === 'answer').map(e => e.askId)).size >= n, 8000, 'her answers logged', asks.length);
  lap('1:10 her three answered');
});

test('5. her pin -> "Sounds like" -> written to her file', async t => {
  if (!RUN) return t.todo('needs step 3');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowRight'); // Design's sketches slide over
  await waitFor(() => document.querySelectorAll('#sketch-sheet .sk-frame').length > 0, 90000, 'grey sketches');
  lap('1:45 sketches on the table (after answers)');
  // She makes a call on the confirm step, on its sketch.
  const confirmId = await page.evaluate(() => [...BYOC.flow._state.nodes.values()].find(n => n.label === 'confirm')?.id);
  const frame = page.locator(`#sketch-sheet .sk-frame[data-node="${confirmId}"]`);
  assert.strictEqual(await frame.count(), 1, 'a sketch of the confirm step');
  await frame.click({ position: { x: 60, y: 120 } });
  await page.waitForSelector('.fl-draft textarea', { timeout: 3000 });
  await page.keyboard.type('Cut the phone field. Name\'s enough; regulars hate forms.');
  await page.keyboard.press('Enter');
  await waitFor(() => document.querySelector('#sounds-like .sl-words')?.isContentEditable, 60000, '"Sounds like" on her file card');
  lap('1:50 pin -> "Sounds like" typed');
  const pinEv = (await events()).find(e => e.type === 'pin');
  assert.strictEqual(pinEv.nodeId, confirmId, 'pinned on the confirm node');
  const suggested = (await events()).filter(e => e.type === 'taste.suggested').at(-1);
  assert.ok(suggested && /^Sounds like:/i.test(suggested.text), 'a "Sounds like" line was suggested');
  await shot('live-sounds-like.png');
  // She rewords it inline and keeps it.
  const mine = 'Never ask for anything you could remember or skip.';
  await page.keyboard.press('Control+A');
  await page.keyboard.type(mine);
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.events().some(e => e.type === 'taste.written'), 8000, 'her line written');
  lap('2:00 reworded line written');
  const written = (await events()).find(e => e.type === 'taste.written');
  assert.strictEqual(written.text, mine);
  assert.strictEqual(written.reworded, true);
  const md = fs.readFileSync(path.join(RUNS, RUN, 'taste.md'), 'utf8');
  assert.ok(md.includes(`- [${written.id}] ${mine}`), 'the new line is in runs/<id>/taste.md');
  await waitFor(id => !!document.querySelector(`#file-lines li[data-id="${id}"]`), 3000, 'the new line on her file card', written.id);
  await page.waitForTimeout(500);
  await shot('live-file-card.png');
});

test('6. Build -> page reflects her choices; a decision cites her new line', async t => {
  if (!RUN) return t.todo('needs step 3');
  const written = (await events()).find(e => e.type === 'taste.written');
  if (!written) return t.todo('needs step 5');
  // Her one press. The room's own build key/button is piece 1's; until it exists, the same POST the button makes.
  const pressed = await page.evaluate(() => typeof BYOC.build === 'function' ? (BYOC.build(), 'room') : null);
  if (!pressed) await page.evaluate(run => BYOC.api(`/api/run/${run}/build`, {}), RUN);
  await waitFor(() => BYOC.events().some(e => e.type === 'build.done' || /^Build failed/.test(e.step || '')), 120000, 'build.done');
  lap('2:05 build done');
  const evs = await events();
  const steps = evs.filter(e => e.type === 'build.step').map(e => e.step);
  assert.ok(!steps.some(s => /^Build failed/.test(s)), 'build ran: ' + steps.join(' / '));
  assert.ok(steps.length >= 3, 'the build shows its steps');
  const done = evs.find(e => e.type === 'build.done');
  assert.strictEqual(done.url, `/runs/${RUN}/page/`);
  // The build re-decided the rest against her updated file, and at least one decision cites her new line.
  const redecided = evs.filter(e => e.type === 'decided' && e.round === 'build');
  assert.ok(redecided.some(d => d.cites === written.id), `a re-decision cites ${written.id}: ${redecided.map(d => d.id + ':' + d.cites).join(' ')}`);
  // Her page.
  const pg = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SCREENS ? 2 : 1 });
  await pg.goto(BASE + done.url, { waitUntil: 'networkidle' });
  assert.strictEqual(await pg.locator('input[type=tel]').count(), 0, 'no phone field (her pin)');
  const cited = pg.locator(`#decided [data-decided][data-cites="${written.id}"]`);
  assert.ok(await cited.count() >= 1, `"decided for you" shows a decision citing ${written.id}`);
  assert.match(await cited.first().innerText(), /remember or skip/i, 'with her line quoted');
  assert.match(await pg.locator('h1').innerText(), /\S/, 'her page has a headline');
  // Her answers reach the fill as hers, the overruled one marked so (the page follows her branch, not the team's).
  const slots = JSON.parse(fs.readFileSync(path.join(RUNS, RUN, 'page', 'slots.json'), 'utf8'));
  const answered = evs.filter(e => e.type === 'answer');
  assert.strictEqual(slots.inputs.answers.filter(a => a.decision !== 'her pinned note').length, answered.length, 'every answer reached the fill');
  assert.ok(slots.inputs.answers.some(a => a.overruled), 'her overruled call reached the fill as overruled');
  if (SCREENS) {
    await pg.screenshot({ path: path.join(SCREENS, 'live-page.png') });
    await cited.first().scrollIntoViewIfNeeded();
    await pg.screenshot({ path: path.join(SCREENS, 'live-page-decided.png') });
  }
  await pg.close();
});

test('7. counter and meter match the log', async t => {
  if (!RUN) return t.todo('needs step 3');
  const { tally } = await import('../lib/tally.js');
  const log = fs.readFileSync(path.join(RUNS, RUN, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const want = tally(log);
  await page.waitForTimeout(1200); // the last roll settles
  assert.strictEqual(await shown('came'), String(want.came), 'decisions came up');
  assert.strictEqual(await shown('brought'), String(want.brought), 'brought to you');
  assert.strictEqual(await shown('pct'), String(want.meter.pct), 'IN YOUR CRAFT %');
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
