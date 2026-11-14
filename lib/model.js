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
export async function callModel({ system, user, schema, model, effort, timeoutMs = 90000 }) {
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
    }
  }
  throw lastErr;
}

function callClaudeCode({ system, user, schema, model, effort, timeoutMs }) {
  const args = ['-p', user, '--system-prompt', system, '--tools', '', '--setting-sources', '',
    '--strict-mcp-config', '--output-format', 'json', '--no-session-persistence'];
  if (schema) args.push('--json-schema', JSON.stringify(schema));
  if (model || process.env.MODEL) args.push('--model', model || process.env.MODEL);
  if (effort) args.push('--effort', effort);
  return new Promise((resolve, reject) => {
    // Run outside the repo so no CLAUDE.md or project files load.
    const p = spawn('claude', args, { cwd: '/tmp', env: { ...process.env, FAL_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('model timeout')); }, timeoutMs);
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (err += d));
    p.on('close', () => {
      clearTimeout(timer);
      try {
        const d = JSON.parse(out);
        if (d.is_error) return reject(new Error('model error: ' + (d.result || d.terminal_reason)));
        if (d.structured_output) return resolve(d.structured_output);
        resolve(parseJsonLoose(d.result));
      } catch (e) { reject(new Error('bad model output: ' + (err || out).slice(0, 300))); }
    });
  });
}

// fal: OpenRouter's chat completions through fal. The short names the code uses map to OpenRouter ids (checked live,
// 14 Nov); FAL_MODEL overrides every call. A full id ("anthropic/...") passes through.
export const FAL_URL = 'https://fal.run/openrouter/router/openai/v1/chat/completions';
export const FAL_MODELS = { sonnet: 'anthropic/claude-sonnet-4.5', haiku: 'anthropic/claude-haiku-4.5' };
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
