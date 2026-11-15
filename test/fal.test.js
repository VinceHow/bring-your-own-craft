// The fal backend (MODEL_BACKEND=fal), with a fake fetch: ids, structured output, the key, timeouts, scrubbing.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../lib/model.js');
const SCHEMA = { type: 'object', properties: { fruit: { type: 'string' } }, required: ['fruit'] };
const SECRET = 'fal-test-secret-' + Math.random().toString(36).slice(2) + ':abcdef123456';
let realFetch, calls;
const reply = (content, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify({ choices: [{ message: { content } }] }) });
beforeEach(() => { realFetch = globalThis.fetch; calls = []; process.env.MODEL_BACKEND = 'fal'; delete process.env.FAL_MODEL; M.setFalKey(null); });
afterEach(() => { globalThis.fetch = realFetch; delete process.env.MODEL_BACKEND; M.setFalKey(null); });

test('short names map to OpenRouter ids; FAL_MODEL overrides; full ids pass through', () => {
  assert.equal(M.falModelId('sonnet'), 'anthropic/claude-sonnet-4.5');
  assert.equal(M.falModelId('haiku'), 'anthropic/claude-haiku-4.5');
  assert.equal(M.falModelId(undefined), 'anthropic/claude-sonnet-4.5');
  assert.equal(M.falModelId('anthropic/claude-opus-4.1'), 'anthropic/claude-opus-4.1');
  process.env.FAL_MODEL = 'anthropic/claude-haiku-4.5';
  assert.equal(M.falModelId('sonnet'), 'anthropic/claude-haiku-4.5');
});

test('a call: json_schema structured output, validated here; the key in the header, never in the body', async () => {
  M.setFalKey(SECRET);
  globalThis.fetch = async (url, opts) => { calls.push({ url, opts }); return reply('{"fruit":"apple"}'); };
  const out = await M.callModel({ system: 's', user: 'u', schema: SCHEMA, model: 'haiku', timeoutMs: 5000 });
  assert.deepEqual({ ...out }, { fruit: 'apple' });
  const body = JSON.parse(calls[0].opts.body);
  assert.equal(calls[0].url, M.FAL_URL);
  assert.equal(body.model, 'anthropic/claude-haiku-4.5');
  assert.deepEqual(body.response_format, { type: 'json_schema', json_schema: { name: 'reply', strict: false, schema: SCHEMA } });
  assert.equal(calls[0].opts.headers.Authorization, `Key ${SECRET}`);
  assert.ok(!calls[0].opts.body.includes(SECRET));
});

test('no key in this process (a cloud session): a placeholder, which the proxy replaces', async () => {
  globalThis.fetch = async (url, opts) => { calls.push(opts); return reply('{"fruit":"pear"}'); };
  await M.callModel({ system: 's', user: 'u', schema: SCHEMA, timeoutMs: 5000 });
  assert.equal(calls[0].headers.Authorization, 'Key placeholder');
});

test('a reply that misses the schema is retried once, then fails; a JSON reply wrapped in prose still parses', async () => {
  let n = 0;
  globalThis.fetch = async () => reply(n++ === 0 ? '{"veg":"leek"}' : 'Here you go: {"fruit":"fig"}');
  assert.deepEqual({ ...(await M.callModel({ system: 's', user: 'u', schema: SCHEMA, timeoutMs: 5000 })) }, { fruit: 'fig' });
  globalThis.fetch = async () => reply('{"veg":"leek"}');
  await assert.rejects(M.callModel({ system: 's', user: 'u', schema: SCHEMA, timeoutMs: 5000 }), /schema/);
});

test('timeoutMs is honoured', async () => {
  globalThis.fetch = (url, opts) => new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej(opts.signal.reason)));
  const t0 = Date.now();
  const keep = setInterval(() => {}, 1000); // AbortSignal.timeout doesn't hold the event loop open; a real request would
  try { await assert.rejects(M.callModel({ system: 's', user: 'u', schema: SCHEMA, timeoutMs: 80 }), /model timeout/); } finally { clearInterval(keep); }
  assert.ok(Date.now() - t0 < 2000, 'two tries at 80 ms, not the default');
});

test('every error is scrubbed: a key echoed back by the service never leaves', async () => {
  M.setFalKey(SECRET);
  globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => `{"detail":"bad key Key ${SECRET}"}` });
  await assert.rejects(M.callModel({ system: 's', user: 'u', schema: SCHEMA, timeoutMs: 5000 }), e => !e.message.includes(SECRET) && /fal 401/.test(e.message));
  globalThis.fetch = async () => { throw new Error(`connect failed for ${SECRET}`); };
  await assert.rejects(M.callModel({ system: 's', user: 'u', schema: SCHEMA, timeoutMs: 5000 }), e => !e.message.includes(SECRET));
});

test('opus maps to the newest Opus the router offers; an unknown name still falls back to sonnet', () => {
  assert.equal(M.falModelId('opus'), 'anthropic/claude-opus-5.5');
  assert.equal(M.falModelId('nope'), M.FAL_MODELS.sonnet);
});
