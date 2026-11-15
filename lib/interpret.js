// Her answer in a focus moment, heard properly (CONTRACT.md, "Focus moments seams"). The team reacts out loud as a
// meeting thread (lib/thread.js, 3-4 turns, first line in about a second). Alongside, one call maps her words onto
// the decisions the question settles (each choice one of its options) and writes this meeting's takeaways (what I
// believe about this / guidance to the team for it) in her voice, logged after the thread: chime per turn, then the
// takeaways, then answer.mapped. saveTakeaways() keeps them: her hidden file and her profile's philosophy grow.
import { gatherPieces } from './tidy.js';
import { callModel as realCallModel, scrub } from './model.js';
import { logEvent, readEvents } from './events.js';
import { prompt, formatFlow, SEATS, STANCES } from './teammates.js';
import { formatTaste, readTaste, writeLine, cleanRule } from './taste.js';
import { parseFlow } from './flow.js';
import { currentLines, reshape } from './sketch.js';
import { readProfile, formatProfile, updateProfile, addPhilosophy } from './profile.js';
import { runThread } from './thread.js';

export const INTERPRET_MODEL = process.env.INTERPRET_MODEL || 'opus'; // a judgement call: her takeaways (A/B 15 Nov)
export const INTERPRET_EFFORT = process.env.INTERPRET_EFFORT || 'low';
export const CHIME_GAP_MS = Number(process.env.CHIME_GAP_MS ?? 1000);
// The team's names (BRIEF §2: names only, never pronouns). Product's teammate goes by its seat.
export const NAMES = { design: 'Mika', research: 'Wren', data: 'Theo', strategy: 'Ines', engineering: 'Bo', product: 'Product' };
const SEAT_NAME = { product: 'Product', design: 'Design', data: 'Data', research: 'Research', strategy: 'Strategy', engineering: 'Engineering' };

export const INTERPRET_SCHEMA = {
  type: 'object',
  properties: {
    decisions: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, choice: { type: 'string' } }, required: ['id', 'choice'] } },
    takeaways: { type: 'object', properties: { believe: { type: 'string' }, guidance: { type: 'string' } }, required: ['believe', 'guidance'] },
  },
  required: ['decisions', 'takeaways'],
};

const sleep = ms => (ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve());
const clip = (s, n) => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, n);
const norm = s => String(s ?? '').trim().toLowerCase().replace(/[.!]+$/, '');

// The team at her table: every seat but hers.
export const teamFor = herSeat => SEATS.filter(s => s !== herSeat);

// Code, not the model, owns: decisions only from this question, each choice exactly one of its options; chimes only
// from her teammates, at most two, never a question and never addressed to her; the takeaways' two parts, clipped.
export function cleanInterpret(raw, { cands, herSeat }) {
  const byId = new Map(cands.map(c => [c.id, c]));
  const seen = new Set();
  const decisions = [];
  for (const d of raw?.decisions || []) {
    const c = byId.get(d?.id);
    if (!c || seen.has(c.id)) continue;
    const choice = (c.options || []).find(o => norm(o) === norm(d.choice));
    if (!choice) continue; // not one of its options: the team decides it at the build
    seen.add(c.id);
    decisions.push({ id: c.id, seat: c.seat, decision: c.decision, choice });
  }
  const team = new Set(teamFor(herSeat));
  const chimes = [];
  for (const ch of raw?.chimes || []) {
    const seat = String(ch?.seat || '').toLowerCase().trim();
    const text = clip(ch?.text, 220).replace(/^["“]|["”]$/g, '');
    if (!team.has(seat) || !text || /\?/.test(text) || /\byou(r|'re|’re)?\b/i.test(text)) continue;
    if (chimes.some(x => x.seat === seat)) continue;
    chimes.push({ by: NAMES[seat], seat, text });
    if (chimes.length === 2) break;
  }
  const b = raw?.takeaways || {};
  const takeaways = { believe: clip(cleanRule(b.believe), 200), guidance: clip(b.guidance, 400) };
  return { decisions, chimes, takeaways };
}

function candidates(evs, ids) {
  const latest = new Map();
  for (const e of evs) if (e.type === 'candidate') latest.set(e.id, e);
  return (ids || []).map(id => latest.get(id)).filter(Boolean);
}

// POST /api/run/:id/answer { askId, text }. Returns { code, body }; `body.profile` is a promise (the profile update
// runs after the events are out; tests await it).
// pieces: the ids of the pieces she captured (lib/tidy.js); Send gathers them, the tidy where it's ready, her raw
// words where it isn't. `text` alone is her comment as typed (and, with pieces, whatever she hadn't added yet).
export async function interpret({ run, askId, text, pieces, callModel = realCallModel, gapMs = CHIME_GAP_MS, redraw = true, thread = true }) {
  if (!(Array.isArray(pieces) && pieces.length) && !clip(text, 2000)) return { code: 400, body: { error: 'text required' } };
  let evs = readEvents(run);
  const ask = evs.find(e => e.type === 'ask' && e.id === askId);
  if (!ask) return { code: 404, body: { error: 'no such ask' } };
  // Her answer is logged once. A resend (her Retry after a failure or a long silence) re-reads that same gathered
  // comment; it never logs a second answer. 409 once the team has heard it; 202 while it is still being heard.
  const key = `${run}\u0000${askId}`;
  const prior = evs.find(e => e.type === 'answer' && e.askId === askId);
  if (prior && evs.some(e => e.type === 'answer.mapped' && e.askId === askId)) return { code: 409, body: { error: 'already answered' } };
  if (prior && inflight.has(key)) return { code: 202, body: { pending: true } };
  if (prior) {
    inflight.add(key);
    try { return await hear({ run, askId, ask, evs, text: prior.text, callModel, gapMs, redraw: false, thread: thread && !evs.some(e => e.type === 'chime' && e.askId === askId), retry: true }); }
    finally { inflight.delete(key); }
  }
  let gathered = null;
  if (Array.isArray(pieces) && pieces.length) {
    const rest = clip(text, 2000);
    const ids = pieces.map(String);
    if (rest) { const pieceId = 'p-send'; logEvent(run, 'answer.piece', { pane: 'doc', askId, pieceId, text: rest }); ids.push(pieceId); evs = readEvents(run); }
    gathered = gatherPieces(evs, askId, ids);
    text = gathered.text;
  }
  text = clip(text, 2000);
  if (!text) return { code: 400, body: { error: 'text required' } };
  logEvent(run, 'answer', { pane: 'doc', mode: 'craft', askId, text, ...(gathered ? { pieces: gathered.pieces } : {}) });
  inflight.add(key);
  try { return await hear({ run, askId, ask, evs, text, callModel, gapMs, redraw, thread }); }
  finally { inflight.delete(key); }
}
const inflight = new Set(); // run + askId being heard right now

async function hear({ run, askId, ask, evs, text, callModel, gapMs, redraw, thread, retry = false }) {
  if (retry) logEvent(run, 'answer.retry', { pane: 'doc', askId });
  const start = evs.find(e => e.type === 'run.start') || {};
  const herSeat = start.seat || 'product';

  const cands = candidates(evs, ask.decisionIds || []);
  const flow = parseFlow(currentLines(evs));
  const team = teamFor(herSeat).map(s => `- ${NAMES[s]}, ${SEAT_NAME[s]}: ${STANCES[s]}`).join('\n');
  const decisionsText = cands.length
    ? cands.map(c => `- ${c.id} (${SEAT_NAME[c.seat] || c.seat}): ${c.decision}. Options: ${c.options.map(o => `"${o}"`).join(', ')}`).join('\n')
    : '(none: just hear her, react and write the takeaways)';
  const artifact = ask.artifact?.kind ? `${ask.artifact.kind}${ask.artifact.ref ? ' (' + ask.artifact.ref + ')' : ''}` : 'her work';
  const system = prompt('interpret', {
    IDEA: start.idea || '', FLOW: formatFlow(flow), TASTE: formatTaste(readTaste(run)), PROFILE: formatProfile(readProfile(run)),
    ASKED_BY: ask.by ? `${ask.by}, ${SEAT_NAME[ask.seat] || ask.seat}` : SEAT_NAME[ask.seat] || 'the team',
    QUESTION: ask.question || ask.decision || '', ARTIFACT: artifact, DECISIONS: decisionsText, TEAM: team,
  });
  // When the question is about her journey, the journey redraws from her words while the team hears her (same time).
  const redrawing = redraw && ask.artifact?.kind === 'journey' && currentLines(evs).length
    ? reshape({ run, text, callModel, asAnswer: askId }).catch(() => null) : null;
  const t0 = Date.now();
  // The meeting thread starts the moment she submits (lib/thread.js); the takeaways and the mapping run alongside it
  // and are logged after it, so they never interrupt the team talking.
  const talking = thread ? runThread({ run, ask, text, callModel, gapMs, t0 }).catch(() => []) : Promise.resolve([]);
  let out, failed = null;
  try {
    out = cleanInterpret(await callModel({ system, user: `Her answer, in her words: "${text}"`, schema: INTERPRET_SCHEMA,
      model: INTERPRET_MODEL, effort: INTERPRET_EFFORT }), { cands, herSeat });
  } catch (e) { failed = scrub(e.message).slice(0, 200); }
  const ms = Date.now() - t0;
  const chimes = await talking;
  if (failed) {
    logEvent(run, 'interpret.error', { askId, error: failed, ms });
    return { code: 502, body: { error: failed, chimes, profile: Promise.resolve(null) } };
  }
  const takeaways = out.takeaways.believe ? logEvent(run, 'takeaways', { pane: 'doc', askId, ...out.takeaways }) : null;
  logEvent(run, 'answer.mapped', { pane: 'doc', askId, decisions: out.decisions, ms });
  if (redrawing) await redrawing;
  const profile = updateProfile(run, { question: ask.question || ask.decision, answer: text }, { callModel }).catch(() => null);
  return { code: 200, body: { chimes, takeaways: takeaways && out.takeaways, decisions: out.decisions, ms, profile } };
}

// POST /api/run/:id/takeaways { askId, believe, guidance } (also /brief): this meeting's takeaways as she keeps them.
// Her philosophy is the team's to keep, never shown unless she asks: "what I believe" becomes the next line of her
// hidden file (taste.md, so later decisions can cite it) and joins her profile's philosophy. reworded = she changed
// the team's words.
export function saveTakeaways({ run, askId, believe, guidance }) {
  const text = cleanRule(believe);
  if (!text) return { code: 400, body: { error: 'believe required' } };
  const evs = readEvents(run);
  const logged = evs.findLast(e => e.type === 'takeaways' && e.askId === askId);
  if (askId && !logged && !evs.some(e => e.type === 'ask' && e.id === askId)) return { code: 404, body: { error: 'no such ask' } };
  const line = writeLine(run, text);
  const reworded = !logged || norm(cleanRule(logged.believe)) !== norm(line.text);
  const g = clip(guidance ?? logged?.guidance, 400);
  addPhilosophy(run, { id: line.id, believe: line.text, guidance: g, askId: askId || null });
  logEvent(run, 'taste.written', { pane: 'file', mode: 'craft', id: line.id, text: line.text, reworded, askId: askId || null, guidance: g, hidden: true });
  return { code: 200, body: line };
}
export const saveBrief = saveTakeaways; // the contract's first name for it
