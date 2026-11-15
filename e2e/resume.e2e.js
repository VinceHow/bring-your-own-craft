// A refresh resumes her live run (Vincent, Sun 02:17): the room is rebuilt from the run's own log, instantly, as HER
// run (no REPLAY label, no model call, nothing asked again), mid-room, mid-build or done; ?run= works on its own; a
// missing run starts fresh with a quiet line; "Start over" asks once and forgets; R still replays as before.
// Uses truncated copies of the recorded rehearsal in a temp runs dir; no model calls. Run: node --test e2e/resume.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3200 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-resume-e2e-');
const SRC = fs.readFileSync(path.join(ROOT, 'runs', 'rehearsal', 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const cut = (id, upto) => { // a run "so far": the rehearsal's events up to (not including) the first `upto`
  const n = upto ? SRC.findIndex(e => e.type === upto) : SRC.length;
  fs.mkdirSync(path.join(RUNS, id), { recursive: true });
  fs.writeFileSync(path.join(RUNS, id, 'events.jsonl'), SRC.slice(0, n).map(e => JSON.stringify({ ...e, run: id })).join('\n') + '\n');
  if (!upto) fs.cpSync(path.join(ROOT, 'runs', 'rehearsal', 'page'), path.join(RUNS, id, 'page'), { recursive: true });
};
let srv, logs = '', browser;
before(async () => {
  cut('run-resume-room', 'answer.piece'); // Focus 1 asked, not yet answered
  cut('run-resume-build', 'build.done');  // the build under way
  cut('run-resume-done', null);           // her page built
  fs.cpSync(path.join(ROOT, 'runs', 'rehearsal'), path.join(RUNS, 'rehearsal'), { recursive: true });
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 80 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

// A page whose localStorage already holds her run (as after a refresh), with every model-ish POST counted.
async function refreshed(run, { look = '', query = '', me = { name: 'Priya', tag: { title: 'the Translator', traits: ['customer listener'] } } } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const posts = []; page.on('request', r => { if (r.method() === 'POST' && /\/api\//.test(r.url())) posts.push(new URL(r.url()).pathname); });
  const url = BASE + '/' + (look || '?') + (look ? '&' : '') + 'hold=100' + query;
  await page.goto(url);
  if (run) { // as after a refresh: her run is in this browser's storage, then the page loads again
    await page.evaluate(([run, me]) => { localStorage.setItem('byoc.run', run); localStorage.setItem('byoc.me', JSON.stringify(me)); }, [run, me]);
    await page.goto(url);
  }
  await page.waitForFunction(() => window.BYOC && BYOC.beat !== undefined, null, { timeout: 8000 });
  return { page, errors, posts };
}
const resumed = page => page.waitForFunction(() => document.getElementById('room').dataset.resume, null, { timeout: 8000 }).then(() => page.getAttribute('#room', 'data-resume'));

for (const [lookName, look] of [['plain', ''], ['painted', '?look=painted']]) {
  test(`${lookName}: a refresh mid-room picks up her run: the room, her idea and journey, Focus 1 waiting in her inbox; no setup, no REPLAY, nothing re-asked`, async () => {
    const { page, errors, posts } = await refreshed('run-resume-room', { look });
    assert.equal(await resumed(page), 'resumed');
    assert.equal(await page.evaluate(() => BYOC.run), 'run-resume-room');
    assert.ok(await page.isHidden('#setup'), 'straight into the room, not onboarding');
    assert.ok(await page.isHidden('#replay-label'), 'her own run, not a replay');
    assert.equal(await page.evaluate(() => BYOC.replay), false);
    assert.match(await page.textContent('#her-idea'), /bakery/i);
    assert.ok(await page.evaluate(() => document.querySelectorAll('#her-flow .fl-box').length >= 2), 'her journey');
    await page.waitForFunction(() => document.querySelector('#inbox .inbox-now')?.dataset.ask === 'first', null, { timeout: 4000 });
    assert.equal(await page.evaluate(() => document.querySelectorAll('.seat .card').length), 6, 'everyone seated');
    assert.match(await page.textContent('.seat-product .card'), /the Translator/, 'her tag, as she made it');
    await page.waitForTimeout(800);
    assert.deepEqual(posts.filter(p => /\/(first|run|propose|build|meet-lines|name-tag|tidy)$/.test(p)), [], 'no model call, nothing re-asked');
    assert.match(page.url(), /[?&]run=run-resume-room/, 'the URL keeps the run as a backup');
    assert.deepStrictEqual(errors, []);
    await page.close();
  });
}

test('a refresh mid-build says the app is still building; a finished run shows her page', async () => {
  const b = await refreshed('run-resume-build');
  assert.equal(await resumed(b.page), 'resumed');
  assert.ok(await b.page.evaluate(() => BYOC.beat >= 8), 'at the build');
  assert.match(await b.page.textContent('#status'), /Your app is still building/);
  assert.equal(await b.page.getAttribute('[data-component="app-button"]', 'data-state'), 'building');
  assert.deepEqual(b.posts.filter(p => /\/build$/.test(p)), [], 'the build is not started again');
  await b.page.close();
  const d = await refreshed('run-resume-done');
  assert.equal(await resumed(d.page), 'resumed');
  await d.page.waitForFunction(() => BYOC.beat === 9 && !document.getElementById('page-sheet').hidden, null, { timeout: 5000 });
  await d.page.close();
});

test('?run=<id> alone (no localStorage) resumes too', async () => {
  const { page } = await refreshed(null, { query: '&run=run-resume-room' });
  assert.equal(await resumed(page), 'resumed');
  assert.equal(await page.evaluate(() => BYOC.run), 'run-resume-room');
  await page.close();
});

test('a run that is gone: onboarding, a quiet line, and the stale run forgotten', async () => {
  const { page } = await refreshed('run-not-there');
  assert.equal(await resumed(page), 'fresh');
  assert.equal(await page.getAttribute('#setup', 'data-step'), 'idea', 'back to the start');
  assert.match(await page.textContent('#status'), /Couldn’t pick up where you left off: starting fresh\./);
  assert.equal(await page.evaluate(() => localStorage.getItem('byoc.run')), null);
  await page.close();
});

test('Start over asks once, then forgets the run and goes back to the start; Keep this one does nothing', async () => {
  const { page } = await refreshed('run-resume-room');
  assert.equal(await resumed(page), 'resumed');
  assert.equal(await page.getAttribute('[data-component="start-over"]', 'data-state'), 'idle');
  await page.click('[data-component="start-over"] [data-slot="open"]');
  assert.equal(await page.getAttribute('[data-component="start-over"]', 'data-state'), 'asking');
  assert.match(await page.textContent('[data-component="start-over"] [data-slot="question"]'), /Start a new studio\? This one is kept in your past runs\./);
  await page.click('[data-component="start-over"] [data-slot="no"]');
  assert.equal(await page.evaluate(() => BYOC.run), 'run-resume-room', 'kept');
  await page.keyboard.press('Shift+N');
  assert.equal(await page.getAttribute('[data-component="start-over"]', 'data-state'), 'asking', 'Shift+N asks too');
  await page.click('[data-component="start-over"] [data-slot="yes"]');
  await page.waitForFunction(() => document.getElementById('setup').dataset.step === 'idea');
  assert.equal(await page.evaluate(() => [localStorage.getItem('byoc.run'), BYOC.run]).then(x => x.join('|')), '|');
  assert.doesNotMatch(page.url(), /[?&]run=/);
  assert.ok(fs.existsSync(path.join(RUNS, 'run-resume-room', 'events.jsonl')), 'the run itself is kept');
  await page.reload(); await page.waitForTimeout(800);
  assert.equal(await page.getAttribute('#setup', 'data-step'), 'idea', 'a refresh after Start over stays fresh');
  await page.close();
});

test('R still replays exactly as before, and never writes her run', async () => {
  const { page } = await refreshed(null);
  await page.keyboard.press('r');
  await page.waitForFunction(() => BYOC.replay && !document.getElementById('replay-label').hidden, null, { timeout: 5000 });
  await page.waitForFunction(() => BYOC.events().some(e => e.type === 'ask'), null, { timeout: 60000 });
  assert.equal(await page.evaluate(() => localStorage.getItem('byoc.run')), null);
  assert.doesNotMatch(page.url(), /[?&]run=/);
  await page.close();
});
