// End-to-end: the keyboard-driven demo, walk-in to the close, in stage mode, with real model calls.
// Run: npm run e2e (or node --test e2e/beats.e2e.js). Owned by build/beats.
//   1. stage mode: body >= 20px, no chrome, no help card; the live path to the three asks at 1280x720, from a clicker
//   2. the judge's-idea close is unhooked (Vincent, 15 Nov): J opens nothing, the beats end at her page
//   3. replays: record-run, R in stage mode, the REPLAY label throughout
//   4. fallbacks: a slow or failing call shows its step (never a spinner) and offers R
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4100 + Math.floor(Math.random() * 80); // 4100-4179: clear of 4045, a port Chromium refuses (ERR_UNSAFE_PORT)
const BASE = `http://localhost:${PORT}`;
// E2E_LOOK=painted: every page in this spec opens in that look (the freeze run covers the demo default). Unset: the
// room's own default for an automated browser (plain), as before.
const L = u => process.env.E2E_LOOK && !/[?&]look=/.test(u) ? u + (u.includes('?') ? '&' : '?') + 'look=' + process.env.E2E_LOOK : u;
const RUNS = fs.mkdtempSync('/tmp/byoc-beats-e2e-');
const JUDGE_IDEA = 'A sign-up page for a neighbourhood tool library.';
const BAKERY = "An ordering website for my friend's small bakery, so customers can order bread ahead";
let srv, logs = '', browser, page, errors = [];
let RUN = null;

before(async () => {
  // The recorded yoga run is the close's fallback (C); the test's runs dir gets a copy.
  if (fs.existsSync(path.join(ROOT, 'runs', 'yoga'))) fs.cpSync(path.join(ROOT, 'runs', 'yoga'), path.join(RUNS, 'yoga'), { recursive: true });
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 50 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => errors.push(String(e)));
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

const waitFor = async (fn, ms, what, arg, p = page) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await p.evaluate(fn, arg).catch(() => false)) return; await p.waitForTimeout(200); }
  throw new Error('timed out waiting for ' + what);
};
const readLog = run => fs.readFileSync(path.join(RUNS, run, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
// The same count the close makes: distinct decisions (not asked) whose latest decided event cites a line of her file.
function countFromLog(evs) {
  const asked = new Set(evs.filter(e => e.type === 'ask').map(e => e.id));
  const latest = new Map();
  for (const e of evs) if (e.type === 'decided' && !asked.has(e.id)) latest.set(e.id, e);
  return { asked: asked.size, fromFile: [...latest.values()].filter(d => /^L\d+$/.test(String(d.cites))).length };
}
// Every box is on screen (inside the viewport), so nothing on a beat is cut off.
// No pronouns anywhere in the room (the PO's own "until they arrive" / "their own team" aside): he, she, his, him, her, hers.
const pronouns = pg => pg.evaluate(() => (document.body.innerText.match(/\b(he|she|his|him|her|hers)\b/gi) || []));
const onScreen = sel => page.evaluate(sel => [...document.querySelectorAll(sel)].every(e => {
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
}), sel);

test('1. stage mode: body >= 20px, no chrome, no help card', async () => {
  await page.goto(L(BASE + '/?hold=300&setup=classic'));
  await page.waitForTimeout(400);
  await page.keyboard.press('?');
  assert.ok(await page.isVisible('#help-card'), 'the help card toggles with ?');
  const helpLines = await page.locator('#help-card dt').count();
  const docLines = fs.readFileSync(path.join(ROOT, 'docs', 'KEYS.md'), 'utf8').split('\n').filter(l => /^\| `/.test(l)).length;
  assert.strictEqual(helpLines, docLines, 'the help card and docs/KEYS.md list the same keys');
  await page.keyboard.press('s');
  assert.ok(!(await page.isVisible('#help-card')), 'no help card in stage mode');
  await page.keyboard.press('?');
  assert.ok(!(await page.isVisible('#help-card')), '? does nothing in stage mode');
  assert.ok(!(await page.isVisible('#chrome')), 'no chrome');
  assert.ok(parseFloat(await page.evaluate(() => getComputedStyle(document.body).fontSize)) >= 20, 'body >= 20px');
  // The 1600x900 room fits the 1280x720 screen, centred.
  const r = await page.evaluate(() => { const b = document.getElementById('room').getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; });
  assert.ok(r[0] >= -1 && r[1] >= -1 && r[2] <= 1281 && r[3] <= 721, `the room fits the screen: ${r}`);
});

test('1b. "Your own craft" on her paper name tag: a seat choice on the one tag, then the team, then she sits in her own craft', async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  const runs = []; p.on('request', r => r.url().endsWith('/api/run') && r.method() === 'POST' && runs.push(JSON.parse(r.postData())));
  await p.goto(L(BASE + '/?stage=1&hold=300&setup=classic'));
  await p.waitForTimeout(400);
  assert.strictEqual(await p.locator('.seat-diy').count(), 0, 'no seventh seat');
  // Her paper name tag: the role choice is on it (Product prefilled).
  assert.strictEqual(await p.textContent('.nt-paper .pick-q'), 'What do you bring to the table?');
  assert.deepStrictEqual(await p.locator('.nt-paper .pick-option').allInnerTexts(), ['Product', 'Design', 'Data', 'Research', 'Engineering', 'Strategy', 'Your own craft']); // any seat
  assert.strictEqual(await p.getAttribute('.nt-paper .pick-card', 'data-pick'), 'product');
  // "Your own craft" only selects the seat (the old DIY popup is retired): one name tag, her words next.
  await p.click('.nt-paper [data-pick="craft"]');
  await waitFor(() => document.activeElement?.id === 'intro-input', 3000, 'her words', null, p);
  assert.strictEqual(await p.locator('.name-tag').count(), 0, 'no second name tag');
  assert.strictEqual(await p.getAttribute('.nt-paper .pick-card', 'data-pick'), 'craft');
  await p.keyboard.type('I bake sourdough for my village and I love the 7am queue');
  await p.keyboard.press('Enter');
  await waitFor(() => ['rough', 'shown'].includes(document.querySelector('.nt-paper')?.dataset.state), 20000, 'her tag', null, p);
  await waitFor(() => document.querySelector('.nt-paper')?.dataset.state === 'shown' || document.querySelector('.nt-status')?.dataset.state === 'rough', 30000, 'the team\'s read (or her rough card)', null, p);
  await p.locator('.nt-paper').focus();
  await p.keyboard.press('Enter'); // meet the team: she takes her own-craft seat
  await waitFor(() => !!document.querySelector('.seat-product .card-diy'), 30000, 'her card in her seat, in her own craft', null, p);
  assert.strictEqual(await p.getAttribute('.seat-product .card', 'data-seat'), 'diy', 'her own craft, not Product');
  assert.match(await p.textContent('.seat-product .card-name'), /\S/, 'her craft names her card');
  assert.strictEqual(await p.locator('#her-stance').count(), 0, 'no stance slot on her card');
  await waitFor(() => document.querySelectorAll('.seat:not(.seat-product) .card').length === 5, 30000, 'the team assembled', null, p);
  await waitFor(() => document.activeElement?.id === 'her-input', 8000, 'straight to the idea', null, p);
  await p.keyboard.type('A pre-order page for my bakery.'); await p.keyboard.press('Enter');
  await waitFor(() => BYOC.run && !BYOC.run.startsWith('local-'), 5000, 'a run', null, p);
  assert.strictEqual(runs.at(-1).seat, 'diy', 'the run is in her own craft');
  assert.match(String(runs.at(-1).intro || ''), /^I love /, 'her loves line goes as her intro');
  assert.deepStrictEqual(perrs, []);
  await p.close();
});

test('1c. her character card on the Product seat: her sentence, the team\'s playful read, every piece swappable', async () => {
  // The name-tag call (builder 6's) is stubbed: this checks the room's card, not the model.
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  await p.route('**/api/name-tag', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    craft: 'Product', title: 'the Customer Whisperer', traits: ['customer-obsessed', 'hands-on builder', 'problem hunter'], superpower: 'hears the problem behind the request',
    goodAt: 'customer journeys', loves: 'working on the customer journey', alternates: { titles: ['the Journey Mapper'], traits: ['question asker'], superpowers: [] } }) }));
  await p.goto(L(BASE + '/?stage=1&hold=1500&setup=classic')); // each card holds 1.5 s, long enough to read the first one
  await p.waitForTimeout(300);
  // The setup: no room yet; her name tag on paper (name, role, what she loves and brings).
  assert.ok(await p.isVisible('#setup'), 'the room is hidden');
  assert.strictEqual(await p.inputValue('.nt-paper .nt-name'), 'Priya');
  await p.fill('.nt-paper .nt-name', 'Priya');
  await p.keyboard.press('Enter'); // from her name to her words
  await waitFor(() => document.activeElement?.id === 'intro-input', 3000, 'her words', null, p);
  assert.strictEqual(await p.getAttribute('.big-card[data-seat="product"]', 'data-component'), 'character-card');
  assert.strictEqual(await p.getAttribute('.big-card[data-seat="product"]', 'data-state'), 'asking');
  await p.keyboard.type('working on the customer journey, understanding the problems customers face');
  await p.keyboard.press('Enter');
  await waitFor(() => document.querySelector('.big-card[data-seat="product"]')?.dataset.state === 'shown', 5000, 'her character', null, p);
  assert.match(await p.textContent('.big-card[data-seat="product"] .char-who'), /Priya, the Customer Whisperer/);
  assert.strictEqual(await p.locator('.big-card[data-seat="product"] [data-slot="trait"]').count(), 3);
  // A click swaps a piece for the team's next idea.
  await p.click('.big-card[data-seat="product"] .char-title');
  assert.match(await p.textContent('.big-card[data-seat="product"] .char-title'), /the Journey Mapper/);
  await p.click('.big-card[data-seat="product"] [data-slot="trait"] .char-swap >> nth=1');
  assert.match(await p.textContent('.big-card[data-seat="product"] .char-traits'), /question asker/);
  assert.strictEqual(await p.locator('.big-card[data-seat="product"] .bc-stance').count(), 0, 'no stance on her card');
  await p.keyboard.press('Enter'); // her name tag is made: she meets the team
  await waitFor(() => !!document.querySelector('.meet-card'), 3000, 'meet the team', null, p);
  assert.match(await p.textContent('.meet-card'), /Mika · Design[\s\S]*agent[\s\S]*I’m Mika\.[\s\S]*Live in this room[\s\S]*Built with/);
  assert.strictEqual(await p.getAttribute('.meet-card', 'data-component'), 'meet-card');
  assert.strictEqual(await p.locator('.seat .card').count(), 0, 'still no room while she meets the team');
  await p.keyboard.press('PageDown'); // forward: the next teammate
  await waitFor(() => document.querySelector('.meet-card')?.dataset.seat !== 'design', 2000, 'the next teammate', null, p);
  // The reveal: everyone already seated, and she takes her seat; then her idea.
  await waitFor(() => document.activeElement?.id === 'her-input', 15000, 'on to the idea', null, p);
  assert.ok(!(await p.isVisible('#setup')), 'the room is revealed');
  assert.strictEqual(await p.locator('.seat .card').count(), 6, 'everyone seated');
  assert.strictEqual(await p.textContent('.seat-product .card-title'), 'the Journey Mapper');
  assert.match(await p.textContent('.seat-product .card-traits'), /customer-obsessed · question asker · problem hunter/);
  assert.strictEqual(await p.getAttribute('.seat-product .card', 'data-state'), 'named');
  assert.strictEqual(await p.textContent('.seat-product .card-who'), 'Priya', 'her title replaces "your seat"');
  assert.strictEqual(await p.locator('#her-stance').count(), 0, 'no stance slot');
  assert.ok(await p.locator('#file-card').isHidden(), 'her file stays off screen');
  assert.deepStrictEqual(perrs, []);
  await p.close();
});

test('1d. a teammate thinking, its sketchpad opened from its card, and her workspace from hers', async () => {
  // No model: the room's events are dispatched as a run would log them.
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  await p.goto(L(BASE + '/?stage=1'));
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    window.__ev = [];
    for (const t of ['teammate.thinking', 'seat.open', 'workspace.open']) BYOC.on(t, d => window.__ev.push([t, d]));
    BYOC.stage(4, { instant: true }); BYOC.run = 'stub-run';
    BYOC.herTag = { title: 'the Customer Whisperer', traits: ['customer-obsessed', 'problem hunter'] };
    const d = ev => BYOC.dispatch({ run: 'stub-run', ...ev }, 'replay');
    d({ type: 'run.start', idea: "An ordering website for my friend's small bakery" });
    d({ type: 'teammate.start', seat: 'data' });
  });
  assert.strictEqual(await p.locator('.seat .card [data-slot="character"]').count(), 6, 'a character slot on every seat card');
  assert.strictEqual(await p.getByText(/Seat open: invite a teammate/).count(), 0, 'no "seat open" line');
  assert.deepStrictEqual(await p.evaluate(() => window.__ev), [['teammate.thinking', { seat: 'data' }]]);
  assert.strictEqual(await p.getAttribute('.mini-sheet[data-sheet="data"]', 'data-state'), 'thinking');
  assert.strictEqual(await p.getAttribute('.seat-data .card', 'data-state'), 'thinking');
  await p.evaluate(() => {
    const d = ev => BYOC.dispatch({ run: 'stub-run', ...ev }, 'replay');
    d({ type: 'candidate', id: 'c1', seat: 'data', decision: 'What to count first', reason: 'one number that says it worked' });
    d({ type: 'decided', id: 'c1', seat: 'data', decision: 'What to count first', choice: 'Repeat orders a week', cites: 'team' });
    d({ type: 'joint.agreed', id: 'j1', headline: 'Orders close at 8pm for the next morning.', seats: ['engineering', 'strategy'] });
    d({ type: 'takeaways', askId: 'q1', believe: 'Ordering should feel like being known.', guidance: 'Their usual loaf first.' });
  });
  assert.strictEqual(await p.getAttribute('.mini-sheet[data-sheet="data"]', 'data-state'), 'working', 'thinking ends at its first proposal');
  // A click on its name opens its sketchpad.
  await p.click('.seat-data .card-agent-name');
  await waitFor(() => !document.getElementById('room-panel').hidden, 2000, 'the sketchpad', null, p);
  assert.strictEqual(await p.getAttribute('#room-panel', 'data-component'), 'sketchpad-open');
  assert.match(await p.textContent('#room-panel .rp-title'), /Theo · Data/);
  assert.match(await p.textContent('#room-panel .sp-item'), /What to count first[\s\S]*Repeat orders a week/);
  assert.deepStrictEqual((await p.evaluate(() => window.__ev)).at(-1), ['seat.open', { seat: 'data' }]);
  await p.keyboard.press('Escape');
  assert.ok(await p.locator('#room-panel').isHidden(), 'Esc back to the room');
  // A click on her place card opens her workspace.
  await p.click('.seat-product .card');
  await waitFor(() => document.getElementById('room-panel').dataset.component === 'workspace' && !document.getElementById('room-panel').hidden, 2000, 'her workspace', null, p);
  const ws = await p.textContent('#room-panel');
  assert.match(ws, /Priya, the Customer Whisperer/);
  assert.match(ws, /An ordering website for my friend's small bakery/);
  assert.match(ws, /Orders close at 8pm for the next morning\./);
  assert.match(ws, /Ordering should feel like being known\./);
  assert.ok(await p.evaluate(() => typeof BYOC.openWorkspace === 'function'));
  await p.click('#room-panel .rp-close');
  assert.ok(await p.locator('#room-panel').isHidden());
  // A click on the idea sheet's paper opens it large; Esc puts it back.
  await p.evaluate(() => { window.__ev = []; BYOC.on('sheet.open', d => window.__ev.push(['sheet.open', d])); });
  await p.click('#her-sheet .her-q');
  assert.strictEqual(await p.getAttribute('#her-sheet', 'data-open'), 'true', 'the idea sheet opens large');
  assert.ok((await p.locator('#her-sheet').boundingBox()).width > 1000, 'large');
  assert.deepStrictEqual(await p.evaluate(() => window.__ev), [['sheet.open', {}]]);
  await p.keyboard.press('Escape');
  assert.strictEqual(await p.getAttribute('#her-sheet', 'data-open'), null, 'Esc puts it back');
  assert.deepStrictEqual(perrs, []);
  await p.close();
});

test('1e. Act 2 in the room (stubbed): Focus 1 with Wren\'s finding, its cascade into the team space, then Focus 2 with Mika\'s journey in words', async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  const posts = [];
  await p.route('**/api/run/stub-run/**', r => { posts.push([new URL(r.request().url()).pathname.split('/').pop(), JSON.parse(r.request().postData() || '{}')]); return r.fulfill({ json: { ok: true } }); });
  await p.goto(L(BASE + '/?stage=1'));
  await p.waitForTimeout(300);
  assert.ok(await p.evaluate(() => BYOC.stagePath), 'the stage path is the default');
  await p.evaluate(() => {
    BYOC.stage(4, { instant: true }); BYOC.run = 'stub-run';
    const d = ev => BYOC.dispatch({ run: 'stub-run', ...ev }, 'live');
    d({ type: 'run.start', idea: "An ordering website for my friend's small bakery", stagePath: true });
    d({ type: 'sketch.user', id: 'u1', label: 'Morning regulars' });
    d({ type: 'sketch.user', id: 'u2', label: 'Weekend pastry crowd' });
    d({ type: 'sketch.done', seat: 'design', ms: 10 });
  });
  await p.waitForTimeout(500);
  assert.deepStrictEqual(posts.filter(x => x[0] === 'first'), [['first', {}]], 'the room asks for Focus 1 once the sketch is down');
  // Focus 1: Wren's finding, quoted with its source.
  await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'first', first: true, seat: 'research', by: 'Wren',
    question: 'Who should we build this for first?', users: ['Morning regulars', 'Weekend pastry crowd'], decisionIds: [],
    artifact: { kind: 'finding', ref: { title: 'A third of artisan-bakery visitors buy bread there every week', quote: 'A third (33%) of UK adults who visit artisan bakeries now buy bread there at least once a week',
      url: 'https://example.org/report', site: 'Bakery Business', fetched: '2026-11-14', label: 'researched before the demo', users: ['Morning regulars', 'Weekend pastry crowd'] } } }, 'live'));
  assert.strictEqual(await p.evaluate(() => BYOC.beat), 4, 'Focus 1 waits in her inbox where she is');
  await waitFor(() => document.querySelector('#inbox .inbox-now')?.dataset.ask === 'first', 4000, 'in her inbox', null, p);
  await p.keyboard.press('PageDown');
  await waitFor(() => BYOC.focusDoc.isOpen() && BYOC.focusDoc.openId() === 'first', 3000, 'open', null, p);
  assert.strictEqual(await p.getAttribute('#focus-doc', 'data-doc'), 'finding');
  assert.strictEqual(await p.textContent('#focus-doc .ff .ff-prepared'), 'researched before the demo');
  assert.match(await p.textContent('#focus-doc .ff .ff-claim'), /A third \(33%\) of UK adults/);
  assert.strictEqual(await p.getAttribute('#focus-doc .ff a.ff-src', 'href'), 'https://example.org/report');
  assert.match(await p.textContent('#focus-doc .ff .ff-src-site'), /Bakery Business · read 2026-11-14/);
  await p.locator('#focus-doc .fd-input').fill("It's really for the regulars.");
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  assert.deepStrictEqual(posts.find(x => x[0] === 'round'), ['round', { askId: 'first', text: "It's really for the regulars." }], 'Focus 1 is a meeting: Send is one round');
  await p.evaluate(() => {
    const d = ev => BYOC.dispatch({ run: 'stub-run', ...ev }, 'live');
    d({ type: 'answer', askId: 'first', text: "It's really for the regulars." });
    d({ type: 'reshape', askId: 'first', text: "It's really for the regulars." });
    d({ type: 'flow.reset', by: 'design', reason: 'reshape' });
    d({ type: 'sketch.user', id: 'u1', label: 'Morning regulars' });
    d({ type: 'sketch.user', id: 'u2', label: 'The bakers' });
    d({ type: 'sketch.done', seat: 'design', ms: 10, reshape: true });
    d({ type: 'decided', id: 'first-d1', seat: 'design', by: 'Mika', decision: 'Home', choice: 'Their usual loaf one tap away', cites: 'her answer', follows: 'first', round: 'first' });
    d({ type: 'decided', id: 'first-d2', seat: 'engineering', by: 'Bo', decision: 'Holds', choice: 'Held until 10am', cites: 'her answer', follows: 'first', round: 'first' });
    d({ type: 'first.done', askId: 'first', decided: 2, reshaped: true });
    d({ type: 'takeaways', askId: 'first', believe: 'Regulars first.', guidance: 'Their usual loaf one tap away.' });
  });
  await waitFor(() => !document.querySelector('#focus-doc .fd-brief').hidden, 4000, 'her takeaways', null, p);
  // The cascade waits for her: nothing settles while her document covers the room.
  assert.strictEqual(await p.locator('.team-space .ts-card[data-kind="first"][data-state="closed"]').count(), 0, 'no cascade behind her document');
  await p.keyboard.press('Escape');
  await waitFor(() => !BYOC.focusDoc.isOpen(), 3000, 'back in the room', null, p);
  assert.strictEqual(await p.textContent('.fs-bar .fs-user[data-state="main"]'), 'Morning regulars');
  assert.deepStrictEqual(await p.locator('.fs-bar .fs-user[data-state="later"]').allTextContents(), ['Weekend pastry crowd']);
  await waitFor(() => document.querySelectorAll('.team-space .ts-card[data-kind="first"][data-state="closed"]').length === 2, 5000, 'settled in the team space', null, p);
  assert.match(await p.textContent('.team-space .ts-card[data-joint="fd-first-d2"] .ts-headline'), /Held until 10am/);
  assert.strictEqual(await p.getAttribute('.team-space .ts-card[data-joint="fd-first-d2"] .ts-mark', 'data-seat'), 'engineering');
  // Folded into a small "Team notes · N" tab (Vincent, 15 Nov); a click opens the cards and closes them again.
  const notes = p.locator('.team-space [data-component="team-notes"]');
  assert.match((await notes.innerText()).trim(), /^Team notes · \d+$/);
  assert.strictEqual(await notes.getAttribute('data-state'), 'closed');
  assert.ok(await p.locator('.team-space .ts-cards').isHidden(), 'folded: the cards wait behind the tab');
  await notes.click();
  assert.strictEqual(await notes.getAttribute('data-state'), 'open');
  assert.ok(await p.locator('.team-space .ts-card[data-joint="fd-first-d2"]').isVisible(), 'open: the cards');
  await notes.click();
  assert.strictEqual(await notes.getAttribute('data-state'), 'closed');
  assert.strictEqual(await p.locator('.mini-sheet li[data-state="decided"]').count(), 2, 'and on their sketchpads');
  // Focus 2: Mika's rough morning journey in words; her answer; Mika rewrites the step it changes.
  const steps = [{ step: 1, time: '7:05', text: 'Sam leaves for work' }, { step: 2, time: '7:10', text: 'Sam reserves the usual on the bus' }, { step: 3, time: '7:40', text: 'Sam picks it up, still warm' }];
  await p.evaluate(st => BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'feel', feel: true, seat: 'design', by: 'Mika', question: 'What should this feel like for a regular?',
    artifact: { kind: 'journey-words', ref: 'feel' }, steps: st, decisionIds: [] }, 'live'), steps);
  await waitFor(() => document.querySelector('#inbox .inbox-now')?.dataset.ask === 'feel', 4000, 'Focus 2 in her inbox', null, p);
  await p.keyboard.press('PageDown');
  await waitFor(() => BYOC.focusDoc.isOpen() && BYOC.focusDoc.openId() === 'feel', 3000, 'Focus 2 open', null, p);
  assert.strictEqual(await p.getAttribute('#focus-doc', 'data-doc'), 'journey-words');
  assert.deepStrictEqual(await p.locator('#focus-doc .jw .jw-step').evaluateAll(ls => ls.map(l => l.dataset.state)), ['draft', 'draft', 'draft']);
  assert.match(await p.textContent('#focus-doc .jw-step[data-step="2"]'), /7:10[\s\S]*reserves the usual/);
  await p.evaluate(st => BYOC.dispatch({ run: 'stub-run', type: 'journey.words.rewritten', id: 'feel', steps: st.map(x => x.step === 2 ? { ...x, new: 'Sam does nothing: the usual is already held' } : x) }, 'live'), steps);
  await waitFor(() => document.querySelector('#focus-doc .jw-step[data-step="2"]')?.dataset.state === 'rewritten', 3000, 'Mika rewrote it', null, p);
  assert.strictEqual(await p.textContent('#focus-doc .jw-step[data-step="2"] s'), 'Sam reserves the usual on the bus');
  assert.strictEqual(await p.textContent('#focus-doc .jw-step[data-step="2"] .jw-new'), 'Sam does nothing: the usual is already held');
  assert.strictEqual(await p.evaluate(() => BYOC.beat), 4, 'the beat never moved');
  assert.deepStrictEqual(perrs, []);
  await p.close();
});

test('2. the live path in stage mode (the bakery), driven like a clicker, as far as her document', async () => {
  // From her empty paper name tag, the clicker moves on without a line (her file keeps both prepared lines).
  await page.keyboard.press('PageDown');
  await waitFor(() => !!document.querySelector('.meet-card'), 3000, 'meet the team');
  await page.keyboard.press('PageDown'); // the next teammate
  await waitFor(() => document.querySelectorAll('.seat .card').length === 6 && document.activeElement?.id === 'her-input', 20000, 'the reveal, then her idea');
  assert.strictEqual(await page.evaluate(() => BYOC.intro), null);
  // The bakery script (VISION, Sat): her one rough sentence; Design and Research draw the first journey.
  await page.keyboard.type(BAKERY);
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.run && !BYOC.run.startsWith('local-'), 5000, 'a run id');
  RUN = await page.evaluate(() => BYOC.run);
  await waitFor(() => BYOC.events().some(e => e.type === 'sketch.done'), 30000, 'the first sketch');
  await waitFor(() => document.querySelectorAll('#her-flow .fl-box').length >= 2, 5000, 'the journey on her sheet');
  // 1. Focus 1 (DEMO 0:38): Wren asks who to build this for first, with the finding researched before the demo.
  await waitFor(() => BYOC.events().some(e => e.type === 'ask' && e.first), 8000, 'Focus 1 asked');
  await waitFor(() => document.querySelector('#inbox .inbox-now')?.dataset.ask === 'first', 6000, 'Focus 1 in her inbox');
  assert.strictEqual((await page.textContent('#inbox .inbox-now')).trim(), 'Wren has a question →');
  await page.keyboard.press('PageDown'); // the clicker opens it
  await waitFor(() => BYOC.focusDoc.isOpen() && BYOC.focusDoc.openId() === 'first', 3000, 'Focus 1 open');
  assert.strictEqual(await page.getAttribute('#focus-doc', 'data-doc'), 'finding');
  assert.match(await page.textContent('#focus-doc .ff-claim'), /A third \(33%\) of UK adults who visit artisan bakeries/);
  assert.match(await page.getAttribute('#focus-doc a.ff-src', 'href'), /^https:\/\/bakerybusiness\.com\//);
  { const pr = await pronouns(page); if (pr.length) console.log('pronouns in her document:', JSON.stringify(await page.evaluate(() => [...document.body.innerText.matchAll(/.{0,50}\b(he|she|his|him|her|hers)\b.{0,30}/gi)].map(m => m[0])))); assert.deepStrictEqual(pr, [], 'no pronouns in her document'); }
  // Readable at both sizes: the question >= 18 px at 1280x720 and >= 22 px at 1600x900, rendered.
  for (const [w, hgt, floor] of [[1280, 720, 18], [1600, 900, 22]]) {
    await page.setViewportSize({ width: w, height: hgt }); await page.waitForTimeout(300);
    const px = await page.evaluate(() => { const q = document.querySelector('#focus-doc .fd-question'); return +(parseFloat(getComputedStyle(q).fontSize) * q.getBoundingClientRect().height / q.offsetHeight).toFixed(1); });
    console.log(`her document at ${w}x${hgt}: question ${px} px`);
    assert.ok(px >= floor, `question >= ${floor} px at ${w}x${hgt}, got ${px}`);
    assert.ok(await onScreen('#focus-doc'), `the document fits the screen at ${w}x${hgt}`);
  }
  await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(200);
  await page.locator('#focus-doc .fd-input').fill("It's really for the regulars. They come every morning and hate it when the sourdough's gone by nine.");
  await page.keyboard.press('Enter');
  // One round of discussion: the team replies live, no takeaways yet; then she ends the meeting.
  await waitFor(() => BYOC.events().some(e => e.type === 'round.done' && e.askId === 'first'), 40000, 'Focus 1, round 1');
  const replies1 = await page.evaluate(() => BYOC.events().filter(e => e.type === 'chime' && e.askId === 'first').length);
  console.log('Focus 1 round 1 replies:', replies1, '| first reply ms:', await page.evaluate(() => BYOC.events().find(e => e.type === 'chime' && e.askId === 'first')?.ms));
  assert.ok(replies1 >= 1, 'the team replied');
  assert.ok(await page.locator('#focus-doc .fd-brief').isHidden(), 'no takeaways before End meeting');
  await page.click('#focus-doc .fd-end');
  // The takeaways over her rounds, and alongside it the journey redraws and a run of decisions settles.
  await waitFor(() => BYOC.events().some(e => e.type === 'first.done'), 40000, 'Focus 1 followed');
  await waitFor(() => !document.querySelector('#focus-doc .fd-brief').hidden, 40000, 'her takeaways');
  const first = await page.evaluate(() => BYOC.events().filter(e => e.type === 'decided' && e.round === 'first'));
  console.log('first decision:', first.map(d => `${d.by}: ${d.choice}`).join(' | '));
  assert.ok(first.length >= 3, `a run of decisions, got ${first.length}`);
  assert.ok(first.every(d => d.cites === 'her answer' && d.follows === 'first' && d.by), 'each cites her answer, with its teammate');
  assert.ok(!first.some(d => /\bphone\b/i.test(d.choice) && !/\bno\b/i.test(d.choice)), 'no phone field brought back');
  assert.ok(await page.evaluate(() => BYOC.events().some(e => e.type === 'reshape' && e.askId === 'first')), 'Design redrew the journey from her answer');
  await page.keyboard.press('Escape');
  await waitFor(() => !BYOC.focusDoc.isOpen(), 3000, 'back in the room');
  await waitFor(n => document.querySelectorAll('.team-space .ts-card[data-kind="first"][data-state="closed"]').length >= n, 8000, 'the cascade settled in the team space', first.length);
  // 2. A quick unblock (builder 1's card): Bo's blocked on when orders close; the clicker opens it, Enter says Yes.
  await waitFor(() => /^u-engineering/.test(document.querySelector('#inbox .inbox-now')?.dataset.ask || ''), 12000, 'the unblock in her inbox');
  await page.keyboard.press('PageDown');
  await waitFor(() => document.activeElement?.classList.contains('ia-yes'), 3000, 'Yes, ready');
  assert.match(await page.textContent('#inbox .inbox-action'), /when do orders close\?[\s\S]*8pm the night before/i);
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.events().some(e => e.type === 'decided' && e.unblock && e.choice === '8pm the night before'), 5000, 'her yes, decided');
  // 3. Focus 2 (DEMO 1:08): Mika's rough morning journey in words; she says what it should feel like; Mika rewrites.
  await waitFor(() => document.querySelector('#inbox .inbox-now')?.dataset.ask === 'feel', 30000, 'Focus 2 in her inbox');
  await page.keyboard.press('PageDown');
  await waitFor(() => BYOC.focusDoc.isOpen() && BYOC.focusDoc.openId() === 'feel', 3000, 'Focus 2 open');
  assert.strictEqual(await page.getAttribute('#focus-doc', 'data-doc'), 'journey-words');
  const n = await page.locator('#focus-doc .jw-step').count();
  console.log('Mika\'s morning:', (await page.locator('#focus-doc .jw-step').allTextContents()).join(' | '));
  assert.ok(n >= 3 && n <= 6, `3 to 6 steps, got ${n}`);
  assert.strictEqual(await page.locator('#focus-doc .fd-wires, #focus-doc .sk-frame').count(), 0, 'no screens');
  assert.deepStrictEqual(await pronouns(page), [], 'no pronouns in Mika\'s morning');
  await page.locator('#focus-doc .fd-input').fill("Like the baker already knows you. Don't ask for anything you already know.");
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.events().some(e => e.type === 'round.done' && e.askId === 'feel'), 40000, 'Focus 2, round 1');
  assert.ok(await page.locator('#focus-doc .fd-brief').isHidden(), 'no takeaways before End meeting');
  await page.click('#focus-doc .fd-end');
  await waitFor(() => BYOC.events().some(e => e.type === 'journey.words.rewritten'), 40000, 'Mika rewrote the steps');
  await waitFor(() => !document.querySelector('#focus-doc .fd-brief').hidden, 40000, 'her takeaways');
  assert.ok((await page.textContent('#focus-doc .brief-believe .brief-text')).trim().length > 0, 'what I believe');
  assert.strictEqual(await page.getAttribute('#focus-doc', 'data-state'), 'takeaways');
  await page.keyboard.press('Escape');
  await waitFor(() => !BYOC.focusDoc.isOpen(), 3000, 'back in the room');
  assert.ok(await page.isVisible('.seat-design .card'), 'the room is back');
  assert.deepStrictEqual(await pronouns(page), [], 'no pronouns in the room');
  // The team goes; on the stage path the selector brings nothing more: the three were Focus 1, the unblock, Focus 2.
  await page.locator('#her-input').focus();
  await page.keyboard.press('PageDown');
  await waitFor(() => BYOC.beat >= 5, 2000, 'the team works beat');
  await waitFor(() => BYOC.events().some(e => e.type === 'select.done' || e.type === 'propose.error'), 110000, 'the team and the selector');
  const evs = await page.evaluate(() => BYOC.events());
  assert.ok(!evs.some(e => e.type === 'propose.error'), 'propose ran');
  assert.deepStrictEqual(evs.filter(e => e.type === 'ask').map(e => e.first ? 'first' : e.unblock ? 'unblock' : e.feel ? 'feel' : 'other'), ['first', 'unblock', 'feel'], 'the stage path\'s moments, in order, and nothing else');
  assert.deepStrictEqual(errors, []);
});

test('2b. her document: words land, the team chimes in one after another, the takeaways, kept', async () => {
  // The server's answer and brief routes (builder 6) are stubbed here; the events are the contract's shapes.
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  const posted = [];
  await p.route('**/api/run/*/answer', async r => { posted.push(['answer', JSON.parse(r.request().postData())]); await r.fulfill({ status: 200, body: '{"ok":true}' }); });
  await p.route('**/api/run/*/takeaways', async r => { posted.push(['takeaways', JSON.parse(r.request().postData())]); await r.fulfill({ status: 200, body: '{"id":"L3"}' }); });
  await p.goto(L(BASE + '/?stage=1&meeting=0')); // the old single-Send flow, kept as the rehearsal's fallback
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run';
    BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'q1', seat: 'research', by: 'Wren', question: 'What makes someone come back to a studio week after week?',
      artifact: { kind: 'finding', ref: { title: 'Small studios fill their popular classes', text: 'Regulars book the same slot each week.', url: 'https://example.org/finding' } } }, 'replay');
  });
  await waitFor(() => !document.getElementById('inbox').hidden && document.getElementById('inbox').dataset.needs === 'yes', 4000, 'the note', null, p);
  assert.strictEqual((await p.locator('#inbox .inbox-now').innerText()).trim(), 'Wren has a question →', 'only who: no preview in the room');
  // The room's chatter: the team talking about its work, under the speaker's card, never addressed to her.
  await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'chatter', by: 'Wren', seat: 'research', text: 'Found a source on full classes.' }, 'replay'));
  assert.match((await p.locator('.chatter-line[data-seat="research"]').innerText()).replace(/\s+/g, ' ').trim(), /^Wren: Found a source on full classes\.$/i);
  await p.locator('#inbox .inbox-now').click();
  await waitFor(() => BYOC.focusDoc.isOpen(), 2000, 'the document', null, p);
  assert.strictEqual(await p.textContent('#focus-doc [data-slot="help"]'), 'Add this keeps a thought · Send when you’re ready, and the team replies', 'the old flow keeps two clauses');
  assert.ok(!(await p.isVisible('.chatter-line')), 'the room and its chatter are gone from view');
  assert.match(await p.textContent('#focus-doc .fd-kicker'), /Wren · Research/);
  assert.match(await p.textContent('#focus-doc .fd-work'), /Small studios fill their popular classes/);
  const said = 'Knowing their spot is theirs. My regulars do the same Tuesday class every week and hate hunting for it.';
  await p.locator('#focus-doc .fd-input').fill(said);
  await p.keyboard.press('Enter');
  await waitFor(() => !!document.querySelector('#focus-doc .fd-words'), 2000, 'her words on the document', null, p);
  // The stubbed route records the POST asynchronously (after her words land), so wait for it rather than race it.
  for (const t = Date.now(); !posted.length && Date.now() - t < 3000;) await p.waitForTimeout(50);
  assert.deepStrictEqual(posted[0], ['answer', { askId: 'q1', text: said }]);
  // Two chime-ins and the brief arrive together; they land one after another, about a second apart, then the brief.
  const t0 = Date.now();
  await p.evaluate(() => {
    BYOC.dispatch({ run: 'stub-run', type: 'chime', askId: 'q1', by: 'Wren', seat: 'research', text: 'That matches what small studios report.' }, 'replay');
    BYOC.dispatch({ run: 'stub-run', type: 'chime', askId: 'q1', by: 'Mika', seat: 'design', text: 'Then their usual class goes first, one tap.' }, 'replay');
    BYOC.dispatch({ run: 'stub-run', type: 'takeaways', askId: 'q1', believe: 'Regulars should never have to hunt for their class.', guidance: 'Put their usual class first, one tap to book.' }, 'replay');
  });
  await waitFor(() => document.querySelectorAll('#focus-doc .chime').length === 1, 1000, 'the first chime', null, p);
  assert.strictEqual(await p.locator('#focus-doc .chime').count(), 1, 'one at a time');
  assert.ok(await p.locator('#focus-doc .fd-brief').isHidden(), 'the takeaways wait for the chimes');
  await waitFor(() => document.querySelectorAll('#focus-doc .chime').length === 2, 2500, 'the second chime', null, p);
  assert.ok(Date.now() - t0 >= 800, 'about a second apart');
  assert.match(await p.locator('#focus-doc .chime').first().innerText(), /Wren · Research[\s\S]*small studios report/i);
  await waitFor(() => !document.querySelector('#focus-doc .fd-brief').hidden, 2500, 'the takeaways', null, p);
  assert.match(await p.textContent('#focus-doc .brief-believe .brief-text'), /never have to hunt/);
  assert.ok(await p.locator('#focus-doc .brief-why').isHidden(), 'two parts: what I believe, guidance to the team');
  // She rewords "what I believe" and keeps it; Enter sends the brief.
  await p.locator('#focus-doc .brief-believe .brief-text').click();
  await p.keyboard.press('End'); await p.keyboard.type(' Ever.'); await p.keyboard.press('Enter');
  await waitFor(() => true, 300, '', null, p);
  const brief = posted.find(x => x[0] === 'takeaways');
  assert.ok(brief, 'the takeaways were kept');
  assert.deepStrictEqual(Object.keys(brief[1]).sort(), ['askId', 'believe', 'guidance']);
  assert.strictEqual(brief[1].askId, 'q1');
  assert.match(brief[1].believe, /never have to hunt for their class\. Ever\.$/);
  // Her philosophy is the team's to keep (hidden): no stance slot on her card, nothing added to the file card.
  await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'taste.written', id: 'L3', text: 'Regulars should never have to hunt for their class. Ever.', hidden: true }, 'replay'));
  await p.keyboard.press('Escape');
  await waitFor(() => !BYOC.focusDoc.isOpen(), 2000, 'back in the room', null, p);
  assert.strictEqual(await p.locator('#her-stance').count(), 0, 'no stance slot');
  assert.strictEqual(await p.locator('#file-lines li[data-id="L3"]').count(), 0, 'the hidden line stays off the card');
  // Straight into the next note: its chimes still land (a quick close mid-thread must not stall the next document).
  await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'q2', seat: 'design', by: 'Mika', question: 'If booking could feel like one thing, what should it feel like?', artifact: { kind: 'journey' } }, 'replay'));
  await p.evaluate(() => { BYOC.openNote('q2'); BYOC.dispatch({ run: 'stub-run', type: 'chime', askId: 'q2', by: 'Mika', seat: 'design', text: 'One.' }, 'replay'); BYOC.dispatch({ run: 'stub-run', type: 'chime', askId: 'q2', by: 'Bo', seat: 'engineering', text: 'Two.' }, 'replay'); });
  await p.waitForTimeout(150);
  await p.evaluate(() => { BYOC.focusDoc.close(true); BYOC.openNote('q2'); BYOC.dispatch({ run: 'stub-run', type: 'chime', askId: 'q2', by: 'Mika', seat: 'design', text: 'Again.' }, 'replay'); });
  await waitFor(() => document.querySelectorAll('#focus-doc .chime').length >= 1, 2500, 'a chime after a quick reopen', null, p);
  await p.evaluate(() => BYOC.focusDoc.close(true));
  assert.deepStrictEqual(perrs, []);
  await p.close();
});

test('2c. a meeting (stubbed): a long answer, two rounds, then End meeting; the column folds, follows and lands on the takeaways', async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  const posted = [];
  await p.route('**/api/run/stub-run/**', async r => { if (r.request().method() === 'POST') posted.push([new URL(r.request().url()).pathname.split('/').pop(), JSON.parse(r.request().postData() || '{}')]); await r.fulfill({ status: 202, json: { ok: true } }); });   // her POSTs only (a look's counters may GET the tally)
  await p.goto(L(BASE + '/?stage=1'));
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run';
    BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'q1', seat: 'design', by: 'Mika', question: 'What should ordering feel like for a regular?', artifact: { kind: 'journey' } }, 'live');
    BYOC.openNote('q1');
  });
  await waitFor(() => BYOC.focusDoc.isOpen(), 2000, 'her document', null, p);
  const side = '#focus-doc [data-slot="side"]';
  assert.strictEqual(await p.getAttribute(side, 'data-state'), 'composing');
  assert.strictEqual(await p.locator(`${side} .fd-input, ${side} .fd-conversation, ${side} .fd-brief, ${side} .fd-end`).count(), 4, 'one column holds the form, the conversation, the takeaways and End meeting');
  assert.ok(await p.locator('#focus-doc .fd-end').isHidden(), 'no End meeting before a round');
  const wide = await p.evaluate(s => [document.querySelector(s + ' .fd-input').getBoundingClientRect().width, document.querySelector(s).clientWidth], side);
  assert.ok(wide[0] >= wide[1] * 0.85, `her words get most of the column (at least 85%; both looks) (${wide[0]} of ${wide[1]} px)`);
  assert.strictEqual(await p.textContent('#focus-doc [data-slot="help"]'), 'Add this keeps a thought · Send when you’re ready, and the team replies · End meeting for the takeaways');
  // Round 1: a long answer (~300 words).
  const long = Array.from({ length: 30 }, (_, i) => `Regulars come in every morning, ${i + 1} of them know the sourdough sells out by nine.`).join(' ');
  await p.locator('#focus-doc .fd-input').fill(long);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  assert.deepStrictEqual(posted[0][0], 'round');
  assert.strictEqual(await p.getAttribute(side, 'data-state'), 'discussing');
  assert.match(await p.textContent('#focus-doc .fd-team'), /reading what you said/, 'the team is reading, at once');
  const reply = (n, by, seat, text) => p.evaluate(a => BYOC.dispatch({ run: 'stub-run', type: 'chime', askId: 'q1', ...a }, 'live'), { by, seat, text, round: n });
  await reply(1, 'Mika', 'design', 'Then their usual loaf goes first, one tap.');
  await reply(1, 'Bo', 'engineering', 'And we hold it till ten, so nine is never a race.');
  await waitFor(() => document.querySelectorAll('#focus-doc .fd-conversation [data-turn="team"]').length === 2, 4000, 'two replies, live', null, p);
  assert.ok(await p.locator('#focus-doc .fd-conversation').isVisible(), 'replies visible while discussing (no "Read the conversation")');
  assert.strictEqual(await p.locator('#focus-doc .fd-read').count(), 0);
  await waitFor(s => { const c = document.querySelector(s); return c.scrollHeight - c.scrollTop - c.clientHeight < 60; }, 3000, 'the column glides to the newest reply', side, p); // a smooth glide (focus-doc.js), so wait for it
  assert.ok(await p.locator('#focus-doc .fd-brief').isHidden(), 'no takeaways after a round');
  await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'round.done', askId: 'q1', round: 1, replies: 2 }, 'live'));
  assert.ok(await p.locator('#focus-doc .fd-end').isVisible(), 'End meeting, once a round has happened');
  // Round 2: as she types, the conversation folds away ("Earlier: 1 round · show").
  await p.locator('#focus-doc .fd-input').fill('And never ask for anything we already know.');
  assert.strictEqual(await p.getAttribute(side, 'data-state'), 'composing');
  assert.ok(await p.locator('#focus-doc .fd-conversation').isHidden(), 'collapsed while composing');
  assert.match(await p.textContent('#focus-doc .fd-earlier'), /Earlier: 1 round · show/);
  await p.click('#focus-doc .fd-earlier');
  assert.ok(await p.locator('#focus-doc .fd-conversation').isVisible(), 'she can open it');
  await p.click('#focus-doc .fd-earlier');
  await p.locator('#focus-doc .fd-input').focus();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  assert.deepStrictEqual(posted.filter(x => x[0] === 'round').length, 2);
  assert.strictEqual(await p.getAttribute(side, 'data-state'), 'discussing');
  assert.strictEqual(await p.locator('#focus-doc .fd-round-sep[data-round="2"]').count(), 1, 'a round separator');
  await reply(2, 'Mika', 'design', 'Then the form asks for nothing it already has.');
  await waitFor(() => document.querySelectorAll('#focus-doc .fd-conversation [data-turn="team"]').length === 3, 4000, 'round 2 reply', null, p);
  // She scrolls up to reread: a new reply doesn't yank her down; the pill offers it.
  assert.ok(await p.evaluate(s => { const c = document.querySelector(s); return c.scrollHeight > c.clientHeight + 100; }, side), 'the long answer makes the column scroll');
  await p.evaluate(s => { const c = document.querySelector(s); c.scrollTop = 0; c.dispatchEvent(new Event('scroll')); }, side);
  assert.ok(await p.locator('#focus-doc [data-slot="new-replies"]').isHidden(), 'no pill before a new reply');
  await reply(2, 'Bo', 'engineering', 'We can prefill it from their last order.');
  await waitFor(() => document.querySelectorAll('#focus-doc .fd-conversation [data-turn="team"]').length === 4, 4000, 'another round 2 reply', null, p);
  assert.ok(await p.locator('#focus-doc [data-slot="new-replies"]').isVisible(), '"New replies ↓" while she has scrolled up');
  assert.ok(await p.evaluate(s => document.querySelector(s).scrollTop < 50, side), 'her place is kept');
  await p.click('#focus-doc [data-slot="new-replies"]');
  await waitFor(s => { const c = document.querySelector(s); return c.scrollHeight - c.scrollTop - c.clientHeight < 60; }, 2000, 'the pill glides her to the newest reply', side, p);
  assert.ok(await p.locator('#focus-doc [data-slot="new-replies"]').isHidden(), 'and goes away');
  assert.ok(await p.locator('#focus-doc .fd-brief').isHidden(), 'still no takeaways');
  // Leaving mid-meeting asks her plainly.
  await p.keyboard.press('Escape'); // (a second Esc means "come back later")
  await waitFor(() => !document.querySelector('#focus-doc .fd-leave').hidden, 2000, 'end now or later?', null, p);
  assert.ok(await p.evaluate(() => BYOC.focusDoc.isOpen()), 'still open: she chooses');
  // End meeting: the takeaways over both rounds, at the bottom, the column scrolled to them.
  await p.click('#focus-doc .fd-leave-end');
  await p.waitForTimeout(200);
  assert.deepStrictEqual(posted.find(x => x[0] === 'end'), ['end', { askId: 'q1' }]);
  await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'takeaways', askId: 'q1', believe: 'I believe ordering should feel like being known.', guidance: 'Their usual loaf first; ask for nothing we know.' }, 'live'));
  await waitFor(() => !document.querySelector('#focus-doc .fd-brief').hidden, 4000, 'the takeaways', null, p);
  assert.strictEqual(await p.getAttribute(side, 'data-state'), 'ended');
  assert.ok(await p.locator('#focus-doc .fd-form').isHidden(), 'no more rounds');
  assert.ok(await p.locator('#focus-doc .fd-conversation').isVisible(), 'everything said stays above');
  await p.waitForTimeout(300);
  await waitFor(s => { const c = document.querySelector(s), b = c.querySelector('.fd-brief'); const cr = c.getBoundingClientRect(), br = b.getBoundingClientRect(); return br.top >= cr.top - 2 && br.top < cr.bottom; }, 3000, 'the column glides to the takeaways', side, p);
  const order = await p.evaluate(s => [...document.querySelector(s).children].filter(e => !e.hidden).map(e => e.className.split(' ')[0]), side);
  assert.ok(order.indexOf('fd-chimes') < order.indexOf('fd-brief'), `the takeaways come after the conversation: ${order}`);
  assert.deepStrictEqual(perrs, []);
  await p.close();
});

test('2d. never stuck in a meeting (stubbed): one primary (Send), End meeting secondary; Send while the team is still replying gives her words back', async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  let busy = false;
  await p.route('**/api/run/stub-run/**', async r => {
    if (busy && /\/round$/.test(new URL(r.request().url()).pathname)) return r.fulfill({ status: 409, json: { error: 'the team is still replying' } });
    await r.fulfill({ status: 202, json: { ok: true } });
  });
  await p.goto(L(BASE + '/?stage=1'));
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run';
    BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'q1', seat: 'design', by: 'Mika', question: 'What should ordering feel like?', artifact: { kind: 'journey' } }, 'live');
    BYOC.openNote('q1');
  });
  await waitFor(() => BYOC.focusDoc.isOpen(), 2000, 'her document', null, p);
  assert.strictEqual(await p.getAttribute('#focus-doc .fd-send', 'data-rank'), 'primary', 'Send is the one primary action');
  assert.strictEqual(await p.getAttribute('#focus-doc .fd-end', 'data-rank'), 'secondary');
  await p.locator('#focus-doc .fd-input').fill('Their usual, one tap.');
  await p.keyboard.press('Enter');
  await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'chime', askId: 'q1', by: 'Mika', seat: 'design', text: 'One tap it is.', round: 1 }, 'live'));
  await waitFor(() => document.querySelectorAll('#focus-doc [data-turn="team"]').length === 1, 3000, 'a reply', null, p);
  // A second Send before the round is done: the server says the team is still replying. Nothing is lost.
  busy = true;
  await p.locator('#focus-doc .fd-input').fill('And never ask twice.');
  await p.locator('#focus-doc .fd-input').focus();
  await p.keyboard.press('Enter');
  await waitFor(() => document.querySelector('#focus-doc .fd-input').value === 'And never ask twice.', 3000, 'her words back in the box', null, p);
  assert.match(await p.textContent('#focus-doc .fd-team'), /still replying/);
  assert.strictEqual(await p.locator('#focus-doc [data-turn="her"]').count(), 1, 'the unsent turn is taken back off the conversation');
  assert.strictEqual(await p.locator('#focus-doc .fd-round-sep').count(), 0);
  assert.strictEqual(await p.getAttribute('#focus-doc [data-slot="side"]', 'data-state'), 'composing');
  // Once the round is done, the same words go.
  busy = false;
  await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'round.done', askId: 'q1', round: 1, replies: 1 }, 'live'));
  await p.locator('#focus-doc .fd-input').focus();
  await p.keyboard.press('Enter');
  await waitFor(() => document.querySelectorAll('#focus-doc [data-turn="her"]').length === 2, 3000, 'round 2 sent', null, p);
  assert.deepStrictEqual(perrs, []);
  await p.close();
});

test('2e. the build press (stubbed, audit F1): painted, one forward from the working room starts the build and the pill says so; plain steps on as before', async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  const built = [];
  await p.route('**/api/run/stub-run/**', async r => { const u = new URL(r.request().url()).pathname; if (/\/build$/.test(u)) built.push(u); await r.fulfill({ status: 202, json: { ok: true } }); });
  await p.route('**/api/sketch*', r => r.fulfill({ status: 202, json: { ok: true } }));
  await p.goto(L(BASE + '/?stage=1'));
  await p.waitForTimeout(300);
  await p.evaluate(() => { BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run'; });
  await p.waitForTimeout(200);
  const painted = /look=painted/.test(await p.evaluate(() => location.search));
  if (painted) assert.match(await p.textContent('.app-hint'), /Press → and Bo builds the page/, 'the pill tells the presenter what → does');
  await p.keyboard.press('PageDown');
  await p.waitForTimeout(400);
  if (painted) {
    assert.strictEqual(await p.evaluate(() => BYOC.beat), 8, 'one press: the build beat');
    assert.strictEqual(built.length, 1, 'the build started');
  } else {
    assert.strictEqual(await p.evaluate(() => BYOC.beat), 6, 'plain: the big sheet, as before');
    assert.strictEqual(built.length, 0);
  }
  assert.deepStrictEqual(perrs, []);
  await p.close();
});

test('2f. Wren\'s live finding (stubbed): verified -> "found just now with Linkup" on Focus 1; none or a timeout -> the prepared one; never swapped under her', async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  await p.route('**/api/run/stub-run/**', r => r.fulfill({ status: 202, json: { ok: true } }));
  await p.goto(L(BASE + '/?stage=1'));
  await p.waitForTimeout(300);
  const PREP = { title: 'A third of artisan-bakery visitors buy bread there every week', quote: 'A third (33%) of UK adults who visit artisan bakeries now buy bread there at least once a week', url: 'https://bakerybusiness.com/r', site: 'Bakery Business', fetched: '2026-11-10', label: 'researched before the demo' };
  const LIVE = { title: 'UK artisan bakery shoppers', quote: 'Among 18 to 24-year-olds who shop at artisan bakeries, 45% do so at least weekly.', url: 'https://www.bakingeurope.com/news/x', site: 'bakingeurope.com', fetched: '2026-11-15', label: 'found just now with Linkup' };
  const open = async () => { await p.evaluate(() => BYOC.openNote('first')); await waitFor(() => BYOC.focusDoc.isOpen(), 2000, 'Focus 1', null, p); };
  const card = () => p.evaluate(() => ({ label: document.querySelector('#focus-doc [data-slot="prepared"]')?.textContent, quote: document.querySelector('#focus-doc [data-slot="claim"]')?.textContent, site: document.querySelector('#focus-doc [data-slot="source-site"]')?.textContent }));
  const raise = () => p.evaluate(ref => { BYOC.reset(); BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run';
    BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'first', first: true, seat: 'research', by: 'Wren', question: 'Who should we build this for first?', artifact: { kind: 'finding', ref: { ...ref, users: ['Morning regulars'] } } }, 'live'); }, PREP);
  // verified, while Focus 1 waits: the live finding takes the prepared one's place, labelled truthfully, with its source
  await raise();
  await p.evaluate(ref => BYOC.dispatch({ run: 'stub-run', type: 'finding.live', askId: 'first', ref }, 'live'), LIVE);
  await open();
  let c = await card();
  assert.strictEqual(c.label, 'found just now with Linkup');
  assert.strictEqual(c.quote, LIVE.quote);
  assert.match(c.site, /bakingeurope\.com · read 2026-11-15/);
  await p.evaluate(() => BYOC.focusDoc.close(true));
  // nothing verified (finding.none) or the search timed out (no event at all): the prepared finding, as before
  await raise();
  await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'finding.none', why: 'timeout' }, 'live'));
  await open();
  c = await card();
  assert.strictEqual(c.label, 'researched before the demo');
  assert.strictEqual(c.quote, PREP.quote);
  // verified only after she opened it: never swapped under her
  await p.evaluate(ref => BYOC.dispatch({ run: 'stub-run', type: 'finding.live', askId: 'first', ref }, 'live'), LIVE);
  await p.waitForTimeout(200);
  assert.strictEqual((await card()).quote, PREP.quote, 'what she is reading stays');
  assert.deepStrictEqual(perrs, []);
  await p.close();
});

test('3. the judge’s-idea close is unhooked (Vincent, 15 Nov): J opens nothing, the beats end at her page, no J in the keys', async t => {
  if (!RUN) return t.skip('needs step 2 in the same run (run the whole file; if step 2 failed, that failure is the one to read)');
  await page.keyboard.press('Escape');
  await page.keyboard.press('j');
  await page.waitForTimeout(400);
  assert.ok(!(await page.evaluate(() => BYOC.close && BYOC.close.isOpen && BYOC.close.isOpen())), 'J opens nothing');
  assert.strictEqual(await page.evaluate(() => BYOC.stage(99, { instant: true })), 9, 'the last beat is her page (9)');
  await page.keyboard.press('PageDown'); await page.waitForTimeout(300);
  assert.strictEqual(await page.evaluate(() => BYOC.beat), 9, 'forward from her page goes nowhere');
  assert.ok(!(await page.evaluate(() => BYOC.close && BYOC.close.isOpen && BYOC.close.isOpen())), 'and never opens the close');
  assert.doesNotMatch(await page.evaluate(() => document.querySelector('.chrome-keys')?.textContent || ''), /judge/i, 'not on the presenter bar');
  assert.doesNotMatch(await page.evaluate(() => document.getElementById('help-card')?.textContent || document.body.innerHTML), /judge/i, 'not in the ? keys');
});

test('4. replays: record-run, R in stage mode; REPLAY shows throughout', async t => {
  // Serial: this goes on in step 2's page and run. Run alone (a name filter) or after step 2 failed, it skips and says so.
  if (!RUN) return t.skip('needs step 2 in the same run (run the whole file; if step 2 failed, that failure is the one to read)');
  const out = execFileSync('node', ['scripts/record-run.mjs', 'rehearsal', RUN], { cwd: ROOT, env: { ...process.env, RUNS_DIR: RUNS } }).toString();
  assert.match(out, /recorded/);
  assert.deepStrictEqual(readLog('rehearsal'), readLog(RUN), 'the recording is the run’s log');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Home');
  await page.keyboard.press('r');
  await waitFor(() => BYOC.replay && !document.getElementById('replay-label').hidden, 5000, 'the rehearsal replay');
  assert.ok(await page.evaluate(() => document.body.classList.contains('stage')), 'still in stage mode');
  assert.match(await page.textContent('#replay-label'), /Replay.*rehearsal/);
  await waitFor(() => BYOC.events().some(e => e.type === 'ask'), 120000, 'the replay reaches the asks');
  assert.ok(await page.isVisible('#replay-label'), 'REPLAY on screen during the replay');
  assert.ok(await page.evaluate(() => document.getElementById('live-step').hidden), 'no live step during a replay');
  assert.ok(await page.isVisible('#replay-label'), 'REPLAY on screen');
  await page.keyboard.press('Home');
  assert.ok(!(await page.isVisible('#replay-label')), 'reset clears the label');
});

test('5. fallbacks: a slow or failing call shows its step and offers R', async t => {
  // Serial: R swaps in the rehearsal recorded in step 4 from step 2's run. Run alone, or after step 2 failed, it skips.
  if (!RUN) return t.skip('needs step 2 in the same run (run the whole file; if step 2 failed, that failure is the one to read)');
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  // Opening her run hangs, then fails; the slow threshold is 1.5 s for the test (25 s on stage).
  await p.route('**/api/run', async r => { await new Promise(f => setTimeout(f, 3500)); await r.fulfill({ status: 500, body: '{"error":"model down"}' }); });
  await p.route('**/api/sketch-for-idea', r => r.fulfill({ status: 502, body: '{"error":"no sketch"}' }));
  await p.route('**/api/select-for-idea', async r => { await new Promise(f => setTimeout(f, 3000)); await r.fulfill({ status: 502, body: '{"error":"bad gateway"}' }); });
  // Her typed idea is tidied before it's sent (BYOC.tidyInto, up to 2.5 s): answered at once here, so the clock below
  // times only the failing run call, not a slow tidy (in either setup order).
  await p.route('**/api/tidy', r => r.fulfill({ json: { text: JSON.parse(r.request().postData() || '{}').text || '', tidied: false } }));
  await p.goto(L(BASE + '/?stage=1&slow=1500'));
  await p.waitForTimeout(300);
  await p.evaluate(() => BYOC.stage(3, { instant: true }));
  await p.waitForTimeout(100);
  await p.keyboard.type('A booking page for a small yoga studio.');
  await p.keyboard.press('Enter');
  await waitFor(() => /Opening the sheet/.test(document.getElementById('live-step').textContent) && !document.getElementById('live-step').hidden, 3000, 'the step', null, p);
  await waitFor(() => /taking a while · R replays the rehearsal/.test(document.getElementById('live-step').textContent), 3000, 'the slow note', null, p);
  await waitFor(() => /stopped/.test(document.getElementById('live-step').textContent), 4000, 'the failure', null, p);
  assert.match(await p.textContent('#live-step'), /R replays the rehearsal/);
  assert.strictEqual(await p.locator('.spinner, [class*="spin"], progress').count(), 0, 'never a spinner');
  // Back in the room, R swaps in the rehearsal (recorded in step 4). Esc first: her input still holds her words.
  await p.keyboard.press('Escape');
  await p.keyboard.press('Home');
  await p.keyboard.press('r');
  await waitFor(() => BYOC.replay && /rehearsal/.test(document.getElementById('replay-label').textContent), 5000, 'the rehearsal replay', null, p);
  assert.ok(await p.evaluate(() => document.getElementById('live-step').hidden), 'the failed step gives way to the replay');
  assert.deepStrictEqual(perrs, []);
  await p.close();
});
