// IDEA -> YOU -> TEAM (Vincent, Sun 01:21): her idea first, then her name tag, then the team, each teammate's line
// tailored to her idea (one call fired at the idea, never waited on), then the room opens with her idea on her sheet and
// the run started. ?setup=classic keeps the old order. Model routes stubbed. Run: node --test e2e/reorder.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3300 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-reorder-e2e-');
const IDEA = "An ordering website for my friend's small bakery";
const LINES = { research: "I'll find out who buys bread there every week.", design: "I'll sketch the order page, warm and quick." };
let srv, logs = '', browser;
before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 80 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

async function room({ look = '', lines = async r => r.fulfill({ json: { lines: LINES } }), query = '' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const posted = { run: [], meet: [] };
  await page.route('**/api/meet-lines', async r => { posted.meet.push(JSON.parse(r.request().postData())); await lines(r); });
  await page.route('**/api/name-tag', r => r.fulfill({ json: { title: 'the Journey Mapper', traits: ['ships it'], superpower: '' } }));
  await page.route('**/api/tidy', r => r.fulfill({ json: { text: JSON.parse(r.request().postData()).text, tidied: false } }));
  await page.route(/\/api\/run$/, r => { posted.run.push(JSON.parse(r.request().postData())); return r.fulfill({ json: { run: 'stub-run' } }); });
  await page.route('**/api/run/stub-run/**', r => r.fulfill({ json: { ok: true } }));
  await page.goto(BASE + '/?hold=150' + (look ? '&' + look.slice(1) : '') + query);
  await page.waitForFunction(() => window.BYOC && BYOC.setupOrder, null, { timeout: 8000 });
  return { page, errors, posted };
}
const meetStates = page => page.evaluate(() => window.__meet || []);
const watchMeet = page => page.evaluate(() => { window.__meet = []; window.__kit = {}; BYOC.on('meet', () => { const c = document.querySelector('.meet-card'); if (c) { window.__meet.push([c.dataset.seat, c.dataset.state, c.querySelector('[data-slot="line"]').textContent]); window.__kit[c.dataset.seat] = [...c.querySelectorAll('[data-slot="live-item"]')].map(li => li.textContent); (window.__made = window.__made || {})[c.dataset.seat] = [...c.querySelectorAll('[data-slot="built-item"]')].map(li => li.textContent); (window.__intro = window.__intro || {})[c.dataset.seat] = c.querySelector('[data-slot="intro"]')?.textContent; } }); });

for (const [lookName, look] of [['plain', ''], ['painted', '?look=painted']]) {
  test(`${lookName}: idea, then her name tag, then the team with lines tailored to her idea, then the room with her idea and the run started`, async () => {
    const { page, errors, posted } = await room({ look });
    await watchMeet(page);
    // 1. the idea paper, first
    assert.equal(await page.getAttribute('#setup', 'data-step'), 'idea');
    assert.equal(await page.getAttribute('[data-component="idea-card"]', 'data-state'), 'asking');
    assert.equal((await page.textContent('.idea-card [data-slot="question"]')).trim(), 'What do you want to build today?');
    assert.ok(await page.isVisible('#idea-input'), 'her idea field is on screen');
    assert.equal(await page.locator('.nt-paper').count(), 0, 'no name tag yet');
    await page.click('#idea-input'); await page.keyboard.type(IDEA); await page.keyboard.press('Enter');
    // 2. her name tag, second; the tailored lines were asked for with her idea
    await page.waitForFunction(() => document.getElementById('setup').dataset.step === 'nametag', null, { timeout: 3000 });
    assert.deepEqual(posted.meet, [{ idea: IDEA }]);
    assert.equal(await page.evaluate(() => BYOC.pendingIdea), IDEA);
    await page.click('#intro-input'); await page.keyboard.type('I love talking to customers'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
    await page.keyboard.press('Enter');
    // 3. the team: tailored where a line came back, static where it didn't
    await page.waitForFunction(() => BYOC.beat >= 4, null, { timeout: 20000 });
    const met = await meetStates(page);
    assert.equal(met.length, 5, 'five teammates met');
    assert.deepEqual(met.find(m => m[0] === 'research'), ['research', 'tailored', `“${LINES.research}”`]);
    assert.deepEqual(met.find(m => m[0] === 'design'), ['design', 'tailored', `“${LINES.design}”`]);
    assert.equal(met.find(m => m[0] === 'data')[1], 'static');
    // The cards (the PO's copy): an intro, then "Live in this room" (computed on the server, not stubbed) and "Built with"
    const kit = await page.evaluate(() => window.__kit), made = await page.evaluate(() => window.__made), intro = await page.evaluate(() => window.__intro);
    assert.match(intro.research, /^I’m [A-Z][a-z]+\./); assert.match(intro.engineering, /^I’m Bo\./);
    assert.ok(kit.research.includes('Prepared finding if nothing verifies (labelled)') && !kit.research.some(x => /Linkup/.test(x)), 'Noor: no Linkup chip without a key on this server');
    assert.ok(kit.engineering.includes('Builds her page from her decisions') && kit.engineering.includes('Schema-checked template fill'));
    for (const [seat, l] of Object.entries(kit)) assert.ok(l.some(x => /^Claude/.test(x)), `${seat}'s card names the Claude it thinks with`);
    assert.ok(!kit.design.some(x => /emblem/.test(x)), 'no live emblem off fal');
    assert.ok(made.design.includes('The room’s frames in Figma') && made.design.includes('taste-skill (MIT)'));
    assert.deepEqual(made.research, ['Linkup']);
    assert.ok(made.engineering.includes('Claude Code'));
    assert.deepEqual(made.data, ['Claude Code']);
    // 4. the room: her idea on her sheet, the run started with it (never asked again), her journey input next
    assert.equal((await page.textContent('#her-idea')).trim(), IDEA);
    assert.equal(posted.run.length, 1); assert.equal(posted.run[0].idea, IDEA); assert.match(posted.run[0].intro, /^I love /);
    assert.equal(await page.evaluate(() => BYOC.run), 'stub-run');
    await page.waitForFunction(() => document.activeElement?.id === 'her-input', null, { timeout: 3000 });
    assert.deepStrictEqual(errors, []);
    await page.close();
  });
}

test('a slow tailored-lines call never holds the team up: static lines on time (capped at 6 s), the room opens as usual', async () => {
  const { page, posted } = await room({ lines: () => new Promise(() => {}) });
  await watchMeet(page);
  await page.click('#idea-input'); await page.keyboard.type(IDEA); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('setup').dataset.step === 'nametag', null, { timeout: 3000 });
  await page.click('#intro-input'); await page.keyboard.type('I love talking to customers'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
  const t0 = Date.now();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => BYOC.beat >= 4, null, { timeout: 20000 });
  const met = await meetStates(page);
  assert.equal(met.length, 5);
  assert.ok(met.every(m => m[1] === 'static'), 'all static while the call hangs');
  assert.ok(Date.now() - t0 < 12000, `the team didn't wait on the call (${Date.now() - t0} ms)`);
  assert.equal(posted.run[0].idea, IDEA, 'the run still starts with her idea');
  await page.close();
});

test('the clicker: forward on an empty idea paper moves on to the name tag; the room then asks for the idea as before', async () => {
  const { page, posted } = await room();
  await page.keyboard.press('PageDown');
  await page.waitForFunction(() => document.getElementById('setup').dataset.step === 'nametag', null, { timeout: 3000 });
  assert.equal(posted.meet.length, 0, 'no idea, no call');
  await page.keyboard.press('PageDown'); // empty name tag: on to the team
  for (let i = 0; i < 8 && !(await page.evaluate(() => document.activeElement?.id === 'her-input')); i++) { await page.keyboard.press('PageDown'); await page.waitForTimeout(400); }
  await page.waitForFunction(() => document.activeElement?.id === 'her-input', null, { timeout: 8000 });
  assert.equal(await page.evaluate(() => BYOC.run), null, 'no run until she gives the idea');
  await page.close();
});

test('?setup=classic keeps the old order: her name tag first, her idea at the reveal', async () => {
  const { page, posted } = await room({ query: '&setup=classic' });
  assert.equal(await page.evaluate(() => BYOC.setupOrder), 'classic');
  assert.equal(await page.getAttribute('#setup', 'data-step'), 'nametag');
  assert.equal(await page.locator('.idea-card').count(), 0);
  assert.equal(posted.meet.length, 0);
  await page.close();
});

test('meet the team waits for her (no ?hold=): each card stays until Next, Enter or the clicker; the last reads "Into the studio"', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/api/meet-lines', r => r.fulfill({ json: { lines: {} } }));
  await page.route('**/api/name-tag', r => r.fulfill({ json: { title: 'the Journey Mapper', traits: ['ships it'], superpower: '' } }));
  await page.route('**/api/tidy', r => r.fulfill({ json: { text: JSON.parse(r.request().postData()).text, tidied: false } }));
  await page.route(/\/api\/run$/, r => r.fulfill({ json: { run: 'stub-run' } }));
  await page.route('**/api/run/stub-run/**', r => r.fulfill({ json: { ok: true } }));
  await page.goto(BASE + '/');
  await page.waitForFunction(() => window.BYOC && BYOC.ideaOpen && BYOC.ideaOpen());
  await page.click('#idea-input'); await page.keyboard.type(IDEA); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('setup').dataset.step === 'nametag');
  await page.click('#intro-input'); await page.keyboard.type('I love talking to customers'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.nt-paper')?.dataset.state === 'shown', null, { timeout: 8000 });
  await page.keyboard.press('Enter');
  await page.waitForSelector('.meet-card');
  const seat = () => page.getAttribute('.meet-card', 'data-seat');
  const first = await seat();
  await page.waitForTimeout(3000);
  assert.equal(await seat(), first, 'still the first card after 3 s');
  assert.equal((await page.textContent('.meet-card [data-slot="next"]')).trim(), 'Next');
  await page.click('.meet-card [data-slot="next"]');
  await page.waitForFunction(s => document.querySelector('.meet-card')?.dataset.seat !== s, first, { timeout: 2000 });
  const second = await seat();
  await page.keyboard.press('Enter');
  await page.waitForFunction(s => document.querySelector('.meet-card')?.dataset.seat !== s, second, { timeout: 2000 });
  await page.keyboard.press('PageDown'); await page.waitForTimeout(150); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
  assert.equal(await page.getAttribute('.meet-card [data-slot="next"]', 'data-state'), 'last');
  assert.equal((await page.textContent('.meet-card [data-slot="next"]')).trim(), 'Into the studio');
  await page.click('.meet-card [data-slot="next"]');
  await page.waitForFunction(() => BYOC.beat >= 2, null, { timeout: 3000 });
  await page.close();
});

test('her idea line is tidied in place (BYOC.tidyInto) and the clean line is the idea: the meet lines and the run get it', async () => {
  const { page, posted } = await room({ query: '' });
  await page.unroute('**/api/tidy');
  await page.route('**/api/tidy', r => r.fulfill({ json: { text: IDEA, tidied: true } }));
  await page.click('#idea-input'); await page.keyboard.type('um so ' + IDEA.toLowerCase() + ' you know'); await page.keyboard.press('Enter');
  // The paper stays while her words rearrange: the field shows the clean line, marked cut, for about 1.7 s.
  await page.waitForFunction(() => document.getElementById('idea-input')?.dataset.state === 'tidied', null, { timeout: 3000 });
  assert.equal(await page.getAttribute('#idea-input', 'data-tidy'), 'cut');
  assert.equal(await page.inputValue('#idea-input'), IDEA);
  await page.waitForTimeout(900);
  assert.equal(await page.getAttribute('#setup', 'data-step'), 'idea', 'still on the idea paper while the animation plays');
  await page.waitForFunction(() => document.getElementById('setup').dataset.step === 'nametag', null, { timeout: 4000 });
  assert.equal(await page.evaluate(() => BYOC.pendingIdea), IDEA);
  assert.deepEqual(posted.meet, [{ idea: IDEA }]);
  await page.close();
});

test('never "undefined" on screen: an ask with no teammate name (her own seat, no `by`) reads "the team’s question" in her workspace and on the pads', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/api/run/stub-run/**', r => r.fulfill({ json: { ok: true } }));
  await page.goto(BASE + '/?look=painted');
  await page.waitForFunction(() => window.BYOC && BYOC.dispatch && BYOC.openWorkspace);
  await page.evaluate(() => {
    BYOC.stage(4, { instant: true }); BYOC.run = 'stub-run';
    BYOC.dispatch({ run: 'stub-run', type: 'run.start', idea: 'A bakery page', stagePath: true }, 'live');
    BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'q-anon', seat: 'product', question: 'Who is this for first?' }, 'live');
  });
  const texts = [];
  await page.evaluate(() => BYOC.openWorkspace()); await page.waitForTimeout(400);
  texts.push(await page.evaluate(() => document.body.innerText));
  for (const s of ['design', 'research', 'data', 'strategy', 'engineering']) {
    await page.evaluate(s => BYOC.openSketchpad(s), s); await page.waitForTimeout(200);
    texts.push(await page.evaluate(() => document.body.innerText));
  }
  for (const t of texts) assert.doesNotMatch(t, /\bundefined\b/, 'no "undefined" anywhere on screen');
  assert.ok(texts.some(t => /the team’s question/.test(t)), 'the safe fallback shows');
  await page.close();
});

for (const available of [true, false]) test(`"voice by ElevenLabs" in the hints only when the mic works (available: ${available})`, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/api/voice/status', r => r.fulfill({ json: { available } }));
  await page.goto(BASE + '/');
  await page.waitForFunction(() => window.BYOC && BYOC.ideaOpen && BYOC.ideaOpen());
  await page.waitForTimeout(1500);
  const credit = await page.evaluate(() => { const c = document.querySelector('.idea-card .voice-credit'); return c && !c.hidden && c.getBoundingClientRect().width > 0; });
  assert.equal(credit, available);
  if (available) {
    const word = await page.evaluate(() => document.querySelector('.idea-card .voice-word')?.textContent || '');
    assert.equal(word, 'tap or hold to speak · ElevenLabs', 'the mic says whose voice it is');
  }
  await page.close();
});
