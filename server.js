// One Node server: the room UI (public/), built pages, API routes, SSE events.
// Each builder adds routes in routes/<piece>.js exporting `default [{method, path, handler(req,res,ctx)}]`.
// `path` may end in '*' for a prefix match; or give `match(url) -> bool` for patterns like /api/run/:id/x. ctx = { body (parsed JSON or null), url }.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { onEvent } from './lib/events.js';
import { scrub, warmUp } from './lib/model.js';
import { TAG_MODEL, TAG_EFFORT } from './lib/tag.js';
import { sendJson } from './lib/http.js';

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.dirname(new URL(import.meta.url).pathname);

// Behind an HTTPS proxy (cloud sessions), Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY=1 is set at
// start-up, so outbound calls (ElevenLabs, fal) fail. When run directly with a proxy and without the flag, re-run this
// server as a child with the flag, forwarding signals and the exit code. On a laptop with no proxy, nothing changes.
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'server.js')
    && (process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, ['--no-warnings', ...process.execArgv, ...process.argv.slice(1)],
    { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => child.kill(sig));
  child.on('exit', (code, sig) => process.exit(code ?? (sig ? 1 : 0)));
  await new Promise(() => {}); // the child is the server now
}
const routes = [];
for (const f of fs.readdirSync(path.join(ROOT, 'routes')).filter(f => f.endsWith('.js')).sort()) {
  const mod = await import(path.join(ROOT, 'routes', f));
  routes.push(...(mod.default || []));
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.md': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

// Static files answer HTTP Range requests (bytes=a-b, a-, -n), so <video> can seek and Safari plays mp4: 206 with
// Content-Range, 416 for a range past the end, a plain 200 otherwise (multi-range too). Accept-Ranges on every one.
export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header || '').trim());
  if (!m || (m[1] === '' && m[2] === '')) return null; // none, malformed or multi-range: the whole file
  let start, end;
  if (m[1] === '') { const n = Number(m[2]); if (n === 0) return 'unsatisfiable'; start = Math.max(0, size - n); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}
function serveFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    const head = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    const r = req.headers.range ? parseRange(req.headers.range, st.size) : null;
    if (r === 'unsatisfiable') { res.writeHead(416, { ...head, 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    const { start, end } = r || { start: 0, end: st.size - 1 };
    res.writeHead(r ? 206 : 200, { ...head, 'Content-Length': st.size ? end - start + 1 : 0,
      ...(r ? { 'Content-Range': `bytes ${start}-${end}/${st.size}` } : {}) });
    if (req.method === 'HEAD' || !st.size) return res.end();
    const s = fs.createReadStream(file, { start, end });
    s.on('error', () => res.destroy());
    s.pipe(res);
  });
}
async function readBody(req) {
  const chunks = []; for await (const c of req) chunks.push(c);
  const s = Buffer.concat(chunks).toString('utf8');
  if (!s) return null;
  try { return JSON.parse(s); } catch { return Object.fromEntries(new URLSearchParams(s)); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/events') { // SSE
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': ok\n\n');
      const off = onEvent(ev => res.write(`data: ${JSON.stringify(ev)}\n\n`));
      return req.on('close', off);
    }
    const r = routes.find(r => r.method === req.method && (r.match ? r.match(url) :
      r.path.endsWith('*') ? url.pathname.startsWith(r.path.slice(0, -1)) : r.path === url.pathname));
    if (r) return await r.handler(req, res, { body: req.method === 'GET' ? null : await readBody(req), url });
    // Static: public/ for the room; runs/<id>/page/ for built pages.
    const p = decodeURIComponent(url.pathname);
    // A run's built page is served by routes/build.js (GET only, that run's page folder only). Nothing else under
    // /runs/ is ever served, whatever the method: a run's log, taste.md and profile stay on the server.
    if (p.startsWith('/runs/')) { res.writeHead(405, { Allow: 'GET' }); return res.end(); }
    const f = path.normalize(path.join(ROOT, 'public', p === '/' ? 'index.html' : p === '/gallery' ? 'gallery.html' : p));
    if (!f.startsWith(path.join(ROOT, 'public'))) { res.writeHead(403); return res.end(); }
    return serveFile(req, res, f);
  } catch (e) {
    console.error(scrub(e.stack || e.message));
    if (!res.headersSent) sendJson(res, 500, { error: scrub(e.message) });
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'server.js')) {
  server.listen(PORT, () => {
    console.log(`room on http://localhost:${PORT}`);
    // claude-code backend: the CLI's version, and one tiny call so the first live call isn't cold (lib/model.js).
    // Not under node --test (unit and e2e servers): no extra model call there.
    if (process.env.WARM_UP !== '0' && !process.env.NODE_TEST_CONTEXT) warmUp({ model: TAG_MODEL, effort: TAG_EFFORT }).catch(() => {});
  });
}
export default server;
