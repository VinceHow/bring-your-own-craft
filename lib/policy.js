// The ask policy: the only door to her. Every `ask` event in a run is written here and nowhere else
// (test/policy.test.js checks the source for that). Only a grant made by the selector opens the door, and the
// door re-counts the run's log so a fourth ask is refused even if a caller gets the cap wrong.
// Anything else that tries to ask is refused, decided for her and logged. A question in plain model text is a stamp.
import { logEvent, readEvents } from './events.js';

export const MAX_ASKS = 3;

const grants = new WeakSet(); // grant objects the selector made; unforgeable outside this module

// Called by lib/select.js after code has applied the cap. ids: the candidate ids it picked (at most MAX_ASKS).
export function selectorGrant(run, ids) {
  if (!Array.isArray(ids) || ids.length > MAX_ASKS) throw new Error(`selector may grant at most ${MAX_ASKS} asks`);
  const g = Object.freeze({ run, ids: Object.freeze([...ids]) });
  grants.add(g);
  return g;
}

export function askCount(run) {
  return readEvents(run).filter(e => e.type === 'ask').length;
}

// Try to put a candidate in front of her. Returns the logged ask, or null if refused (then it is decided).
// opts: { grant, kind: 'fork'|'pin', why, attachTo, source, decided (how to decide it if refused) }
export function ask(run, candidate, opts = {}) {
  const { grant, kind, why, source = 'unknown' } = opts;
  let reason = null;
  if (!grant || !grants.has(grant)) reason = `not from the selector (${source})`;
  else if (grant.run !== run) reason = 'grant is for another run';
  else if (!grant.ids.includes(candidate.id)) reason = 'not picked by the selector';
  else if (readEvents(run).some(e => e.type === 'ask' && e.id === candidate.id)) reason = 'already asked';
  else if (askCount(run) >= MAX_ASKS) reason = `cap of ${MAX_ASKS} reached`;
  if (reason) { refuse(run, candidate, reason, opts.decided); return null; }
  const a = {
    ...candidate,
    kind: kind === 'pin' ? 'pin' : 'fork',
    why: noQuestion(why || candidate.reason || ''),
    attachTo: opts.attachTo !== undefined ? opts.attachTo : candidate.attachTo ?? null,
    ...(opts.score ? { score: opts.score } : {}),
  };
  return logEvent(run, 'ask', { pane: 'flow', mode: 'craft', ...a });
}

// Refuse an ask and decide it for her: with the decision given (the selector's cited one), else on the team
// default (the recommendation).
export function refuse(run, candidate, reason, decided = null) {
  logEvent(run, 'ask.refused', { id: candidate.id, reason });
  const d = decided || {
    id: candidate.id, seat: candidate.seat, decision: candidate.decision,
    choice: candidate.recommendation ?? candidate.options?.[0] ?? null, cites: 'team default',
  };
  return logEvent(run, 'decided', { ...d, refused: true });
}

// A question in a teammate's free text, addressed to her, is a stamp: it only asks the tool's yes/no of her.
export function questionsIn(text) {
  return String(text || '').split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => /\?\s*["')\]]*$/.test(s));
}
export function scanText(run, source, text) {
  return questionsIn(text).map(q => logEvent(run, 'stamp', { pane: source, mode: 'stamp', source, text: q }));
}

function noQuestion(s) { return String(s).replace(/\?+\s*$/, '.'); }
