// POST /api/run/:id/build: re-decide the rest against her updated file, then fill the template live.
// Progress as build.step events (the current step, never a spinner); ends with build.done { url, ms }.
import fs from 'node:fs';
import path from 'node:path';
import { logEvent, readEvents, RUNS_DIR } from '../lib/events.js';
import { sendJson } from '../lib/http.js';
import { scrub } from '../lib/model.js';
import { fillPage, gatherRun, pickTemplate } from '../lib/fill.js';
import { dealDesign } from '../lib/design.js';
import { decideRest, loadRest } from '../lib/select.js';
import { revisitJoint } from '../lib/joint.js';
import { SEED } from '../lib/taste.js';

const RUN_ID = /^[\w.-]{1,120}$/;

let decideRestImpl = decideRest;
let dealImpl = dealDesign;
let revisitImpl = null;
// For tests only: swap the joint agreements' revisit call ((candidates, takeaways) -> { decided }). null restores the real one.
export function _setDecideCore(fn) { revisitImpl = fn || null; }
// For tests only: swap Design's live deal. null restores the real one.
export function _setDeal(fn) { dealImpl = fn || dealDesign; }
// For scripts/tests only: swap the re-decision (fill-demo's --sample-decide). null restores the real one.
export function _setDecideRest(fn) { decideRestImpl = fn || decideRest; }

// Re-decide the candidates she wasn't asked, against her updated file (logs `decided` itself, round 'build').
async function redecide(run, tasteMd, { idea, flow }) {
  // What she settled in a focus moment (answer.mapped) is hers: the team never re-decides it.
  const settled = new Set(readEvents(run).filter(e => e.type === 'answer.mapped').flatMap(m => (m.decisions || []).map(d => d.id)));
  // What the team agreed in the team space (lib/joint.js) isn't re-decided with the rest (loadRest skips it); it reaches
  // the page as agreed, unless her takeaways or her answers since touch it (revisitJoint), in parallel with the rest.
  const [out, joint] = await Promise.all([
    decideRestImpl(loadRest(run).filter(c => !settled.has(c.id)), tasteMd, { run, idea, flow, round: 'build' }),
    revisitJoint(run, { idea, ...(revisitImpl ? { decide: revisitImpl } : {}) }),
  ]);
  return [...joint, ...(Array.isArray(out) ? out : (out?.decided || []))];
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
  // Design deals the page's palette and type live through taste-skill (lib/design.js), alongside the re-decision's log.
  step('Design picks the palette and type');
  const design = await dealImpl({ template: pickTemplate(g.idea) });
  if (design.skipped) logEvent(run, 'design.dealt', { pane: 'design', seat: 'design', skipped: design.skipped });
  else logEvent(run, 'design.dealt', { pane: 'design', seat: 'design', trade: design.trade, palette: design.palette, typeId: design.type,
    typeUsed: !design.typeFallback, faces: design.typeFallback ? design.wanted : design.faces, ms: design.ms });
  const r = await fillPage({ run, outDir: path.join(dir, 'page'), ...g, decided, call, design: design.skipped ? null : design, onStep: step });
  const url = `/runs/${run}/page/`;
  const ms = Date.now() - t0;
  logEvent(run, 'build.done', { url, ms, decideMs, fillMs: r.modelMs, template: r.template });
  return { url, ms, decideMs, fillMs: r.modelMs, template: r.template, decided };
}

// Built pages are served from RUNS_DIR (server.js's static /runs/ reads <repo>/runs, which misses a RUNS_DIR set
// elsewhere, as e2e does). Same path rules: nothing outside RUNS_DIR.
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };
function servePage(req, res, { url }) {
  const rel = decodeURIComponent(url.pathname).slice('/runs/'.length);
  let f = path.normalize(path.join(RUNS_DIR, rel));
  if (!f.startsWith(RUNS_DIR + path.sep)) { res.writeHead(403); return res.end(); }
  if (fs.statSync(f, { throwIfNoEntry: false })?.isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const BUILD = /^\/api\/run\/([^/]+)\/build$/;
export default [{ method: 'GET', match: url => url.pathname.startsWith('/runs/'), handler: servePage }, {
  method: 'POST', match: url => BUILD.test(url.pathname),
  handler: async (req, res, { url }) => {
    const run = decodeURIComponent(url.pathname.match(BUILD)[1]);
    if (!RUN_ID.test(run) || !fs.existsSync(path.join(RUNS_DIR, run))) return sendJson(res, 404, { error: 'unknown run' });
    if (building.has(run)) return sendJson(res, 409, { error: 'already building' });
    // "Your own craft" (known limit): two prepared templates; a DIY idea neither fits gets no page, never the wrong one.
    const start = readEvents(run).find(e => e.type === 'run.start');
    if (start?.seat === 'diy' && start.template === null) return sendJson(res, 409, { error: 'no page template for this idea', noTemplate: true });
    building.add(run);
    try {
      sendJson(res, 200, await buildRun(run));
    } catch (e) {
      logEvent(run, 'build.step', { step: 'Build failed: ' + scrub(e.message).slice(0, 160), pane: 'engineering' });
      sendJson(res, 500, { error: scrub(e.message) });
    } finally { building.delete(run); }
  },
}];
