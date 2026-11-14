// Her spoken answer, tidied: raw words first, a composed note in her voice after, never delaying the room. Fakes only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-tidy-'));
process.env.THREAD_WARM = '0';
const { tidyAnswer, checkTidy, chooseTidy, alreadyClean } = await import('../lib/tidy.js');
const { interpret } = await import('../lib/interpret.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');
const { initTaste } = await import('../lib/taste.js');

const RAW = "um so the regulars they like they come every morning and uh they hate it when the sourdough's gone by nine";
const TIDY = "The regulars come every morning, and they hate it when the sourdough's gone by nine.";
const task = system => (system.match(/^# Task: ([\w-]+)/m) || [])[1];
const sleep = ms => new Promise(r => setTimeout(r, ms));
function newRun() {
  const run = newRunId(`t-${Math.random().toString(36).slice(2, 8)}`);
  initTaste(run);
  logEvent(run, 'run.start', { mode: 'craft', idea: 'A website for a small bakery.', seat: 'product' });
  logEvent(run, 'candidate', { id: 'c1', seat: 'design', decision: 'What leads the page', options: ['Their usual loaf', 'Today'], recommendation: 'Today', reason: 'r', cost: 'high', undoable: true, attachTo: null });
  logEvent(run, 'ask', { id: 'a1', seat: 'design', by: 'Mika', question: 'What brings someone back to this bakery week after week?', artifact: { kind: 'wires' }, decisionIds: ['c1'] });
  return run;
}

test('a tidy only cleans: never longer, no number she did not say, mostly her own words', () => {
  assert.equal(checkTidy(RAW, TIDY), TIDY);
  assert.equal(checkTidy(RAW, `"${TIDY}"`), TIDY, 'quotes are stripped');
  assert.equal(checkTidy(RAW, TIDY + ' They also want a loyalty card, oat milk and a Saturday tasting menu for families.'), null, 'longer than what she said');
  assert.equal(checkTidy(RAW, "The regulars come every morning; 80% hate it when it's gone by nine."), null, 'a number she never said');
  assert.equal(checkTidy(RAW, 'Loyal patrons arrive daily, frustrated whenever artisan loaves sell out early.'), null, 'a rewrite, not a tidy');
  assert.equal(checkTidy(RAW, ''), null);
  assert.ok(alreadyClean('Fast. Never ask twice.') && !alreadyClean('um fast'));
});

test('tidyAnswer logs the tidy as its own event; her raw answer stays in the log', async () => {
  const run = newRun();
  logEvent(run, 'answer', { askId: 'a1', text: RAW });
  let seen = null;
  const r = await tidyAnswer({ run, askId: 'a1', text: RAW, callModel: async a => { seen = a; return { text: TIDY }; } });
  assert.equal(r.text, TIDY);
  assert.equal(task(seen.system), 'tidy');
  assert.equal(seen.model, 'haiku');
  const evs = readEvents(run);
  assert.equal(evs.find(e => e.type === 'answer').text, RAW);
  assert.equal(evs.find(e => e.type === 'answer.tidy').text, TIDY);
});

test('slow (over the limit) or failed: her raw words stay, silently; the skip is only in the log', async () => {
  const run = newRun();
  const t0 = Date.now();
  const slow = await tidyAnswer({ run, askId: 'a1', text: RAW, limitMs: 200, callModel: async () => { await sleep(1500); return { text: TIDY }; } });
  assert.equal(slow, null);
  assert.ok(Date.now() - t0 < 1000, 'gives up at the limit');
  assert.equal(await tidyAnswer({ run, askId: 'a1', text: RAW, callModel: async () => { throw new Error('down'); } }), null);
  assert.equal(await tidyAnswer({ run, askId: 'a1', text: RAW, callModel: async () => ({ text: 'Something else entirely about croissants and coffee prices today.' }) }), null);
  const evs = readEvents(run);
  assert.ok(!evs.some(e => e.type === 'answer.tidy'));
  assert.equal(evs.filter(e => e.type === 'answer.tidy.skipped').length, 3);
});

test('the tidy never delays the room: the first chime-in lands before a slow tidy, and hears her raw words', async () => {
  const run = newRun();
  const heard = [];
  const callModel = async a => {
    const t = task(a.system);
    if (t === 'tidy') { await sleep(1200); return { text: TIDY }; }
    if (t === 'thread') { heard.push(a.user); return { text: 'Then their usual loaf leads the page, one tap.' }; }
    if (t === 'interpret') return { decisions: [], chimes: [], takeaways: { believe: 'Regulars come for being known.', guidance: 'Their usual loaf first.' } };
    return {};
  };
  const t0 = Date.now();
  const r = await interpret({ run, askId: 'a1', text: RAW, callModel, gapMs: 0, redraw: false });
  assert.equal(r.code, 200);
  const evs = () => readEvents(run);
  const first = evs().find(e => e.type === 'chime');
  assert.ok(first, 'a chime was said');
  assert.ok(first.ms < 1000, `first chime at ${first.ms} ms`);
  assert.ok(!evs().some(e => e.type === 'answer.tidy'), 'the tidy is still on its way when the room has answered');
  assert.ok(heard[0].includes(RAW), 'the chime reads her raw words');
  assert.ok(!('tidy' in JSON.parse(JSON.stringify(r.body))), 'the tidy promise never goes into a response');
  await r.body.tidy;
  const tidyEv = evs().find(e => e.type === 'answer.tidy');
  assert.equal(tidyEv.text, TIDY);
  assert.ok(Date.now() - t0 >= 1200);
});

test('"Use mine" is logged; it needs a tidy to choose against', () => {
  const run = newRun();
  assert.equal(chooseTidy({ run, askId: 'a1', use: 'mine' }).code, 404);
  logEvent(run, 'answer.tidy', { askId: 'a1', text: TIDY });
  assert.deepEqual(chooseTidy({ run, askId: 'a1', use: 'mine' }).body, { use: 'mine' });
  assert.deepEqual(chooseTidy({ run, askId: 'a1', use: 'tidy' }).body, { use: 'tidy' });
  assert.deepEqual(readEvents(run).filter(e => e.type === 'answer.tidy.choice').map(e => e.use), ['mine', 'tidy']);
});
