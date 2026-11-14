// Voice: push-to-talk speech-to-text for her "I love…" line and her agenda answer (ElevenLabs Scribe).
// POST /api/voice/stt { audio: base64, mime?, field?, run? } -> { text, ms } | 503 { error: 'voice unavailable' }
// GET  /api/voice/status -> { available } (a cheap probe, cached), so the room can hide the mic before she tries.
// The key: in cloud sessions the network proxy injects `xi-api-key` for api.elevenlabs.io, so we send a placeholder;
// on the demo machine ELEVENLABS_API_KEY is read from the environment. It is never logged, echoed or stored, and
// nothing from the upstream response but the transcript text ever reaches the client or the log. No audio is stored.
import { sendJson } from '../lib/http.js';
import { logEvent } from '../lib/events.js';

const API = 'https://api.elevenlabs.io/v1';
const MODEL = () => process.env.ELEVENLABS_STT_MODEL || 'scribe_v2';
const key = () => process.env.ELEVENLABS_API_KEY || 'placeholder-injected-by-proxy';
const MAX_AUDIO = 4 * 1024 * 1024; // ~20 s of opus is well under 1 MB
const FIELD = /^[a-z]{1,20}$/; // intro, idea, reaction, or another data-voice field's name

// Availability cache: re-probe soon after a miss (so a key added mid-session is picked up), rarely after a hit.
let cache = { available: null, at: 0 };
const TTL_OK = 10 * 60e3, TTL_MISS = 60e3;
export function _resetVoiceCache() { cache = { available: null, at: 0 }; }

async function probe() {
  const now = Date.now();
  if (cache.available !== null && now - cache.at < (cache.available ? TTL_OK : TTL_MISS)) return cache.available;
  let ok = false;
  try {
    const r = await fetch(`${API}/models`, { headers: { 'xi-api-key': key() }, signal: AbortSignal.timeout(5000) });
    ok = r.ok;
    // A key scoped to speech-to-text only answers 401 "missing_permissions" here: the key itself works, so voice does.
    if (!ok && r.status === 401) { const t = await r.text().catch(() => ''); ok = /missing_permissions/.test(t); }
    else await r.body?.cancel?.();
  } catch { ok = false; } // proxy refusal (host not allowed yet), DNS, timeout: all mean "typed"
  cache = { available: ok, at: now };
  return ok;
}

async function transcribe(buf, mime, model) {
  const fd = new FormData();
  fd.append('model_id', model);
  fd.append('tag_audio_events', 'false');
  fd.append('file', new Blob([buf], { type: mime }), 'speech.' + (mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : 'webm'));
  return fetch(`${API}/speech-to-text`, { method: 'POST', headers: { 'xi-api-key': key() }, body: fd,
    signal: AbortSignal.timeout(20000) });
}

const safeRun = r => typeof r === 'string' && /^[A-Za-z0-9][\w.-]{0,120}$/.test(r) && !r.startsWith('local-') ? r : 'voice';

async function stt(req, res, { body }) {
  const t0 = Date.now();
  const field = typeof body?.field === 'string' && FIELD.test(body.field) ? body.field : 'intro';
  const run = safeRun(body?.run);
  const audio = typeof body?.audio === 'string' ? body.audio : '';
  if (!audio) return sendJson(res, 400, { error: 'no audio' });
  const buf = Buffer.from(audio, 'base64');
  if (!buf.length || buf.length > MAX_AUDIO) return sendJson(res, 400, { error: 'audio size' });
  const mime = typeof body.mime === 'string' && /^audio\/[\w.+-]+(;[\w=. -]+)?$/.test(body.mime) ? body.mime.split(';')[0] : 'audio/webm';

  let r, status = 0;
  try {
    r = await transcribe(buf, mime, MODEL());
    // An unknown model id comes back 400/422: fall back to the first Scribe once, rather than going quiet.
    if ((r.status === 400 || r.status === 422) && MODEL() !== 'scribe_v1') { await r.body?.cancel?.(); r = await transcribe(buf, mime, 'scribe_v1'); }
    status = r.status;
  } catch { status = 0; }
  const ms = Date.now() - t0;

  if (!r || !r.ok) {
    await r?.body?.cancel?.().catch(() => {});
    // 401/403 (no key yet), proxy refusal or network: voice is unavailable, she types. Upstream text is never echoed.
    if (status === 0 || status === 401 || status === 403) cache = { available: false, at: Date.now() };
    logEvent(run, 'voice', { field, ok: false, status, ms });
    return sendJson(res, 503, { error: 'voice unavailable' });
  }
  let text = '';
  try { const j = await r.json(); text = typeof j.text === 'string' ? j.text : ''; } catch {}
  text = text.replace(/\s+/g, ' ').trim().slice(0, 400);
  cache = { available: true, at: Date.now() };
  logEvent(run, 'voice', { field, ok: true, ms, chars: text.length, bytes: buf.length });
  return sendJson(res, 200, { text, ms });
}

export default [
  { method: 'POST', match: url => url.pathname === '/api/voice/stt', handler: stt },
  { method: 'GET', match: url => url.pathname === '/api/voice/status', handler: async (req, res) => sendJson(res, 200, { available: await probe() }) },
];
