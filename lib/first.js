// The stage path's Act 2 (DEMO, Vincent 14 Nov evening: two focus moments around the unblock). Exactly three things
// reach her, each through the ask policy (lib/policy.js; select.js askOne mints a one-ask grant), in this order:
//   1. Focus 1 (0:38): "Who should we build this for first?" with Noor's finding (researched before the demo, quoted
//      with its source; else a plain prompt from Design's first sketch, never a claim). Her answer is a real focus
//      moment (builder 7's engine: pieces, the thread, pins, takeaways, via POST /answer); alongside it, Design's
//      reshape redraws the journey and one fast call turns her answer into a run of decisions, each a `decided`
//      event with its owner seat, citing her answer (first.done after).
//   2. The quick unblock (builder 1's card, lib/unblock.js), raised once those decisions have settled.
//   3. Focus 2 (1:08): "What should this feel like for a regular?" with Mika's rough morning journey in words (4-6 short
//      steps from one fast call off the current flow; no screens). Her answer: the thread and takeaways as usual, and
//      Mika rewrites the steps (journey.words.rewritten).
// A fourth is refused. Off the stage path (run.start.stagePath unset) none of this runs; the selector brings up to three.
//   firstAsk({ run })                       -> Focus 1, logged (or refused)
//   followFirst({ run, askId, text })       -> reshape + decisions + first.done (+ the unblock, on the stage path)
//   feelAsk({ run }) / rewriteFeel(...)     -> Focus 2 and Mika's rewrite
//   installStagePath()                      -> runs followFirst / feelAsk / rewriteFeel off the run's own events
import fs from 'node:fs';
import path from 'node:path';
import { callModel as realCallModel, scrub } from './model.js';
import { logEvent, readEvents, onEvent } from './events.js';
import { askOne } from './select.js';
import { MAX_ASKS, askCount } from './policy.js';
import { currentLines, currentUsers, reshape } from './sketch.js';
import { NAMES } from './interpret.js';
import { raiseUnblock } from './unblock.js';

export const FIRST_MODEL = process.env.FIRST_MODEL || 'haiku';
export const FIRST_EFFORT = process.env.FIRST_EFFORT || 'low';
export const FIRST_MAX = 6;
export const FIRST_ID = 'first';
export const FEEL_ID = 'feel';
export const STAGE_UNBLOCK_CARD = { seat: 'engineering', question: 'When do orders close?', suggestion: '8pm the night before', kind: 'call',
  doing: 'Setting up ordering', topic: 'Orders close' };
export const UNBLOCK_DELAY_MS = Number(process.env.UNBLOCK_DELAY_MS ?? 3500);
const TEAM = ['design', 'data', 'research', 'strategy', 'engineering'];
const clip = (s, n) => String(s ?? '').trim().replace(/\s+/g, ' ').replace(/[?]+$/, '').slice(0, n);
const DATA = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'data');

export const FIRST_SCHEMA = {
  type: 'object',
  properties: { decisions: { type: 'array', items: { type: 'object',
    properties: { seat: { type: 'string' }, decision: { type: 'string' }, choice: { type: 'string' } }, required: ['seat', 'decision', 'choice'] } } },
  required: ['decisions'],
};
export const STEPS_SCHEMA = {
  type: 'object',
  properties: { steps: { type: 'array', items: { type: 'object', properties: { time: { type: 'string' }, text: { type: 'string' } }, required: ['text'] } } },
  required: ['steps'],
};

const isStage = evs => !!evs.find(e => e.type === 'run.start')?.stagePath;
// The selector's share of her three: on the stage path none (Focus 1, the unblock and Focus 2 are the three);
// off it, whatever is left of the cap.
export function selectorMax(run, evs = readEvents(run)) {
  return isStage(evs) ? 0 : Math.max(0, MAX_ASKS - askCount(run));
}

// Noor's finding for Focus 1, only when it was verified (a quoted line, its URL, the date fetched). Else null.
export function regularsFinding(dir = DATA) {
  try {
    const f = JSON.parse(fs.readFileSync(path.join(dir, 'research-finding-bakery.json'), 'utf8')).regulars;
    return f && f.quote && f.url && f.fetched ? { title: f.title, claim: f.claim, quote: f.quote, url: f.url, site: f.site || '',
      source: f.source || '', fetched: f.fetched, label: f.label || 'researched before the demo', about: f.not_claimed || '' } : null;
  } catch { return null; }
}
const BAKERY = /\b(bakery|bakeries|bakers?|breads?|loaf|loaves|sourdough|pastry|pastries)\b/i;

// Focus 1. With a bakery idea and a verified finding, Noor asks with it in front of her; otherwise Mika asks from the
// first sketch's users, with no research claim. No model call.
export function firstAsk({ run, finding = regularsFinding() }) {
  const evs = readEvents(run);
  if (evs.some(e => e.type === 'ask' && e.first)) return { code: 409, body: { error: 'already asked' } };
  if (!evs.some(e => e.type === 'sketch.done' && !e.reshape && !e.skipped)) return { code: 409, body: { error: 'no sketch yet' } };
  const users = currentUsers(evs);
  const idea = evs.find(e => e.type === 'run.start')?.idea || '';
  const f = finding && BAKERY.test(idea) ? finding : null;
  const candidate = { id: FIRST_ID, first: true, decision: 'Who we build this for first', question: 'Who should we build this for first?',
    users, decisionIds: [],
    ...(f ? { seat: 'research', by: NAMES.research, artifact: { kind: 'finding', ref: { ...f, users } } }
      : { seat: 'design', by: NAMES.design, artifact: { kind: 'journey', ref: 'sketch' } }) };
  const a = askOne(run, candidate, { source: 'first-decision', decided: { id: FIRST_ID, seat: candidate.seat,
    decision: candidate.decision, choice: users[0] || null, cites: 'team default' } });
  return a ? { code: 200, body: a } : { code: 409, body: { error: 'refused by the ask policy' } };
}

// A line that adds a form field or asks for contact details (phone, email, address) she didn't mention is dropped:
// "never ask for anything you could remember or skip" is the demo's whole point. A cheap check, no model call.
const CONTACT = /\b(phone|mobile|telephone|tel\b|text me|sms|e-?mail|address|postcode|post code|zip)\b/i;
const ADDS_FIELD = /\b(field|form|ask(s|ing)? for|enter|collect|require[sd]?|with (their |your )?(name|phone|email))\b/i;
const NEGATED = /\b(no|never|without|skip|drop|cut|remove[sd]?|not)\s+(a |an |the |any |their |your |extra |more )?(phone|mobile|telephone|e-?mail|address|postcode|[\w-]+ field|fields?)\b/i;
export function addsContact(d, said = '') {
  const t = `${d.decision} ${d.choice}`;
  if (!CONTACT.test(t) && !(ADDS_FIELD.test(d.choice) && /\bfield\b/i.test(d.choice))) return false;
  if (NEGATED.test(d.choice)) return false; // "No phone field" removes one; that's the point
  const word = (t.match(CONTACT) || [])[1];
  return !(word && new RegExp(`\\b${word}\\b`, 'i').test(said)); // she asked for it herself: keep it
}
// Code, not the model, owns: teammates' seats only, short plain lines, at most FIRST_MAX, no questions, no repeats,
// no new form fields or contact details she didn't mention.
export function cleanFirst(raw, said = '') {
  const out = [], seen = new Set();
  for (const d of raw?.decisions || []) {
    const seat = String(d?.seat || '').toLowerCase().trim();
    const decision = clip(d?.decision, 80), choice = clip(d?.choice, 90);
    if (!TEAM.includes(seat) || !decision || !choice || /\?/.test(d?.choice || '')) continue;
    if (addsContact({ decision, choice }, said)) continue;
    const k = choice.toLowerCase(); if (seen.has(k)) continue; seen.add(k);
    out.push({ seat, decision, choice });
    if (out.length === FIRST_MAX) break;
  }
  return out;
}

// Her Focus 1 answer, alongside the meeting: the journey redraws and a run of decisions settles. Once per run.
export async function followFirst({ run, askId = FIRST_ID, text, callModel = realCallModel, redraw = true, unblockDelayMs = UNBLOCK_DELAY_MS }) {
  text = String(text || '').trim().slice(0, 1200);
  const evs = readEvents(run);
  const ask = evs.find(e => e.type === 'ask' && e.id === askId && e.first);
  if (!ask) return { code: 404, body: { error: 'no such ask' } };
  if (!text) return { code: 400, body: { error: 'text required' } };
  if (evs.some(e => e.type === 'first.started' && e.askId === askId)) return { code: 409, body: { error: 'already followed' } };
  logEvent(run, 'first.started', { pane: 'flow', askId });
  const idea = evs.find(e => e.type === 'run.start')?.idea || '';
  const t0 = Date.now();
  const redrawing = redraw && currentLines(evs).length ? reshape({ run, text, callModel, asAnswer: askId }).catch(() => null) : null;
  const system = [
    'You are a small product team (Design, Data, Research, Strategy, Engineering) building the first version of an idea.',
    'She has just told you who to build it for first. Turn her answer and the idea into the short run of decisions that her answer settles at once:',
    'concrete product calls for the first version, each owned by one teammate (seat: design, data, research, strategy or engineering).',
    `At most ${FIRST_MAX}, at least 3. decision: what is being decided, in a few plain words. choice: the call, at most six words, concrete`,
    '(e.g. "Their usual loaf one tap away", "Held until 10am", "No login", "No phone field"). Follow her words; invent no facts or numbers she did not imply',
    'beyond sensible defaults. Never add a form field or ask for contact details she didn\'t mention; prefer fewer fields.',
    'Never a question. British spelling.',
  ].join(' ');
  const user = JSON.stringify({ idea, whoToBuildForFirst: text, users: ask.users || [] });
  let decisions = [], error = null;
  try { decisions = cleanFirst(await callModel({ system, user, schema: FIRST_SCHEMA, model: FIRST_MODEL, effort: FIRST_EFFORT }), `${idea} ${text}`); }
  catch (e) { error = scrub(e.message).slice(0, 200); }
  const logged = decisions.map((d, i) => logEvent(run, 'decided', { id: `${askId}-d${i + 1}`, seat: d.seat, by: NAMES[d.seat],
    decision: d.decision, choice: d.choice, cites: 'her answer', follows: askId, round: 'first' }));
  const reshaped = redrawing ? !!(await redrawing) : false;
  logEvent(run, 'first.done', { pane: 'flow', askId, decided: logged.length, reshaped, ms: Date.now() - t0, ...(error ? { error } : {}) });
  // On the stage path, Bo's quick unblock follows once the decisions have settled in the room (never twice).
  if (isStage(evs)) {
    const raise = () => { if (!readEvents(run).some(e => e.type === 'ask.unblock')) { try { raiseUnblock(run, STAGE_UNBLOCK_CARD); } catch (e) { console.error('unblock:', scrub(e.message)); } } };
    if (unblockDelayMs > 0) setTimeout(raise, unblockDelayMs); else raise();
  }
  return { code: error && !logged.length ? 502 : 200, body: { decisions: logged, reshaped, ...(error ? { error } : {}) } };
}
// The old door (POST /api/run/:id/first { askId, text }): logs her answer, then follows it. The room uses /answer.
export async function firstAnswer({ run, askId = FIRST_ID, text, ...opts }) {
  text = String(text || '').trim().slice(0, 1200);
  if (!text) return { code: 400, body: { error: 'text required' } };
  const evs = readEvents(run);
  if (!evs.some(e => e.type === 'ask' && e.id === askId && e.first)) return { code: 404, body: { error: 'no such ask' } };
  if (evs.some(e => e.type === 'answer' && e.askId === askId)) return { code: 409, body: { error: 'already answered' } };
  logEvent(run, 'answer', { pane: 'doc', mode: 'craft', askId, text });
  const r = await followFirst({ run, askId, text, ...opts });
  return r.code === 409 ? { code: 200, body: { following: true } } : r; // the stage path's listener already took it
}

// Focus 2: Mika's rough morning journey in words, 4-6 short steps for a regular, from the current flow. One fast call.
// The regular is Sam, by name: no pronouns in the room (BRIEF), so any that slip through become the name.
export const REGULAR = 'Sam';
export const noPronouns = t => String(t || '')
  .replace(/\b(she|he|they)\b/gi, m => (m[0] === m[0].toUpperCase() ? REGULAR : REGULAR))
  .replace(/\b(her|his|their)\b/gi, `${REGULAR}'s`).replace(/\b(hers|theirs)\b/gi, `${REGULAR}'s`)
  .replace(/\b(him|them)\b/gi, REGULAR).replace(/\b(herself|himself|themselves)\b/gi, REGULAR);
const cleanSteps = raw => (raw?.steps || []).map((s, i) => ({ step: i + 1, time: clip(s?.time, 12), text: noPronouns(clip(s?.text, 120)) }))
  .filter(s => s.text && !/\?/.test(s.text)).slice(0, 6);
export async function feelAsk({ run, callModel = realCallModel }) {
  const evs = readEvents(run);
  if (!isStage(evs)) return { code: 409, body: { error: 'not the stage path' } };
  if (evs.some(e => e.type === 'ask' && e.id === FEEL_ID) || evs.some(e => e.type === 'feel.started')) return { code: 409, body: { error: 'already asked' } };
  logEvent(run, 'feel.started', { pane: 'flow' });
  const idea = evs.find(e => e.type === 'run.start')?.idea || '';
  const users = currentUsers(evs), lines = currentLines(evs);
  const decided = evs.filter(e => e.type === 'decided' && (e.round === 'first' || e.unblock)).map(d => d.choice);
  const system = [`You are Mika, the designer on a small product team. Write the rough morning journey of one regular customer called ${REGULAR}, in words, before any`,
    'screen exists: 4 to 6 short narrative steps, each one plain sentence in the present tense (at most 14 words), with an optional time of day',
    `("7:10"). Follow the journey stages and what the team has decided; invent no features beyond them. No screens, buttons or UI words. No questions.`,
    `Always say ${REGULAR}, never a pronoun (no he, she, they, his, her, their).`,
    'British spelling.'].join(' ');
  const user = JSON.stringify({ idea, users, journey: lines, decided });
  let steps = [];
  try { steps = cleanSteps(await callModel({ system, user, schema: STEPS_SCHEMA, model: FIRST_MODEL, effort: FIRST_EFFORT })); } catch (e) { console.error('feel:', scrub(e.message)); }
  if (steps.length < 3) steps = lines.slice(0, 6).map((l, i) => ({ step: i + 1, time: '', text: l })); // the journey's own words, if the call failed
  logEvent(run, 'journey.words', { pane: 'flow', seat: 'design', by: NAMES.design, id: FEEL_ID, steps });
  const a = askOne(run, { id: FEEL_ID, feel: true, seat: 'design', by: NAMES.design, decision: 'What it should feel like for a regular',
    question: 'What should this feel like for a regular?', artifact: { kind: 'journey-words', ref: FEEL_ID }, steps, decisionIds: [] },
    { source: 'focus-2', decided: { id: FEEL_ID, seat: 'design', decision: 'What it should feel like for a regular', choice: null, cites: 'team default' } });
  return a ? { code: 200, body: a } : { code: 409, body: { error: 'refused by the ask policy' } };
}
// Her Focus 2 answer: Mika rewrites the steps it changes (struck, then rewritten in her words' spirit). One fast call.
export async function rewriteFeel({ run, text, callModel = realCallModel }) {
  const evs = readEvents(run);
  const words = evs.findLast(e => e.type === 'journey.words' && e.id === FEEL_ID);
  if (!words || evs.some(e => e.type === 'journey.words.rewritten')) return { code: 409, body: { error: 'nothing to rewrite' } };
  const system = ['You are Mika, the designer. She has said what this should feel like for a regular. Rewrite the steps of the morning journey that',
    'her words change; keep the rest. Return every step in order: text is the new sentence (same if unchanged). Plain, present tense, at most 14 words',
    `each, no screens or UI words, no questions, British spelling. Always say ${REGULAR}, never a pronoun.`].join(' ');
  let next = [];
  try { next = cleanSteps(await callModel({ system, user: JSON.stringify({ steps: words.steps, herWords: String(text || '').slice(0, 1200) }), schema: STEPS_SCHEMA, model: FIRST_MODEL, effort: FIRST_EFFORT })); }
  catch (e) { return { code: 502, body: { error: scrub(e.message).slice(0, 200) } }; }
  const steps = words.steps.map((s, i) => { const n = next[i]; const changed = !!n && n.text.toLowerCase() !== s.text.toLowerCase(); return { ...s, ...(changed ? { new: n.text } : {}) }; });
  logEvent(run, 'journey.words.rewritten', { pane: 'flow', seat: 'design', by: NAMES.design, id: FEEL_ID, steps, changed: steps.filter(s => s.new).length });
  return { code: 200, body: { steps } };
}

// The stage path runs off the run's own events (no client calls needed): her Focus 1 answer -> followFirst;
// her yes or words on the unblock -> Focus 2; her Focus 2 answer -> Mika's rewrite. Installed once by routes/first.js.
let installed = null;
export function installStagePath({ callModel = realCallModel } = {}) {
  if (installed) return installed;
  installed = onEvent(ev => {
    if (!ev || ev.type !== 'answer' || !ev.run) return;
    const evs = readEvents(ev.run);
    if (!isStage(evs)) return;
    const ask = evs.find(e => e.type === 'ask' && e.id === ev.askId);
    if (!ask) return;
    if (ask.first) followFirst({ run: ev.run, askId: ask.id, text: ev.text, callModel }).catch(e => console.error('first:', scrub(e.message)));
    else if (ask.unblock) feelAsk({ run: ev.run, callModel }).catch(e => console.error('feel:', scrub(e.message)));
    else if (ask.feel) rewriteFeel({ run: ev.run, text: ev.text, callModel }).catch(e => console.error('feel:', scrub(e.message)));
  });
  return installed;
}
