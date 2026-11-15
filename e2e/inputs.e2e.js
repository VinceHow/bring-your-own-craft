// Every input on the stage path is a good input (docs/POLISH.md §2, §4): the idea card, the name tag, her sheet's line
// (journey lines, the sketch reaction), the meeting's pieces and replies, Bo's unblock answer, and the judge's idea.
// For each, in both looks at 1920×1130 and 1440×900:
//   - the mic is there (voice by ElevenLabs), next to the field;
//   - shortcut letters typed inside (s r j ? v) fire nothing: no beat change, no REPLAY, no help card, the letters land;
//   - a ~300-word paste: the field holds it inside itself; no page scrollbar; the field stays inside its card; the
//     primary control stays on screen;
//   - empty + Enter submits nothing (no request, no error);
//   - Shift+Enter makes a new line where the field is multi-line;
//   - Enter with words: something visibly answers within 300 ms (a state, a label, the tidy);
//   - Esc lets go of the field.
// Stubs only: no model is called (every /api/ route is answered here; the tidy is held 900 ms so its state shows).
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = new URL('..', import.meta.url).pathname;
const RUNS = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-inputs-'));
const PORT = 4380 + Math.floor(Math.random() * 40);
const BASE = `http://localhost:${PORT}`;
let srv, browser;

const LOOKS = (process.env.E2E_LOOK ? [process.env.E2E_LOOK] : ['painted', 'plain']);
const SIZES = [[1920, 1130], [1440, 900]];
const WORDS = ('the regulars come in every morning before work and they want their usual loaf held for them so they ' +
  'do not have to queue or worry that the sourdough has sold out by nine which happens most days in winter ').split(' ').filter(Boolean);
const LONG = Array.from({ length: 300 }, (_, i) => WORDS[i % WORDS.length]).join(' ');

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  let logs = ''; srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 80 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); });

// A page with every model-bound route answered here. Posts are counted so "empty sends nothing" can be checked.
async function newPage(look, [w, h]) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  const posts = [];
  // reads pass through (cheap, no model); every post is answered here
  await p.route('**/api/**', r => { if (r.request().method() !== 'POST') return r.continue(); posts.push(new URL(r.request().url()).pathname); return r.fulfill({ status: 404, json: { error: 'stubbed' } }); });
  await p.route('**/api/voice/status', r => r.fulfill({ json: { available: true } }));
  await p.route('**/api/tidy', async r => { posts.push('/api/tidy'); await new Promise(f => setTimeout(f, 900)); r.fulfill({ json: { text: JSON.parse(r.request().postData() || '{}').text || '', tidied: false } }); });
  await p.route('**/api/kit**', r => r.fulfill({ json: { design: ['Claude'], research: ['Claude'], data: ['Claude'], strategy: ['Claude'], engineering: ['Claude'], made: {} } }));
  await p.route('**/api/meet-lines', r => { posts.push('/api/meet-lines'); r.fulfill({ status: 502, json: { error: 'stubbed' } }); });
  await p.route('**/api/run/**', r => { if (r.request().method() === 'POST') posts.push(new URL(r.request().url()).pathname); return r.fulfill({ json: { ok: true } }); });
  await p.goto(`${BASE}/?look=${look}`);
  await p.waitForFunction(() => window.BYOC && BYOC.dispatch);
  return { p, errors, posts };
}

// The checks every field gets. `f` describes the field: sel, primary (the one action), card (what it must stay inside),
// multi (Shift+Enter makes a line), and fills `short` for the Enter check.
async function checkField(ctx, f, label) {
  try { await checkFieldSteps(ctx, f, label); }
  catch (e) { e.message = `${label} [at: ${ctx.step}] ${e.message}`; throw e; }
}
async function checkFieldSteps(ctx, f, label) {
  const { p, posts } = ctx; const at = s => { ctx.step = s; };
  const el = p.locator(f.sel).first();
  await el.waitFor({ state: 'visible', timeout: 8000 });
  at('mic');
  // the mic, next to the field (voice.js marks it; a sheet's line has the form's mark)
  const mic = await p.evaluate(sel => {
    const x = document.querySelector(sel);
    const m = [...document.querySelectorAll('.voice-mic')].find(m => m._field === x || (x.id === 'her-input' && m.closest('#her-form')));
    if (!m) return 'none';
    const r = m.getBoundingClientRect(), cs = getComputedStyle(m);
    return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom <= innerHeight && r.right <= innerWidth ? 'shown' : `hidden ${Math.round(r.width)}x${Math.round(r.height)} ${cs.display}/${cs.visibility}`;
  }, f.sel);
  assert.strictEqual(mic, 'shown', `${label}: the mic`);
  at('shortcuts');
  // shortcut letters inside fire nothing
  await el.click();
  const before = await p.evaluate(() => ({ beat: BYOC.beat, replay: !!BYOC.replay }));
  await p.keyboard.type('s r j ? v', { delay: 15 });
  await p.waitForTimeout(250);
  const afterKeys = await p.evaluate(sel => {
    const x = document.querySelector(sel); const help = document.querySelector('#help-card, .help-card, [data-component="help-card"]');
    return { beat: BYOC.beat, replay: !!BYOC.replay, help: !!(help && help.offsetParent && getComputedStyle(help).visibility !== 'hidden'),
      text: 'value' in x ? x.value : x.textContent, focused: document.activeElement === x };
  }, f.sel);
  assert.deepStrictEqual({ beat: afterKeys.beat, replay: afterKeys.replay }, before, `${label}: no shortcut fired`);
  assert.ok(!afterKeys.help, `${label}: no help card`);
  assert.match(afterKeys.text, /s r j \? v/, `${label}: the letters land in the field`);
  assert.ok(afterKeys.focused, `${label}: still typing`);
  at('300 words');
  // ~300 words, pasted
  await clear(p, f.sel);
  await el.click(); await p.keyboard.insertText(LONG); await p.waitForTimeout(350);
  const geo = await p.evaluate(([sel, card, primary]) => {
    const x = document.querySelector(sel), r = x.getBoundingClientRect();
    const c = card ? x.closest(card) || document.querySelector(card) : null, cr = c && c.getBoundingClientRect();
    const b = primary ? document.querySelector(primary) : null, br = b && b.getBoundingClientRect();
    const de = document.documentElement;
    return {
      pageScroll: de.scrollHeight > innerHeight + 1 || de.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1,
      inCard: !cr || (r.left >= cr.left - 2 && r.right <= cr.right + 2 && r.bottom <= cr.bottom + 2 && r.top >= cr.top - 2),
      onScreen: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1,
      primary: !b ? 'n/a' : br.width > 4 && br.top >= 0 && br.bottom <= innerHeight && br.right <= innerWidth && getComputedStyle(b).visibility !== 'hidden' ? 'on screen' : `off ${[br.left, br.top, br.right, br.bottom].map(Math.round)}`,
      len: ('value' in x ? x.value : x.textContent).length,
    };
  }, [f.sel, f.card || null, f.primary || null]);
  assert.ok(!geo.pageScroll, `${label}: no page scrollbar with 300 words`);
  assert.ok(geo.inCard, `${label}: the field stays inside its card`);
  assert.ok(geo.onScreen, `${label}: the field stays on screen`);
  if (f.primary) assert.strictEqual(geo.primary, 'on screen', `${label}: the primary control stays visible`);
  assert.ok(geo.len >= Math.min(300, f.max || Infinity), `${label}: the paste landed (${geo.len})`);
  at('shift+enter');
  // Shift+Enter: a new line where the field is multi-line, never a send
  if (f.multi) {
    await clear(p, f.sel); await el.click(); await p.keyboard.type('one'); await p.keyboard.press('Shift+Enter'); await p.keyboard.type('two');
    assert.match(await p.evaluate(sel => { const x = document.querySelector(sel); return 'value' in x ? x.value : x.innerText; }, f.sel), /one\ntwo/, `${label}: Shift+Enter makes a line`);
  }
  at('empty enter');
  // empty + Enter sends nothing
  await clear(p, f.sel); await el.click();
  const n0 = posts.length; await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  assert.deepStrictEqual(posts.slice(n0), [], `${label}: empty Enter sends nothing`);
  at('esc');
  // Esc lets go of the field
  if (!f.noEsc) {
    await el.click(); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    assert.ok(await p.evaluate(sel => document.activeElement !== document.querySelector(sel), f.sel), `${label}: Esc lets go`);
  }
  at('enter');
  // Enter with words: visible feedback within 300 ms
  await el.click(); await p.keyboard.insertText(f.short || 'A booking page for a small yoga studio');
  await p.evaluate(root => {
    window.__fb = null;
    const box = document.querySelector(root) || document.body; const t0 = performance.now();
    const mo = new MutationObserver(ms => { if (window.__fb == null && ms.some(m => m.type !== 'attributes' || /^(data-state|class|hidden|disabled|readonly|aria-disabled|aria-busy|data-step)$/.test(m.attributeName))) { window.__fb = performance.now() - t0; mo.disconnect(); } });
    mo.observe(box, { subtree: true, childList: true, attributes: true, characterData: true });
  }, f.feedbackIn || f.card || 'body');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(450);
  const fb = await p.evaluate(() => window.__fb);
  assert.ok(fb != null && fb < 300, `${label}: feedback within 300 ms (got ${fb == null ? 'none' : Math.round(fb) + ' ms'})`);
}
const clear = (p, sel) => p.evaluate(sel => { const x = document.querySelector(sel); if ('value' in x) x.value = ''; else x.textContent = ''; x.dispatchEvent(new Event('input', { bubbles: true })); }, sel);

// Room fixtures: a stub run in the room, at beat 4.
async function inRoom(p) {
  await p.evaluate(() => {
    BYOC.stage(4, { instant: true }); BYOC.run = 'stub-run';
    BYOC.dispatch({ run: 'stub-run', type: 'run.start', idea: "An ordering website for my friend's small bakery", stagePath: true }, 'live');
  });
  await p.waitForTimeout(300);
}

for (const look of LOOKS) for (const size of SIZES) {
  const tag = `${look} ${size[0]}`;

  test(`the idea card and the name tag (${tag})`, async () => {
    const ctx = await newPage(look, size);
    await checkField(ctx, { sel: '#idea-input', primary: '[data-component="idea-card"] [data-slot="make"]', card: '[data-component="idea-card"]', max: 300, short: "An ordering website for my friend's small bakery" }, `idea card ${tag}`);
    // its Enter moves on to the name tag
    await ctx.p.waitForSelector('#intro-input', { state: 'visible', timeout: 15000 });
    await ctx.p.waitForTimeout(600);
    await checkField(ctx, { sel: '#intro-input', primary: '[data-component="character-card"] [data-slot="make"]', card: '[data-component="character-card"]', max: 240, short: 'I love making things people use every day' }, `name tag ${tag}`);
    assert.deepStrictEqual(ctx.errors, []);
    await ctx.p.close();
  });

  test(`her sheet's line and the judge's idea (${tag})`, async () => {
    const ctx = await newPage(look, size);
    await ctx.p.evaluate(() => BYOC.stage(3, { instant: true }));
    await ctx.p.waitForTimeout(400);
    await checkField(ctx, { sel: '#her-input', card: '#her-form', feedbackIn: '.her-sheet', short: 'A booking page for a small yoga studio' }, `her sheet ${tag}`);
    await ctx.p.evaluate(() => { BYOC.reset && BYOC.reset(); BYOC.close.open(); });
    await ctx.p.waitForTimeout(700);
    await checkField(ctx, { sel: '#close-input', primary: '#close-make', card: '#close-form', feedbackIn: '#close-sheet', short: 'A page for a bike repair pop-up' }, `the close ${tag}`);
    assert.strictEqual(await ctx.p.getAttribute('#close-make', 'data-state'), 'working', 'Build it answers at once');
    assert.deepStrictEqual(ctx.errors, []);
    await ctx.p.close();
  });

  test(`her idea's Enter: Design's line shows within 300 ms, while a slow tidy runs (${tag})`, async () => {
    const ctx = await newPage(look, size); const { p } = ctx;
    await p.route('**/api/tidy', async r => { await new Promise(f => setTimeout(f, 2000)); r.fulfill({ json: { text: JSON.parse(r.request().postData() || '{}').text || '', tidied: false } }); });
    await p.route('**/api/run', async r => { await new Promise(f => setTimeout(f, 1500)); r.fulfill({ json: { run: 'stub-run' } }); });
    await p.evaluate(() => BYOC.stage(3, { instant: true })); await p.waitForTimeout(400);
    await p.click('#her-input'); await p.keyboard.insertText('A booking page for a small yoga studio');
    const t = Date.now(); await p.keyboard.press('Enter');
    // her box (empty, on screen) says who is working; plain also shows Design's bar (painted keeps it for the open sheet)
    await p.waitForFunction(() => { const i = document.getElementById('her-input'); return !i.value && i.offsetParent && /Design is sketching/.test(i.placeholder); }, null, { timeout: 1000 });
    const ms = Date.now() - t;
    assert.ok(ms < 300, `Design's line within 300 ms of Enter (took ${ms} ms)`);
    if (look === 'plain') assert.ok(await p.evaluate(() => { const b = document.querySelector('.fs-bar'); return !!(b && b.offsetParent && /Design is sketching/.test(b.textContent)); }), 'the bar too');
    // the tidy and the run come back later: the line is still there, never a blank wait
    await p.waitForTimeout(2600);
    assert.match(await p.getAttribute('#her-input', 'placeholder'), /Design is sketching/, 'still said once the run is open');
    assert.deepStrictEqual(ctx.errors, []);
    await p.close();
  });

  test(`a meeting's piece and reply, and Bo's unblock answer (${tag})`, async () => {
    const ctx = await newPage(look, size); const { p } = ctx;
    await inRoom(p);
    await p.evaluate(() => {
      BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'feel', feel: true, seat: 'design', by: 'Mika', question: 'What should this feel like for a regular?', artifact: { kind: 'journey-words' } }, 'live');
      BYOC.openNote('feel');
    });
    await p.waitForFunction(() => BYOC.focusDoc && BYOC.focusDoc.isOpen());
    await p.waitForTimeout(500);
    await checkField(ctx, { sel: '#focus-doc .fd-input', primary: '#focus-doc .fd-send', card: '#focus-doc', multi: true, noEsc: false, short: 'Like the baker already knows you' }, `meeting piece ${tag}`);
    await p.evaluate(() => { BYOC.focusDoc.close(true); BYOC.dispatch({ run: 'stub-run', type: 'answer', askId: 'feel', text: 'Like the baker knows you' }, 'live'); });
    // Bo's unblock: her own words on the card
    await p.evaluate(() => {
      BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'u-engineering-1', unblock: true, seat: 'engineering', by: 'Bo', question: 'When do orders close?', suggestion: '8pm the night before', kind: 'call', doing: 'Setting up ordering', topic: 'Orders close' }, 'live');
    });
    // as she meets it: "Bo's blocked" in her inbox, a click opens its page
    await p.waitForFunction(() => document.getElementById('inbox').dataset.needs === 'yes', null, { timeout: 8000 });
    await p.click('#inbox .inbox-now');
    const card = p.locator('#inbox article.inbox-action');
    await card.waitFor({ timeout: 5000 });
    await card.locator('[data-slot="say"]').click();
    await checkField(ctx, { sel: '#inbox article.inbox-action .ia-hers', primary: '#inbox article.inbox-action [data-slot="yes"]', card: '#inbox article.inbox-action', noEsc: true, short: '7pm the night before' }, `unblock answer ${tag}`);
    assert.deepStrictEqual(ctx.errors, []);
    await p.close();
  });
}
