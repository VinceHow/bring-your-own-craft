#!/usr/bin/env node
// Builds the yoga (or café) page from a FIXED SAMPLE run: Priya's flow, three asks and her answers, her pin and her
// new file line. The sample is written through the real functions (parseFlow, the policy's ask door, writeLine),
// then the real build runs: decideRest against her updated file (a real model call) and the fill (a real model call).
// Prints the timings.
//
//   node scripts/fill-demo.mjs [--runs 3] [--run fill-demo] [--template yoga|cafe] [--sample-decide]
//   --sample-decide: use a fixed re-decision instead of the real decideRest (to time the fill alone).
import fs from 'node:fs';
import path from 'node:path';
import { RUNS_DIR, logEvent } from '../lib/events.js';
import { parseFlow } from '../lib/flow.js';
import { selectorGrant, ask } from '../lib/policy.js';
import { initTaste, writeLine } from '../lib/taste.js';
import { buildRun, _setDecideRest } from '../routes/build.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg('runs', 1));
const RUN = arg('run', 'fill-demo');
const CAFE = arg('template', 'yoga') === 'cafe';

const sample = CAFE ? {
  idea: 'A pre-order page for a café’s morning pastries.',
  lines: ['pastries', 'a pastry', 'confirm', 'ordered', 'regulars → "Order your usual"'],
} : {
  idea: 'A booking page for a small yoga studio.',
  lines: ['classes', 'a class', 'confirm', 'booked', 'regulars → "Book your usual"'],
};

const C = (id, seat, decision, options, recommendation, cost = 'low', attachTo = null) =>
  ({ id, seat, decision, options, recommendation, reason: 'sample run', cost, undoable: true, attachTo });
const candidates = [
  C('c1', 'research', 'Do full classes get a waitlist?', ['Waitlist', 'Show as full'], 'Waitlist', 'high', 'n2'),
  C('c2', 'product', 'How is a regular recognised?', ['Remembered on this device', 'Log in'], 'Remembered on this device', 'high', 'n5'),
  C('c3', 'product', 'How late can a booking be cancelled?', ['Up to 12 hours before', 'Up to 2 hours before'], 'Up to 12 hours before', 'low', 'n4'),
  C('c4', 'product', 'Does cancel ask for a reason?', ['No, one tap', 'Yes, ask for a reason'], 'Yes, ask for a reason'),
  C('c5', 'engineering', 'Ask for a phone number at confirm?', ['No phone field', 'Optional phone field'], 'Optional phone field'),
  C('c6', 'product', 'Does booking need an account?', ['No account', 'Account'], 'No account'),
  C('c7', 'design', 'Where do regulars land?', ['Their usual first', 'The timetable first'], 'Their usual first'),
  C('c8', 'design', 'Offer "remember me on this device"?', ['Yes, remember me', 'No'], 'Yes, remember me'),
];
const answers = [{ askId: 'c1', choice: 'Waitlist' }, { askId: 'c2', choice: 'Remembered on this device' }, { askId: 'c3', choice: 'Up to 2 hours before' }]; // c3: she overrules the team (it said 12 hours)

// --sample-decide: a fixed re-decision (what decideRest should give once her line L3 is in the file).
const sampleDecideRest = () => [
  { id: 'c4', seat: 'product', decision: 'Does cancel ask for a reason?', choice: 'No, one tap', cites: 'L3' },
  { id: 'c5', seat: 'engineering', decision: 'Ask for a phone number at confirm?', choice: 'No phone field', cites: 'L3' },
  { id: 'c6', seat: 'product', decision: 'Does booking need an account?', choice: 'No account', cites: 'L2' },
  { id: 'c7', seat: 'design', decision: 'Where do regulars land?', choice: 'Their usual first', cites: 'L1' },
  { id: 'c8', seat: 'design', decision: 'Offer "remember me on this device"?', choice: 'Yes, remember me', cites: 'L3' },
];

function writeSampleRun() {
  fs.rmSync(path.join(RUNS_DIR, RUN), { recursive: true, force: true });
  logEvent(RUN, 'run.start', { idea: sample.idea, seat: 'product', mode: 'craft', sample: true });
  initTaste(RUN); // the two seed lines, "prepared for the demo"
  sample.lines.forEach((text, i) => logEvent(RUN, 'flow.line', { text, ...parseFlow(sample.lines.slice(0, i + 1)), mode: 'craft' }));
  for (const c of candidates) logEvent(RUN, 'candidate', c);
  const grant = selectorGrant(RUN, answers.map(a => a.askId));
  for (const id of grant.ids) ask(RUN, candidates.find(c => c.id === id), { grant, kind: id === 'c2' ? 'pin' : 'fork', why: 'sample run', source: 'fill-demo' });
  for (const a of answers) logEvent(RUN, 'answer', { ...a, mode: 'craft' });
  logEvent(RUN, 'pin', { nodeId: 'n3', text: 'Cut the phone field. Name\'s enough; regulars hate forms.', mode: 'craft' });
  const line = writeLine(RUN, 'Never ask for anything you could remember or skip.');
  logEvent(RUN, 'taste.written', { ...line, reworded: true, mode: 'craft' });
}

if (process.argv.includes('--sample-decide')) _setDecideRest(sampleDecideRest);
const times = [];
for (let i = 0; i < N; i++) {
  writeSampleRun();
  const r = await buildRun(RUN);
  times.push(r);
  const cites = r.decided.map(d => `${d.id}:${d.cites}`).join(' ');
  console.log(`build ${i + 1}: total ${r.ms} ms (decideRest ${r.decideMs} ms, fill call ${r.fillMs} ms), ${r.template} -> ${r.url}  [${cites}]`);
}
// --shots: serve with the real server on PORT (3400) and screenshot the built page, desktop and phone, to
// docs/screens/page-<template>-*.png. Also books once through the page's own form, to see /api/book answer.
if (process.argv.includes('--shots')) {
  const PORT = Number(process.env.PORT || 3400);
  const { default: server } = await import('../server.js');
  await new Promise(r => server.listen(PORT, r));
  const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const out = path.resolve('docs/screens'); fs.mkdirSync(out, { recursive: true });
  const t = CAFE ? 'cafe' : 'yoga';
  const url = `http://localhost:${PORT}${times.at(-1).url}`;
  for (const [tag, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, `page-${t}-${tag}.png`) });
    await page.locator('#decided').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `page-${t}-${tag}-decided.png`) });
    if (tag === 'desktop') {
      await page.screenshot({ path: path.join(out, `page-${t}-${tag}-full.png`), fullPage: true });
      await page.fill('#f-name', 'Priya'); await page.fill('#f-email', 'priya@studio.example');
      const [resp] = await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/book')), page.click('form.form [type=submit]')]);
      await page.waitForTimeout(600);
      console.log(`booked through the page: ${resp.status()} ${JSON.stringify(await resp.json())}; status line: "${await page.locator('[data-form-status]').textContent()}"`);
      await page.locator('#confirm').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, `page-${t}-${tag}-booked.png`) });
    }
    await page.close();
  }
  await browser.close(); server.close();
  console.log(`screens in ${path.relative(process.cwd(), out)}/page-${t}-*.png`);
}
if (N > 1) {
  const stat = k => { const f = times.map(t => t[k]).sort((a, b) => a - b); return `min ${f[0]}, median ${f[Math.floor(f.length / 2)]}, max ${f[f.length - 1]}`; };
  console.log(`n=${N}, backend ${process.env.MODEL_BACKEND || 'claude-code'}, fill model ${process.env.FILL_MODEL || 'sonnet'}`);
  console.log(`fill call ms: ${stat('fillMs')}`);
  console.log(`decideRest ms: ${stat('decideMs')}`);
  console.log(`total ms: ${stat('ms')}`);
}
