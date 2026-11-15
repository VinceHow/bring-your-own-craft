// Her answer, captured in pieces and tidied as each lands (Vincent, 14 Nov). While she captures, before Send, the team
// is out of view and does nothing. Each piece (one push-to-talk, or one she adds by hand) is logged raw
// (`answer.piece`) and tidied in the background by one fast call into a composed note in her own voice
// (`answer.piece.tidy`). The tidy only cleans: code checks it adds nothing. A removed or redone piece ignores its
// pending tidy. Send gathers the pieces (gatherPieces): the tidy where it's ready and she hasn't chosen her own words,
// her raw words where it isn't, so Send never waits. Only the gathered comment (`answer`) counts for chimes and
// takeaways. Slow (over TIDY_LIMIT_MS) or failed: her raw words stay, silently (`answer.piece.tidy.skipped`, log only).
//
// addPiece({ run, askId, pieceId, text })   logs answer.piece, tidies in the background (returns .tidy, a promise)
// removePiece({ run, askId, pieceId })      logs answer.piece.removed
// choosePiece({ run, askId, pieceId, use }) logs answer.piece.choice ('mine' = "Use mine", 'tidy' = back)
// gatherPieces(evs, askId, pieceIds)        -> { text, pieces: [{ pieceId, used: 'tidy' | 'raw' }] }
import { callModel as realCallModel, backend, scrub } from './model.js';
import { logEvent, readEvents, onEvent } from './events.js';
import { prompt } from './teammates.js';
import { Warm } from './thread.js';

export const TIDY_MODEL = process.env.TIDY_MODEL || 'haiku';
export const TIDY_LIMIT_MS = Number(process.env.TIDY_LIMIT_MS || 6000); // falls back to her own words, so it never blocks
const words = s => String(s || '').split(/\s+/).filter(Boolean);
const numbers = s => new Set(String(s || '').match(/\d+([.,:]\d+)?/g) || []);
const FILLER = /\b(um+|uh+|er+|like|you know|i mean|sort of|kind of|basically|actually)\b/i;

// Her words are cleaned, never reworded (Vincent, 15 Nov): a tidy may only DELETE words (fillers, false starts,
// repeats, lead-ins) and fix capitals, punctuation and spacing. Code checks it: the tidy's words, lower-cased with
// punctuation stripped, must be a subsequence of hers, in order. Any word swapped or added: refused, her raw words stand.
const normWords = t => String(t || '').toLowerCase().replace(/[’‘]/g, "'").split(/\s+/)
  .map(w => w.replace(/[^\p{L}\p{N}']+/gu, '').replace(/^'+|'+$/g, '')).filter(Boolean);
export function deletionOnly(raw, tidy) {
  const said = normWords(raw), out = normWords(tidy);
  let i = 0;
  for (const w of out) { while (i < said.length && said[i] !== w) i++; if (i >= said.length) return false; i++; }
  return true;
}
export function checkTidy(raw, tidy) {
  const t = String(tidy ?? '').replace(/^\s*["“'‘]+|["”'’]+\s*$/g, '').replace(/\s+/g, ' ').trim();
  if (!t || !normWords(t).length) return null;
  return deletionOnly(raw, t) ? t : null;
}
export const refusedTidy = () => { if (process.env.MODEL_QUIET !== '1') console.error('[model] tidy changed words, kept raw'); }; // never her words
// Nothing worth tidying: short, and no filler.
// A lead-in she'd cut when writing it down ("The idea is:", "I think", "I want to", "So,").
const LEAD_IN = /^\s*(so,?\s+|okay,?\s+|well,?\s+)?(the idea is|my idea is|i think|i want to|i'd like to|i would like to|basically|so)\b/i;
export const alreadyClean = raw => words(raw).length < 8 && !FILLER.test(raw) && !LEAD_IN.test(raw);

// ---- one warm process per run, its system prompt set at start; her words are written in when she sends -------------
const pool = new Map(); // run -> Warm
export const tidyWarmOn = () => backend() === 'claude-code' && process.env.THREAD_WARM !== '0';
export function warmTidy(run) {
  if (!tidyWarmOn() || !run) return false;
  const w = pool.get(run);
  if (w && !w.dead && !w.used) return true;
  pool.set(run, new Warm(prompt('tidy'), TIDY_MODEL));
  return true;
}
function takeWarm(run) {
  const w = pool.get(run);
  if (!w || w.dead || w.used) return null;
  pool.delete(run);
  setImmediate(() => warmTidy(run)); // ready for her next answer
  return w;
}
export function coolTidy(run) { const w = pool.get(run); if (w) w.kill(); pool.delete(run); }
let off = null;
export function installTidyWarmth() {
  if (off) return off;
  off = onEvent(ev => {
    if (!ev.run) return;
    if (ev.type === 'ask' || ev.type === 'checkin.open') warmTidy(ev.run);
    if (ev.type === 'build.done') coolTidy(ev.run);
  });
  return off;
}

function withLimit(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`over ${ms / 1000} s`)), ms); })])
    .finally(() => clearTimeout(t));
}

// The piece as it stands now: its latest words, or null if she removed it (and didn't add it back).
export function currentPiece(evs, askId, pieceId) {
  let cur = null;
  for (const e of evs) {
    if (e.askId !== askId || e.pieceId !== pieceId) continue;
    if (e.type === 'answer.piece') cur = { text: e.text };
    else if (e.type === 'answer.piece.removed') cur = null;
  }
  return cur;
}
const okId = id => typeof id === 'string' && /^[\w-]{1,40}$/.test(id);
function askOpen(run, askId) {
  const evs = readEvents(run);
  if (!evs.some(e => e.type === 'ask' && e.id === askId)) return { code: 404, body: { error: 'no such ask' } };
  if (evs.some(e => e.type === 'answer' && e.askId === askId)) return { code: 409, body: { error: 'already sent' } };
  return null;
}

// One tidy of any spoken text, shared (pieces here; her name-tag sentence via POST /api/tidy). Never throws:
// on a failure, a timeout or an unclean tidy it gives her raw words back, with the reason.
const wordsOf = t => String(t || '').toLowerCase().replace(/[’']/g, "'").split(/\s+/).map(w => w.replace(/[^\p{L}\p{N}']+/gu, '')).filter(Boolean);
export const sameWords = (a, b) => wordsOf(a).join(' ') === wordsOf(b).join(' ');

export async function tidyText({ text, run = null, field = null, callModel = realCallModel, limitMs = TIDY_LIMIT_MS }) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  const t0 = Date.now();
  const kept = reason => ({ text: raw, tidied: false, reason, ms: Date.now() - t0 });
  if (!raw) return kept('empty');
  if (alreadyClean(raw)) return kept('already clean');
  let out;
  try {
    const w = run ? takeWarm(run) : null;
    const user = `What she said: "${raw}"`;
    out = await withLimit(w ? w.ask(user, limitMs) : callModel({ system: prompt('tidy'), user, model: TIDY_MODEL, effort: 'low',
      timeoutMs: limitMs, schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }).then(o => o?.text), limitMs);
  } catch (e) { return kept(scrub(e.message).slice(0, 120)); }
  let clean = checkTidy(raw, out);
  if (!clean) { if (String(out ?? '').trim()) refusedTidy(); return kept('changed words'); }
  // Only case or punctuation changed: nothing worth swapping (and her card's "I love …" fragment stays hers).
  if (sameWords(raw, clean)) return kept('unchanged');
  // A fragment she began in lower case ("getting the journey right…") keeps its lower-case start.
  if (/^[a-z]/.test(raw) && clean[0] && clean[0] !== clean[0].toLowerCase() && clean.split(/\s/)[0].toLowerCase() === raw.split(/\s/)[0].toLowerCase())
    clean = clean[0].toLowerCase() + clean.slice(1);
  return { text: clean, tidied: true, ms: Date.now() - t0 };
}

export async function tidyPiece({ run, askId, pieceId, text, callModel = realCallModel, limitMs = TIDY_LIMIT_MS }) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const r = await tidyText({ text: raw, run, callModel, limitMs });
  const skip = reason => { if (run) logEvent(run, 'answer.piece.tidy.skipped', { pane: 'doc', askId, pieceId, reason, ms: r.ms }); return null; };
  if (!r.tidied) return skip(r.reason);
  // Removed or redone while the tidy ran: its tidy no longer applies.
  if (run && currentPiece(readEvents(run), askId, pieceId)?.text !== raw) return skip('piece changed');
  if (run) logEvent(run, 'answer.piece.tidy', { pane: 'doc', askId, pieceId, raw, text: r.text, ms: r.ms });
  return { text: r.text, ms: r.ms };
}

export function addPiece({ run, askId, pieceId, text, callModel = realCallModel, limitMs = TIDY_LIMIT_MS }) {
  const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!t || !okId(pieceId)) return { code: 400, body: { error: 'pieceId and text required' } };
  const closed = askOpen(run, askId);
  if (closed) return closed;
  logEvent(run, 'answer.piece', { pane: 'doc', askId, pieceId, text: t });
  const tidy = tidyPiece({ run, askId, pieceId, text: t, callModel, limitMs }).catch(() => null);
  return Object.defineProperty({ code: 202, body: { pieceId } }, 'tidy', { value: tidy, enumerable: false });
}
export function removePiece({ run, askId, pieceId }) {
  if (!okId(pieceId)) return { code: 400, body: { error: 'pieceId required' } };
  const closed = askOpen(run, askId);
  if (closed) return closed;
  logEvent(run, 'answer.piece.removed', { pane: 'doc', askId, pieceId });
  return { code: 200, body: { pieceId, removed: true } };
}
// "Use mine": she keeps her own words for that piece (or goes back to the tidy).
export function choosePiece({ run, askId, pieceId, use }) {
  const evs = readEvents(run);
  if (!evs.some(e => e.type === 'answer.piece.tidy' && e.askId === askId && e.pieceId === pieceId)) return { code: 404, body: { error: 'no tidy for that piece' } };
  const choice = use === 'tidy' ? 'tidy' : 'mine';
  logEvent(run, 'answer.piece.choice', { pane: 'doc', askId, pieceId, use: choice });
  return { code: 200, body: { pieceId, use: choice } };
}

// Send: her pieces in her order, each its tidy if ready (and not "Use mine"), else her raw words. Reads only the log.
export function gatherPieces(evs, askId, pieceIds = []) {
  const pieces = [], parts = [];
  for (const pieceId of [...new Set(pieceIds.map(String))]) {
    const cur = currentPiece(evs, askId, pieceId);
    if (!cur) continue;
    const tidy = evs.findLast(e => e.type === 'answer.piece.tidy' && e.askId === askId && e.pieceId === pieceId && e.raw === cur.text);
    const mine = evs.findLast(e => e.type === 'answer.piece.choice' && e.askId === askId && e.pieceId === pieceId)?.use === 'mine';
    const used = tidy && !mine ? 'tidy' : 'raw';
    parts.push(used === 'tidy' ? tidy.text : cur.text);
    pieces.push({ pieceId, used });
  }
  return { text: parts.join(' ').replace(/\s+/g, ' ').trim(), pieces };
}
