// End-to-end: the keyboard-driven demo, walk-in to the close, in stage mode, with real model calls.
// Run: npm run e2e (or node --test e2e/beats.e2e.js). Owned by build/beats.
//   1. stage mode: body >= 20px, no chrome, no help card; the live path to the three asks at 1280x720, from a clicker
//   2. the close with a real judge's idea: contrast before the questions land, <= 3 questions, M from the run's log
//   3. replays: record-run, R in stage mode, the close's café fallback, the REPLAY label throughout
//   4. fallbacks: a slow or failing call shows its step (never a spinner) and offers R
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4000 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-beats-e2e-');
const JUDGE_IDEA = 'A sign-up page for a neighbourhood tool library.';
let srv, logs = '', browser, page, errors = [];
let RUN = null;

before(async () => {
  // The recorded café run is the close's fallback; the test's runs dir gets a copy.
  fs.cpSync(path.join(ROOT, 'runs', 'cafe'), path.join(RUNS, 'cafe'), { recursive: true });
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 50 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => errors.push(String(e)));
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

const waitFor = async (fn, ms, what, arg, p = page) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await p.evaluate(fn, arg).catch(() => false)) return; await p.waitForTimeout(200); }
  throw new Error('timed out waiting for ' + what);
};
const readLog = run => fs.readFileSync(path.join(RUNS, run, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
// The same count the close makes: distinct decisions (not asked) whose latest decided event cites a line of her file.
function countFromLog(evs) {
  const asked = new Set(evs.filter(e => e.type === 'ask').map(e => e.id));
  const latest = new Map();
  for (const e of evs) if (e.type === 'decided' && !asked.has(e.id)) latest.set(e.id, e);
  return { asked: asked.size, fromFile: [...latest.values()].filter(d => /^L\d+$/.test(String(d.cites))).length };
}
// Every box is on screen (inside the viewport), so nothing on a beat is cut off.
const onScreen = sel => page.evaluate(sel => [...document.querySelectorAll(sel)].every(e => {
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
}), sel);

test('1. stage mode: body >= 20px, no chrome, no help card', async () => {
  await page.goto(BASE + '/');
  await page.waitForTimeout(400);
  await page.keyboard.press('?');
  assert.ok(await page.isVisible('#help-card'), 'the help card toggles with ?');
  const helpLines = await page.locator('#help-card dt').count();
  const docLines = fs.readFileSync(path.join(ROOT, 'docs', 'KEYS.md'), 'utf8').split('\n').filter(l => /^\| `/.test(l)).length;
  assert.strictEqual(helpLines, docLines, 'the help card and docs/KEYS.md list the same keys');
  await page.keyboard.press('s');
  assert.ok(!(await page.isVisible('#help-card')), 'no help card in stage mode');
  await page.keyboard.press('?');
  assert.ok(!(await page.isVisible('#help-card')), '? does nothing in stage mode');
  assert.ok(!(await page.isVisible('#chrome')), 'no chrome');
  assert.ok(parseFloat(await page.evaluate(() => getComputedStyle(document.body).fontSize)) >= 20, 'body >= 20px');
  // The 1600x900 room fits the 1280x720 screen, centred.
  const r = await page.evaluate(() => { const b = document.getElementById('room').getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; });
  assert.ok(r[0] >= -1 && r[1] >= -1 && r[2] <= 1281 && r[3] <= 721, `the room fits the screen: ${r}`);
});

test('2. the live path in stage mode, driven like a clicker, as far as the three asks', async () => {
  await page.keyboard.press('PageDown'); // her card
  await page.keyboard.press('PageDown'); // the team, one by one
  await waitFor(() => document.querySelectorAll('.seat .card').length === 5, 8000, 'five cards');
  await page.waitForTimeout(1000);
  await page.keyboard.press('PageDown'); // her sheet
  await waitFor(() => document.activeElement && document.activeElement.id === 'her-input', 3000, 'her input focused');
  await page.keyboard.type('A booking page for a small yoga studio.');
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.run && !BYOC.run.startsWith('local-'), 5000, 'a run id');
  RUN = await page.evaluate(() => BYOC.run);
  for (const l of ['classes', 'a class', 'confirm', 'booked', 'regulars → "Book your usual"']) {
    await page.keyboard.type(l); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  }
  await waitFor(() => document.querySelectorAll('#her-flow .fl-box').length === 5, 5000, 'five boxes');
  // The clicker's forward button from her empty input: the team goes.
  await page.keyboard.press('PageDown');
  await waitFor(() => BYOC.beat >= 5, 2000, 'the team works beat');
  // While the team works, the room shows the step it is on, with its seconds (no spinner).
  await waitFor(() => !document.getElementById('live-step').hidden && /The team is/.test(document.getElementById('live-step').textContent), 5000, 'the live step');
  assert.match(await page.textContent('#live-step'), /\d+ s/);
  await waitFor(() => BYOC.events().some(e => e.type === 'select.done' || e.type === 'propose.error'), 110000, 'the team and the selector');
  const evs = await page.evaluate(() => BYOC.events());
  assert.ok(!evs.some(e => e.type === 'propose.error'), 'propose ran');
  const asks = evs.filter(e => e.type === 'ask');
  assert.ok(asks.length >= 1 && asks.length <= 3, `1 to 3 asks, got ${asks.length}`);
  await waitFor(n => document.querySelectorAll('#her-flow .fl-fork, #her-flow .fl-pin').length >= n, 5000, 'asks in her flow', asks.length);
  await page.waitForTimeout(1200);
  assert.ok(await page.evaluate(() => document.getElementById('live-step').hidden), 'the step clears when the selector is done');
  assert.ok(await onScreen('#her-flow .fl-fork, #her-flow .fl-pin, #her-flow .fl-box'), 'her flow and its asks are all on screen at 1280x720');
  // Reported, not asserted: the room scales her flow down to fit her sheet, so this is what the audience sees.
  const px = await page.evaluate(() => { const q = document.querySelector('#her-flow .fl-q');
    return q ? (parseFloat(getComputedStyle(q).fontSize) * q.getBoundingClientRect().height / q.offsetHeight).toFixed(1) : null; });
  console.log(`asks beat at 1280x720: question text renders at ${px} px`);
  assert.deepStrictEqual(errors, []);
});

test('3. the close: a real judge idea; contrast first, then <= 3 questions, then her M from the log, then the last line', async () => {
  assert.ok(RUN, 'needs step 2');
  await page.keyboard.press('Escape');
  await page.keyboard.press('j');
  await waitFor(() => document.activeElement && document.activeElement.id === 'close-input', 3000, 'the idea input');
  assert.strictEqual(await page.evaluate(() => document.querySelector('.close-left').classList.contains('on')), false, 'no contrast before the idea');
  await page.keyboard.type(JUDGE_IDEA);
  await page.keyboard.press('Enter');
  // While the team works: the contrast is up and no question has landed yet.
  await waitFor(() => document.querySelector('.close-left').classList.contains('on'), 3000, 'the contrast');
  assert.strictEqual(await page.locator('#close-asks li').count(), 0, 'the contrast shows before the questions land');
  assert.strictEqual(await page.textContent('#close-b-guessed'), '22', 'guessed, counted from docs/baseline/GUESSES.md');
  assert.match(await page.textContent('#close-step'), /The team is on it/);
  await waitFor(() => document.querySelectorAll('#close-asks li').length > 0 || /stopped/.test(document.getElementById('close-step').textContent), 90000, 'the judge’s questions');
  const n = await page.locator('#close-asks li').count();
  assert.ok(n >= 1 && n <= 3, `1 to 3 questions, got ${n}`);
  const tm = await page.evaluate(() => BYOC.timings);
  assert.ok(tm.contrastAt < tm.asksAt, 'contrast before the questions');
  // The judge's run was logged, and its questions are its asks.
  const judgeLog = readLog(tm.closeRun);
  assert.ok(judgeLog.some(e => e.type === 'run.start' && e.idea === JUDGE_IDEA), 'the judge’s run is logged with the idea');
  assert.strictEqual(judgeLog.filter(e => e.type === 'ask').length, n, 'the questions shown are the run’s asks');
  assert.ok(await page.locator('#close-asks .close-why').count() >= 1, 'each comes with its why');
  // Her line, from her run's log.
  await waitFor(() => !document.getElementById('close-built').hidden, 8000, 'the built-this-way line');
  const want = countFromLog(readLog(RUN));
  if (want.fromFile > 0) {
    assert.ok(await page.isVisible('#close-her'), 'her line shows');
    assert.strictEqual(await page.textContent('#close-decided'), String(want.fromFile), 'M is counted from her run’s log');
    assert.strictEqual(await page.textContent('#close-asked'), String(want.asked), 'asked is her run’s asks');
  } else {
    assert.ok(!(await page.isVisible('#close-her')), 'M = 0: her line is not shown');
  }
  console.log(`close: ${n} questions in ${(tm.closeMs / 1000).toFixed(1)} s; her ${want.asked} asked, ${want.fromFile} decided from her file`);
  assert.match(await page.textContent('#close-built'), /built the same way: I sat in the Product seat/);
  assert.ok(await onScreen('#close-asks li, #close-built, #close-her:not([hidden])'), 'the close fits the screen at 1280x720');
  assert.ok(!(await page.isVisible('#replay-label')), 'nothing replayed, no label');
});

test('4. replays: record-run, R in stage mode, the café fallback in the close; REPLAY shows throughout', async () => {
  assert.ok(RUN, 'needs step 2');
  const out = execFileSync('node', ['scripts/record-run.mjs', 'rehearsal', RUN], { cwd: ROOT, env: { ...process.env, RUNS_DIR: RUNS } }).toString();
  assert.match(out, /recorded/);
  assert.deepStrictEqual(readLog('rehearsal'), readLog(RUN), 'the recording is the run’s log');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Home');
  await page.keyboard.press('r');
  await waitFor(() => BYOC.replay && !document.getElementById('replay-label').hidden, 5000, 'the rehearsal replay');
  assert.ok(await page.evaluate(() => document.body.classList.contains('stage')), 'still in stage mode');
  assert.match(await page.textContent('#replay-label'), /Replay.*rehearsal/);
  await waitFor(() => BYOC.events().some(e => e.type === 'ask'), 120000, 'the replay reaches the asks');
  assert.ok(await page.isVisible('#replay-label'), 'REPLAY on screen during the replay');
  assert.ok(await page.evaluate(() => document.getElementById('live-step').hidden), 'no live step during a replay');
  // The close, while the rehearsal is on screen: the café fallback, labelled.
  await page.keyboard.press('j');
  await page.keyboard.press('Escape');
  assert.ok(await page.isVisible('#replay-label'), 'REPLAY still on screen in the close');
  await page.keyboard.press('c');
  await waitFor(() => /cafe/.test(document.getElementById('replay-label').textContent), 3000, 'the café label');
  await waitFor(() => document.querySelectorAll('#close-asks li').length > 0, 10000, 'the café questions');
  assert.strictEqual(await page.locator('#close-asks li').count(), readLog('cafe').filter(e => e.type === 'ask').length);
  assert.match(await page.inputValue('#close-input'), /café/);
  await waitFor(() => !document.getElementById('close-built').hidden, 8000, 'the last line');
  const want = countFromLog(readLog('rehearsal'));
  if (want.fromFile > 0) {
    assert.strictEqual(await page.textContent('#close-decided'), String(want.fromFile), 'M from the rehearsal log');
    assert.match(await page.textContent('#close-her-src'), /REPLAY/);
  }
  assert.ok(await page.isVisible('#replay-label'), 'REPLAY on screen at the end of the close');
  await page.keyboard.press('Home');
  assert.ok(!(await page.isVisible('#replay-label')), 'reset clears the label');
});

test('5. fallbacks: a slow or failing call shows its step and offers R; the close says so too', async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  // Opening her run hangs, then fails; the slow threshold is 1.5 s for the test (25 s on stage).
  await p.route('**/api/run', async r => { await new Promise(f => setTimeout(f, 3500)); await r.fulfill({ status: 500, body: '{"error":"model down"}' }); });
  await p.route('**/api/select-for-idea', async r => { await new Promise(f => setTimeout(f, 3000)); await r.fulfill({ status: 502, body: '{"error":"bad gateway"}' }); });
  await p.goto(BASE + '/?stage=1&slow=1500');
  await p.waitForTimeout(300);
  await p.evaluate(() => BYOC.stage(3, { instant: true }));
  await p.waitForTimeout(100);
  await p.keyboard.type('A booking page for a small yoga studio.');
  await p.keyboard.press('Enter');
  await waitFor(() => /Opening her sheet/.test(document.getElementById('live-step').textContent) && !document.getElementById('live-step').hidden, 3000, 'the step', null, p);
  await waitFor(() => /slow · R replays the rehearsal/.test(document.getElementById('live-step').textContent), 3000, 'the slow note', null, p);
  await waitFor(() => /stopped/.test(document.getElementById('live-step').textContent), 4000, 'the failure', null, p);
  assert.match(await p.textContent('#live-step'), /R replays the rehearsal/);
  assert.strictEqual(await p.locator('.spinner, [class*="spin"], progress').count(), 0, 'never a spinner');
  // The close: slow, then stopped, then R brings in the café run.
  await p.keyboard.press('Escape');
  await p.keyboard.press('j');
  await p.keyboard.type('A page for a bike repair pop-up.');
  await p.keyboard.press('Enter');
  await waitFor(() => /slow: R replays the café run/.test(document.getElementById('close-step').textContent), 3000, 'the close’s slow note', null, p);
  await waitFor(() => /stopped/.test(document.getElementById('close-step').textContent), 4000, 'the close’s failure', null, p);
  await p.keyboard.press('r');
  await waitFor(() => document.querySelectorAll('#close-asks li').length > 0, 10000, 'the café questions', null, p);
  assert.ok(await p.isVisible('#replay-label'), 'labelled REPLAY');
  // Back in the room, R swaps in the rehearsal (recorded in step 4).
  await p.keyboard.press('Home');
  await p.keyboard.press('r');
  await waitFor(() => BYOC.replay && /rehearsal/.test(document.getElementById('replay-label').textContent), 5000, 'the rehearsal replay', null, p);
  assert.ok(await p.evaluate(() => document.getElementById('live-step').hidden), 'the failed step gives way to the replay');
  assert.deepStrictEqual(perrs, []);
  await p.close();
});
