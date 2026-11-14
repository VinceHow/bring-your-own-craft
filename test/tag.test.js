// Her name tag (her intro, or the "Your own craft" seat) and the DIY run: her seat, her tag, and no wrong page for
// an idea no template fits. Offline: a fake model. A baker and a tattoo artist (a craft we've never listed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-craft-'));
const { nameTag, cleanTag, tagText, roughTag, templateFor } = await import('../lib/tag.js');
const { readEvents, newRunId } = await import('../lib/events.js');
const { initTaste, readTaste } = await import('../lib/taste.js');
const runRoutes = (await import('../routes/run.js')).default;
const buildRoutes = (await import('../routes/build.js')).default;

const BAKER = { craft: 'Baker', goodAt: 'mixing dough', loves: 'the first batch out at 6am' };
const TATTOO = { craft: 'Tattoo artist', goodAt: 'fine-line flowers', loves: 'the moment the stencil comes off' };
const flow = { nodes: [{ id: 'n1', label: 'Pick a pastry' }, { id: 'n2', label: 'Pick a time' }, { id: 'n3', label: 'Collect' }], edges: [] };
// Distinct wording per decision (the selector merges two that share words).
const WORDS = ['oven', 'flour', 'queue', 'ticket', 'stencil', 'needle', 'deposit', 'refund', 'menu', 'pickup', 'apron', 'crust',
  'glaze', 'basket', 'locker', 'parking', 'invoice', 'voucher', 'sticker', 'ribbon', 'candle', 'mirror', 'bucket', 'ladder',
  'lantern', 'marble', 'pebble', 'saddle', 'thimble', 'velvet', 'walnut'];
const cand = (i, extra = {}) => ({ id: `c${i}`, seat: ['design', 'data', 'strategy', 'engineering', 'research', 'product'][i % 6],
  decision: `${WORDS[i]} ${WORDS[(i + 13) % WORDS.length]}`, options: ['A', 'B'], recommendation: 'A', reason: 'r', cost: 'low', undoable: true, attachTo: null, ...extra });
const task = system => (system.match(/^# Task: ([\w-]+)/m) || [])[1];

test('her name tag: one call, her words; a failed call keeps her words, split roughly, craft left for her', async () => {
  let seen;
  const r = await nameTag("I'm good at mixing dough, and I love the first batch out at 6am", { callModel: async a => { seen = a; return { craft: 'baker', goodAt: "I'm good at mixing dough", loves: 'I love the first batch out at 6am.' }; } });
  assert.equal(r.code, 200);
  assert.deepEqual({ craft: r.body.craft, goodAt: r.body.goodAt, loves: r.body.loves }, BAKER);
  assert.match(seen.user, /mixing dough/);
  assert.match(seen.system, /in her own way/);
  const rough = await nameTag("I'm good at mixing dough, and I love the first batch out at 6am", { callModel: async () => { throw new Error('down'); } });
  assert.equal(rough.body.rough, true);
  assert.equal(rough.body.goodAt, 'mixing dough');
  assert.equal(rough.body.loves, 'the first batch out at 6am');
  assert.deepEqual(roughTag("I'm a tattoo artist and I love clean lines").craft, 'tattoo artist');
  assert.equal((await nameTag('')).code, 400);
  assert.equal(cleanTag({ craft: '', goodAt: 'x', loves: 'y' }), null);
  assert.equal(tagText(BAKER), 'Baker (good at mixing dough; loves the first batch out at 6am)');
});

// ---- the routes: her seat and tag on the run; no wrong page for an idea no template fits ----
function call(routes, method, pathname, body) {
  const url = new URL('http://x' + pathname);
  const r = routes.find(r => r.method === method && (r.match ? r.match(url) : r.path === url.pathname));
  return new Promise(resolve => {
    const res = { writeHead(code) { this.code = code; }, setHeader() {}, end(s) { resolve({ code: this.code, body: s ? JSON.parse(s) : null }); } };
    r.handler({ method }, res, { body, url });
  });
}

test('a DIY run logs her seat, her tag and the template her idea fits (none for a tattoo studio)', async () => {
  const baker = await call(runRoutes, 'POST', '/api/run', { idea: 'A pre-order page for my bakery', seat: 'diy', tag: BAKER });
  const s1 = readEvents(baker.body.run).find(e => e.type === 'run.start');
  assert.deepEqual([s1.seat, s1.tag, s1.template], ['diy', BAKER, 'cafe']);
  const ink = await call(runRoutes, 'POST', '/api/run', { idea: 'Flash day sign-ups for my tattoo shop', seat: 'diy', tag: TATTOO });
  const s2 = readEvents(ink.body.run).find(e => e.type === 'run.start');
  assert.equal(s2.template, null);
  const built = await call(buildRoutes, 'POST', `/api/run/${ink.body.run}/build`);
  assert.equal(built.code, 409);
  assert.equal(built.body.noTemplate, true);
  assert.ok(!readEvents(ink.body.run).some(e => e.type === 'build.step'), 'no build started, no wrong page');
  const priya = await call(runRoutes, 'POST', '/api/run', { idea: 'A booking page for a small yoga studio.', seat: 'product', tag: BAKER });
  const s3 = readEvents(priya.body.run).find(e => e.type === 'run.start');
  assert.deepEqual([s3.seat, s3.tag, s3.template], ['product', undefined, undefined], 'Product: no tag, no template gate');
  const odd = await call(runRoutes, 'POST', '/api/run', { idea: 'x', seat: 'nonsense' });
  assert.equal(readEvents(odd.body.run).find(e => e.type === 'run.start').seat, 'product');
  assert.equal(templateFor('Tattoo appointments at my studio'), 'yoga', 'bookable sessions fit the booking template');
});
