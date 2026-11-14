// Her private profile: the team's understanding of her, never shown. One call after her intro and her idea deduces
// her business, positioning, customers, what sells, brand feel, strengths and ways of working, each with a
// confidence; updated after each of her answers. Stored in runs/<id>/profile.json. Every teammate and the selector
// read it (readProfile + formatProfile). The log only records that it was built or updated, never what it says.
import fs from 'node:fs';
import path from 'node:path';
import { callModel as realCallModel, scrub } from './model.js';
import { logEvent, readEvents, runDir, RUNS_DIR } from './events.js';
import { prompt } from './teammates.js';
import { tagText } from './tag.js';

export const PROFILE_MODEL = process.env.PROFILE_MODEL || 'sonnet';
export const PROFILE_EFFORT = process.env.PROFILE_EFFORT || 'low';
export const FIELDS = ['business', 'positioning', 'customers', 'whatSells', 'brandFeel', 'strengths', 'waysOfWorking'];
const LABEL = { business: 'Business', positioning: 'Positioning', customers: 'Customers', whatSells: 'What sells',
  brandFeel: 'Brand feel', strengths: 'Her strengths', waysOfWorking: 'How she works' };
const item = { type: 'object', properties: { text: { type: 'string' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] } },
  required: ['text', 'confidence'] };
export const PROFILE_SCHEMA = { type: 'object', properties: Object.fromEntries(FIELDS.map(f => [f, item])), required: FIELDS };

const file = run => path.join(runDir(run), 'profile.json');
export function readProfile(run) {
  const f = path.join(RUNS_DIR, run, 'profile.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}
// For prompts: one line per field, with how sure the team is.
export function formatProfile(p) {
  if (!p) return '(nothing yet: assume, and keep moving)';
  const lines = FIELDS.filter(f => p[f]?.text).map(f => `- ${LABEL[f]} (${p[f].confidence}): ${p[f].text}`);
  for (const x of p.philosophy || []) lines.push(`- She believes (her words, ${x.id}): ${x.believe}`);
  return lines.join('\n') || '(nothing yet: assume, and keep moving)';
}
function clean(raw, prev = {}) {
  const out = {};
  for (const f of FIELDS) {
    const v = raw?.[f];
    const text = String(v?.text ?? '').trim().replace(/\s+/g, ' ').slice(0, 400);
    out[f] = text ? { text, confidence: ['high', 'medium', 'low'].includes(v?.confidence) ? v.confidence : 'low' } : (prev[f] || { text: '', confidence: 'low' });
  }
  return out;
}
function about(run) {
  const evs = readEvents(run);
  const start = evs.find(e => e.type === 'run.start') || {};
  const tag = evs.findLast(e => e.type === 'tag')?.tag || start.tag || null;
  const intro = evs.findLast(e => e.type === 'intro')?.text || start.intro || '';
  return { evs, idea: start.idea || '', seat: start.seat || 'product', tag, intro };
}
function save(run, p, kind, ms) {
  fs.writeFileSync(file(run), JSON.stringify(p, null, 2));
  logEvent(run, kind, { ms, version: p.version }); // never its content: the profile is never shown
  return p;
}

// One call from her intro (and tag) and her idea. Returns the profile, or null if the call failed (logged; the team
// simply works without it).
export async function buildProfile(run, { callModel = realCallModel } = {}) {
  const a = about(run);
  const t0 = Date.now();
  try {
    const raw = await callModel({
      system: prompt('profile', { INTRO: a.intro || '(she said nothing about herself yet)', TAG: tagText(a.tag) || '(none yet)',
        SEAT: a.seat === 'diy' ? `her own craft${a.tag?.craft ? ': ' + a.tag.craft : ''}` : a.seat, IDEA: a.idea || '(no idea yet)', EARLIER: '' }),
      user: 'Write her profile.', schema: PROFILE_SCHEMA, model: PROFILE_MODEL, effort: PROFILE_EFFORT,
    });
    return save(run, { ...clean(raw), philosophy: readProfile(run)?.philosophy || [], tag: a.tag, version: 1, from: ['intro', 'idea'] }, 'profile.built', Date.now() - t0);
  } catch (e) {
    logEvent(run, 'profile.error', { error: scrub(e.message).slice(0, 200), ms: Date.now() - t0 });
    return null;
  }
}

// Her philosophy: what she believes, from her kept takeaways. The team's to keep, never shown unless she asks.
export function addPhilosophy(run, entry) {
  const p = readProfile(run) || { version: 0, from: [] };
  p.philosophy = [...(p.philosophy || []).filter(x => x.id !== entry.id), entry];
  fs.writeFileSync(file(run), JSON.stringify(p, null, 2));
  return p;
}

// After each answer: the same call, with what the team believed and what she just said. Fields she spoke to firm up.
export async function updateProfile(run, { question, answer } = {}, { callModel = realCallModel } = {}) {
  const prev = readProfile(run);
  if (!prev) return buildProfile(run, { callModel });
  const a = about(run);
  const t0 = Date.now();
  try {
    const raw = await callModel({
      system: prompt('profile', { INTRO: a.intro || '(nothing)', TAG: tagText(a.tag) || '(none)', SEAT: a.seat, IDEA: a.idea,
        EARLIER: `\nWhat the team believed so far:\n${formatProfile(prev)}\n\nShe was just asked: ${question || '(a question)'}\nShe answered: "${answer}"\nKeep what still holds; change what her answer changes; her own words make an item "high".\n` }),
      user: 'Update her profile.', schema: PROFILE_SCHEMA, model: PROFILE_MODEL, effort: PROFILE_EFFORT,
    });
    return save(run, { ...clean(raw, prev), philosophy: readProfile(run)?.philosophy || prev.philosophy || [], tag: a.tag || prev.tag, version: (prev.version || 1) + 1, from: [...(prev.from || []), 'answer'] },
      'profile.updated', Date.now() - t0);
  } catch (e) {
    logEvent(run, 'profile.error', { error: scrub(e.message).slice(0, 200), ms: Date.now() - t0 });
    return prev;
  }
}
