// Records the bakery's run through the real harness (plumbing only: it types what Priya would type).
// Starts the room on a free port with the given env, drives seat -> idea -> sketch -> team -> her answers -> takeaways,
// then stops before any build (the app is built separately, from this run's decisions). Prints the run id.
//   MODEL_BACKEND=fal node deploy/record-bakery-run.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4100 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const IDEA = 'A small bakery where neighbours reserve a loaf from each bake under their first name, and I hand them out when the batch is ready.';
const INTRO = 'baking small batches and knowing every regular by name.';
// Her answers, in order, one per check-in. Worded the way the baker would say them.
const ANSWERS = [
  'Just a first name, nothing else. One of each loaf per person per bake, so the rare ones go round. When something is gone, say so warmly.',
  'Hold a reservation for about fifteen minutes, then let it go back on the shelf. I hand everything out at once when I say the batch is ready.',
  'It should feel like I already know them: short warm lines, no countdowns. I restock between bakes and reset everything before the morning.',
];

// Her answers to teammates' quick blocking calls, in order.
const UNBLOCK = [
  "There's no closing time: you can reserve while a bake lasts, and I restock for the next one.",
  'Keep it to the loaf and a first name. Nothing else.',
];

let logs = '';
const srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } });
srv.stdout.on('data', d => (logs += d)); srv.stderr.on('data', d => (logs += d));
for (let i = 0; i < 100 && !logs.includes('room on'); i++) await new Promise(r => setTimeout(r, 100));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const waitFor = async (fn, ms, what, arg) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await page.evaluate(fn, arg).catch(() => false)) return; await page.waitForTimeout(200); }
  throw new Error('timed out waiting for ' + what);
};
const t0 = Date.now();
const lap = m => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
try {
  await page.goto(BASE + '/?hold=300'); // the stage path, as on stage: her first check-in follows Design's sketch
  await page.keyboard.press('Enter');
  await waitFor(() => document.activeElement?.id === 'intro-input', 40000, 'her card');
  await page.keyboard.type(INTRO);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.big-card[data-seat="product"]')?.dataset.state === 'shown', null, { timeout: 60000 });
  await page.keyboard.press('Enter');
  await waitFor(() => document.activeElement?.id === 'her-input', 10000, 'her input');
  await page.keyboard.type(IDEA);
  await page.keyboard.press('Enter');
  await waitFor(() => BYOC.run && !BYOC.run.startsWith('local-'), 10000, 'a run id');
  const RUN = await page.evaluate(() => BYOC.run);
  lap('run ' + RUN);
  await waitFor(() => BYOC.events().some(e => e.type === 'sketch.done'), 60000, 'the first sketch');
  lap('sketch');
  let wentAhead = false;
  // Answer every note that reaches her tray, until the team has settled: no note waiting, every joint session
  // closed (kept or revised), and nothing new for 20 s. Capped at 6 minutes.
  let answered = 0, unblocked = 0, quietSince = Date.now();
  const end = Date.now() + 360000;
  while (Date.now() < end) {
    const needs = await page.$('#inbox:not([hidden])[data-needs="yes"] .inbox-now');
    if (needs) {
      await needs.click();
      const opened = await waitFor(() => BYOC.focusDoc.isOpen(), 5000, 'her document').then(() => true, () => false);
      if (opened) {
        await page.locator('#focus-doc .fd-input').fill(ANSWERS[answered] || ANSWERS.at(-1));
        await page.keyboard.press('Enter');
        await waitFor(n => new Set(BYOC.events().filter(e => e.type === 'answer').map(e => e.askId)).size >= n, 15000, 'answer', answered + 1);
        const brief = await waitFor(() => !document.querySelector('#focus-doc .fd-brief')?.hidden, 90000, 'takeaways').then(() => true, () => false);
        if (brief) await page.click('#focus-doc .fd-keep').catch(() => {});
        await page.keyboard.press('Escape');
        await waitFor(() => !BYOC.focusDoc.isOpen(), 5000, 'back in the room').catch(() => {});
        answered++;
        lap(`answered ${answered}${brief ? ' + takeaways kept' : ' (no takeaways shown)'}`);
      } else {
        // An unblock card (a teammate is blocked on one call): she says her own answer, then Yes.
        const card = await page.waitForSelector('.inbox-action[data-state="asking"]', { timeout: 5000 }).catch(() => null);
        if (card) {
          const q = await card.$eval('.ia-q', e => e.textContent).catch(() => '');
          await (await card.$('.ia-say')).click();
          await page.waitForSelector('.inbox-action .ia-hers', { timeout: 3000 });
          await page.keyboard.type(UNBLOCK[unblocked] || UNBLOCK.at(-1));
          await page.keyboard.press('Enter');
          await waitFor(() => !!document.querySelector('.inbox-action[data-state="yes"]') || document.getElementById('inbox')?.dataset.needs !== 'yes', 10000, 'unblock sent').catch(() => {});
          unblocked++; lap(`unblocked: "${q}"`);
        } else await page.keyboard.press('Escape');
      }
      quietSince = Date.now();
      continue;
    }
    const open = await page.evaluate(() => {
      const evs = BYOC.events();
      const started = evs.filter(e => e.type === 'joint.start').map(e => e.jointId);
      const closed = new Set(evs.filter(e => e.type === 'joint.kept' || e.type === 'joint.revised').map(e => e.id));
      return { pending: started.filter(j => !closed.has(j)).length, n: evs.length };
    });
    if (open.n !== quietSince.n) { quietSince = Object.assign(new Number(Date.now()), { n: open.n }); }
    const selected = await page.evaluate(() => BYOC.events().some(e => e.type === 'select.done' || e.type === 'propose.error'));
    if (!selected && !wentAhead && Date.now() - quietSince > 15000) {
      // Nothing waiting for her and the team hasn't started: an empty line, team go.
      await page.locator('#her-input').focus().catch(() => {});
      await page.keyboard.press('Enter');
      wentAhead = true; lap('team, go');
    }
    if (selected && !open.pending && Date.now() - quietSince > 20000) break;
    await page.waitForTimeout(1000);
  }
  lap(`settled: ${answered} answered`);
  await page.waitForTimeout(3000); // let the last mapping land in the log
  console.log('RUN=' + RUN);
} catch (e) {
  console.error('FAILED:', e.message);
  console.error(logs.split('\n').slice(-20).join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  srv.kill();
}
