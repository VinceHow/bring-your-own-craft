// The selector. One model call scores every candidate against the question bar and writes, for the few that clear
// it, one open question in the asking teammate's voice; code applies the rules: at most 3 asks, granular decisions
// never asked, nothing her file already decides. Everything else is decided by decideRest(), citing a line of her
// file or "team default"; code rejects a citation to a line that isn't there.
import { callModel as realCallModel } from './model.js';
import { logEvent, readEvents, newRunId } from './events.js';
import { MAX_ASKS, claimGrantor, ask, refuse } from './policy.js';
import { parseFlow } from './flow.js';
import { prompt, formatFlow, propose, teammateName, profileFor, introOf, herTagLine, domainsFor, inDomains } from './teammates.js';
import { formatTaste, asLines, initTaste } from './taste.js';
import { guestLinesFor } from './guest.js';

// Chosen by measurement (docs/dry-runs/timings.md). Low effort skips thinking: about 7 s instead of 17 s to score.
export const SELECT_MODEL = process.env.SELECT_MODEL || 'sonnet';
export const SELECT_EFFORT = process.env.SELECT_EFFORT || 'low';

// Only the selector can mint grants to ask her: claimed here, once, as this module loads.
const mintGrant = claimGrantor();

export const ARTIFACTS = ['journey', 'finding', 'wires', 'page'];
export const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }, big: { type: 'integer' }, hers: { type: 'integer' }, granular: { type: 'boolean' },
          showable: { type: 'boolean' }, changes: { type: 'integer' }, silent: { type: 'integer' },
          dupOf: { type: ['string', 'null'] }, kind: { type: 'string', enum: ['fork', 'pin'] },
          question: { type: ['string', 'null'] }, artifact: { type: ['string', 'null'] }, domain: { type: ['string', 'null'] },
          settles: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'big', 'hers', 'silent', 'dupOf', 'domain'], // changes and kind default in scoreCandidates
      },
    },
  },
  required: ['scores'],
};
export const DECIDE_SCHEMA = {
  type: 'object',
  properties: {
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, choice: { type: 'string' }, cites: { type: 'string' },
          alsoCites: { type: 'array', items: { type: 'string' } } },
        required: ['id', 'choice', 'cites'],
      },
    },
  },
  required: ['decisions'],
};

const brief = c => ({ id: c.id, seat: c.seat, decision: c.decision, options: c.options, recommendation: c.recommendation,
  reason: c.reason, cost: c.cost, undoable: c.undoable, attachTo: c.attachTo, ...(c.source ? { source: c.source.title } : {}),
  ...(c.question ? { question: c.question } : {}) });
const clamp = n => Math.max(0, Math.min(3, Math.round(Number(n) || 0)));

// Granular in code, whatever the scorer says: the details the team always settles itself (DEMO.md, the question bar).
// Read from the decision's own words (not its options: "What happens when a class is full" may offer a waitlist).
// Waitlist *mechanics* are granular (how spots are offered, holds, the switch); whether full classes get one at all
// is a question about the product, and is Research's finding's topic.
export const GRANULAR = /\b(accounts?|log ?-?ins?|sign[- ]?(ups?|ins?)|passwords?|e-?mails?|phone|fields?|devices?|cookies?|wait[- ]?list (takes|switch|holds?|order|positions?|notif\w*|payments?)|how (spots|places) (get|are) offered|holds?|databases?|stor(e|ed|ing|age)|hosting|framework|apis?|timestamps?|measures?|measuring|metrics?|track(ed|ing)?|analytics|colou?rs?|fonts?|typefaces?|accent|dense|density|spacing|grouped|race|last spot)\b/i;
export const isGranular = (c, s) => s?.granular === true || GRANULAR.test(String(c?.decision || ''));

// A natural question, checked in code: one sentence, open (not yes/no), no options, short.
const OPEN = /^(what|how|who|whom|why|when|where|if|which (moment|part|feeling))\b/i;
export function naturalQuestion(q) {
  const t = String(q ?? '').replace(/\s+/g, ' ').trim();
  if (!t.endsWith('?') || t.length < 12) return null;
  if ((t.match(/\?/g) || []).length > 1 || /[.!;:]\s+\S/.test(t)) return null; // one sentence
  if (!OPEN.test(t)) return null; // "Should we..." / "Do you want..." are forms, not questions
  if (/\boption|\(\w\)|\byou should\b|\brecommend/i.test(t)) return null; // no choices offered ("A or B:" fails above)
  if (t.split(' ').length > 28) return null;
  return t;
}

// The question for a candidate: drafted by the teammate who raised it, in its own voice (one call it already makes,
// so the close stays fast), or the scorer's if it wrote one; either way it must be natural.
const questionOf = y => naturalQuestion(y.score?.question) || naturalQuestion(y.candidate?.question);

// One call: scores keyed by candidate id. The bar's fields default so that an older scorer (or fixture) keeps its
// meaning: big from `changes`, hers from `expertise` (2 = passes), showable true.
export async function scoreCandidates({ run, idea, flow, taste, herSeat = 'product', herTag = null, profile, intro,
  candidates, callModel = realCallModel, model = SELECT_MODEL, effort = SELECT_EFFORT }) {
  const domains = domainsFor(run, herSeat, profile);
  const system = prompt('select', { HER_SEAT: herSeat, HER_TAG: herTagLine(herSeat, herTag), IDEA: idea,
    HER_DOMAINS: domains.join(', ') || '(not known yet)',
    INTRO: intro ?? introOf(run) ?? '(she said nothing yet)', PROFILE: profileFor(run, profile),
    FLOW: formatFlow(flow), TASTE: formatTaste(asLines(taste)) });
  const out = await callModel({ system, user: JSON.stringify(candidates.map(brief)), schema: SCORE_SCHEMA, model, effort });
  const byId = new Map();
  for (const s of out.scores || []) {
    if (!s || byId.has(s.id)) continue;
    const { inSeat: _ignored, ...rest } = s; // seat is code's call (pickAsks), never the model's
    // changes defaults to big, kind to where it sits (a box: a pin on it; the page: a fork), so the scorer writes less.
    const c = candidates.find(x => x.id === s.id);
    byId.set(s.id, { ...rest, changes: clamp(s.changes ?? s.big), silent: clamp(s.silent),
      kind: s.kind === 'fork' || s.kind === 'pin' ? s.kind : c?.attachTo ? 'pin' : 'fork',
      big: clamp(s.big ?? s.changes), hers: clamp(s.hers ?? s.expertise ?? 2), granular: s.granular === true,
      // In one of her domains, checked in code against her list (left unset when the scorer doesn't say, as in
      // older fixtures; the real scorer must say: `domain` is required in its schema).
      ...('domain' in s && domains.length ? { inDomain: inDomains(s.domain, domains) } : {}),
      showable: s.showable !== false, settles: Array.isArray(s.settles) ? s.settles.map(String) : [] });
  }
  return byId;
}

// Ranking by the bar: how big, how much hers, how open her file leaves it; Research's evidence and her own seat break
// near-ties (sourced = the candidate or a duplicate of it carries the finding).
export const total = (c, s, sourced = !!c.source) => s.big + s.hers + s.silent + (s.inSeat ? 1 : 0) + (sourced ? 1 : 0);

// Why it made the cut, said from the scores (code, not the model, so it is exactly what the rules used). Logged only.
export function whyFor(c, s) {
  const big = ['', 'changes a little of the product', 'changes the product', 'changes the shape of the product'][s.big];
  const hers = s.hers >= 3 ? 'draws on what you know best' : 'draws on what you know';
  const file = s.silent >= 3 ? 'your file says nothing on it' : 'your file barely touches it';
  return [big, hers, file].filter(Boolean).join('; ') + (c.source ? `; backed by ${c.source.title}` : '') + '.';
}

// The bar, as code: big, hers, never granular, showable, open in her file, and a natural question written for it.
export function clearsBar(c, s) {
  return !!s && !isGranular(c, s) && s.big >= 2 && s.hers >= 2 && s.inDomain !== false && s.showable !== false && s.silent >= 1
    && s.changes >= 1;
}

// Which piece of her work the question sits on. Code owns it: "finding" only with Research's source, "wires" only
// when the scorer says it's about the screens' look and feel or Design raised it, else the journey (on its box).
// The page isn't built until the symphony, so no question sits on it yet; the wireframes are Mika's, so only a
// question Design raised sits on them.
export function artifactFor(c, s, attachTo) {
  if (c.source) return { kind: 'finding', ref: c.source.url || c.source.title };
  if (c.seat === 'design' && s?.artifact !== 'journey') return { kind: 'wires', ...(attachTo ? { ref: attachTo } : {}) };
  return { kind: 'journey', ...(attachTo ? { ref: attachTo } : {}) };
}

// Pure: the rules. Returns { picks: [{ candidate, score, why, group, attachTo, question, artifact, decisionIds }],
// refused: [{ candidate, score, reason }], groups: Map(id -> group id) }. A candidate is asked only if it clears
// the bar and has a natural question; granular ones never are, and never appear in an ask's decisionIds.
// Duplicates (dupOf) form one group; a group is asked once, through its member from her own seat if it has one.
// Each decision is settled by at most one ask. Never more than MAX_ASKS picks, whatever `max` says.
export function pickAsks(candidates, scores, { max = MAX_ASKS, flow, herSeat = 'product' } = {}) {
  const cap = Math.max(0, Math.min(Number.isFinite(max) ? max : MAX_ASKS, MAX_ASKS));
  const nodeIds = (flow?.nodes || []).map(n => n.id);
  const order = new Map(candidates.map((c, i) => [c.id, i]));
  const byId = new Map(candidates.map(c => [c.id, c]));
  const groups = new Map();
  for (const c of candidates) {
    const d = scores.get(c.id)?.dupOf;
    groups.set(c.id, d && d !== c.id && order.has(d) ? (groups.get(d) || d) : c.id);
  }
  const sourceOf = new Map();
  for (const c of candidates) if (c.source && !sourceOf.has(groups.get(c.id))) sourceOf.set(groups.get(c.id), c.source);
  const ranked = candidates
    .map(c => ({ candidate: c, score: scores.has(c.id) ? { ...scores.get(c.id), inSeat: c.seat === herSeat } : null }))
    .filter(x => clearsBar(x.candidate, x.score))
    .map(x => ({ ...x, sourced: sourceOf.has(groups.get(x.candidate.id)) }))
    .map(x => ({ ...x, total: total(x.candidate, x.score, x.sourced) }))
    // Ties: the one with evidence, then her seat, then the bigger change, then the team's order.
    .sort((a, b) => b.total - a.total || Number(b.sourced) - Number(a.sourced)
      || Number(b.score.inSeat) - Number(a.score.inSeat)
      || b.score.big - a.score.big || order.get(a.candidate.id) - order.get(b.candidate.id));
  const picks = [], refused = [];
  const taken = new Set(), settled = new Set();
  // Two passes: first one question per piece of her work (the journey, Noor's finding, Mika's wireframes), then fill.
  for (const spread of [true, false]) for (const x of ranked) {
    if (picks.length >= cap) break;
    const group = groups.get(x.candidate.id);
    if (taken.has(group) || settled.has(x.candidate.id)) continue;
    // The question comes from a group member whose scorer wrote a natural one. Among those within a point of the
    // best, ask through the teammate whose work it sits on: her own seat, then Research when it carries the finding,
    // then Design (the wireframes), then the highest ranked.
    const voiced = ranked.filter(y => groups.get(y.candidate.id) === group && questionOf(y));
    const pref = y => (y.score.inSeat ? 3 : y.candidate.source ? 2 : y.candidate.seat === 'design' ? 1 : 0);
    const near = voiced.filter(y => y.total >= voiced[0].total - 1);
    const chosen = near.length ? near.reduce((m, y) => (pref(y) > pref(m) ? y : m)) : x;
    const s = chosen.score;
    const question = questionOf(chosen);
    if (!question) { refused.push({ candidate: chosen.candidate, score: s, reason: 'no natural question for it' }); taken.add(group); continue; }
    // Keep the group's evidence: if Research backed a duplicate with its finding, the ask carries that source.
    const src = chosen.candidate.source || sourceOf.get(group);
    const c = src && !chosen.candidate.source ? { ...chosen.candidate, source: src } : chosen.candidate;
    // Spread across her work: one question per box, one per finding, and never two that say the same thing.
    if (nodeIds.includes(c.attachTo) && picks.some(p => p.candidate.attachTo === c.attachTo)) continue;
    if (c.source && picks.some(p => p.candidate.source)) continue;
    if (picks.some(p => sameQuestion(p.candidate.decision, c.decision) || sameQuestion(p.question, question, 3))) continue;
    const attachTo = nodeIds.includes(c.attachTo) ? c.attachTo : nodeIds[0] ?? null;
    const artifact = artifactFor(c, s, attachTo);
    if (spread && picks.some(p => p.artifact.kind === artifact.kind)) continue;
    // What her answer settles: this decision, its non-granular duplicates, and what the scorer named, never granular
    // and never one another ask already settles.
    const ids = [c.id, ...candidates.filter(y => groups.get(y.id) === group).map(y => y.id), ...(s.settles || [])];
    // A decision big enough to be her question on its own is never swallowed by another one (only its duplicates are).
    const ownQuestion = id => groups.get(id) !== group && clearsBar(byId.get(id), scores.get(id));
    const decisionIds = [...new Set(ids)].filter(id => byId.has(id) && !settled.has(id)
      && (id === c.id || (!isGranular(byId.get(id), scores.get(id)) && !ownQuestion(id))));
    picks.push({ candidate: c, score: s, why: whyFor(c, s), group, attachTo, question, artifact, decisionIds });
    taken.add(group);
    for (const id of decisionIds) settled.add(id);
  }
  // The order the team suggests (top note first): the shape, then the evidence, then the feel; ties by rank.
  const KIND = { journey: 0, finding: 1, wires: 2, page: 3 };
  picks.sort((a, b) => KIND[a.artifact.kind] - KIND[b.artifact.kind]);
  return { picks: picks.slice(0, cap), refused, groups };
}

// The Ask as the room reads it (CONTRACT.md, focus moments): one open question on one piece of her work.
// A question on Research's finding is Noor's to ask (it's Noor's work in front of her); on the wireframes, Mika's.
export function toAsk(p) {
  const seat = p.artifact?.kind === 'finding' ? 'research' : p.artifact?.kind === 'wires' ? 'design' : p.candidate.seat;
  return { id: p.candidate.id, seat, by: teammateName(seat), question: p.question, artifact: p.artifact,
    decisionIds: p.decisionIds };
}
const PRONOUN = /\b(he|she|they|him|her|them|his|hers|their)\b/i;
// Shape check for an Ask (tests and the dry run use it).
export function validAsk(a) {
  return !!a && typeof a.id === 'string' && typeof a.seat === 'string' && typeof a.by === 'string' && !!a.by
    && !PRONOUN.test(a.by) && !!naturalQuestion(a.question) && !!a.artifact && ARTIFACTS.includes(a.artifact.kind)
    && Array.isArray(a.decisionIds) && a.decisionIds.includes(a.id);
}

// Two decisions are the same question if they share two or more content-word stems.
const STOP = new Set(['whether', 'which', 'what', 'customer', 'customers', 'shown', 'should', 'there', 'their', 'about',
  'after', 'before', 'being', 'where', 'page', 'first', 'version']);
const stems = s => new Set((String(s).toLowerCase().match(/[a-z]{5,}/g) || []).filter(w => !STOP.has(w)).map(w => w.slice(0, 5)));
export function sameQuestion(a, b, min = 2) {
  const sa = stems(a);
  let n = 0;
  for (const w of stems(b)) if (sa.has(w)) n++;
  return n >= min;
}

// Code checks every citation: "team default", the id of a line that is in her file, or of a point the guest made (G<n>,
// only when the logged guest made it). Anything else is rejected, falls back to "team default", and is reported in `rejected`.
export function checkCitation(cites, lines) {
  const ids = new Set(asLines(lines).map(l => l.id));
  const raw = String(cites ?? '').trim();
  if (/^team default$/i.test(raw)) return { cites: 'team default' };
  const norm = raw.replace(/^\[|\]$/g, '').toUpperCase();
  if (/^[LG]\d+$/.test(norm) && ids.has(norm)) return { cites: norm };
  return { cites: 'team default', rejected: raw || '(empty)' };
}

const lineNo = id => Number(String(id).slice(1));
// Her own lines outrank the guest's points; among each, the newest.
const citeRank = id => (String(id)[0] === 'L' ? 1e6 : 0) + lineNo(id);
const newestFirst = lines => [...lines].sort((a, b) => lineNo(b.id) - lineNo(a.id));

// The model names the line that decides it (`cites`) and any other lines that would also justify the same choice
// (`alsoCites`). Code checks each against her file and, when more than one holds, cites the newest (highest L).
export function pickCitation(a, lines) {
  const valid = [a.cites, ...(Array.isArray(a.alsoCites) ? a.alsoCites : [])]
    .map(x => checkCitation(x, lines)).filter(r => !r.rejected && r.cites !== 'team default');
  if (valid.length) return { cites: valid.sort((x, y) => citeRank(y.cites) - citeRank(x.cites))[0].cites };
  return checkCitation(a.cites, lines);
}

// One call, no logging. Returns { decided: [Decided], rejected: [{ id, cited }] } covering every candidate given.
export async function decideCore(candidates, tasteLines, { idea = '', flow, callModel = realCallModel,
  model = SELECT_MODEL, effort = SELECT_EFFORT, guest = [] } = {}) {
  const her = asLines(tasteLines);
  const lines = [...her, ...guest];
  if (!candidates.length) return { decided: [], rejected: [] };
  let answers = new Map();
  try {
    const out = await callModel({
      // newest line first: the line she wrote a minute ago is the one most likely to speak to what's left
      system: prompt('decide', { IDEA: idea, FLOW: formatFlow(flow), TASTE: formatTaste(newestFirst(her)),
        GUEST: guest.length ? formatTaste(guest) : '(no guest at the table)' }),
      user: JSON.stringify(candidates.map(brief)), schema: DECIDE_SCHEMA, model, effort,
    });
    for (const d of out.decisions || []) if (d && !answers.has(d.id)) answers.set(d.id, d);
  } catch { answers = new Map(); } // the model failed: every one falls back to the team default below
  const decided = [], rejected = [];
  for (const c of candidates) {
    const a = answers.get(c.id);
    const choice = a && c.options.includes(a.choice) ? a.choice : c.recommendation;
    const chk = a ? pickCitation(a, lines) : { cites: 'team default' };
    if (chk.rejected) rejected.push({ id: c.id, cited: chk.rejected });
    decided.push({ id: c.id, seat: c.seat, decision: c.decision, choice, cites: chk.cites });
  }
  return { decided, rejected };
}

// Decide every candidate given, her way, and log it. Piece 4's build calls this again after her file changes, so a
// decision can cite a line she wrote a minute ago:
//   decideRest(loadRest(run), readTaste(run), { run, idea, round: 'build' })
// opts: { run (logs `decided` and `cite.rejected`), idea, flow, round, callModel, model, effort }.
export async function decideRest(candidates, tasteLines, opts = {}) {
  const { run, round = 'select' } = opts;
  if (run) { const hers = settledByHer(run); candidates = candidates.filter(c => !hers.has(c.id)); }
  const { decided, rejected } = await decideCore(candidates, tasteLines, { guest: guestLinesFor(run), ...opts });
  if (run) {
    const follows = new Map(readEvents(run).filter(e => e.type === 'decided' && e.follows).map(e => [e.id, e.follows]));
    for (const r of rejected) logEvent(run, 'cite.rejected', { id: r.id, cited: r.cited, fallback: 'team default' });
    for (const d of decided) logEvent(run, 'decided', { ...d, ...(follows.has(d.id) ? { follows: follows.get(d.id) } : {}), round });
  }
  return decided;
}

// What she settled herself in a focus moment (lib/interpret.js logs answer.mapped): hers, never re-decided.
export function settledByHer(run, evs = readEvents(run)) {
  return new Set(evs.filter(e => e.type === 'answer.mapped').flatMap(m => (m.decisions || []).map(d => d?.id)).filter(Boolean));
}

// The candidates the team still decides at Build, read back from the log: not brought to her, not settled by her
// answers (answer.mapped), and not already agreed in a team-space exchange (decided, round 'joint').
export function loadRest(run) {
  const evs = readEvents(run);
  const asked = new Set(evs.filter(e => e.type === 'ask').map(e => e.id));
  const hers = settledByHer(run, evs);
  // Talked out and agreed in the team space (lib/joint.js): the team's agreement stands, never re-decided at Build.
  const agreed = new Set(evs.filter(e => e.type === 'decided' && e.round === 'joint').map(e => e.id));
  return evs.filter(e => e.type === 'candidate' && !asked.has(e.id) && !hers.has(e.id) && !agreed.has(e.id))
    .map(({ t, run: _r, type, pane, mode, ...c }) => c);
}

// Score and decide in parallel (saves a round trip), then apply the rules and log, in order:
// ask.refused + decided for refused picks, ask for each pick (through the policy), decided for the rest, select.done.
// A decided duplicate of one of her asks carries `follows: <ask id>` (her answer settles it).
// decideAfter (the close): return once her questions are logged; the team's decisions finish and log in the
// background (`pending` resolves when they have, with select.done last). Everything not asked is still decided.
export async function select({ run, idea, flow, taste, herSeat = 'product', herTag = null, profile, intro, candidates,
  callModel = realCallModel, model = SELECT_MODEL, effort = SELECT_EFFORT, max = MAX_ASKS, decideAfter = false }) {
  const t0 = Date.now();
  const lines = asLines(taste);
  const scoreP = scoreCandidates({ run, idea, flow, taste: lines, herSeat, herTag, profile, intro, candidates, callModel, model, effort })
    .catch(() => new Map());
  const decP = decideCore(candidates, lines, { idea, flow, callModel, model, effort, guest: guestLinesFor(run) });
  const later = decideAfter && !!run;
  const [scores, dec0] = later ? [await scoreP, null] : await Promise.all([scoreP, decP]);
  const { picks, refused } = pickAsks(candidates, scores, { max, flow, herSeat });
  // A decision one of her questions settles carries `follows: <ask id>` (her answer decides it at Build).
  const askOf = new Map(picks.flatMap(p => p.decisionIds.map(id => [id, p.candidate.id])));
  const withFollow = d => {
    const a = askOf.get(d.id);
    return a && a !== d.id ? { ...d, follows: a } : d;
  };
  const asks = [];
  const decided = [];
  if (!run) {
    asks.push(...picks.map(p => ({ ...p.candidate, ...toAsk(p), kind: p.score.kind, why: p.why, attachTo: p.attachTo })));
    const pickIds = new Set(asks.map(a => a.id));
    decided.push(...dec0.decided.filter(d => !pickIds.has(d.id)).map(withFollow));
    return { asks, decided, refused, rejected: dec0.rejected, scores, ms: Date.now() - t0 };
  }
  // Without the team's decisions yet (decideAfter), a refused pick is decided on the team default, as policy does.
  const decById = new Map((dec0?.decided || []).map(d => [d.id, d]));
  for (const r of refused) decided.push(refuse(run, r.candidate, r.reason, decById.get(r.candidate.id)));
  const grant = mintGrant(run, picks.map(p => p.candidate.id));
  for (const p of picks) {
    const s = p.score;
    // The Ask (question, by, artifact, decisionIds) rides on the candidate; its options stay in the log for the
    // interpret call and the build, never shown to her as choices.
    const a = ask(run, { ...p.candidate, ...toAsk(p) }, { grant, kind: s.kind, why: p.why, attachTo: p.attachTo,
      source: 'selector', decided: decById.get(p.candidate.id),
      score: { inSeat: s.inSeat, big: s.big, hers: s.hers, changes: s.changes, silent: s.silent, total: total(p.candidate, s) } });
    if (a) asks.push(a); else decided.push({ ...decById.get(p.candidate.id), refused: true }); // policy logged it
  }
  const askedAt = Date.now() - t0;
  const finish = dec => {
    for (const r of dec.rejected) logEvent(run, 'cite.rejected', { id: r.id, cited: r.cited, fallback: 'team default' });
    const done = new Set([...asks.map(a => a.id), ...decided.map(d => d.id)]);
    for (const d of dec.decided) if (!done.has(d.id)) decided.push(logEvent(run, 'decided', { ...withFollow(d), round: 'select' }));
    logEvent(run, 'select.done', { came: candidates.length, brought: asks.length, ms: Date.now() - t0, askedMs: askedAt });
    return decided;
  };
  if (later) {
    const pending = decP.then(finish);
    return { asks, decided, pending, refused, rejected: [], scores, ms: askedAt };
  }
  finish(dec0);
  return { asks, decided, refused, rejected: dec0.rejected, scores, ms: Date.now() - t0 };
}

// Steps 2 and 3 end to end: five teammates, then the selector.
export async function proposeAndSelect({ run, idea, flow, taste, herSeat = 'product', herTag = null, callModel = realCallModel,
  teamModel, selectModel, teamEffort, selectEffort, count, seats, decideAfter = false }) {
  const t0 = Date.now();
  const team = await propose({ run, idea, flow, taste, herSeat, herTag, callModel, count, seats,
    ...(teamModel ? { model: teamModel } : {}), ...(teamEffort ? { effort: teamEffort } : {}) });
  const sel = await select({ run, idea, flow, taste, herSeat, herTag, candidates: team.candidates, callModel, decideAfter,
    ...(selectModel ? { model: selectModel } : {}), ...(selectEffort ? { effort: selectEffort } : {}) });
  return { candidates: team.candidates, teamTimings: team.timings, teamMs: team.ms, ...sel, selectMs: sel.ms,
    totalMs: Date.now() - t0 };
}

// The close's fast path: a judge's idea (and optional journey lines) -> a fresh, logged run -> the three asks and the
// counter, in seconds. Fewer candidates per seat than the full run (FAST_COUNT, default 2: measured 10.8 s vs 18.9 s for 3) for the close.
// opts: { run (else one is made), callModel, count, teamModel, selectModel }.
export async function selectForIdea(idea, flowLines = [], opts = {}) {
  const run = opts.run || newRunId(`judge-${Math.random().toString(36).slice(2, 6)}`); // ms ids can collide
  const taste = initTaste(run);
  logEvent(run, 'run.start', { pane: 'sheet', mode: 'craft', idea, seat: 'product', fast: true });
  for (let i = 0; i < flowLines.length; i++) {
    const f = parseFlow(flowLines.slice(0, i + 1));
    logEvent(run, 'flow.line', { pane: 'flow', mode: 'craft', text: flowLines[i], nodes: f.nodes, edges: f.edges });
  }
  // Her questions come back as soon as they are logged; the team's decisions keep logging behind (`pending`).
  // The close reads only asks, came and brought: everything not asked is decided, whenever that call lands.
  const r = await proposeAndSelect({ run, idea, flow: parseFlow(flowLines), taste, callModel: opts.callModel,
    count: opts.count ?? Number(process.env.FAST_COUNT || 2), teamModel: opts.teamModel, selectModel: opts.selectModel,
    decideAfter: opts.decideAfter ?? true });
  const out = { run, asks: r.asks, came: r.candidates.length, brought: r.asks.length, decided: r.decided,
    ms: { team: r.teamMs, select: r.selectMs, total: r.totalMs } };
  if (r.pending) Object.defineProperty(out, 'pending', { value: r.pending.catch(() => {}), enumerable: false });
  return out;
}
