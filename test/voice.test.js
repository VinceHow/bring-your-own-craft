// Voice route: ElevenLabs speech-to-text behind POST /api/voice/stt, with fetch stubbed for api.elevenlabs.io.
// Covers: no key (401/403/proxy refusal) -> 'voice unavailable'; the happy path -> { text, ms } and a `voice` event
// with no audio; the key never leaves the request header. Offline.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SENTINEL = 'xi-SENTINEL-5d1e9a7c3b';
process.env.ELEVENLABS_API_KEY = SENTINEL;
process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-voice-'));
delete process.env.ELEVENLABS_STT_MODEL;

let upstream; // (url, init) -> Response
const seen = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  if (!String(url).startsWith('https://api.elevenlabs.io/')) return realFetch(url, init);
  seen.push({ url: String(url), init });
  return upstream(String(url), init);
};

const { default: server } = await import('../server.js');
const { _resetVoiceCache } = await import('../routes/voice.js');
let base;
before(async () => { await new Promise(r => server.listen(0, r)); base = `http://localhost:${server.address().port}`; });
after(() => { server.close(); globalThis.fetch = realFetch; fs.rmSync(process.env.RUNS_DIR, { recursive: true, force: true }); });
beforeEach(() => { seen.length = 0; _resetVoiceCache(); });

const AUDIO = Buffer.from('RIFF....WAVEfmt fake audio bytes').toString('base64');
const post = body => realFetch(base + '/api/voice/stt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const events = run => {
  const f = path.join(process.env.RUNS_DIR, run, 'events.jsonl');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
};
const everything = () => {
  let all = '';
  for (const d of fs.readdirSync(process.env.RUNS_DIR)) for (const f of fs.readdirSync(path.join(process.env.RUNS_DIR, d)))
    all += fs.readFileSync(path.join(process.env.RUNS_DIR, d, f), 'utf8');
  return all;
};

test('no key: ElevenLabs 401 -> 503 voice unavailable, status says so, the key is not echoed', async () => {
  upstream = (url, init) => new Response(JSON.stringify({ detail: `invalid api key ${init.headers['xi-api-key']}` }), { status: 401 });
  const r = await post({ audio: AUDIO, mime: 'audio/webm', field: 'intro' });
  assert.equal(r.status, 503);
  const text = await r.text();
  assert.deepEqual(JSON.parse(text), { error: 'voice unavailable' });
  assert.ok(!text.includes(SENTINEL));
  const s = await (await realFetch(base + '/api/voice/status')).json();
  assert.equal(s.available, false);
  const ev = events('voice').at(-1);
  assert.equal(ev.type, 'voice'); assert.equal(ev.ok, false); assert.equal(ev.status, 401); assert.equal(ev.field, 'intro');
  assert.ok(!everything().includes(SENTINEL));
});

test('403 and a proxy refusal (fetch throws) are unavailable too', async () => {
  upstream = () => new Response('forbidden', { status: 403 });
  assert.equal((await post({ audio: AUDIO })).status, 503);
  upstream = () => { throw new TypeError('fetch failed'); };
  const r = await post({ audio: AUDIO });
  assert.equal(r.status, 503);
  assert.deepEqual(await r.json(), { error: 'voice unavailable' });
  _resetVoiceCache();
  assert.equal((await (await realFetch(base + '/api/voice/status')).json()).available, false);
});

test('happy path: multipart to speech-to-text with scribe_v2, returns { text, ms }, logs voice with no audio', async () => {
  let form;
  upstream = async (url, init) => {
    if (url.endsWith('/models')) return new Response('[]', { status: 200 });
    form = init.body;
    return new Response(JSON.stringify({ language_code: 'en', text: ' getting the journey right before anyone draws a screen. ', words: [] }), { status: 200 });
  };
  const r = await post({ audio: AUDIO, mime: 'audio/webm;codecs=opus', field: 'idea', run: 'run-test-1' });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.text, 'getting the journey right before anyone draws a screen.');
  assert.equal(typeof j.ms, 'number');
  const call = seen.find(s => s.url.endsWith('/speech-to-text'));
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.headers['xi-api-key'], SENTINEL); // only ever in the outbound header
  assert.ok(form instanceof FormData);
  assert.equal(form.get('model_id'), 'scribe_v2');
  const file = form.get('file');
  assert.equal(file.type, 'audio/webm');
  assert.equal(Buffer.from(await file.arrayBuffer()).toString('base64'), AUDIO);
  const ev = events('run-test-1').at(-1);
  assert.equal(ev.type, 'voice'); assert.equal(ev.ok, true); assert.equal(ev.field, 'idea');
  assert.equal(ev.chars, j.text.length);
  assert.ok(!('audio' in ev) && !JSON.stringify(ev).includes(AUDIO.slice(0, 16)));
  assert.equal((await (await realFetch(base + '/api/voice/status')).json()).available, true);
  assert.ok(!everything().includes(SENTINEL));
});

test('422 on scribe_v2 retries with scribe_v1', async () => {
  const models = [];
  upstream = (url, init) => {
    models.push(init.body.get('model_id'));
    return models.length === 1 ? new Response('{"detail":"bad model"}', { status: 422 }) : new Response('{"text":"hello"}', { status: 200 });
  };
  const r = await post({ audio: AUDIO });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).text, 'hello');
  assert.deepEqual(models, ['scribe_v2', 'scribe_v1']);
});

test('bad input: no audio is a 400 and never calls ElevenLabs; a local run id logs under voice', async () => {
  upstream = () => { throw new Error('should not be called'); };
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ audio: '' })).status, 400);
  assert.equal(seen.length, 0);
  upstream = () => new Response('{"text":"x"}', { status: 200 });
  await post({ audio: AUDIO, run: 'local-123', field: 'not a field!' });
  const ev = events('voice').at(-1);
  assert.equal(ev.ok, true); assert.equal(ev.field, 'intro');
  const n = events('voice').length;
  await post({ audio: AUDIO, run: '../etc' }); // not a run id: logs under voice, never outside runs/
  assert.equal(events('voice').length, n + 1);
  assert.ok(!fs.existsSync(path.join(process.env.RUNS_DIR, '..', 'etc')));
});
