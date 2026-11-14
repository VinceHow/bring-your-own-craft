// POST /api/run/:id/tidy { askId, use: 'mine' | 'tidy' } -> { use }: "Use mine" keeps her own words over the tidy.
// Also keeps one warm tidy process per run once she has a question (lib/tidy.js).
import fs from 'node:fs';
import path from 'node:path';
import { sendJson } from '../lib/http.js';
import { RUNS_DIR } from '../lib/events.js';
import { chooseTidy, installTidyWarmth } from '../lib/tidy.js';

installTidyWarmth();

const PATH = /^\/api\/run\/([\w-]{1,80})\/tidy$/;
const validRun = id => fs.existsSync(path.join(RUNS_DIR, id, 'events.jsonl'));

export default [
  { method: 'POST', match: url => PATH.test(url.pathname), handler(req, res, { url, body }) {
    const run = url.pathname.match(PATH)[1];
    if (!validRun(run)) return sendJson(res, 404, { error: 'no such run' });
    const r = chooseTidy({ run, askId: String(body?.askId || ''), use: body?.use });
    return sendJson(res, r.code, r.body);
  } },
];
