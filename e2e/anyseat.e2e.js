// End-to-end, any seat is hers (lib/cast.js, design/studio/SEATS.md).
// 1. The guard: when she picks Product, the roster, the prompts and the event log are byte-for-byte what they are on
//    origin/main. A fake-model run on both trees (every prompt the team and the selector see, every event, minus
//    ids and timings), and the room's cards on both servers, are diffed.
// 2. A real run in the Design seat: Mika walks in wearing Product, her seat's engine speaks Design, the cap holds.
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = new URL('..', import.meta.url).pathname;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-anyseat-'));
const MAIN = path.join(TMP, 'main');
let hasMain = false;
const servers = [];
let browser;

function serve(root, port) {
  const runs = fs.mkdtempSync(path.join(TMP, 'runs-'));
  const p = spawn('node', ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port), RUNS_DIR: runs } });
  let logs = ''; p.stdout.on('data', d => (logs += d)); p.stderr.on('data', d => (logs += d));
  servers.push(p);
  return { base: `http://localhost:${port}`, runs, ready: async () => { for (let i = 0; i < 60 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100)); } };
}

before(async () => {
  try {
    execFileSync('git', ['worktree', 'add', '--detach', MAIN, 'origin/main'], { cwd: ROOT, stdio: 'ignore' });
    hasMain = true;
  } catch { hasMain = false; }
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  for (const s of servers) s.kill();
  if (hasMain) try { execFileSync('git', ['worktree', 'remove', '--force', MAIN], { cwd: ROOT, stdio: 'ignore' }); } catch {}
});

// A fake-model Product-path run in one tree: every system prompt the team, the selector and the decider see (hashed),
// and every logged event (minus run ids and timings: t, ms, *Ms), in order.
const PROBE = `
import crypto from 'node:crypto'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const root = process.argv[2];
process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-'));
const { proposeAndSelect } = await import(path.join(root, 'lib/select.js'));
const { logEvent, readEvents } = await import(path.join(root, 'lib/events.js'));
const { initTaste, readTaste } = await import(path.join(root, 'lib/taste.js'));
await new Promise(r => setTimeout(r, 100));
const run = 'probe-run';
initTaste(run, { intro: 'I love the customer journey.' });
logEvent(run, 'run.start', { pane: 'sheet', mode: 'craft', idea: 'A website for a small bakery, so customers can order bread ahead.', seat: 'product', intro: 'I love the customer journey.' });
const prompts = [];
const callModel = async a => {
  prompts.push(crypto.createHash('sha256').update(a.system + '\\n--\\n' + a.user).digest('hex').slice(0, 16));
  if (a.schema?.required?.includes('candidates')) {
    const seat = (a.system.match(/You are the (\\w+) teammate/) || [])[1] || 'x';
    return { note: seat + ' note', candidates: [{ decision: seat + ' decision about the order page', options: ['A', 'B'], recommendation: 'A', reason: 'r', cost: 'high', undoable: true, attachTo: null, usesFinding: false }] };
  }
  if (a.schema?.required?.includes('scores')) return { scores: [] };
  if (a.schema?.required?.includes('decisions')) return { decisions: [] };
  return {};
};
await proposeAndSelect({ run, idea: 'A website for a small bakery, so customers can order bread ahead.', flow: { nodes: [], edges: [] }, taste: readTaste(run), herSeat: 'product', callModel });
const events = readEvents(run).map(({ t, run: _r, ...e }) => Object.fromEntries(Object.entries(e).filter(([k]) => !/(^|[a-z])Ms$|^ms$/.test(k)))); // timings vary run to run
console.log(JSON.stringify({ prompts: prompts.sort(), events }));
`;

test('guard: the Product path is byte-for-byte main (prompts, events, roster)', async t => {
  if (!hasMain) return t.skip('origin/main not available for the diff');
  const probe = path.join(TMP, 'probe.mjs');
  fs.writeFileSync(probe, PROBE);
  const run = root => JSON.parse(execFileSync('node', [probe, root], { encoding: 'utf8' }).trim().split('\n').pop());
  const a = run(MAIN), b = run(ROOT);
  assert.ok(a.prompts.length >= 7, `prompts seen on main: ${a.prompts.length}`);
  assert.deepStrictEqual(b.prompts, a.prompts, 'every prompt the team and the selector see is the same as main');
  assert.deepStrictEqual(b.events, a.events, 'the event log (seats, candidates, decisions) is the same as main');
  // The roster, as the room draws it: every seat's card on both servers, after she picks Product.
  const port = 4300 + Math.floor(Math.random() * 40);
  const sm = serve(MAIN, port), sb = serve(ROOT, port + 41);
  await sm.ready(); await sb.ready();
  const roster = async base => {
    const p = await browser.newPage({ viewport: { width: 1600, height: 930 } });
    await p.goto(base + '/?hold=200'); await p.waitForTimeout(600);
    await p.click('.seat-product');
    // main may predate the pick card (it lives on build/beats); where it exists, she picks Product on it
    if (await p.locator('#pick-card [data-pick="product"]').count()) await p.click('#pick-card [data-pick="product"]');
    await p.waitForFunction(() => document.querySelectorAll('.seat .card[data-component="place-card"]').length >= 5, null, { timeout: 30000 });
    const out = await p.evaluate(() => ({
      info: ['product', 'design', 'data', 'research', 'strategy', 'engineering'].map(s => BYOC.info(s)),
      cards: ['product', 'design', 'data', 'research', 'strategy', 'engineering'].map(id => document.querySelector(`.seat[data-seat="${id}"]`)).map(s => s.dataset.seat + ' | ' + (s.querySelector('.card')?.innerText || '').replace(/\s+/g, ' ')),
    }));
    await p.close();
    return out;
  };
  const rm = await roster(sm.base), rb = await roster(sb.base);
  assert.deepStrictEqual(rb, rm, 'the roster and its cards are the same as main');
  console.log(`guard: ${a.prompts.length} prompts, ${a.events.length} events, ${rm.cards.length} seats identical to main`);
});

test('a real run in the Design seat: Mika wears Product, her seat speaks Design, at most 3 questions', async () => {
  const s = serve(ROOT, 4390 + Math.floor(Math.random() * 9));
  await s.ready();
  const p = await browser.newPage({ viewport: { width: 1600, height: 930 } });
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  await p.goto(s.base + '/?hold=200'); await p.waitForTimeout(600);
  await p.click('.seat-product'); await p.click('#pick-card [data-pick="design"]');
  await p.waitForFunction(() => document.querySelectorAll('.seat .card[data-component="place-card"]').length >= 5, null, { timeout: 30000 });
  const mika = await p.evaluate(() => document.querySelector('.seat[data-seat="design"] .card').innerText);
  assert.match(mika, /Product/i); assert.match(mika, /Mika/);
  assert.match(await p.evaluate(() => document.querySelector('.seat[data-seat="product"] .card').textContent), /Design/i);
  // The run itself, through the API, as the room would start it.
  const api = (u, body) => p.evaluate(([u, body]) => BYOC.api(u, body, { step: false }), [u, body]);
  const { run } = await api('/api/run', { idea: 'A website for a small bakery, so customers can order bread ahead.', intro: 'I love making things feel right.', craft: 'design' });
  await api(`/api/run/${run}/sketch`, {});
  const r = await api(`/api/run/${run}/propose`, { wait: true });
  const evs = fs.readFileSync(path.join(s.runs, run, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const start = evs.find(e => e.type === 'run.start');
  assert.deepStrictEqual([start.seat, start.cast.craft, start.cast.roles.design], ['product', 'design', 'product']);
  const bySeat = new Set(evs.filter(e => e.type === 'candidate').map(e => e.seat));
  for (const seat of ['product', 'design', 'research', 'engineering', 'data', 'strategy']) assert.ok(bySeat.has(seat), `candidates from ${seat}`);
  const asks = evs.filter(e => e.type === 'ask');
  assert.ok(asks.length <= 3, `at most 3 questions, got ${asks.length}`);
  assert.deepStrictEqual(errors, []);
  console.log(`design seat: ${r.came} came, ${r.brought} brought; questions: ${JSON.stringify(asks.map(a => `${a.by}: ${a.question}`))}`);
  await p.close();
});

// No fallback for the flex seat (SEATS.md): a late card leaves an inked note in the chair and the room goes on; the
// teammate pops in when the card lands; a failed call says "Still on the way". The flex call is held in the browser.
test('the flex seat: a late card is a note in the chair, then the teammate pops in; a failed one stays "on the way"', async () => {
  const s = serve(ROOT, 4380 + Math.floor(Math.random() * 9));
  await s.ready();
  for (const mode of ['late', 'fail']) {
    const p = await browser.newPage({ viewport: { width: 1600, height: 930 } });
    const errors = []; p.on('pageerror', e => errors.push(String(e)));
    let release; const gate = new Promise(r => (release = r));
    await p.route('**/api/cast/flex', async route => {
      await gate;
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mode === 'fail' ? { role: null, failed: 'boom' }
        : { role: 'flex', flex: { name: 'Operations', focus: 'the morning bake list', stance: 'nothing wasted', loves: 'Every loaf has a home.', brings: 'the morning bake list calls for this page' } }) });
    });
    await p.goto(s.base + '/?hold=200'); await p.waitForTimeout(600);
    await p.click('.seat-product'); await p.click('#pick-card [data-pick="data"]');
    await p.waitForSelector('.seat[data-seat="data"] .late-note', { timeout: 30000 });
    assert.match(await p.textContent('.seat[data-seat="data"] .late-note'), /Theo.s running a little late/);
    assert.equal(await p.evaluate(() => document.querySelectorAll('.seat .card[data-component="place-card"]').length), 4, 'four teammates seated; the room did not wait');
    release(); await p.waitForTimeout(1200);
    if (mode === 'late') assert.match(await p.evaluate(() => document.querySelector('.seat[data-seat="data"] .card')?.innerText || ''), /Operations/i);
    else assert.equal(await p.textContent('.seat[data-seat="data"] .late-note'), 'Still on the way.');
    assert.deepStrictEqual(errors, []);
    await p.close();
  }
});
