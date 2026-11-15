// Her answer in pieces: each piece raw first, then tidied in her voice in the background; Send gathers, never waits. Fakes only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-tidy-'));
process.env.THREAD_WARM = '0';
const T = await import('../lib/tidy.js');
const { addPiece, removePiece, choosePiece, gatherPieces, checkTidy, alreadyClean, tidyText } = T;
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

const good = async a => (task(a.system) === 'tidy' ? { text: TIDY } : {});

test('each piece is logged raw, then tidied as its own event; Send gathers the tidy', async () => {
  const run = newRun();
  let seen = null;
  const r = addPiece({ run, askId: 'a1', pieceId: 'p1', text: RAW, callModel: async a => { seen = a; return { text: TIDY }; } });
  assert.equal(r.code, 202);
  assert.equal(readEvents(run).find(e => e.type === 'answer.piece').text, RAW, 'raw first, at once');
  await r.tidy;
  assert.equal(task(seen.system), 'tidy');
  assert.equal(seen.model, 'haiku');
  assert.equal(readEvents(run).find(e => e.type === 'answer.piece.tidy').text, TIDY);
  assert.deepEqual(gatherPieces(readEvents(run), 'a1', ['p1']), { text: TIDY, pieces: [{ pieceId: 'p1', used: 'tidy' }] });
});

test('Send never waits: a piece still being tidied goes in as she said it; "Use mine" keeps her words', async () => {
  const run = newRun();
  await addPiece({ run, askId: 'a1', pieceId: 'p1', text: RAW, callModel: good }).tidy;
  const slow = addPiece({ run, askId: 'a1', pieceId: 'p2', text: 'and uh the weekend crowd they like they want the croissants still warm', callModel: async () => { await sleep(800); return { text: 'The weekend crowd wants the croissants still warm.' }; } });
  const g = gatherPieces(readEvents(run), 'a1', ['p1', 'p2']);
  assert.deepEqual(g.pieces.map(p => p.used), ['tidy', 'raw']);
  assert.ok(g.text.startsWith(TIDY) && g.text.endsWith('croissants still warm'));
  await slow.tidy;
  assert.equal(choosePiece({ run, askId: 'a1', pieceId: 'p1', use: 'mine' }).code, 200);
  assert.deepEqual(gatherPieces(readEvents(run), 'a1', ['p1']).pieces, [{ pieceId: 'p1', used: 'raw' }]);
  assert.equal(choosePiece({ run, askId: 'a1', pieceId: 'nope', use: 'mine' }).code, 404);
});

test('a removed or redone piece ignores its pending tidy', async () => {
  const run = newRun();
  const late = async () => { await sleep(300); return { text: TIDY }; };
  const a = addPiece({ run, askId: 'a1', pieceId: 'p1', text: RAW, callModel: late });
  removePiece({ run, askId: 'a1', pieceId: 'p1' });
  await a.tidy;
  assert.ok(!readEvents(run).some(e => e.type === 'answer.piece.tidy'), 'removed: its tidy is never logged');
  assert.deepEqual(gatherPieces(readEvents(run), 'a1', ['p1']).pieces, [], 'and it is not gathered');
  // Redo: same piece, new words; the old tidy (of the old words) is ignored.
  const b = addPiece({ run, askId: 'a1', pieceId: 'p2', text: RAW, callModel: late });
  addPiece({ run, askId: 'a1', pieceId: 'p2', text: 'Regulars come every morning before work.', callModel: good });
  await b.tidy;
  const g = gatherPieces(readEvents(run), 'a1', ['p2']);
  assert.equal(g.text, 'Regulars come every morning before work.');
});

test('slow (over the limit) or failed: her raw words stay, silently; the skip is only in the log', async () => {
  const run = newRun();
  const t0 = Date.now();
  await addPiece({ run, askId: 'a1', pieceId: 'p1', text: RAW, limitMs: 200, callModel: async () => { await sleep(1500); return { text: TIDY }; } }).tidy;
  assert.ok(Date.now() - t0 < 1000, 'gives up at the limit');
  await addPiece({ run, askId: 'a1', pieceId: 'p2', text: RAW, callModel: async () => { throw new Error('down'); } }).tidy;
  await addPiece({ run, askId: 'a1', pieceId: 'p3', text: RAW, callModel: async () => ({ text: 'Something else entirely about croissants and coffee prices today.' }) }).tidy;
  const evs = readEvents(run);
  assert.ok(!evs.some(e => e.type === 'answer.piece.tidy'));
  assert.equal(evs.filter(e => e.type === 'answer.piece.tidy.skipped').length, 3);
  assert.deepEqual(gatherPieces(evs, 'a1', ['p1', 'p2', 'p3']).pieces.map(p => p.used), ['raw', 'raw', 'raw']);
});

test('Send: one gathered comment is the answer; only it reaches the chimes and takeaways; the room is quiet before', async () => {
  const run = newRun();
  const calls = [];
  const callModel = async a => {
    const t = task(a.system); calls.push(t);
    if (t === 'tidy') return { text: TIDY };
    if (t === 'thread') return { text: 'Then their usual loaf leads the page, one tap.' };
    if (t === 'interpret') return { decisions: [], chimes: [], takeaways: { believe: 'Regulars come for being known.', guidance: 'Their usual loaf first.' } };
    return {};
  };
  await addPiece({ run, askId: 'a1', pieceId: 'p1', text: RAW, callModel }).tidy;
  assert.deepEqual(calls, ['tidy'], 'while she captures, no teammate is called');
  const r = await interpret({ run, askId: 'a1', pieces: ['p1'], text: 'Show it on the page first.', callModel, gapMs: 0, redraw: false });
  assert.equal(r.code, 200);
  const evs = readEvents(run);
  const answer = evs.find(e => e.type === 'answer');
  assert.equal(answer.text, `${TIDY} Show it on the page first.`, 'the tidy where ready, plus what she had not added yet');
  assert.deepEqual(answer.pieces.map(p => [p.pieceId, p.used]), [['p1', 'tidy'], ['p-send', 'raw']]);
  assert.equal(evs.filter(e => e.type === 'answer').length, 1);
  const firstChime = evs.find(e => e.type === 'chime');
  assert.ok(firstChime && firstChime.ms < 1000, 'the first reply right after Send');
  assert.equal(addPiece({ run, askId: 'a1', pieceId: 'p9', text: 'late', callModel }).code, 409, 'no pieces after Send');
});

test('tidyText, shared (her name-tag sentence): the tidy, or her raw words on any failure; no run needed', async () => {
  const ok = await tidyText({ text: RAW, callModel: async () => ({ text: TIDY }) });
  assert.deepEqual({ text: ok.text, tidied: ok.tidied }, { text: TIDY, tidied: true });
  const t0 = Date.now();
  const slow = await tidyText({ text: RAW, limitMs: 200, callModel: async () => { await sleep(1500); return { text: TIDY }; } });
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(slow.text, RAW); assert.equal(slow.tidied, false);
  assert.equal((await tidyText({ text: RAW, callModel: async () => { throw new Error('down'); } })).text, RAW);
  assert.equal((await tidyText({ text: RAW, callModel: async () => ({ text: 'Croissants and coffee prices today, nothing she said.' }) })).text, RAW);
  const short = 'I love bread.';
  assert.equal((await tidyText({ text: short, callModel: async () => { throw new Error('never called'); } })).text, short);
});

test('a tidy that only changes case or punctuation keeps her words; a lower-case fragment stays lower-case', async () => {
  const raw = 'getting the journey right before anyone draws a screen, always';
  const r = await tidyText({ text: raw, callModel: async () => ({ text: 'Getting the journey right before anyone draws a screen, always.' }) });
  assert.equal(r.text, raw); assert.equal(r.tidied, false);
  const frag = 'getting the um journey right before anyone uh draws a screen';
  const f = await tidyText({ text: frag, callModel: async () => ({ text: 'Getting the journey right before anyone draws a screen.' }) });
  assert.equal(f.tidied, true);
  assert.equal(f.text, 'getting the journey right before anyone draws a screen.');
});

// Her own line is hers word for word (14 Nov, the fal backend): "I love getting the journey right…" came back as
// "I love get the journey right…" and went into her file. For the intro, a tidy that changes a word is refused and
// her raw words stand, on any backend; the Terminal says so once, without her words.
test('the intro: a tidy that changes her words keeps her raw words; one that only cleans is taken', async () => {
  const { tidyText } = await import('../lib/tidy.js');
  const raw = 'I love getting the journey right before anyone draws a screen, you know, before the first box';
  const errs = [], orig = console.error;
  console.error = (...a) => errs.push(a.join(' '));
  let r;
  try { r = await tidyText({ text: raw, field: 'intro', callModel: async () => ({ text: 'I love get the journey right before anyone draws a screen, before the first box.' }) }); }
  finally { console.error = orig; }
  assert.deepEqual([r.text, r.tidied, r.reason], [raw, false, 'changed words']);
  assert.deepEqual(errs, ['[model] tidy changed words, kept raw'], 'one line, none of her words');
  const ok = await tidyText({ text: raw, field: 'intro', callModel: async () => ({ text: 'I love getting the journey right before anyone draws a screen, before the first box.' }) });
  assert.equal(ok.tidied, true, 'dropping "you know" is a clean tidy');
  // every surface now (an answer piece too): a changed word is refused
  const piece = await tidyText({ text: raw, callModel: async () => ({ text: 'I love get the journey right before anyone draws a screen, before the first box.' }) });
  assert.equal(piece.tidied, false);
});

// Her words are cleaned, never reworded (Vincent, 15 Nov): deletion-only, on every surface.
test('the guard is deletion-only: cuts and punctuation pass; a swapped or added word is refused', () => {
  const { deletionOnly, checkTidy } = T;
  const raw = 'um so the idea is, uh, a website for, for a small bakery so people can like order bread ahead';
  assert.equal(checkTidy(raw, 'A website for a small bakery so people can order bread ahead.'), 'A website for a small bakery so people can order bread ahead.');
  assert.equal(deletionOnly(raw, 'A website for a small bakery, so people can order bread ahead!'), true, 'punctuation and capitals');
  assert.equal(checkTidy(raw, 'A site for a small bakery so people can order bread ahead.'), null, 'website -> site: a swap');
  assert.equal(checkTidy(raw, 'A website for a small local bakery so people can order bread ahead.'), null, 'an added word');
  assert.equal(checkTidy(raw, 'A small bakery website so people can order bread ahead.'), null, 'reordered');
  assert.equal(checkTidy('I love getting the journey right', 'I love get the journey right.'), null, 'getting -> get (the recorded fal case)');
  assert.equal(checkTidy(raw, ''), null);
});

test('lead-ins are dropped: a short line with "The idea is:" still goes to the tidy, and the cut passes', async () => {
  const { alreadyClean, tidyText } = T;
  assert.equal(alreadyClean('The idea is: a bakery site'), false);
  assert.equal(alreadyClean('A bakery site for regulars'), true);
  const r = await tidyText({ text: 'The idea is: a bakery site for regulars', callModel: async () => ({ text: 'A bakery site for regulars.' }) });
  assert.deepEqual([r.tidied, r.text], [true, 'A bakery site for regulars.']);
});
