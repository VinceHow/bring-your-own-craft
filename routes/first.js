// The first decision (lib/first.js): POST /api/run/:id/first {}  -> the ask ("Who is this really for?")
//                                     POST /api/run/:id/first { askId, text } -> her answer: reshape + decisions
import fs from 'node:fs';
import path from 'node:path';
import { sendJson } from '../lib/http.js';
import { RUNS_DIR } from '../lib/events.js';
import { scrub } from '../lib/model.js';
import { firstAsk, firstAnswer, installStagePath } from '../lib/first.js';

installStagePath(); // her answers drive the stage path's Act 2 (lib/first.js)

const MINE = /^\/api\/run\/([^/]+)\/first$/;
const validRun = id => /^[\w-]{1,80}$/.test(id) && fs.existsSync(path.join(RUNS_DIR, id, 'events.jsonl'));

export default [{
  method: 'POST', match: url => MINE.test(url.pathname), handler: async (req, res, { body, url }) => {
    const [, run] = url.pathname.match(MINE);
    if (!validRun(run)) return sendJson(res, 404, { error: 'no such run' });
    try {
      const r = body?.text != null ? await firstAnswer({ run, askId: body.askId, text: body.text }) : firstAsk({ run });
      // The room's backup ask after sketch.done usually lands after the server's own (lib/first.js): that's fine, not an
      // error, so no failed request shows in the console (audit). Every other refusal keeps its 409.
      if (body?.text == null && r.code === 409 && r.body?.error === 'already asked') return sendJson(res, 200, { already: true });
      return sendJson(res, r.code, r.body);
    } catch (e) { console.error(scrub(e.message)); return sendJson(res, 500, { error: scrub(e.message) }); }
  },
}];
