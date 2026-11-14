// The team space (CONTRACT.md, "Team space seams"). After the team proposes, the few biggest decisions that touch
// several teammates and weren't brought to her get talked out: a real short exchange, 3-4 turns, each turn its own
// fast call by one of the touched teammates reading the thread so far. Each line goes out as room chatter
// (`chatter {by, seat, text, jointId}`); the agreement is `joint.agreed {id, headline, seats, withTakeaways, turns}`
// and the decision is logged as `decided` citing 'team' (or her takeaway's L-line when it shaped the call).
// Runs in the background after `select.done`; never blocks her, never asks her anything.
import { callModel as realCallModel, scrub } from './model.js';
import { logEvent, readEvents, onEvent } from './events.js';
import { prompt, STANCES, SEATS } from './teammates.js';
import { NAMES } from './interpret.js';
import { okLine } from './chatter.js';
import { sameQuestion } from './select.js';

export const JOINT_MODEL = process.env.JOINT_MODEL || 'haiku';
export const JOINT_EFFORT = process.env.JOINT_EFFORT || 'low';
export const JOINT_MAX = Number(process.env.JOINT_MAX || 3);
export const MAX_WORDS = 15;
const SEAT_NAME = { product: 'Product', design: 'Design', data: 'Data', research: 'Research', strategy: 'Strategy', engineering: 'Engineering' };

// ---- which seats a decision touches ----
// Builder 7's candidates carry `seats: []`; until then (and as a check on it) a cheap rule on the decision's words.
const TOUCH = {
  design: /\b(screens?|layout|look|feel|visual|buttons?|forms?|fields?|wireframes?|copy|display|one[- ]tap|first screen|list|dense|density|promises?)\b/i,
  engineering: /\b(log ?-?ins?|accounts?|sign[- ]?(ups?|ins?)|devices?|remember|stor(e|ed|ing|age)|database|build|cookies?|api|sync|automatic(ally)?|auto[- ]?\w+|notif\w*|e-?mails?|sms|texts?|reminders?|calendar|holds?)\b/i,
  data: /\b(measure\w*|metrics?|track\w*|analytics|numbers?|counts?|conversion|no[- ]shows?|retention|repeat|attendance|capacity)\b/i,
  strategy: /\b(pay\w*|price\w*|pricing|deposits?|fees?|refunds?|passes|packs?|credits?|subscriptions?|memberships?|cards?|cash|charge\w*|revenue|drop[- ]ins?|intro offers?)\b/i,
  research: /\b(waitlists?|full classes?|evidence|findings?|studies|surveys?|what (small )?studios|regulars?|first[- ]timers?|newcomers?)\b/i,
};
export function inferSeats(c) {
  const text = `${c?.decision || ''} ${(c?.options || []).join(' ')}`;
  const out = new Set(c?.seat ? [c.seat] : []);
  for (const s of Object.keys(TOUCH)) if (TOUCH[s].test(text)) out.add(s);
  return [...out];
}
// Her teammates this decision touches (never her own seat), the proposer first.
export function seatsFor(c, herSeat = 'product') {
  const given = Array.isArray(c?.seats) && c.seats.length ? c.seats : inferSeats(c);
  const team = new Set(SEATS.filter(s => s !== herSeat && NAMES[s] && s !== 'product'));
  const seats = [...new Set([c?.seat, ...given].filter(s => team.has(s)))];
  return seats.slice(0, 3);
}

// The 2-3 biggest joint candidates: touch >= 2 teammates, not brought to her, not settled by her. Biggest = costly
// and hard to undo first, then the more seats it touches, then the team's order. Never two on the same thing.
export function pickJoint(cands, { asked = new Set(), herSeat = 'product', max = JOINT_MAX } = {}) {
  const order = new Map(cands.map((c, i) => [c.id, i]));
  const weight = c => (c.cost === 'high' ? 2 : 0) + (c.undoable === false ? 1 : 0) + seatsFor(c, herSeat).length;
  const ranked = cands.filter(c => !asked.has(c.id) && seatsFor(c, herSeat).length >= 2)
    .sort((a, b) => weight(b) - weight(a) || order.get(a.id) - order.get(b.id));
  const picks = [];
  for (const c of ranked) {
    if (picks.length >= max) break;
    if (picks.some(p => sameQuestion(p.decision, c.decision))) continue;
    picks.push(c);
  }
  return picks;
}

// Who speaks when: the proposer opens, the others react, the proposer (or the last voice) settles it.
export function speakers(seats) {
  if (seats.length >= 3) return [seats[0], seats[1], seats[2], seats[0]];
  return [seats[0], seats[1], seats[0]];
}

// ---- one turn ----
// Stand-in for the meeting thread's turn call (lib/interpret.js); same shape: one fast call that reads the thread so
// far and returns this teammate's line (plus any extra fields its schema asks for). Swap for the shared one when it lands.
export async function takeTurn({ system, thread = [], callModel = realCallModel, model = JOINT_MODEL, effort = JOINT_EFFORT, schema }) {
  const user = thread.length ? thread.map(t => `${t.by}: ${t.text}`).join('\n') + '\n\nYour line:' : 'You open. Your line:';
  return callModel({ system, user, schema, model, effort, timeoutMs: 30000 });
}

const AI = /\b(great point|absolutely|totally agree|i agree with|good call|love (this|that) idea|let'?s ensure|leverage|seamless\w*|delve|robust|streamline\w*|in summary|to summari[sz]e|moving forward|align(ed)? on)\b/i;
const clipS = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length;
// Code owns the voice rules: one line, <= 15 words, never a question, never to her, no AI phrases, not their name first.
export function cleanLine(raw, by) {
  let t = String(raw ?? '').trim();
  if (/^\{[\s\S]*"text"/.test(t)) { try { t = JSON.parse(t).text; } catch { const m = t.match(/"text"\s*:\s*"([^"]*)"/); t = m ? m[1] : t; } }
  t = String(t ?? '').replace(/\s+/g, ' ').trim().replace(/^["“']|["”']$/g, '').trim();
  if (by) t = t.replace(new RegExp(`^${by}\\s*[:,-]\\s*`, 'i'), '');
  if (!t || !okLine(t) || AI.test(t) || /^\s*[-*•\d]/.test(t)) return null;
  if (words(t) > MAX_WORDS) {
    // keep the first sentence(s) that fit, never cut mid-sentence
    const parts = t.match(/[^.!;]+[.!;]+/g) || [];
    let kept = '';
    for (const p of parts) { if (words(kept + p) > MAX_WORDS) break; kept += p; }
    t = kept.trim();
    if (!t) return null;
  }
  return t.replace(/[;,:]$/, '.');
}
export function cleanHeadline(raw) {
  let t = String(raw ?? '').replace(/\s+/g, ' ').trim().replace(/^["“']|["”']$/g, '').trim();
  if (!t || /\?/.test(t) || /\byou(r|'re|’re)?\b/i.test(t) || words(t) > 12) return null;
  if (!/[.!]$/.test(t)) t += '.';
  return t[0].toUpperCase() + t.slice(1);
}

// Her takeaways so far: the lines she kept from her meetings (taste.written with an askId), as L-lines.
// Her takeaways now: the log at this moment (plus any a caller passed in, for a run without a log).
function takeawaysNow(run, given = []) {
  let fromLog = [];
  try { fromLog = takeawaysOf(readEvents(run)); } catch { /* no log */ }
  const m = new Map(given.map(l => [l.id, l]));
  for (const l of fromLog) m.set(l.id, l);
  return [...m.values()];
}
export function takeawaysOf(evs) {
  const m = new Map();
  for (const e of evs) if (e.type === 'taste.written' && e.askId && e.id) m.set(e.id, e.text);
  return [...m].map(([id, text]) => ({ id, text }));
}

const TURN_SCHEMA = { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] };
const closerSchema = options => ({
  type: 'object',
  properties: { text: { type: 'string' }, choice: { type: 'string', enum: options }, headline: { type: 'string' },
    cites: { type: 'string' } },
  required: ['text', 'choice', 'headline', 'cites'],
});
const ROLE = {
  open: 'Raise it from your craft: what you need, or what worries you about the current lean, in one line.',
  react: 'React from your craft. Push back lightly if your craft sees a catch, or add what your part needs.',
  close: 'Settle it: meet the concern raised and say what the team will do, in one line.',
};

// One exchange, start to finish. Logs chatter per turn, then joint.agreed and decided. Returns the agreement or null.
export async function talkItOut({ run, cand, lean, idea = '', herSeat = 'product', takeaways = [], callModel = realCallModel,
  model = JOINT_MODEL, effort = JOINT_EFFORT }) {
  const seats = seatsFor(cand, herSeat);
  if (seats.length < 2) return null;
  const jointId = `j-${cand.id}`;
  const order = speakers(seats);
  const options = (cand.options || []).map(String).filter(Boolean);
  const leanChoice = lean?.choice && options.includes(lean.choice) ? lean.choice : cand.recommendation;
  const t0 = Date.now();
  logEvent(run, 'joint.start', { jointId, id: cand.id, decision: cand.decision, seats });
  const thread = [];
  let close = null, heard = [];
  for (let i = 0; i < order.length; i++) {
    const seat = order[i], by = NAMES[seat], last = i === order.length - 1;
    const system = prompt('joint-turn', {
      NAME: by, SEAT: SEAT_NAME[seat], STANCE: STANCES[seat], IDEA: idea || '(a small product)',
      DECISION: cand.decision, OPTIONS: options.map(o => `"${o}"`).join(', ') || '(open)', LEAN: leanChoice || '(none yet)',
      REASON: cand.reason ? `Why ${NAMES[cand.seat] || 'the team'} raised it: ${cand.reason}` : '',
      TAKEAWAYS: (heard = takeawaysNow(run, takeaways)).length ? heard.map(l => `- [${l.id}] ${l.text}`).join('\n') : '(none yet)',
      THREAD: thread.length ? thread.map(t => `${t.by}: ${t.text}`).join('\n') : '(nobody has spoken yet)',
      TURN: i + 1, TURNS: order.length, ROLE: i === 0 ? ROLE.open : last ? ROLE.close : ROLE.react,
      CLOSER: last ? ' `choice`: exactly one of the options, what the team will do. `headline`: the agreement as a ' +
        'one-line card, 10 words or fewer, a plain statement of what the page does (e.g. "Waitlist auto-offers the spot, no logins."). ' +
        '`cites`: the [L<n>] of her takeaway this follows, or "none".' : '',
    });
    const schema = last && options.length ? closerSchema(options) : TURN_SCHEMA;
    let text = null, out = null;
    for (let attempt = 0; attempt < 2 && !text; attempt++) {
      const again = attempt ? `\n\nYour last try broke the rules: "${clipS(out?.text, 160)}". Say it again in 12 words or fewer: ` +
        'no question, never "you" (say "customers" or "people"), no "Agreed".' : '';
      try { out = await takeTurn({ system: system + again, thread, callModel, model, effort, schema }); }
      catch (e) { logEvent(run, 'joint.error', { jointId, seat, error: scrub(e.message).slice(0, 200) }); return null; }
      text = cleanLine(out?.text, by);
    }
    if (!text) { logEvent(run, 'joint.error', { jointId, seat, error: 'no usable line', said: scrub(String(out?.text ?? '')).slice(0, 200) }); return null; }
    thread.push({ by, seat, text });
    logEvent(run, 'chatter', { pane: 'room', by, seat, text, jointId, from: 'joint', turn: i + 1 });
    if (last) close = out;
  }
  const choice = close?.choice && options.includes(close.choice) ? close.choice : leanChoice;
  // Her takeaways as the closer heard them, read from the log at that call (not when the talk started): the agreement
  // was made with them in mind. Any she writes after are checked by the revisit below (revisitAgreements).
  const tk = new Set(heard.map(l => l.id));
  const cited = String(close?.cites || '').replace(/^\[|\]$/g, '').toUpperCase();
  const withTakeaways = tk.size > 0;
  const headline = cleanHeadline(close?.headline) || cleanHeadline(`${cand.decision.replace(/\?\s*$/, '')}: ${choice}`) || `${choice}.`;
  const ms = Date.now() - t0;
  const agreed = logEvent(run, 'joint.agreed', { pane: 'room', id: jointId, candidateId: cand.id, headline, seats,
    withTakeaways, takeaways: [...tk], turns: thread.map(({ by, seat, text }) => ({ by, seat, text })), choice, ms });
  logEvent(run, 'decided', { id: cand.id, seat: cand.seat, decision: cand.decision, choice,
    cites: tk.has(cited) ? cited : 'team', round: 'joint', jointId });
  return agreed;
}

// After the team proposes: the biggest joint decisions, talked out in parallel (each exchange is sequential inside).
export async function runJoint(run, { callModel = realCallModel, model, effort, max = JOINT_MAX } = {}) {
  const evs = readEvents(run);
  if (evs.some(e => e.type === 'joint.start')) return [];
  const start = evs.find(e => e.type === 'run.start') || {};
  if (start.fast) return []; // a judge's idea at the close: just the journey and the first question
  const herSeat = start.seat || 'product';
  const asked = new Set(evs.filter(e => e.type === 'ask').map(e => e.id));
  for (const m of evs.filter(e => e.type === 'answer.mapped')) for (const d of m.decisions || []) asked.add(d?.id);
  const cands = [...new Map(evs.filter(e => e.type === 'candidate').map(e => [e.id, e])).values()];
  const lean = new Map(evs.filter(e => e.type === 'decided').map(e => [e.id, e]));
  // Her file already decides it (a decision citing one of her lines): hers, not the team's to talk out.
  for (const [id, d] of lean) if (/^[LG]\d+$/.test(String(d.cites))) asked.add(id);
  const picks = pickJoint(cands, { asked, herSeat, max });
  const takeaways = takeawaysOf(evs);
  const all = Promise.all(picks.map(cand => talkItOut({ run, cand, lean: lean.get(cand.id), idea: start.idea, herSeat,
    takeaways, callModel, ...(model ? { model } : {}), ...(effort ? { effort } : {}) }).catch(() => null)));
  talking.set(run, all);
  try { return (await all).filter(Boolean); } finally { if (talking.get(run) === all) talking.delete(run); }
}

// The run's joint talks still in flight. Build waits for them (bounded) before it reads the log: a talk that agrees
// after Build started would otherwise land unrevisited, after the build's own decision, and win over her pins.
const talking = new Map(); // run -> Promise of its talks
export const JOINT_WAIT_MS = Number(process.env.JOINT_WAIT_MS || 30000);
export async function jointSettled(run, maxMs = JOINT_WAIT_MS) {
  const p = talking.get(run);
  if (!p) return 0;
  const t0 = Date.now();
  let timer;
  await Promise.race([p.catch(() => {}), new Promise(r => { timer = setTimeout(r, maxMs); })]);
  clearTimeout(timer);
  return Date.now() - t0;
}

// Hook: whenever a run's selector finishes, talk out its joint decisions in the background.
let off = null;
export function installJoint({ callModel } = {}) {
  if (off || process.env.JOINT_OFF === '1') return off;
  off = onEvent(ev => {
    if (!ev.run) return;
    // A new takeaway, or an agreement landing: re-check every agreement made before it, in code.
    if ((ev.type === 'taste.written' && ev.askId) || ev.type === 'joint.agreed') {
      setImmediate(() => queueRevisit(ev.run, callModel ? { callModel } : {}));
      return;
    }
    if (ev.type !== 'select.done' || ev.fast) return;
    setImmediate(() => runJoint(ev.run, callModel ? { callModel } : {}).catch(() => {}));
  });
  return off;
}
export function uninstallJoint() { if (typeof off === 'function') off(); off = null; }

// ---- at Build: her takeaways can revisit what the team agreed ----
// An agreement made before she spoke stands unless what she said since touches it: a decision she settled herself
// (answer.mapped) is hers; otherwise one call re-decides the team's joint agreements against her takeaways. An
// agreement changes only when the new choice differs and cites one of her takeaways. When her takeaways rule out every
// option the team listed, the call may write a new choice that follows her line (newOption): code accepts it only if
// it cites her line and drops something every listed option had (so it can't re-add what her line rules out).
// A change logs `decided` (round 'build') and `joint.revised { id, headline, choice, cites, withTakeaways, newOption }`.
// `decide(candidates, takeaways)` returns { decided: [{ id, choice, cites, newOption? }] } (revisitCall by default).
export const REVISIT_MODEL = process.env.REVISIT_MODEL || 'sonnet';
const REVISIT_SCHEMA = { type: 'object', properties: { decisions: { type: 'array', items: { type: 'object',
  properties: { id: { type: 'string' }, choice: { type: 'string' }, cites: { type: 'string' }, newOption: { type: 'boolean' } },
  required: ['id', 'choice', 'cites', 'newOption'] } } }, required: ['decisions'] };
export async function revisitCall(cands, takeaways, { idea = '', callModel = realCallModel } = {}) {
  const system = prompt('joint-revisit', { IDEA: idea || '(a small product)',
    TAKEAWAYS: takeaways.map(l => `- [${l.id}] ${l.text}`).join('\n') });
  const user = JSON.stringify(cands.map(c => ({ id: c.id, decision: c.decision, options: c.options, agreed: c.agreed })));
  return callModel({ system, user, schema: REVISIT_SCHEMA, model: REVISIT_MODEL, effort: 'low' });
}

const NEG = /\b(no|not|without|never|skip|drop|cut)\s+(the\s+|a\s+|an\s+|any\s+)?([a-z]+)/gi;
const STOPW = new Set(['the', 'and', 'or', 'a', 'an', 'of', 'for', 'to', 'with', 'their', 'only', 'just', 'plus', 'each', 'per', 'on', 'in', 'at', 'by', 'from', 'what', 'that', 'this']);
const termsOf = s => new Set((String(s).toLowerCase().replace(NEG, ' ').match(/[a-z]{3,}/g) || []).filter(w => !STOPW.has(w)).map(w => w.replace(/s$/, '')));
// A new option must drop a thing (not a verb) that every listed option had, and must not bring it back under another
// name: otherwise it's one of them in other words.
const VERBS = new Set(['ask', 'collect', 'keep', 'store', 'show', 'take', 'use', 'get', 'send', 'need', 'require', 'add',
  'include', 'give', 'offer', 'let', 'make', 'save', 'hold', 'request', 'want', 'capture', 'record', 'remember', 'checkout', 'sign', 'once', 'first', 'after', 'before']);
const SAME = [['phone', 'mobile', 'telephone', 'tel', 'cell', 'sms', 'text'], ['email', 'mail', 'inbox'], ['address', 'postcode', 'postal'],
  ['account', 'login', 'password', 'signup', 'sign-up'], ['card', 'payment', 'deposit', 'prepay']];
const family = t => SAME.find(g => g.includes(t)) || [t];
export function dropsRuledOut(options, choice) {
  const sets = options.map(termsOf);
  if (!sets.length) return false;
  const common = [...sets[0]].filter(t => sets.every(x => x.has(t)) && !VERBS.has(t));
  const now = termsOf(choice);
  return common.some(t => family(t).every(f => !now.has(f)));
}
const norm = s => String(s ?? '').trim().toLowerCase().replace(/[.!]+$/, '');

// Takeaway ids an agreement has been checked against: those a revisit ran on (joint.revised / joint.kept). Hearing a
// line in the talk isn't enough: the closer can only pick a listed option, and only the revisit can write a new one.
function checkedOf(evs, a) {
  const out = new Set();
  for (const e of evs) if ((e.type === 'joint.revised' || e.type === 'joint.kept') && e.id === a.id) for (const l of e.against || []) out.add(l);
  return out;
}
// One revisit's verdict on one agreement: { choice, cites, newOption } to change it, or { keep: reason }.
function verdict(d, x, c, takeaways) {
  if (!x) return { keep: 'no answer for it' };
  const cites = String(x.cites ?? '').replace(/^\[|\]$/g, '').toUpperCase();
  const choice = String(x.choice ?? '').replace(/\s+/g, ' ').trim();
  if (!choice || norm(choice) === norm(d.choice)) return { keep: 'still fits her takeaways' };
  if (!takeaways.has(cites)) return { keep: 'cites none of her takeaways' };
  const option = (c.options || []).find(o => norm(o) === norm(choice));
  if (option) return { choice: option, cites, newOption: false };
  // A new option: only one that follows her line and drops what every listed option had; else the agreement stands.
  if (choice.length <= 140 && !/\?/.test(choice) && dropsRuledOut(c.options || [], choice)) return { choice, cites, newOption: true };
  return { keep: 'its new choice kept what she ruled out' };
}

// The revisit, in code (not left to the model's memory): every joint agreement not yet checked against every one of her
// takeaways is re-decided against them now. Each logs joint.revised (and `decided`, round `round`) or joint.kept
// { reason }, with `against` (the takeaway ids it was checked against), so it never runs twice for the same lines.
// Runs on each takeaway and each agreement (installJoint), and at Build for anything still unchecked.
export async function revisitAgreements(run, { decide, callModel = realCallModel, idea, round = 'revisit' } = {}) {
  const evs = readEvents(run);
  const takeawayLines = takeawaysOf(evs);
  if (!takeawayLines.length) return [];
  const takeaways = new Set(takeawayLines.map(l => l.id));
  const hers = new Set();
  for (const m of evs.filter(e => e.type === 'answer.mapped')) for (const d of m.decisions || []) if (d?.id) hers.add(d.id);
  const cands = new Map(evs.filter(e => e.type === 'candidate').map(e => [e.id, e]));
  const current = new Map();
  for (const e of evs) if (e.type === 'decided' && e.jointId && ['joint', 'revisit', 'build'].includes(e.round)) current.set(e.id, e);
  const due = [];
  for (const a of evs.filter(e => e.type === 'joint.agreed')) {
    const d = current.get(a.candidateId);
    if (!d || hers.has(a.candidateId) || !cands.has(a.candidateId)) continue;
    const checked = checkedOf(evs, a);
    if (takeawayLines.some(l => !checked.has(l.id))) due.push({ a, d });
  }
  if (!due.length) return [];
  decide = decide || ((cs, tk) => revisitCall(cs, tk, { idea: idea ?? evs.find(e => e.type === 'run.start')?.idea, callModel }));
  let re = new Map(), failed = null;
  try {
    const r = await decide(due.map(({ d }) => ({ ...cands.get(d.id), agreed: d.choice })), takeawayLines);
    re = new Map((r?.decided || r?.decisions || []).map(x => [x.id, x]));
  } catch (e) { failed = scrub(e.message).slice(0, 120); }
  const against = [...takeaways];
  const out = [];
  for (const { a, d } of due) {
    const v = failed ? { keep: `the revisit call failed: ${failed}` } : verdict(d, re.get(d.id), cands.get(d.id), takeaways);
    if (v.keep) {
      logEvent(run, 'joint.kept', { pane: 'room', id: a.id, candidateId: d.id, choice: d.choice, reason: v.keep, against });
      out.push(strip(d));
      continue;
    }
    const headline = cleanHeadline(v.choice) || a.headline;
    logEvent(run, 'joint.revised', { pane: 'room', id: a.id, candidateId: d.id, headline, choice: v.choice, cites: v.cites,
      withTakeaways: true, newOption: v.newOption, was: d.choice, against });
    const row = { id: d.id, seat: d.seat, decision: d.decision, choice: v.choice, cites: v.cites };
    logEvent(run, 'decided', { ...row, round, jointId: a.id, revisited: true, ...(v.newOption ? { newOption: true } : {}) });
    out.push(row);
  }
  return out;
}

// Revisits in flight per run, one after another; Build waits for them (bounded) and then goes with what's logged.
const revisits = new Map(); // run -> Promise
export const REVISIT_WAIT_MS = Number(process.env.REVISIT_WAIT_MS || 5000);
export function queueRevisit(run, opts = {}) {
  const p = (revisits.get(run) || Promise.resolve()).then(() => revisitAgreements(run, opts)).catch(() => []);
  revisits.set(run, p);
  p.finally(() => { if (revisits.get(run) === p) revisits.delete(run); });
  return p;
}
export async function revisitSettled(run, maxMs = REVISIT_WAIT_MS) {
  const p = revisits.get(run);
  if (!p) return { pending: false, timedOut: false };
  let timer, timedOut = false;
  await Promise.race([p, new Promise(r => { timer = setTimeout(() => { timedOut = true; r(); }, maxMs); })]);
  clearTimeout(timer);
  return { pending: true, timedOut };
}

// At Build: what reaches the page for each agreement. Her answer since wins; anything not yet checked against her
// takeaways is checked now (unless a revisit already in flight ran past its wait: then the agreement as logged stands).
export async function revisitJoint(run, { decide, callModel, idea, evs, skipCheck = false } = {}) {
  if (!skipCheck) await revisitAgreements(run, { decide, callModel, idea, round: 'build' });
  evs = readEvents(run);
  const current = new Map();
  for (const e of evs) if (e.type === 'decided' && e.jointId && ['joint', 'revisit', 'build'].includes(e.round)) current.set(e.id, e);
  if (!current.size) return [];
  const agreements = new Map(evs.filter(e => e.type === 'joint.agreed').map(e => [e.candidateId, e]));
  const hers = new Map();
  for (const m of evs.filter(e => e.type === 'answer.mapped')) for (const d of m.decisions || []) if (d?.id) hers.set(d.id, d);
  const out = [];
  for (const d of current.values()) {
    const h = hers.get(d.id), a = agreements.get(d.id);
    if (h && h.choice !== d.choice) {
      if (a) logEvent(run, 'joint.revised', { pane: 'room', id: a.id, candidateId: d.id, headline: cleanHeadline(h.choice) || a.headline,
        choice: h.choice, cites: 'her answer', withTakeaways: true, newOption: false, was: d.choice });
      out.push({ id: d.id, seat: d.seat, decision: d.decision, choice: h.choice, cites: 'her answer' });
    } else out.push(strip(d));
  }
  return out;
}
const strip = ({ id, seat, decision, choice, cites }) => ({ id, seat, decision, choice, cites });
