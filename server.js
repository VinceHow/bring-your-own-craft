// One Node server: the room UI (public/), built pages, API routes, SSE events.
// Each builder adds routes in routes/<piece>.js exporting `default [{method, path, handler(req,res,ctx)}]`.
// `path` may end in '*' for a prefix match; or give `match(url) -> bool` for patterns like /api/run/:id/x. ctx = { body (parsed JSON or null), url }.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { onEvent } from './lib/events.js';
import { scrub } from './lib/model.js';
import { sendJson } from './lib/http.js';

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const routes = [];
for (const f of fs.readdirSync(path.join(ROOT, 'routes')).filter(f => f.endsWith('.js')).sort()) {
  const mod = await import(path.join(ROOT, 'routes', f));
  routes.push(...(mod.default || []));
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.md': 'text/plain; charset=utf-8' };

function serveFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
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
    if (p.startsWith('/runs/')) {
      const f = path.normalize(path.join(ROOT, p));
      if (!f.startsWith(path.join(ROOT, 'runs'))) { res.writeHead(403); return res.end(); }
      return serveFile(res, fs.statSync(f, { throwIfNoEntry: false })?.isDirectory() ? path.join(f, 'index.html') : f);
    }
    const f = path.normalize(path.join(ROOT, 'public', p === '/' ? 'index.html' : p === '/gallery' ? 'gallery.html' : p));
    if (!f.startsWith(path.join(ROOT, 'public'))) { res.writeHead(403); return res.end(); }
    return serveFile(res, f);
  } catch (e) {
    console.error(scrub(e.stack || e.message));
    if (!res.headersSent) sendJson(res, 500, { error: scrub(e.message) });
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'server.js')) {
  server.listen(PORT, () => console.log(`room on http://localhost:${PORT}`));
}
export default server;
