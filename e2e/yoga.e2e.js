// End-to-end: walks the yoga script through the real UI (BRIEF §5 "one shot"). Lead-owned.
// Run: npm run e2e. Steps whose piece hasn't merged yet are `todo` (pending), never skipped silently.
// Uses the real model backend unless E2E_FAKE_MODEL=1 (not built yet).
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const SENTINEL = 'fal-sentinel-' + Math.random().toString(36).slice(2) + '-DO-NOT-LEAK';
const RUNS = fs.mkdtempSync('/tmp/byoc-e2e-runs-');
let srv, logs = '', browser, page, consoleErrors = [], bodies = [];
// E2E_SCREENS=docs/screens saves the live screenshots there. Beat timings print at the end.
const SCREENS = process.env.E2E_SCREENS ? path.resolve(ROOT, process.env.E2E_SCREENS) : null;
const shot = name => SCREENS && page.screenshot({ path: path.join(SCREENS, name) });
const T = {}; let tBeat = Date.now();
const lap = name => { const now = Date.now(); T[name] = ((now - tBeat) / 1000).toFixed(1) + ' s'; tBeat = now; };
const events = () => page.evaluate(() => BYOC.events());
const waitFor = async (fn, ms, what, arg) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await page.evaluate(fn, arg).catch(() => false)) return; await page.waitForTimeout(250); }
  throw new Error('timed out waiting for ' + what);
};
// The number a rolling counter shows, read from where each digit column sits.
const shown = id => page.evaluate(id => [...document.querySelectorAll(`#${id} .col`)]
  .map(c => Math.round(-parseFloat((c.style.transform.match(/-?[\d.]+/) || ['0'])[0]))).join(''), id);
let RUN = null;

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, FAL_KEY: SENTINEL } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 50 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: SCREENS ? 2 : 1 });
  page.on('console', m => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', e => consoleErrors.push(String(e)));
  page.on('response', async r => { try { bodies.push(await r.text()); } catch {} });
});
after(async () => { console.log('beat timings:', JSON.stringify(T)); await browser?.close(); srv?.kill(); });

const has = expr => page.evaluate(expr).catch(() => false);

test('1. the room loads with no console errors', async () => {
  await page.goto(BASE + '/?path=full&meeting=0&setup=classic&hold=2000'); // all three focus moments, the single-Send flow (off the stage path)
  await page.waitForTimeout(1500);
  assert.deepStrictEqual(consoleErrors, []);
});

test('2. six seats; she clicks Product, the team assembles, her card takes her line', async t => {
  if (!(await has('!!(window.BYOC && BYOC.el && BYOC.el.herSheet)'))) return t.todo('room not merged');
  for (const s of ['product', 'design', 'data', 'research', 'strategy', 'engineering'])
    assert.ok(await page.locator(`[data-seat="${s}"]`).count(), `seat ${s} on the table`);
  tBeat = Date.now();
  assert.strictEqual(await page.locator('.seat .card').count(), 0, 'six empty seats at the start');
  // The setup: her name tag on paper first, the room hidden until the reveal.
  assert.ok(await page.isVisible('#setup'), 'the room is hidden behind her paper name tag');
  assert.match(await page.textContent('.nt-paper'), /Your name[\s\S]*What do you bring to the table\?[\s\S]*Product[\s\S]*Your own craft/);
  assert.strictEqual(await page.locator('.seat-diy').count(), 0, 'no seventh seat');
  await page.keyboard.press('Enter'); // to her words (Product is prefilled)
  await waitFor(() => document.activeElement?.id === 'intro-input', 5000, 'her words');
  await page.keyboard.type('getting the journey right before anyone draws a screen.');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.big-card[data-seat="product"]')?.dataset.state === 'shown', null, { timeout: 30000 }); await page.keyboard.press('Enter'); // her name tag, then she meets the team
  await waitFor(() => !!document.querySelector('.meet-card'), 5000, 'meet the team');
  assert.ok(await page.isVisible('#setup'), 'still no room while she meets the team');
  // The reveal: the studio, everyone seated, she takes her seat.
  await waitFor(() => document.querySelectorAll('.seat .card').length === 6 && document.activeElement?.id === 'her-input', 40000, 'the reveal: everyone seated, her idea next');
  lap('0:00 name tag, team, reveal');
  assert.ok(!(await page.isVisible('#setup')), 'the room is revealed');
  assert.ok(await page.locator('.seat-product .card').count(), 'her card in Product');
  for (const stance of ['sketch first, polish last', 'only what we’ll measure', 'what’s known, with sources', 'who pays, and why now', 'boring and correct'])
    assert.ok(await page.locator('.seat .card-stance', { hasText: stance }).count(), `stance "${stance}" on a place card`);
  assert.strictEqual(await page.getByText(/Seat open: invite a teammate/).count(), 0, 'the teammates are real members of her team: no "seat open" line');
  assert.strictEqual(await page.locator('.seat .card [data-slot="character"]').count(), 6, 'a character slot on every seat card');
  for (const k of ['api', 'on', 'stage', 'el']) assert.ok(await has(`!!BYOC.${k}`), `BYOC.${k}`);
  await shot('live-walk-in.png');
});

test('3. she writes the idea and her journey; lines become boxes', async t => {
  if (!(await has('!!(window.BYOC && BYOC.flow && BYOC.flow.addLine)'))) return t.todo('flow not merged');
  if (!(await has('fetch("/api/run",{method:"POST",body:"{}"}).then(r=>r.status!==404)'))) return t.todo('run routes not merged');
  // Her card settles and her sheet opens on its own.
  await waitFor(() => document.activeElement && document.activeElement.id === 'her-input', 3000, 'her input focused');
  assert.ok(await page.getByText('What’s the idea?').count());
  await page.keyboard.type('A booking page for a small yoga studio.');
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.run && !BYOC.run.startsWith('local-'), 5000, 'a run id');
  RUN = await page.evaluate(() => BYOC.run);
  // Her "I love..." line is L1 of her file, in her own words.
  await waitFor(() => /I love getting the journey right/.test(document.querySelector('#file-lines li[data-id="L1"]')?.textContent || ''), 5000, 'L1 on her file card');
  for (const l of ['classes', 'a class', 'confirm', 'booked', 'regulars → "Book your usual"']) {
    await page.keyboard.type(l); await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
  }
  await waitFor(() => document.querySelectorAll('#her-flow .fl-box').length === 5, 5000, 'five boxes');
  lap('0:22 idea + journey');
  const edges = await page.evaluate(() => BYOC.flow._state.edges);
  // classes -> a class -> confirm -> booked is 3 arrows; regulars -> "Book your usual" is the 4th, a labelled branch.
  assert.strictEqual(edges.length, 4, '4 arrows');
  assert.deepStrictEqual(edges.filter(e => e.label).map(e => e.label), ['regulars'], 'one of them the regulars branch');
  const logged = (await events()).filter(e => e.type === 'flow.line');
  assert.strictEqual(logged.length, 5, 'each line logged once');
});

// Her answers in her own words, one per question (DEMO focus moments).
const SAYS = [
  'Knowing their spot is theirs. My regulars do the same class every week and hate hunting for it.',
  'Small and warm. Nobody should feel lost on their first visit, and nobody should wait at the door.',
  'Fast. Don\'t ask for anything you already know.',
];
test('4. the questions that passed the bar wait in her tray; she opens each as a document and says her piece', async t => {
  if (!RUN) return t.todo('needs step 3');
  await page.keyboard.press('Enter'); // an empty line: team, go
  await waitFor(() => BYOC.events().some(e => e.type === 'select.done' || e.type === 'propose.error'), 110000, 'the team and the selector');
  lap('0:55 team works (propose + select)');
  const evs = await events();
  assert.ok(!evs.some(e => e.type === 'propose.error'), 'propose ran');
  const asks = evs.filter(e => e.type === 'ask');
  assert.ok(asks.length >= 1 && asks.length <= 3, `1 to 3 asks, got ${asks.length}`);
  // Nothing on her flow asks her anything, and nothing opens by itself: the questions wait in her tray.
  await waitFor(n => !document.getElementById('inbox').hidden && BYOC.inbox.shown.length === n, 5000, 'her inbox', asks.length);
  assert.strictEqual(await page.locator('#her-flow .fl-fork, #her-flow .fl-pin').count(), 0, 'no forks or pins');
  assert.strictEqual(await page.locator('[role=dialog], dialog, .modal').count(), 0, 'no pop-up');
  await shot('live-tray.png');
  for (let i = 0; i < asks.length; i++) {
    await page.waitForSelector('#inbox:not([hidden])[data-needs="yes"] .inbox-now', { timeout: 5000 });
    await page.locator('#inbox .inbox-now').click();
    await waitFor(() => BYOC.focusDoc.isOpen(), 3000, 'her document');
    const id = await page.evaluate(() => BYOC.focusDoc.openId());
    if (i === 0) await shot('live-focus.png');
    await page.locator('#focus-doc .fd-input').fill(SAYS[i % SAYS.length]);
    await page.click('#focus-doc .fd-send'); // she sends when she's ready
    await waitFor(id => BYOC.events().some(e => e.type === 'answer' && e.askId === id), 8000, 'her answer logged', id);
    // The team chimes in; her takeaways appear; she keeps them (her hidden file grows: taste.written).
    await waitFor(() => !document.querySelector('#focus-doc .fd-brief').hidden, 40000, 'her takeaways');
    if (i === asks.length - 1) { // the last one she rewords, as on stage
      await page.locator('#focus-doc .brief-believe .brief-text').click();
      await page.keyboard.press('Control+A'); await page.keyboard.type('Never ask for anything you could remember or skip.');
      await page.keyboard.press('Enter');
    } else await page.click('#focus-doc .fd-keep');
    await waitFor(n => BYOC.events().filter(e => e.type === 'taste.written').length >= n, 10000, 'her takeaways kept', i + 1);
    await page.keyboard.press('Escape'); // back to the room
    await waitFor(() => !BYOC.focusDoc.isOpen(), 3000, 'back in the room');
  }
  await waitFor(n => new Set(BYOC.events().filter(e => e.type === 'answer').map(e => e.askId)).size >= n, 8000, 'her answers logged', asks.length);
  lap('1:10 her answers said');
});

test('5. Design\'s wireframes come onto the table (the "Sounds like" step and the file card are gone)', async t => {
  if (!RUN) return t.todo('needs step 3');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowRight'); // Design's sketches slide over
  await waitFor(() => document.querySelectorAll('#sketch-sheet .sk-frame').length > 0, 90000, 'grey sketches');
  lap('1:45 sketches on the table (after answers)');
  assert.ok(await page.locator('#file-card').isHidden(), 'her file stays off screen');
  const written = (await events()).filter(e => e.type === 'taste.written').at(-1);
  assert.strictEqual(written.text, 'Never ask for anything you could remember or skip.', 'her reworded belief is the newest line');
  const md = fs.readFileSync(path.join(RUNS, RUN, 'taste.md'), 'utf8');
  assert.ok(md.includes(written.text), 'in runs/<id>/taste.md');
});

test('6. Build -> page reflects her choices; a decision cites her new line', async t => {
  if (!RUN) return t.todo('needs step 3');
  const written = (await events()).filter(e => e.type === 'taste.written').at(-1);
  if (!written) return t.todo('needs step 5');
  // Her one press. The room's own build key/button is piece 1's; until it exists, the same POST the button makes.
  const pressed = await page.evaluate(() => typeof BYOC.build === 'function' ? (BYOC.build(), 'room') : null);
  if (!pressed) await page.evaluate(run => BYOC.api(`/api/run/${run}/build`, {}), RUN);
  await waitFor(() => BYOC.events().some(e => (e.type === 'build.done' && !e.background) || (!e.background && /^Build failed/.test(e.step || ''))), 120000, 'build.done');
  lap('2:05 build done');
  const evs = await events();
  const steps = evs.filter(e => e.type === 'build.step' && !e.background).map(e => e.step);
  assert.ok(!steps.some(s => /^Build failed/.test(s)), 'build ran: ' + steps.join(' / '));
  assert.ok(steps.length >= 3, 'the build shows its steps');
  const done = evs.find(e => e.type === 'build.done' && !e.background);
  assert.strictEqual(done.url, `/runs/${RUN}/page/`);
  // The build re-decided the rest against her updated file, and at least one decision cites her new line.
  // re-decided at Build, or a joint agreement revisited against her new line in code before it (round 'revisit')
  const redecided = evs.filter(e => e.type === 'decided' && (e.round === 'build' || e.round === 'revisit'));
  assert.ok(redecided.some(d => d.cites === written.id), `a re-decision cites ${written.id}: ${redecided.map(d => d.id + ':' + d.cites).join(' ')}`);
  // Her page.
  const pg = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SCREENS ? 2 : 1 });
  await pg.goto(BASE + done.url, { waitUntil: 'networkidle' });
  assert.strictEqual(await pg.locator('input[type=tel]').count(), 0, 'no phone field (her pin)');
  // The page cites her new line (in its hidden markup, from the log), and shows no credits or list of who did what.
  const cited = pg.locator(`#decided [data-decided][data-cites="${written.id}"]`);
  assert.ok((await cited.count()) >= 1, `the page's decisions include one citing ${written.id}`);
  assert.ok(!(await pg.locator('#decided').isVisible()), 'no "decided for you" list or credits on screen');
  assert.strictEqual(await pg.locator('.decided__seat, [data-yours]').count(), 0, 'no seat tags, no credits');
  // The product is just the product: no margin notes on her page (the cancel note is cut).
  assert.strictEqual(await pg.locator('[data-note], .margin-note').count(), 0, 'no notes on her page');
  assert.match(await pg.locator('h1').innerText(), /\S/, 'her page has a headline');
  // Her answers reach the fill as hers, the overruled one marked so (the page follows her branch, not the team's).
  const slots = JSON.parse(fs.readFileSync(path.join(RUNS, RUN, 'page', 'slots.json'), 'utf8'));
  const answered = evs.filter(e => e.type === 'answer');
  // An answer in her words reaches the fill as the decisions it settled (answer.mapped), so one answer can be several.
  assert.ok(slots.inputs.answers.filter(a => a.decision !== 'her pinned note').length >= answered.length, 'every answer reached the fill');
  if (SCREENS) {
    await pg.screenshot({ path: path.join(SCREENS, 'live-page.png') });
    await cited.first().scrollIntoViewIfNeeded();
    await pg.screenshot({ path: path.join(SCREENS, 'live-page-decided.png') });
  }
  await pg.close();
});

test('7. counter and meter match the log', async t => {
  if (!RUN) return t.todo('needs step 3');
  const { tally } = await import('../lib/tally.js');
  const log = fs.readFileSync(path.join(RUNS, RUN, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const want = tally(log);
  await page.waitForTimeout(1200); // the last roll settles
  assert.strictEqual(await shown('came'), String(want.came), 'decisions came up');
  assert.strictEqual(await shown('brought'), String(want.brought), 'brought to you');
  assert.strictEqual(await shown('pct'), String(want.meter.pct), 'IN YOUR CRAFT %');
});

test('8. the fal key appears nowhere (runs/, logs, any HTTP response)', async () => {
  const hits = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name); f.isDirectory() ? walk(p) : fs.readFileSync(p, 'utf8').includes(SENTINEL) && hits.push(p); } };
  walk(RUNS);
  if (logs.includes(SENTINEL)) hits.push('server logs');
  bodies.forEach((b, i) => b.includes(SENTINEL) && hits.push('response ' + i));
  const health = await (await fetch(BASE + '/api/health')).text();
  if (health.includes(SENTINEL)) hits.push('/api/health');
  assert.deepStrictEqual(hits, []);
});
