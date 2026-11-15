// Tidy evidence walk (builder 8): every tidy surface, painted, at 1920x1130 and 1440x900. Per surface: a screenshot
// while tidying and once tidied; checks: hooks, 300 ms feedback, 300 words and a paste, empty Enter, no page scrollbar,
// no console errors, no "undefined" on screen. Stubbed tidy (300 ms) unless FAL=1 (then /api/tidy is real).
// Usage: node evidence.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [BASE, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const REAL = process.env.FAL === '1';
const LONG = Array.from({ length: 300 }, (_, i) => ['um', 'so', 'the', 'regulars', 'really', 'like', 'a', 'warm', 'loaf', 'early'][i % 10]).join(' ');
const PASTE = 'So, the regulars, they just need to tell me their name and what they want for that day. But for our most popular items, we can only give them one each, because we only bake about forty of them and they always go first, usually before eight.';
const TIDY = {
  'um so a, a website for my bakery': 'A website for my bakery',
  'uh i love, like, baking sourdough for the regulars': 'I love baking sourdough for the regulars',
  'regulars first and then the bread i think': 'I think regulars first, then the bread',
  'um the regulars come first': 'The regulars come first',
  'uh, orders close, uh, at 8pm the night before': 'Orders close at 8pm the night before',
};
const results = [];
const ok = (surface, size, check, pass, note = '') => results.push({ surface, size, check, pass: !!pass, note });

async function fresh(size, query = '') {
  const [w, h] = size.split('x').map(Number);
  const page = await browserP.then(b => b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }));
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  if (!REAL) await page.route('**/api/tidy', async r => { const { text } = JSON.parse(r.request().postData()); await new Promise(f => setTimeout(f, 700));
    r.fulfill({ status: 200, json: { text: TIDY[text] || text.replace(/\b(um|uh|so)\b,?\s*/gi, '').replace(/\s+/g, ' ').trim() || text, tidied: true } }); });
  await page.route('**/api/name-tag', r => r.fulfill({ status: 500, json: { error: 'stubbed' } }));
  await page.route('**/api/meet-lines', r => r.fulfill({ status: 200, json: { lines: {} } }));
  for (const u of ['**/api/sketch-for-idea', '**/api/select-for-idea']) await page.route(u, r => r.fulfill({ status: 500, json: { error: 'stubbed' } }));
  await page.route('**/api/run/stub-run/**', r => r.fulfill({ json: { ok: true } }));
  await page.goto(BASE + '/?look=painted' + (query ? '&' + query : ''));
  await page.waitForFunction(() => window.BYOC && BYOC.stage);
  return { page, errors };
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 60 }).then(() => `${name}.jpg`);
const settled = async (page, name) => { const a = await shot(page, name.replace(/-tidied$/, '-moment')); await page.waitForTimeout(2000); return [a, await shot(page, name)]; };
const noScroll = page => page.evaluate(() => { const s = document.scrollingElement; return s.scrollWidth <= innerWidth + 1 && s.scrollHeight <= innerHeight + 1; });
const inView = (page, sel) => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.top >= -1; }, sel);
const noUndefined = page => page.evaluate(() => !/\bundefined\b|\bNaN\b|\[object /.test(document.body.innerText));
// Enter on a field: tidying within 300 ms, a screenshot then, tidied with its kind, a screenshot then.
async function enterAndWatch(page, sel, hookSel, name, size, surface) {
  const t0 = Date.now(); await page.press(sel, 'Enter');
  const fast = await page.waitForFunction(s => document.querySelector(s)?.dataset.state === 'tidying', hookSel, { timeout: 300 }).then(() => true, () => false);
  ok(surface, size, 'tidying within 300 ms of Enter', fast, `${Date.now() - t0} ms`);
  const s1 = fast ? await shot(page, `${name}-tidying`) : '';
  const done = await page.waitForFunction(s => document.querySelector(s)?.dataset.state === 'tidied', hookSel, { timeout: 6000 }).then(() => true, () => false);
  const hooks = done && await page.evaluate(s => { const e = document.querySelector(s); return e ? { raw: !!e.dataset.raw, tidy: e.dataset.tidy } : null; }, hookSel);
  ok(surface, size, 'tidied with data-raw and data-tidy', done && hooks && hooks.raw && hooks.tidy, JSON.stringify(hooks));
  const s2 = await settled(page, `${name}-tidied`);
  return [s1, ...s2].filter(Boolean);
}
async function longAndPaste(page, sel, size, surface) {
  await page.fill(sel, LONG);
  ok(surface, size, '300 words: no page scrollbar, field on screen', (await noScroll(page)) && (await inView(page, sel)));
  await page.fill(sel, '');
  await page.focus(sel); await page.keyboard.insertText(PASTE);
  ok(surface, size, 'pasted paragraph: no page scrollbar, field on screen', (await noScroll(page)) && (await inView(page, sel)));
  await page.fill(sel, '');
}

const browserP = chromium.launch();
const shots = [];
for (const size of ['1920x1130', '1440x900']) {
  // the idea card
  let { page, errors } = await fresh(size);
  await page.waitForFunction(() => BYOC.ideaOpen && BYOC.ideaOpen(), null, { timeout: 8000 });
  await longAndPaste(page, '#idea-input', size, 'idea card');
  await page.fill('#idea-input', 'um so a, a website for my bakery');
  shots.push(...await enterAndWatch(page, '#idea-input', '#idea-input', `idea-card-${size}`, size, 'idea card'));
  // empty Enter on the idea card, on its own page (b7's card)
  { const e = await fresh(size); await e.page.waitForFunction(() => BYOC.ideaOpen && BYOC.ideaOpen(), null, { timeout: 8000 });
    await e.page.press('#idea-input', 'Enter'); await e.page.waitForTimeout(300);
    ok('idea card', size, 'empty Enter: card stays (or says what is needed)', await e.page.evaluate(() => BYOC.ideaOpen()), 'b7 owns the idea card'); await e.page.close(); }
  // the name tag
  await page.waitForFunction(() => BYOC.introOpen && BYOC.introOpen(), null, { timeout: 10000 });
  await page.fill('#nt-name', 'Priya'); await page.click('.pick-option[data-pick="product"]');
  await longAndPaste(page, '#intro-input', size, 'name tag');
  await page.fill('#intro-input', 'uh i love, like, baking sourdough for the regulars');
  shots.push(...await enterAndWatch(page, '#intro-input', '#intro-input', `name-tag-${size}`, size, 'name tag'));
  ok('idea card + name tag', size, 'no console errors, no "undefined"', !errors.length && await noUndefined(page), errors.join(' | '));
  await page.close();

  // her sheet: the idea line, then a line (the sketch reaction's path)
  ({ page, errors } = await fresh(size));
  await page.route('**/api/run', r => r.fulfill({ status: 200, json: { run: 'stub-sheet' } }));
  await page.route('**/api/run/stub-sheet/**', r => r.fulfill({ status: 200, json: { nodes: [], edges: [] } }));
  await page.evaluate(() => BYOC.stage(3, { instant: true }));
  await page.waitForSelector('#her-input', { state: 'visible' });
  await longAndPaste(page, '#her-input', size, 'her sheet');
  await page.fill('#her-input', 'um so a, a website for my bakery');
  shots.push(...await enterAndWatch(page, '#her-input', '#her-idea', `sheet-idea-${size}`, size, 'her sheet: idea line'));
  await page.waitForFunction(() => document.getElementById('her-input').offsetParent !== null);
  await page.fill('#her-input', 'regulars first and then the bread i think');
  shots.push(...await enterAndWatch(page, '#her-input', '#her-input', `sheet-line-${size}`, size, 'her sheet: a line'));
  ok('her sheet', size, 'no console errors, no "undefined"', !errors.length && await noUndefined(page), errors.join(' | '));
  await page.close();

  // focus: a piece (typed), a piece by voice, the You turn
  ({ page, errors } = await fresh(size));
  await page.evaluate(() => {
    BYOC.stage(4, { instant: true }); BYOC.run = 'stub-run';
    BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'first', first: true, seat: 'research', by: 'Wren', question: 'Who should we build this for first?',
      artifact: { kind: 'finding', ref: { title: 'A finding', quote: 'A third of visitors buy weekly.', url: 'https://example.org/f', label: 'researched before the demo' } } }, 'live');
    BYOC.openNote('first');
  });
  await page.waitForFunction(() => BYOC.focusDoc.isOpen(), null, { timeout: 3000 });
  await longAndPaste(page, '#focus-doc .fd-input', size, 'focus doc');
  await page.fill('#focus-doc .fd-input', 'um the regulars come first'); await page.click('#focus-doc [data-slot="add-piece"]');
  ok('focus piece', size, 'piece tidying at once', await page.evaluate(() => document.querySelector('.fd-piece-words')?.dataset.state === 'tidying'));
  shots.push(await shot(page, `focus-piece-${size}-tidying`));
  await page.evaluate(() => { const li = document.querySelector('.fd-piece');
    BYOC.dispatch({ run: 'stub-run', type: 'answer.piece.tidy', askId: 'first', pieceId: li.dataset.piece, raw: 'um the regulars come first', text: 'The regulars come first' }, 'live'); });
  await page.waitForTimeout(900);
  ok('focus piece', size, 'piece tidied (cut)', await page.evaluate(() => document.querySelector('.fd-piece-words')?.dataset.tidy === 'cut'));
  shots.push(...await settled(page, `focus-piece-${size}-tidied`));
  // mic: a spoken take lands as a piece (what voice.js fires)
  await page.evaluate(() => { const f = document.querySelector('#focus-doc .fd-input'); f.value = 'uh and the bread'; f.dispatchEvent(new CustomEvent('byoc:voice', { detail: { text: 'uh and the bread' } })); });
  ok('focus piece', size, 'mic: a spoken take becomes a piece, tidying', await page.evaluate(() => document.querySelectorAll('.fd-piece-words')[1]?.dataset.state === 'tidying'));
  await page.press('#focus-doc .fd-input', 'Enter');
  const turn = await page.waitForFunction(() => document.querySelector('.fd-her-words')?.dataset.state === 'tidied', null, { timeout: 6000 }).then(() => true, () => false);
  ok('meeting You turn', size, 'You turn tidied with hooks', turn && await page.evaluate(() => !!document.querySelector('.fd-her-words').dataset.raw));
  shots.push(...await settled(page, `meeting-turn-${size}-tidied`));
  ok('focus doc', size, 'no console errors, no "undefined"', !errors.length && await noUndefined(page), errors.join(' | '));
  await page.close();

  // Bo's unblock answer (real run + raise on this server; no models)
  ({ page, errors } = await fresh(size, 'stage=1'));
  const run = await page.evaluate(async () => (await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idea: 'An ordering website for a small bakery', path: 'full' }) })).json()).then(r => r.run);
  await page.evaluate(run => { BYOC.stage(5, { instant: true }); BYOC.run = run; }, run);
  await page.evaluate(async run => fetch(`/api/run/${run}/unblock`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ seat: 'engineering', question: 'When do orders close?', suggestion: '8pm the night before', kind: 'call', doing: 'Setting up ordering', topic: 'Orders close' }) }), run);
  await page.waitForFunction(() => document.getElementById('inbox').dataset.needs === 'yes', null, { timeout: 15000 });
  await page.evaluate(() => BYOC.inbox.openTop());
  await page.click('#inbox article.inbox-action [data-slot="say"]');
  await page.evaluate(raw => { const el = document.querySelector('.ia-hers'); el.textContent = raw;
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new CustomEvent('byoc:voice', { detail: { text: raw } })); }, 'uh, orders close, uh, at 8pm the night before');
  ok("Bo's unblock", size, 'mic: tidying at once', await page.evaluate(() => document.querySelector('.ia-hers')?.dataset.state === 'tidying'));
  shots.push(await shot(page, `unblock-${size}-tidying`));
  const ub = await page.waitForFunction(() => document.querySelector('.ia-hers')?.dataset.state === 'tidied', null, { timeout: 6000 }).then(() => true, () => false);
  ok("Bo's unblock", size, 'tidied with hooks', ub && await page.evaluate(() => !!document.querySelector('.ia-hers').dataset.tidy));
  shots.push(...await settled(page, `unblock-${size}-tidied`));
  await page.evaluate(t => { const el = document.querySelector('.ia-hers'); el.textContent = t; el.dispatchEvent(new Event('input', { bubbles: true })); }, LONG);
  ok("Bo's unblock", size, '300 words: no page scrollbar, Yes on screen', (await noScroll(page)) && (await inView(page, '#inbox .ia-yes')));
  shots.push(await shot(page, `unblock-${size}-300-words`));
  ok("Bo's unblock", size, 'no console errors, no "undefined"', !errors.length && await noUndefined(page), errors.join(' | '));
  await page.close();

  // the close
  ({ page, errors } = await fresh(size));
  await page.evaluate(() => BYOC.stage(11, { instant: true }));
  await page.waitForFunction(() => BYOC.close && BYOC.close.isOpen(), null, { timeout: 4000 });
  await longAndPaste(page, '#close-input', size, 'the close');
  await page.press('#close-input', 'Enter'); await page.waitForTimeout(200);
  ok('the close', size, 'empty Enter: nothing happens', await page.evaluate(() => !document.getElementById('close-input').dataset.state));
  await page.fill('#close-input', 'um so a, a website for my bakery');
  shots.push(...await enterAndWatch(page, '#close-input', '#close-input', `close-${size}`, size, 'the close'));
  ok('the close', size, 'no console errors, no "undefined"', !errors.length && await noUndefined(page), errors.join(' | '));
  await page.close();
}
await (await browserP).close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ real: REAL, results, shots }, null, 1));
const fails = results.filter(r => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.size}  ${r.surface}: ${r.check}${r.note ? ' (' + r.note + ')' : ''}`);
console.log(`\n${results.length - fails.length}/${results.length} pass; ${shots.length} screenshots in ${OUT}`);
