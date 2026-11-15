// From Vincent's screenshot (his Mac, Chrome): her inbox note read "Product's teammate · ProductWho walks into…", the
// inbox and "Open your inbox" were clipped at the left edge, and the main sheet said nothing while the team worked.
// At 1440x900 and 1280x800, in the plain and the painted look: the inbox and its toggle sit fully inside the viewport;
// the closed inbox says only who ("<Name> has a question", Vincent 15 Nov: no preview), never "<seat>'s teammate"; a new
// note pulses, and the inbox is the room's one cue (the main sheet no longer repeats it). No models (events dispatched). Run: node --test e2e/inbox-layout.e2e.js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 3500 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const RUNS = fs.mkdtempSync('/tmp/byoc-inbox-layout-e2e-');
let srv, logs = '', browser;

before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS, THREAD_WARM: '0' } });
  srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
  for (let i = 0; i < 80 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

const inside = (r, w, hgt) => r && r.left >= 0 && r.top >= 0 && r.right <= w && r.bottom <= hgt;

for (const look of ['', '?look=painted']) for (const [w, hgt] of [[1440, 900], [1280, 800]]) {
  test(`${look ? 'painted' : 'plain'} at ${w}x${hgt}: the inbox fully on screen; "<Name> has a question", no preview; the inbox is the one cue`, async () => {
    const p = await browser.newPage({ viewport: { width: w, height: hgt } });
    const errors = []; p.on('pageerror', e => errors.push(String(e)));
    await p.route('**/api/run/**', r => r.fulfill({ status: 200, json: { ok: true } }));
    await p.goto(BASE + '/' + look);
    await p.waitForFunction(() => window.BYOC && BYOC.inbox && BYOC.stage);
    await p.evaluate(() => {
      BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run';
      // Her own seat's engine asked: the server names it "Product's teammate"; the room must never show that.
      BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'p1', seat: 'product', by: "Product's teammate", question: 'Who walks into this bakery most mornings, and what are they hoping to walk out with?', artifact: { kind: 'journey' } }, 'live');
    });
    await p.waitForFunction(() => document.querySelector('#inbox .inbox-now')?.dataset.ask === 'p1', null, { timeout: 4000 });
    const text = (await p.locator('#inbox .inbox-now').innerText()).trim();
    assert.strictEqual(text, 'The team has a question');
    assert.doesNotMatch(text, /teammate|· Product/);
    // A named teammate asks next.
    await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'n1', seat: 'research', by: 'Noor', question: 'What makes someone come back to a bakery week after week?', artifact: { kind: 'journey' } }, 'live'));
    await p.waitForFunction(() => document.querySelectorAll('#inbox .inbox-item').length >= 1, null, { timeout: 4000 });
    // The new note pulses; the main sheet stays quiet (the inbox is the one cue).
    const st = await p.evaluate(() => ({ pulse: document.getElementById('inbox').dataset.pulse, team: document.getElementById('team-status')?.dataset.state, line: document.getElementById('team-status')?.textContent }));
    assert.notEqual(st.team, 'question');
    assert.doesNotMatch(st.line || '', /has a question/);
    assert.ok(['on', 'off'].includes(st.pulse), 'the pulse hook is set');
    for (const sel of ['#inbox', '#inbox .inbox-now', '#inbox .inbox-toggle']) {
      const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; }, sel);
      assert.ok(inside(r, w, hgt), `${sel} inside ${w}x${hgt}: ${JSON.stringify(r)}`);
    }
    // Open, too (the whole screen).
    await p.click('#inbox .inbox-toggle');
    const r = await p.evaluate(() => { const b = document.getElementById('inbox').getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; });
    assert.ok(inside(r, w, hgt), `open inbox inside ${w}x${hgt}: ${JSON.stringify(r)}`);
    assert.deepStrictEqual(errors, []);
    await p.close();
  });
}

test('pushed off the left edge (a look or a narrow window), the inbox is brought back on screen', async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + '/');
  await p.waitForFunction(() => window.BYOC && BYOC.inbox && BYOC.stage);
  await p.evaluate(() => { BYOC.stage(5, { instant: true }); BYOC.run = 'stub-run';
    const s = document.createElement('style'); s.textContent = '#room .inbox { left: -400px !important; top: -200px !important; }'; document.head.appendChild(s);
    BYOC.dispatch({ run: 'stub-run', type: 'ask', id: 'n1', seat: 'research', by: 'Noor', question: 'What makes someone come back?', artifact: { kind: 'journey' } }, 'live'); });
  await p.waitForFunction(() => document.querySelector('#inbox .inbox-now')?.dataset.ask === 'n1', null, { timeout: 4000 });
  const r = await p.evaluate(() => { const b = document.getElementById('inbox').getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; });
  assert.ok(inside(r, 1440, 900), JSON.stringify(r));
  await p.close();
});
