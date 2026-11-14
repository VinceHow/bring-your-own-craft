// Design's first sketch, her reshape and her direct box edits (CONTRACT.md, "Studio version seams").
//   POST /api/run/:id/sketch            -> { users, stages, nodes, edges, ms, prepared }
//   POST /api/run/:id/reshape { text }  -> the redrawn shape (the flow is replaced)
//   POST /api/run/:id/flow { lines }    -> { nodes, edges }, no model
//   POST /api/sketch-for-idea { idea }  -> the close: a sketch of the judge's idea, no run logged
import fs from 'node:fs';
import path from 'node:path';
import { sendJson } from '../lib/http.js';
import { RUNS_DIR } from '../lib/events.js';
import { scrub } from '../lib/model.js';
import { firstSketch, reshape, editFlow, sketchForIdea, installLean } from '../lib/sketch.js';

installLean();

const MINE = /^\/api\/run\/([^/]+)\/(sketch|reshape|flow)$/;
const validRun = id => /^[\w-]{1,80}$/.test(id) && fs.existsSync(path.join(RUNS_DIR, id, 'events.jsonl'));

async function handle(req, res, { body, url }) {
  const [, run, action] = url.pathname.match(MINE);
  if (!validRun(run)) return sendJson(res, 404, { error: 'no such run' });
  try {
    const r = action === 'sketch' ? await firstSketch({ run, idea: body?.idea })
      : action === 'reshape' ? await reshape({ run, text: body?.text })
      : editFlow({ run, lines: body?.lines });
    return sendJson(res, r.code, r.body);
  } catch (e) {
    console.error(scrub(e.message));
    return sendJson(res, 500, { error: scrub(e.message) });
  }
}

export default [
  { method: 'POST', match: url => MINE.test(url.pathname), handler: handle },
  {
    method: 'POST', path: '/api/sketch-for-idea', handler: async (req, res, { body }) => {
      const idea = String(body?.idea || '').trim();
      if (!idea) return sendJson(res, 400, { error: 'idea required' });
      try { const r = await sketchForIdea(idea); return sendJson(res, r.code, r.body); }
      catch (e) { console.error(scrub(e.message)); return sendJson(res, 500, { error: scrub(e.message) }); }
    },
  },
];
