// .env.local: the demo machine's keys, in a git-ignored file at the repo root. No dependency, a few lines:
// KEY=value per line, # comments and blank lines skipped, surrounding quotes stripped, `export ` allowed.
// Only the names below are taken, and only if not already set. Values are never printed or logged.
import fs from 'node:fs';
import path from 'node:path';

export const KEYS = ['FAL_KEY', 'ELEVENLABS_API_KEY', 'LINKUP_API_KEY', 'ADMIN_TOKEN', 'MODEL_BACKEND'];
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const envFile = () => process.env.ENV_LOCAL_FILE || path.join(ROOT, '.env.local');

export function parseEnv(text) {
  const out = {};
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (/^(["']).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, ''); // an unquoted trailing comment
    out[m[1]] = v;
  }
  return out;
}

// Loads the file into `env` (process.env by default). Returns { file, found, loaded: [names], kept: [names] }.
export function loadEnvLocal(env = process.env, file = envFile()) {
  if (!fs.existsSync(file)) return { file, found: false, loaded: [], kept: [] };
  const vals = parseEnv(fs.readFileSync(file, 'utf8'));
  const loaded = [], kept = [];
  for (const k of KEYS) {
    if (!(k in vals) || vals[k] === '') continue;
    if (env[k]) { kept.push(k); continue; }
    env[k] = vals[k]; loaded.push(k);
  }
  return { file, found: true, loaded, kept };
}

export function describe(r) {
  if (!r.found) return 'no .env.local (keys come from the environment, if any)';
  const parts = [`loaded ${r.loaded.length} key${r.loaded.length === 1 ? '' : 's'} from .env.local${r.loaded.length ? ` (${r.loaded.join(', ')})` : ''}`];
  if (r.kept.length) parts.push(`already set, kept: ${r.kept.join(', ')}`);
  return parts.join('; ');
}

// ---- the port: 3000, or the first free one up to 3010 (another app may hold 3000; we never touch it) ----------
import net from 'node:net';
export const PORT_FROM = 3000, PORT_TO = 3010;
export const PID_FILE = path.join(ROOT, '.byoc-server.pid');
export const PORT_FILE = path.join(ROOT, '.byoc-server.port');
function canListen(port, host) {
  return new Promise(res => {
    const s = net.createServer();
    s.once('error', e => res(e.code === 'EAFNOSUPPORT' || e.code === 'EADDRNOTAVAIL' ? true : false)); // no IPv6 here: fine
    s.once('listening', () => s.close(() => res(true)));
    s.listen(port, host);
  });
}
// Free on every address the server listens on (all of them), and on localhost's two forms, which an app may hold alone.
export async function portFree(port) {
  for (const host of [undefined, '127.0.0.1', '::1']) if (!(await canListen(port, host))) return false;
  return true;
}
export async function pickPort(from = PORT_FROM, to = PORT_TO) {
  for (let p = from; p <= to; p++) if (await portFree(p)) return p;
  return null;
}
