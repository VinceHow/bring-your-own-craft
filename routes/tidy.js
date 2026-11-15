// POST /api/run/:id/piece { askId, pieceId, text }        -> 202 { pieceId }: one piece of her answer, tidied behind
//                        { askId, pieceId, remove: true } -> { removed }: she removed (or is redoing) a piece
//                        { askId, pieceId, use }          -> { use }: "Use mine" ('mine') or back to the tidy ('tidy')
// POST /api/tidy { text, run? } -> { text, tidied }: one tidy of any spoken text (her name-tag sentence); her raw
//                        words back on a failure or timeout (~3 s). Never a 5xx for a failed tidy.
// Also keeps one warm tidy process per run once she has a question (lib/tidy.js).
import fs from 'node:fs';
import path from 'node:path';
import { sendJson } from '../lib/http.js';
import { RUNS_DIR } from '../lib/events.js';
import { addPiece, removePiece, choosePiece, installTidyWarmth, tidyText } from '../lib/tidy.js';

installTidyWarmth();

const PATH = /^\/api\/run\/([\w-]{1,80})\/piece$/;
const validRun = id => fs.existsSync(path.join(RUNS_DIR, id, 'events.jsonl'));

export default [
  { method: 'POST', match: url => PATH.test(url.pathname), handler(req, res, { url, body }) {
    const run = url.pathname.match(PATH)[1];
    if (!validRun(run)) return sendJson(res, 404, { error: 'no such run' });
    const args = { run, askId: String(body?.askId || ''), pieceId: String(body?.pieceId || '') };
    const r = body?.remove ? removePiece(args) : body?.use ? choosePiece({ ...args, use: body.use }) : addPiece({ ...args, text: body?.text });
    return sendJson(res, r.code, r.body);
  } },
  { method: 'POST', match: url => url.pathname === '/api/tidy', async handler(req, res, { body }) {
    const text = String(body?.text ?? '').slice(0, 2000);
    if (!text.trim()) return sendJson(res, 400, { error: 'text required' });
    const run = /^[\w-]{1,80}$/.test(String(body?.run || '')) && validRun(body.run) ? body.run : null;
    const field = body?.field === 'intro' ? 'intro' : null; // her own line: tidy may clean it, never change its words
    const r = await tidyText({ text, run, field });
    return sendJson(res, 200, { text: r.text, tidied: r.tidied });
  } },
];
