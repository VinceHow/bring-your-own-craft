// Any seat is hers (lib/cast.js, design/studio/SEATS.md): on her name tag she can take any seat (Product, Design,
// Data, Research, Engineering, Strategy) or her own craft. For each, stubbed (no models): the pick card's hooks
// (data-seat, data-selected), the room starts with 0 page errors, her card wears her seat, the teammate whose craft
// she took steps aside from it (wears another role), and the run carries her craft. Product sends nothing new.
// Run: node --test e2e/anyseat.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4300 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-anyseat-e2e-');
let srv, logs = '', browser;
before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 100 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

const LABEL = { product: 'Product', design: 'Design', data: 'Data', research: 'Research', engineering: 'Engineering', strategy: 'Strategy' };
const FLEX = { role: 'flex', flex: { name: 'Operations', focus: 'the morning bake', stance: 'what the counter can really do', loves: 'A bake list that adds up.', brings: 'the morning bake: what is ready, and when' } };

async function walk(seat, look) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const sent = { run: null, cast: 0 };
  await page.route('**/api/tidy', r => r.fulfill({ json: { text: JSON.parse(r.request().postData()).text, tidied: false } }));
  await page.route('**/api/name-tag', r => r.fulfill({ status: 500, json: { error: 'stubbed' } }));
  await page.route('**/api/meet-lines', r => r.fulfill({ json: { lines: {} } }));
  await page.route('**/api/cast/flex', r => r.fulfill({ json: FLEX }));
  page.on('request', q => { if (/\/api\/cast$/.test(q.url())) sent.cast++; });
  await page.route('**/api/run', async r => { sent.run = JSON.parse(r.request().postData()); r.continue(); });
  await page.route('**/api/run/*/**', r => r.fulfill({ json: { ok: true } }));
  await page.goto(BASE + '/?hold=60' + (look ? '&' + look : ''));
  await page.waitForFunction(() => window.BYOC && BYOC.ideaOpen && BYOC.ideaOpen(), null, { timeout: 8000 });
  await page.fill('#idea-input', 'A website for my bakery'); await page.press('#idea-input', 'Enter');
  await page.waitForFunction(() => BYOC.introOpen && BYOC.introOpen(), null, { timeout: 10000 });
  // the pick card: every seat, with hooks
  const opts = await page.$$eval('.pick-option', bs => bs.map(b => ({ seat: b.dataset.seat, selected: b.dataset.selected, text: b.textContent.trim() })));
  assert.deepStrictEqual(opts.map(o => o.seat), ['product', 'design', 'data', 'research', 'engineering', 'strategy', 'craft']);
  assert.equal(opts[0].selected, 'true', 'Product is the default');
  if (seat !== 'product') await page.click(`.pick-option[data-seat="${seat}"]`);
  assert.equal(await page.getAttribute(`.pick-option[data-seat="${seat}"]`, 'data-selected'), 'true');
  await page.fill('#nt-name', 'Priya');
  await page.fill('#intro-input', 'I love getting the details right'); await page.press('#intro-input', 'Enter');
  await page.waitForFunction(() => ['rough', 'shown'].includes(document.querySelector('.nt-paper')?.dataset.state), null, { timeout: 8000 });
  await page.evaluate(() => BYOC.introDone());
  // the team, then the reveal, then the room
  await page.waitForFunction(() => BYOC.beat >= 3, null, { timeout: 20000 }).catch(async () => { for (let i = 0; i < 8 && await page.evaluate(() => BYOC.beat < 3); i++) { await page.evaluate(() => BYOC.meetNext()); await page.waitForTimeout(300); } });
  await page.waitForFunction(() => BYOC.beat >= 3, null, { timeout: 10000 });
  await page.waitForFunction(() => document.querySelectorAll('.seat .card').length >= 5, null, { timeout: 8000 });
  const her = (await page.textContent('.seat-product .card-name')).trim();
  assert.equal(her, LABEL[seat] || 'Product', 'her card wears her seat');
  if (seat !== 'product') {
    const theirs = await page.evaluate(s => BYOC.info(s).name, seat);
    assert.notEqual(theirs, LABEL[seat], `the ${seat} teammate steps aside from ${LABEL[seat]}`);
    assert.equal(await page.evaluate(() => document.body.dataset.herCraft), seat);
  } else {
    assert.equal(sent.cast, 0, 'Product: no cast call');
    assert.equal(await page.evaluate(() => document.body.dataset.herCraft), undefined);
  }
  // the app pill names Bo only while someone wears Engineering (she took it: role-neutral copy)
  const pill = await page.evaluate(() => document.querySelector('#app-button .app-hint')?.textContent || '');
  if (seat === 'engineering') assert.ok(!/\bBo\b/.test(pill) && /page/.test(pill), 'Engineering: the pill names no builder: ' + pill);
  else assert.match(pill, /\bBo\b/, `${seat}: Bo builds, the pill says so`);
  // the run: Product sends nothing new; another seat carries its craft
  await page.waitForSelector('#her-input', { state: 'visible', timeout: 8000 }).catch(() => {});
  if (!sent.run) { await page.fill('#her-input', 'A website for my bakery').catch(() => {}); await page.press('#her-input', 'Enter').catch(() => {}); }
  for (let i = 0; i < 60 && !sent.run; i++) await page.waitForTimeout(100);
  assert.ok(sent.run, 'the run started');
  if (seat === 'product') assert.ok(!('craft' in sent.run) && !('flex' in sent.run), 'Product: the run body is unchanged');
  else assert.equal(sent.run.craft, seat);
  assert.deepStrictEqual(errors, [], 'no page errors');
  await page.close();
}

for (const [lookName, look] of [['plain', ''], ['painted', 'look=painted']])
  for (const seat of ['product', 'design', 'data', 'research', 'engineering', 'strategy'])
    test(`${lookName}: she takes the ${seat} seat on her name tag; the room starts with no page errors`, () => walk(seat, look));
