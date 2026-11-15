// The app button's "what changed" line (routes/build.js whatChanged): plain words for the page's switches that
// differ from the last version (v1: from the template's defaults), at most three; never her text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-appbtn-'));
const { whatChanged } = await import('../routes/build.js');

test('what changed: v1 against the defaults, v2 against v1; the cut-off says its own line', () => {
  const defaults = { phone: true, remember: true, cutoff: false, standingOrder: true };
  const v1 = { phone: false, remember: true, cutoff: true, standingOrder: true };
  assert.deepEqual(whatChanged(v1, defaults, { cutoffLine: 'Order by 8pm for tomorrow' }), ['no phone field', 'Order by 8pm for tomorrow']);
  assert.deepEqual(whatChanged({ ...v1, remember: false }, v1, {}, true), ['remembers no one']);
  assert.deepEqual(whatChanged(v1, v1, {}, true), ['same calls, fresh words']);
  assert.deepEqual(whatChanged(defaults, defaults), ['the template as the team agreed it']);
  const many = { phone: false, remember: false, cutoff: true, standingOrder: false };
  assert.equal(whatChanged(many, defaults).length, 3, 'at most three');
});

// The background v1 and the press (audit F1 reconciled): one build at a time per run, never a 409 for "already
// building", a press during the v1 queues the next version, a second press joins the queued one, and a background v1
// after anything is built is skipped.
test('builds queue: background v1, then a press during it becomes the next build; no 409, nothing doubled', async () => {
  const { default: routes, _setBuild } = await import('../routes/build.js');
  const { logEvent } = await import('../lib/events.js');
  const route = routes.find(r => r.method === 'POST');
  const run = 'run-2026-11-15T09-00-00-000Z-qbld';
  fs.mkdirSync(path.join(process.env.RUNS_DIR, run), { recursive: true });
  logEvent(run, 'run.start', { idea: 'A website for a small bakery', seat: 'product' });
  const log = []; let n = 0;
  _setBuild(async (r, { background }) => { const v = ++n; log.push(`start v${v}${background ? ' bg' : ''}`); await new Promise(f => setTimeout(f, 80)); logEvent(r, 'build.done', { version: v, ...(background ? { background: true } : {}) }); log.push(`done v${v}`); return { version: v }; });
  const post = body => new Promise(resolve => { const res = { writeHead(c) { this.code = c; }, end(b) { resolve({ code: this.code, body: JSON.parse(b || '{}') }); }, setHeader() {} };
    route.handler({}, res, { url: new URL(`http://x/api/run/${run}/build`), body }); });
  try {
    const [bg, press1, press2] = await Promise.all([post({ background: true }), new Promise(r => setTimeout(r, 10)).then(() => post({})), new Promise(r => setTimeout(r, 20)).then(() => post({}))]);
    assert.deepEqual([bg.code, press1.code, press2.code], [200, 200, 200], 'no 409');
    assert.equal(bg.body.version, 1); assert.equal(press1.body.version, 2); assert.equal(press2.body.version, 2, 'the second press joins the queued build');
    assert.deepEqual(log, ['start v1 bg', 'done v1', 'start v2', 'done v2'], 'one at a time, never overlapping');
    assert.equal((await post({ background: true })).body.skipped, 'already built or building', 'a late background v1 adds nothing');
  } finally { _setBuild(null); }
});
