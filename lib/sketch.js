// Design's first sketch and her reshape: who the users are, and the stages they go through. Stages go through
// parseFlow exactly as her typed journey lines did, so they become flow.line events (and boxes).
//
// firstSketch({ run, idea })   one fast call; over SKETCH_LIMIT_MS or on error, the prepared yoga sketch (PREPARED).
// reshape({ run, text })       her reaction -> one call -> the redrawn shape, replacing the flow (flow.reset first).
// editFlow({ run, lines })     her direct box edit (rename, add, strike), no model.
// sketchForIdea(idea)          the close: the judge's idea -> a sketch, no run logged.
// currentLines(events)         the journey lines now on her sheet (after the last flow.reset).
// installLean()                emits `lean` when a teammate's candidate attaches to a box she touched.
import fs from 'node:fs';
import path from 'node:path';
import { callModel as realCallModel, scrub } from './model.js';
import { logEvent, readEvents, onEvent } from './events.js';
import { parseFlow, cleanLabel, normLabel } from './flow.js';
import { prompt, findingFor as researchFor } from './teammates.js';
import { askGuest, logGuest, settle, GUEST_ON } from './guest.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// Measured Sat 14 Nov (yoga idea, 3 calls each): haiku ~2.4 s, sonnet at low effort ~2.3 s with tighter labels.
export const SKETCH_MODEL = process.env.SKETCH_MODEL || 'sonnet';
export const SKETCH_EFFORT = process.env.SKETCH_EFFORT || 'low';
export const SKETCH_LIMIT_MS = Number(process.env.SKETCH_LIMIT_MS || 12000);
// The model returns the whole shape at once; it is drawn in one piece at a time so it reads as arriving.
export const DRIP_MS = Number(process.env.SKETCH_DRIP_MS ?? 220);

export const SHAPE_SCHEMA = {
  type: 'object',
  properties: {
    users: { type: 'array', items: { type: 'string' } },
    stages: { type: 'array', items: { type: 'string' } },
  },
  required: ['users', 'stages'],
};

const sleep = ms => (ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve());
const ARROW = /\s*(?:→|->|⟶|➔)\s*/;

export function currentLines(evs) {
  const i = evs.findLastIndex(e => e.type === 'flow.reset');
  return evs.slice(i + 1).filter(e => e.type === 'flow.line').map(e => e.text);
}
// The user types now on her sheet: the latest set Design drew (a reshape replaces them).
export function currentUsers(evs) {
  const i = evs.findLastIndex(e => e.type === 'reshape' && evs.slice(evs.indexOf(e)).some(x => x.type === 'sketch.user'));
  return evs.slice(i + 1).filter(e => e.type === 'sketch.user').map(e => e.label);
}

// Code, not the model, owns the limits: 2-4 users, 4-7 main stages plus at most two branch lines, short labels.
export function cleanShape(raw) {
  const seen = new Set();
  const users = (raw?.users || []).map(cleanLabel).filter(u => u && !seen.has(u.toLowerCase()) && seen.add(u.toLowerCase()))
    .slice(0, 4);
  const stages = [];
  let main = 0, branches = 0;
  for (const s of raw?.stages || []) {
    const parts = String(s ?? '').split(ARROW).map(cleanLabel).filter(Boolean);
    if (!parts.length) continue;
    if (parts.length > 1 && stages.length) { if (branches < 2) { stages.push(parts.join(' → ')); branches++; } continue; }
    if (main >= 7) continue;
    stages.push(parts.join(' → '));
    main += parts.length;
  }
  if (!users.length || main < 2) throw new Error('sketch too thin');
  return { users, stages };
}

// Prepared sketches, shown labelled PREPARED only when the live one fails or is slow: the yoga idea and the bakery.
const PREPARED = [[/\byoga\b/i, 'prepared-sketch-yoga.json'], [/bak(e|er|ery|ing)|bread|loaf|sourdough/i, 'prepared-sketch-bakery.json']];
export function preparedFor(idea) {
  const hit = PREPARED.find(([re, f]) => re.test(String(idea || '')) && fs.existsSync(path.join(ROOT, 'data', f)));
  if (!hit) return null;
  const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', hit[1]), 'utf8'));
  return { users: p.users, stages: p.stages };
}

function withLimit(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`over ${ms / 1000} s`)), ms); })])
    .finally(() => clearTimeout(t));
}

async function askDesign({ system, user, callModel, limitMs }) {
  const raw = await withLimit(callModel({ system, user, schema: SHAPE_SCHEMA, model: SKETCH_MODEL, effort: SKETCH_EFFORT,
    timeoutMs: limitMs }), limitMs);
  return cleanShape(raw);
}

// Users first, then each stage as a journey line, one at a time.
async function drawShape(run, shape, { dripMs, extra = {} }) {
  const users = shape.users.map((label, i) => ({ id: `u${i + 1}`, label }));
  for (const u of users) { logEvent(run, 'sketch.user', { pane: 'flow', seat: 'design', ...u, ...extra }); await sleep(dripMs); }
  let flow = { nodes: [], edges: [] };
  for (let i = 0; i < shape.stages.length; i++) {
    flow = parseFlow(shape.stages.slice(0, i + 1));
    logEvent(run, 'flow.line', { pane: 'flow', seat: 'design', by: 'design', text: shape.stages[i], nodes: flow.nodes, edges: flow.edges, ...extra });
    if (i < shape.stages.length - 1) await sleep(dripMs);
  }
  return { users, stages: shape.stages, ...flow };
}

// Labels in `next` that weren't on her sheet before: the boxes her change touched.
function touchedLabels(prevLines, nextLines) {
  const before = new Set(parseFlow(prevLines).nodes.map(n => normLabel(n.label)));
  return parseFlow(nextLines).nodes.map(n => n.label).filter(l => !before.has(normLabel(l)));
}

// Research's finding, fed into Design's first sketch only when it fits the idea (booked group sessions), so
// "proposed by Noor and Mika" is true. `usedFinding` on sketch.done: it was given AND the shape shows it.
export function findingFor(idea) {
  try { const e = researchFor(idea); return e ? { ...e.finding, shows: e.shows } : null; } catch { return null; }
}
export function sketchSystem(finding) {
  return prompt('sketch-first', { FINDING: finding ? `Noor (Research) found this before today, with a source: ${finding.claim}
If it bears on the journey, let it shape one stage or add one short branch line for it (e.g. "Class full → Waitlist").
Don't mention the source or invent anything beyond it.` : '' });
}
const FINDING_SHOWS = /\bfull\b|wait[- ]?list|spots? (open|free)/i;
export const shapeUsesFinding = (shape, shows = FINDING_SHOWS) =>
  [...(shape?.stages || []), ...(shape?.users || [])].some(x => shows.test(x));

const busy = new Set();
async function once(run, fn) {
  if (busy.has(run)) return { code: 409, body: { error: 'Design is already sketching' } };
  busy.add(run);
  try { return await fn(); } finally { busy.delete(run); }
}

export function firstSketch({ run, idea, callModel = realCallModel, limitMs = SKETCH_LIMIT_MS, dripMs = DRIP_MS, withGuest = GUEST_ON }) {
  return once(run, async () => {
    const evs0 = readEvents(run);
    if (evs0.some(e => e.type === 'sketch.done' && !e.reshape)) return { code: 409, body: { error: 'already sketched' } };
    idea = idea || evs0.find(e => e.type === 'run.start')?.idea || '';
    const before = currentLines(evs0).length;
    const t0 = Date.now();
    let shape, prepared = false, error;
    const finding = findingFor(idea);
    try {
      shape = await askDesign({ system: sketchSystem(finding), user: `The idea, in her words: ${idea}`, callModel, limitMs });
    } catch (e) {
      error = scrub(e.message).slice(0, 200);
      shape = preparedFor(idea);
      if (!shape) {
        const ms = Date.now() - t0;
        logEvent(run, 'sketch.error', { pane: 'flow', seat: 'design', error, ms });
        return { code: 502, body: { error, ms } };
      }
      prepared = true;
    }
    const ms = Date.now() - t0;
    // She started writing her own journey while Design sketched: Design steps back, nothing is drawn over it.
    if (currentLines(readEvents(run)).length > before) {
      logEvent(run, 'sketch.done', { pane: 'flow', seat: 'design', ms, prepared, skipped: true });
      return { code: 200, body: { skipped: true, ms } };
    }
    // The guest chair is pulled up as the sketch lands: its call runs while the sketch draws in, and it joins after.
    const guest = withGuest ? settle(askGuest({ idea, users: shape.users, stages: shape.stages, callModel })) : null;
    const drawn = await drawShape(run, shape, { dripMs, extra: prepared ? { prepared: true } : {} });
    const usedFinding = !prepared && !!finding && shapeUsesFinding(shape, finding.shows);
    logEvent(run, 'sketch.done', { pane: 'flow', seat: 'design', ms, prepared, usedFinding,
      ...(usedFinding ? { by: ['research', 'design'], finding: { title: finding.title, url: finding.url } } : {}), ...(error ? { error } : {}) });
    if (guest) logGuest(run, await guest);
    return { code: 200, body: { ...drawn, ms, prepared } };
  });
}

// asAnswer: the ask id when the redraw comes from her answer in a focus moment (that answer is already her craft event).
export function reshape({ run, text, callModel = realCallModel, limitMs = SKETCH_LIMIT_MS, dripMs = DRIP_MS, asAnswer = null }) {
  text = String(text || '').trim();
  if (!text) return Promise.resolve({ code: 400, body: { error: 'text required' } });
  return once(run, async () => {
    const evs = readEvents(run);
    const idea = evs.find(e => e.type === 'run.start')?.idea || '';
    const lines = currentLines(evs);
    if (!lines.length) return { code: 409, body: { error: 'no sketch yet' } };
    const users = currentUsers(evs);
    logEvent(run, 'reshape', asAnswer ? { pane: 'flow', text, askId: asAnswer } : { pane: 'flow', mode: 'craft', text });
    const t0 = Date.now();
    let shape;
    try {
      shape = await askDesign({
        system: prompt('sketch-reshape', { IDEA: idea, USERS: users.map(u => `- ${u}`).join('\n') || '- (none yet)',
          STAGES: lines.map(l => `- ${l}`).join('\n') }),
        user: `Her reaction: "${text}"`, callModel, limitMs,
      });
    } catch (e) {
      const error = scrub(e.message).slice(0, 200), ms = Date.now() - t0;
      logEvent(run, 'sketch.error', { pane: 'flow', seat: 'design', error, ms, reshape: true });
      return { code: 502, body: { error, ms } };
    }
    const ms = Date.now() - t0;
    logEvent(run, 'flow.reset', { pane: 'flow', by: 'design', reason: 'reshape', touched: touchedLabels(lines, shape.stages) });
    const drawn = await drawShape(run, shape, { dripMs });
    logEvent(run, 'sketch.done', { pane: 'flow', seat: 'design', ms, prepared: false, reshape: true });
    return { code: 200, body: { ...drawn, ms, prepared: false } };
  });
}

export function editFlow({ run, lines }) {
  const next = (Array.isArray(lines) ? lines : []).map(l => String(l ?? '').trim()).filter(Boolean).slice(0, 12);
  if (!next.length) return { code: 400, body: { error: 'lines required' } };
  const prev = currentLines(readEvents(run));
  // One craft event per edit (the reset); the redrawn lines carry no mode, so an edit counts once on the meter.
  logEvent(run, 'flow.reset', { pane: 'flow', mode: 'craft', by: 'her', reason: 'edit', touched: touchedLabels(prev, next) });
  let flow = { nodes: [], edges: [] };
  for (let i = 0; i < next.length; i++) {
    flow = parseFlow(next.slice(0, i + 1));
    logEvent(run, 'flow.line', { pane: 'flow', by: 'her', text: next[i], nodes: flow.nodes, edges: flow.edges });
  }
  return { code: 200, body: flow };
}

// The close: same first sketch for a judge's idea. No run is logged here; the close's run starts from these stages.
export async function sketchForIdea(idea, { callModel = realCallModel, limitMs = SKETCH_LIMIT_MS } = {}) {
  const t0 = Date.now();
  let shape, prepared = false, error;
  const finding = findingFor(idea);
  try { shape = await askDesign({ system: sketchSystem(finding), user: `The idea, in her words: ${idea}`, callModel, limitMs }); }
  catch (e) {
    error = scrub(e.message).slice(0, 200);
    shape = preparedFor(idea);
    if (!shape) return { code: 502, body: { error, ms: Date.now() - t0 } };
    prepared = true;
  }
  const flow = parseFlow(shape.stages);
  return { code: 200, body: { users: shape.users.map((label, i) => ({ id: `u${i + 1}`, label })), stages: shape.stages,
    nodes: flow.nodes, edges: flow.edges, ms: Date.now() - t0, prepared, usedFinding: !prepared && !!finding && shapeUsesFinding(shape, finding.shows) } };
}

// Leaning in: a teammate visibly picks up her change only when one of its candidates attaches to a box she touched
// (reshaped or edited). One lean per seat and box.
let leanOff = null;
export function installLean() {
  if (leanOff) return leanOff;
  leanOff = onEvent(ev => {
    if (ev.type !== 'candidate' || !ev.attachTo || !ev.run) return;
    const evs = readEvents(ev.run);
    const touched = new Set(evs.filter(e => e.type === 'flow.reset').flatMap(e => e.touched || []).map(normLabel));
    if (!touched.size) return;
    const node = parseFlow(currentLines(evs)).nodes.find(n => n.id === ev.attachTo);
    if (!node || !touched.has(normLabel(node.label))) return;
    if (evs.some(e => e.type === 'lean' && e.seat === ev.seat && e.nodeId === node.id)) return;
    logEvent(ev.run, 'lean', { pane: ev.seat, seat: ev.seat, nodeId: node.id, label: node.label, candidateId: ev.id,
      reason: ev.reason || ev.decision, decision: ev.decision });
  });
  return leanOff;
}
