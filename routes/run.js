// Piece 3's API: a run, her lines, the team's proposals and the selector, her answers, her pin and her file, the tally.
// The /api/run/:id/... endpoints use match(url) so they never catch another piece's /api/run/:id/x.
import fs from 'node:fs';
import { sendJson } from '../lib/http.js';
import { logEvent, readEvents, newRunId, RUNS_DIR } from '../lib/events.js';
import { scrub } from '../lib/model.js';
import { proposeAndSelect, selectForIdea } from '../lib/select.js';
import { initTaste, readTaste, writeLine, inferSoundsLike, cleanRule } from '../lib/taste.js';
import { tally } from '../lib/tally.js';
import { parseFlow } from '../lib/flow.js';
import { currentLines } from '../lib/sketch.js';
import { cleanTag, templateFor, nameTag } from '../lib/tag.js';
import { interpret, saveTakeaways } from '../lib/interpret.js';
import { buildProfile } from '../lib/profile.js';
import { SEATS } from '../lib/teammates.js';
import { selectorMax, gateFirst } from '../lib/first.js';
import { makeCast } from '../lib/cast.js';
const SEAT_IDS = [...SEATS, 'diy'];
import path from 'node:path';

const running = new Set();
// Only this piece's endpoints, so /api/run/:id/sketches (piece 2) and /api/run/:id/build (piece 4) pass by.
const MINE_POST = /^\/api\/run\/[^/]+\/(line|propose|answer|pin|taste|brief|takeaways|intro|tag)$/;
const MINE_GET = /^\/api\/run\/[^/]+\/tally$/;

function state(run) {
  const evs = readEvents(run);
  const start = evs.find(e => e.type === 'run.start');
  const lines = currentLines(evs); // journey lines since the last flow.reset (a reshape or box edit replaces them)
  return { evs, idea: start?.idea, seat: start?.seat || 'product', tag: start?.tag || null, lines, flow: parseFlow(lines) };
}
const validRun = id => /^[\w-]{1,80}$/.test(id) && fs.existsSync(path.join(RUNS_DIR, id, 'events.jsonl'));

const handlers = {
  async line(run, body) {
    const text = String(body?.text || '').trim();
    if (!text) return [400, { error: 'text required' }];
    const { lines } = state(run);
    const flow = parseFlow([...lines, text]);
    logEvent(run, 'flow.line', { pane: 'flow', mode: 'craft', text, nodes: flow.nodes, edges: flow.edges });
    return [200, flow];
  },

  async propose(run, body) {
    const s = state(run);
    if (running.has(run) || s.evs.some(e => e.type === 'select.done')) return [409, { error: 'already proposed for this run' }];
    running.add(run);
    // On the stage path the selector brings one focus moment; asks already made (the first decision) count (lib/first.js).
    const job = proposeAndSelect({ run, idea: s.idea, flow: s.flow, taste: readTaste(run), herSeat: s.seat, herTag: s.tag, max: selectorMax(run, s.evs), gate: () => gateFirst(run) })
      .catch(e => { logEvent(run, 'propose.error', { error: scrub(e.message) }); return null; })
      .finally(() => running.delete(run));
    if (!body?.wait) return [202, { started: true }];
    const r = await job;
    if (!r) return [500, { error: 'propose failed' }];
    return [200, { came: r.candidates.length, brought: r.asks.length, asks: r.asks, decided: r.decided,
      ms: { team: r.teamMs, select: r.selectMs, total: r.totalMs, seats: r.teamTimings } }];
  },

  async answer(run, body) {
    // A focus moment: her words, heard by one interpret call (lib/interpret.js). { choice } stays for the old path.
    if (body?.text != null || Array.isArray(body?.pieces)) { const r = await interpret({ run, askId: body.askId, text: body.text, pieces: Array.isArray(body?.pieces) ? body.pieces : undefined }); delete r.body.profile; return [r.code, r.body]; }
    const { askId, choice } = body || {};
    const a = state(run).evs.find(e => e.type === 'ask' && e.id === askId);
    if (!a) return [404, { error: 'no such ask' }];
    logEvent(run, 'answer', { pane: 'flow', mode: 'craft', askId, choice: String(choice ?? '') });
    return [200, { ok: true }];
  },

  async pin(run, body) {
    const text = String(body?.text || '').trim();
    if (!text) return [400, { error: 'text required' }];
    const nodeId = body?.nodeId ?? null;
    logEvent(run, 'pin', { pane: 'flow', mode: 'craft', nodeId, text });
    const s = state(run);
    const { text: soundsLike, ms } = await inferSoundsLike(text, { idea: s.idea, taste: readTaste(run) });
    logEvent(run, 'taste.suggested', { pane: 'file', text: soundsLike, ms });
    return [200, { soundsLike }];
  },

  // This meeting's takeaways, as she keeps them: her hidden file and her profile's philosophy grow (lib/interpret.js).
  async takeaways(run, body) { const r = saveTakeaways({ run, ...(body || {}) }); return [r.code, r.body]; },
  async brief(run, body) { const r = saveTakeaways({ run, ...(body || {}) }); return [r.code, r.body]; },

  // Her intro, one natural sentence -> her name tag (editable), and the team's private profile starts.
  async intro(run, body) {
    const text = String(body?.text || '').trim();
    if (!text) return [400, { error: 'text required' }];
    const s = state(run);
    logEvent(run, 'intro', { pane: 'sheet', mode: 'craft', text });
    const r = await nameTag(text, { seat: s.seat });
    const tag = cleanTag(r.body) || { craft: s.seat === 'diy' ? '' : s.seat[0].toUpperCase() + s.seat.slice(1), goodAt: r.body.goodAt || '', loves: r.body.loves || '' };
    logEvent(run, 'tag', { pane: 'sheet', tag, ms: r.body.ms, ...(r.body.rough ? { rough: true } : {}) });
    buildProfile(run).catch(() => {}); // never waited on; the team assumes and keeps moving
    return [200, { tag, ms: r.body.ms }];
  },

  // Her edits to her name tag.
  async tag(run, body) {
    const tag = cleanTag(body);
    if (!tag) return [400, { error: 'craft required' }];
    logEvent(run, 'tag', { pane: 'sheet', mode: 'craft', tag, edited: true });
    return [200, { tag }];
  },

  async taste(run, body) {
    const text = String(body?.text || '').trim();
    if (!cleanRule(text)) return [400, { error: 'text required' }];
    const last = state(run).evs.filter(e => e.type === 'taste.suggested').at(-1);
    const line = writeLine(run, text);
    const reworded = !last || cleanRule(last.text) !== line.text;
    logEvent(run, 'taste.written', { pane: 'file', mode: 'craft', id: line.id, text: line.text, reworded });
    return [200, line];
  },
};

async function dispatch(req, res, { body, url }) {
  const m = url.pathname.match(/^\/api\/run\/([^/]+)\/([a-z]+)$/);
  if (!m) return sendJson(res, 404, { error: 'not found' });
  const [, run, action] = m;
  if (!validRun(run)) return sendJson(res, 404, { error: 'no such run' });
  if (req.method === 'GET' && action === 'tally') return sendJson(res, 200, tally(readEvents(run), readTaste(run)));
  const h = req.method === 'POST' && Object.hasOwn(handlers, action) && handlers[action];
  if (!h) return sendJson(res, 404, { error: 'not found' });
  try {
    const [code, obj] = await h(run, body);
    return sendJson(res, code, obj);
  } catch (e) {
    console.error(scrub(e.message));
    return sendJson(res, 500, { error: scrub(e.message) });
  }
}

export default [
  {
    method: 'POST', path: '/api/run', handler: (req, res, { body }) => {
      const idea = String(body?.idea || '').trim();
      if (!idea) return sendJson(res, 400, { error: 'idea required' });
      const run = newRunId();
      const intro = String(body?.intro || '').trim();
      initTaste(run, { intro });
      // "Your own craft": her seat is 'diy' and her name tag travels with the run (lib/craft.js).
      const seat = SEAT_IDS.includes(body?.seat) ? body.seat : 'product';
      const tag = seat === 'diy' ? cleanTag(body?.tag) : null;
      // Any seat is hers (lib/cast.js): a craft other than Product records its cast on run.start; Product adds nothing.
      const cast = makeCast(seat === 'diy' ? 'diy' : String(body?.craft || 'product'), body?.flex);
      logEvent(run, 'run.start', { pane: 'sheet', mode: 'craft', idea, seat, ...(tag ? { tag } : {}), ...(seat === 'diy' ? { template: templateFor(idea) } : {}), ...(intro ? { intro } : {}), ...(cast ? { cast } : {}), ...(body?.path === 'full' || body?.full === true ? {} : { stagePath: true }) }); // the stage path unless the room asks for the full one (an old client still gets it)
      if (intro || tag) buildProfile(run).catch(() => {}); // her sentence + idea: the private profile starts, never waited on
      return sendJson(res, 200, { run });
    },
  },
  { method: 'POST', match: url => MINE_POST.test(url.pathname), handler: dispatch },
  { method: 'GET', match: url => MINE_GET.test(url.pathname), handler: dispatch },
  {
    // The close: a judge's idea -> the three questions it would bring, plus the counter. Logs a fresh run.
    method: 'POST', path: '/api/select-for-idea', handler: async (req, res, { body }) => {
      const idea = String(body?.idea || '').trim();
      if (!idea) return sendJson(res, 400, { error: 'idea required' });
      const lines = Array.isArray(body?.lines) ? body.lines.map(String).filter(Boolean) : [];
      try {
        return sendJson(res, 200, await selectForIdea(idea, lines));
      } catch (e) {
        console.error(scrub(e.message));
        return sendJson(res, 500, { error: scrub(e.message) });
      }
    },
  },
];
