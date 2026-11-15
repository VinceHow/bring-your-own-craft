// A focus moment is never a dead page (Vincent's Mac, 14 Nov): after Send she sees at once who is reading what she
// said; a failing /answer or an error in the run log gives a plain line and Retry, which resends the same comment
// and succeeds; a silence beyond 25 s says "Still reading…". No models: /answer is stubbed, and the team's events
// are dispatched in the shapes the server logs (thread.start, chime, takeaways, chime.error).
// Run: node --test e2e/focus-wait.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4500 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-focuswait-e2e-');
let srv, logs = '', browser, page, errors = [];
let onAnswer = null; const answers = []; // the stubbed /answer: each test sets what it does

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
  await page.route('**/api/tidy', r => r.fulfill({ json: { text: JSON.parse(r.request().postData() || '{}').text || '', tidied: false } })); // the tidy answers at once: no model
  await page.route('**/api/run/*/answer', async r => { const body = r.request().postDataJSON(); answers.push(body); await onAnswer(r, body); });
  await page.goto(BASE + '/?stage=1&meeting=0');
  await page.waitForFunction(() => window.BYOC && BYOC.focusDoc && BYOC.stage);
  await page.evaluate(() => { BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run'; });
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

const WAIT_MS = 15000;
const waitFor = (fn, what, arg, ms = WAIT_MS) => page.waitForFunction(fn, arg, { timeout: ms })
  .catch(async () => { throw new Error(`timed out: ${what}; team line: ${await page.evaluate(() => document.querySelector('#focus-doc .fd-team')?.outerHTML)}`); });
const dispatch = ev => page.evaluate(e => BYOC.dispatch({ run: 'stub-run', ...e }, 'live'), ev);
const team = () => page.evaluate(() => { const t = document.querySelector('#focus-doc .fd-team'); return { text: t.textContent, state: t.closest('[data-component="team-reading"]').dataset.state, retry: !document.querySelector('#focus-doc .fd-retry').hidden }; });
async function openAsk(id) {
  await dispatch({ type: 'ask', id, seat: 'research', by: 'Wren', question: 'Who walks into this bakery most often?', artifact: { kind: 'journey' } });
  await page.evaluate(i => BYOC.openNote(i), id);
  await waitFor(i => BYOC.focusDoc.isOpen() && BYOC.focusDoc.openId() === i, 'her document', id);
}
const SAID = 'The same few regulars, every morning before work.';
async function sendIt() { await page.fill('#focus-doc .fd-input', SAID); await page.click('#focus-doc .fd-send'); }

test('at once: "The team is reading…", then within 300 ms the routed teammates by name; their first reply clears it', async () => {
  answers.length = 0;
  // The server logs thread.start before any model call; the stub does the same the moment the request arrives.
  onAnswer = async (r, body) => { await dispatch({ type: 'thread.start', askId: body.askId, seats: ['research', 'design'], by: ['Wren', 'Mika'] }); };
  await openAsk('w1');
  await page.fill('#focus-doc .fd-input', SAID);
  // Click Send and read the line in the same tick: something shows before the request even leaves.
  const sync = await page.evaluate(() => {
    const t = document.querySelector('#focus-doc .fd-team');
    window.__sentAt = performance.now(); window.__namedAt = null;
    new MutationObserver(() => { if (/Wren and Mika are reading what you said/.test(t.textContent) && !window.__namedAt) window.__namedAt = performance.now(); })
      .observe(t, { childList: true, characterData: true, subtree: true });
    document.querySelector('#focus-doc .fd-send').click();
    return t.textContent;
  });
  assert.strictEqual(sync, 'The team is reading what you said…');
  await waitFor(() => window.__namedAt, 'names');
  const ms = await page.evaluate(() => window.__namedAt - window.__sentAt);
  assert.ok(ms <= 300, `named within 300 ms (took ${Math.round(ms)} ms)`);
  assert.strictEqual(answers.length, 1);
  assert.deepStrictEqual(answers[0], { askId: 'w1', text: SAID });
  assert.match(await page.locator('#focus-doc .fd-said').innerText(), /same few regulars/);
  await dispatch({ type: 'chime', askId: 'w1', seat: 'research', by: 'Wren', text: 'Regulars are a third of bakery visitors.', turn: 1 });
  await waitFor(() => !document.querySelector('#focus-doc .fd-team').textContent, 'the reading line clears on the first reply');
  assert.deepStrictEqual(await team(), { text: '', state: 'heard', retry: false });
  await page.evaluate(() => BYOC.focusDoc.close(true));
});

test('a 502 from /answer: a plain line and Retry; Retry resends the same comment and the team comes through', async () => {
  answers.length = 0;
  onAnswer = async r => r.fulfill({ status: 502, json: { error: 'claude exited 1' } });
  await openAsk('w2');
  await sendIt();
  await waitFor(() => document.querySelector('#focus-doc [data-component="team-reading"]').dataset.state === 'failed', 'the failure line');
  let t = await team();
  assert.strictEqual(t.text, 'The team couldn’t read that just now. Your words are kept.');
  assert.ok(t.retry, 'Retry is offered');
  assert.match(await page.locator('#focus-doc .fd-said').innerText(), /same few regulars/, 'her words stay');
  onAnswer = async (r, body) => {
    await dispatch({ type: 'thread.start', askId: body.askId, seats: ['design'], by: ['Mika'] });
    await dispatch({ type: 'chime', askId: body.askId, seat: 'design', by: 'Mika', text: 'Then their usual loaf goes first.', turn: 1 });
    await dispatch({ type: 'takeaways', askId: body.askId, believe: 'Regulars come first.', guidance: 'Put the usual loaf first.' });
    await r.fulfill({ status: 200, json: { ok: true } });
  };
  await page.click('#focus-doc .fd-retry');
  await waitFor(() => document.querySelector('#focus-doc .fd-brief').dataset.state === 'shown', 'the takeaways after Retry');
  assert.strictEqual(answers.length, 2);
  assert.deepStrictEqual(answers[1], { askId: 'w2', text: SAID, retry: true }, 'the same comment, resent');
  t = await team();
  assert.ok(!t.retry && t.state !== 'failed', 'the failure is gone');
  assert.strictEqual(await page.locator('#focus-doc .fd-chimes .chime').count(), 1);
  await page.evaluate(() => BYOC.focusDoc.close(true));
});

test('an error in the run log for this focus (chime.error) shows the same line and Retry', async () => {
  onAnswer = async () => {}; // the request stays open, as it does while the server hears her
  await openAsk('w3');
  await sendIt();
  await waitFor(() => document.querySelector('#focus-doc [data-component="team-reading"]').dataset.state === 'reading', 'reading');
  await dispatch({ type: 'chime.error', askId: 'w3', seat: 'design', error: 'claude timed out' });
  await waitFor(() => document.querySelector('#focus-doc [data-component="team-reading"]').dataset.state === 'failed', 'the failure line');
  assert.ok((await team()).retry);
  assert.strictEqual(await page.getAttribute('#focus-doc [data-component="team-reading"]', 'data-why'), 'chime.error');
  await page.evaluate(() => BYOC.focusDoc.close(true));
});

test('slow beyond 25 s: "Still reading…" with Retry; a resend while the first is still heard keeps her waiting', async () => {
  answers.length = 0;
  onAnswer = async () => {}; // never answers
  await openAsk('w4');
  await sendIt();
  await waitFor(() => document.querySelector('#focus-doc [data-component="team-reading"]').dataset.state === 'reading', 'reading');
  await page.waitForTimeout(20000);
  assert.strictEqual((await team()).state, 'reading', 'still the reading line at 20 s');
  await waitFor(() => document.querySelector('#focus-doc [data-component="team-reading"]').dataset.state === 'slow', 'Still reading at 25 s', undefined, 15000);
  const t = await team();
  assert.match(t.text, /^Still reading…/);
  assert.ok(t.retry);
  onAnswer = async r => r.fulfill({ status: 202, json: { pending: true } });
  await page.click('#focus-doc .fd-retry');
  await waitFor(() => document.querySelector('#focus-doc [data-component="team-reading"]').dataset.state === 'reading', 'back to reading after a pending resend');
  assert.strictEqual(answers.length, 2);
  await page.evaluate(() => BYOC.focusDoc.close(true));
  assert.deepStrictEqual(errors, []);
});
