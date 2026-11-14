// npm run local: the full app on the demo machine. Loads .env.local (names only are printed, never values), then
// starts server.js, which re-runs itself with the proxy flag when it needs to. Ctrl-C stops it.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { loadEnvLocal, describe, ROOT } from './env-local.mjs';

const r = loadEnvLocal();
console.log(describe(r));
console.log(`model backend: ${process.env.MODEL_BACKEND || 'claude-code'}`);
const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], { stdio: 'inherit', env: process.env, cwd: ROOT });
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => child.kill(sig));
child.on('exit', (code, sig) => process.exit(code ?? (sig ? 1 : 0)));
