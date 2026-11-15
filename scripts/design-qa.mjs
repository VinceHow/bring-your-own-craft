// Design QA walk: the whole painted flow (?look=painted) at the demo sizes, day and night, one screenshot per state,
// plus automatic checks from design/studio/QA.md (scrollbars, off-screen parts, text on edges, small text, default
// browser controls, empty panels, contrast below 4.5). It finds; it never fixes. No model calls, no fal: every state
// comes from the recorded rehearsal run, the fake fixture, or labelled sample events (the same ones /gallery uses).
//
//   node scripts/design-qa.mjs                    # starts its own server on QA_PORT (4411) from this checkout
//   BASE=http://localhost:4400 node scripts/design-qa.mjs
//   QA_SIZES=1920x1130 QA_MODES=day QA_ONLY=focus node scripts/design-qa.mjs
//   QA_PREV=design/studio/qa/<older stamp> node scripts/design-qa.mjs   # also pixel-diff every shot against that pass
//
// report.md is the short read: flags per check, flags new since QA_PREV, and the shots whose pixels changed (only
// those, plus failing ones, need eyes). The pixel diff uses python3 + Pillow if present; without it, it is skipped.
//
// Output: design/studio/qa/<UTC stamp>/<size>-<mode>/<nn-state>.jpg (extras/ as png), findings.json, and index.html (a contact sheet).
// Selectors are hooks only: data-component, data-slot, data-state (and ids the room's API already exposes).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(process.env.NODE_PATH || '/usr/lib/node_modules', 'playwright'))); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.QA_PORT) || 4411;
let BASE = process.env.BASE || `http://localhost:${PORT}`;
const SIZES = (process.env.QA_SIZES || '1920x1130,1440x900,1280x800').split(',').map(s => s.split('x').map(Number));
const MODES = (process.env.QA_MODES || 'day,night').split(',');
const ONLY = process.env.QA_ONLY ? new RegExp(process.env.QA_ONLY) : null;
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const OUT = path.resolve(ROOT, process.env.QA_OUT || `design/studio/qa/${stamp}`);
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---- the walk: each state starts from a fresh page, so nothing leaks between states ----
const STUB = 'qa-stub-run';
const ASK_UNBLOCK = { type: 'ask', id: 'qa-u1', unblock: true, seat: 'engineering', by: 'Bo', question: 'When do orders close?', decision: 'When do orders close.', suggestion: '8pm the night before', doing: 'Setting up ordering', topic: 'Orders close', kind: 'call' };
const JOINTS = [
  { type: 'joint.agreed', id: 'qa-j1', headline: 'Orders close at 8pm for the next morning.', seats: ['engineering', 'design'], withTakeaways: true,
    turns: [{ by: 'Bo', seat: 'engineering', text: 'Bakers need the count by 8.' }, { by: 'Mika', seat: 'design', text: 'Then say it on the order page.' }] },
  { type: 'joint.agreed', id: 'qa-j2', headline: 'Price shows on the loaf list, not at checkout.', seats: ['strategy', 'data'],
    turns: [{ by: 'Ines', seat: 'strategy', text: 'Surprise prices lose first-timers.' }, { by: 'Theo', seat: 'data', text: 'We’ll watch drop-off at confirm.' }] },
];
const FOCUS1 = { type: 'ask', id: 'first', first: true, seat: 'research', by: 'Noor', question: 'Who should we build this for first?', users: ['Morning regulars', 'Weekend pastry crowd'], decisionIds: [],
  artifact: { kind: 'finding', ref: { title: 'A third of artisan-bakery visitors buy bread there every week', quote: 'A third (33%) of UK adults who visit artisan bakeries now buy bread there at least once a week',
    url: 'https://example.org/report', site: 'Bakery Business', fetched: '2026-11-14', label: 'researched before the demo', users: ['Morning regulars', 'Weekend pastry crowd'] } } };
const FOCUS2 = { type: 'ask', id: 'feel', feel: true, seat: 'design', by: 'Mika', question: 'What should this feel like for a regular?', artifact: { kind: 'journey-words', ref: 'feel' }, decisionIds: [],
  steps: [{ step: 1, time: '7:05', text: 'Sam leaves for work' }, { step: 2, time: '7:10', text: 'Sam reserves the usual on the bus' }, { step: 3, time: '7:40', text: 'Sam picks it up, still warm' }] };
const SEATS = ['design', 'research', 'data', 'strategy', 'engineering'];

// in-page helpers, installed once per page (mirrors /gallery's h.play / h.dispatch)
async function helpers(p) {
  await p.evaluate(async () => {
    const sort = evs => evs.filter(e => e && e.type).sort((a, b) => a.t - b.t);
    const [reh, fx] = await Promise.all([
      fetch('/api/replay/rehearsal').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/fixtures/fake-run.jsonl').then(r => r.ok ? r.text() : '').catch(() => ''),
    ]);
    const data = { rehearsal: { events: sort((reh && reh.events) || []), taste: (reh && reh.taste) || '', kind: 'recorded' },
      fixture: { events: sort(fx.split('\n').filter(Boolean).map(l => JSON.parse(l))), taste: '', kind: 'fixture' } };
    const B = window.BYOC;
    window.__qa = {
      play(name, { until, count } = {}) {
        const src = data[name]; if (!src.events.length) throw new Error('no ' + name + ' events');
        B.reset(); B.replay = true; B.replayKind = src.kind; B.replayName = name; B.run = src.events[0].run || name;
        if (B.replayLabel) B.replayLabel(src.kind, name, src.events[0].t, 'qa');
        B.stage(2, { instant: true }); B.stage(3, { instant: true });
        if (src.taste && B.file && B.file.load) B.file.load(src.taste, '');
        const seen = {};
        for (const ev of src.events) {
          seen[ev.type] = (seen[ev.type] || 0) + 1;
          if (until && until(ev, seen)) break;
          if (count && Object.entries(count).some(([t, n]) => ev.type === t && seen[t] > n)) break;
          B.dispatch(ev, 'replay');
        }
      },
      d(ev, how) { B.dispatch(Object.assign({ t: Date.now(), run: B.run, sample: true }, ev), how || 'replay'); },
    };
  });
}

const S = []; // { id, name, url?, run(p) }
const add = (id, name, run, url) => S.push({ id, name, run, url });
add('01', 'name tag (setup, paper)', async p => { await p.evaluate(() => BYOC.reset()); await wait(700); });
add('02', 'meeting the team', async p => { await p.evaluate(() => { BYOC.reset(); BYOC.stage(1); }); await wait(700); });
add('03', 'the room, empty', async p => { await p.evaluate(() => { BYOC.reset(); BYOC.stage(2, { instant: true }); BYOC.stage(3, { instant: true }); }); await wait(700); });
add('04', 'idea sheet, glance (sketched)', async p => { await p.evaluate(() => __qa.play('rehearsal', { until: ev => ev.type === 'ask' })); await wait(900); });
add('05', 'idea sheet, open large', async p => { await p.evaluate(() => __qa.play('rehearsal', { until: ev => ev.type === 'ask' })); await wait(400);
  await p.locator('[data-component="idea-sheet"]').click({ position: { x: 30, y: 20 } }).catch(() => {}); await wait(700); });
add('06', 'team working', async p => { await p.evaluate(() => __qa.play('fixture', { count: { 'teammate.done': 0 } })); await wait(900); });
for (const seat of SEATS) {
  add('07-' + seat + '-empty', `seat panel ${seat}, empty`, async p => { await p.evaluate(() => { BYOC.reset(); BYOC.stage(2, { instant: true }); BYOC.stage(3, { instant: true }); BYOC.stage(4, { instant: true }); }); await wait(300); await p.evaluate(s => BYOC.openSketchpad(s), seat); await wait(500); });
  add('07-' + seat + '-full', `seat panel ${seat}, full`, async p => { await p.evaluate(() => __qa.play('fixture')); await wait(300); await p.evaluate(s => BYOC.openSketchpad(s), seat); await wait(500); });
}
add('07-hers-empty', 'her workspace, empty', async p => { await p.evaluate(() => { BYOC.reset(); BYOC.stage(2, { instant: true }); BYOC.stage(3, { instant: true }); BYOC.stage(4, { instant: true }); BYOC.openWorkspace(); }); await wait(500); });
add('07-hers-full', 'her workspace, full', async p => { await p.evaluate(() => { __qa.play('rehearsal'); BYOC.openWorkspace(); }); await wait(700); });
add('08-collapsed', 'inbox collapsed, nothing waiting', async p => { await p.evaluate(() => __qa.play('fixture', { until: ev => ev.type === 'ask' })); await wait(600); });
add('08-new', 'inbox, a new note', async p => { await p.evaluate(() => __qa.play('fixture', { until: ev => ev.type === 'ask' })); await wait(300);
  await p.evaluate(a => __qa.d(a), ASK_UNBLOCK); await wait(600); });
add('08-drawer', 'inbox drawer', async p => { await p.evaluate(() => { __qa.play('fixture'); __qa.d({ type: 'owner.task', id: 'qa-t1', title: 'Make a Stripe account for the bakery', steps: ['Sign up with the bakery email', 'Confirm the email', 'Tell the team it’s done'] }); }); await wait(300);
  await p.evaluate(() => BYOC.inbox.expand(true)); await wait(500); });
async function focusStub(p, ask) {
  await p.route('**/api/run/qa-stub-run/**', r => r.fulfill({ json: { ok: true } }));
  await p.evaluate(() => { BYOC.reset(); BYOC.stage(2, { instant: true }); BYOC.stage(3, { instant: true }); BYOC.stage(4, { instant: true }); BYOC.run = 'qa-stub-run';
    const d = ev => BYOC.dispatch({ run: 'qa-stub-run', ...ev }, 'live');
    d({ type: 'run.start', idea: "An ordering website for my friend's small bakery", stagePath: true });
    d({ type: 'sketch.user', id: 'u1', label: 'Morning regulars' }); d({ type: 'sketch.user', id: 'u2', label: 'Weekend pastry crowd' }); d({ type: 'sketch.done', seat: 'design', ms: 10 }); });
  await wait(400);
  await p.evaluate(a => BYOC.dispatch({ run: 'qa-stub-run', ...a }, 'live'), ask); await wait(500);
  await p.keyboard.press('PageDown'); await wait(900);
  if (!(await p.evaluate(() => BYOC.focusDoc.isOpen()))) { await p.evaluate(a => BYOC.focusDoc.open(a), ask); await wait(900); }
}
add('09-focus1', 'Focus 1 (Noor’s finding)', async p => { await focusStub(p, FOCUS1); });
add('09-focus1-typed', 'Focus 1, her answer typed', async p => { await focusStub(p, FOCUS1); await p.locator('[data-component="focus-doc"] [data-slot="input"]').first().fill('It’s really for the regulars.').catch(() => {}); await wait(300); });
add('09-focus1-takeaways', 'Focus 1 after Send, long takeaways (~60 words)', async p => { await focusStub(p, FOCUS1);
  await p.locator('[data-component="focus-doc"] [data-slot="input"]').first().fill('It’s really for the regulars. Most of them want the same loaf every morning.').catch(() => {});
  await p.keyboard.press('Enter'); await wait(400);
  await p.evaluate(() => { const d = ev => BYOC.dispatch({ run: 'qa-stub-run', ...ev }, 'live');
    d({ type: 'answer', askId: 'first', text: 'It’s really for the regulars. Most of them want the same loaf every morning.' });
    d({ type: 'chime', askId: 'first', seat: 'research', by: 'Noor', text: 'That matches the finding: a third come back every week.' });
    d({ type: 'chime', askId: 'first', seat: 'design', by: 'Mika', text: 'Then their usual loaf goes first, one tap away.' });
    d({ type: 'takeaways', askId: 'first', believe: 'Regulars come first: the people who buy the same loaf every week and hate hunting for it.',
      guidance: 'Put a regular’s usual loaf at the top of the page with one tap to reserve it for the next morning. Remember them on the device so they never fill in a form twice. New neighbours can browse below, but nothing should slow a regular down, and the cutoff time must be visible before they start, not at checkout.' }); });
  await wait(6000);
  // the guidance is long: say where it is, so a blank card is never mistaken for an animation
  const g = await p.evaluate(() => { const e = document.querySelector('[data-component="takeaways"] [data-slot="guidance"]') || document.querySelector('.brief-guidance .brief-text'); if (!e) return 'no guidance slot';
    const r = e.getBoundingClientRect(), box = e.closest('[data-component="takeaways"]').getBoundingClientRect(), cs = getComputedStyle(e);
    return `guidance textContent ${e.textContent.length} chars, innerText ${e.innerText.length}, color ${cs.color}, -webkit-text-fill ${cs.webkitTextFillColor}, clip ${cs.clipPath}, opacity ${cs.opacity}, visibility ${cs.visibility}, top ${Math.round(r.top)} bottom ${Math.round(r.bottom)} in card ${Math.round(box.top)}-${Math.round(box.bottom)}`; });
  console.log('  probe:', g); });
add('10-focus2', 'Focus 2 (Mika’s journey in words)', async p => { await focusStub(p, FOCUS2); });
async function unblock(p) {
  await p.evaluate(() => __qa.play('fixture', { until: ev => ev.type === 'ask' })); await wait(200);
  await p.evaluate(a => { __qa.d(a); }, ASK_UNBLOCK); await wait(300);
  await p.evaluate(() => BYOC.inbox.showUnblock && BYOC.inbox.showUnblock('qa-u1')); await wait(400);
}
add('11-unblock-asking', 'unblock card, asking', async p => { await unblock(p); });
add('11-unblock-speaking', 'unblock card, speaking', async p => { await unblock(p);
  await p.locator('[data-component="inbox-action"] [data-slot="say"]').first().click().catch(() => {}); await wait(200);
  await p.evaluate(() => { const e = document.querySelector('[data-component="inbox-action"] .ia-hers, [data-component="inbox-action"] [contenteditable], [data-component="inbox-action"] textarea, [data-component="inbox-action"] input');
    if (e) { if ('value' in e) e.value = 'Seven the night before. We start baking at four.'; else e.textContent = 'Seven the night before. We start baking at four.'; e.dispatchEvent(new Event('input', { bubbles: true })); } }); await wait(300); });
add('11-unblock-yes', 'unblock card, yes', async p => { await unblock(p);
  await p.route('**/api/**', r => r.request().method() === 'POST' ? r.fulfill({ json: { ok: true } }) : r.continue());
  await p.locator('[data-component="inbox-action"] [data-slot="yes"]').first().click().catch(() => {}); await wait(500); });
add('12-team-space', 'team space', async p => { await p.evaluate(j => { __qa.play('fixture'); j.forEach(e => __qa.d(e)); BYOC.teamSpace && BYOC.teamSpace.render(); }, JOINTS); await wait(500); });
add('12-decision-open', 'team space, a decision open', async p => { await p.evaluate(j => { __qa.play('fixture'); j.forEach(e => __qa.d(e)); BYOC.teamSpace && BYOC.teamSpace.render(); }, JOINTS); await wait(400);
  await p.locator('[data-component="decision-card"]').first().click().catch(() => {}); await wait(400); });
add('13-her-page', 'her page, built (room)', async p => { await p.evaluate(() => __qa.play('rehearsal')); await wait(2500); });
add('13-her-page-open', 'her page, built, sheet open large', async p => { await p.evaluate(() => __qa.play('rehearsal')); await wait(2500);
  await p.locator('[data-component="idea-sheet"]').click({ position: { x: 30, y: 20 } }).catch(() => {}); await wait(1200); });
add('14-close', 'the close (from the room, after the run)', async p => { await p.evaluate(() => { __qa.play('rehearsal'); BYOC.close.open(); }); await wait(900); });
const room3 = () => { BYOC.reset(); BYOC.stage(2, { instant: true }); BYOC.stage(3, { instant: true }); BYOC.stage(4, { instant: true }); BYOC.run = 'qa-stub-run'; };
add('16-app-none', 'app button, no app yet', async p => { await p.evaluate(room3); await wait(500); });
add('16-app-building', 'app button, building', async p => { await p.evaluate(room3); await p.evaluate(() => BYOC.dispatch({ run: 'qa-stub-run', type: 'build.step', step: 'Laying out the order page' }, 'live')); await wait(500); });
add('16-app-ready', 'app button, ready', async p => { await p.evaluate(room3); await p.evaluate(() => BYOC.dispatch({ run: 'qa-stub-run', type: 'build.done', version: 1, t: Date.now() - 180000, url: '/runs/rehearsal/page/' }, 'live')); await wait(500); });
add('16-app-new-version', 'app button, new version pulse', async p => { await p.evaluate(room3); await p.evaluate(() => { const d = ev => BYOC.dispatch({ run: 'qa-stub-run', ...ev }, 'live');
  d({ type: 'build.done', version: 1, t: Date.now() - 300000, url: '/runs/rehearsal/page/' }); d({ type: 'build.step', step: 'Adding the cutoff line' }); d({ type: 'build.done', version: 2, t: Date.now(), url: '/runs/rehearsal/page/', changes: ['orders close at 8pm', 'sold-out loaves greyed'] }); }); await wait(250); });
add('15-slides', '/slides/', async () => { await wait(1500); }, '/slides/');

// ---- automatic checks (QA.md); every flag is a lead for the eye, not a verdict ----
async function checks(p, slides) {
  return p.evaluate(slides => {
    const out = [];
    const W = innerWidth, H = innerHeight;
    const hook = el => { const c = el.closest('[data-component]'); if (!c) return el.id ? '#' + el.id : el.tagName.toLowerCase();
      const s = el.closest('[data-slot]'); return `[data-component="${c.dataset.component}"]` + (c.dataset.state ? `[data-state="${c.dataset.state}"]` : '') + (s && c.contains(s) && s !== c ? ` [data-slot="${s.dataset.slot}"]` : ''); };
    const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity === 0) return false; for (let a = el; a; a = a.parentElement) if (getComputedStyle(a).display === 'none' || +getComputedStyle(a).opacity === 0) return false; return true; };
    const de = document.scrollingElement || document.documentElement;
    if (de.scrollWidth > W + 1 || de.scrollHeight > H + 1) out.push({ check: 'scrollbar', hook: 'page', note: `page scrolls: ${de.scrollWidth}x${de.scrollHeight} in ${W}x${H}` });
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      // headless Chromium hides overlay scrollbars, so check the numbers: a Mac shows a bar wherever these overflow
      if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && vis(el) && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1))
        out.push({ check: 'scrollbar', hook: hook(el), note: `scrolls on a Mac: ${el.scrollWidth}x${el.scrollHeight} of content in ${el.clientWidth}x${el.clientHeight} (overflow ${cs.overflowX}/${cs.overflowY})` });
      // painted frames drawn with ::before/::after outside the box, cut by an overflow parent (or by the element itself)
      if (vis(el)) for (const ps of ['::before', '::after']) {
        const pc = getComputedStyle(el, ps); if (!pc || pc.content === 'none' || pc.content === 'normal' || pc.position !== 'absolute' || pc.display === 'none') continue;
        const r = el.getBoundingClientRect(); const n = v => (v === 'auto' ? null : parseFloat(v));
        const t = n(pc.top), l = n(pc.left), rt = n(pc.right), b = n(pc.bottom);
        const out4 = { top: t !== null && t < -0.5 ? r.top + t : r.top, left: l !== null && l < -0.5 ? r.left + l : r.left, right: rt !== null && rt < -0.5 ? r.right - rt : r.right, bottom: b !== null && b < -0.5 ? r.bottom - b : r.bottom };
        if (out4.top === r.top && out4.left === r.left && out4.right === r.right && out4.bottom === r.bottom) continue; // drawn inside the box
        for (let a = el; a && a.tagName !== 'BODY'; a = a.parentElement) { const ac = getComputedStyle(a);
          if (!/(hidden|auto|scroll|clip)/.test(ac.overflowX + ac.overflowY)) continue;
          const ar = a.getBoundingClientRect();
          const cut = Math.max(ar.top - out4.top, out4.right - ar.right, out4.bottom - ar.bottom, ar.left - out4.left);
          if (cut > 1) { out.push({ check: 'clipped frame', hook: hook(el), note: `${ps} frame cut by ${cut.toFixed(0)}px at ${a === el ? 'its own' : hook(a)} overflow:${ac.overflowX}/${ac.overflowY}` }); break; }
        }
      }
    }
    // parts that leave the screen
    for (const el of document.querySelectorAll('[data-component]')) {
      if (!vis(el) || el.tagName === 'IFRAME') continue; const r = el.getBoundingClientRect();
      if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.push({ check: 'off-screen', hook: hook(el), note: `box ${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)} in ${W}x${H}` });
    }
    // text: size, edges, contrast
    const rgb = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const bgOf = el => { // the first opaque-ish background behind el; null if it sits on an image, the painting or a gradient
      let acc = null;
      for (let a = el; a; a = a.parentElement) { const cs = getComputedStyle(a);
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
        const c = rgb(cs.backgroundColor); if (c && c.a > 0) { if (c.a >= 0.85) return c; acc = acc || c; }
        if (a.id === 'room' || a.tagName === 'BODY') break; }
      return acc && acc.a >= 0.6 ? acc : null; };
    const seen = new Set();
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim().length > 1 ? 1 : 2 });
    let n;
    while ((n = tw.nextNode())) {
      const el = n.parentElement; if (!el || seen.has(el) || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE'].includes(el.tagName) || !vis(el)) continue; seen.add(el);
      const cs = getComputedStyle(el); const rg = document.createRange(); rg.selectNodeContents(n); const tr = rg.getBoundingClientRect();
      if (tr.width < 1 || tr.right < 0 || tr.left > W || tr.bottom < 0 || tr.top > H) continue;
      const fs = parseFloat(cs.fontSize), sc = el.getBoundingClientRect().height / (el.offsetHeight || 1); // the room is scaled to the window
      const px = fs * (sc || 1);
      const txt = n.textContent.trim().slice(0, 40);
      if (px < 12.5) out.push({ check: 'small text', hook: hook(el), note: `${px.toFixed(1)}px on screen: “${txt}”` });
      if (!slides && cs.fontWeight && +cs.fontWeight > 500) out.push({ check: 'weight', hook: hook(el), note: `weight ${cs.fontWeight}: “${txt}”` });
      const fg = rgb(cs.color), bg = bgOf(el);
      if (fg && bg) { const r = ratio(fg, bg); const large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
        if (r < (large ? 3 : 4.5)) out.push({ check: 'contrast', hook: hook(el), note: `${r.toFixed(2)}:1 (${cs.color} on ${`rgb(${bg.r},${bg.g},${bg.b})`}): “${txt}”` }); }
      else if (fg && !bg) out.push({ check: 'contrast (over picture)', hook: hook(el), note: `text on the painting or an image, check by eye: “${txt}”`, soft: true });
      // text on the edge of its card: the nearest ancestor with a background or border
      for (let a = el; a && a.id !== 'room' && a.tagName !== 'BODY'; a = a.parentElement) { const ac = getComputedStyle(a);
        const boxed = (rgb(ac.backgroundColor)?.a || 0) > 0.5 || parseFloat(ac.borderTopWidth) > 0; if (!boxed) continue;
        const r = a.getBoundingClientRect(); const gap = Math.min(tr.left - r.left, r.right - tr.right, tr.top - r.top, r.bottom - tr.bottom);
        if (gap < 3 && r.width > 40 && !['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName)) out.push({ check: 'text on edge', hook: hook(a), note: `${gap.toFixed(1)}px from its box: “${txt}”` });
        break; }
      // clipped text
      if (el.scrollWidth > el.clientWidth + 2 && /(hidden|clip)/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis') out.push({ check: 'clipped text', hook: hook(el), note: `cut off: “${txt}”` });
    }
    // default browser controls
    for (const el of document.querySelectorAll('button, input, select, textarea')) {
      if (!vis(el) || el.type === 'hidden') continue; const cs = getComputedStyle(el); const bg = rgb(cs.backgroundColor);
      const buttonface = bg && bg.a > 0 && [[239, 239, 239], [240, 240, 240], [233, 233, 237]].some(([r, g, b]) => bg.r === r && bg.g === g && bg.b === b);
      // a styled button keeps appearance:auto in Chromium, so only the default ButtonFace fill or a native box counts
      if (buttonface || (el.tagName === 'SELECT' && cs.appearance !== 'none') || (el.tagName === 'INPUT' && ['checkbox', 'radio', 'range', 'file'].includes(el.type) && cs.appearance !== 'none'))
        out.push({ check: 'default control', hook: hook(el), note: `${el.tagName.toLowerCase()} looks like the browser default (${cs.appearance}, ${cs.backgroundColor}): “${(el.textContent || el.value || el.placeholder || '').trim().slice(0, 30)}”` });
    }
    // mostly empty panels
    for (const el of document.querySelectorAll('[data-component="sketchpad-open"], [data-component="workspace"], [data-component="focus-doc"], [data-component="inbox"][data-state="expanded"], [data-component="close-view"]')) {
      if (!vis(el)) continue; const r = el.getBoundingClientRect(); const text = el.innerText.replace(/\s+/g, ' ').trim();
      const area = r.width * r.height; if (area > 0.15 * W * H && text.length < 120) out.push({ check: 'mostly empty', hook: hook(el), note: `${Math.round(100 * area / (W * H))}% of the screen holds ${text.length} characters: “${text.slice(0, 80)}”` });
    }
    // white frames: the page background showing around the scaled room
    const bodyBg = rgb(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 0 };
    if (!slides && (bodyBg.a === 0 || lum(bodyBg) > 0.9)) out.push({ check: 'white frame', hook: 'body', note: `the page behind the room is ${getComputedStyle(document.body).backgroundColor}` });
    return out;
  }, slides);
}

// ---- run ----
async function serverUp(url) { for (let i = 0; i < 50; i++) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await wait(200); } return false; }
let srv = null;
if (!process.env.BASE) {
  srv = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  if (!(await serverUp(BASE + '/'))) { console.error('server did not start on ' + BASE); srv.kill(); process.exit(1); }
}
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const browser2 = () => browser;
const all = [];
const rev = (await new Promise(r => { const g = spawn('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }); let s = ''; g.stdout.on('data', d => s += d); g.on('close', () => r(s.trim())); }));
for (const [w, h] of SIZES) for (const mode of MODES) {
  const dir = path.join(OUT, `${w}x${h}-${mode}`); fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: mode === 'night' ? 'dark' : 'light' });
  for (const s of S) {
    if (ONLY && !ONLY.test(s.id + ' ' + s.name)) continue;
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    const url = BASE + (s.url || '/') + `?look=painted&stage=1&night=${mode === 'night' ? 1 : 0}`;
    let note = '';
    try {
      await p.goto(url, { waitUntil: 'load' }); await wait(1500);
      if (!s.url) await helpers(p);
      await s.run(p);
    } catch (e) { note = 'walk error: ' + String(e.message || e).split('\n')[0].slice(0, 200); }
    const file = path.join(dir, `${s.id}.jpg`);
    await p.screenshot({ path: file, type: 'jpeg', quality: 72 });
    let found = []; try { found = await checks(p, !!s.url); } catch (e) { note += ' checks error: ' + e.message; }
    const states = await p.evaluate(() => [...document.querySelectorAll('[data-component][data-state]')].filter(e => e.getBoundingClientRect().width > 0).map(e => `${e.dataset.component}=${e.dataset.state}`).filter((v, i, a) => a.indexOf(v) === i).slice(0, 30)).catch(() => []);
    const rel = path.relative(ROOT, file);
    for (const f of found) all.push({ ...f, shot: rel, size: `${w}x${h}`, mode, state: s.name });
    for (const e of errs) all.push({ check: 'page error', hook: '', note: e, shot: rel, size: `${w}x${h}`, mode, state: s.name });
    if (note) all.push({ check: 'walk', hook: '', note, shot: rel, size: `${w}x${h}`, mode, state: s.name });
    fs.appendFileSync(path.join(OUT, 'states.txt'), `${rel}\t${s.name}\t${states.join(' ')}\n`);
    process.stdout.write(`${w}x${h} ${mode} ${s.id} ${found.filter(f => !f.soft).length} flags${note ? ' (' + note + ')' : ''}\n`);
    await p.close();
  }
  await ctx.close();
}

// ---- day / night modes (design/daynight): Cycle -> Day -> Night pill, at each size ----
// Pass: the label matches the mode; within 1 s exactly one video.room is at opacity 1 and playing; every visible patch
// video advances; the mode survives a reload; the same after 4 quick clicks during a live replay. The painting's own
// markup (video.room, .patch) is the studio's comp, probed through its iframe.
const MODE_LABEL = { cycle: /Cycle\s*·?\s*tap for day/i, day: /Day\s*·?\s*tap for night/i, night: /Night\s*·?\s*tap for cycle/i };
const PILL = 'button[aria-label^="Time of day follows"], button[aria-label^="Always day"], button[aria-label^="Always night"]';
const modeOf = aria => /^Time of day follows/.test(aria) ? 'cycle' : /^Always day/.test(aria) ? 'day' : /^Always night/.test(aria) ? 'night' : '?';
async function probeLiving(p) {
  const f = p.frames().find(fr => fr.url().includes('cast-living'));
  if (!f) return { err: 'no living iframe' };
  const a = await f.evaluate(() => {
    const rooms = [...document.querySelectorAll('video.room')].map(v => ({ t: v.dataset.t, op: +getComputedStyle(v).opacity, paused: v.paused }));
    const pv = [...document.querySelectorAll('.patch video')].filter(v => +getComputedStyle(v).opacity > 0.5 && getComputedStyle(v.closest('.patch')).display !== 'none');
    window.__qaPv = pv; return { rooms, times: pv.map(v => v.currentTime), who: pv.map(v => (v.closest('.patch') || {}).dataset?.who || '?') };
  });
  await wait(700);
  const t2 = await f.evaluate(() => (window.__qaPv || []).map(v => v.currentTime));
  const on = a.rooms.filter(r => r.op > 0.99);
  const frozen = a.who.filter((w, i) => !(t2[i] > a.times[i] || t2[i] < a.times[i] - 0.5)); // looping back counts as moving
  return { on: on.map(r => r.t + (r.paused ? ' (paused)' : '')), playingOn: on.filter(r => !r.paused).length, onCount: on.length, frozen, patches: a.who.length };
}
if (!ONLY || ONLY.test('daynight')) for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`; const dir = path.join(OUT, `${tag}-daynight`); fs.mkdirSync(dir, { recursive: true });
  const rec = (check, hook, note, shot) => all.push({ check, hook, note, shot: shot ? path.relative(ROOT, shot) : '', size: tag, mode: 'daynight', state: 'day/night modes' });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  try {
    const open = async () => { await p.goto(BASE + '/?look=painted&stage=1'); await wait(1500); await p.evaluate(() => { BYOC.reset(); BYOC.stage(2, { instant: true }); BYOC.stage(3, { instant: true }); }); await wait(2500); };
    await open();
    if (!(await p.locator(PILL).count())) { rec('not on main yet', 'day/night pill', 'no Cycle / Day / Night pill on this build (design/daynight not merged)'); throw null; }
    const check = async (label, expectMode) => {
      const pill = p.locator(PILL).first(); const aria = await pill.getAttribute('aria-label'); const text = (await pill.innerText()).replace(/\s+/g, ' ').trim();
      const m = modeOf(aria); const shot = path.join(dir, `${label}.jpg`);
      await wait(1000); const pr = await probeLiving(p); await p.screenshot({ path: shot, type: 'jpeg', quality: 72 });
      if (expectMode && m !== expectMode) rec('day/night', 'pill', `${label}: expected ${expectMode}, pill says ${m} (“${text}”)`, shot);
      if (!MODE_LABEL[m] || !MODE_LABEL[m].test(text)) rec('day/night', 'pill label', `${label}: label “${text}” does not read as ${m}`, shot);
      if (pr.err) rec('day/night', 'iframe.painted-living', `${label}: ${pr.err}`, shot);
      else {
        if (pr.onCount !== 1 || pr.playingOn !== 1) rec('day/night', 'video.room', `${label}: ${pr.onCount} room videos at opacity 1 (${pr.on.join(', ') || 'none'}), ${pr.playingOn} playing; want exactly 1 playing`, shot);
        if (pr.frozen.length) rec('day/night', '.patch video', `${label}: frozen teammates: ${pr.frozen.join(', ')} (of ${pr.patches} visible patches)`, shot);
      }
      process.stdout.write(`${tag} daynight ${label}: ${m} “${text}” rooms on [${pr.on || ''}] frozen [${pr.frozen || ''}]\n`);
      return m;
    };
    let m = await check('0-start', null);
    for (let i = 1; i <= 3; i++) { const want = { cycle: 'day', day: 'night', night: 'cycle' }[m]; await p.locator(PILL).first().click({ force: true }); m = await check(`${i}-click`, want); }
    // survives a reload: step off the default first, so the reload proves memory
    await p.locator(PILL).first().click({ force: true }); m = await check('4a-before-reload', { cycle: 'day', day: 'night', night: 'cycle' }[m]);
    const before = m; await open(); const after = await check('4b-reload', before);
    // during a live replay: R, then 4 quick clicks (net: one step on from where it was)
    await p.keyboard.press('r'); await wait(3000);
    for (let i = 0; i < 4; i++) { await p.locator(PILL).first().click({ force: true }); await wait(120); }
    await check('5-replay-4-clicks', { cycle: 'day', day: 'night', night: 'cycle' }[after]);
  } catch (e) { if (e) rec('walk', 'daynight', 'daynight error: ' + String(e.message || e).split('\n')[0]); }
  await ctx.close();
}

// ---- extras at the demo size (Vincent's Mac): room coverage, art at 1:1, toy clicks as frame strips, app button, cursor ----
// Crops are fractions of the room (#room's box on screen). Toy spots come from playful-ink.js (button[data-spot]).
const ART = { mika: [.19, .34, .2, .46], noor: [.36, .29, .15, .34], theo: [.47, .33, .12, .26], ines: [.55, .27, .15, .36], bo: [.65, .39, .19, .4],
  cat: [.17, .74, .2, .2], record: [.86, .41, .14, .25], coffee: [0, .38, .12, .22], lights: [.28, 0, .54, .12], stool: [.33, .66, .14, .2] };
const EXTRA = (process.env.QA_EXTRA_SIZES || '1920x1130').split(',').filter(Boolean).map(s => s.split('x').map(Number));
for (const [w, h] of EXTRA) for (const mode of MODES) {
  if (ONLY && !ONLY.test('extras')) continue;
  const dir = path.join(OUT, `${w}x${h}-${mode}`, 'extras'); fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser2().newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: mode === 'night' ? 'dark' : 'light' });
  const p = await ctx.newPage(); const tag = `${w}x${h}`;
  const rec = (check, hook, note, shot) => all.push({ check, hook, note, shot: shot ? path.relative(ROOT, shot) : '', size: tag, mode, state: 'extras' });
  try {
    await p.goto(BASE + `/?look=painted&stage=1&night=${mode === 'night' ? 1 : 0}`); await wait(1500); await helpers(p);
    await p.evaluate(() => { BYOC.reset(); BYOC.stage(2, { instant: true }); BYOC.stage(3, { instant: true }); }); await wait(2500);
    const room = await p.evaluate(() => { const r = document.getElementById('room').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const bands = { top: Math.round(room.y), bottom: Math.round(h - room.y - room.h), left: Math.round(room.x), right: Math.round(w - room.x - room.w) };
    if (Object.values(bands).some(v => v > 1)) rec('room coverage', '#room', `the room leaves bands: top ${bands.top}px, bottom ${bands.bottom}px, left ${bands.left}px, right ${bands.right}px`);
    const full = path.join(dir, 'room.png'); await p.screenshot({ path: full });
    for (const [k, [fx, fy, fw, fh]] of Object.entries(ART)) {
      const clip = { x: Math.max(0, room.x + fx * room.w), y: Math.max(0, room.y + fy * room.h), width: fw * room.w, height: fh * room.h };
      clip.width = Math.min(clip.width, w - clip.x); clip.height = Math.min(clip.height, h - clip.y);
      if (clip.width < 4 || clip.height < 4 || clip.y >= h) { rec('art not visible', k, `${k} falls outside the visible area`); continue; }
      if (room.y + (fy + fh) * room.h > h + 1 || room.y + fy * room.h < -1) rec('art cut', k, `${k} is partly outside the visible area`);
      await p.screenshot({ path: path.join(dir, `art-${k}.png`), clip });
    }
    // toys: click, then 10 frames 120 ms apart of that toy's box, side by side in one strip
    for (const toy of ['cat', 'record', 'coffee', 'lights']) {
      const spot = p.locator(`button[data-spot="${toy}"]`);
      if (!(await spot.count())) { rec('toy missing', `button[data-spot="${toy}"]`, `no ${toy} hotspot`); continue; }
      const [fx, fy, fw, fh] = ART[toy]; const clip = { x: room.x + fx * room.w, y: Math.max(0, room.y + fy * room.h), width: fw * room.w, height: Math.min(fh * room.h, h - Math.max(0, room.y + fy * room.h)) };
      await spot.click({ force: true }).catch(e => rec('toy click', toy, String(e.message).split('\n')[0]));
      for (let i = 0; i < 10; i++) { await p.screenshot({ path: path.join(dir, `toy-${toy}-${String(i).padStart(2, '0')}.png`), clip }); await wait(120); }
      await wait(1500);
    }
    // day/night pill (no data-component yet): the aria-label is the only stable handle
    const sky = p.locator('button[aria-label^="Switch to"]');
    if (await sky.count()) { await sky.first().click({ force: true }); await wait(2500); await p.screenshot({ path: path.join(dir, 'toggled-time.png') }); }
    else rec('toy missing', 'day/night pill', 'no day/night pill');
    // app button and custom cursor (announced as coming)
    const app = await p.locator('[data-component="app-button"]').count();
    if (!app) rec('not on main yet', '[data-component="app-button"]', 'no app button on this build: states no app / building / ready / new-version not checked');
    const cur = await p.evaluate(() => [document.body, document.querySelector('#room'), document.querySelector('button[data-spot]'), document.querySelector('input,textarea')].filter(Boolean).map(e => getComputedStyle(e).cursor));
    if (!cur.some(c => /url\(/.test(c))) rec('not on main yet', 'cursor', `no custom cursor yet (computed: ${[...new Set(cur)].join(', ')})`);
  } catch (e) { rec('walk', 'extras', 'extras error: ' + String(e.message).split('\n')[0]); }
  process.stdout.write(`${w}x${h} ${mode} extras done\n`);
  await ctx.close();
}

await browser.close(); if (srv) srv.kill();
fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify({ rev, base: BASE, at: new Date().toISOString(), findings: all }, null, 1));
// contact sheet
const stf = path.join(OUT, 'states.txt'); const shots = (fs.existsSync(stf) ? fs.readFileSync(stf, 'utf8') : '').trim().split('\n').filter(Boolean).map(l => l.split('\t'));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset=utf-8><title>Design QA ${esc(stamp)}</title>
<style>body{font:15px/1.4 system-ui;margin:24px;background:#f6f1e8;color:#2b241d}figure{display:inline-block;margin:0 16px 24px 0;width:480px;vertical-align:top}img{width:100%;border:1px solid #cbbfae;border-radius:6px}figcaption{font-size:13px}li{font-size:13px}</style>
<h1 style="font-weight:500">Design QA · ${esc(rev)} · ${esc(stamp)} UTC</h1><p>${all.filter(f => !f.soft).length} automatic flags; each is a lead for the eye.</p>
${shots.map(([rel, name]) => { const fl = all.filter(f => f.shot === rel && !f.soft); return `<figure><a href="${esc(path.relative(OUT, path.join(ROOT, rel)))}"><img loading=lazy src="${esc(path.relative(OUT, path.join(ROOT, rel)))}"></a><figcaption>${esc(rel.split('/').slice(-2).join(' / '))} · ${esc(name)}<ul>${fl.slice(0, 8).map(f => `<li>${esc(f.check)}: ${esc(f.hook)} ${esc(f.note)}</li>`).join('')}${fl.length > 8 ? `<li>…${fl.length - 8} more</li>` : ''}</ul></figcaption></figure>`; }).join('\n')}`);

// ---- report: counts, new flags vs the previous pass, pixel diff vs the previous pass ----
const key = f => [f.check, f.hook, f.size, f.mode, f.state].join(' | ');
const hard = all.filter(f => !f.soft && f.check !== 'contrast (over picture)');
let prevKeys = null, diffs = [];
if (process.env.QA_PREV) {
  const PREV = path.resolve(ROOT, process.env.QA_PREV);
  try { prevKeys = new Set(JSON.parse(fs.readFileSync(path.join(PREV, 'findings.json'), 'utf8')).findings.filter(f => !f.soft).map(key)); } catch { prevKeys = null; }
  const py = `import sys,os,json\nfrom PIL import Image, ImageChops\nA,B=sys.argv[1],sys.argv[2];out=[]\nfor r,_,fs in os.walk(A):\n  for f in fs:\n    if not f.endswith(('.png','.jpg')): continue\n    a=os.path.join(r,f);rel=os.path.relpath(a,A);b=os.path.join(B,rel)\n    if not os.path.exists(b): out.append([rel,-1]);continue\n    x=Image.open(a).convert('L');y=Image.open(b).convert('L')\n    if x.size!=y.size: out.append([rel,100]);continue\n    d=ImageChops.difference(x,y).point(lambda v:255 if v>24 else 0)\n    out.append([rel,round(100*sum(d.histogram()[255:])/(x.size[0]*x.size[1]),2)])\nprint(json.dumps(out))`;
  try {
    const r = require('node:child_process').spawnSync('python3', ['-c', py, OUT, PREV], { encoding: 'utf8', maxBuffer: 1 << 24 });
    diffs = JSON.parse(r.stdout || '[]');
  } catch (e) { diffs = []; }
}
const byCheck = {}; for (const f of hard) byCheck[f.check] = (byCheck[f.check] || 0) + 1;
const fresh = prevKeys ? hard.filter(f => !prevKeys.has(key(f))) : [];
const gone = prevKeys ? [...prevKeys].filter(k => !hard.some(f => key(f) === k)).length : 0;
// shots with living video in them always differ a little: under 1.5% of pixels counts as unchanged
const changed = diffs.filter(([, d]) => d === -1 || d >= 1.5).sort((a, b) => b[1] - a[1]);
const lines = [`# Design QA ${stamp} UTC · ${rev}`, '', `${hard.length} flags (${Object.entries(byCheck).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}).`];
if (prevKeys) lines.push('', `Against ${process.env.QA_PREV}: ${fresh.length} new flags, ${gone} gone, ${changed.length} shots changed (≥1.5% of pixels).`);
if (fresh.length) { lines.push('', '## New flags'); const seen = new Set(); for (const f of fresh) { const k = [f.check, f.hook, f.note.replace(/\d+(\.\d+)?/g, '#')].join(' | '); if (seen.has(k)) continue; seen.add(k); lines.push(`- ${f.check} · ${f.hook} · ${f.note.slice(0, 140)} · \`${f.shot}\` (${f.size} ${f.mode})`); } }
if (changed.length) { lines.push('', '## Changed shots (look at these)'); for (const [rel, d] of changed.slice(0, 60)) lines.push(`- \`${path.relative(ROOT, path.join(OUT, rel))}\` ${d === -1 ? 'new' : d + '%'}`); }
const walk = all.filter(f => f.check === 'walk' || f.check === 'page error');
if (walk.length) { lines.push('', '## Walk problems'); for (const f of walk) lines.push(`- ${f.size} ${f.mode} ${f.state}: ${f.note.slice(0, 160)}`); }
fs.writeFileSync(path.join(OUT, 'report.md'), lines.join('\n') + '\n');
console.log(lines.slice(0, 6).join('\n'));

console.log(`\n${all.filter(f => !f.soft).length} flags · ${OUT}`);
