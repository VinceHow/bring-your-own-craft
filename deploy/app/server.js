// Placeholder bakery app: only /health, so the Railway service has something to deploy.
// The real app replaces this. No keys, nothing from the room.
import http from 'node:http';
import { PORT, DEMO, DB_PATH } from './config.js';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, demo: DEMO, volume: DB_PATH.startsWith('/data/') }));
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('DEMO BAKERY, NO REAL BREAD. Opening soon.\n');
});
server.listen(PORT, () => console.log(`bakery on ${PORT}`));
