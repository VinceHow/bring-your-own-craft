// npm run doctor: is this machine ready to run the demo? Plain-English pass/fail, with a fix line for each.
// Reads .env.local like `npm run local` does. Never prints a key's value; every error passes through scrub().
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { loadEnvLocal, describe, KEYS } from './env-local.mjs';

// Behind an HTTPS proxy (cloud sessions) Node's fetch needs NODE_USE_ENV_PROXY=1 at start-up, as server.js does.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const child = spawn(process.execPath, ['--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
  child.on('exit', code => process.exit(code ?? 1));
  await new Promise(() => {});
}

const env = loadEnvLocal();
const { scrub: scrubModel, FAL_URL } = await import('../lib/model.js');
const secrets = () => KEYS.filter(k => k !== 'MODEL_BACKEND').map(k => process.env[k]).filter(v => v && v.length >= 4);
const scrub = s => { let o = scrubModel(s); for (const v of secrets()) o = o.split(v).join('[key]'); return o; };
const proxied = !!(process.env.HTTPS_PROXY || process.env.https_proxy);
const results = [];
const say = (ok, what, fix) => { results.push(ok); console.log(`${ok === true ? 'PASS' : ok === null ? 'NOTE' : 'FAIL'}  ${what}`); if (fix && ok !== true) console.log(`      fix: ${fix}`); };
const short = (e, n = 140) => scrub(e?.message || e).replace(/\s+/g, ' ').slice(0, n);

console.log(`Bring your own craft: doctor\n${describe(env)}\n`);

// 1. Node
const major = Number(process.versions.node.split('.')[0]);
say(major >= 22, `Node ${process.versions.node} (22 or newer needed)`, 'install Node 22 from nodejs.org, then open a new terminal');

// 2. Claude Code: on PATH, and logged in (one tiny call, the same flags lib/model.js uses)
function run(cmd, args, timeoutMs) {
  return new Promise(resolve => {
    let out = '', err = '', done = false;
    let p;
    try { p = spawn(cmd, args, { cwd: '/tmp', env: { ...process.env, FAL_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { return resolve({ error: e }); }
    const t = setTimeout(() => { if (!done) { done = true; p.kill('SIGKILL'); resolve({ timeout: true }); } }, timeoutMs);
    p.stdout.on('data', d => (out += d)); p.stderr.on('data', d => (err += d));
    p.on('error', e => { if (!done) { done = true; clearTimeout(t); resolve({ error: e }); } });
    p.on('close', code => { if (!done) { done = true; clearTimeout(t); resolve({ code, out, err }); } });
  });
}
const ver = await run('claude', ['--version'], 15000);
const onPath = !ver.error && !ver.timeout && ver.code === 0;
say(onPath, onPath ? `Claude Code installed (${ver.out.trim().split('\n')[0]})` : 'Claude Code (`claude`) not found on PATH',
  'install it: npm install -g @anthropic-ai/claude-code, then run `claude` once to log in');
if (onPath) {
  const t0 = Date.now();
  const r = await run('claude', ['-p', 'Reply with the single word ok.', '--system-prompt', 'You reply with one word.', '--tools', '',
    '--setting-sources', '', '--strict-mcp-config', '--output-format', 'json', '--no-session-persistence', '--model', 'haiku'], 90000);
  let ok = false, why = '';
  if (r.timeout) why = 'no answer in 90 s';
  else if (r.error) why = short(r.error);
  else { try { const d = JSON.parse(r.out); ok = !d.is_error; if (!ok) why = short(d.result || d.terminal_reason || 'error'); } catch { why = short(r.err || r.out || `exit ${r.code}`); } }
  say(ok, ok ? `Claude Code is logged in and answers (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `Claude Code did not answer: ${why}`,
    'run `claude` in a terminal and log in; if it says you hit a usage limit, set MODEL_BACKEND=fal in .env.local');
}
// 2b. The room's real call shape (the name tag's: --json-schema, --effort, its model). An older Claude Code that doesn't
// know a flag fails here loudly; the server would drop the flag and carry on (lib/model.js), slower and looser.
if (onPath) {
  const t0 = Date.now();
  const tagModel = process.env.TAG_MODEL || 'haiku', tagEffort = process.env.TAG_EFFORT || 'low';
  const r = await run('claude', ['-p', 'Say ok.', '--system-prompt', 'Reply with JSON.', '--tools', '', '--setting-sources', '',
    '--strict-mcp-config', '--output-format', 'json', '--no-session-persistence', '--json-schema',
    JSON.stringify({ type: 'object', properties: { ok: { type: 'string' } }, required: ['ok'] }), '--model', tagModel, '--effort', tagEffort], 90000);
  const unknown = String(r.err || r.out || '').match(/unknown option ['"`]?(--[a-z-]+)/i)?.[1];
  let ok = false, why = '';
  if (unknown) why = `this Claude Code (${ver.out.trim().split('\n')[0]}) doesn't know ${unknown}`;
  else if (r.timeout) why = 'no answer in 90 s';
  else if (r.error) why = short(r.error);
  else { try { const d = JSON.parse(r.out); ok = !d.is_error && !!(d.structured_output || d.result); if (!ok) why = short(d.result || d.terminal_reason || 'error'); } catch { why = short(r.err || r.out || `exit ${r.code}`); } }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  say(ok, ok ? `The room's call shape works (JSON schema, --effort ${tagEffort}, ${tagModel}): ${secs} s` : `The room's call shape failed: ${why}`,
    unknown ? 'update Claude Code: npm i -g @anthropic-ai/claude-code (the room drops the flag and carries on, but slower)'
      : 'run `claude` in a terminal and log in; if it keeps failing, set MODEL_BACKEND=fal in .env.local');
}

// 3. Keys: set or missing (never the value), and 4. each works, with one cheap call
const set = k => !!process.env[k];
for (const k of KEYS.filter(k => k !== 'MODEL_BACKEND')) {
  say(set(k) ? true : null, `${k}: ${set(k) ? 'set' : proxied ? 'not set here (a cloud proxy may inject it)' : 'missing'}`,
    `add a line ${k}=... to .env.local (see docs/RUN-LOCALLY.md)`);
}
console.log(`NOTE  MODEL_BACKEND: ${process.env.MODEL_BACKEND || 'claude-code (default)'}`);
async function call(name, fn, fix) {
  const t0 = Date.now();
  try { const why = await fn(); say(why === true, why === true ? `${name} works (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `${name}: ${why}`, fix); }
  catch (e) { say(false, `${name}: ${e?.name === 'TimeoutError' ? 'no answer in 20 s' : short(e)}`, fix); }
}
const tryKey = k => set(k) || proxied;
if (tryKey('FAL_KEY')) await call('fal (Claude through the OpenRouter router)', async () => {
  const r = await fetch(FAL_URL, { method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${process.env.FAL_KEY || 'placeholder'}` },
    body: JSON.stringify({ model: 'anthropic/claude-haiku-4.5', max_tokens: 5, messages: [{ role: 'user', content: 'Say ok.' }] }) });
  const t = await r.text();
  return r.ok ? true : `HTTP ${r.status} ${short(t, 100)}`;
}, 'check FAL_KEY in .env.local (fal.ai dashboard, Keys); the demo still runs on Claude Code without it');
if (tryKey('ELEVENLABS_API_KEY')) await call('ElevenLabs (speech-to-text)', async () => {
  const r = await fetch('https://api.elevenlabs.io/v1/models', { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY || 'placeholder-injected-by-proxy' }, signal: AbortSignal.timeout(20000) });
  if (r.ok) { await r.body?.cancel?.(); return true; }
  const t = await r.text().catch(() => '');
  // A key scoped to speech-to-text answers 401 missing_permissions here: the key works for voice (as routes/voice.js).
  return r.status === 401 && /missing_permissions/.test(t) ? true : `HTTP ${r.status} ${short(t, 100)}`;
}, 'check ELEVENLABS_API_KEY in .env.local; without it the mic hides and she types');
if (tryKey('LINKUP_API_KEY')) await call('Linkup (search)', async () => {
  const r = await fetch('https://api.linkup.so/v1/search', { method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINKUP_API_KEY || 'placeholder'}` },
    body: JSON.stringify({ q: 'neighbourhood bakery', depth: 'standard', outputType: 'searchResults' }) });
  const t = await r.text();
  return r.ok ? true : `HTTP ${r.status} ${short(t, 100)}`;
}, 'check LINKUP_API_KEY in .env.local; Research falls back to its prepared finding without it');

// 5. The port
const port = Number(process.env.PORT || 3000);
const free = await new Promise(res => { const s = net.createServer().once('error', () => res(false)).once('listening', () => s.close(() => res(true))).listen(port); });
say(free, `port ${port} ${free ? 'is free' : 'is in use'}`, `stop whatever runs on ${port} (another npm run local?), or start with PORT=3001 npm run local`);

// 6. The browser
console.log('NOTE  browser: Chrome is recommended. Safari plays the clips too (Range requests), but asks for the mic differently.');

const failed = results.filter(r => r === false).length;
console.log(`\n${failed ? `${failed} check${failed > 1 ? 's' : ''} failed: see the fix lines above.` : 'All good: run `npm run local`, then open http://localhost:' + port}`);
process.exit(failed ? 1 : 0);
