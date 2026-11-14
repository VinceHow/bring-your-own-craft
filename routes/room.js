// GET /api/replay/:name -> { name, events, taste } from runs/<name>/events.jsonl (and taste.md if present).
// GET /api/taste/:run  -> { md } her file for a run (runs/<run>/taste.md), for the room's file card.
// GET /api/baseline    -> { asked, guessed, source } counted from docs/baseline/GUESSES.md (one table row per guess).
import fs from 'node:fs';
import path from 'node:path';
import { RUNS_DIR, readEvents } from '../lib/events.js';
import { sendJson } from '../lib/http.js';

const GUESSES = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'docs', 'baseline', 'GUESSES.md');
// One row per guess: "| <n> | guess | evidence |". The plain agent asked nothing (docs/baseline/README.md).
export function countGuesses(md) { return String(md).split('\n').filter(l => /^\|\s*\d+\s*\|/.test(l)).length; }

export default [{
  method: 'GET',
  path: '/api/baseline',
  handler(req, res) {
    if (!fs.existsSync(GUESSES)) return sendJson(res, 404, { error: 'no baseline counted yet' });
    const guessed = countGuesses(fs.readFileSync(GUESSES, 'utf8'));
    sendJson(res, 200, { asked: 0, guessed, source: 'plain coding agent, same prompt, 14 Nov · docs/baseline/GUESSES.md' });
  },
}, {
  method: 'GET',
  path: '/api/replay/*',
  handler(req, res, { url }) {
    const name = decodeURIComponent(url.pathname.slice('/api/replay/'.length));
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/.test(name)) return sendJson(res, 400, { error: 'bad run name' });
    const events = readEvents(name);
    if (!events.length) return sendJson(res, 404, { error: `no recorded run "${name}"` });
    const tf = path.join(RUNS_DIR, name, 'taste.md');
    const taste = fs.existsSync(tf) ? fs.readFileSync(tf, 'utf8') : null;
    sendJson(res, 200, { name, events, taste });
  },
}, {
  method: 'GET',
  path: '/api/taste/*',
  handler(req, res, { url }) {
    const run = decodeURIComponent(url.pathname.slice('/api/taste/'.length));
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/.test(run)) return sendJson(res, 400, { error: 'bad run name' });
    const tf = path.join(RUNS_DIR, run, 'taste.md');
    if (!fs.existsSync(tf)) return sendJson(res, 404, { error: 'no file for this run yet' });
    sendJson(res, 200, { md: fs.readFileSync(tf, 'utf8') });
  },
}];
