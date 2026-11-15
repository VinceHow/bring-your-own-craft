// The polish bar (docs/POLISH.md), item by item, for the design audit. design-qa.mjs covers the screens (QA.md checks,
// contrast, the census for "one thing per screen", day/night, sound, the mic, art, toys); this covers the rest:
//   §2 every input: ~300 words and a pasted paragraph, the tidy in place, the mic, empty, Enter / Shift+Enter / Esc, keys
//   §3 prefers-reduced-motion; transitions as frame strips with layout shift measured; the magic moments as strips
//   §4 who-is-doing-what within 300 ms; chatter length and count; the inbox's home; "New replies ↓"
//   §5 the cursor family (scrap, fold over clickables, I-beam in inputs, paw only on the rain window)
//   §6 labels for prepared things; the meet cards' "Loaded with" / "Made with" lines against the true lists
//   §7 the fallbacks that load in a browser (?look=plain, R, ?setup=classic, ?meeting=0)
// Every POST is stubbed (no model, no fal, no ElevenLabs). Output: <OUT>/polish.json and frames under <OUT>/polish/.
//   BASE=http://localhost:4400 QA_OUT=design/studio/qa/<stamp> node scripts/design-polish.mjs
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(process.env.NODE_PATH || '/usr/lib/node_modules', 'playwright'))); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.QA_PORT) || 4440;
const BASE = process.env.BASE || `http://localhost:${PORT}`;
const SIZES = (process.env.QA_SIZES || '1920x1130,1440x900,1280x800').split(',').map(s => s.split('x').map(Number));
const OUT = path.resolve(ROOT, process.env.QA_OUT || `design/studio/qa/polish-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`);
const PD = path.join(OUT, 'polish'); fs.mkdirSync(PD, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const SECS = process.env.QA_SECTIONS ? process.env.QA_SECTIONS.split(',').map(Number) : null;   // e.g. QA_SECTIONS=5,6
const SEC = n => !SECS || SECS.includes(n);
const R = []; // { sec, item, size, mode, result: PASS|FAIL|NOTE|NOT CHECKED, evidence, note, owner }
const OWNER = { 1: 'bug fixer', 2: 'painted-UI designer', 3: 'painted-UI designer', 4: 'bug fixer', 5: 'bug fixer', 6: 'lead', 7: 'lead' };
const rec = (sec, item, result, note, evidence = '', size = '', mode = '') => { R.push({ sec, item, size, mode, result, note, evidence: evidence ? path.relative(ROOT, evidence) : '', owner: result === 'FAIL' ? OWNER[sec] : '' }); process.stdout.write(`§${sec} ${item} ${size} ${mode}: ${result} ${note}\n`); };

const GUARD = async ctx => {
  await ctx.route('**/api/**', r => r.request().method() === 'GET' ? r.continue() : r.fulfill({ json: { ok: true } }));
  await ctx.route('**/api/voice/status', r => r.fulfill({ json: { available: true } }));
  await ctx.route('**/api/voice/stt', async r => { await wait(1500); r.fulfill({ json: { text: 'I love bread', ms: 10 } }); });
  // the tidy: cuts fillers (so the tidy is visible), never rewords
  await ctx.route('**/api/tidy', async r => { const t = JSON.parse(r.request().postData() || '{}').text || ''; await wait(600);
    r.fulfill({ json: { text: t.replace(/\b(um|uh|so like|like|you know|kind of|basically)\b,?\s*/gi, '').replace(/\s+/g, ' ').trim().replace(/^./, c => c.toUpperCase()), tidied: true } }); });
  await ctx.route('**/api/name-tag', async r => { await wait(900); r.fulfill({ json: { title: 'the Journey Mapper', traits: ['customer-obsessed', 'ships it'], superpower: 'sees the whole path' } }); });
};
const WORDS = ('I think the people who matter most here are the regulars who come in every morning on their way to work and want the same loaf every single time, ' +
  'and they hate hunting for it on a menu or waiting in a queue behind someone ordering six different pastries, so ').split(' ');
const words300 = Array.from({ length: 300 }, (_, i) => WORDS[i % WORDS.length]).join(' ');
const PARA = "We opened the bakery three years ago on a corner where nobody expected bread. Now most of our mornings are the same forty people. They want their usual, warm, and they want to be in and out before the bus. The weekend crowd is different: they browse, they try things, they bring friends. The site should know which one you are.";
const shot = async (p, name) => { const f = path.join(PD, `${name}.jpg`); await p.screenshot({ path: f, type: 'jpeg', quality: 72 }); return f; };
async function strip(p, name, frames, ms, sel) { // frames over time, and the key element's box per frame (layout shift)
  const files = [], boxes = [];
  for (let i = 0; i < frames; i++) { files.push(await shot(p, `${name}-${String(i).padStart(2, '0')}`)); boxes.push(sel ? await p.locator(sel).first().boundingBox().catch(() => null) : null); await wait(ms); }
  return { files, boxes };
}
const shiftOf = boxes => { const b = boxes.filter(Boolean); if (b.length < 2) return 0; let m = 0; for (let i = 1; i < b.length; i++) m = Math.max(m, Math.abs(b[i].x - b[i - 1].x) + Math.abs(b[i].y - b[i - 1].y) + Math.abs(b[i].width - b[i - 1].width) + Math.abs(b[i].height - b[i - 1].height)); return Math.round(m); };

async function page(browser, w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, ...opts }); await GUARD(ctx);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160))); p._errs = errs; p._ctx = ctx; return p;
}
const open = async (p, q = '') => { await p.goto(BASE + '/?look=painted&stage=1' + q); await wait(1600); };
const fixtureHelpers = p => p.evaluate(async () => {
  const fx = await (await fetch('/fixtures/fake-run.jsonl')).text(); const evs = fx.split('\n').filter(Boolean).map(JSON.parse).sort((a, b) => a.t - b.t);
  window.__fx = evs; window.__play = until => { BYOC.reset(); BYOC.replay = true; BYOC.run = evs[0].run; BYOC.stage(2, { instant: true }); BYOC.stage(3, { instant: true });
    for (const e of evs) { if (until && until(e)) break; BYOC.dispatch(e, 'replay'); } };
});
const FOCUS1 = { type: 'ask', id: 'first', first: true, seat: 'research', by: 'Noor', question: 'Who should we build this for first?', users: ['Morning regulars', 'Weekend pastry crowd'], decisionIds: [],
  artifact: { kind: 'finding', ref: { title: 'A third of artisan-bakery visitors buy bread there every week', quote: 'A third (33%) of UK adults who visit artisan bakeries now buy bread there at least once a week',
    url: 'https://example.org/report', site: 'Bakery Business', fetched: '2026-11-14', label: 'researched before the demo', users: ['Morning regulars', 'Weekend pastry crowd'] } } };
async function focusOpen(p) {
  await p.evaluate(() => { BYOC.reset(); BYOC.stage(2, { instant: true }); BYOC.stage(3, { instant: true }); BYOC.stage(4, { instant: true }); BYOC.run = 'qa-stub-run';
    const d = ev => BYOC.dispatch({ run: 'qa-stub-run', ...ev }, 'live'); d({ type: 'run.start', idea: "An ordering website for my friend's small bakery", stagePath: true });
    d({ type: 'sketch.user', id: 'u1', label: 'Morning regulars' }); d({ type: 'sketch.done', seat: 'design', ms: 10 }); });
  await wait(300); await p.evaluate(a => BYOC.dispatch({ run: 'qa-stub-run', ...a }, 'live'), FOCUS1); await wait(400);
  await p.evaluate(a => BYOC.focusDoc.open(a), FOCUS1); await wait(900);
}
async function unblockOpen(p) {
  await fixtureHelpers(p); await p.evaluate(() => __play(e => e.type === 'ask')); await wait(200);
  await p.evaluate(() => BYOC.dispatch({ t: Date.now(), run: BYOC.run, type: 'ask', id: 'qa-u1', unblock: true, seat: 'engineering', by: 'Bo', question: 'When do orders close?', decision: 'When do orders close.', suggestion: '8pm the night before', doing: 'Setting up ordering', topic: 'Orders close', kind: 'call' }, 'replay'));
  await wait(3500); await p.evaluate(() => BYOC.inbox.showUnblock && BYOC.inbox.showUnblock('qa-u1')); await wait(500);
}
// the inputs on the stage path: how to reach each, its field, the card it lives in, its primary control
const INPUTS = [
  { id: 'idea', name: 'the idea paper', go: async p => { await p.evaluate(() => BYOC.reset()); await wait(900); }, field: '[data-component="idea-card"] [data-slot="input"]', card: '[data-component="idea-card"]', primary: '[data-component="idea-card"] [data-slot="make"]' },
  { id: 'nametag', name: 'her name tag', go: async p => { await p.evaluate(() => BYOC.reset()); await wait(900); const i = p.locator('[data-component="idea-card"] [data-slot="input"]'); if (await i.count()) { await i.fill('A website for a small bakery'); await i.press('Enter'); await wait(1600); } },
    field: '[data-component="character-card"] [data-slot="input"]', card: '[data-component="character-card"]', primary: '[data-component="character-card"] [data-slot="make"]' },
  { id: 'focus', name: 'Focus 1 (her answer)', go: focusOpen, field: '[data-component="focus-doc"] [data-slot="input"]', card: '[data-component="focus-doc"]', primary: '[data-component="focus-doc"] [data-slot="send"]' },
  { id: 'unblock', name: 'the unblock card (say something else)', go: async p => { await unblockOpen(p); await p.locator('[data-component="inbox-action"] [data-slot="say"]').first().click({ force: true }).catch(() => {}); await wait(400); },
    field: '[data-component="inbox-action"] [data-slot="hers"]', card: '[data-component="inbox-action"]', primary: '[data-component="inbox-action"] [data-slot="yes"]' },
];
const measure = (p, inp) => p.evaluate(({ field, card, primary }) => {
  const f = document.querySelector(field), c = document.querySelector(card), b = document.querySelector(primary);
  const R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const de = document.scrollingElement || document.documentElement;
  const fs = f && getComputedStyle(f);
  return { f: R(f), c: R(c), b: R(b), W: innerWidth, H: innerHeight, pageScroll: de.scrollHeight > innerHeight + 1 || de.scrollWidth > innerWidth + 1,
    fieldScrolls: f ? f.scrollHeight > f.clientHeight + 1 : false, fieldOverflow: fs ? fs.overflowY : '', cardScrolls: c ? (c.scrollHeight > c.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(c).overflowY)) : false,
    mic: !!(c && [...c.querySelectorAll('[data-component="mic"]')].some(m => m.getBoundingClientRect().width > 0)),
    disabled: b ? (b.disabled || b.getAttribute('aria-disabled') === 'true' || b.dataset.state === 'disabled') : null, btnText: b ? b.innerText.trim() : '' };
}, { field: inp.field, card: inp.card, primary: inp.primary });

const srv = process.env.BASE ? null : spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), MODEL_BACKEND: 'fal' }, stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await wait(200); }
const browser = await chromium.launch();
try {
  // ---------------- §2 every input ----------------
  if (SEC(2)) for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`;
    for (const inp of INPUTS) {
      for (const [kind, text, how] of [['300 words', words300, 'fill'], ['pasted paragraph', PARA, 'paste']]) {
        const p = await page(browser, w, h); await open(p); await inp.go(p);
        const fld = p.locator(inp.field).first();
        if (!(await fld.count()) || !(await fld.isVisible().catch(() => false))) { rec(2, `${inp.name}: ${kind}`, 'FAIL', 'the field is not on screen', await shot(p, `${tag}-${inp.id}-missing`), tag); await p._ctx.close(); continue; }
        await fld.click({ force: true }).catch(() => {});
        if (how === 'fill') await fld.fill(text).catch(async () => { await p.keyboard.insertText(text); }); else await p.keyboard.insertText(text);
        await wait(400);
        const m = await measure(p, inp); const f = await shot(p, `${tag}-${inp.id}-${kind.replace(/ /g, '-')}`);
        const probs = [];
        if (m.pageScroll) probs.push('the page scrolls');
        if (m.f && m.c && (m.f.b > m.c.b + 2 || m.f.r > m.c.r + 2)) probs.push(`the field overflows its card (${Math.round(m.f.b - m.c.b)}px below)`);
        if (m.b && (m.b.b > m.H || m.b.t < 0 || m.b.r > m.W)) probs.push(`the primary control is off screen (${Math.round(m.b.l)},${Math.round(m.b.t)})`);
        if (m.c && (m.c.b > m.H + 1)) probs.push(`the card runs off the window (bottom ${Math.round(m.c.b)} of ${m.H})`);
        rec(2, `${inp.name}: ${kind}`, probs.length ? 'FAIL' : 'PASS', probs.join('; ') || `fits (field ${m.fieldScrolls ? 'scrolls inside itself' : 'grows'}; primary on screen)`, f, tag);
        if (kind === '300 words' && w === 1920) rec(2, `${inp.name}: has the mic`, m.mic ? 'PASS' : 'FAIL', m.mic ? 'mic in the card' : 'no visible mic in the card', f, tag);
        await p._ctx.close();
      }
      if (w !== 1920) continue;
      // the tidy in place, the keys, empty input: once per input at 1920
      const p = await page(browser, w, h); await open(p); await inp.go(p);
      const fld = p.locator(inp.field).first();
      if (await fld.count()) {
        // keys never fire while she types
        await fld.click({ force: true }).catch(() => {});
        const before = await p.evaluate(() => ({ stage: document.body.classList.contains('stage'), replay: !!BYOC.replay, beat: BYOC.beat }));
        for (const k of ['s', 'r', 'j', '?', 'S', 'R']) await p.keyboard.press(k === '?' ? 'Shift+Slash' : k);
        await wait(500);
        const after = await p.evaluate(() => ({ stage: document.body.classList.contains('stage'), replay: !!BYOC.replay, beat: BYOC.beat, help: !![...document.querySelectorAll('.help, #help, [data-component="help"]')].find(e => e.getBoundingClientRect().width > 0) }));
        const keyProbs = []; if (after.stage !== before.stage) keyProbs.push('S toggled stage mode'); if (after.replay !== before.replay) keyProbs.push('R started a replay'); if (after.beat !== before.beat) keyProbs.push('the beat moved'); if (after.help) keyProbs.push('? opened help');
        rec(2, `${inp.name}: shortcuts never fire while typing`, keyProbs.length ? 'FAIL' : 'PASS', keyProbs.join('; ') || 'S R J ? typed into the field, nothing fired', '', '1920x1130');
        // Shift+Enter is a new line (in a textarea), Esc leaves
        const isTA = await fld.evaluate(e => e.tagName === 'TEXTAREA' || e.isContentEditable);
        if (isTA) { await fld.fill('first line').catch(() => {}); await fld.evaluate(e => { e.focus(); if ('selectionStart' in e && e.tagName !== 'P') { e.selectionStart = e.selectionEnd = e.value.length; } else { const r = document.createRange(); r.selectNodeContents(e); r.collapse(false); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } }); await p.keyboard.press('Shift+Enter'); await p.keyboard.type('second');
          const v = await fld.evaluate(e => ('value' in e && e.tagName !== 'P' ? e.value : e.innerText));
          const submitted = await p.evaluate(c => { const e = document.querySelector(c); return e ? e.dataset.state : ''; }, inp.card);
          const fsh = await shot(p, `1920-${inp.id}-shift-enter`);
          rec(2, `${inp.name}: Shift+Enter makes a new line`, /\n/.test(v) ? 'PASS' : 'FAIL', /\n/.test(v) ? 'new line kept' : `no new line: the field reads “${v.slice(0, 40)}” (card state “${submitted}”: Shift+Enter ${/yes|said|answered|done/.test(submitted) ? 'submitted, and the next typing went in front of her words' : 'did nothing'})`, fsh, '1920x1130'); }
        await p.keyboard.press('Escape'); await wait(200);
        const focused = await p.evaluate(sel => document.activeElement === document.querySelector(sel), inp.field);
        rec(2, `${inp.name}: Esc leaves the field`, focused ? 'FAIL' : 'PASS', focused ? 'still focused after Esc' : 'focus left the field', '', '1920x1130');
        // empty input
        await fld.click({ force: true }).catch(() => {}); await fld.fill('').catch(() => {}); await fld.evaluate(e => { if (e.isContentEditable) e.textContent = ''; });
        const m0 = await measure(p, inp); const beat0 = await p.evaluate(() => BYOC.beat);
        await p.keyboard.press('Enter'); await wait(700);
        const err = await p.evaluate(() => [...document.querySelectorAll('[data-state="failed"], .error')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.innerText.trim().slice(0, 60)));
        const f0 = await shot(p, `1920-${inp.id}-empty-enter`);
        const moved = (await p.evaluate(() => BYOC.beat)) !== beat0;
        rec(2, `${inp.name}: empty input`, err.length || p._errs.length ? 'FAIL' : 'PASS', `primary ${m0.disabled ? 'visibly unavailable' : `stays “${m0.btnText}” (enabled)`}; Enter on empty ${moved ? 'moved on' : 'did nothing'}${err.length ? `; error shown: ${err.join(' / ')}` : ''}${p._errs.length ? `; page error ${p._errs[0]}` : ''}`, f0, '1920x1130');
        // the tidy in place: type a filler line, submit, frames
        if (inp.id !== 'unblock' || true) {
          const raw = 'um so like the regulars, you know, basically want their usual loaf';
          if (inp.id === 'unblock') { await p._ctx.close(); const q = await page(browser, w, h); await open(q); await inp.go(q); await tidyCheck(q, inp, raw); await q._ctx.close(); continue; }
          if (inp.id === 'nametag' || inp.id === 'idea') { await p._ctx.close(); const q = await page(browser, w, h); await open(q); await inp.go(q); await tidyCheck(q, inp, raw); await q._ctx.close(); continue; }
          await tidyCheck(p, inp, raw);
        }
      }
      await p._ctx.close();
    }
  }
  async function tidyCheck(p, inp, raw) {
    const fld = p.locator(inp.field).first(); await fld.click({ force: true }).catch(() => {});
    if (inp.id === 'unblock') await fld.evaluate((e, t) => { e.textContent = t; e.dispatchEvent(new Event('input', { bubbles: true })); }, raw); else await fld.fill(raw);
    if (inp.id === 'nametag') await p.fill('#nt-name', 'Priya').catch(() => {});
    await fld.click({ force: true }).catch(() => {});
    await p.keyboard.press('Enter');
    const st = [], files = [], boxes = [];
    for (let i = 0; i < 10; i++) { files.push(await shot(p, `tidy-${inp.id}-${String(i).padStart(2, '0')}`)); boxes.push(await p.locator(inp.card).first().boundingBox().catch(() => null));
      st.push(...await p.evaluate(() => [...document.querySelectorAll('[data-state="tidying"], [data-state="tidied"], [data-tidy]')].map(e => `${e.dataset.state || ''}/${e.dataset.tidy || ''}: “${(e.value || e.innerText || '').trim().slice(0, 50)}”`))); await wait(180); }
    const s = { files, boxes };
    const tidied = st.some(x => /tidied|cut|reordered/.test(x));
    rec(2, `${inp.name}: the tidy in place`, tidied ? 'PASS' : 'FAIL', tidied ? `tidied: ${[...new Set(st)].filter(x => /tidied/.test(x)).slice(0, 1).join(' | ')}; layout shift ${shiftOf(s.boxes)}px over ${s.files.length} frames` : `no tidied element after Enter (${st.join(' | ') || 'none'})`, s.files[3], '1920x1130');
  }

  // ---------------- §3 reduced motion; §3 magic moments as strips ----------------
  if (SEC(3)) {
    const p = await page(browser, 1920, 1130, { reducedMotion: 'reduce' }); await open(p);
    await p.evaluate(() => { BYOC.reset(); BYOC.stage(1); }); await wait(800); await p.evaluate(() => BYOC.stage(2)); await wait(400);
    const door = await p.evaluate(() => !!document.querySelector('[data-component="door-open"]'));
    const anims = await p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    rec(3, 'prefers-reduced-motion gets static versions', door ? 'FAIL' : 'PASS', `door layer ${door ? 'still plays' : 'skipped'}; ${anims} running animations right after the reveal`, await shot(p, 'reduced-motion-reveal'), '1920x1130');
    await p._ctx.close();
  }
  const MOMENTS = [
    ['the door plaque', async p => { await p.evaluate(() => { BYOC.reset(); BYOC.stage(1); }); await wait(800); await p.evaluate(() => BYOC.stage(2)); }, 10, 350, '[data-component="door-open"]'],
    ['each meet card entrance', async p => { await p.goto(BASE + '/?look=painted&stage=1&hold=600000'); await wait(1500); await p.evaluate(() => { BYOC.reset(); BYOC.stage(1); }); await wait(1500); await p.evaluate(() => BYOC.meetNext && BYOC.meetNext()); }, 8, 120, '[data-component="meet-card"][data-state="in"]'],
    ['the team getting to work', async p => { await fixtureHelpers(p); await p.evaluate(() => __play(e => e.type === 'teammate.start')); await wait(300);
      await p.evaluate(() => { for (const e of __fx.filter(e => e.type === 'teammate.start')) BYOC.dispatch(e, 'replay'); }); }, 8, 300, '[data-component="idea-sheet"]'],
    ['a teammate reply arriving', async p => { await focusOpen(p); await p.locator('[data-component="focus-doc"] [data-slot="input"]').first().fill('It’s really for the regulars.'); await p.keyboard.press('Enter'); await wait(300);
      await p.evaluate(() => BYOC.dispatch({ run: 'qa-stub-run', type: 'chime', askId: 'first', seat: 'research', by: 'Noor', text: 'That matches the finding: a third come back every week.' }, 'live')); }, 8, 150, '[data-component="meeting"]'],
    ['End meeting → takeaways', async p => { await focusOpen(p); await p.locator('[data-component="focus-doc"] [data-slot="input"]').first().fill('It’s really for the regulars.'); await p.keyboard.press('Enter'); await wait(300);
      await p.evaluate(() => BYOC.dispatch({ run: 'qa-stub-run', type: 'chime', askId: 'first', seat: 'research', by: 'Noor', text: 'That matches the finding.' }, 'live')); await wait(1500);
      await p.evaluate(() => document.querySelector('[data-slot="end-meeting"]')?.click()); await wait(300);
      await p.evaluate(() => BYOC.dispatch({ run: 'qa-stub-run', type: 'takeaways', askId: 'first', believe: 'Regulars come first.', guidance: 'Their usual loaf one tap away; the cutoff shown before they start.' }, 'live')); }, 10, 250, '[data-component="takeaways"]'],
    ['Bo’s smile on Yes', async p => { await unblockOpen(p); await p.locator('[data-component="inbox-action"] [data-slot="yes"]').first().click({ force: true }).catch(() => {}); }, 10, 250, '[data-component="inbox-action"]'],
  ];
  if (SEC(3)) for (const [name, go, n, ms, sel] of MOMENTS) {
    const p = await page(browser, 1920, 1130); await open(p);
    try { await go(p); const s = await strip(p, `moment-${name.replace(/[^a-z]+/gi, '-').toLowerCase()}`, n, ms, sel);
      rec(3, `magic moment: ${name}`, 'NOTE', `frame strip (${n} × ${ms} ms), layout shift ${shiftOf(s.boxes)}px; scored by eye in the audit`, s.files[Math.floor(n / 2)], '1920x1130'); }
    catch (e) { rec(3, `magic moment: ${name}`, 'FAIL', 'could not reach it: ' + String(e.message).split('\n')[0], '', '1920x1130'); }
    await p._ctx.close();
  }

  // ---------------- §4 never lost ----------------
  if (SEC(4)) for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`;
    const p = await page(browser, w, h); await open(p); await focusOpen(p);
    await p.locator('[data-component="focus-doc"] [data-slot="input"]').first().fill('It’s really for the regulars.'); await p.keyboard.press('Enter'); await wait(300);
    const said = await p.evaluate(() => { const t = document.querySelector('[data-component="team-reading"]') || document.querySelector('[data-component="focus-doc"] [data-slot="status"]'); return t ? `${t.dataset.state || ''}: “${t.innerText.trim().slice(0, 60)}”` : ''; });
    rec(4, 'within 300 ms she sees who is doing what (Send)', /\w/.test(said.split(':').slice(1).join(':')) ? 'PASS' : 'FAIL', said || 'nothing at 300 ms', await shot(p, `${tag}-send-300ms`), tag);
    // New replies pill when scrolled up
    for (let i = 0; i < 6; i++) await p.evaluate(i => BYOC.dispatch({ run: 'qa-stub-run', type: 'chime', askId: 'first', seat: ['research', 'design', 'data', 'strategy', 'engineering'][i % 5], by: 'X', text: 'A reply long enough to take a couple of lines in the column, so it has to scroll ' + i }, 'live'), i);
    await wait(2500);
    await p.evaluate(() => { const c = document.querySelector('[data-component="meeting"]'); if (c) c.scrollTop = 0; c && c.dispatchEvent(new Event('scroll')); }); await wait(300);
    await p.evaluate(() => BYOC.dispatch({ run: 'qa-stub-run', type: 'chime', askId: 'first', seat: 'design', by: 'Mika', text: 'One more, while she is scrolled up.' }, 'live')); await wait(1500);
    const pill = await p.evaluate(() => { const n = document.querySelector('[data-component="meeting"] [data-slot="new-replies"], .fd-newer'); return n ? !n.hidden && n.getBoundingClientRect().width > 0 : null; });
    rec(4, 'the meeting: “New replies ↓” when scrolled up', pill ? 'PASS' : 'FAIL', pill === null ? 'no new-replies element' : pill ? 'pill shows' : 'pill hidden although she scrolled up and a reply landed', await shot(p, `${tag}-new-replies`), tag);
    await p._ctx.close();
    // chatter ≤ 8 words, ≤ 2 at a time; the inbox's home; empty states
    const q = await page(browser, w, h); await open(q); await fixtureHelpers(q); await q.evaluate(() => __play()); await wait(400);
    let maxLines = 0, longest = '';
    for (let i = 0; i < 6; i++) { await q.evaluate(i => BYOC.dispatch({ t: Date.now(), run: BYOC.run, type: 'chatter', seat: ['design', 'data', 'engineering'][i % 3], by: ['Mika', 'Theo', 'Bo'][i % 3], text: ['then remember them on the device', 'we’ll watch drop-off at confirm', 'cutoff at 8, count at 8:05'][i % 3] }, 'replay'), i); await wait(350);
      const c = await q.evaluate(() => [...document.querySelectorAll('[data-component="chatter-line"]')].filter(e => e.getBoundingClientRect().width > 0 && +getComputedStyle(e).opacity > 0.1).map(e => (e.querySelector('[data-slot="text"]') || e).innerText.trim()));
      maxLines = Math.max(maxLines, c.length); for (const t of c) if (t.split(/\s+/).length > longest.split(/\s+/).length) longest = t; }
    const fc = await shot(q, `${tag}-chatter`);
    rec(4, 'chatter: ≤8 words, at most 2 at a time', maxLines <= 2 && longest.split(/\s+/).length <= 8 ? 'PASS' : 'FAIL', `${maxLines} at once at most; longest ${longest.split(/\s+/).length} words (“${longest.slice(0, 60)}”)`, fc, tag);
    const ib = await q.evaluate(() => { const e = document.querySelector('[data-component="inbox"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, W: innerWidth, H: innerHeight }; });
    rec(4, 'the inbox has one home (top right)', ib && ib.x > ib.W / 2 && ib.y < ib.H / 2 ? 'PASS' : 'FAIL', ib ? `centre at ${Math.round(ib.x)},${Math.round(ib.y)} in ${ib.W}x${ib.H}` : 'no inbox', fc, tag);
    const previews = await q.evaluate(() => [...document.querySelectorAll('[data-component="inbox-item"] [data-slot="text"]')].filter(e => e.getBoundingClientRect().width > 0 && +getComputedStyle(e).opacity > 0.1).map(e => e.innerText.trim()));
    rec(4, 'no question previews in the room', previews.length ? 'FAIL' : 'PASS', previews.length ? `the collapsed inbox shows the question: “${previews[0].slice(0, 60)}”` : 'none', fc, tag);
    await q._ctx.close();
  }

  // ---------------- §5 the cursor family, day and night ----------------
  if (SEC(5)) for (const night of [0, 1]) {
    const p = await page(browser, 1920, 1130); await p.goto(BASE + `/?look=painted&stage=1&night=${night}`); await wait(1500);
    await p.evaluate(() => { BYOC.reset(); BYOC.stage(2, { instant: true }); BYOC.stage(3, { instant: true }); }); await wait(2500);
    const cur = async sel => { const e = p.locator(sel).first(); if (!(await e.count())) return null; const b = await e.boundingBox(); if (!b) return null;
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await wait(250); return e.evaluate(x => getComputedStyle(x).cursor); };
    const base = await p.evaluate(() => getComputedStyle(document.body).cursor);
    const overBtn = await cur('button[aria-label^="Time of day"]:visible, button[aria-label^="Always"]:visible, [data-component="inbox"] [data-slot="toggle"]:visible');
    const inField = await cur('#her-input:visible, [data-component="her-idea"] [data-slot="input"]:visible, [data-slot="input"]:visible');
    const overWin = await cur('button[data-spot="window"]'), overCat = await cur('button[data-spot="cat"]');
    const sig = c => (c || '').slice(0, 60) + '…' + (c || '').length;
    const probs = [];
    if (!/url\(/.test(base)) probs.push('no custom everyday cursor');
    if (!overBtn || overBtn === base) probs.push('no fold over a button');
    if (!inField || !/url\(/.test(inField) || inField === base) probs.push(`input cursor ${inField ? 'is not its own I-beam' : 'not found'}`);
    if (night && overWin && !/url\(/.test(overWin)) probs.push('no paw on the rain window');
    if (overCat && /paw/i.test(decodeURIComponent(overCat))) probs.push('the paw shows off the window (cat)');
    rec(5, `the cursor family (${night ? 'night' : 'day'})`, probs.length ? 'FAIL' : 'PASS', probs.join('; ') || `everyday ${sig(base)}; over a button ${overBtn === base ? 'same' : 'folded (differs)'}; input ${inField === base ? 'same' : 'own'}; window ${night ? (overWin ? 'paw' : 'hidden') : (overWin ? 'visible by day' : 'hidden by day')}`, await shot(p, `cursor-${night ? 'night' : 'day'}`), '1920x1130', night ? 'night' : 'day');
    await p._ctx.close();
  }

  // ---------------- §6 true on screen ----------------
  if (SEC(6)) {
    const p = await page(browser, 1920, 1130); await p.goto(BASE + '/?look=painted&stage=1&hold=600000'); await wait(1500);
    // the kit is what the room asks for with her idea (GET /api/kit, computed from files: no model call)
    const kit = await p.evaluate(async () => (await fetch('/api/kit?idea=' + encodeURIComponent("An ordering website for my friend's small bakery"))).json());
    await p.evaluate(k => { BYOC.reset(); BYOC.pendingIdea = "An ordering website for my friend's small bakery"; BYOC.kit = k; BYOC.stage(1); }, kit); await wait(2000);
    const lines = {};
    for (let k = 0; k < 5; k++) {
      const got = await p.evaluate(() => { const c = [...document.querySelectorAll('[data-component="meet-card"]')].filter(e => e.getBoundingClientRect().width > 0).pop(); if (!c) return null;
        const t = s => [...c.querySelectorAll(s)].map(e => e.innerText.trim()); return { seat: c.dataset.seat, loaded: t('[data-slot="kit-item"]'), made: t('[data-slot="made-item"]') }; });
      if (got) lines[got.seat] = got; await p.evaluate(() => BYOC.meetNext && BYOC.meetNext()); await wait(1200);
    }
    // POLISH §6: Loaded with = used live (Linkup for Noor, ElevenLabs, Claude, Claude Code for Bo); Made with = prepared ahead (fal, Figma, taste-skill).
    const TOOLS = /linkup|elevenlabs|claude code|claude|fal\b|figma|taste-skill|openai|gpt|gemini|midjourney|stable diffusion|vercel|cursor|copilot/i;
    const LOADED_OK = { research: /linkup|elevenlabs|claude/i, engineering: /claude code|claude|elevenlabs/i };
    const bad = [], notes = [];
    for (const [seat, l] of Object.entries(lines)) {
      for (const x of l.loaded) { const t = ((x.match(TOOLS) || [''])[0] || '').toLowerCase();
        if (!t) notes.push(`${seat}: “${x}” names no tool`);
        else if (/fal|figma/.test(t)) bad.push(`${seat} loaded “${x}” (a prepared-ahead tool under Loaded with)`);
        else if (t === 'linkup' && seat !== 'research') bad.push(`${seat} loaded “${x}” (Linkup is Noor's)`);
        else if (t === 'claude code' && seat !== 'engineering') bad.push(`${seat} loaded “${x}” (Claude Code is Bo's)`);
        else if (/taste/.test(t)) notes.push(`${seat}: “${x}” is under Loaded with; POLISH lists taste-skill under Made with`);
        else if (!/linkup|elevenlabs|claude/.test(t)) bad.push(`${seat} loaded “${x}” (not on the true list)`); }
      for (const x of l.made) { const t = ((x.match(TOOLS) || [''])[0] || '').toLowerCase(); if (!/fal|figma|taste/.test(t)) notes.push(`${seat}: Made with “${x}” is outside POLISH's list (fal, Figma, taste-skill): check it is true`); } }
    rec(6, 'meet cards: “Loaded with” / “Made with” only true tools', Object.keys(lines).length ? (bad.length ? 'FAIL' : notes.length ? 'NOTE' : 'PASS') : 'FAIL',
      Object.keys(lines).length ? `${Object.entries(lines).map(([s, l]) => `${s}: loaded [${l.loaded.join(', ')}] made [${l.made.join(', ')}]`).join(' · ')}${bad.length ? ' — not on the true list: ' + bad.join(', ') : ''}${notes.length ? ' — notes: ' + notes.join('; ') : ''}` : 'no meet cards read', await shot(p, 'meet-kit'), '1920x1130');
    await p._ctx.close();
    const q = await page(browser, 1920, 1130); await open(q); await focusOpen(q);
    const lab = await q.evaluate(() => /researched before the demo/i.test(document.querySelector('[data-component="focus-doc"]')?.innerText || ''));
    rec(6, 'prepared things are labelled: Noor’s finding', lab ? 'PASS' : 'FAIL', lab ? '“researched before the demo” shows' : 'no label on the finding', await shot(q, 'label-finding'), '1920x1130');
    await q.goto(BASE + '/?look=painted&stage=1'); await wait(1500); await q.keyboard.press('r'); await wait(2500);
    const rl = await q.evaluate(() => { const e = document.querySelector('[data-component="replay-label"]'); return e && e.getBoundingClientRect().width > 0 ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
    rec(6, 'prepared things are labelled: the replay', /replay|recorded/i.test(rl) ? 'PASS' : 'FAIL', rl ? `label: “${rl.slice(0, 80)}”` : 'no replay label after R', await shot(q, 'label-replay'), '1920x1130');
    await q._ctx.close();
  }

  // ---------------- §7 the fallbacks that load in a browser ----------------
  if (SEC(7)) {
    const p = await page(browser, 1920, 1130);
    await p.goto(BASE + '/?setup=classic&look=painted&stage=1'); await wait(1800);
    const st = await p.evaluate(() => document.querySelector('[data-component="setup"]')?.dataset.step);
    rec(7, 'fallback ?setup=classic', st === 'nametag' ? 'PASS' : 'FAIL', `opens on setup step “${st}” (classic: the name tag first)`, await shot(p, 'fallback-setup-classic'), '1920x1130');
    await p.goto(BASE + '/?meeting=0&look=painted&stage=1'); await wait(1500); await focusOpen(p);
    await p.locator('[data-component="focus-doc"] [data-slot="input"]').first().fill('It’s really for the regulars.'); await p.keyboard.press('Enter'); await wait(800);
    const endBtn = await p.evaluate(() => { const e = document.querySelector('[data-slot="end-meeting"]'); return !!e && !e.hidden && e.getBoundingClientRect().width > 0; });
    rec(7, 'fallback ?meeting=0 (one Send, no rounds)', endBtn ? 'FAIL' : 'PASS', endBtn ? 'End meeting still shows' : 'single Send, no End meeting', await shot(p, 'fallback-meeting-0'), '1920x1130');
    await p.goto(BASE + '/?look=plain&stage=1'); await wait(1500);
    const plain = await p.evaluate(() => ({ iframe: !!document.querySelector('iframe.painted-living'), on: document.documentElement.classList.contains('painted-on') }));
    rec(7, 'fallback ?look=plain', !plain.iframe && !plain.on ? 'PASS' : 'FAIL', JSON.stringify(plain), await shot(p, 'fallback-plain'), '1920x1130');
    await p.goto(BASE + '/?look=painted&stage=1'); await wait(1500); await p.keyboard.press('r'); await wait(4000);
    const rep = await p.evaluate(() => ({ replay: !!BYOC.replay, name: BYOC.replayName || '', beat: BYOC.beat }));
    rec(7, 'fallback R replay', rep.replay ? 'PASS' : 'FAIL', JSON.stringify(rep), await shot(p, 'fallback-replay'), '1920x1130');
    await p._ctx.close();
  }
} finally {
  await browser.close(); if (srv) srv.kill();
  fs.writeFileSync(path.join(OUT, 'polish.json'), JSON.stringify({ at: new Date().toISOString(), base: BASE, results: R }, null, 1));
  const n = r => R.filter(x => x.result === r).length;
  console.log(`\npolish: ${n('PASS')} pass, ${n('FAIL')} fail, ${n('NOTE')} notes · ${path.relative(ROOT, OUT)}/polish.json`);
}
