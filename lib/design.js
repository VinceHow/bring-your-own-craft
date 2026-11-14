// Design picks the page's palette and type live, through taste-skill (MIT): `start.mjs deal --page place --trade <t>`
// then `start.mjs css --palette <id> --type <id>`, the first of each, as the skill says. Always in a fresh temp
// folder outside the repo: a deal writes .taste-skill/build.json, which arms the skill's finish-gate Stop hook.
// Fonts stay local: the dealt type is used only when every face it names is bundled in vendor/fonts (from
// @fontsource); otherwise the page keeps the template's own type and only the palette changes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const FONTS_DIR = path.join(ROOT, 'vendor', 'fonts');
const CANDIDATES = [
  process.env.TASTE_START,
  path.join(ROOT, '.claude', 'skills', 'design-taste-frontend', 'scripts', 'start.mjs'),
  '/tmp/vend/taste-skill/skills/taste-skill/scripts/start.mjs',
].filter(Boolean);
export const findStart = () => CANDIDATES.find(p => fs.existsSync(p)) || null;

// The trade taste-skill deals for: the bakery for a bakery, wellness for the yoga studio, a cafe for the café.
export const TRADES = { bakery: 'bakery', yoga: 'wellness', cafe: 'cafe' };

// Runs one start.mjs command in `cwd`; resolves its stdout.
function runNode(start, args, cwd, timeoutMs = 15000) {
  return new Promise((resolve, reject) => execFile(process.execPath, [start, ...args], { cwd, timeout: timeoutMs, maxBuffer: 1 << 20 },
    (err, stdout, stderr) => (err ? reject(new Error(String(stderr || err.message).slice(0, 300))) : resolve(String(stdout)))));
}

// The first palette and the first type pairing the deal offers.
export function parseDeal(out) {
  const first = header => {
    const i = out.search(new RegExp(`^${header}\\b`, 'm'));
    if (i < 0) return null;
    const m = out.slice(i).match(/\n {2}([a-z0-9][a-z0-9-]*) {2,}/);
    return m ? m[1] : null;
  };
  return { palette: first('PALETTES'), type: first('TYPE') };
}

// The :root block's custom properties, as { name: value } (names without the leading --).
export function parseRoot(out) {
  const block = (out.match(/:root\s*\{([\s\S]*?)\}/) || [])[1] || '';
  const vars = {};
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) vars[m[1]] = m[2].trim();
  return vars;
}

const family = v => (String(v || '').match(/^\s*["']([^"']+)["']/) || [])[1] || null;
export function bundledFonts() {
  try { return JSON.parse(fs.readFileSync(path.join(FONTS_DIR, 'fonts.json'), 'utf8')); } catch { return {}; }
}
// Only what a :root value may safely hold (no closing the block, no markup).
const safe = v => !/[{};<>]/.test(v) && v.length < 200;

// Tokens for the page: the palette always; the type only when its faces are bundled (else typeFallback).
export function designFrom(vars, fonts = bundledFonts()) {
  const tokens = {}, fontVars = {};
  for (const [k, v] of Object.entries(vars)) {
    if (!safe(v)) continue;
    if (k.startsWith('p-')) tokens[k] = v;
    else if (/^(font-display|font-text|display-weight|display-tracking|display-tracking-xl|display-axes|display-stretch)$/.test(k)) fontVars[k] = v;
  }
  const faces = [...new Set([family(vars['font-display']), family(vars['font-text'])].filter(Boolean))];
  const typeLocal = faces.length > 0 && faces.every(f => fonts[f]);
  if (typeLocal) Object.assign(tokens, fontVars);
  return { tokens, faces: typeLocal ? faces : [], typeFallback: !typeLocal, wanted: faces };
}

// @font-face rules for the bundled faces, served from the page's own fonts/ folder.
export function fontFaceCss(faces, fonts = bundledFonts()) {
  return faces.flatMap(f => (fonts[f].weights || [400]).map(w => `@font-face { font-family: "${f}"; font-style: normal; font-weight: ${w}; font-display: swap; src: url("fonts/${fonts[f].dir}-latin-${w}-normal.woff2") format("woff2"); }`)).join('\n');
}
export function copyFonts(faces, outDir, fonts = bundledFonts()) {
  const dst = path.join(outDir, 'fonts');
  fs.mkdirSync(dst, { recursive: true });
  for (const f of faces) for (const file of fs.readdirSync(path.join(FONTS_DIR, fonts[f].dir))) if (file.endsWith('.woff2')) fs.copyFileSync(path.join(FONTS_DIR, fonts[f].dir, file), path.join(dst, file));
}

// dealDesign({ template }) -> { trade, palette, type, tokens, faces, typeFallback, ms } or { skipped: reason }.
// `run` is the command runner (tests pass a fake).
export async function dealDesign({ template, start = findStart(), run = runNode } = {}) {
  const trade = TRADES[template];
  if (!trade) return { skipped: `no trade for the ${template} template` };
  if (!start) return { skipped: 'taste-skill scripts not installed' };
  const t0 = Date.now();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-deal-')); // outside the repo, always
  try {
    const deal = parseDeal(await run(start, ['deal', '--page', 'place', '--trade', trade, '--no-recent'], dir));
    if (!deal.palette || !deal.type) return { skipped: 'the deal printed no palette or type' };
    const vars = parseRoot(await run(start, ['css', '--page', 'place', '--palette', deal.palette, '--type', deal.type, '--radius', 'sharp', '--no-recent'], dir));
    if (!Object.keys(vars).length) return { skipped: 'the css step printed no :root block' };
    return { trade, palette: deal.palette, type: deal.type, ...designFrom(vars), ms: Date.now() - t0 };
  } catch (e) {
    return { skipped: 'taste-skill failed: ' + String(e.message).slice(0, 160) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
