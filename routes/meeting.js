// A focus moment as a meeting (lib/meeting.js): POST /api/run/:id/round { askId, text, pieces } -> one round of discussion;
// POST /api/run/:id/end { askId } -> End meeting: takeaways over all her rounds.
import fs from 'node:fs';
import path from 'node:path';
import { sendJson } from '../lib/http.js';
import { RUNS_DIR } from '../lib/events.js';
import { scrub } from '../lib/model.js';
import { round, end } from '../lib/meeting.js';

const MINE = /^\/api\/run\/([^/]+)\/(round|end)$/;
const validRun = id => /^[\w-]{1,80}$/.test(id) && fs.existsSync(path.join(RUNS_DIR, id, 'events.jsonl'));
export default [{
  method: 'POST', match: url => MINE.test(url.pathname), handler: async (req, res, { body, url }) => {
    const [, run, action] = url.pathname.match(MINE);
    if (!validRun(run)) return sendJson(res, 404, { error: 'no such run' });
    try {
      const r = action === 'round'
        ? await round({ run, askId: body?.askId, text: body?.text, pieces: Array.isArray(body?.pieces) ? body.pieces : undefined })
        : await end({ run, askId: body?.askId });
      return sendJson(res, r.code, r.body);
    } catch (e) { console.error(scrub(e.message)); return sendJson(res, 500, { error: scrub(e.message) }); }
  },
}];
