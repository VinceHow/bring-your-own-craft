// Her name tag on paper (the first live beat): name "Priya", Product, her sentence, Enter in that field. There is always
// a visible state within 300 ms; her rough card (her own words) lands at once with "Meet your team" ready, and the
// team's read fills it in place when it comes. A slow or failed call never blocks her: she can meet the team any time.
// The "Make my tag" button is the click path. Each runs on the plain look and on ?look=painted (a look restyles, never
// hides a control). The model routes are stubbed (no model calls). Run: node --test e2e/nametag.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3700 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-nametag-e2e-');
const SAID = 'figuring out customer journeys and understanding customer problems and shipping';
const TAG = { title: 'the Journey Mapper', traits: ['customer-obsessed', 'ships it'], superpower: 'sees the whole path' };
let srv, logs = '', browser;

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 80 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

// A fresh page with the tidy and the name-tag call stubbed: tag(route) decides what the name-tag call does.
async function card(tag, { tidyMs = 0, look = '' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const calls = { tag: 0, tidy: 0, parts: [] };
  await page.route('**/api/tidy', async r => { calls.tidy++; await new Promise(f => setTimeout(f, tidyMs)); await r.fulfill({ status: 200, json: { text: JSON.parse(r.request().postData()).text, tidied: false } }); });
  await page.route('**/api/name-tag', async r => { calls.tag++; calls.parts.push(JSON.parse(r.request().postData() || '{}').part || 'full'); await tag(r, calls.tag); });
  await page.goto(BASE + '/' + (look ? look + '&' : '?') + 'setup=classic'); // the name tag itself (the new order: e2e/reorder.e2e.js)
  await page.evaluate(() => BYOC.on('tag.profile', () => { window.__profile = { after: document.querySelector('.nt-paper')?.dataset.state === 'shown' || !!(BYOC.herTag && BYOC.herTag.title) }; }));
  await page.waitForFunction(() => window.BYOC && BYOC.introOpen && BYOC.introOpen(), null, { timeout: 8000 });
  await page.fill('#nt-name', 'Priya');
  await page.click('.pick-option[data-pick="product"]');
  await page.fill('#intro-input', SAID);
  await page.focus('#intro-input');
  return { page, errors, calls };
}
const status = page => page.evaluate(() => { const s = document.querySelector('.nt-status'); return { state: s?.dataset.state, text: s?.textContent || '', card: document.querySelector('.nt-paper')?.dataset.state }; });
const visible = page => page.evaluate(() => { const s = document.querySelector('.nt-status'); if (!s) return false; const r = s.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(s).visibility !== 'hidden' && getComputedStyle(s).display !== 'none'; });
const ok = ms => async r => { await new Promise(f => setTimeout(f, ms)); await r.fulfill({ status: 200, json: TAG }); };

// On screen: a real box, not display:none, visibility:hidden or zero opacity.
const shown = (page, sel) => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0; }, sel);
const LOOKS = [['plain', ''], ['painted', '?look=painted']];

for (const [lookName, look] of LOOKS) {
  test(`${lookName}: Enter in her love/bring field: progress within 300 ms, her rough card at once, then the team's read in place`, async () => {
    const { page, errors, calls } = await card(ok(1500), { tidyMs: 800, look });
    for (const sel of ['#nt-name', '#intro-input', '.nt-make']) assert.ok(await shown(page, sel), `${sel} on screen (${lookName})`);
    const t0 = Date.now();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.nt-status')?.dataset.state === 'thinking', null, { timeout: 300 });
    assert.ok(Date.now() - t0 <= 300 + 150, `progress shown in ${Date.now() - t0} ms`);
    assert.match((await status(page)).text, /writing your tag/i);
    assert.ok(await visible(page), 'the progress line is on screen');
    // The tidy (800 ms) done, her rough card is up before the team answers (1.5 s), Meet your team ready.
    await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'rough', null, { timeout: 2000 });
    assert.equal((await status(page)).state, 'polishing');
    assert.match((await status(page)).text, /adding its spin/i);
    assert.ok(await visible(page), 'the polishing line is on screen');
    assert.equal(await page.textContent('.nt-make'), 'Meet your team');
    assert.ok(await shown(page, '.nt-make'), 'Meet your team on screen');
    assert.match(await page.textContent('.nt-paper .char-who'), /Priya/);
    await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
    assert.match(await page.textContent('.nt-paper'), /Priya, the Journey Mapper/);
    assert.equal(await page.textContent('.nt-make'), 'Meet your team');
    // Two calls: the card she waits on, then the rest in the background (its event lands after the card).
    await page.waitForFunction(() => window.__profile, null, { timeout: 5000 });
    assert.deepEqual(calls.parts, ['card', 'more']);
    assert.ok(await page.evaluate(() => window.__profile.after), 'the profile arrives after the card');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => BYOC.beat === 1, null, { timeout: 3000 });
    assert.deepStrictEqual(errors, []);
    await page.close();
  });

  test(`${lookName}: the click path: "Make my tag" makes it, then "Meet your team" meets the team`, async () => {
    const { page } = await card(ok(500), { look });
    await page.click('.nt-make');
    await page.waitForFunction(() => ['thinking', 'polishing', 'slow', 'rough', 'done'].includes(document.querySelector('.nt-status')?.dataset.state), null, { timeout: 15000 }); // the 300 ms contract is checked in the Enter test (its tidy holds 'thinking'); here it may already be past it
    await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
    await page.click('.nt-make');
    await page.waitForFunction(() => BYOC.beat === 1, null, { timeout: 3000 });
    await page.close();
  });

  test(`${lookName}: a call that never answers never blocks her: she meets the team on her rough card, and a late read reaches her place card`, async () => {
    let release; const late = new Promise(f => (release = f));
    const { page } = await card(async r => { await late; await r.fulfill({ status: 200, json: TAG }); }, { look });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'rough', null, { timeout: 3000 });
    await page.keyboard.press('Enter'); // meet the team now
    await page.waitForFunction(() => BYOC.beat === 1, null, { timeout: 3000 });
    release();
    await page.waitForFunction(() => BYOC.herTag && BYOC.herTag.title === 'the Journey Mapper', null, { timeout: 5000 });
    await page.close();
  });
}

test('slow: it says it is still polishing; it still lands in place', async () => {
  const { page } = await card(ok(7500));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-status')?.dataset.state === 'slow', null, { timeout: 8000 });
  assert.match((await status(page)).text, /still adding its spin/i);
  assert.equal(await page.textContent('.nt-make'), 'Meet your team', 'never blocked while slow');
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
  await page.close();
});

test('failed, or back with nothing usable: her rough card stays, said plainly, and she meets the team', async () => {
  for (const reply of [r => r.fulfill({ status: 502, json: { error: 'model timeout' } }), r => r.fulfill({ status: 200, json: { title: '', traits: [], rough: true } })]) {
    const { page } = await card(reply);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.nt-status')?.dataset.state === 'rough', null, { timeout: 5000 });
    assert.match((await status(page)).text, /in your own words/i);
    assert.equal((await status(page)).card, 'rough', 'never a blank or broken tag');
    assert.equal(await page.textContent('.nt-make'), 'Meet your team');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => BYOC.beat === 1, null, { timeout: 3000 });
    await page.close();
  }
});

test('Shift+Enter adds a new line instead of sending', async () => {
  const { page } = await card(ok(0));
  await page.keyboard.press('Shift+Enter');
  await page.waitForTimeout(200);
  assert.equal((await status(page)).card, 'asking');
  assert.match(await page.inputValue('#intro-input'), /\n$/);
  await page.close();
});

test('after the mic (her words land through BYOC.typeInto), Enter still makes the tag', async () => {
  const { page } = await card(ok(300));
  await page.fill('#intro-input', '');
  await page.focus('#nt-name'); // the mic can be used from anywhere on the card
  await page.evaluate(s => BYOC.typeInto(s), SAID);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'intro-input');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => ['thinking', 'polishing', 'slow', 'rough', 'done'].includes(document.querySelector('.nt-status')?.dataset.state), null, { timeout: 15000 }); // the 300 ms contract is checked in the Enter test (its tidy holds 'thinking'); here it may already be past it
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 5000 });
  await page.close();
});

for (const [lookName, look] of LOOKS) test(`${lookName}: after the team, her idea input is on screen and focused (a look never hides it), and typing goes into it`, async () => {
  const { page } = await card(ok(0), { look });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 5000 });
  await page.keyboard.press('Enter');
  for (let i = 0; i < 8 && !(await page.evaluate(() => !document.getElementById('her-form').hidden && document.querySelectorAll('.seat .card').length === 6)); i++) {
    await page.keyboard.press('PageDown'); await page.waitForTimeout(1000);
  }
  await page.waitForFunction(() => document.activeElement?.id === 'her-input', null, { timeout: 5000 });
  assert.ok(await shown(page, '#her-input'), 'her idea input on screen');
  await page.keyboard.type('srb'); // shortcut letters (S, R, B) go into her input, not to the room
  assert.equal(await page.inputValue('#her-input'), 'srb');
  assert.ok(await page.evaluate(() => !BYOC.replay && !document.body.classList.contains('stage')), 'no shortcut fired');
  await page.close();
});

for (const [lookName, look] of LOOKS) test(`${lookName}: "Your own craft" is a seat choice on the same paper: one name tag, both labels, and she sits in her own craft`, async () => {
  const { page } = await card(async r => r.fulfill({ status: 200, json: { ...TAG, craft: 'Tattoo artist', goodAt: 'fine lines', loves: 'flowers' } }), { look });
  const oneTag = () => page.evaluate(() => [...document.querySelectorAll('.name-tag, .nt-paper, [data-component="character-card"]')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }).length);
  const labels = () => page.evaluate(() => [...document.querySelectorAll('.nt-paper .pick-option')].map(b => {
    const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
    return r.width > 0 && cs.visibility !== 'hidden' && cs.color !== cs.backgroundColor && +cs.opacity > 0 ? b.innerText.trim() : '';
  }));
  for (const seat of ['craft', 'product', 'craft']) {
    await page.click(`.nt-paper .pick-option[data-pick="${seat}"]`);
    await page.waitForTimeout(150);
    assert.equal(await oneTag(), 1, `exactly one name tag after picking ${seat}`);
    assert.deepEqual(await labels(), ['Product', 'Your own craft'], `both seat labels show after picking ${seat}`);
    assert.equal(await page.getAttribute(`.nt-paper .pick-option[data-pick="${seat}"]`, 'aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'intro-input', 'her words are next');
  }
  await page.fill('#intro-input', 'I do fine-line tattoos and I love flowers');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 5000 });
  await page.waitForFunction(() => window.__profile, null, { timeout: 5000 });
  assert.equal(await oneTag(), 1, 'still one name tag');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => BYOC.beat === 1, null, { timeout: 3000 });
  assert.deepEqual(await page.evaluate(() => [BYOC.herSeat, BYOC.herTag.craft, BYOC.herTag.title]), ['diy', 'Tattoo artist', 'the Journey Mapper']);
  await page.close();
});
