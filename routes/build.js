// POST /api/run/:id/build: re-decide the rest against her updated file, then fill the template live.
// Progress as build.step events (the current step, never a spinner); ends with build.done { url, ms }.
import fs from 'node:fs';
import path from 'node:path';
import { logEvent, readEvents, RUNS_DIR } from '../lib/events.js';
import { sendJson } from '../lib/http.js';
import { scrub } from '../lib/model.js';
import { fillPage, gatherRun } from '../lib/fill.js';

const RUN_ID = /^[\w.-]{1,120}$/;

// STUB until lib/select.js (piece 3) lands: marks every undecided candidate "team default".
// Clearly named so nobody mistakes it for the real re-decision.
export function decideRestStub({ candidates = [], asks = [] }) {
  const asked = new Set(asks.map(a => a.id));
  return candidates.filter(c => !asked.has(c.id))
    .map(c => ({ id: c.id, seat: c.seat, decision: c.decision, choice: c.recommendation, cites: 'team default', stub: true }));
}

let decideRestImpl = null;
async function getDecideRest() {
  if (decideRestImpl) return decideRestImpl;
  try {
    const mod = await import('../lib/select.js');
    if (typeof mod.decideRest === 'function') return (decideRestImpl = { fn: mod.decideRest, real: true });
  } catch {}
  return { fn: decideRestStub, real: false };
}
export function _setDecideRest(fn) { decideRestImpl = fn ? { fn, real: true } : null; } // tests

// Re-decide: the real decideRest gets the whole picture; it may return Decided[] or { decided }.
async function redecide(run, events, tasteMd) {
  const { fn, real } = await getDecideRest();
  const candidates = events.filter(e => e.type === 'candidate');
  const asks = events.filter(e => e.type === 'ask');
  const out = await fn({ run, candidates, asks, taste: tasteMd, events });
  const decided = Array.isArray(out) ? out : (out?.decided || []);
  return { decided, real };
}

const building = new Set();

export async function buildRun(run, { call } = {}) {
  const t0 = Date.now();
  const dir = path.join(RUNS_DIR, run);
  const step = s => logEvent(run, 'build.step', { step: s, pane: 'engineering' });
  step('Reading her flow, her three answers and her file');
  const events = readEvents(run);
  const tasteFile = path.join(dir, 'taste.md');
  const tasteMd = fs.existsSync(tasteFile) ? fs.readFileSync(tasteFile, 'utf8') : '';
  const g = gatherRun(events, tasteMd);
  step('Re-deciding the rest against her file');
  const { decided, real } = await redecide(run, events, tasteMd);
  if (!real) step('Using team defaults (the re-decision is not wired yet)');
  const r = await fillPage({ run, outDir: path.join(dir, 'page'), ...g, decided, call, onStep: step });
  const url = `/runs/${run}/page/`;
  const ms = Date.now() - t0;
  logEvent(run, 'build.done', { url, ms, fillMs: r.modelMs, template: r.template });
  return { url, ms, fillMs: r.modelMs, template: r.template };
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
