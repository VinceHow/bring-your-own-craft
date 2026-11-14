// POST /api/run/:id/piece { askId, pieceId, text }        -> 202 { pieceId }: one piece of her answer, tidied behind
//                        { askId, pieceId, remove: true } -> { removed }: she removed (or is redoing) a piece
//                        { askId, pieceId, use }          -> { use }: "Use mine" ('mine') or back to the tidy ('tidy')
// Also keeps one warm tidy process per run once she has a question (lib/tidy.js).
import fs from 'node:fs';
import path from 'node:path';
import { sendJson } from '../lib/http.js';
import { RUNS_DIR } from '../lib/events.js';
import { addPiece, removePiece, choosePiece, installTidyWarmth } from '../lib/tidy.js';

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
];
