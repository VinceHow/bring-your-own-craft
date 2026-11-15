// POST /api/run/:id/build: re-decide the rest against her updated file, then fill the template live.
// Progress as build.step events (the current step, never a spinner); ends with build.done { url, ms }.
import fs from 'node:fs';
import path from 'node:path';
import { logEvent, readEvents, RUNS_DIR } from '../lib/events.js';
import { sendJson } from '../lib/http.js';
import { scrub } from '../lib/model.js';
import { fillPage, gatherRun, pickTemplate, loadTemplate } from '../lib/fill.js';
import { dealDesign } from '../lib/design.js';
import { decideRest, loadRest } from '../lib/select.js';
import { revisitJoint, jointSettled, revisitSettled } from '../lib/joint.js';
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
  // A revisit still running (a takeaway just written): wait for it, about 5 s at most; past that, the agreement as
  // logged goes to the page and the build doesn't start a second check of its own.
  await new Promise(r => setImmediate(r)); // an agreement that just landed has queued its revisit (the hook is a tick late)
  const { timedOut } = await revisitSettled(run);
  const skipCheck = timedOut;
  // What she settled in a focus moment (answer.mapped) is hers: the team never re-decides it.
  const settled = new Set(readEvents(run).filter(e => e.type === 'answer.mapped').flatMap(m => (m.decisions || []).map(d => d.id)));
  // What the team agreed in the team space (lib/joint.js) isn't re-decided with the rest (loadRest skips it); it reaches
  // the page as agreed, unless her takeaways or her answers since touch it (revisitJoint), in parallel with the rest.
  const [out, joint] = await Promise.all([
    decideRestImpl(loadRest(run).filter(c => !settled.has(c.id)), tasteMd, { run, idea, flow, round: 'build' }),
    revisitJoint(run, { idea, skipCheck, ...(revisitImpl ? { decide: revisitImpl } : {}) }),
  ]);
  return [...joint, ...(Array.isArray(out) ? out : (out?.decided || []))];
}

// One build at a time per run; a request while one runs waits for it and then builds the next version (at most one
// queued: a second request joins the queued one). Never a 409 for "already building": nothing is lost or doubled.
const building = new Map(); // run -> { current: Promise, next: Promise | null }

// The background v1 (the app button, on "Team, go"): her idea and the team's first proposals through the same fill and
// template, with no re-decision, no joint wait and no design deal, so it lands in about a fill's time. Its events carry
// background: true, so the room's beats never move for it; only the app button reads them.
// Tests only (e2e/app-first.e2e.js): BUILD_STUB=1 fills from the template's defaults after BUILD_STUB_MS, with no model
// call, no re-decision and no design deal. Never set on stage.
const STUB = process.env.BUILD_STUB === '1';
const stubCall = async ({ user }) => {
  await new Promise(r => setTimeout(r, Number(process.env.BUILD_STUB_MS || 1500)));
  const t = loadTemplate(/yoga|class/i.test(String(user || '')) ? 'yoga' : 'bakery').defaults;
  // each later stub build flips one switch, so a v2 has something to say in "what changed"
  const flip = ++stubN > 1 ? { standingOrder: !t.switches.standingOrder } : {};
  return { words: t.words, steps: t.steps, switches: { ...t.switches, ...flip }, decidedShown: [] };
};
let stubN = 0;
let buildImpl = (run, o) => buildRun(run, o);
export function _setBuild(fn) { buildImpl = fn || ((run, o) => buildRun(run, o)); }

export async function buildRun(run, { call = STUB ? stubCall : undefined, background = false } = {}) {
  const t0 = Date.now();
  const dir = path.join(RUNS_DIR, run);
  const bg = background ? { background: true } : {};
  const step = s => logEvent(run, 'build.step', { step: s, pane: 'engineering', ...bg });
  step(background ? 'A first version from her idea and the team’s first proposals' : 'Reading her flow, her three answers and her file');
  // A joint talk still going when she pressed Build finishes first, so its agreement is revisited against her file.
  if (!background && !STUB) await jointSettled(run);
  const events = readEvents(run);
  const tasteFile = path.join(dir, 'taste.md');
  const tasteMd = fs.readFileSync(fs.existsSync(tasteFile) ? tasteFile : SEED, 'utf8');
  const g = gatherRun(events, tasteMd);
  let decided = [], decideMs = 0, design = { skipped: 'first version' };
  if (!background && !STUB) {
    step('Re-deciding the rest against her file');
    const t1 = Date.now();
    decided = await redecide(run, tasteMd, g);
    decideMs = Date.now() - t1;
    // Design deals the page's palette and type live through taste-skill (lib/design.js), alongside the re-decision's log.
    step('Design picks the palette and type');
    design = await dealImpl({ template: pickTemplate(g.idea) });
    if (design.skipped) logEvent(run, 'design.dealt', { pane: 'design', seat: 'design', skipped: design.skipped });
    else logEvent(run, 'design.dealt', { pane: 'design', seat: 'design', trade: design.trade, palette: design.palette, typeId: design.type,
      typeUsed: !design.typeFallback, faces: design.typeFallback ? design.wanted : design.faces, ms: design.ms });
  }
  const r = await fillPage({ run, outDir: path.join(dir, 'page'), ...g, decided, call, design: design.skipped ? null : design, onStep: step });
  const url = `/runs/${run}/page/`;
  const ms = Date.now() - t0;
  // The app button (public/room.js): which version this is, and what changed, in plain words (from the page's switches).
  const prev = events.filter(e => e.type === 'build.done').at(-1);
  const switches = r.slots?.switches || {};
  const version = events.filter(e => e.type === 'build.done').length + 1;
  const changes = whatChanged(switches, prev?.switches || loadTemplate(r.template).defaults.switches, r.slots?.words || {}, !!prev);
  logEvent(run, 'build.done', { url, ms, decideMs, fillMs: r.modelMs, template: r.template, version, switches, changes, logo: r.logo, ...bg });
  return { url, ms, decideMs, fillMs: r.modelMs, template: r.template, decided };
}

// What a version changed, in her words' register: switches that differ from the last version (or, for v1, from the
// template's defaults), at most three. Never her text, only the cut-off line the page itself shows.
const SAY = {
  phone: ['phone field', 'no phone field'], remember: ['remembers regulars', 'remembers no one'],
  cancelReason: ['asks why on cancel', 'no reason asked to cancel'], oneTapCancel: ['one-tap cancel', 'cancel by asking'],
  standingOrder: ['a standing weekly order', 'no standing order'], cutoff: ['a clear cut-off', 'no cut-off'],
  regularsFirst: ['regulars’ usual first', 'the bread first'], regulars: ['a regulars’ corner', 'no regulars’ corner'],
  waitlist: ['a waitlist for full classes', 'no waitlist'],
};
export function whatChanged(now, before, words = {}, rebuilt = false) {
  const out = [];
  for (const k of Object.keys(SAY)) {
    if (!(k in now) || now[k] === before?.[k]) continue;
    out.push(k === 'cutoff' && now[k] && words.cutoffLine ? String(words.cutoffLine).slice(0, 40) : SAY[k][now[k] ? 0 : 1]);
  }
  return out.length ? out.slice(0, 3) : [rebuilt ? 'same calls, fresh words' : 'the template as the team agreed it'];
}

// Built pages are served from RUNS_DIR (server.js's static /runs/ reads <repo>/runs, which misses a RUNS_DIR set
// elsewhere, as e2e does). Same path rules: nothing outside RUNS_DIR.
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };
// Only a run's built app: /runs/<run id>/page/... and the page's own kinds of file. Nothing else in a run folder (its
// event log, taste.md, profile, the build's slots.json) is ever served, and nothing outside that run's page folder.
const PAGE_FILES = new Set(['.html', '.js', '.css', '.svg', '.woff2', '.webp', '.jpg', '.png']);
function servePage(req, res, { url }) {
  let rel;
  try { rel = decodeURIComponent(url.pathname).slice('/runs/'.length); } catch { res.writeHead(400); return res.end(); }
  if (rel.includes('\0')) { res.writeHead(400); return res.end(); }
  const [run, folder] = rel.split('/');
  if (!RUN_ID.test(run || '') || run.startsWith('.')) { res.writeHead(403); return res.end(); } // traversal or a bad id
  if (folder !== 'page') { res.writeHead(404); return res.end('not found'); }
  const root = path.join(RUNS_DIR, run, 'page');
  let f = path.normalize(path.join(RUNS_DIR, rel));
  if (f !== root && !f.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  if (fs.statSync(f, { throwIfNoEntry: false })?.isDirectory()) f = path.join(f, 'index.html');
  if (!PAGE_FILES.has(path.extname(f).toLowerCase())) { res.writeHead(404); return res.end('not found'); }
  // A link inside the page folder that points out of it is refused (the real path must be inside the page folder too).
  try { const real = fs.realpathSync(f), realRoot = fs.realpathSync(root); if (!real.startsWith(realRoot + path.sep)) { res.writeHead(403); return res.end(); } }
  catch { res.writeHead(404); return res.end('not found'); }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}

const BUILD = /^\/api\/run\/([^/]+)\/build$/;
export default [{ method: 'GET', match: url => url.pathname.startsWith('/runs/'), handler: servePage }, {
  method: 'POST', match: url => BUILD.test(url.pathname),
  handler: async (req, res, { url, body }) => {
    const run = decodeURIComponent(url.pathname.match(BUILD)[1]);
    if (!RUN_ID.test(run) || !fs.existsSync(path.join(RUNS_DIR, run))) return sendJson(res, 404, { error: 'unknown run' });
    // "Your own craft" (known limit): two prepared templates; a DIY idea neither fits gets no page, never the wrong one.
    const events = readEvents(run);
    const start = events.find(e => e.type === 'run.start');
    if (start?.seat === 'diy' && start.template === null) return sendJson(res, 409, { error: 'no page template for this idea', noTemplate: true });
    const background = body?.background === true;
    const b = building.get(run);
    // APP_V1=0 (the kill switch, docs/REHEARSAL.md): no background v1; her press at beat 8 builds v1, as before.
    if (background && process.env.APP_V1 === '0') return sendJson(res, 200, { skipped: 'APP_V1=0' });
    // The background v1 only ever builds first: once anything is built or building, it has nothing to add.
    if (background && (b || events.some(e => e.type === 'build.done'))) return sendJson(res, 200, { skipped: 'already built or building' });
    const go = () => buildImpl(run, { background }).catch(e => {
      logEvent(run, 'build.step', { step: 'Build failed: ' + scrub(e.message).slice(0, 160), pane: 'engineering', ...(background ? { background: true } : {}) });
      throw e;
    });
    let p;
    if (!b) { p = go(); building.set(run, { current: p, next: null }); }
    else if (b.next) p = b.next;                       // a press while one is queued joins it
    else { p = b.next = b.current.catch(() => {}).then(() => { const x = building.get(run); if (x) { x.current = x.next; x.next = null; } return go(); }); }
    const settle = () => { const x = building.get(run); if (x && x.current === p && !x.next) building.delete(run); };
    try { const r = await p; settle(); sendJson(res, 200, r); }
    catch (e) { settle(); sendJson(res, 500, { error: scrub(e.message) }); }
  },
}];
