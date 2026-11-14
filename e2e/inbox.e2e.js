// Her inbox (DEMO "Her inbox"): one component by her seat, replacing the tray. No models: the asks and owner tasks are
// dispatched as events in the contract's shapes. Checks: collapsed shows the one item that needs her or "Nothing needs
// you right now"; expanded shows Needs you (one at a time, the rest folded), Things only you can do (owner.task only,
// plain steps she ticks, never a text or key field), and Past meetings (a stub for now); no numbers; clicking the item
// opens it as her document. Run: node --test e2e/inbox.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3800 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-inbox-e2e-');
let srv, logs = '', browser, page, errors = [];

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 50 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', e => errors.push(String(e)));
  // Opening an ask posts nothing, but stub the run routes so nothing reaches a model.
  await page.route('**/api/run/**', r => r.fulfill({ status: 200, json: { ok: true } }));
  await page.goto(BASE + '/?stage=1');
  await page.waitForFunction(() => window.BYOC && BYOC.inbox && BYOC.stage);
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

const waitFor = (fn, ms, what, arg) => page.waitForFunction(fn, arg, { timeout: ms }).catch(() => { throw new Error('timed out: ' + what); });
const ask = (id, seat, by, question) => ({ run: 'stub-run', type: 'ask', id, seat, by, question, artifact: { kind: 'journey' } });

test('collapsed with nothing waiting: "Nothing needs you right now"; the drawer has its three parts', async () => {
  await page.evaluate(() => { BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run'; });
  await waitFor(() => !document.getElementById('inbox').hidden, 3000, 'her inbox by her seat');
  const box = page.locator('#inbox');
  assert.strictEqual(await box.getAttribute('data-component'), 'inbox');
  assert.strictEqual(await box.getAttribute('data-state'), 'collapsed');
  assert.strictEqual(await box.getAttribute('data-needs'), 'no');
  assert.strictEqual((await page.locator('#inbox .inbox-now').innerText()).trim(), 'Nothing needs you right now');
  assert.ok(!(await page.isVisible('#inbox .inbox-drawer')), 'the drawer is closed');
  await page.click('#inbox .inbox-toggle');
  assert.strictEqual(await box.getAttribute('data-state'), 'expanded');
  const parts = await page.locator('#inbox .inbox-part').evaluateAll(ps => ps.map(p => [p.dataset.part, p.querySelector('.inbox-part-title').textContent]));
  assert.deepStrictEqual(parts, [['needs', 'Needs you'], ['only-you', 'Things only you can do'], ['meetings', 'Past meetings']]);
  assert.strictEqual((await page.locator('#inbox [data-part="only-you"] .inbox-empty').innerText()).trim(), 'Nothing only you can do');
  assert.strictEqual(await page.getAttribute('#inbox [data-part="meetings"] .inbox-part-body', 'data-state'), 'stub');
  await page.click('#inbox .inbox-toggle');
  assert.strictEqual(await box.getAttribute('data-state'), 'collapsed');
});

test('asks arrive after a natural pause; collapsed shows the one that needs her, the rest fold; no numbers', async () => {
  await page.evaluate(a => a.forEach(e => BYOC.dispatch(e, 'live')), [
    ask('q1', 'research', 'Noor', 'What makes someone come back to a studio week after week?'),
    ask('q2', 'design', 'Mika', 'What should booking feel like?'),
  ]);
  await waitFor(() => document.getElementById('inbox').dataset.needs === 'yes', 4000, 'an item needs her');
  assert.match((await page.locator('#inbox .inbox-now').innerText()).replace(/\s+/g, ' ').trim(), /^Noor · Research ?What makes someone come back to…\?$/);
  assert.strictEqual(await page.getAttribute('#inbox .inbox-now', 'data-ask'), 'q1');
  await page.click('#inbox .inbox-toggle');
  assert.strictEqual(await page.locator('#inbox [data-part="needs"] > .inbox-part-body > .inbox-item[data-state="top"]').count(), 1, 'one at a time');
  assert.strictEqual(await page.locator('#inbox .inbox-next .inbox-item[data-state="folded"]').count(), 1, 'the next one folded');
  assert.ok(!(await page.locator('#inbox .inbox-next').evaluate(d => d.open)), 'folded until she opens it');
  assert.ok(!(await page.locator('#inbox').textContent()).match(/\b\d+\b/), 'no numbers anywhere');
  await page.click('#inbox .inbox-toggle');
});

test('Things only you can do: owner.task steps she ticks off; never a text, password or key field', async () => {
  await page.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'owner.task', id: 't1', title: 'Make a Stripe account for the studio',
    steps: ['Go to stripe.com and sign up with the studio email', 'Confirm the email', 'Tell the team it is done'] }, 'live'));
  await page.click('#inbox .inbox-toggle');
  const task = page.locator('#inbox [data-component="owner-task"][data-task="t1"]');
  await task.waitFor();
  assert.strictEqual((await task.locator('.inbox-task-title').innerText()).trim(), 'Make a Stripe account for the studio');
  assert.strictEqual(await task.locator('.inbox-step').count(), 3);
  assert.strictEqual(await task.getAttribute('data-state'), 'todo');
  // The whole inbox holds no field she could type a secret into: only tick boxes.
  assert.strictEqual(await page.locator('#inbox input:not([type="checkbox"]), #inbox textarea, #inbox [contenteditable="true"]').count(), 0, 'no key or secret input');
  const ticks = task.locator('input[type="checkbox"]');
  await ticks.nth(0).check();
  assert.strictEqual(await task.getAttribute('data-state'), 'doing');
  await ticks.nth(1).check(); await ticks.nth(2).check();
  assert.strictEqual(await page.locator('#inbox [data-task="t1"]').getAttribute('data-state'), 'done');
  await page.click('#inbox .inbox-toggle');
});

test('clicking the item opens it as her document; the inbox steps aside; the answered one leaves', async () => {
  await page.click('#inbox .inbox-now');
  await waitFor(() => BYOC.focusDoc && BYOC.focusDoc.isOpen(), 3000, 'her document');
  assert.strictEqual(await page.evaluate(() => BYOC.focusDoc.openId()), 'q1');
  assert.ok(!(await page.isVisible('#inbox')), 'the inbox is out of the way while she is in her document');
  await page.evaluate(() => { BYOC.dispatch({ run: 'stub-run', type: 'answer', askId: 'q1', text: 'Knowing their spot is theirs.' }, 'live'); BYOC.focusDoc.close(true); });
  await waitFor(() => !document.getElementById('inbox').hidden && document.querySelector('#inbox .inbox-now').dataset.ask === 'q2', 4000, 'the next one comes up');
  assert.deepStrictEqual(await page.evaluate(() => BYOC.inbox.shown.map(n => n.id)), ['q2']);
  // The clicker's forward key opens the item that needs her.
  await page.keyboard.press('PageDown');
  await waitFor(() => BYOC.focusDoc.isOpen() && BYOC.focusDoc.openId() === 'q2', 3000, 'forward opens it');
  await page.evaluate(() => BYOC.focusDoc.close(true));
  assert.deepStrictEqual(errors, []);
});
