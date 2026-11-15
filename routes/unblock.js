// Quick unblocks (lib/unblock.js): a seat raises one; she answers it from her inbox. Both go through lib/policy.js.
import fs from 'node:fs';
import path from 'node:path';
import { sendJson } from '../lib/http.js';
import { RUNS_DIR } from '../lib/events.js';
import { raiseUnblock, answerUnblock } from '../lib/unblock.js';

const RAISE = /^\/api\/run\/([\w-]{1,80})\/unblock$/;
const ANSWER = /^\/api\/run\/([\w-]{1,80})\/unblock\/answer$/;
const validRun = id => fs.existsSync(path.join(RUNS_DIR, id, 'events.jsonl'));

export default [
  { method: 'POST', match: url => RAISE.test(url.pathname), handler: (req, res, { body, url }) => {
    const run = url.pathname.match(RAISE)[1];
    if (!validRun(run)) return sendJson(res, 404, { error: 'no such run' });
    try {
      const a = raiseUnblock(run, body || {});
      return sendJson(res, a ? 200 : 409, a ? { ask: a } : { refused: true });
    } catch (e) { return sendJson(res, 400, { error: e.message }); }
  } },
  { method: 'POST', match: url => ANSWER.test(url.pathname), handler: (req, res, { body, url }) => {
    const run = url.pathname.match(ANSWER)[1];
    if (!validRun(run)) return sendJson(res, 404, { error: 'no such run' });
    const [code, obj] = answerUnblock(run, { askId: body?.askId, yes: body?.yes === true, text: body?.text });
    return sendJson(res, code, obj);
  } },
];
