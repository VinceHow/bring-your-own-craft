// Voice in a real browser. Chromium's fake mic plays a generated WAV; the voice API is stubbed in the browser
// (page.route), so this runs without an ElevenLabs key. Checks: with no key the mic hides and "typed" shows and
// typing still works; with voice up, holding ` records, the words land in her card's "I love…" field and stay
// editable, and her sheet's first line (the idea) takes speech the same way. Run: node --test e2e/voice.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3700 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-voice-e2e-');
const WAV = path.join(RUNS, 'fake-mic.wav');
let srv, logs = '', browser, ctx, errors = [];

// 3 s of a 440 Hz tone, 16-bit mono 16 kHz: something for the fake mic to capture.
function writeWav(file, secs = 3, rate = 16000) {
  const n = secs * rate, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(8000 * Math.sin(2 * Math.PI * 440 * i / rate)), 44 + i * 2);
  fs.writeFileSync(file, b);
}

before(async () => {
  writeWav(WAV);
  // This server has no route to ElevenLabs (proxy variables dropped), so it stands for "no key" whatever this
  // environment has; the voice tests below stub the browser's calls. On fal the model calls (the tidy) need the
  // proxy (it injects the fal key), so there the proxy stays and only ElevenLabs bypasses it (NO_PROXY): still no route.
  const env = { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS };
  if (env.MODEL_BACKEND === 'fal') { const np = [env.NO_PROXY || env.no_proxy, 'api.elevenlabs.io'].filter(Boolean).join(','); env.NO_PROXY = env.no_proxy = np; }
  else for (const k of ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'NODE_USE_ENV_PROXY']) delete env[k];
  srv = spawn('node', ['server.js'], { cwd: ROOT, env });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 50 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`] });
  ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, permissions: ['microphone'] });
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

async function openPage({ voice, query = '' }) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  const sent = [];
  if (voice) {
    await page.route('**/api/voice/status', r => r.fulfill({ json: { available: true } }));
    await page.route('**/api/voice/stt', async r => {
      const body = r.request().postDataJSON();
      sent.push(body);
      const text = body.field === 'intro' ? 'I love getting the journey right before anyone draws a screen.' : 'A booking page for a small yoga studio.';
      await r.fulfill({ json: { text, ms: 420 } });
    });
  } else {
    await page.route('**/api/voice/status', r => r.fulfill({ json: { available: false } }));
  }
  await page.goto(BASE + '/?hold=50&setup=classic' + query);
  return { page, sent };
}
const waitFor = (page, fn, ms, what) => page.waitForFunction(fn, null, { timeout: ms }).catch(() => { throw new Error('timed out: ' + what); });
async function toHerCard(page) {
  await page.evaluate(() => document.getElementById('intro-input').focus()); // her paper name tag, before the room
  await waitFor(page, () => document.activeElement?.id === 'intro-input', 20000, 'her card open');
}

test('no key: the mic hides, "typed" shows quietly, and typing still works', async () => {
  const { page } = await openPage({ voice: false });
  await toHerCard(page);
  const m = page.locator('.big-card .voice-mic');
  await waitFor(page, () => document.body.classList.contains('voice-typed'), 3000, 'typed mode');
  assert.strictEqual(await m.getAttribute('data-state'), 'typed');
  assert.strictEqual((await m.textContent()).trim(), 'typed');
  assert.strictEqual(await page.locator('.big-card .voice-mic svg').isVisible(), false, 'no mic glyph');
  await page.keyboard.type('getting the journey right');
  assert.strictEqual(await page.inputValue('#intro-input'), 'getting the journey right');
  // ` with no voice does nothing special: it is just a key
  await page.close();
});

test('a server with no key (no route to ElevenLabs) says voice is unavailable', async () => {
  const r = await fetch(BASE + '/api/voice/status');
  assert.strictEqual((await r.json()).available, false);
});

test('hold ` on her card: listening, then the words land in "I love…" as editable text', async () => {
  const { page, sent } = await openPage({ voice: true });
  await toHerCard(page);
  await waitFor(page, () => document.body.classList.contains('voice-on'), 3000, 'voice on');
  const m = page.locator('.big-card .voice-mic');
  assert.strictEqual(await m.getAttribute('data-state'), 'idle');
  await page.keyboard.down('Backquote');
  await waitFor(page, () => document.querySelector('.big-card .voice-mic')?.dataset.state === 'listening', 3000, 'listening');
  assert.strictEqual((await m.textContent()).trim(), 'listening');
  await page.waitForTimeout(1500);
  await page.keyboard.up('Backquote');
  await waitFor(page, () => document.getElementById('intro-input')?.value.length > 0, 8000, 'transcript in her field');
  assert.strictEqual(await page.inputValue('#intro-input'), 'getting the journey right before anyone draws a screen');
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].field, 'intro');
  assert.ok(sent[0].audio.length > 1000, `the fake mic was recorded (${sent[0].audio.length} b64 chars)`);
  assert.match(sent[0].mime, /^audio\//);
  // Editable: she fixes the line by typing, and no backquote leaked into it.
  await page.keyboard.type(', always');
  assert.strictEqual(await page.inputValue('#intro-input'), 'getting the journey right before anyone draws a screen, always');
  assert.strictEqual(await m.getAttribute('data-state'), 'idle');
  // Enter keeps it: it becomes her intro, the team writes her character card, and Enter again takes the seat.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.big-card[data-seat="product"]')?.dataset.state === 'shown', null, { timeout: 30000 }); await page.keyboard.press('Enter'); // her character card, then she takes the seat
  await waitFor(page, () => BYOC.beat === 3 && document.activeElement?.id === 'her-input', 8000, 'her sheet open');
  assert.strictEqual(await page.evaluate(() => BYOC.intro), 'I love getting the journey right before anyone draws a screen, always');

  // Her sheet's first line (the agenda answer): hold the mic mark itself.
  const im = page.locator('#her-form .voice-mic');
  assert.ok(await im.isVisible(), 'the mic is on her sheet while the idea is open');
  await page.waitForTimeout(800); // her sheet slides in; aim once it has settled
  const box = await im.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await waitFor(page, () => BYOC.voice.state === 'listening', 3000, 'listening on her sheet');
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await waitFor(page, () => document.getElementById('her-input').value.length > 0, 8000, 'transcript in her sheet');
  assert.strictEqual(await page.inputValue('#her-input'), 'A booking page for a small yoga studio');
  assert.strictEqual(sent.at(-1).field, 'idea');
  // A journey line is typed: once the idea is down the mic leaves her sheet.
  await page.keyboard.press('Enter');
  await waitFor(page, () => document.getElementById('her-idea').textContent.trim().length > 0, 8000, 'the idea written down');
  await waitFor(page, () => !document.querySelector('#her-form .voice-mic')?.offsetParent, 3000, 'mic gone from journey lines');
  assert.deepStrictEqual(errors, []);
  await page.close();
});

test('a failed transcription goes quiet: "typed", and the field keeps what she had', async () => {
  const { page } = await openPage({ voice: true });
  await page.unroute('**/api/voice/stt');
  await page.route('**/api/voice/stt', r => r.fulfill({ status: 503, json: { error: 'voice unavailable' } }));
  await toHerCard(page);
  await waitFor(page, () => document.body.classList.contains('voice-on'), 3000, 'voice on');
  await page.keyboard.type('maps');
  await page.keyboard.down('Backquote'); await page.waitForTimeout(800); await page.keyboard.up('Backquote');
  await waitFor(page, () => document.body.classList.contains('voice-typed'), 8000, 'typed after failure');
  assert.strictEqual(await page.inputValue('#intro-input'), 'maps');
  await page.close();
});

test('any field with data-voice gets the mic: her reaction lands there, and nowhere else', async () => {
  const { page, sent } = await openPage({ voice: true });
  await page.evaluate(() => BYOC.stage(3, { instant: true }));
  await waitFor(page, () => document.body.classList.contains('voice-on'), 3000, 'voice on');
  // A stand-in for the reaction field another piece adds; it only opts in with data-voice.
  await page.evaluate(() => {
    const t = document.createElement('textarea'); t.id = 'test-reaction'; t.dataset.voice = 'reaction';
    t.style.cssText = 'position:absolute;left:40px;top:40px;width:400px;height:60px;z-index:50';
    document.getElementById('room').appendChild(t);
  });
  await waitFor(page, () => document.getElementById('test-reaction').nextElementSibling?.classList.contains('voice-mic'), 3000, 'a mic beside it');
  await page.focus('#test-reaction');
  await page.keyboard.down('Backquote'); await page.waitForTimeout(1000); await page.keyboard.up('Backquote');
  await waitFor(page, () => document.getElementById('test-reaction').value.length > 0, 8000, 'words in the reaction field');
  assert.strictEqual(sent.at(-1).field, 'reaction');
  assert.strictEqual(await page.inputValue('#her-input'), '', 'her sheet untouched');
  await page.keyboard.type(' yes');
  assert.match(await page.inputValue('#test-reaction'), / yes$/);
  assert.deepStrictEqual(errors, []);
  await page.close();
});

test('tap ` to start, tap again to stop: it keeps listening between taps, and the words land', async () => {
  const { page, sent } = await openPage({ voice: true });
  await toHerCard(page);
  await waitFor(page, () => document.body.classList.contains('voice-on'), 3000, 'voice on');
  await page.keyboard.press('Backquote'); // a tap: well under 300 ms
  await waitFor(page, () => BYOC.voice.state === 'listening' && BYOC.voice.toggled, 3000, 'toggled on');
  const m = page.locator('.big-card .voice-mic');
  assert.strictEqual(await m.getAttribute('data-mode'), 'toggle');
  assert.strictEqual((await m.textContent()).trim(), 'listening · tap to stop');
  await page.waitForTimeout(1500);
  assert.strictEqual(await page.evaluate(() => BYOC.voice.state), 'listening', 'still listening after release');
  assert.strictEqual(sent.length, 0, 'nothing sent before the second tap');
  await page.keyboard.press('Backquote'); // the second tap stops it
  await waitFor(page, () => document.getElementById('intro-input')?.value.length > 0, 8000, 'transcript in her field');
  assert.strictEqual(sent.length, 1);
  assert.ok(sent[0].audio.length > 1000, 'the 1.5 s between taps was recorded');
  assert.strictEqual(await m.getAttribute('data-state'), 'idle');
  assert.strictEqual(await m.getAttribute('data-mode'), null);
  assert.deepStrictEqual(errors, []);
  await page.close();
});

test('click the mic to start, click again to stop', async () => {
  const { page, sent } = await openPage({ voice: true });
  await toHerCard(page);
  await waitFor(page, () => document.body.classList.contains('voice-on'), 3000, 'voice on');
  const m = page.locator('.big-card .voice-mic');
  await m.click();
  await waitFor(page, () => BYOC.voice.state === 'listening' && BYOC.voice.toggled, 3000, 'toggled on by a click');
  await page.waitForTimeout(1200);
  await m.click();
  await waitFor(page, () => document.getElementById('intro-input')?.value.length > 0, 8000, 'transcript in her field');
  assert.strictEqual(sent.length, 1);
  await page.close();
});

test('Esc cancels a tapped recording: nothing is sent, the field keeps what she had', async () => {
  const { page, sent } = await openPage({ voice: true });
  await toHerCard(page);
  await waitFor(page, () => document.body.classList.contains('voice-on'), 3000, 'voice on');
  await page.keyboard.type('maps');
  await page.keyboard.press('Backquote');
  await waitFor(page, () => BYOC.voice.toggled, 3000, 'toggled on');
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  await waitFor(page, () => BYOC.voice.state === 'idle', 3000, 'cancelled');
  await page.waitForTimeout(500);
  assert.strictEqual(sent.length, 0);
  assert.strictEqual(await page.inputValue('#intro-input'), 'maps');
  await page.close();
});

test('the recording limit never stops silently: it sends what she said and the mic says so', async () => {
  const { page, sent } = await openPage({ voice: true, query: '&voicemax=1500' });
  await page.unroute('**/api/voice/stt');
  let release; const held = new Promise(r => (release = r));
  await page.route('**/api/voice/stt', async r => { sent.push(r.request().postDataJSON()); await held; await r.fulfill({ json: { text: 'Fast.', ms: 300 } }); });
  await toHerCard(page);
  await waitFor(page, () => document.body.classList.contains('voice-on'), 3000, 'voice on');
  await page.keyboard.press('Backquote');
  await waitFor(page, () => BYOC.voice.state === 'writing', 4000, 'stopped at the limit');
  assert.match((await page.locator('.big-card .voice-mic').textContent()).trim(), /2 minutes/);
  release();
  await waitFor(page, () => document.getElementById('intro-input')?.value === 'Fast', 8000, 'what she said lands');
  assert.strictEqual(sent.length, 1);
  await page.close();
});
