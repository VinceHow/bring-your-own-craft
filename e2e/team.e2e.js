// End-to-end, the team space: a real run (real model backend). After the team proposes, the biggest joint decisions
// are talked out in the background, each turn its own call; the lines are room chatter, never a question to her; the
// agreements land as cards in the middle of the table, tap for the exchange. Owned by the team-space piece.
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4300 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-team-runs-');
let srv, logs = '', browser, page, consoleErrors = [], RUN = null;
const waitFor = async (fn, ms, what, arg) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await page.evaluate(fn, arg).catch(() => false)) return; await page.waitForTimeout(200); }
  throw new Error('timed out waiting for ' + what);
};
const api = (p, body) => page.evaluate(([p, body]) => BYOC.api(p, body, { step: false }), [p, body]);
const logged = () => fs.readFileSync(path.join(RUNS, RUN, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 50 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1600, height: 930 } });
  page.on('console', m => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', e => consoleErrors.push(String(e)));
  await page.goto(BASE + '/?hold=300&path=full&setup=classic');
  await page.waitForTimeout(800);
});
after(async () => { await browser?.close(); srv?.kill(); });

test('the team talks out its joint decisions, and the agreements land in the team space', async () => {
  const r = await api('/api/run', { idea: 'A booking page for a small yoga studio.', path: 'full' });
  RUN = r.run;
  await page.evaluate(run => { BYOC.run = run; BYOC.stage(6, { instant: true }); }, RUN);
  await api(`/api/run/${RUN}/sketch`, {});
  const t0 = Date.now();
  await api(`/api/run/${RUN}/propose`, { wait: true });
  const tSelect = Date.now();
  // In the background, never blocking her: the exchanges start after the selector, on their own.
  await waitFor(() => (BYOC.teamSpace && BYOC.teamSpace.count) >= 1, 120000, 'an agreement card');
  // Let the other exchanges finish (they run in parallel).
  const end = Date.now() + 90000;
  while (Date.now() < end) {
    const evs = logged();
    const started = evs.filter(e => e.type === 'joint.start').length;
    const finished = new Set([...evs.filter(e => e.type === 'joint.agreed').map(e => e.id), ...evs.filter(e => e.type === 'joint.error').map(e => e.jointId)]).size;
    if (started && finished >= started) break;
    await page.waitForTimeout(500);
  }
  const evs = logged();
  const agreed = evs.filter(e => e.type === 'joint.agreed');
  assert.ok(agreed.length >= 1, 'at least one real agreement');
  const asked = new Set(evs.filter(e => e.type === 'ask').map(e => e.id));
  for (const a of agreed) {
    assert.ok(a.turns.length >= 3 && a.turns.length <= 4, `${a.id}: 3-4 turns`);
    assert.ok(a.seats.length >= 2 && !a.seats.includes('product'), `${a.id}: two or more teammates, never her seat`);
    assert.ok(!asked.has(a.candidateId), `${a.id}: never one brought to her`);
    assert.ok(evs.some(e => e.type === 'decided' && e.jointId === a.id && e.id === a.candidateId), `${a.id}: decision logged`);
    assert.ok(a.turns.every(t => a.seats.includes(t.seat)), `${a.id}: only the touched teammates talk`);
  }
  // Every exchange line is room chatter, and no line is a question to her.
  const lines = evs.filter(e => e.type === 'chatter' && e.jointId);
  assert.ok(lines.length >= 3);
  for (const l of lines) {
    assert.doesNotMatch(l.text, /\?/, `not a question: ${l.text}`);
    assert.doesNotMatch(l.text, /\byou(r|rs|'re|’re|'ll|’ll)?\b/i, `not addressed to her: ${l.text}`);
    assert.ok(l.text.split(/\s+/).length <= 15, `15 words or fewer: ${l.text}`);
  }
  assert.ok(!evs.some(e => e.type === 'stamp'), 'nothing stamped on her');
  // The cards: all of them, headlines only, marks of who talked it out, the label; tap shows the real exchange.
  const cards = page.locator('.team-space .ts-card');
  assert.strictEqual(await cards.count(), agreed.length, 'one card per agreement');
  const first = cards.first();
  assert.ok(await first.isVisible(), 'the card shows');
  assert.strictEqual(await first.locator('.ts-headline').innerText(), agreed[0].headline);
  assert.strictEqual(await first.locator('.ts-mark').count(), agreed[0].seats.length);
  assert.strictEqual(await first.locator('.ts-label').innerText(), 'Talk this through: coming');
  assert.strictEqual(await first.locator('button, a').count(), 0, 'the label is a label, not a button');
  assert.strictEqual(await first.locator('.ts-takeaways').count(), agreed[0].withTakeaways ? 1 : 0);
  assert.ok(!(await first.locator('.ts-exchange').isVisible()), 'headline only until tapped');
  await first.click();
  assert.ok(await first.locator('.ts-exchange').isVisible(), 'tap: the exchange');
  assert.deepStrictEqual(await first.locator('.ts-turn .ts-text').allInnerTexts(), agreed[0].turns.map(t => t.text));
  if (process.env.E2E_SCREENS) await page.screenshot({ path: path.join(process.env.E2E_SCREENS, 'team-space.png') });
  const sel = evs.find(e => e.type === 'select.done');
  for (const a of agreed) {
    console.log(`\n${a.headline}  [${a.seats.join(', ')}]  ${a.ms} ms to talk out, card ${a.t - sel.t} ms after the selector${a.withTakeaways ? ', with her takeaways' : ''}`);
    for (const t of a.turns) console.log(`  ${t.by}: ${t.text}`);
  }
  console.log(`propose ${tSelect - t0} ms; errors: ${JSON.stringify(evs.filter(e => e.type === 'joint.error'))}`);
});

test('no console errors', () => assert.deepStrictEqual(consoleErrors, []));
