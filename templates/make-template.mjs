#!/usr/bin/env node
// Turns a page built (and gate-checked) by taste-skill in ~/taste-template/<name>/ into templates/<name>/:
//   index.html     the page with slots (see lib/fill.js for the markers)
//   defaults.json  the built page's own words, switches, step order and tokens (the fill's fallbacks)
//   files/         the page's own files it loads (fonts, photographs, icon)
// and copies the kit files it loads into vendor/taste-skill/assets/ (the union for every template).
// What the page loads is read from a real browser (every request it makes), so nothing unused is vendored.
//
//   node templates/make-template.mjs yoga|cafe [--src /root/taste-template/<name>]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const name = process.argv[2];
const SRC = (() => { const i = process.argv.indexOf('--src'); return i > 0 ? process.argv[i + 1] : `/root/taste-template/${name}`; })();
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'templates', name, 'words.map.json'), 'utf8'));
const OUT = path.join(ROOT, 'templates', name);
const KIT = path.join(ROOT, 'vendor', 'taste-skill', 'assets');

let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const fail = m => { console.error('make-template: ' + m); process.exit(1); };

// The end of the element that opens at index i (balanced on its own tag name).
function elementEnd(s, i) {
  const tag = s.slice(i).match(/^<([a-z0-9-]+)/i)[1];
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'gi');
  re.lastIndex = i; let depth = 0, m;
  while ((m = re.exec(s))) {
    if (m[0][1] === '/') { if (--depth === 0) return m.index + m[0].length; } else depth++;
  }
  fail(`unclosed <${tag}> at ${i}`);
}
function wrapElement(attr, open, close) {
  const re = new RegExp(`<[a-z0-9-]+\\b[^>]*${attr}[^>]*>`, 'i');
  const m = html.match(re);
  if (!m) fail(`no element with ${attr}`);
  const end = elementEnd(html, m.index);
  html = html.slice(0, m.index) + open + html.slice(m.index, end) + close + html.slice(end);
}

// 1. Words: each key replaces one exact piece of the built page's text (it must occur; every occurrence is swapped).
const words = {};
for (const [key, text] of Object.entries(MAP.words)) {
  const enc = text.replace(/&/g, '&amp;').replace(/'/g, '&#39;');
  const variants = [text, enc, text.replace(/'/g, '&rsquo;'), text.replace(/'/g, '’')];
  const hit = variants.find(v => html.includes(v));
  if (!hit) fail(`word ${key}: text not found: ${text}`);
  html = html.split(hit).join(`{{words.${key}}}`);
  words[key] = text.replace(/&#39;|&rsquo;/g, '’');
}

// 2. Switches: the element carrying data-switch="<attr>" is kept only when its switch is on.
for (const [attr, key] of Object.entries(MAP.switchAttrs)) {
  wrapElement(`data-switch="${attr}"`, `<!--if:${key}-->`, `<!--/if:${key}-->`);
}

// 3. Steps: each movable section in a step block, so the fill can re-order them.
for (const s of MAP.steps) {
  const re = new RegExp(`<section\\b[^>]*data-step="${s}"[^>]*>`);
  const m = html.match(re);
  if (!m) fail(`no section data-step="${s}"`);
  // the step marker goes outside any switch block wrapping the same section
  let start = m.index; const before = html.slice(0, start);
  const sw = before.match(/<!--if:([\w-]+)-->\s*$/);
  if (sw) start -= sw[0].length;
  let end = elementEnd(html, m.index);
  const after = html.slice(end).match(/^\s*<!--\/if:[\w-]+-->/);
  if (sw && after) end += after[0].length;
  html = html.slice(0, start) + `<!--step:${s}-->` + html.slice(start, end) + `<!--/step:${s}-->` + html.slice(end);
}

// 4. "Decided for you": its list becomes our rows; the hidden run id goes into the form; colour overrides after :root.
const dm = html.match(/<section\b[^>]*data-step="decided"[^>]*>/);
const dEnd = elementEnd(html, dm.index);
let dec = html.slice(dm.index, dEnd);
const ul = dec.match(/<ul class="rows[^"]*">/);
if (!ul) fail('no rows list in decided');
const ulEnd = elementEnd(dec, ul.index);
dec = dec.slice(0, ul.index) + ul[0].replace('class="rows', 'class="rows decided') + '{{{raw.decidedRows}}}\n      </ul>' + dec.slice(ulEnd);
html = html.slice(0, dm.index) + dec + html.slice(dEnd);
if (!/<input type="hidden" name="page"[^>]*>/.test(html)) fail('no hidden page input');
html = html.replace(/(<input type="hidden" name="page"[^>]*>)/, '$1\n            <input type="hidden" name="run" value="{{{raw.run}}}">');
const rootStyle = html.match(/<style>\s*:root \{[\s\S]*?<\/style>/);
if (!rootStyle) fail('no :root block');
html = html.replace(rootStyle[0], rootStyle[0] + '\n<style>:root { {{{raw.tokens}}} }</style>' +
  // our one addition to the page's look: a small ink tag naming the seat that decided each "decided for you" row
  '\n<style>.decided__seat { display: inline-block; font-size: 13px; line-height: 20px; font-weight: 500; padding: 0 6px; margin-right: 6px;' +
  ' border: 1px solid currentColor; border-radius: 2px; color: var(--ink, inherit); vertical-align: 1px; }</style>');
// the built page links its own share image and privacy page; keep links that resolve
const tokens = {};
for (const k of ['p-bg', 'p-surface', 'p-ink', 'p-accent', 'p-action']) {
  const m = rootStyle[0].match(new RegExp(`--${k}:\\s*(#[0-9a-fA-F]{6})`));
  if (m) tokens[k] = m[1];
}
html = html.replace(/<body>/, '<body>\n<!-- Template made from a page built with taste-skill (MIT) through its finish gate; filled by lib/fill.js. -->');

// 5. What the page loads, from a real browser over HTTP.
async function loaded() {
  const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
  const srv = http.createServer((req, res) => {
    const f = path.join(SRC, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!f.startsWith(SRC) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': f.endsWith('.js') || f.endsWith('.mjs') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(0);
  const port = srv.address().port;
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const seen = new Set();
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp });
    page.on('request', r => { const u = new URL(r.url()); if (u.port == port) seen.add(decodeURIComponent(u.pathname).slice(1)); });
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
    for (let y = 0; y < 12000; y += 600) { await page.mouse.wheel(0, 600); await page.waitForTimeout(60); }
    await page.waitForTimeout(500);
    await page.close();
  }
  await browser.close(); srv.close();
  return [...seen].filter(p => p && p !== 'index.html');
}
const files = await loaded();
fs.rmSync(path.join(OUT, 'files'), { recursive: true, force: true });
let kitN = 0, ownN = 0;
for (const p of files) {
  const src = path.join(SRC, p);
  if (!fs.existsSync(src)) continue;
  const dst = p.startsWith('assets/') ? path.join(KIT, p.slice(7)) : path.join(OUT, 'files', p);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  p.startsWith('assets/') ? kitN++ : ownN++;
}
// the page's other own files a visitor can reach (favicon, privacy, credits)
for (const f of ['favicon.svg', 'privacy.html', 'credits.html', 'share.jpg']) {
  if (fs.existsSync(path.join(SRC, f))) { fs.mkdirSync(path.join(OUT, 'files'), { recursive: true }); fs.copyFileSync(path.join(SRC, f), path.join(OUT, 'files', f)); }
}

fs.writeFileSync(path.join(OUT, 'index.html'), html);
// The schema's words, switches and steps follow this template's map (the rest of the schema is hand-written).
const schemaFile = path.join(OUT, 'slots.schema.json');
const schema = JSON.parse(fs.readFileSync(fs.existsSync(schemaFile) ? schemaFile : path.join(ROOT, 'templates', 'yoga', 'slots.schema.json'), 'utf8'));
const W = schema.properties.words;
W.required = Object.keys(words);
W.properties = Object.fromEntries(Object.keys(words).map(k => [k, { type: 'string', ...(W.properties?.[k]?.description ? { description: W.properties[k].description } : {}) }]));
schema.properties.steps.items.enum = MAP.steps;
schema.properties.steps.description = `Order of the movable sections, following her flow. Allowed: ${MAP.steps.join(', ')}.`;
fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'defaults.json'), JSON.stringify({ words, switches: MAP.switches, steps: MAP.steps, tokens }, null, 2) + '\n');
const left = html.match(/data-switch="[^"]+"/g)?.length || 0;
console.log(`templates/${name}: ${Object.keys(words).length} words, ${Object.keys(MAP.switchAttrs).length} switches, ${MAP.steps.length} steps; ${kitN} kit files, ${ownN} own files; data-switch attrs ${left}`);
