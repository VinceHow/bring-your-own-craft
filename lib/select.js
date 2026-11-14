// The selector. One model call scores every candidate; code applies the rules: at most 3 asks, out of her seat only
// if costly or not undoable, nothing her file already decides. Everything else is decided by decideRest(), citing a
// line of her file or "team default"; code rejects a citation to a line that isn't there.
import { callModel as realCallModel } from './model.js';
import { logEvent, readEvents, newRunId } from './events.js';
import { MAX_ASKS, claimGrantor, ask, refuse } from './policy.js';
import { parseFlow } from './flow.js';
import { prompt, formatFlow, propose } from './teammates.js';
import { formatTaste, asLines, initTaste } from './taste.js';
import { guestLinesFor } from './guest.js';

// Chosen by measurement (docs/dry-runs/timings.md). Low effort skips thinking: about 7 s instead of 17 s to score.
export const SELECT_MODEL = process.env.SELECT_MODEL || 'sonnet';
export const SELECT_EFFORT = process.env.SELECT_EFFORT || 'low';

// Only the selector can mint grants to ask her: claimed here, once, as this module loads.
const mintGrant = claimGrantor();

export const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }, changes: { type: 'integer' }, silent: { type: 'integer' }, expertise: { type: 'integer' },
          dupOf: { type: ['string', 'null'] }, kind: { type: 'string', enum: ['fork', 'pin'] },
        },
        required: ['id', 'changes', 'silent', 'dupOf', 'kind'], // expertise asked for in the prompt; defaults to 2 if absent
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
  reason: c.reason, cost: c.cost, undoable: c.undoable, attachTo: c.attachTo, ...(c.source ? { source: c.source.title } : {}) });
const clamp = n => Math.max(0, Math.min(3, Math.round(Number(n) || 0)));

// One call: scores keyed by candidate id.
export async function scoreCandidates({ idea, flow, taste, herSeat = 'product', candidates, callModel = realCallModel,
  model = SELECT_MODEL, effort = SELECT_EFFORT }) {
  const system = prompt('select', { HER_SEAT: herSeat, IDEA: idea, FLOW: formatFlow(flow), TASTE: formatTaste(asLines(taste)) });
  const out = await callModel({ system, user: JSON.stringify(candidates.map(brief)), schema: SCORE_SCHEMA, model, effort });
  const byId = new Map();
  for (const s of out.scores || []) {
    if (!s || byId.has(s.id)) continue;
    const { inSeat: _ignored, ...rest } = s; // seat is code's call (pickAsks), never the model's
    // expertise defaults to 2 (passes the bar) when a scorer leaves it out, so older fixtures keep their meaning
    byId.set(s.id, { ...rest, changes: clamp(s.changes), silent: clamp(s.silent), expertise: clamp(s.expertise ?? 2) });
  }
  return byId;
}

// Ranking: in her seat counts double; a question Research can back with its finding comes with the thinking done,
// whichever teammate raised it (sourced = the candidate or a duplicate of it carries the finding).
export const total = (c, s, sourced = !!c.source) => (s.inSeat ? 2 : 0) + s.changes + s.silent + (sourced ? 1 : 0);

// Why it made the cut, said from the scores (code, not the model, so it is exactly what the rules used).
export function whyFor(c, s) {
  const seat = s.inSeat ? 'In your seat' : c.undoable === false ? 'Outside your seat but hard to undo' : 'Outside your seat but costly to change';
  const change = ['', 'changes a little of what customers get', 'changes what customers get', 'changes the journey itself'][s.changes];
  const file = s.silent >= 3 ? 'your file says nothing on it' : 'your file barely touches it';
  return [seat, change, file].filter(Boolean).join('; ') + (c.source ? `; backed by ${c.source.title}` : '') + '.';
}

// Pure: the rules. Returns { picks: [{ candidate, score, why, group }], refused: [{ candidate, score, reason }],
// groups: Map(id -> group id) }. A candidate is only considered if the scorer scored it, it changes the build
// (changes >= 1) and her file is not already deciding it (silent >= 1). Out of her seat it qualifies only if
// cost === 'high' or undoable === false; a cheap, undoable one that would otherwise have made the cut is refused.
// Duplicates (dupOf) form one group; a group is asked once, through its member from her own seat if it has one.
// Never more than MAX_ASKS picks, whatever `max` says.
export function pickAsks(candidates, scores, { max = MAX_ASKS, flow, herSeat = 'product' } = {}) {
  const cap = Math.max(0, Math.min(Number.isFinite(max) ? max : MAX_ASKS, MAX_ASKS));
  const nodeIds = (flow?.nodes || []).map(n => n.id);
  const order = new Map(candidates.map((c, i) => [c.id, i]));
  const groups = new Map();
  for (const c of candidates) {
    const d = scores.get(c.id)?.dupOf;
    groups.set(c.id, d && d !== c.id && order.has(d) ? (groups.get(d) || d) : c.id);
  }
  const sourcedGroups = new Set(candidates.filter(c => c.source).map(c => groups.get(c.id)));
  const ranked = candidates
    // "In her seat" is a fact about who raised it, decided in code; the model's scores never set it.
    .map(c => ({ candidate: c, score: scores.has(c.id) ? { ...scores.get(c.id), inSeat: c.seat === herSeat } : null }))
    // The bar (po/tray): bring it only if her answer changes what gets built AND needs her expertise.
    .filter(x => x.score && x.score.changes >= 1 && x.score.silent >= 1 && (x.score.expertise ?? 2) >= 2)
    .map(x => ({ ...x, sourced: sourcedGroups.has(groups.get(x.candidate.id)) }))
    .map(x => ({ ...x, total: total(x.candidate, x.score, x.sourced) }))
    // Ties: her seat first, then the one that comes with evidence, then the bigger change, then the team's order.
    .sort((a, b) => b.total - a.total || Number(b.score.inSeat) - Number(a.score.inSeat)
      || Number(b.sourced) - Number(a.sourced)
      || b.score.changes - a.score.changes || order.get(a.candidate.id) - order.get(b.candidate.id));
  const picks = [], refused = [];
  const taken = new Set();
  for (const x of ranked) {
    if (picks.length >= cap) break;
    const group = groups.get(x.candidate.id);
    if (taken.has(group)) continue;
    // Within a group, bring it through her own seat's member when that member is eligible too.
    const own = ranked.find(y => groups.get(y.candidate.id) === group && y.candidate.seat === herSeat);
    const chosen = own && own.total >= x.total - 1 ? own : x;
    const s = chosen.score;
    // Keep the group's evidence: if Research backed a duplicate with its finding, the ask carries that source.
    const src = chosen.candidate.source || ranked.find(y => groups.get(y.candidate.id) === group && y.candidate.source)?.candidate.source;
    const c = src && !chosen.candidate.source ? { ...chosen.candidate, source: src } : chosen.candidate;
    if (!s.inSeat && !(c.cost === 'high' || c.undoable === false)) {
      refused.push({ candidate: c, score: s, reason: 'out of her seat, cheap and undoable' });
      taken.add(group);
      continue;
    }
    // Spread across her work: one question per box, and never two that say the same thing in other words
    // (the scorer misses some duplicates; measured in docs/dry-runs).
    if (nodeIds.includes(c.attachTo) && picks.some(p => p.candidate.attachTo === c.attachTo)) continue;
    if (picks.some(p => sameQuestion(p.candidate.decision, c.decision))) continue;
    const attachTo = nodeIds.includes(c.attachTo) ? c.attachTo : nodeIds[0] ?? null;
    picks.push({ candidate: c, score: s, why: whyFor(c, s), group, attachTo });
    taken.add(group);
  }
  return { picks: picks.slice(0, cap), refused, groups };
}

// Two decisions are the same question if they share two or more content-word stems.
const STOP = new Set(['whether', 'which', 'what', 'customer', 'customers', 'shown', 'should', 'there', 'their', 'about',
  'after', 'before', 'being', 'where', 'page', 'first', 'version']);
const stems = s => new Set((String(s).toLowerCase().match(/[a-z]{5,}/g) || []).filter(w => !STOP.has(w)).map(w => w.slice(0, 5)));
export function sameQuestion(a, b) {
  const sa = stems(a);
  let n = 0;
  for (const w of stems(b)) if (sa.has(w)) n++;
  return n >= 2;
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
  const { decided, rejected } = await decideCore(candidates, tasteLines, { guest: guestLinesFor(run), ...opts });
  if (run) {
    const follows = new Map(readEvents(run).filter(e => e.type === 'decided' && e.follows).map(e => [e.id, e.follows]));
    for (const r of rejected) logEvent(run, 'cite.rejected', { id: r.id, cited: r.cited, fallback: 'team default' });
    for (const d of decided) logEvent(run, 'decided', { ...d, ...(follows.has(d.id) ? { follows: follows.get(d.id) } : {}), round });
  }
  return decided;
}

// The candidates that were not brought to her, read back from the log (for the build's re-decide).
export function loadRest(run) {
  const evs = readEvents(run);
  const asked = new Set(evs.filter(e => e.type === 'ask').map(e => e.id));
  return evs.filter(e => e.type === 'candidate' && !asked.has(e.id))
    .map(({ t, run: _r, type, pane, mode, ...c }) => c);
}

// Score and decide in parallel (saves a round trip), then apply the rules and log, in order:
// ask.refused + decided for refused picks, ask for each pick (through the policy), decided for the rest, select.done.
// A decided duplicate of one of her asks carries `follows: <ask id>` (her answer settles it).
export async function select({ run, idea, flow, taste, herSeat = 'product', candidates, callModel = realCallModel,
  model = SELECT_MODEL, effort = SELECT_EFFORT, max = MAX_ASKS }) {
  const t0 = Date.now();
  const lines = asLines(taste);
  const [scores, dec] = await Promise.all([
    scoreCandidates({ idea, flow, taste: lines, herSeat, candidates, callModel, model, effort }).catch(() => new Map()),
    decideCore(candidates, lines, { idea, flow, callModel, model, effort, guest: guestLinesFor(run) }),
  ]);
  const { picks, refused, groups } = pickAsks(candidates, scores, { max, flow, herSeat });
  const decById = new Map(dec.decided.map(d => [d.id, d]));
  const askOf = new Map(picks.map(p => [p.group, p.candidate.id]));
  const withFollow = d => {
    const a = askOf.get(groups.get(d.id));
    return a && a !== d.id ? { ...d, follows: a } : d;
  };
  const asks = [];
  const decided = [];
  if (run) {
    for (const r of dec.rejected) logEvent(run, 'cite.rejected', { id: r.id, cited: r.cited, fallback: 'team default' });
    for (const r of refused) decided.push(refuse(run, r.candidate, r.reason, decById.get(r.candidate.id)));
    const grant = mintGrant(run, picks.map(p => p.candidate.id));
    for (const p of picks) {
      const s = p.score;
      const a = ask(run, p.candidate, { grant, kind: s.kind, why: p.why, attachTo: p.attachTo, source: 'selector',
        decided: decById.get(p.candidate.id), score: { inSeat: s.inSeat, changes: s.changes, silent: s.silent, total: total(p.candidate, s) } });
      if (a) asks.push(a); else decided.push({ ...decById.get(p.candidate.id), refused: true }); // policy logged it
    }
    const done = new Set([...asks.map(a => a.id), ...decided.map(d => d.id)]);
    for (const d of dec.decided) if (!done.has(d.id)) decided.push(logEvent(run, 'decided', { ...withFollow(d), round: 'select' }));
    logEvent(run, 'select.done', { came: candidates.length, brought: asks.length, ms: Date.now() - t0 });
  } else {
    asks.push(...picks.map(p => ({ ...p.candidate, kind: p.score.kind, why: p.why, attachTo: p.attachTo })));
    const pickIds = new Set(asks.map(a => a.id));
    decided.push(...dec.decided.filter(d => !pickIds.has(d.id)).map(withFollow));
  }
  return { asks, decided, refused, rejected: dec.rejected, scores, ms: Date.now() - t0 };
}

// Steps 2 and 3 end to end: five teammates, then the selector.
export async function proposeAndSelect({ run, idea, flow, taste, herSeat = 'product', callModel = realCallModel,
  teamModel, selectModel, teamEffort, selectEffort, count, seats }) {
  const t0 = Date.now();
  const team = await propose({ run, idea, flow, taste, herSeat, callModel, count, seats,
    ...(teamModel ? { model: teamModel } : {}), ...(teamEffort ? { effort: teamEffort } : {}) });
  const sel = await select({ run, idea, flow, taste, herSeat, candidates: team.candidates, callModel,
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
  const r = await proposeAndSelect({ run, idea, flow: parseFlow(flowLines), taste, callModel: opts.callModel,
    count: opts.count ?? Number(process.env.FAST_COUNT || 2), teamModel: opts.teamModel, selectModel: opts.selectModel });
  return { run, asks: r.asks, came: r.candidates.length, brought: r.asks.length, decided: r.decided,
    ms: { team: r.teamMs, select: r.selectMs, total: r.totalMs } };
}
