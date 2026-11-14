// Design deals the page's palette and type live through taste-skill. Offline: a fake start.mjs runner with real
// output shapes; the deal always runs in a temp folder outside the repo; fonts stay local or fall back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-design-'));
const D = await import('../lib/design.js');
const { fillPage, loadTemplate } = await import('../lib/fill.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');
const { initTaste } = await import('../lib/taste.js');

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DEAL_OUT = `PALETTES for a bakery (made for the trade; take the first):
  chalk-tomato               Chalk and tomato  bg #f8f5ef surface #ede7dc ink #1f1b18 accent #b8381f  [light-neutral]
      warm off-white ground, red accent; made for bakery
  moss-sand                  Sand and moss  bg #ddd6c6 surface #d2cab8 ink #2a2a26 accent #4f6238  [light-neutral, earth]
TYPE for place (a bakery: a serif first) (take the first):
  fraunces           Fraunces / Figtree  (a serif; display 400; warm, friendly, classic)
  nunito             Nunito  (a soft sans; display 400; friendly, warm)
`;
const cssOut = (display = '"Fraunces", Georgia, serif', text = '"Figtree", system-ui, sans-serif') => `<link href="https://fonts.googleapis.com/css2?family=Fraunces" rel="stylesheet">
<style>
:root {
  --p-bg: #f8f5ef; --p-surface: #ede7dc; --p-ink: #1f1b18; --p-muted: #645c54;
  --p-accent: #b8381f; --p-accent-ink: #ffffff; --p-action: #b8381f; --p-action-ink: #ffffff;
  --font-display: ${display};
  --font-text: ${text};
  --display-weight: 400;
  --display-tracking: -0.02em;
  --display-axes: 'SOFT' 30, 'WONK' 0;
}
</style>`;
function fakeRun({ css = cssOut(), seen = [] } = {}) {
  return async (start, args, cwd) => {
    seen.push({ args, cwd, exists: fs.existsSync(cwd) });
    return args[0] === 'deal' ? DEAL_OUT : css;
  };
}

test('the deal output: the first palette and the first type; the css step\'s :root tokens', () => {
  assert.deepEqual(D.parseDeal(DEAL_OUT), { palette: 'chalk-tomato', type: 'fraunces' });
  const v = D.parseRoot(cssOut());
  assert.equal(v['p-accent'], '#b8381f');
  assert.equal(v['font-display'], '"Fraunces", Georgia, serif');
  assert.equal(v['display-axes'], "'SOFT' 30, 'WONK' 0");
});

test('a deal runs in a fresh temp folder outside the repo, removed after; palette and bundled type come back', async () => {
  const seen = [];
  const d = await D.dealDesign({ template: 'bakery', start: '/x/start.mjs', run: fakeRun({ seen }) });
  assert.deepEqual([d.trade, d.palette, d.type, d.typeFallback], ['bakery', 'chalk-tomato', 'fraunces', false]);
  assert.deepEqual(seen.map(s => s.args.slice(0, 1)[0]), ['deal', 'css']);
  assert.deepEqual(seen[0].args.slice(1, 5), ['--page', 'place', '--trade', 'bakery']);
  assert.ok(seen.every(s => s.exists && !s.cwd.startsWith(REPO) && s.cwd.startsWith(os.tmpdir())), 'outside the repo, in the temp dir');
  assert.equal(seen[0].cwd, seen[1].cwd, 'one folder for both steps');
  assert.ok(!fs.existsSync(seen[0].cwd), 'removed after');
  assert.ok(!fs.existsSync(path.dirname(path.dirname(path.dirname(seen[0].cwd)))), 'its whole temp folder removed');
  assert.match(seen[0].cwd, /byoc-deal-[^/]+\/a\/b\/c$/, 'three deep, so the script sees only our folders');
  assert.equal(d.tokens['p-bg'], '#f8f5ef');
  assert.equal(d.tokens['font-display'], '"Fraunces", Georgia, serif');
  assert.deepEqual(d.faces, ['Fraunces', 'Figtree']);
  // yoga deals the wellness trade
  const s2 = [];
  await D.dealDesign({ template: 'yoga', start: '/x', run: fakeRun({ seen: s2 }) });
  assert.equal(s2[0].args[4], 'wellness');
});

test('a dealt face with no bundled font: the palette still changes, the type stays the template\'s', async () => {
  const d = await D.dealDesign({ template: 'bakery', start: '/x', run: fakeRun({ css: cssOut('"Not Bundled Serif", serif') }) });
  assert.equal(d.typeFallback, true);
  assert.equal(d.tokens['p-accent'], '#b8381f');
  assert.ok(!('font-display' in d.tokens) && !('font-text' in d.tokens));
  assert.deepEqual(d.faces, []);
});

test('palette values are colours only: anything else is dropped', () => {
  const d = D.designFrom({ 'p-bg': 'url(https://example.com/x.png)', 'p-ink': '#1f1b18' });
  assert.deepEqual(d.tokens, { 'p-ink': '#1f1b18' });
});

test('no scripts, a failing script or an unknown template: skipped with a reason, never a throw', async () => {
  assert.match((await D.dealDesign({ template: 'bakery', start: null })).skipped, /not installed/);
  assert.match((await D.dealDesign({ template: 'bakery', start: '/x', run: async () => { throw new Error('boom'); } })).skipped, /failed: boom/);
  assert.match((await D.dealDesign({ template: 'nope', start: '/x', run: fakeRun() })).skipped, /no trade/);
});

test('every bundled face has its files and licence in vendor/fonts', () => {
  const fonts = D.bundledFonts();
  const names = Object.keys(fonts).filter(k => k !== 'note');
  assert.ok(names.length >= 20);
  for (const f of names) {
    for (const w of fonts[f].weights) assert.ok(fs.existsSync(path.join(D.FONTS_DIR, fonts[f].dir, `${fonts[f].dir}-latin-${w}-normal.woff2`)), `${f} ${w}`);
    assert.ok(fs.existsSync(path.join(D.FONTS_DIR, fonts[f].dir, 'LICENSE')), `${f} licence`);
  }
});

test('the page wears the deal: its palette and type as tokens, local @font-face, fonts copied, no Google Fonts', async () => {
  const design = await D.dealDesign({ template: 'bakery', start: '/x', run: fakeRun() });
  const tpl = loadTemplate('bakery');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'fill-design-'));
  const r = await fillPage({ run: 'r', outDir: out, idea: 'A bakery', template: 'bakery', design,
    call: async () => ({ words: tpl.defaults.words, steps: tpl.defaults.steps, switches: tpl.defaults.switches, decidedShown: [], tokens: { 'p-accent': '#123456' } }) });
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.match(html, /--p-accent: #b8381f;/, 'the dealt palette, over the model\'s colour guess');
  assert.doesNotMatch(html, /#123456/);
  assert.match(html, /--font-display: "Fraunces", Georgia, serif;/);
  assert.match(html, /@font-face \{ font-family: "Fraunces";[^}]*url\("fonts\/fraunces-latin-400-normal\.woff2"\)/);
  assert.ok(fs.existsSync(path.join(out, 'fonts', 'figtree-latin-500-normal.woff2')));
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/);
  assert.deepEqual(r.slots.fonts, ['Fraunces', 'Figtree']);
  // Without a deal the template keeps its own tokens and type.
  const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'fill-plain-'));
  await fillPage({ run: 'r', outDir: plain, idea: 'A bakery', template: 'bakery',
    call: async () => ({ words: tpl.defaults.words, steps: tpl.defaults.steps, switches: tpl.defaults.switches, decidedShown: [] }) });
  const h2 = fs.readFileSync(path.join(plain, 'index.html'), 'utf8');
  assert.match(h2, new RegExp(`--p-accent: ${tpl.defaults.tokens['p-accent']};`));
  assert.doesNotMatch(h2, /Fraunces/);
});

test('the build logs design.dealt with the dealt ids, and the page gets them', async () => {
  const { buildRun, _setDecideRest, _setDeal } = await import('../routes/build.js');
  const run = newRunId('d');
  initTaste(run);
  logEvent(run, 'run.start', { idea: 'A website for a small bakery, so customers can order bread ahead.', seat: 'product' });
  _setDecideRest(async () => []);
  _setDeal(opts => D.dealDesign({ ...opts, start: '/x', run: fakeRun() }));
  const tpl = loadTemplate('bakery');
  try {
    await buildRun(run, { call: async () => ({ words: tpl.defaults.words, steps: tpl.defaults.steps, switches: tpl.defaults.switches, decidedShown: [] }) });
  } finally { _setDecideRest(null); _setDeal(null); }
  const dealt = readEvents(run).find(e => e.type === 'design.dealt');
  assert.deepEqual([dealt.trade, dealt.palette, dealt.typeId, dealt.typeUsed], ['bakery', 'chalk-tomato', 'fraunces', true]);
  const html = fs.readFileSync(path.join(process.env.RUNS_DIR, run, 'page', 'index.html'), 'utf8');
  assert.match(html, /--p-bg: #f8f5ef;/);
});
