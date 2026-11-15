// Meet the team, tailored (IDEA -> YOU -> TEAM, Vincent, Sun 01:21): once her idea is down, ONE short call writes each
// teammate's intro line for it ("Wren: I'll find out who books yoga every week."), fired while she makes her name tag.
// Hard limit MEET_LIMIT_MS; anything slow, failed or off-rule falls back to the static lines (the client keeps them).
import { callModel as realCallModel, logFail } from './model.js';
import { prompt } from './teammates.js';
import { NAMES } from './interpret.js';
import { cleanLine, okLine, endsInQuestion } from './thread.js';

export const MEET_SEATS = ['design', 'research', 'data', 'strategy', 'engineering'];
export const MEET_MODEL = process.env.MEET_MODEL || process.env.TAG_MODEL || 'haiku';
export const MEET_LIMIT_MS = Number(process.env.MEET_LIMIT_MS || 6000);
const str = { type: 'string' };
export const MEET_SCHEMA = { type: 'object', properties: Object.fromEntries(MEET_SEATS.map(s => [s, str])), required: MEET_SEATS };

// A line passes the chimes' rules (cleanLine, never to her, at most 15 words) and is never a question.
export function meetLine(raw) {
  const s = cleanLine(raw);
  if (!s || !okLine(s) || endsInQuestion(s) || /\?/.test(s)) return null;
  return /[.!]$/.test(s) ? s : s + '.';
}

// `wearing`: the home seat that holds Product this run (she took its craft, lib/cast.js rolesFor). Its line is then
// asked as Product, in the teammate's own name. Without it (the Product path) the call is exactly as before.
export function meetSystem(wearing = null) {
  const base = prompt('meet-lines');
  if (!MEET_SEATS.includes(wearing)) return base;
  return `${base}

This run, ${NAMES[wearing]} (the "${wearing}" key) holds Product instead of ${wearing}: what we build, and for whom; the
journey and who it serves first. Write ${NAMES[wearing]}'s line as the Product teammate, never about ${wearing} work.`;
}
export async function meetLines(idea, { callModel = realCallModel, limitMs = MEET_LIMIT_MS, wearing = null } = {}) {
  idea = String(idea || '').trim().slice(0, 400);
  if (!idea) return { code: 400, body: { error: 'idea required' } };
  const t0 = Date.now();
  let t;
  try {
    const raw = await Promise.race([
      callModel({ system: meetSystem(wearing), user: `Her idea: "${idea}"`, schema: MEET_SCHEMA, model: MEET_MODEL, effort: 'low', timeoutMs: limitMs, label: 'meet lines' }),
      new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`over ${limitMs / 1000} s`)), limitMs); }),
    ]);
    const lines = {};
    for (const s of MEET_SEATS) { const l = meetLine(raw?.[s]); if (l) lines[s] = l; }
    return { code: 200, body: { lines, ms: Date.now() - t0 } };
  } catch (e) {
    logFail('meet lines (static lines shown)', e.message);
    return { code: 200, body: { lines: {}, ms: Date.now() - t0, static: true } };
  } finally { clearTimeout(t); }
}
