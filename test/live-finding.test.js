// Noor's live finding (lib/live-finding.js): searched with Linkup in the background, shown only when VERIFIED (a quoted
// line that is an exact substring of the returned source, its URL, site and the date read), labelled "found just now
// with Linkup"; otherwise the prepared finding stays. Never awaited by Focus 1. Offline: a fake fetch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-live-'));
const { pickQuote, verified, searchFinding, startLiveFinding, LIVE_LABEL, query } = await import('../lib/live-finding.js');
const { firstAsk } = await import('../lib/first.js');
const { logEvent, readEvents, newRunId } = await import('../lib/events.js');
const { initTaste } = await import('../lib/taste.js');

const BAKERY = "An ordering website for my friend's small bakery, so customers can order bread ahead";
const SOURCE = 'Bakeries are busy places. A third (33%) of shoppers who visit artisan bakeries buy bread there at least once a week, the survey found. Prices rose.';
const QUOTE = 'A third (33%) of shoppers who visit artisan bakeries buy bread there at least once a week, the survey found.';
const ok = results => async () => ({ ok: true, status: 200, json: async () => ({ results }) });
const newRun = () => { const run = newRunId(`l-${Math.random().toString(36).slice(2, 10)}`); initTaste(run);
  logEvent(run, 'run.start', { mode: 'craft', idea: BAKERY, seat: 'product', stagePath: true }); return run; };
const PREPARED = { title: 'Prepared', quote: 'prepared quote', url: 'https://example.org/p', site: 'Example', fetched: '2026-11-14', label: 'researched before the demo' };

test('the quote is cut from the returned content itself, so it is an exact substring; markup and entities never quoted', () => {
  const p = pickQuote([{ name: 'Report', url: 'https://bakery.example.org/r', content: SOURCE },
    { name: 'Noise', url: 'https://x.example.org', content: 'Customers &amp; regulars love it every week, said the owner in a long statement here.' }]);
  assert.equal(p.quote, QUOTE);
  assert.ok(SOURCE.includes(p.quote));
  assert.equal(p.url, 'https://bakery.example.org/r');
  assert.match(query(BAKERY, ['Morning regulars']), /bakery.*Morning regulars/);
});

test('verified: url, date read and an exact substring of the source; one changed character fails', () => {
  const f = { quote: QUOTE, url: 'https://bakery.example.org/r', fetched: '2026-11-15' };
  assert.ok(verified(f, SOURCE));
  assert.ok(!verified({ ...f, quote: QUOTE.replace('33%', '34%') }, SOURCE));
  assert.ok(!verified({ ...f, url: '' }, SOURCE));
  assert.ok(!verified({ ...f, fetched: '' }, SOURCE));
});

test('the verified path: finding.live with the source, site, date read and the live label; Focus 1 raised after it carries it', async () => {
  const run = newRun();
  const r = await startLiveFinding(run, { fetchImpl: ok([{ name: 'Artisan bakery report', url: 'https://www.bakery.example.org/r', content: SOURCE }]) });
  assert.ok(r.ref);
  const ev = readEvents(run).find(e => e.type === 'finding.live');
  assert.deepEqual([ev.askId, ev.ref.quote, ev.ref.site, ev.ref.label], ['first', QUOTE, 'bakery.example.org', LIVE_LABEL]);
  assert.match(ev.ref.fetched, /^\d{4}-\d{2}-\d{2}$/);
  logEvent(run, 'sketch.done', { seat: 'design', users: ['Morning regulars'] });
  const a = firstAsk({ run, finding: PREPARED });
  assert.equal(a.code, 200);
  assert.equal(a.body.artifact.ref.quote, QUOTE, 'the live finding, not the prepared one');
  assert.equal(a.body.artifact.ref.label, LIVE_LABEL);
});

test('the unverifiable path: nothing quotable -> finding.none, and Focus 1 keeps the prepared finding', async () => {
  const run = newRun();
  const r = await startLiveFinding(run, { fetchImpl: ok([{ name: 'x', url: 'https://x.example.org', content: 'Short. Nothing about anyone.' }]) });
  assert.ok(!r.ref && r.why);
  assert.ok(readEvents(run).some(e => e.type === 'finding.none'));
  assert.ok(!readEvents(run).some(e => e.type === 'finding.live'));
  logEvent(run, 'sketch.done', { seat: 'design', users: ['Morning regulars'] });
  assert.equal(firstAsk({ run, finding: PREPARED }).body.artifact.ref.label, 'researched before the demo');
});

test('the timeout path: a hung search ends as finding.none (timeout); a failed status too; the prepared one stays', async () => {
  const hang = (url, { signal }) => new Promise((_, rej) => { const keep = setTimeout(() => {}, 2000); // a held connection
    signal.addEventListener('abort', () => { clearTimeout(keep); rej(Object.assign(new Error('aborted'), { name: 'TimeoutError' })); }); });
  const t = await searchFinding({ idea: BAKERY, fetchImpl: hang, timeoutMs: 50 });
  assert.equal(t.why, 'timeout');
  const s = await searchFinding({ idea: BAKERY, fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }) });
  assert.equal(s.why, 'linkup 401');
});

test('Focus 1 never waits: startLiveFinding returns at once, and Focus 1 can be raised before the search settles', async () => {
  const run = newRun();
  let release; const slow = () => new Promise(res => { release = () => res({ ok: true, status: 200, json: async () => ({ results: [] }) }); });
  const t0 = Date.now(); const p = startLiveFinding(run, { fetchImpl: slow });
  assert.ok(Date.now() - t0 < 50);
  logEvent(run, 'sketch.done', { seat: 'design', users: ['Morning regulars'] });
  assert.equal(firstAsk({ run, finding: PREPARED }).body.artifact.ref.label, 'researched before the demo');
  release(); await p;
});

test('a non-bakery idea or a second start never searches; the key is never in the log', async () => {
  const run = newRunId(`l-${Math.random().toString(36).slice(2, 10)}`); initTaste(run);
  logEvent(run, 'run.start', { mode: 'craft', idea: 'A booking page for a yoga studio', stagePath: true });
  assert.equal(startLiveFinding(run, { fetchImpl: ok([]) }), null);
  const r2 = newRun(); await startLiveFinding(r2, { fetchImpl: ok([{ name: 'r', url: 'https://b.example.org', content: SOURCE }]) });
  assert.equal(startLiveFinding(r2, { fetchImpl: ok([]) }), null, 'once per run');
  const raw = fs.readFileSync(path.join(process.env.RUNS_DIR, r2, 'events.jsonl'), 'utf8');
  assert.ok(!/Bearer|LINKUP_API_KEY|placeholder/.test(raw));
});
