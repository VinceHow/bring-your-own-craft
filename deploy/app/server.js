// Placeholder bakery app: only /health, so the Railway service has something to deploy.
// The real app replaces this. No keys, nothing from the room.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { PORT, DEMO, DB_PATH, VOLUME_DIR } from './config.js';

// volume: true only if the database lives on the volume AND we can write there.
function volumeOk() {
  if (!VOLUME_DIR || !DB_PATH.startsWith(VOLUME_DIR + '/')) return false;
  try { const f = path.join(VOLUME_DIR, '.health'); fs.writeFileSync(f, String(Date.now())); fs.unlinkSync(f); return true; } catch { return false; }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, demo: DEMO, volume: volumeOk(), mount: process.env.RAILWAY_VOLUME_MOUNT_PATH || null }));
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('DEMO BAKERY, NO REAL BREAD. Opening soon.\n');
});
server.listen(PORT, () => console.log(`bakery on ${PORT}`));
