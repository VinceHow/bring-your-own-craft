import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { fillPage, loadTemplate } = await import(process.cwd() + '/lib/fill.js');
const out = process.argv[2]; fs.rmSync(out, { recursive: true, force: true });
const tpl = loadTemplate('bakery');
// What the audit saw the model write (docs/AUDIT.md F9), stubbed: email and how-many on, "A text arrives", regulars not first.
const call = async () => ({ words: { ...tpl.defaults.words, orderedBody: 'A text arrives once your loaf is set aside. Collect it warm on your way to work.', cutoffLine: 'Order by 8pm for the next morning’s bake.' },
  steps: ['bread', 'regulars', 'loaf', 'confirm', 'ordered'], switches: { ...tpl.defaults.switches, regularsFirst: false, email: true, quantity: true, phone: false },
  decidedShown: [{ id: 'd1', label: 'Five choices' }] });
const answers = [{ askId: 'first', text: 'Regulars first. Nothing to fill in: no account, no payment now, their loaf waits at the counter under their first name.' }];
await fillPage({ run: 'f9-stub', outDir: out, idea: 'A website for a small bakery, so customers can order bread ahead.', answers, taste: [], decided: [{ id: 'd1', seat: 'design', decision: 'x', choice: 'y', cites: 'team default' }], template: 'bakery', call });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file://' + out + '/index.html'); await p.waitForTimeout(800);
const txt = await p.evaluate(() => document.body.innerText);
console.log(JSON.stringify({ email: /Email/.test(txt), howMany: /How many/.test(txt), text: /A text arrives/.test(txt), decided: /Decided for you/.test(txt), firstName: /First name/.test(txt),
  order: await p.evaluate(() => [...document.querySelectorAll('section[data-step]')].map(s => s.dataset.step).join(',')) }));
await p.screenshot({ path: process.argv[3] + '/her-page-1440-top.jpg', type: 'jpeg', quality: 60 });
await p.evaluate(() => document.getElementById('confirm')?.scrollIntoView()); await p.waitForTimeout(400);
await p.screenshot({ path: process.argv[3] + '/her-page-1440-form.jpg', type: 'jpeg', quality: 60 });
await b.close();
