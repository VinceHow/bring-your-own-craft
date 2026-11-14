// Her spoken answer, tidied (Vincent, 14 Nov): after speech-to-text, one fast call turns her words into a composed
// note in her own voice. It only cleans: no new content. Her raw words are already logged (`answer`); the tidy is its
// own event (`answer.tidy`), so both stay in the log. It never delays the room: it runs alongside the first chime-in,
// and the chime reads her raw words. Slow (over TIDY_LIMIT_MS) or failed: her raw words stay, silently
// (`answer.tidy.skipped`, log only).
//
// tidyAnswer({ run, askId, text })  -> { text, ms } | null        logs answer.tidy or answer.tidy.skipped
// chooseTidy({ run, askId, use })   -> 'mine' | 'tidy'             logs answer.tidy.choice ("Use mine" / back)
// warmTidy(run), installTidyWarmth()                                one warm process per run when a question exists
import { callModel as realCallModel, backend, scrub } from './model.js';
import { logEvent, readEvents, onEvent } from './events.js';
import { prompt } from './teammates.js';
import { Warm } from './thread.js';

export const TIDY_MODEL = process.env.TIDY_MODEL || 'haiku';
export const TIDY_LIMIT_MS = Number(process.env.TIDY_LIMIT_MS || 3000);
const words = s => String(s || '').split(/\s+/).filter(Boolean);
const numbers = s => new Set(String(s || '').match(/\d+([.,:]\d+)?/g) || []);
const FILLER = /\b(um+|uh+|er+|like|you know|i mean|sort of|kind of|basically|actually)\b/i;

// Code checks it only cleaned: not empty, not longer than what she said, no number she didn't say, and most of its
// words are hers. Returns the cleaned text or null.
export function checkTidy(raw, tidy) {
  let t = String(tidy ?? '').replace(/^\s*["“'‘]+|["”'’]+\s*$/g, '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const said = words(raw), out = words(t);
  if (out.length > said.length + 2) return null;
  for (const n of numbers(t)) if (!numbers(raw).has(n)) return null;
  const hers = new Set(said.map(w => w.toLowerCase().replace(/[^a-z0-9']/g, '')));
  const own = out.filter(w => hers.has(w.toLowerCase().replace(/[^a-z0-9']/g, ''))).length;
  if (out.length >= 6 && own / out.length < 0.6) return null; // mostly new words: a rewrite, not a tidy
  return t;
}
// Nothing worth tidying: short, and no filler.
export const alreadyClean = raw => words(raw).length < 8 && !FILLER.test(raw);

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

export async function tidyAnswer({ run, askId, text, callModel = realCallModel, limitMs = TIDY_LIMIT_MS }) {
  const raw = String(text || '').trim();
  const t0 = Date.now();
  const skip = reason => { if (run) logEvent(run, 'answer.tidy.skipped', { pane: 'doc', askId, reason, ms: Date.now() - t0 }); return null; };
  if (!raw) return null;
  if (alreadyClean(raw)) return skip('already clean');
  let out;
  try {
    const w = takeWarm(run);
    const user = `What she said: "${raw}"`;
    out = await withLimit(w ? w.ask(user, limitMs) : callModel({ system: prompt('tidy'), user, model: TIDY_MODEL, effort: 'low',
      timeoutMs: limitMs, schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }).then(o => o?.text), limitMs);
  } catch (e) { return skip(scrub(e.message).slice(0, 120)); }
  const clean = checkTidy(raw, out);
  if (!clean) return skip('not a clean tidy');
  if (clean === raw) return skip('unchanged');
  const ms = Date.now() - t0;
  if (run) logEvent(run, 'answer.tidy', { pane: 'doc', askId, text: clean, ms });
  return { text: clean, ms };
}

// "Use mine": she keeps her own words (or goes back to the tidy). Logged; the room shows what she chose.
export function chooseTidy({ run, askId, use }) {
  const evs = readEvents(run);
  if (!evs.some(e => e.type === 'answer.tidy' && e.askId === askId)) return { code: 404, body: { error: 'no tidy for that answer' } };
  const choice = use === 'tidy' ? 'tidy' : 'mine';
  logEvent(run, 'answer.tidy.choice', { pane: 'doc', askId, use: choice });
  return { code: 200, body: { use: choice } };
}
