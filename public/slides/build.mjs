// Builds the close deck's data: every number on the slides, read from the real files, and the QR as inline SVG.
// Writes public/slides/numbers.json (the numbers and where each came from) and public/slides/data.js (what the deck
// loads, so it also opens from file:// and prints to PDF).
//   node public/slides/build.mjs [--run runs/rehearsal]
// The QR needs the npm package qrcode (MIT). It isn't a dependency of the app, so point QR_MODULES at a folder whose
// node_modules has it, e.g. QR_MODULES=/tmp/qr node public/slides/build.mjs. Nothing here calls a network service.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const RUN = arg('--run', 'runs/rehearsal');
const BASE = 'docs/baseline/run-3-bakery';
const URL = 'https://bring-your-own-craft-production.up.railway.app';
const read = p => readFileSync(join(ROOT, p), 'utf8');
const jsonl = p => read(p).split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const fail = m => { console.error('build.mjs: ' + m); process.exit(1); };

// 1. What reached her: the ask events in the recorded run's log (the selector's ranking and threshold decide them).
const events = jsonl(`${RUN}/events.jsonl`);
const asks = events.filter(e => e.type === 'ask').length;
if (!(asks >= 1)) fail(`no asks in ${RUN}`);

// 2. The baseline: a default coding agent on the bakery prompt (run 3).
// Questions: AskUserQuestion calls in its transcript. Cross-checked against the hand count in GUESSES.md.
const guessesMd = read(`${BASE}/GUESSES.md`);
let questions = 0;
for (const e of jsonl(`${BASE}/transcript.jsonl`)) {
  const c = e.message && e.message.content;
  if (Array.isArray(c)) questions += c.filter(b => b && b.type === 'tool_use' && b.name === 'AskUserQuestion').length;
}
const said = k => { const m = guessesMd.match(new RegExp(`\\*\\*${k}: (\\d+)\\*\\*`)); return m ? Number(m[1]) : null; };
if (said('Questions asked') !== questions) fail(`questions: transcript ${questions}, GUESSES.md ${said('Questions asked')}`);
// Guesses: the numbered rows of the table in GUESSES.md, cross-checked against its "N = " line.
const guesses = guessesMd.split('\n').filter(l => /^\|\s*\d+\s*\|/.test(l)).length;
const n = Number((guessesMd.match(/\*\*N = (\d+) guesses/) || [])[1]);
if (guesses !== n) fail(`guesses: ${guesses} table rows, but "N = ${n}"`);
// Approvals: permission dialogs aren't in the transcript; GUESSES.md holds the count from the screen log.
const approvals = said('Approvals');
if (approvals == null) fail('no "Approvals: N" line in GUESSES.md');

const numbers = {
  builtAt: new Date().toISOString(),
  reachedHer: { value: asks, source: `${RUN}/events.jsonl (ask events; asks raised by the selector's threshold)` },
  baseline: {
    asked: { value: questions, source: `${BASE}/transcript.jsonl (AskUserQuestion calls)` },
    guessed: { value: guesses, source: `${BASE}/GUESSES.md (one row per guess)` },
    approvals: { value: approvals, source: `${BASE}/GUESSES.md (permission dialogs, counted from the screen)` },
  },
  url: URL,
};

// 3. The QR, as inline SVG: dark ink on near-white, quiet zone of 4 modules, error correction M.
const req = createRequire(join(process.env.QR_MODULES || ROOT, 'noop.js'));
let QRCode; try { QRCode = req('qrcode'); } catch { fail('qrcode not found: set QR_MODULES to a folder with node_modules/qrcode'); }
const qr = QRCode.create(URL, { errorCorrectionLevel: 'M' });
const size = qr.modules.size, q = 4, dim = size + q * 2;
let d = '';
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (qr.modules.get(x, y)) d += `M${x + q} ${y + q}h1v1h-1z`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-label="QR code: ${URL}"><rect width="${dim}" height="${dim}" fill="#FFFDF8"/><path d="${d}" fill="#1E140D"/></svg>`;

writeFileSync(join(ROOT, 'public/slides/numbers.json'), JSON.stringify(numbers, null, 2) + '\n');
writeFileSync(join(ROOT, 'public/slides/data.js'), `// Written by build.mjs; do not edit by hand.\nwindow.SLIDES_DATA = ${JSON.stringify({ numbers, qr: svg })};\n`);
console.log(`reached her ${asks} · asked ${questions} · guessed ${guesses} · approvals ${approvals} · QR ${size}x${size} for ${URL}`);
