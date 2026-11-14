// The first decision (DEMO stage flow, 0:38): "Who is this really for?", asked from Design's fast sketch, not the
// selector. It goes through the ask policy like any ask (lib/policy.js, via select.js's one-ask grant), so it counts
// toward her three. Her answer runs Design's reshape (the journey redraws) and one fast call turns her answer and the
// idea into a short run of decisions the team settles at once, each a `decided` event with its owner seat, citing her
// answer.
//   firstAsk({ run })                     -> the logged ask (or null if the policy refused it)
//   firstAnswer({ run, askId, text })     -> { decisions, reshaped }   (logs answer, reshape, decided × n, first.done)
// The stage path (DEMO: exactly three things reach her) is a run setting: run.start.stagePath. On it, the selector
// brings one focus moment (STAGE_FOCUS); one ask is kept for the quick unblock.
import { callModel as realCallModel, scrub } from './model.js';
import { logEvent, readEvents } from './events.js';
import { askOne } from './select.js';
import { MAX_ASKS, askCount } from './policy.js';
import { currentLines, currentUsers, reshape } from './sketch.js';
import { NAMES } from './interpret.js';
import { raiseUnblock } from './unblock.js';

export const FIRST_MODEL = process.env.FIRST_MODEL || 'haiku';
export const FIRST_EFFORT = process.env.FIRST_EFFORT || 'low';
export const FIRST_MAX = 6;
export const STAGE_FOCUS = Number(process.env.STAGE_FOCUS_MOMENTS ?? 1); // focus moments the selector brings on the stage path
export const STAGE_UNBLOCK = 1; // asks kept for the quick unblock on the stage path
export const FIRST_ID = 'first';
// The quick unblock (builder 1's card, lib/unblock.js) on the stage path: raised once her first decision's run of
// decisions has settled in the room (DEMO 0:50), so the budget runs first decision -> unblock -> one focus moment.
export const STAGE_UNBLOCK_CARD = { seat: 'engineering', question: 'When do orders close?', suggestion: '8pm the night before', kind: 'call' };
export const UNBLOCK_DELAY_MS = Number(process.env.UNBLOCK_DELAY_MS ?? 3500);
const TEAM = ['design', 'data', 'research', 'strategy', 'engineering'];
const clip = (s, n) => String(s ?? '').trim().replace(/\s+/g, ' ').replace(/[?]+$/, '').slice(0, n);

export const FIRST_SCHEMA = {
  type: 'object',
  properties: { decisions: { type: 'array', items: { type: 'object',
    properties: { seat: { type: 'string' }, decision: { type: 'string' }, choice: { type: 'string' } }, required: ['seat', 'decision', 'choice'] } } },
  required: ['decisions'],
};

const isStage = evs => !!evs.find(e => e.type === 'run.start')?.stagePath;
// How many asks the selector may still bring for this run: on the stage path one focus moment, and one ask stays
// free for the unblock; the policy's cap of three holds either way.
export function selectorMax(run, evs = readEvents(run)) {
  const left = Math.max(0, MAX_ASKS - askCount(run));
  const reserve = evs.some(e => e.type === 'ask.unblock') ? 0 : STAGE_UNBLOCK; // the unblock's slot, until it's raised
  return isStage(evs) ? Math.max(0, Math.min(STAGE_FOCUS, left - reserve)) : left;
}

// The ask itself: Design's sketch already knows the users, so it asks from that shape. No model call.
export function firstAsk({ run }) {
  const evs = readEvents(run);
  if (evs.some(e => e.type === 'ask' && e.first)) return { code: 409, body: { error: 'already asked' } };
  if (!evs.some(e => e.type === 'sketch.done' && !e.reshape && !e.skipped)) return { code: 409, body: { error: 'no sketch yet' } };
  const users = currentUsers(evs);
  const candidate = { id: FIRST_ID, seat: 'design', by: NAMES.design, first: true,
    decision: 'Who this is really for', question: 'Who is this really for?',
    artifact: { kind: 'journey', ref: 'sketch' }, users, decisionIds: [] };
  const a = askOne(run, candidate, { source: 'first-decision', decided: { id: FIRST_ID, seat: 'design',
    decision: 'Who this is really for', choice: users[0] || null, cites: 'team default' } });
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

export async function firstAnswer({ run, askId = FIRST_ID, text, callModel = realCallModel, redraw = true, unblockDelayMs = UNBLOCK_DELAY_MS }) {
  text = String(text || '').trim().slice(0, 1200);
  if (!text) return { code: 400, body: { error: 'text required' } };
  const evs = readEvents(run);
  const ask = evs.find(e => e.type === 'ask' && e.id === askId && e.first);
  if (!ask) return { code: 404, body: { error: 'no such ask' } };
  if (evs.some(e => e.type === 'answer' && e.askId === askId)) return { code: 409, body: { error: 'already answered' } };
  const idea = evs.find(e => e.type === 'run.start')?.idea || '';
  logEvent(run, 'answer', { pane: 'doc', mode: 'craft', askId, text });
  const t0 = Date.now();
  // The journey redraws from her words (Design's reshape) while the decisions are written: same time.
  const redrawing = redraw && currentLines(evs).length ? reshape({ run, text, callModel, asAnswer: askId }).catch(() => null) : null;
  const system = [
    'You are a small product team (Design, Data, Research, Strategy, Engineering) building the first version of an idea.',
    'She has just told you who it is really for. Turn her answer and the idea into the short run of decisions that her answer settles at once:',
    'concrete product calls for the first version, each owned by one teammate (seat: design, data, research, strategy or engineering).',
    `At most ${FIRST_MAX}, at least 3. decision: what is being decided, in a few plain words. choice: the call, at most six words, concrete`,
    '(e.g. "Their usual loaf one tap away", "Held until 10am", "No login", "No phone field"). Follow her words; invent no facts or numbers she did not imply',
    'beyond sensible defaults. Never add a form field or ask for contact details she didn\'t mention; prefer fewer fields.',
    'Never a question. British spelling.',
  ].join(' ');
  const user = JSON.stringify({ idea, whoItIsFor: text, users: ask.users || [] });
  let decisions = [], error = null;
  try { decisions = cleanFirst(await callModel({ system, user, schema: FIRST_SCHEMA, model: FIRST_MODEL, effort: FIRST_EFFORT }), `${idea} ${text}`); }
  catch (e) { error = scrub(e.message).slice(0, 200); }
  const logged = decisions.map((d, i) => logEvent(run, 'decided', { id: `${askId}-d${i + 1}`, seat: d.seat, by: NAMES[d.seat],
    decision: d.decision, choice: d.choice, cites: 'her answer', follows: askId, round: 'first' }));
  logEvent(run, 'answer.mapped', { pane: 'doc', askId, decisions: logged.map(d => ({ id: d.id, seat: d.seat, decision: d.decision, choice: d.choice })), ms: Date.now() - t0 });
  const reshaped = redrawing ? !!(await redrawing) : false;
  logEvent(run, 'first.done', { pane: 'flow', askId, decided: logged.length, reshaped, ms: Date.now() - t0, ...(error ? { error } : {}) });
  // On the stage path, Bo's quick unblock follows once the decisions have settled in the room (never twice).
  if (isStage(evs)) {
    const raise = () => { if (!readEvents(run).some(e => e.type === 'ask.unblock')) { try { raiseUnblock(run, STAGE_UNBLOCK_CARD); } catch (e) { console.error('unblock:', scrub(e.message)); } } };
    if (unblockDelayMs > 0) setTimeout(raise, unblockDelayMs); else raise();
  }
  return { code: error && !logged.length ? 502 : 200, body: { decisions: logged, reshaped, ...(error ? { error } : {}) } };
}
