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
const L = u => process.env.E2E_LOOK && !/[?&]look=/.test(u) ? u + (u.includes('?') ? '&' : '?') + 'look=' + process.env.E2E_LOOK : u; // E2E_LOOK=plain|painted
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
  await page.route('**/api/tidy', r => r.fulfill({ json: { text: JSON.parse(r.request().postData() || '{}').text || '', tidied: false } })); // the tidy answers at once: no model, no flake
  await page.goto(L(`http://localhost:${PORT}/?stage=1`));
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

test('her workspace: empty parts say what happens next; a live run with her idea shows it, filling in while open', async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('**/api/run', r => r.fulfill({ status: 200, json: { run: 'live-run' } })); // her run, as the server makes it
  await p.route('**/api/run/**', r => r.fulfill({ status: 200, json: { ok: true } }));
  await p.route('**/api/tidy', r => r.fulfill({ json: { text: JSON.parse(r.request().postData() || '{}').text || '', tidied: false } })); // no model
  await p.goto(L(`http://localhost:${PORT}/?stage=1`));
  await p.waitForFunction(() => window.BYOC && BYOC.openWorkspace && BYOC.stage);
  await p.evaluate(() => BYOC.stage(3, { instant: true }));
  await p.evaluate(() => BYOC.openWorkspace());
  const part = slot => p.evaluate(s => { const e = document.querySelector(`#room-panel[data-component="workspace"] .ws-part[data-slot="${s}"]`);
    return e && { state: e.dataset.state, status: e.querySelector('[data-slot="status"]')?.textContent || null, idea: e.querySelector('.ws-idea')?.textContent || null }; }, slot);
  assert.deepStrictEqual(await part('idea'), { state: 'empty', status: 'You’ll say it on the idea sheet; it shows here the moment you do.', idea: null });
  assert.strictEqual((await part('team-space')).state, 'empty');
  assert.match((await part('team-space')).status, /once you’ve said your idea/);
  assert.strictEqual((await part('takeaways')).status, 'They come from your answers to the team’s questions.');
  assert.ok(!/Not said yet|Nothing agreed yet/.test(await p.locator('#room-panel').innerText()));
  await p.keyboard.press('Escape');
  // Live: she says her idea on the sheet, the way she does on stage.
  const IDEA = 'A website for a small bakery, so regulars can order bread ahead.';
  await p.evaluate(() => BYOC.stage(3, { instant: true }));
  await p.waitForFunction(() => !document.getElementById('her-form').hidden);
  await p.fill('#her-input', IDEA); await p.press('#her-input', 'Enter');
  await p.waitForFunction(() => BYOC.run === 'live-run');
  await p.evaluate(() => BYOC.openWorkspace());
  assert.deepStrictEqual(await part('idea'), { state: 'filled', status: 'Its journey shows here once Mika has sketched it.', idea: IDEA });
  // The server's own events land while it's open: the panel follows (takeaways line names who's asking).
  await p.evaluate(i => { BYOC.dispatch({ run: 'live-run', type: 'run.start', mode: 'craft', idea: i, seat: 'product' }, 'live');
    BYOC.dispatch({ run: 'live-run', type: 'teammate.start', seat: 'design' }, 'live');
    BYOC.dispatch({ run: 'live-run', type: 'ask', id: 'q1', seat: 'research', by: 'Wren', question: 'Who walks in most often?', artifact: { kind: 'journey' } }, 'live'); }, IDEA);
  assert.ok(await p.isVisible('#room-panel[data-component="workspace"]'), 'still open: it redrew in place');
  assert.strictEqual((await part('idea')).idea, IDEA);
  assert.strictEqual((await part('takeaways')).status, 'Your first takeaway comes when you answer Wren’s question.');
  assert.strictEqual((await part('team-space')).status, 'What the team agrees lands here as they work.');
  assert.deepStrictEqual(errs, []);
  await p.close();
});

// Stubbed twin of team.e2e's "the card shows" (which needs real models), so it sits in the regular gates: an agreement
// lands as a card in the team space, folded behind "Team notes · N" (closed by default); the tab opens it, in both looks.
for (const look of ['', 'look=painted']) test(`team space${look ? ' (painted)' : ''}: an agreement lands as a card; Team notes opens to show it`, async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 930 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('**/api/**', r => r.fulfill({ status: 200, json: { ok: true, run: 'stub-run' } }));
  await p.goto(`http://localhost:${PORT}/?hold=300&path=full&setup=classic${look ? '&' + look : ''}`);
  await p.waitForFunction(() => window.BYOC && BYOC.stage && BYOC.dispatch);
  await p.evaluate(() => { BYOC.run = 'stub-run'; BYOC.stage(6, { instant: true });
    const d = e => BYOC.dispatch({ run: 'stub-run', ...e }, 'live');
    d({ type: 'run.start', idea: 'A booking page for a small yoga studio.', seat: 'product', mode: 'craft' });
    d({ type: 'candidate', id: 'c1', seat: 'design', decision: 'What leads the page', options: ['a', 'b'], recommendation: 'a', reason: 'r' });
    d({ type: 'joint.start', jointId: 'j1', id: 'c1', decision: 'What leads the page', seats: ['design', 'data'] });
    d({ type: 'joint.agreed', pane: 'room', id: 'j1', candidateId: 'c1', headline: 'Their usual class goes first', seats: ['design', 'data'],
      turns: [{ seat: 'design', text: 'Usual class first.' }, { seat: 'data', text: 'We count rebooks.' }, { seat: 'design', text: 'Agreed.' }] }); });
  await p.waitForFunction(() => document.querySelectorAll('.team-space .ts-card').length === 1);
  // the team's notes live in her inbox (Vincent, 15 Nov): open it to see them
  assert.strictEqual(await p.locator('#inbox [data-part="team-notes"] .ts-card').count(), 1, 'in her inbox, under Team notes');
  await p.evaluate(() => BYOC.inbox.expand(true));
  const first = p.locator('.team-space .ts-card').first();
  assert.ok(await first.isVisible(), 'the card shows');
  assert.strictEqual(await first.locator('.ts-headline').innerText(), 'Their usual class goes first');
  assert.deepStrictEqual(errs, []);
  await p.close();
});
