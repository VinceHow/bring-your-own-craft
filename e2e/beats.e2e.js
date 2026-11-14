// End-to-end: the keyboard-driven demo, walk-in to the close, in stage mode, with real model calls.
// Run: npm run e2e (or node --test e2e/beats.e2e.js). Owned by build/beats.
//   1. stage mode: body >= 20px, no chrome, no help card; the live path to the three asks at 1280x720, from a clicker
//   2. the close with a real judge's idea: contrast before the questions land, <= 3 questions, M from the run's log
//   3. replays: record-run, R in stage mode, the close's café fallback, the REPLAY label throughout
//   4. fallbacks: a slow or failing call shows its step (never a spinner) and offers R
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { MAX_ASKS } from '../lib/policy.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4000 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-beats-e2e-');
const JUDGE_IDEA = 'A sign-up page for a neighbourhood tool library.';
let srv, logs = '', browser, page, errors = [];
let RUN = null;

before(async () => {
  // The recorded café run is the close's fallback; the test's runs dir gets a copy.
  fs.cpSync(path.join(ROOT, 'runs', 'cafe'), path.join(RUNS, 'cafe'), { recursive: true });
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
  await page.goto(BASE + '/?hold=300');
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

test('1b. the seventh seat, "Your own craft": her name tag, then she sits there; no separate "I love" card', async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  const runs = []; p.on('request', r => r.url().endsWith('/api/run') && r.method() === 'POST' && runs.push(JSON.parse(r.postData())));
  await p.goto(BASE + '/?stage=1&hold=300');
  await p.waitForTimeout(400);
  assert.match(await p.locator('.seat-diy .seat-empty').innerText(), /Your own craft/i);
  await p.click('.seat-diy');
  await waitFor(() => document.activeElement?.classList.contains('tag-input'), 3000, 'her tag input', null, p);
  await p.keyboard.type('I bake sourdough for my village and I love the 7am queue');
  await p.keyboard.press('Enter');
  await waitFor(() => !document.querySelector('.name-tag .tag-card').hidden, 20000, 'her tag', null, p);
  await p.click('.name-tag .tag-craft'); await p.keyboard.press('End');
  await p.keyboard.press('Enter'); // keep it: she takes the seat
  await waitFor(() => !!document.querySelector('.seat-diy .card'), 5000, 'her card in her own seat', null, p);
  assert.strictEqual(await p.locator('.seat-product .card').count(), 0, 'not in Product');
  assert.strictEqual(await p.locator('#her-stance').count(), 0, 'no stance slot on her card');
  await waitFor(() => document.querySelectorAll('.seat:not(.seat-diy):not(.seat-product) .card').length === 5, 30000, 'the team assembled', null, p);
  await waitFor(() => document.activeElement?.id === 'her-input', 8000, 'straight to the idea', null, p);
  assert.strictEqual(await p.locator('#intro-input').count(), 0, 'no separate "I love" card');
  await p.keyboard.type('A pre-order page for my bakery.'); await p.keyboard.press('Enter');
  await waitFor(() => BYOC.run && !BYOC.run.startsWith('local-'), 5000, 'a run', null, p);
  assert.strictEqual(runs.at(-1).seat, 'diy', 'the run is in her own craft');
  assert.match(String(runs.at(-1).intro || ''), /^I love /, 'her loves line goes as her intro');
  assert.deepStrictEqual(perrs, []);
  await p.close();
});

test('2. the live path in stage mode, driven like a clicker, as far as the three asks', async () => {
  await page.keyboard.press('PageDown'); // the clicker takes the Product seat (same as her click)
  await waitFor(() => document.querySelectorAll('.seat .card').length === 6 && document.activeElement?.id === 'intro-input', 20000, 'the team assembled and her card open');
  // From her empty card, the clicker moves on without a line (her file keeps both prepared lines).
  await page.keyboard.press('PageDown');
  await waitFor(() => document.activeElement && document.activeElement.id === 'her-input', 5000, 'her input focused');
  assert.strictEqual(await page.evaluate(() => BYOC.intro), null);
  await page.keyboard.type('A booking page for a small yoga studio.');
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.run && !BYOC.run.startsWith('local-'), 5000, 'a run id');
  RUN = await page.evaluate(() => BYOC.run);
  for (const l of ['classes', 'a class', 'confirm', 'booked', 'regulars → "Book your usual"']) {
    await page.keyboard.type(l); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  }
  await waitFor(() => document.querySelectorAll('#her-flow .fl-box').length === 5, 5000, 'five boxes');
  // The clicker's forward button from her empty input: the team goes.
  await page.keyboard.press('PageDown');
  await waitFor(() => BYOC.beat >= 5, 2000, 'the team works beat');
  // While the team works, the room shows the step it is on, with its seconds (no spinner).
  await waitFor(() => !document.getElementById('live-step').hidden && /The team is/.test(document.getElementById('live-step').textContent), 5000, 'the live step');
  assert.match(await page.textContent('#live-step'), /\d+ s/);
  await waitFor(() => BYOC.events().some(e => e.type === 'select.done' || e.type === 'propose.error'), 110000, 'the team and the selector');
  const evs = await page.evaluate(() => BYOC.events());
  assert.ok(!evs.some(e => e.type === 'propose.error'), 'propose ran');
  const asks = evs.filter(e => e.type === 'ask');
  assert.ok(asks.length >= 1 && asks.length <= MAX_ASKS, `1 to ${MAX_ASKS} asks, got ${asks.length}`);
  await page.waitForTimeout(1200);
  assert.ok(await page.evaluate(() => document.getElementById('live-step').hidden), 'the step clears when the selector is done');
  assert.ok(await onScreen('#her-flow .fl-box'), 'her flow is on screen at 1280x720');
  // The room: nothing opens by itself, nothing on her flow asks her anything; her questions wait in the tray at her
  // seat ~1 s after the pause: "<Name> · <Seat>" and a few words, in the teammate's ink, no number, no "waiting".
  assert.strictEqual(await page.locator('#her-flow .fl-fork, #her-flow .fl-pin').count(), 0, 'no forks or pins on her flow');
  assert.ok(!(await page.evaluate(() => BYOC.focusDoc.isOpen())), 'nothing opens by itself');
  await waitFor(() => !document.getElementById('tray').hidden, 4000, 'the tray at her seat');
  const notes = await page.locator('#tray .tray-note').allInnerTexts();
  assert.strictEqual(notes.length, asks.length, 'one note per question');
  for (const t of notes) assert.match(t.replace(/\s+/g, ' ').trim(), /^(\w+ · )?(Design|Data|Research|Strategy|Engineering|Product) ?.+\?$/i, `a note's face: ${t}`);
  assert.ok(!(await page.locator('#tray').innerText()).match(/\b\d+\b|waiting/i), 'no number, no "waiting"');
  // Her focus: the clicker opens the top note; the view becomes just her and that one document.
  const top = await page.locator('#tray .tray-note').first().getAttribute('data-ask');
  await page.keyboard.press('PageDown');
  await waitFor(() => BYOC.focusDoc.isOpen(), 3000, 'her document');
  assert.strictEqual(await page.evaluate(() => BYOC.focusDoc.openId()), top, 'the top note opened');
  assert.strictEqual(await page.evaluate(() => BYOC.beat), 6, 'the beat did not move');
  assert.ok(await page.evaluate(() => document.body.classList.contains('focus-open')), 'body.focus-open');
  assert.ok(!(await page.isVisible('.seat-design .card')), 'the room is gone from view');
  assert.ok(!(await page.isVisible('#tray')), 'and so is the tray');
  assert.ok(await page.isVisible('#focus-doc .fd-work'), 'the work, large');
  assert.deepStrictEqual(await pronouns(page), [], 'no pronouns in her document');
  const ask = asks.find(a => a.id === top);
  assert.strictEqual((await page.textContent('#focus-doc .fd-question')).trim(), (ask.question || ask.decision).trim(), 'its one question');
  assert.strictEqual(await page.locator('#focus-doc .fl-opt, #focus-doc .fl-yours, #focus-doc .is-dropped').count(), 0, 'no options, no YOUR CALL, no strike-through');
  // Readable at both sizes: the question >= 18 px at 1280x720 and >= 22 px at 1600x900, rendered.
  for (const [w, hgt, floor] of [[1280, 720, 18], [1600, 900, 22]]) {
    await page.setViewportSize({ width: w, height: hgt }); await page.waitForTimeout(300);
    const px = await page.evaluate(() => { const q = document.querySelector('#focus-doc .fd-question'); return +(parseFloat(getComputedStyle(q).fontSize) * q.getBoundingClientRect().height / q.offsetHeight).toFixed(1); });
    console.log(`her document at ${w}x${hgt}: question ${px} px`);
    assert.ok(px >= floor, `question >= ${floor} px at ${w}x${hgt}, got ${px}`);
    assert.ok(await onScreen('#focus-doc'), `the document fits the screen at ${w}x${hgt}`);
  }
  await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(200);
  // She says her piece; it lands on the document and is logged as her answer.
  await page.locator('#focus-doc .fd-input').fill('Knowing their spot is theirs. My regulars do the same class every week and hate hunting for it.');
  await page.keyboard.press('Enter');
  await waitFor(id => BYOC.events().some(e => e.type === 'answer' && e.askId === id), 8000, 'her answer logged', top);
  assert.match(await page.textContent('#focus-doc .fd-said'), /Knowing their spot is theirs/);
  // Closing it brings the room back; the tray holds the rest.
  await page.keyboard.press('Escape');
  await waitFor(() => !BYOC.focusDoc.isOpen(), 2000, 'back in the room');
  assert.ok(await page.isVisible('.seat-design .card'), 'the room is back');
  assert.deepStrictEqual(await pronouns(page), [], 'no pronouns in the room');
  if (asks.length > 1) {
    await waitFor(() => !document.getElementById('tray').hidden, 4000, 'the tray again');
    assert.strictEqual(await page.locator('#tray .tray-note').count(), asks.length - 1, 'the rest wait in the tray');
  }
  assert.deepStrictEqual(errors, []);
});

test('2b. her document: words land, the team chimes in one after another, the takeaways, kept', async () => {
  // The server's answer and brief routes (builder 6) are stubbed here; the events are the contract's shapes.
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  const posted = [];
  await p.route('**/api/run/*/answer', async r => { posted.push(['answer', JSON.parse(r.request().postData())]); await r.fulfill({ status: 200, body: '{"ok":true}' }); });
  await p.route('**/api/run/*/takeaways', async r => { posted.push(['takeaways', JSON.parse(r.request().postData())]); await r.fulfill({ status: 200, body: '{"id":"L3"}' }); });
  await p.goto(BASE + '/?stage=1');
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run';
    BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'q1', seat: 'research', by: 'Noor', question: 'What makes someone come back to a studio week after week?',
      artifact: { kind: 'finding', ref: { title: 'Small studios fill their popular classes', text: 'Regulars book the same slot each week.', url: 'https://example.org/finding' } } }, 'replay');
  });
  await waitFor(() => !document.getElementById('tray').hidden, 4000, 'the note', null, p);
  assert.match((await p.locator('#tray .tray-note').innerText()).replace(/\s+/g, ' '), /^Noor · Research ?What makes someone come back to…\?$/i);
  // The room's chatter: the team talking about its work, under the speaker's card, never addressed to her.
  await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'chatter', by: 'Noor', seat: 'research', text: 'Found a source on full classes.' }, 'replay'));
  assert.match((await p.locator('.chatter-line[data-seat="research"]').innerText()).replace(/\s+/g, ' ').trim(), /^Noor: Found a source on full classes\.$/i);
  await p.locator('#tray .tray-note').click();
  await waitFor(() => BYOC.focusDoc.isOpen(), 2000, 'the document', null, p);
  assert.ok(!(await p.isVisible('.chatter-line')), 'the room and its chatter are gone from view');
  assert.match(await p.textContent('#focus-doc .fd-kicker'), /Noor · Research/);
  assert.match(await p.textContent('#focus-doc .fd-work'), /Small studios fill their popular classes/);
  const said = 'Knowing their spot is theirs. My regulars do the same Tuesday class every week and hate hunting for it.';
  await p.locator('#focus-doc .fd-input').fill(said);
  await p.keyboard.press('Enter');
  await waitFor(() => !!document.querySelector('#focus-doc .fd-words'), 2000, 'her words on the document', null, p);
  assert.deepStrictEqual(posted[0], ['answer', { askId: 'q1', text: said }]);
  // Two chime-ins and the brief arrive together; they land one after another, about a second apart, then the brief.
  const t0 = Date.now();
  await p.evaluate(() => {
    BYOC.dispatch({ run: 'stub-run', type: 'chime', askId: 'q1', by: 'Noor', seat: 'research', text: 'That matches what small studios report.' }, 'replay');
    BYOC.dispatch({ run: 'stub-run', type: 'chime', askId: 'q1', by: 'Mika', seat: 'design', text: 'Then their usual class goes first, one tap.' }, 'replay');
    BYOC.dispatch({ run: 'stub-run', type: 'takeaways', askId: 'q1', believe: 'Regulars should never have to hunt for their class.', guidance: 'Put their usual class first, one tap to book.' }, 'replay');
  });
  await waitFor(() => document.querySelectorAll('#focus-doc .chime').length === 1, 1000, 'the first chime', null, p);
  assert.strictEqual(await p.locator('#focus-doc .chime').count(), 1, 'one at a time');
  assert.ok(await p.locator('#focus-doc .fd-brief').isHidden(), 'the takeaways wait for the chimes');
  await waitFor(() => document.querySelectorAll('#focus-doc .chime').length === 2, 2500, 'the second chime', null, p);
  assert.ok(Date.now() - t0 >= 800, 'about a second apart');
  assert.match(await p.locator('#focus-doc .chime').first().innerText(), /Noor · Research[\s\S]*small studios report/i);
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

test('3. the close: a real judge idea; contrast first, then the capped questions, then her M from the log, then the last line', async () => {
  assert.ok(RUN, 'needs step 2');
  await page.keyboard.press('Escape');
  await page.keyboard.press('j');
  await waitFor(() => document.activeElement && document.activeElement.id === 'close-input', 3000, 'the idea input');
  assert.strictEqual(await page.evaluate(() => document.querySelector('.close-left').classList.contains('on')), false, 'no contrast before the idea');
  await page.keyboard.type(JUDGE_IDEA);
  await page.keyboard.press('Enter');
  // While the team works: the contrast is up and no question has landed yet.
  await waitFor(() => document.querySelector('.close-left').classList.contains('on'), 3000, 'the contrast');
  assert.strictEqual(await page.locator('#close-asks li').count(), 0, 'the contrast shows before the questions land');
  assert.strictEqual(await page.textContent('#close-b-guessed'), '22', 'guessed, counted from docs/baseline/GUESSES.md');
  assert.match(await page.textContent('#close-step'), /Design is sketching it|The team is on it/);
  // Design's first sketch of their idea draws in while the contrast shows.
  await waitFor(() => document.querySelectorAll('#close-sketch .fs-box').length > 0, 30000, 'Design’s sketch of the judge’s idea');
  assert.strictEqual(await page.locator('#close-asks li').count(), 0, 'the sketch draws before the check-in lands');
  await waitFor(() => document.querySelectorAll('#close-asks li').length > 0 || /stopped/.test(document.getElementById('close-step').textContent), 90000, 'the first check-in');
  const n = await page.locator('#close-asks li').count();
  assert.strictEqual(n, 1, 'one check-in at a time: the first lands');
  const tm = await page.evaluate(() => BYOC.timings);
  assert.ok(tm.contrastAt < tm.asksAt, 'contrast before the check-in');
  // The judge's run was logged with the sketch's stages as its flow, capped, and the check-in shown is its first ask.
  const judgeLog = readLog(tm.closeRun);
  assert.ok(judgeLog.some(e => e.type === 'run.start' && e.idea === JUDGE_IDEA), 'the judge’s run is logged with the idea');
  assert.ok(judgeLog.filter(e => e.type === 'flow.line').length >= 2, 'the sketch’s stages went in as her flow');
  const jAsks = judgeLog.filter(e => e.type === 'ask');
  assert.ok(jAsks.length >= 1 && jAsks.length <= MAX_ASKS, `1 to ${MAX_ASKS} asks (the cap in lib/policy.js), got ${jAsks.length}`);
  assert.strictEqual(await page.locator('#close-asks li').first().getAttribute('data-ask'), jAsks[0].id, 'the first check-in is the run’s first ask');
  const cm = (await page.textContent('#close-count')).match(/(\d+) handled by the team · (\d+) for you/);
  assert.ok(cm, 'the caption'); assert.strictEqual(+cm[2], jAsks.length, '"for her" is the run’s asks');
  assert.strictEqual(+cm[1], judgeLog.filter(e => e.type === 'candidate').length - jAsks.length, '"handled" is the rest, from the log');
  // Her line, from her run's log.
  await waitFor(() => !document.getElementById('close-built').hidden, 8000, 'the built-this-way line');
  const want = countFromLog(readLog(RUN));
  if (want.fromFile > 0) {
    assert.ok(await page.isVisible('#close-her'), 'her line shows');
    assert.strictEqual(await page.textContent('#close-decided'), String(want.fromFile), 'M is counted from her run’s log');
    assert.strictEqual(await page.textContent('#close-asked'), String(want.asked), 'asked is her run’s asks');
  } else {
    assert.ok(!(await page.isVisible('#close-her')), 'M = 0: her line is not shown');
  }
  console.log(`close: sketch in ${(tm.closeSketchMs / 1000).toFixed(1)} s, first check-in at ${(tm.closeMs / 1000).toFixed(1)} s (${jAsks.length} asks); her ${want.asked} asked, ${want.fromFile} decided from her file`);
  assert.match(await page.textContent('#close-built'), /built the same way\. Tomorrow, the engineer at this table is a person/);
  assert.ok(await onScreen('#close-asks li, #close-built, #close-her:not([hidden])'), 'the close fits the screen at 1280x720');
  assert.ok(!(await page.isVisible('#replay-label')), 'nothing replayed, no label');
});

test('4. replays: record-run, R in stage mode, the café fallback in the close; REPLAY shows throughout', async () => {
  assert.ok(RUN, 'needs step 2');
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
  // The close, while the rehearsal is on screen: the café fallback, labelled.
  await page.keyboard.press('j');
  await page.keyboard.press('Escape');
  assert.ok(await page.isVisible('#replay-label'), 'REPLAY still on screen in the close');
  await page.keyboard.press('c');
  await waitFor(() => /cafe/.test(document.getElementById('replay-label').textContent), 3000, 'the café label');
  await waitFor(() => document.querySelectorAll('#close-asks li').length > 0, 10000, 'the café check-in');
  assert.strictEqual(await page.locator('#close-asks li').first().getAttribute('data-ask'), readLog('cafe').find(e => e.type === 'ask').id, 'the café run’s first ask');
  assert.match(await page.inputValue('#close-input'), /café/);
  await waitFor(() => !document.getElementById('close-built').hidden, 8000, 'the last line');
  const want = countFromLog(readLog('rehearsal'));
  if (want.fromFile > 0) {
    assert.strictEqual(await page.textContent('#close-decided'), String(want.fromFile), 'M from the rehearsal log');
    assert.match(await page.textContent('#close-her-src'), /REPLAY/);
  }
  assert.ok(await page.isVisible('#replay-label'), 'REPLAY on screen at the end of the close');
  await page.keyboard.press('Home');
  assert.ok(!(await page.isVisible('#replay-label')), 'reset clears the label');
});

test('5. fallbacks: a slow or failing call shows its step and offers R; the close says so too', async () => {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const perrs = []; p.on('pageerror', e => perrs.push(String(e)));
  // Opening her run hangs, then fails; the slow threshold is 1.5 s for the test (25 s on stage).
  await p.route('**/api/run', async r => { await new Promise(f => setTimeout(f, 3500)); await r.fulfill({ status: 500, body: '{"error":"model down"}' }); });
  await p.route('**/api/sketch-for-idea', r => r.fulfill({ status: 502, body: '{"error":"no sketch"}' }));
  await p.route('**/api/select-for-idea', async r => { await new Promise(f => setTimeout(f, 3000)); await r.fulfill({ status: 502, body: '{"error":"bad gateway"}' }); });
  await p.goto(BASE + '/?stage=1&slow=1500');
  await p.waitForTimeout(300);
  await p.evaluate(() => BYOC.stage(3, { instant: true }));
  await p.waitForTimeout(100);
  await p.keyboard.type('A booking page for a small yoga studio.');
  await p.keyboard.press('Enter');
  await waitFor(() => /Opening the sheet/.test(document.getElementById('live-step').textContent) && !document.getElementById('live-step').hidden, 3000, 'the step', null, p);
  await waitFor(() => /slow · R replays the rehearsal/.test(document.getElementById('live-step').textContent), 3000, 'the slow note', null, p);
  await waitFor(() => /stopped/.test(document.getElementById('live-step').textContent), 4000, 'the failure', null, p);
  assert.match(await p.textContent('#live-step'), /R replays the rehearsal/);
  assert.strictEqual(await p.locator('.spinner, [class*="spin"], progress').count(), 0, 'never a spinner');
  // The close: slow, then stopped, then R brings in the café run.
  await p.keyboard.press('Escape');
  await p.keyboard.press('j');
  await p.keyboard.type('A page for a bike repair pop-up.');
  await p.keyboard.press('Enter');
  await waitFor(() => /slow: R replays the café run/.test(document.getElementById('close-step').textContent), 3000, 'the close’s slow note', null, p);
  await waitFor(() => /stopped/.test(document.getElementById('close-step').textContent), 4000, 'the close’s failure', null, p);
  await p.keyboard.press('r');
  await waitFor(() => document.querySelectorAll('#close-asks li').length > 0, 10000, 'the café questions', null, p);
  assert.ok(await p.isVisible('#replay-label'), 'labelled REPLAY');
  // Back in the room, R swaps in the rehearsal (recorded in step 4).
  await p.keyboard.press('Home');
  await p.keyboard.press('r');
  await waitFor(() => BYOC.replay && /rehearsal/.test(document.getElementById('replay-label').textContent), 5000, 'the rehearsal replay', null, p);
  assert.ok(await p.evaluate(() => document.getElementById('live-step').hidden), 'the failed step gives way to the replay');
  assert.deepStrictEqual(perrs, []);
  await p.close();
});
