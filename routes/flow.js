// Piece 2 routes: her flow (pure parse, for the dev page) and Design's grey sketches.
import fs from 'node:fs';
import path from 'node:path';
import { sendJson } from '../lib/http.js';
import { parseFlow } from '../lib/flow.js';
import { callModel, backend, scrub } from '../lib/model.js';
import { readEvents, logEvent, runDir, RUNS_DIR } from '../lib/events.js';

export const BLOCK_KINDS = ['header', 'class-list', 'class-detail', 'field', 'button', 'confirmation', 'text'];

const SYSTEM = `You are the Design teammate on a small product team. Your stance: sketch first, polish last.
The product lead has written the user journey as boxes and arrows. Turn it into grey wireframe frames, one frame per
screen the user actually sees. A step that is only an outcome of the step before it (for example "booked" after
"confirm") still gets a frame if the user would see a screen for it.

You may only use these blocks, top to bottom inside each frame:
- header: the top bar or screen title. label = the words on it.
- class-list: a list of classes to choose from. label = what the list shows, e.g. "This week's classes".
- class-detail: one class with its time, teacher and spaces. label = the class shown.
- field: one form field. label = the field's name, e.g. "Email".
- button: one button. label = its words.
- confirmation: a done state with a tick. label = the message.
- text: one short line of copy. label = the words.

Rules: use her words for titles where she gave them. 2 to 6 blocks per frame. Labels are short (under 40 characters),
plain English, no emoji. nodeId must be the id of the box the frame is for. Make the sensible default choices a
designer would make for a first sketch; do not ask questions. Reply with JSON only.`;

export function sketchSchema(nodeIds) {
  return {
    type: 'object',
    required: ['frames'],
    properties: {
      frames: {
        type: 'array',
        items: {
          type: 'object',
          required: ['nodeId', 'title', 'blocks'],
          properties: {
            nodeId: { type: 'string', enum: nodeIds },
            title: { type: 'string' },
            blocks: {
              type: 'array',
              items: {
                type: 'object',
                required: ['kind', 'label'],
                properties: { kind: { type: 'string', enum: BLOCK_KINDS }, label: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  };
}

// Keep only frames for real boxes, one per box, in flow order, with known blocks.
export function cleanFrames(frames, nodes) {
  const order = new Map(nodes.map((n, i) => [n.id, i]));
  const seen = new Set();
  return (frames || [])
    .filter(f => f && order.has(f.nodeId) && !seen.has(f.nodeId) && seen.add(f.nodeId))
    .map(f => ({
      nodeId: f.nodeId,
      title: String(f.title || '').slice(0, 60),
      blocks: (f.blocks || []).filter(b => b && BLOCK_KINDS.includes(b.kind))
        .slice(0, 6).map(b => ({ kind: b.kind, label: String(b.label || '').slice(0, 60) })),
    }))
    .sort((a, b) => order.get(a.nodeId) - order.get(b.nodeId));
}

// Used only when the model call fails: one plain frame per box, by keyword. Labelled 'fallback'.
export function fallbackFrames(nodes) {
  return nodes.map(n => {
    const l = n.label.toLowerCase();
    const blocks = [{ kind: 'header', label: n.label }];
    if (/classes|schedule|timetable/.test(l)) blocks.push({ kind: 'class-list', label: "This week's classes" });
    else if (/usual|regular/.test(l)) blocks.push({ kind: 'class-detail', label: 'Your usual class' }, { kind: 'button', label: 'Book your usual' });
    else if (/class/.test(l)) blocks.push({ kind: 'class-detail', label: 'Class details' }, { kind: 'button', label: 'Book this class' });
    else if (/confirm|detail|pay/.test(l)) blocks.push({ kind: 'field', label: 'Name' }, { kind: 'field', label: 'Email' }, { kind: 'button', label: 'Confirm booking' });
    else if (/booked|done|thank/.test(l)) blocks.push({ kind: 'confirmation', label: "You're booked" });
    else blocks.push({ kind: 'text', label: n.label });
    return { nodeId: n.id, title: n.label, blocks };
  });
}

function flowOf(events) {
  const last = events.filter(e => e.type === 'flow.line').at(-1);
  if (!last) return null;
  const asks = new Map(events.filter(e => e.type === 'ask').map(a => [a.id, a]));
  const answers = events.filter(e => e.type === 'answer').map(a => ({
    decision: asks.get(a.askId)?.decision, attachTo: asks.get(a.askId)?.attachTo, choice: a.choice,
  }));
  return { idea: events.find(e => e.type === 'run.start')?.idea || '', nodes: last.nodes || [], edges: last.edges || [], answers };
}

function userPrompt(f) {
  const byId = new Map(f.nodes.map(n => [n.id, n.label]));
  const lines = [
    `What we're building: ${f.idea || '(not given)'}`, '',
    'Boxes:', ...f.nodes.map(n => `- ${n.id}: ${n.label}`), '',
    'Arrows:', ...f.edges.map(e => `- ${byId.get(e.from)} -> ${byId.get(e.to)}${e.label ? ` (for ${e.label})` : ''}`),
  ];
  if (f.answers.length) {
    lines.push('', 'Decisions she has made:', ...f.answers.map(a => `- ${a.decision || 'decision'}: ${a.choice}${a.attachTo ? ` (on ${byId.get(a.attachTo) || a.attachTo})` : ''}`));
  }
  lines.push('', 'Sketch the frames.');
  return lines.join('\n');
}

const SAFE_ID = /^[A-Za-z0-9._-]+$/;

export async function sketches(run, { fresh = false } = {}) {
  if (!SAFE_ID.test(run)) return { code: 400, body: { error: 'bad run id' } };
  if (!fs.existsSync(path.join(RUNS_DIR, run))) return { code: 404, body: { error: 'no such run' } };
  const f = flowOf(readEvents(run));
  if (!f || !f.nodes.length) return { code: 409, body: { error: 'no flow yet' } };

  const key = JSON.stringify([f.idea, f.nodes, f.edges, f.answers]);
  const cacheFile = path.join(runDir(run), 'sketches.json');
  if (!fresh && fs.existsSync(cacheFile)) {
    try {
      const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (c.key === key) return { code: 200, body: { frames: c.frames, ms: c.ms, source: c.source, cached: true } };
    } catch {}
  }

  const t0 = Date.now();
  let frames, source = 'model', error;
  try {
    const out = await callModel({
      system: SYSTEM,
      user: userPrompt(f),
      schema: sketchSchema(f.nodes.map(n => n.id)),
      model: backend() === 'fal' ? undefined : 'sonnet', // speed over depth for a first sketch
      timeoutMs: 60000,
    });
    frames = cleanFrames(out.frames, f.nodes);
    if (!frames.length) throw new Error('no usable frames');
  } catch (e) {
    error = scrub(e.message);
    frames = fallbackFrames(f.nodes);
    source = 'fallback';
  }
  const ms = Date.now() - t0;
  logEvent(run, 'sketches', { pane: 'design', seat: 'design', frames, ms, source, ...(error ? { error } : {}) });
  fs.writeFileSync(cacheFile, JSON.stringify({ key, frames, ms, source }));
  return { code: 200, body: { frames, ms, source, ...(error ? { error } : {}) } };
}

const runIdFrom = (pathname, re) => decodeURIComponent((pathname.match(re) || [])[1] || '');

export default [
  // Pure parse, no run, no log. The dev page uses it; the room uses POST /api/run/:id/line (piece 3).
  {
    method: 'POST', path: '/api/flow/parse',
    handler: (req, res, { body }) => sendJson(res, 200, parseFlow(Array.isArray(body?.lines) ? body.lines.map(String) : [])),
  },
  // Contract path. The server today matches only exact paths or a '*' prefix, so this needs the server to
  // honour `match` (a one-line change in server.js; see the report to the lead). Until then use the next route.
  {
    method: 'GET', path: '/api/run/:id/sketches',
    match: url => /^\/api\/run\/[^/]+\/sketches$/.test(url.pathname),
    handler: async (req, res, { url }) => {
      const r = await sketches(runIdFrom(url.pathname, /^\/api\/run\/([^/]+)\/sketches$/), { fresh: url.searchParams.has('fresh') });
      sendJson(res, r.code, r.body);
    },
  },
  // Same thing on a path the current server can match: GET /api/sketches/<run>.
  {
    method: 'GET', path: '/api/sketches/*',
    handler: async (req, res, { url }) => {
      const r = await sketches(runIdFrom(url.pathname, /^\/api\/sketches\/([^/]+)$/), { fresh: url.searchParams.has('fresh') });
      sendJson(res, r.code, r.body);
    },
  },
];
