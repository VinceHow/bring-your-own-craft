// A teammate's pad is never a bare "nothing yet" (Vincent's Mac, 14 Nov): empty, it says in one plain line what that
// teammate is doing or waiting for, from the run's real events, and it follows the run while open. No models: the
// events are dispatched in the shapes the server logs (teammate.start/done/error, ask, ask.unblock, answer,
// joint.start/agreed). Run: node --test e2e/pad-status.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4600 + Math.floor(Math.random() * 90);
const RUNS = fs.mkdtempSync('/tmp/byoc-pad-e2e-');
let srv, logs = '', browser, page, errors = [];

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('server did not start in 20 s:\n' + logs)), 20000);
    const check = d => { logs += d || ''; if (logs.includes('room on')) { clearTimeout(t); res(); } };
    srv.stdout.on('data', check); srv.stderr.on('data', check);
  });
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/api/run/**', r => r.fulfill({ status: 200, json: { ok: true } })); // nothing reaches a model
  await page.goto(`http://localhost:${PORT}/?stage=1`);
  await page.waitForFunction(() => window.BYOC && BYOC.openSketchpad && BYOC.stage);
  await page.evaluate(() => { BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run'; });
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

const SEATS = ['design', 'data', 'research', 'strategy', 'engineering'];
const dispatch = (...evs) => page.evaluate(es => es.forEach(e => BYOC.dispatch({ run: 'stub-run', ...e }, 'live')), evs);
const status = () => page.evaluate(() => { const s = document.querySelector('#room-panel[data-component="sketchpad-open"] [data-component="pad-status"]');
  return s && { state: s.dataset.state, slot: s.dataset.slot, text: s.textContent }; });
// Every empty pad has its line, and no pad ever says "Nothing on the pad yet".
async function noBarePads() {
  for (const seat of SEATS) {
    await page.evaluate(s => BYOC.openSketchpad(s), seat);
    const text = await page.locator('#room-panel').innerText();
    assert.ok(!/Nothing on the pad yet/i.test(text), `${seat}: a bare "nothing yet"`);
    const items = await page.locator('#room-panel .sp-item').count();
    if (!items) assert.ok((await status())?.text, `${seat}: an empty pad without its line`);
  }
  await page.evaluate(() => BYOC.openSketchpad('engineering'));
}

test("Bo's pad, empty, says what Bo is doing at each point of the run, and follows it while open", async () => {
  await page.evaluate(() => BYOC.openSketchpad('engineering'));
  assert.deepStrictEqual(await status(), { state: 'empty', slot: 'status', text: 'Bo joins once the team gets going.' });
  await noBarePads();

  await dispatch({ type: 'teammate.start', seat: 'engineering' });
  assert.deepStrictEqual(await status(), { state: 'working', slot: 'status', text: 'Bo is thinking it through…' }, 'updates while open');

  await dispatch({ type: 'teammate.done', seat: 'engineering' }, { type: 'teammate.start', seat: 'design' },
    { type: 'ask', id: 'q1', seat: 'design', by: 'Mika', question: 'Who walks into this bakery most often?', artifact: { kind: 'journey' } });
  assert.deepStrictEqual(await status(), { state: 'waiting', slot: 'status', text: "Bo carries on once you've answered Mika's question." });

  await dispatch({ type: 'ask.unblock', id: 'u1', seat: 'engineering', by: 'Bo', question: 'Can regulars order the night before?', suggestion: 'Yes, until 8pm' });
  assert.deepStrictEqual(await status(), { state: 'waiting', slot: 'status', text: 'Bo is blocked until you answer: “Can regulars order the night before?”' });
  await noBarePads();

  await dispatch({ type: 'answer', askId: 'q1', text: 'Regulars.' }, { type: 'answer', askId: 'u1', text: 'Yes' },
    { type: 'joint.start', jointId: 'j1', id: 'c3', decision: 'How the order page takes payment', seats: ['engineering', 'strategy'] });
  assert.deepStrictEqual(await status(), { state: 'working', slot: 'status', text: 'Bo is agreeing “How the order page takes payment” with Ines…' });

  await dispatch({ type: 'joint.start', jointId: 'j2', id: 'c4', decision: 'What the first screen shows', seats: ['design', 'data'] },
    { type: 'joint.agreed', id: 'j1', candidateId: 'c3', headline: 'Pay at pickup', seats: ['engineering', 'strategy'] });
  assert.deepStrictEqual(await status(), { state: 'waiting', slot: 'status', text: 'Bo starts once the team has agreed “What the first screen shows”.' });

  await dispatch({ type: 'joint.agreed', id: 'j2', candidateId: 'c4', headline: 'Their usual loaf', seats: ['design', 'data'] });
  assert.deepStrictEqual(await status(), { state: 'empty', slot: 'status', text: 'Bo has nothing for you yet; still listening.' });

  await dispatch({ type: 'teammate.start', seat: 'engineering' }, { type: 'teammate.error', seat: 'engineering', pane: 'engineering', error: 'claude timed out' });
  assert.deepStrictEqual(await status(), { state: 'error', slot: 'status', text: 'Bo hit a snag; the team carries on.' });
  await noBarePads();

  // A pad with work on it shows the work, not the line.
  await dispatch({ type: 'candidate', id: 'c9', seat: 'engineering', decision: 'Orders close at 8pm', options: ['8pm', '10pm'], recommendation: '8pm', reason: 'r' });
  assert.strictEqual(await status(), null);
  assert.strictEqual(await page.locator('#room-panel .sp-item').count(), 1);
  assert.deepStrictEqual(errors, []);
});
