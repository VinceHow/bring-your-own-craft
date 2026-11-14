// GET /api/replay/:name -> { name, events, taste } from runs/<name>/events.jsonl (and taste.md if present).
import fs from 'node:fs';
import path from 'node:path';
import { RUNS_DIR, readEvents } from '../lib/events.js';
import { sendJson } from '../lib/http.js';

export default [{
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
}];
