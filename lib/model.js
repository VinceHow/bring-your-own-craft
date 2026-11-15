// One model adapter. Every model call in the app goes through callModel().
// MODEL_BACKEND=claude-code (default): headless Claude Code, own system prompt, no tools, no project settings.
// MODEL_BACKEND=fal: fal's OpenRouter router on the user's own key (key lives in server memory only). In a cloud
// session the network proxy injects the key; start the server with NODE_USE_ENV_PROXY=1 there, or Node's fetch
// skips the proxy and fal answers 401.
import { spawn } from 'node:child_process';
import { validate } from './schema.js';

let falKey = process.env.FAL_KEY || null; // memory only; never written anywhere
export function setFalKey(k) { falKey = k ? String(k).trim() : null; }
export function hasFalKey() { return !!falKey; }
export function backend() { return process.env.MODEL_BACKEND || 'claude-code'; }

// Remove anything key-shaped from a string before it goes to a log, an event or a response.
export function scrub(s) {
  let out = String(s ?? '');
  if (falKey) out = out.split(falKey).join('[key]');
  return out.replace(/Key\s+[A-Za-z0-9:_\-.]{8,}/g, 'Key [key]');
}

// callModel({system, user, schema, model?, effort?, timeoutMs?}) -> validated JSON object.
// effort ('low'|'medium'|'high') is passed to the claude-code backend; low skips thinking, about 2x faster.
// Retries once on invalid JSON or schema mismatch. Throws Error with a scrubbed message.
// `label` names the call in the Terminal line a failure prints (`[model] <label> failed: <reason>`), scrubbed.
export async function callModel({ system, user, schema, model, effort, timeoutMs = 90000, label }) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = Date.now();
    try {
      const raw = backend() === 'fal'
        ? await callFal({ system, user, schema, model, timeoutMs })
        : await callClaudeCode({ system, user, schema, model, effort, timeoutMs });
      const errs = schema ? validate(raw, schema) : [];
      if (errs.length) throw new Error('schema: ' + errs.slice(0, 3).join('; '));
      return Object.defineProperty(raw, '_ms', { value: Date.now() - t0, enumerable: false });
    } catch (e) {
      lastErr = new Error(scrub(e.message));
      logFail(label || model || 'call', lastErr.message, attempt);
    }
  }
  throw lastErr;
}

// One stderr line per failed call, so the Terminal says why (the room only shows its fallback). Never a key value.
export function logFail(label, reason, attempt = 0) {
  if (process.env.MODEL_QUIET === '1') return; // the doctor reports in its own words
  console.error(`[model] ${label} failed${attempt ? ' again' : ''}: ${scrub(String(reason)).replace(/\s+/g, ' ').slice(0, 240)}`);
}

// Flags an older Claude Code may not know. When the CLI says "unknown option '--x'", that flag is dropped (with its
// value), remembered for the rest of the server's life, and the call goes again at once. Without --json-schema the
// prompt asks for JSON only and parseJsonLoose reads it; without --effort the model just thinks a little longer.
const OPTIONAL = { '--effort': 1, '--json-schema': 1, '--no-session-persistence': 0, '--strict-mcp-config': 0 };
export const droppedFlags = new Set();
export function claudeArgs({ system, user, schema, model, effort }) {
  const noSchema = schema && droppedFlags.has('--json-schema');
  const sys = noSchema ? `${system}\n\nReply with one JSON object only, no prose and no code fence, matching this JSON schema:\n${JSON.stringify(schema)}` : system;
  const args = ['-p', user, '--system-prompt', sys, '--tools', '', '--setting-sources', '', '--strict-mcp-config', '--output-format', 'json', '--no-session-persistence'];
  if (schema) args.push('--json-schema', JSON.stringify(schema));
  if (model || process.env.MODEL) args.push('--model', model || process.env.MODEL);
  if (effort) args.push('--effort', effort);
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (droppedFlags.has(args[i])) { i += OPTIONAL[args[i]] || 0; continue; }
    out.push(args[i]);
  }
  return out;
}
export const unknownFlag = text => {
  const f = String(text || '').match(/unknown option ['"`]?(--[a-z-]+)/i)?.[1];
  return f && f in OPTIONAL && !droppedFlags.has(f) ? f : null;
};

// MODEL_CONCURRENCY=n caps how many `claude` processes run at once (0 or unset: no cap). The team's first round starts
// six at once (~7-8 s each); a cap of 3 makes that round ~2x longer, so it's a lever for an overloaded laptop, not a
// default. A queued call's wait counts against its own time limit.
const CAP = Number(process.env.MODEL_CONCURRENCY || 0);
let running = 0;
const waiting = [];
async function slot() {
  if (!CAP || running < CAP) { running++; return; }
  await new Promise(r => waiting.push(r));
  running++;
}
function release() { running--; const next = waiting.shift(); if (next) next(); }
async function callClaudeCode(opts) {
  const t0 = Date.now();
  await slot();
  try { return await callClaudeCodeNow({ ...opts, timeoutMs: Math.max(1000, opts.timeoutMs - (Date.now() - t0)) }); }
  finally { release(); }
}
async function callClaudeCodeNow(opts) {
  const t0 = Date.now();
  for (let tries = 0; ; tries++) {
    try { return await callClaudeOnce({ ...opts, timeoutMs: Math.max(1000, opts.timeoutMs - (Date.now() - t0)) }); }
    catch (e) {
      const f = tries < Object.keys(OPTIONAL).length && unknownFlag(e.stderr || e.message);
      if (!f) throw e;
      droppedFlags.add(f);
      console.error(`[model] this Claude Code doesn't know ${f}: calling without it from now on (update Claude Code: npm i -g @anthropic-ai/claude-code)`);
    }
  }
}
function callClaudeOnce({ system, user, schema, model, effort, timeoutMs }) {
  const args = claudeArgs({ system, user, schema, model, effort });
  return new Promise((resolve, reject) => {
    // Run outside the repo so no CLAUDE.md or project files load.
    const p = spawn('claude', args, { cwd: '/tmp', env: { ...process.env, FAL_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    const t0 = Date.now();
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error(`model timeout after ${timeoutMs} ms`)); }, timeoutMs);
    p.on('error', e => { clearTimeout(timer); reject(new Error(`claude could not start: ${e.code || e.message}`)); });
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (err += d));
    p.on('close', code => {
      clearTimeout(timer);
      const firstErr = String(err).split('\n').find(l => l.trim()) || '';
      let d;
      try { d = JSON.parse(out); }
      catch { return reject(Object.assign(new Error(code ? `exit code ${code} after ${Date.now() - t0} ms: ${firstErr.slice(0, 200) || String(out).slice(0, 200)}` : `parse error (not JSON) after ${Date.now() - t0} ms: ${String(out || firstErr).slice(0, 200)}`), { stderr: err })); }
      try {
        if (d.is_error) return reject(new Error('model error: ' + (d.result || d.terminal_reason)));
        if (d.structured_output) return resolve(d.structured_output);
        resolve(parseJsonLoose(d.result));
      } catch (e) { reject(Object.assign(new Error(`parse error in the reply: ${e.message}`.slice(0, 300)), { stderr: err })); }
    });
  });
}

// fal: OpenRouter's chat completions through fal. The short names the code uses map to OpenRouter ids (checked live,
// 14 Nov); FAL_MODEL overrides every call. A full id ("anthropic/...") passes through.
export const FAL_URL = 'https://fal.run/openrouter/router/openai/v1/chat/completions';
export const FAL_MODELS = { sonnet: 'anthropic/claude-sonnet-4.5', haiku: 'anthropic/claude-haiku-4.5', opus: 'anthropic/claude-opus-5.5' };
// The router's newer ids for the two short names answer too, but were slower on the name tag (checked 15 Nov): kept.
export function falModelId(model) {
  if (model && model.includes('/')) return model;
  return process.env.FAL_MODEL || FAL_MODELS[model] || FAL_MODELS.sonnet;
}
// The key: FAL_KEY (or setFalKey) on the demo machine. In a cloud session the network proxy injects the real key,
// so a placeholder is sent; the key itself never exists in this process there.
const falAuth = () => `Key ${falKey || 'placeholder'}`;
export function falBody({ system, user, schema, model }) {
  return {
    model: falModelId(model),
    max_tokens: 8000,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    // Structured output as the schema says; the reply is still validated here (callModel), as on the CLI path.
    ...(schema ? { response_format: { type: 'json_schema', json_schema: { name: 'reply', strict: false, schema } } } : {}),
  };
}
async function callFal({ system, user, schema, model, timeoutMs, fetchImpl = fetch }) {
  let res, text;
  try {
    res = await fetchImpl(FAL_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'Content-Type': 'application/json', Authorization: falAuth() },
      body: JSON.stringify(falBody({ system, user, schema, model })),
    });
    text = await res.text();
  } catch (e) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw new Error('model timeout');
    throw new Error('fal unreachable: ' + scrub(e?.message || e).slice(0, 160));
  }
  if (!res.ok) throw new Error(`fal ${res.status}: ${scrub(text).slice(0, 200)}`);
  let content;
  try { content = JSON.parse(text).choices[0].message.content; } catch { throw new Error('bad fal reply: ' + scrub(text).slice(0, 200)); }
  if (content == null) throw new Error('empty fal reply');
  return schema ? parseJsonLoose(content) : content;
}
export const _callFal = callFal; // tests: a fake fetch

export function parseJsonLoose(s) {
  if (typeof s !== 'string') return s;
  const m = s.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : s);
}

// At server start (claude-code backend): print the CLI's version once, and make one tiny call in the background in the
// tag's own shape (schema, effort, model) so the first live call isn't cold and any unknown flag is found and dropped.
export async function warmUp({ model = 'haiku', effort = 'low' } = {}) {
  if (backend() !== 'claude-code') return null;
  const ver = await new Promise(resolve => {
    let out = '';
    const p = spawn('claude', ['--version'], { cwd: '/tmp', stdio: ['ignore', 'pipe', 'ignore'] });
    const t = setTimeout(() => { p.kill('SIGKILL'); resolve(null); }, 15000);
    p.stdout.on('data', d => (out += d));
    p.on('error', () => { clearTimeout(t); resolve(null); });
    p.on('close', () => { clearTimeout(t); resolve(out.trim().split('\n')[0] || null); });
  });
  console.log(`[model] claude-code backend: ${ver || 'claude not found on PATH'}`);
  if (!ver) return null;
  const t0 = Date.now();
  try {
    await callModel({ system: 'Reply with JSON.', user: 'Say ok.', schema: { type: 'object', properties: { ok: { type: 'string' } }, required: ['ok'] },
      model, effort, timeoutMs: 60000, label: 'warm-up' });
    console.log(`[model] warm: first call answered in ${((Date.now() - t0) / 1000).toFixed(1)} s${droppedFlags.size ? ` (without ${[...droppedFlags].join(', ')})` : ''}`);
  } catch { /* logged by callModel */ }
  return ver;
}
