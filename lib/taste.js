// Her file: one principle per line, "- [Ln] text". The seed lives in data/taste.seed.md; each run works on its
// own copy at runs/<id>/taste.md, which only grows from her decisions.
import fs from 'node:fs';
import path from 'node:path';
import { runDir } from './events.js';
import { callModel as realCallModel } from './model.js';
import { prompt } from './teammates.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const SEED = path.join(ROOT, 'data', 'taste.seed.md');
const LINE = /^-\s*\[(L\d+)\]\s*(.+?)\s*$/;

export function parseTaste(md) {
  const lines = [];
  for (const l of String(md || '').split('\n')) {
    const m = l.match(LINE);
    if (m) lines.push({ id: m[1], text: m[2] });
  }
  return lines;
}
export function formatTaste(lines) {
  return lines.length ? lines.map(l => `- [${l.id}] ${l.text}`).join('\n') : '(empty)';
}
// Accepts the markdown, an array of {id,text}, or nothing; always returns an array of {id,text}.
export function asLines(taste) {
  if (Array.isArray(taste)) return taste;
  if (typeof taste === 'string') return parseTaste(taste);
  return [];
}

function tastePath(run) { return path.join(runDir(run), 'taste.md'); }

export function initTaste(run) {
  const f = tastePath(run);
  if (!fs.existsSync(f)) fs.copyFileSync(SEED, f);
  return readTaste(run);
}
export function readTaste(run) {
  const f = tastePath(run);
  const md = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : fs.readFileSync(SEED, 'utf8');
  return parseTaste(md);
}

// Strip the "Sounds like:" lead-in so the file holds only the rule itself.
export function cleanRule(text) {
  return String(text || '').replace(/^\s*sounds like\s*:\s*/i, '').replace(/\s+/g, ' ').trim();
}

export function writeLine(run, text) {
  const rule = cleanRule(text);
  if (!rule) throw new Error('empty line');
  initTaste(run);
  const lines = readTaste(run);
  const n = lines.reduce((m, l) => Math.max(m, Number(l.id.slice(1))), 0) + 1;
  const line = { id: `L${n}`, text: rule };
  const f = tastePath(run);
  const cur = fs.readFileSync(f, 'utf8');
  fs.appendFileSync(f, (cur.endsWith('\n') || !cur ? '' : '\n') + `- [${line.id}] ${line.text}\n`);
  return line;
}

const SOUNDS_SCHEMA = { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] };

// One call: her pin -> a short "Sounds like: ..." principle. context = { idea, taste }.
export async function inferSoundsLike(pin, context = {}, { callModel = realCallModel, model = 'sonnet' } = {}) {
  const pinText = typeof pin === 'string' ? pin : pin?.text;
  const system = prompt('sounds-like', { IDEA: context.idea || '', TASTE: formatTaste(asLines(context.taste)) });
  const out = await callModel({ system, user: `Her pinned comment: "${pinText}"`, schema: SOUNDS_SCHEMA, model });
  let rule = cleanRule(out.text).replace(/\?+$/, '.');
  if (!/[.!]$/.test(rule)) rule += '.';
  return { text: `Sounds like: ${rule}`, ms: out._ms };
}
