// The live logo (lib/logo.js): one fal image alongside the fill, never waited for past the fill; saved locally, never a
// fal URL in the page; any failure or timeout keeps the page's usual mark. No network: fetch and paint are stubbed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { paintLogo, withLiveLogo, logoPrompt, LOGO_URL } from '../lib/logo.js';
import { fillPage, loadTemplate } from '../lib/fill.js';

process.env.MODEL_QUIET = '1';
const PNG = Buffer.alloc(600, 7).toString('base64');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-logo-'));

test('paintLogo: one flux/schnell call, the image saved into the page folder', async () => {
  const dir = tmp(); const calls = [];
  const fetchImpl = async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body), auth: opts.headers.Authorization });
    return { ok: true, json: async () => ({ images: [{ url: 'data:image/jpeg;base64,' + PNG }] }) }; };
  const r = await paintLogo({ outDir: dir, idea: 'An ordering website for a small bakery', craft: 'bakery', palette: ['#8B3C14', 'nope'], fetchImpl });
  assert.equal(r.ok, true); assert.equal(r.file, 'logo.jpg');
  assert.ok(fs.statSync(path.join(dir, 'logo.jpg')).size >= 600);
  assert.equal(calls.length, 1); assert.equal(calls[0].url, LOGO_URL);
  assert.equal(calls[0].body.image_size, 'square'); assert.match(calls[0].body.prompt, /bakery/); assert.match(calls[0].body.prompt, /#8B3C14/);
  assert.doesNotMatch(calls[0].body.prompt, /nope/);
});

test('paintLogo: a timeout or a failure is quiet, and saves nothing', async () => {
  const dir = tmp();
  const hang = (url, { signal }) => new Promise((_, no) => signal.addEventListener('abort', () => no(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const t = Date.now(); const r = await paintLogo({ outDir: dir, idea: 'x', timeoutMs: 150, fetchImpl: hang });
  assert.equal(r.ok, false); assert.match(r.why, /timeout after 150 ms/); assert.ok(Date.now() - t < 1500);
  const r2 = await paintLogo({ outDir: dir, idea: 'x', fetchImpl: async () => ({ ok: false, status: 402 }) });
  assert.equal(r2.ok, false); assert.match(r2.why, /fal 402/);
  assert.equal(fs.existsSync(path.join(dir, 'logo.jpg')), false);
});

test('withLiveLogo: the brand mark becomes the local image, the footer credits fal, no fal URL', () => {
  const html = '<a class="nav__logo"><span class="mark" data-mark="dots" aria-hidden="true"></span><span>B</span></a><footer><a class="nav__logo"><span class="mark" data-mark="dots" aria-hidden="true"></span></a></footer>';
  const out = withLiveLogo(html);
  assert.equal((out.match(/src="logo\.jpg"/g) || []).length, 2);
  assert.match(out, /Logo painted live with fal<\/p><\/footer>/);
  assert.doesNotMatch(out, /fal\.(run|media)|https?:/);
  assert.equal(withLiveLogo('<p>no mark</p>'), '<p>no mark</p>');
  assert.match(logoPrompt({ idea: 'yoga', craft: 'yoga' }), /no text/);
});

const tpl = loadTemplate('bakery');
const fakeFill = ms => async () => { await new Promise(r => setTimeout(r, ms)); return { words: tpl.defaults.words, steps: tpl.defaults.steps, switches: tpl.defaults.switches, decidedShown: [] }; };
const args = (dir, extra) => ({ run: 'r-logo', outDir: dir, idea: 'A website for a small bakery.', flow: { nodes: [], edges: [] }, template: 'bakery', ...extra });

test('fillPage: a logo that lands before the fill is on the page; build.done says live', async () => {
  const dir = tmp();
  const paint = async ({ outDir }) => { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'logo.jpg'), Buffer.alloc(600)); return { ok: true, file: 'logo.jpg', ms: 20 }; };
  const r = await fillPage(args(dir, { call: fakeFill(80), paint }));
  assert.equal(r.logo, 'live');
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.match(html, /src="logo\.jpg"/); assert.match(html, /Logo painted live with fal/);
});

test('fillPage: a slow logo never holds the fill; the page keeps its usual mark', async () => {
  const dir = tmp();
  const paint = () => new Promise(r => setTimeout(() => r({ ok: true, file: 'logo.jpg' }), 3000));
  const t = Date.now(); const r = await fillPage(args(dir, { call: fakeFill(50), paint }));
  assert.ok(Date.now() - t < 1500, `the fill is not held (${Date.now() - t} ms)`);
  assert.equal(r.logo, 'usual'); assert.match(r.logoWhy, /still painting/);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /logo\.jpg|painted live/); assert.match(html, /data-mark="dots"/);
  const failed = await fillPage(args(tmp(), { call: fakeFill(30), paint: async () => ({ ok: false, why: 'fal 500' }) }));
  assert.equal(failed.logo, 'usual');
  const off = await fillPage(args(tmp(), { call: fakeFill(10), paint: null }));
  assert.equal(off.logo, 'usual'); assert.equal(off.logoWhy, 'off');
});

test('fillPage: a later version reuses this run\'s logo, no second call', async () => {
  const dir = tmp(); let calls = 0;
  const paint = async ({ outDir }) => { calls++; fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'logo.jpg'), Buffer.alloc(600)); return { ok: true, file: 'logo.jpg' }; };
  assert.equal((await fillPage(args(dir, { call: fakeFill(60), paint }))).logo, 'live');
  const v2 = await fillPage(args(dir, { call: fakeFill(10), paint }));
  assert.equal(v2.logo, 'live'); assert.equal(calls, 1, 'one image per run');
  assert.match(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), /src="logo\.jpg"/);
});
