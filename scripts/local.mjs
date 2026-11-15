// npm run local: the full app on the demo machine. Loads .env.local (names only are printed, never values), picks the
// port (PORT if set, else the first free one from 3000 to 3010: another app may hold 3000, and we never touch it),
// starts server.js, waits until it answers, and prints the URL big. Writes .byoc-server.pid and .byoc-server.port
// (git-ignored) so "Stop BYOC.command" stops only this server. Ctrl-C stops it.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadEnvLocal, describe, routeLine, ROOT, pickPort, portFree, PID_FILE, PORT_FILE, PORT_FROM, PORT_TO } from './env-local.mjs';

const r = loadEnvLocal();
const route = routeLine();
console.log(route.line); // first line: the active route (docs/REHEARSAL.md)
if (route.warn) console.log(route.warn);
console.log(describe(r));
console.log(`model backend: ${process.env.MODEL_BACKEND || 'claude-code'}`);
let port;
if (process.env.PORT) {
  port = Number(process.env.PORT);
  if (!(await portFree(port))) { console.error(`Port ${port} (from PORT) is in use. Stop what runs there, or unset PORT to pick a free one.`); process.exit(1); }
} else {
  port = await pickPort();
  if (!port) { console.error(`Ports ${PORT_FROM} to ${PORT_TO} are all in use. Close one of those apps, or set PORT=...`); process.exit(1); }
  if (port !== PORT_FROM) console.log(`port ${PORT_FROM} is busy (another app), so we use ${port}`);
}
const url = `http://localhost:${port}/`;
const env = { ...process.env, PORT: String(port) };
const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], { stdio: 'inherit', env, cwd: ROOT });
const mine = f => { try { return fs.readFileSync(f, 'utf8').trim() === String(process.pid); } catch { return false; } };
try { fs.writeFileSync(PID_FILE, String(process.pid)); fs.writeFileSync(PORT_FILE, String(port)); } catch {}
const cleanup = () => { if (mine(PID_FILE)) { try { fs.unlinkSync(PID_FILE); fs.unlinkSync(PORT_FILE); } catch {} } };
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => child.kill(sig));
child.on('exit', (code, sig) => { cleanup(); process.exit(code ?? (sig ? 1 : 0)); });

// Wait until it answers, then say where it is, big.
for (let i = 0; i < 120; i++) {
  try { const res = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (res.ok || res.status < 500) break; } catch {}
  await new Promise(r => setTimeout(r, 250));
}
const line = `   Open  ${url}   `;
console.log(`\n  ${'='.repeat(line.length)}\n  ${line}\n  ${'='.repeat(line.length)}\n`);
