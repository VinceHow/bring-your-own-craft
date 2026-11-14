// POST /api/run/:id/build: re-decide the rest against her updated file, then fill the template live.
// Progress as build.step events (the current step, never a spinner); ends with build.done { url, ms }.
import fs from 'node:fs';
import path from 'node:path';
import { logEvent, readEvents, RUNS_DIR } from '../lib/events.js';
import { sendJson } from '../lib/http.js';
import { scrub } from '../lib/model.js';
import { fillPage, gatherRun } from '../lib/fill.js';
import { decideRest, loadRest } from '../lib/select.js';
import { SEED } from '../lib/taste.js';

const RUN_ID = /^[\w.-]{1,120}$/;

let decideRestImpl = decideRest;
// For scripts/tests only: swap the re-decision (fill-demo's --sample-decide). null restores the real one.
export function _setDecideRest(fn) { decideRestImpl = fn || decideRest; }

// Re-decide the candidates she wasn't asked, against her updated file (logs `decided` itself, round 'build').
async function redecide(run, tasteMd, { idea, flow }) {
  const out = await decideRestImpl(loadRest(run), tasteMd, { run, idea, flow, round: 'build' });
  return Array.isArray(out) ? out : (out?.decided || []);
}

const building = new Set();

export async function buildRun(run, { call } = {}) {
  const t0 = Date.now();
  const dir = path.join(RUNS_DIR, run);
  const step = s => logEvent(run, 'build.step', { step: s, pane: 'engineering' });
  step('Reading her flow, her three answers and her file');
  const events = readEvents(run);
  const tasteFile = path.join(dir, 'taste.md');
  const tasteMd = fs.readFileSync(fs.existsSync(tasteFile) ? tasteFile : SEED, 'utf8');
  const g = gatherRun(events, tasteMd);
  step('Re-deciding the rest against her file');
  const t1 = Date.now();
  const decided = await redecide(run, tasteMd, g);
  const decideMs = Date.now() - t1;
  const r = await fillPage({ run, outDir: path.join(dir, 'page'), ...g, decided, call, onStep: step });
  const url = `/runs/${run}/page/`;
  const ms = Date.now() - t0;
  logEvent(run, 'build.done', { url, ms, decideMs, fillMs: r.modelMs, template: r.template });
  return { url, ms, decideMs, fillMs: r.modelMs, template: r.template, decided };
}

const BUILD = /^\/api\/run\/([^/]+)\/build$/;
export default [{
  method: 'POST', match: url => BUILD.test(url.pathname),
  handler: async (req, res, { url }) => {
    const run = decodeURIComponent(url.pathname.match(BUILD)[1]);
    if (!RUN_ID.test(run) || !fs.existsSync(path.join(RUNS_DIR, run))) return sendJson(res, 404, { error: 'unknown run' });
    if (building.has(run)) return sendJson(res, 409, { error: 'already building' });
    building.add(run);
    try {
      sendJson(res, 200, await buildRun(run));
    } catch (e) {
      logEvent(run, 'build.step', { step: 'Build failed: ' + scrub(e.message).slice(0, 160), pane: 'engineering' });
      sendJson(res, 500, { error: scrub(e.message) });
    } finally { building.delete(run); }
  },
}];
