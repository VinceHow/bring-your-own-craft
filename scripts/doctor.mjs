// npm run doctor: is this machine ready to run the demo? Plain-English pass/fail, with a fix line for each.
// Reads .env.local like `npm run local` does. Never prints a key's value; every error passes through scrub().
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { loadEnvLocal, describe, routeLine, KEYS, pickPort, portFree, PORT_FROM, PORT_TO } from './env-local.mjs';

// Behind an HTTPS proxy (cloud sessions) Node's fetch needs NODE_USE_ENV_PROXY=1 at start-up, as server.js does.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const child = spawn(process.execPath, ['--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
  child.on('exit', code => process.exit(code ?? 1));
  await new Promise(() => {});
}

const env = loadEnvLocal();
// --only port: just the port check (the tests use it; no model call, no network).
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || (process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '');
const want = k => !ONLY || ONLY === k;
const { scrub: scrubModel, FAL_URL, FAL_MODELS } = await import('../lib/model.js');
const secrets = () => KEYS.filter(k => k !== 'MODEL_BACKEND').map(k => process.env[k]).filter(v => v && v.length >= 4);
const scrub = s => { let o = scrubModel(s); for (const v of secrets()) o = o.split(v).join('[key]'); return o; };
const proxied = !!(process.env.HTTPS_PROXY || process.env.https_proxy);
const results = [];
// ok: true PASS, false FAIL (required: the exit code is 1), null NOTE, 'warn' WARN (a key that doesn't work: the room
// still runs, on Claude Code and typed answers).
const say = (ok, what, fix) => { results.push(ok); console.log(`${ok === true ? 'PASS' : ok === null ? 'NOTE' : ok === 'warn' ? 'WARN' : 'FAIL'}  ${what}`); if (fix && ok !== true) console.log(`      fix: ${fix}`); };
const short = (e, n = 140) => scrub(e?.message || e).replace(/\s+/g, ' ').slice(0, n);

const route = routeLine();
console.log(route.line); // first line: the active route (docs/REHEARSAL.md)
if (route.warn) { results.push('warn'); console.log(route.warn); }
console.log(`Bring your own craft: doctor\n${describe(env)}\n`);

// 1. Node
if (want('node')) {
const major = Number(process.versions.node.split('.')[0]);
say(major >= 22, `Node ${process.versions.node} (22 or newer needed)`, 'install Node 22 from nodejs.org, then open a new terminal');
}

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
if (want('claude')) {
const ver = await run('claude', ['--version'], 15000);
const onPath = !ver.error && !ver.timeout && ver.code === 0;
say(onPath, onPath ? `Claude Code installed (${ver.out.trim().split('\n')[0]})` : 'Claude Code (`claude`) not found on PATH',
  'install it: npm install -g @anthropic-ai/claude-code, then run `claude` once to log in');
if (onPath) {
  const t0 = Date.now();
  const r = await run('claude', ['-p', 'Reply with the single word ok.', '--system-prompt', 'You reply with one word.', '--tools', '',
    '--setting-sources', '', '--strict-mcp-config', '--output-format', 'json', '--no-session-persistence', '--model', process.env.TAG_MODEL || 'haiku'], 90000);
  let ok = false, why = '';
  if (r.timeout) why = 'no answer in 90 s';
  else if (r.error) why = short(r.error);
  else { try { const d = JSON.parse(r.out); ok = !d.is_error; if (!ok) why = short(d.result || d.terminal_reason || 'error'); } catch { why = short(r.err || r.out || `exit ${r.code}`); } }
  say(ok, ok ? `Claude Code is logged in and answers (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `Claude Code did not answer: ${why}`,
    'run `claude` in a terminal and log in; if it says you hit a usage limit, set MODEL_BACKEND=fal in .env.local');
}
// 2b. The room's real call, through lib/model.js itself (the server's spawn, env, flags and the name tag's time limit),
// with its time. An older Claude Code that doesn't know a flag is said here; the server drops it and carries on.
if (onPath && (process.env.MODEL_BACKEND || 'claude-code') === 'claude-code') {
  const M = await import('../lib/model.js');
  const { TAG_MODEL, TAG_LIMIT_MS, tagCard } = await import('../lib/tag.js');
  process.env.MODEL_QUIET = '1'; // the doctor says it in its own words below
  const t0 = Date.now();
  let ok = false, why = '';
  // The real thing: her name tag's card call (its own prompt, schema, model and limit), so a slow tag shows here.
  try {
    const r = await tagCard('I love talking to customers and turning what they say into what we build', { callModel: M.callModel });
    ok = !r.body.rough; if (!ok) why = short(r.body.error || 'no card');
  } catch (e) { why = short(e); }
  if (ok && Date.now() - t0 > 8000) { ok = 'warn'; }
  delete process.env.MODEL_QUIET;
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const dropped = [...M.droppedFlags];
  say(ok ? (dropped.length || ok === 'warn' ? 'warn' : true) : false,
    ok ? `The room's call works (her name tag's card, ${TAG_MODEL}, through lib/model.js): ${secs} s of ${TAG_LIMIT_MS / 1000} s allowed${ok === 'warn' ? ' (slow: her rough card shows first, the team fills it in)' : ''}${dropped.length ? `, but this Claude Code doesn't know ${dropped.join(', ')}` : ''}`
      : `The room's call failed after ${secs} s: ${why}`,
    dropped.length ? 'update Claude Code: npm i -g @anthropic-ai/claude-code (the room drops the flag and carries on, but slower)'
      : 'run `claude` in a terminal and log in; if it keeps failing or is slow, set MODEL_BACKEND=fal in .env.local');
}

}

// 2c. A burst shaped like her Send in a focus moment (b3, beats): four calls at once, as the server fires them:
// the meeting's reading (sonnet), the first reply (THREAD_MODEL, default haiku: the line she waits for), Design's redraw
// (sonnet) and the run of decisions (FIRST_MODEL, default haiku), all low effort, through lib/model.js. The wall time is what she waits for the whole room; over
// 10 s this laptop is too slow for the live calls (the fix: MODEL_BACKEND=fal in .env.local).
async function sendBurst(M) {
  const line = { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] };
  // The models the room will use (Fallback B sets these to sonnet on a company gateway).
  const THREAD = process.env.THREAD_MODEL || 'haiku', FIRST = process.env.FIRST_MODEL || 'haiku';
  const shapes = [
    ['reading (sonnet)', 'sonnet', 'You read what a small business owner said about who her bakery website is for, and sum up what she believes in one sentence, in her voice.'],
    [`first reply (${THREAD})`, THREAD, 'You are Noor, the researcher on a small team. React to what she said in one short line (under 15 words). Never a question.'],
    ['redraw (sonnet)', 'sonnet', 'You are Design. Redraw a customer journey as 3 to 5 short stage names, from what she said. Reply with the stages joined by " -> " in text.'],
    [`decisions (${FIRST})`, FIRST, 'You are a small product team. Name three short product calls her answer settles, joined by "; " in text.'],
  ];
  const said = "It's really for the regulars. They come every morning and hate it when the sourdough's gone by nine.";
  const t0 = Date.now();
  const out = await Promise.all(shapes.map(async ([name, model, system]) => {
    const t = Date.now();
    try { await M.callModel({ system, user: said, schema: line, model, effort: 'low', timeoutMs: 60000, label: `doctor ${name}` }); return `${name} ${((Date.now() - t) / 1000).toFixed(1)} s`; }
    catch (e) { return `${name} FAILED (${short(e, 60)})`; }
  }));
  return { secs: (Date.now() - t0) / 1000, out, failed: out.some(o => /FAILED/.test(o)) };
}
const burstReady = async () => (process.env.MODEL_BACKEND || 'claude-code') !== 'claude-code' || (r => !r.error && !r.timeout && r.code === 0)(await run('claude', ['--version'], 15000));
if (want('burst') && await burstReady()) {
  const M = await import('../lib/model.js');
  process.env.MODEL_QUIET = '1';
  const b = await sendBurst(M);
  delete process.env.MODEL_QUIET;
  const backendName = process.env.MODEL_BACKEND || 'claude-code';
  say(b.failed ? 'warn' : b.secs > 10 ? 'warn' : true,
    `A Send-shaped burst (4 calls at once, ${backendName}): ${b.secs.toFixed(1)} s wall · ${b.out.join(' · ')}${b.secs > 10 ? ' (slow: her replies will lag on stage)' : ''}`,
    'over 10 s: close other apps, or set MODEL_BACKEND=fal in .env.local (the live calls go to fal); MODEL_CONCURRENCY=2 limits how many run at once');
}

// 3. Keys: set or missing (never the value), and 4. each works, with one cheap call
const set = k => !!process.env[k];
if (want('keys')) {
for (const k of KEYS.filter(k => k !== 'MODEL_BACKEND')) {
  say(set(k) ? true : null, `${k}: ${set(k) ? 'set' : proxied ? 'not set here (a cloud proxy may inject it)' : 'missing'}`,
    `add a line ${k}=... to .env.local (see docs/RUN-LOCALLY.md)`);
}
console.log(`NOTE  MODEL_BACKEND: ${process.env.MODEL_BACKEND || 'claude-code (default)'}`);
async function call(name, fn, fix) {
  const t0 = Date.now();
  try { const why = await fn(); say(why === true ? true : 'warn', why === true ? `${name} works (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `${name}: ${why}`, fix); }
  catch (e) { say('warn', `${name}: ${e?.name === 'TimeoutError' ? 'no answer in 20 s' : short(e)}`, fix); }
}
const tryKey = k => set(k) || proxied;
if (tryKey('FAL_KEY')) await call('fal (Claude through the OpenRouter router)', async () => {
  const r = await fetch(FAL_URL, { method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${process.env.FAL_KEY || 'placeholder'}` },
    body: JSON.stringify({ model: FAL_MODELS.haiku, max_tokens: 5, messages: [{ role: 'user', content: 'Say ok.' }] }) });
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
// Noor's Focus 1 finding found live (lib/live-finding.js) when Linkup answers; otherwise the prepared one. Never the key.
console.log(`NOTE  live research: ${tryKey('LINKUP_API_KEY') && results.at(-1) === true ? 'on' : 'off (prepared finding)'}`);

}

// 5. The port: 3000, or the first free one up to 3010 (another app may hold 3000; we never touch it)
let port = Number(process.env.PORT || 0) || null;
if (!want('port')) {}
else if (port) say(await portFree(port), `port ${port} (from PORT) ${await portFree(port) ? 'is free' : 'is in use'}`, `stop what runs on ${port}, or unset PORT so a free one is picked`);
else {
  port = await pickPort();
  if (!port) say(false, `ports ${PORT_FROM} to ${PORT_TO} are all in use`, 'close one of those apps (or a second copy of this one), or set PORT=... in .env.local');
  else if (port === PORT_FROM) say(true, `port ${port} is free`);
  else say(null, `port ${PORT_FROM} is busy (another app), so we'll use ${port}`);
}

// 6. The browser
if (!ONLY) console.log('NOTE  browser: Chrome is recommended. Safari plays the clips too (Range requests), but asks for the mic differently.');

const failed = results.filter(r => r === false).length, warned = results.filter(r => r === 'warn').length;
console.log(`\n${failed ? `${failed} required check${failed > 1 ? 's' : ''} failed: see the fix lines above.`
  : `All required checks pass${warned ? ` (${warned} warning${warned > 1 ? 's' : ''}: the room still runs)` : ''}: run \`npm run local\`, then open the URL it prints (http://localhost:${port || PORT_FROM})`}`);
process.exit(failed ? 1 : 0);
