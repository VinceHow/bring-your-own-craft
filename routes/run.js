// Piece 3's API: a run, her lines, the team's proposals and the selector, her answers, her pin and her file, the tally.
// The server matches exact paths or '*' prefixes, so the /api/run/:id/... endpoints share one prefix route here.
import fs from 'node:fs';
import { sendJson } from '../lib/http.js';
import { logEvent, readEvents, newRunId, RUNS_DIR } from '../lib/events.js';
import { scrub } from '../lib/model.js';
import { proposeAndSelect } from '../lib/select.js';
import { initTaste, readTaste, writeLine, inferSoundsLike, cleanRule } from '../lib/taste.js';
import { tally } from '../lib/tally.js';
import path from 'node:path';

// Piece 2 owns lib/flow.js; until it lands, a small local parser with the same shape.
let parseFlow = fallbackParseFlow;
try { ({ parseFlow } = await import('../lib/flow.js')); } catch {}

export function fallbackParseFlow(lines) {
  const nodes = [], edges = [];
  const find = label => nodes.find(n => n.label.toLowerCase() === label.toLowerCase());
  const node = label => find(label) || (nodes.push({ id: `n${nodes.length + 1}`, label }), nodes.at(-1));
  const clean = s => s.trim().replace(/^["'“”]+|["'“”]+$/g, '').trim();
  let prev = null;
  for (const line of lines) {
    const parts = String(line).split(/\s*(?:→|->)\s*/).map(clean).filter(Boolean);
    if (!parts.length) continue;
    const ns = parts.map(node);
    if (parts.length === 1) { if (prev && prev !== ns[0]) edges.push({ from: prev.id, to: ns[0].id }); prev = ns[0]; }
    else for (let i = 1; i < ns.length; i++) edges.push({ from: ns[i - 1].id, to: ns[i].id });
  }
  return { nodes, edges };
}

const running = new Set();

function state(run) {
  const evs = readEvents(run);
  const start = evs.find(e => e.type === 'run.start');
  const lines = evs.filter(e => e.type === 'flow.line').map(e => e.text);
  return { evs, idea: start?.idea, seat: start?.seat || 'product', lines, flow: parseFlow(lines) };
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
    const job = proposeAndSelect({ run, idea: s.idea, flow: s.flow, taste: readTaste(run), herSeat: s.seat })
      .catch(e => { logEvent(run, 'propose.error', { error: scrub(e.message) }); return null; })
      .finally(() => running.delete(run));
    if (!body?.wait) return [202, { started: true }];
    const r = await job;
    if (!r) return [500, { error: 'propose failed' }];
    return [200, { came: r.candidates.length, brought: r.asks.length, asks: r.asks, decided: r.decided,
      ms: { team: r.teamMs, select: r.selectMs, total: r.totalMs, seats: r.teamTimings } }];
  },

  async answer(run, body) {
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
      initTaste(run);
      logEvent(run, 'run.start', { pane: 'sheet', mode: 'craft', idea, seat: body?.seat || 'product' });
      return sendJson(res, 200, { run });
    },
  },
  { method: 'POST', path: '/api/run/*', handler: dispatch },
  { method: 'GET', path: '/api/run/*', handler: dispatch },
];
