// POST /api/meet-lines { idea } -> { lines: { design, research, ... }, ms, static? }: each teammate's intro line, tailored
// to her idea (lib/meet.js). Seats whose line failed the rules are left out; the client shows their static line.
import { sendJson } from '../lib/http.js';
import { scrub } from '../lib/model.js';
import { meetLines } from '../lib/meet.js';

export default [
  {
    method: 'POST', path: '/api/meet-lines', handler: async (req, res, { body }) => {
      try { const r = await meetLines(body?.idea, body?.wearing ? { wearing: String(body.wearing) } : {}); return sendJson(res, r.code, r.body); }
      catch (e) { console.error(scrub(e.message)); return sendJson(res, 200, { lines: {}, static: true }); }
    },
  },
];
