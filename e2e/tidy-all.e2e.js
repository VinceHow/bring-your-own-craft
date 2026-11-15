// The polish bar (docs/POLISH.md §2): every place she types or speaks has the magical tidy in place. One walk over
// every field on the stage path, on both looks: the idea card, the name tag (intro-strict), a line on her sheet (the
// path a sketch reaction takes), focus pieces ("Add this", and one whose tidy never comes: skipped at 2.5 s, no late
// swap), the meeting's "You" turn, Bo's unblock answer, and the close. Each element that shows her words goes
// data-state tidying -> tidied with data-raw (what she said) and data-tidy (cut | reordered | skipped). /api/tidy and
// the model routes are stubbed; no model calls. Run: node --test e2e/tidy-all.e2e.js
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
const RUNS = fs.mkdtempSync('/tmp/byoc-tidy-all-e2e-');
let srv, logs = '', browser;
before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 100 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

// What the stubbed tidy gives back (cuts and one reorder); anything else comes back as said.
const TIDY = {
  'um so a, a website for my bakery': 'A website for my bakery',
  'uh i love, like, baking sourdough for the regulars': 'I love baking sourdough for the regulars',
  'uh regulars come every, every morning': 'Regulars come every morning',
  'um the regulars come first': 'The regulars come first',
  'So, the regulars, they just need to tell me their name and what they want for that day': 'The regulars just need to tell me their name and what they want that day',
  'uh, orders close, uh, at 8pm the night before': 'Orders close at 8pm the night before',
  'regulars first and then the bread i think': 'I think regulars first, then the bread',
};
async function fresh(look, query = '') {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const seen = { answer: null };
  await page.route('**/api/tidy', async r => { const { text } = JSON.parse(r.request().postData()); await new Promise(f => setTimeout(f, 300));
    r.fulfill({ status: 200, json: { text: TIDY[text] || text, tidied: !!TIDY[text] } }); });
  await page.route('**/api/name-tag', r => r.fulfill({ status: 500, json: { error: 'stubbed' } }));
  await page.route('**/api/meet-lines', r => r.fulfill({ status: 200, json: { lines: {} } }));
  for (const u of ['**/api/sketch-for-idea', '**/api/select-for-idea']) await page.route(u, r => r.fulfill({ status: 500, json: { error: 'stubbed' } }));
  await page.route('**/api/run/stub-run/**', r => { if (/\/(answer|round)$/.test(r.request().url())) seen.answer = JSON.parse(r.request().postData()); r.fulfill({ json: { ok: true } }); });
  await page.goto(BASE + '/' + (look || query ? '?' + [look, query].filter(Boolean).join('&') : ''));
  await page.waitForFunction(() => window.BYOC && BYOC.stage);
  // Every element that carries data-raw: its data-state changes, in order (an element may leave once it's done).
  await page.evaluate(() => {
    window.__tidy = [];
    new MutationObserver(ms => { for (const m of ms) { const e = m.target; if (!e.dataset || e.dataset.raw == null) continue;
      window.__tidy.push({ el: e.id ? '#' + e.id : '.' + [...e.classList][0], state: e.dataset.state, raw: e.dataset.raw, tidy: e.dataset.tidy || '' }); } })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-state'], subtree: true });
  });
  return { page, errors, seen };
}
const trail = (page, el) => page.evaluate(el => window.__tidy.filter(t => t.el === el), el);
// The element went tidying (her raw words) -> tidied (with its kind), and nothing after.
async function played(page, el, raw, kind, what) {
  await page.waitForFunction(el => window.__tidy.some(t => t.el === el && t.state === 'tidied'), el, { timeout: 6000 })
    .catch(async () => { throw new Error(`${what}: never tidied; trail ${JSON.stringify(await trail(page, el))}`); });
  const t = (await trail(page, el)).filter(x => x.raw === raw);
  const states = t.map(x => x.state);
  assert.deepStrictEqual(states.slice(0, 2), ['tidying', 'tidied'], `${what}: tidying -> tidied (${JSON.stringify(t)})`);
  assert.equal(t[1].tidy, kind, `${what}: data-tidy`);
}

for (const [lookName, look] of [['plain', ''], ['painted', 'look=painted']]) test(`${lookName}: the tidy plays on every field she types or speaks into`, async () => {
  // 1-2. The idea card, then the name tag (intro-strict on the server; the stub only cuts).
  let { page, errors, seen } = await fresh(look);
  await page.waitForFunction(() => BYOC.ideaOpen && BYOC.ideaOpen(), null, { timeout: 8000 });
  await page.fill('#idea-input', 'um so a, a website for my bakery'); await page.press('#idea-input', 'Enter');
  await played(page, '#idea-input', 'um so a, a website for my bakery', 'cut', 'idea card');
  await page.waitForFunction(() => BYOC.introOpen && BYOC.introOpen(), null, { timeout: 10000 });
  await page.fill('#nt-name', 'Priya');
  await page.click('.pick-option[data-pick="product"]');
  await page.fill('#intro-input', 'uh i love, like, baking sourdough for the regulars'); await page.press('#intro-input', 'Enter');
  await played(page, '#intro-input', 'uh i love, like, baking sourdough for the regulars', 'cut', 'name tag');
  assert.deepStrictEqual(errors, []);
  await page.close();

  // 3. Her sheet: the idea goes up to #her-idea, a line (or a sketch reaction: the same path) tidies in #her-input.
  ({ page, errors } = await fresh(look));
  await page.route('**/api/run', r => r.fulfill({ status: 200, json: { run: 'stub-sheet' } }));
  await page.route('**/api/run/stub-sheet/**', r => r.fulfill({ status: 404, json: {} }));
  await page.evaluate(() => BYOC.stage(3, { instant: true }));
  await page.waitForSelector('#her-input', { state: 'visible' });
  await page.fill('#her-input', 'um so a, a website for my bakery'); await page.press('#her-input', 'Enter');
  await played(page, '#her-idea', 'um so a, a website for my bakery', 'cut', 'her idea on the sheet');
  await page.waitForFunction(() => document.getElementById('her-input').offsetParent !== null);
  await page.fill('#her-input', 'regulars first and then the bread i think'); await page.press('#her-input', 'Enter');
  await played(page, '#her-input', 'regulars first and then the bread i think', 'reordered', 'a line on her sheet');
  assert.deepStrictEqual(errors, []);
  await page.close();

  // 4-5. Focus: a piece tidies on its words; one whose tidy never comes is skipped at 2.5 s and stays raw (no late swap);
  // Send: the "You" turn tidies in place (display only; the team reads her words as sent).
  ({ page, errors, seen } = await fresh(look));
  await page.evaluate(() => {
    BYOC.stage(4, { instant: true }); BYOC.run = 'stub-run';
    BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'first', first: true, seat: 'research', by: 'Wren', question: 'Who should we build this for first?',
      artifact: { kind: 'finding', ref: { title: 'A finding', quote: 'A third of visitors buy weekly.', url: 'https://example.org/f', label: 'researched before the demo' } } }, 'live');
    BYOC.openNote('first');
  });
  await page.waitForFunction(() => BYOC.focusDoc.isOpen(), null, { timeout: 3000 });
  await page.fill('#focus-doc .fd-input', 'um the regulars come first'); await page.click('#focus-doc [data-slot="add-piece"]');
  await page.waitForFunction(() => document.querySelector('.fd-piece-words')?.dataset.state === 'tidying');
  // the server's piece tidy, as it arrives over the event stream
  await page.evaluate(() => { const li = document.querySelector('.fd-piece');
    BYOC.dispatch({ run: 'stub-run', type: 'answer.piece.tidy', askId: 'first', pieceId: li.dataset.piece, raw: 'um the regulars come first', text: 'The regulars come first' }, 'live'); });
  await played(page, '.fd-piece-words', 'um the regulars come first', 'cut', 'a focus piece');
  await page.fill('#focus-doc .fd-input', 'and the bread'); await page.click('#focus-doc [data-slot="add-piece"]');
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelectorAll('.fd-piece-words')[1]?.dataset.tidy === 'skipped', null, { timeout: 4000 });
  assert.ok(Date.now() - t0 >= 2000, 'skipped at about 2.5 s');
  await page.evaluate(() => { const li = document.querySelectorAll('.fd-piece')[1];
    BYOC.dispatch({ run: 'stub-run', type: 'answer.piece.tidy', askId: 'first', pieceId: li.dataset.piece, raw: 'and the bread', text: 'And bread' }, 'live'); });
  await page.waitForTimeout(400);
  assert.equal((await page.textContent('.fd-piece:nth-child(2) .fd-piece-words')).trim(), 'and the bread', 'a late tidy never swaps in');
  await page.press('#focus-doc .fd-input', 'Enter');
  await page.waitForFunction(() => document.querySelector('.fd-her-words')?.dataset.state === 'tidied', null, { timeout: 4000 });
  assert.equal(await page.getAttribute('.fd-her-words', 'data-raw'), 'um the regulars come first and the bread');
  for (let i = 0; i < 40 && !seen.answer; i++) await page.waitForTimeout(50);
  assert.equal(seen.answer.pieces.length, 2, 'the team gets her pieces');
  assert.deepStrictEqual(errors, []);
  await page.close();

  // 6. Bo's unblock answer, on its own page: a real run and raise on this server (no models).
  ({ page, errors } = await fresh(look, 'stage=1'));
  const run = await page.evaluate(async () => (await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idea: 'An ordering website for a small bakery', path: 'full' }) })).json()).then(r => r.run);
  await page.evaluate(run => { BYOC.stage(5, { instant: true }); BYOC.run = run; }, run);
  const raised = await page.evaluate(async run => (await fetch(`/api/run/${run}/unblock`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ seat: 'engineering', question: 'When do orders close?', suggestion: '8pm the night before', kind: 'call', doing: 'Setting up ordering', topic: 'Orders close' }) })).status, run);
  assert.equal(raised, 200);
  await page.waitForFunction(() => document.getElementById('inbox').dataset.needs === 'yes', null, { timeout: 15000 });
  await page.evaluate(() => BYOC.inbox.openTop());
  await page.click('#inbox article.inbox-action [data-slot="say"]');
  await page.evaluate(raw => { const el = document.querySelector('.ia-hers'); el.textContent = raw;
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new CustomEvent('byoc:voice', { detail: { text: raw } })); }, 'uh, orders close, uh, at 8pm the night before');
  await played(page, '.ia-hers', 'uh, orders close, uh, at 8pm the night before', 'cut', "Bo's unblock answer");
  assert.deepStrictEqual(errors, []);
  await page.close();

  // 7. The close.
  ({ page, errors } = await fresh(look));
  await page.evaluate(() => { BYOC.close.open(); /* the close is unhooked from the beats (Vincent, 15 Nov); its input is still tested directly */ });
  await page.waitForFunction(() => BYOC.close && BYOC.close.isOpen(), null, { timeout: 4000 });
  await page.fill('#close-input', 'um so a, a website for my bakery'); await page.press('#close-input', 'Enter');
  await played(page, '#close-input', 'um so a, a website for my bakery', 'cut', 'the close');
  assert.deepStrictEqual(errors, []);
  await page.close();
});

// A tidy that fails, or changes nothing: her raw words stand, marked skipped (nothing plays over them), no error on
// screen, and a line on her sheet still clears for the next one. Feedback within 300 ms of Enter: data-state tidying.
test('a failed or unchanged tidy: her words stand, skipped, no error shown; tidying shows at once', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/api/tidy', async r => { const { text } = JSON.parse(r.request().postData()); await new Promise(f => setTimeout(f, 300));
    if (/fails/.test(text)) return r.fulfill({ status: 500, json: { error: 'stubbed' } }); r.fulfill({ status: 200, json: { text, tidied: false } }); });
  await page.route('**/api/run', r => r.fulfill({ status: 200, json: { run: 'stub-fail' } }));
  await page.route('**/api/run/stub-fail/**', r => r.fulfill({ status: 200, json: { nodes: [], edges: [] } }));
  await page.goto(BASE + '/?look=painted');
  await page.evaluate(() => BYOC.stage(3, { instant: true }));
  await page.waitForSelector('#her-input', { state: 'visible' });
  await page.fill('#her-input', 'A website for my bakery'); await page.press('#her-input', 'Enter');
  await page.waitForFunction(() => document.getElementById('her-idea').dataset.state === 'tidied');
  assert.equal(await page.getAttribute('#her-idea', 'data-tidy'), 'skipped', 'unchanged: skipped');
  await page.waitForFunction(() => document.getElementById('her-input').offsetParent !== null);
  await page.fill('#her-input', 'this line fails to tidy so it stays as she said');
  const t0 = Date.now(); await page.press('#her-input', 'Enter');
  await page.waitForFunction(() => document.getElementById('her-input').dataset.state === 'tidying', null, { timeout: 300 });
  assert.ok(Date.now() - t0 < 300, 'tidying within 300 ms');
  await page.waitForFunction(() => document.getElementById('her-input').dataset.state === 'tidied');
  assert.equal(await page.getAttribute('#her-input', 'data-tidy'), 'skipped');
  assert.equal(await page.inputValue('#her-input'), '', 'the box clears for her next line');
  assert.ok(!/error|undefined|failed/i.test(await page.evaluate(() => document.body.innerText)), 'no error on screen');
  assert.deepStrictEqual(errors.filter(e => !/404|500|Failed to load resource/.test(e)), []);
  await page.close();
});
