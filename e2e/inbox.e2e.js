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
// E2E_LOOK=painted runs it in the demo look (as beats.e2e.js); unset, the plain room.
const L = u => process.env.E2E_LOOK ? u + (u.includes('?') ? '&' : '?') + 'look=' + process.env.E2E_LOOK : u;
const RUNS = fs.mkdtempSync('/tmp/byoc-inbox-e2e-');
let srv, logs = '', browser, page, errors = [];

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  // Wait for the server to say it's up (event-driven on its output), with a generous bound for a loaded machine.
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('server did not start in 20 s:\n' + logs)), 20000);
    const check = () => { if (logs.includes('room on')) { clearTimeout(t); res(); } };
    srv.stdout.on('data', check); srv.stderr.on('data', check); check();
  });
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', e => errors.push(String(e)));
  // Opening an ask posts nothing, but stub the run routes so nothing reaches a model.
  await page.route('**/api/run/**', r => r.fulfill({ status: 200, json: { ok: true } }));
  await page.goto(BASE + L('/?stage=1'));
  await page.waitForFunction(() => window.BYOC && BYOC.inbox && BYOC.stage);
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

// Every condition below is set synchronously by the page (or after the inbox's ~1 s natural pause), and
// waitForFunction re-checks it on each animation frame, so the wait ends the moment it holds. The bound is only how
// long a loaded machine (the full e2e suite) may take before we call it broken: 3 s was too tight there, and flaked
// once in a full run. On a timeout the error says what the page looked like, so a real failure names its cause.
const WAIT_MS = 15000;
const snapshot = () => page.evaluate(() => { const b = document.getElementById('inbox'); return JSON.stringify({
  beat: BYOC.beat, inboxHidden: b && b.hidden, needs: b && b.dataset.needs, now: b && b.querySelector('.inbox-now')?.dataset.ask,
  shown: BYOC.inbox?.shown.map(n => n.id), waiting: (BYOC.focus?.waiting || []).map(n => n.id), focusOpen: BYOC.focus?.open || null,
  docOpen: BYOC.focusDoc?.isOpen?.(), docId: BYOC.focusDoc?.openId?.() }); }).catch(e => 'no snapshot: ' + e);
const waitFor = (fn, what, arg) => page.waitForFunction(fn, arg, { timeout: WAIT_MS })
  .catch(async () => { throw new Error(`timed out after ${WAIT_MS / 1000} s: ${what}; page: ${await snapshot()}`); });
const ask = (id, seat, by, question) => ({ run: 'stub-run', type: 'ask', id, seat, by, question, artifact: { kind: 'journey' } });

// Vincent, 15 Nov: ONE home at the top right; "Your inbox is empty" until something comes in; open, it takes the whole screen.
const rect = sel => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; }, sel);
test('empty at the top right: "Your inbox is empty"; open, it takes the whole screen with its three parts', async () => {
  await page.evaluate(() => { BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run'; });
  await waitFor(() => !document.getElementById('inbox').hidden, 'her inbox by her seat');
  const box = page.locator('#inbox');
  assert.strictEqual(await box.getAttribute('data-component'), 'inbox');
  assert.strictEqual(await box.getAttribute('data-state'), 'empty');
  assert.strictEqual(await box.getAttribute('data-needs'), 'no');
  assert.strictEqual((await page.locator('#inbox .inbox-now').innerText()).trim(), 'Your inbox is empty');
  assert.ok(!(await page.isVisible('#inbox .inbox-drawer')), 'the drawer is closed');
  const home = await rect('#inbox');
  assert.ok(home.r > home.vw * 0.75 && home.t < home.vh * 0.2, `its one home is the top right: ${JSON.stringify(home)}`);
  assert.strictEqual(await page.locator('#inbox #counter[data-slot="tally"]').count(), 1, 'the tally\'s counters live in it');
  await page.click('#inbox .inbox-toggle');
  assert.strictEqual(await box.getAttribute('data-state'), 'open');
  const full = await rect('#inbox');
  assert.ok(full.w > full.vw * 0.9 && full.h > full.vh * 0.9, `open, it takes over the whole screen: ${JSON.stringify(full)}`);
  const parts = await page.locator('#inbox .inbox-part').evaluateAll(ps => ps.map(p => [p.dataset.part, p.querySelector('.inbox-part-title').textContent]));
  assert.deepStrictEqual(parts, [['needs', 'Needs you'], ['only-you', 'Things only you can do'], ['meetings', 'Past meetings']]);
  assert.strictEqual((await page.locator('#inbox [data-part="only-you"] .inbox-empty').innerText()).trim(), 'Nothing only you can do');
  assert.strictEqual(await page.getAttribute('#inbox [data-part="meetings"] .inbox-part-body', 'data-state'), 'stub');
  await page.click('#inbox .inbox-toggle');
  assert.strictEqual(await box.getAttribute('data-state'), 'empty');
});

test('asks arrive after a natural pause; closed, it says only who ("Noor has a question"), no preview; open, the rest fold; no numbers', async () => {
  await page.evaluate(a => a.forEach(e => BYOC.dispatch(e, 'live')), [
    ask('q1', 'research', 'Noor', 'What makes someone come back to a studio week after week?'),
    ask('q2', 'design', 'Mika', 'What should booking feel like?'),
  ]);
  await waitFor(() => document.getElementById('inbox').dataset.needs === 'yes', 'an item needs her');
  // Only who, never the question (no preview in the room), and never "<seat>'s teammate".
  assert.strictEqual((await page.locator('#inbox .inbox-now').innerText()).trim(), 'Noor has a question');
  assert.strictEqual(await page.getAttribute('#inbox', 'data-state'), 'new');
  assert.ok(!(await page.locator('#room').innerText()).includes('What makes someone come back'), 'the question shows nowhere in the room');
  assert.ok(!(await page.isVisible('#team-status[data-state="question"]')), 'no second cue under her idea');
  assert.strictEqual(await page.getAttribute('#inbox .inbox-now', 'data-ask'), 'q1');
  await page.click('#inbox .inbox-toggle');
  assert.strictEqual(await page.locator('#inbox [data-part="needs"] > .inbox-part-body > .inbox-item[data-state="top"]').count(), 1, 'one at a time');
  assert.strictEqual(await page.locator('#inbox .inbox-next .inbox-item[data-state="folded"]').count(), 1, 'the next one folded');
  assert.ok(!(await page.locator('#inbox .inbox-next').evaluate(d => d.open)), 'folded until she opens it');
  assert.ok(!(await page.locator('#inbox').evaluate(b => [...b.childNodes].filter(n => n.id !== 'counter').map(n => n.textContent).join(' '))).match(/\b\d+\b/), 'no numbers anywhere (but the tally\'s own counters)');
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
  assert.strictEqual(await page.locator('#inbox [data-part="only-you"] :is(input:not([type="checkbox"]), textarea, [contenteditable="true"])').count(), 0, 'no key or secret input');
  const ticks = task.locator('input[type="checkbox"]');
  await ticks.nth(0).check();
  assert.strictEqual(await task.getAttribute('data-state'), 'doing');
  await ticks.nth(1).check(); await ticks.nth(2).check();
  assert.strictEqual(await page.locator('#inbox [data-task="t1"]').getAttribute('data-state'), 'done');
  await page.click('#inbox .inbox-toggle');
});

test('clicking the item opens it as her document; the inbox steps aside; the answered one leaves', async () => {
  await page.click('#inbox .inbox-now');
  await waitFor(() => BYOC.focusDoc && BYOC.focusDoc.isOpen(), 'her document');
  assert.strictEqual(await page.evaluate(() => BYOC.focusDoc.openId()), 'q1');
  assert.ok(!(await page.isVisible('#inbox')), 'the inbox is out of the way while she is in her document');
  await page.evaluate(() => { BYOC.dispatch({ run: 'stub-run', type: 'answer', askId: 'q1', text: 'Knowing their spot is theirs.' }, 'live'); BYOC.focusDoc.close(true); });
  await waitFor(() => !document.getElementById('inbox').hidden && document.querySelector('#inbox .inbox-now').dataset.ask === 'q2', 'the next one comes up');
  assert.deepStrictEqual(await page.evaluate(() => BYOC.inbox.shown.map(n => n.id)), ['q2']);
  // The clicker's forward key opens the item that needs her.
  await page.keyboard.press('PageDown');
  await waitFor(() => BYOC.focusDoc.isOpen() && BYOC.focusDoc.openId() === 'q2', 'forward opens it');
  await page.evaluate(() => BYOC.focusDoc.close(true));
  assert.deepStrictEqual(errors, []);
});

// ---- quick unblocks (DEMO 0:50): a real run on this server, raised and answered through the real routes; no models ----
async function newRun() {
  const r = await page.evaluate(async () => (await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idea: 'An ordering website for a small bakery', path: 'full' }) })).json());
  return r.run;
}
const raise = (run, body) => page.evaluate(async ([run, body]) => { const r = await fetch(`/api/run/${run}/unblock`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json() }; }, [run, body]);
const BO = { seat: 'engineering', question: 'When do orders close?', suggestion: '8pm the night before', kind: 'call', doing: 'Setting up ordering', topic: 'Orders close' };

test('a quick unblock: "Bo\'s blocked", Yes takes the suggestion, it lands in the team space as hers, Bo carries on', async () => {
  await page.unroute('**/api/run/**');
  await page.evaluate(() => { BYOC.reset(); });
  const run = await newRun();
  await page.evaluate(run => { BYOC.stage(5, { instant: true }); BYOC.run = run; }, run);
  const r = await raise(run, BO);
  assert.strictEqual(r.status, 200, JSON.stringify(r.json));
  await waitFor(() => document.getElementById('inbox').dataset.needs === 'yes', 'the unblock in her inbox');
  assert.strictEqual(await page.evaluate(() => BYOC.beat), 5, 'it did not move the beat');
  assert.match((await page.locator('#inbox .inbox-now').innerText()).replace(/\s+/g, ' '), /Bo's blocked/);
  await page.click('#inbox .inbox-now');
  const card = page.locator('#inbox article.inbox-action[data-component="inbox-action"][data-seat="engineering"]');
  await card.waitFor();
  assert.strictEqual(await page.getAttribute('#inbox', 'data-state'), 'open');
  assert.strictEqual(await page.getAttribute('#inbox', 'data-view'), 'action', 'its own full-screen page, not a drawer');
  const page1 = await rect('#inbox');
  assert.ok(page1.w > page1.vw * 0.9 && page1.h > page1.vh * 0.9, `full screen: ${JSON.stringify(page1)}`);
  assert.ok(!(await page.isVisible('#inbox [data-part="only-you"]')), 'only the card on its page');
  assert.strictEqual(await card.getAttribute('data-state'), 'asking');
  assert.strictEqual(await card.locator('[data-slot="yes"]').getAttribute('data-rank'), 'primary', 'Yes is the one primary action');
  assert.strictEqual(await card.locator('[data-slot="say"]').getAttribute('data-rank'), 'secondary');
  assert.strictEqual((await card.locator('[data-slot="blocked"]').innerText()).trim(), "Bo's blocked", 'always framed as unblocking a named teammate');
  assert.strictEqual((await card.locator('[data-slot="doing"]').innerText()).trim(), 'Setting up ordering');
  assert.strictEqual((await card.locator('[data-slot="question"]').innerText()).trim(), 'When do orders close?');
  assert.strictEqual((await card.locator('.ia-sug .ia-sug-text').innerText()).trim(), '8pm the night before');
  assert.strictEqual(await page.getAttribute('#inbox .inbox-now', 'data-action'), await card.getAttribute('data-action'), 'collapsed, it waits as an action');
  assert.ok(!(await page.evaluate(() => BYOC.focusDoc && BYOC.focusDoc.isOpen())), 'no document: it is answered right here');
  const evsBefore = await page.evaluate(() => { window.__emitted = []; BYOC.on('action.yes', e => window.__emitted.push(['yes', e])); return 0; });
  await card.locator('[data-slot="yes"]').click();
  assert.deepStrictEqual(await page.evaluate(() => window.__emitted.map(([k, e]) => [k, e.choice])), [['yes', '8pm the night before']], 'action.yes emitted');
  await waitFor(() => document.getElementById('inbox').dataset.needs === 'no', 'answered, it leaves Needs you');
  await waitFor(() => document.getElementById('inbox').dataset.state === 'empty', 'and the page closes back to the room');
  await waitFor(() => !!document.querySelector('.team-space .ts-card[data-kind="unblock"]'), 'a decided card in the team space');
  const ts = page.locator('.team-space .ts-card[data-kind="unblock"]');
  assert.strictEqual((await ts.locator('.ts-headline').innerText()).trim(), 'Orders close 8pm the night before');
  assert.deepStrictEqual(await ts.locator('.ts-mark').evaluateAll(ms => ms.map(m => m.dataset.seat)), ['product', 'engineering'], 'her mark and Bo\'s');
  assert.strictEqual(await ts.getAttribute('data-seat'), 'engineering', 'owned by Bo\'s seat');
  assert.strictEqual(await ts.getAttribute('data-her'), '', 'carries her mark');
  assert.strictEqual((await ts.locator('.ts-yours').innerText()).trim().toLowerCase(), 'your call');
  const evs = await page.evaluate(() => BYOC.events().map(e => e.type + ':' + (e.unblock ? 'u' : '') + (e.cites || '')));
  assert.ok(evs.includes('decided:uher yes'), evs.join(' '));
  assert.ok(evs.some(e => e.startsWith('chatter')), 'Bo carries on');
});

test('her own words instead of the suggestion; the cap still counts the unblock', async () => {
  await page.evaluate(() => { BYOC.reset(); });
  const run = await newRun();
  await page.evaluate(run => { BYOC.stage(5, { instant: true }); BYOC.run = run; }, run);
  assert.strictEqual((await raise(run, BO)).status, 200);
  await waitFor(() => document.getElementById('inbox').dataset.needs === 'yes', 'the unblock');
  await page.click('#inbox .inbox-now');
  const card = page.locator('#inbox article.inbox-action');
  await card.locator('[data-slot="say"]').click();
  assert.strictEqual(await card.getAttribute('data-state'), 'speaking');
  const own = card.locator('.ia-hers');
  assert.strictEqual(await own.getAttribute('data-voice'), 'unblock', 'her voice opens on the card');
  assert.ok(await card.locator('.ia-sug.hers .ia-was').isVisible(), 'the old suggestion, struck through below');
  await own.fill('7pm the night before');
  assert.strictEqual((await card.locator('.ia-say-label').innerText()).trim(), 'Say it again');
  await card.locator('[data-slot="yes"]').click();
  await waitFor(() => !!document.querySelector('.team-space .ts-card[data-kind="unblock"]'), 'her answer in the team space');
  assert.strictEqual((await page.locator('.team-space .ts-card[data-kind="unblock"] .ts-headline').innerText()).trim(), 'Orders close 7pm the night before');
  // Two more raises fill her three; a fourth is refused and decided on the suggestion, never asked.
  assert.strictEqual((await raise(run, { ...BO, seat: 'design', question: 'Which loaf leads the page?', suggestion: 'Sourdough', kind: 'call' })).status, 200);
  assert.strictEqual((await raise(run, { ...BO, seat: 'strategy', question: 'What does a loaf cost?', suggestion: '£4.50', kind: 'fact' })).status, 200);
  const fourth = await raise(run, { ...BO, seat: 'data', question: 'What counts as a regular?', suggestion: 'Twice a month', kind: 'fact' });
  assert.strictEqual(fourth.status, 409, 'the fourth is refused by the policy');
  assert.deepStrictEqual(errors, []);
});

test('her spoken answer is tidied in place (data-raw / data-state / data-tidy on .ia-hers), and Yes sends the tidy', async () => {
  const RAW = 'Uh, orders close, uh, at, so 10:00 PM the day before';
  const CLEAN = 'Orders close at 10:00 PM the day before';
  let tidyBody = null;
  await page.route('**/api/tidy', async r => { tidyBody = r.request().postDataJSON(); await new Promise(ok => setTimeout(ok, 300)); r.fulfill({ status: 200, json: { text: CLEAN } }); });
  try {
    await page.evaluate(() => { BYOC.reset(); });
    const run = await newRun();
    await page.evaluate(run => { BYOC.stage(5, { instant: true }); BYOC.run = run; }, run);
    assert.strictEqual((await raise(run, BO)).status, 200);
    await waitFor(() => document.getElementById('inbox').dataset.needs === 'yes', 'the unblock');
    await page.click('#inbox .inbox-now');
    const card = page.locator('#inbox article.inbox-action');
    await card.locator('[data-slot="say"]').click();
    // What voice.js does with a spoken take on a data-voice field.
    await page.evaluate(raw => { const el = document.querySelector('.ia-hers'); el.textContent = raw;
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new CustomEvent('byoc:voice', { detail: { text: raw } })); }, RAW);
    const own = card.locator('.ia-hers');
    assert.strictEqual(await own.getAttribute('data-state'), 'tidying', 'her raw words show while it tidies');
    assert.strictEqual(await own.getAttribute('data-raw'), RAW);
    await waitFor(() => document.querySelector('.ia-hers').dataset.state === 'tidied', 'tidied');
    assert.strictEqual((await own.innerText()).trim(), CLEAN);
    assert.strictEqual(await own.getAttribute('data-tidy'), 'cut');
    assert.strictEqual(tidyBody.text, RAW);
    await card.locator('[data-slot="yes"]').click();
    await waitFor(() => !!document.querySelector('.team-space .ts-card[data-kind="unblock"]'), 'her answer in the team space');
    const ev = await page.evaluate(() => BYOC.events().filter(e => e.type === 'decided' && e.unblock).pop());
    assert.strictEqual(ev.choice, CLEAN, 'Yes sends the tidied line, tidied once');
  } finally { await page.unroute('**/api/tidy'); }
  assert.deepStrictEqual(errors, []);
});
