// The ask policy: the only door to her. Every `ask` event in a run is written here and nowhere else
// (test/policy.test.js checks the source for that). Only a grant made by the selector opens the door: what reaches
// her is decided by the selector's ranking and threshold, never by a count.
// Anything else that tries to ask is refused, decided for her and logged. A question in plain model text is a stamp.
import { logEvent, readEvents } from './events.js';

const grants = new WeakSet(); // grant objects the selector made; unforgeable outside this module

// The power to mint grants is handed out exactly once. lib/select.js claims it while it loads, so nothing else can:
// a later claim throws (and if anything claimed it first, select.js fails to load, loudly, rather than run without
// the selector). A grant names exactly the candidates the selector picked.
let claimed = false;
export function claimGrantor() {
  if (claimed) throw new Error('the grantor belongs to the selector');
  claimed = true;
  return function mintGrant(run, ids) {
    if (!Array.isArray(ids)) throw new Error('a grant names the candidates the selector picked');
    const g = Object.freeze({ run, ids: Object.freeze([...ids]) });
    grants.add(g);
    return g;
  };
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
  if (reason) { refuse(run, candidate, reason, opts.decided); return null; }
  // kind and why are older ask fields: logged only when the caller still passes them (the selector no longer does).
  const a = {
    ...candidate,
    ...(kind ? { kind: kind === 'pin' ? 'pin' : 'fork' } : {}),
    ...(why ? { why: noQuestion(why) } : {}),
    attachTo: opts.attachTo !== undefined ? opts.attachTo : candidate.attachTo ?? null,
    ...(opts.score ? { score: opts.score } : {}),
  };
  return logEvent(run, 'ask', { pane: 'flow', mode: 'craft', ...a });
}

// A quick unblock (DEMO 0:50): a seat's work needs a fact or call only she has ("Bo's blocked: when do orders close?
// We suggest 8pm the night before."). It goes through this same door: only lib/unblock.js holds the power to raise one
// (claimed once, like the selector's grantor), and only her facts and calls qualify; anything else is refused and
// decided on the team's suggestion.
export const UNBLOCK_KINDS = Object.freeze(['fact', 'call']);
const unblockGrants = new WeakSet();
let unblockClaimed = false;
export function claimUnblocker() {
  if (unblockClaimed) throw new Error('the unblocker belongs to lib/unblock.js');
  unblockClaimed = true;
  return function mintUnblock(run, id) { const g = Object.freeze({ run, id }); unblockGrants.add(g); return g; };
}
export function askUnblock(run, u, grant) {
  let reason = null;
  if (!grant || !unblockGrants.has(grant)) reason = 'not from the unblock door';
  else if (grant.run !== run || grant.id !== u.id) reason = 'grant is for another unblock';
  else if (!UNBLOCK_KINDS.includes(u.kind)) reason = 'only her facts and calls can unblock';
  else if (!u.question || !u.suggestion) reason = 'an unblock needs a question and the team\'s suggestion';
  else if (readEvents(run).some(e => e.type === 'ask' && e.id === u.id)) reason = 'already asked';
  if (reason) {
    refuse(run, { id: u.id, seat: u.seat, decision: u.question }, reason,
      { id: u.id, seat: u.seat, decision: noQuestion(u.question), choice: u.suggestion || null, cites: 'team suggestion', unblock: true });
    return null;
  }
  return logEvent(run, 'ask', { pane: 'inbox', mode: 'unblock', unblock: true, id: u.id, seat: u.seat, by: u.by || null, kind: u.kind,
    question: u.question, decision: noQuestion(u.question), suggestion: u.suggestion, ...(u.doing ? { doing: u.doing } : {}), ...(u.topic ? { topic: u.topic } : {}), attachTo: null });
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
