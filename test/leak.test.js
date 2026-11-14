// The leak test (BRIEF §4): a full run through the HTTP API with MODEL_BACKEND=fal and a sentinel key, against a
// fake fal (fetch is stubbed for fal.run only). The fake is hostile: it echoes the key back in its replies and in an
// error. Assert the sentinel appears nowhere in runs/, the console, or any HTTP response (SSE included). Offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const SENTINEL = 'fal-SENTINEL-8f3a1c9e2b7d4f60:abcdef0123456789';
process.env.MODEL_BACKEND = 'fal';
process.env.FAL_KEY = SENTINEL;
process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-leak-'));

// ---- the hostile fake fal ----
const seenAuth = [];
let calls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  if (!String(url).startsWith('https://fal.run/')) return realFetch(url, init);
  calls++;
  const auth = init.headers?.Authorization || '';
  seenAuth.push(auth);
  if (calls === 1) return new Response(`{"error":"bad key ${auth}"}`, { status: 401 }); // echo the key in an error
  const { messages } = JSON.parse(init.body);
  const system = messages[0].content, user = messages[1].content;
  const t = (system.match(/^# Task: ([\w-]+)/m) || [])[1];
  let out;
  if (t === 'teammate') out = { note: `Worked with ${auth} and ${SENTINEL}.`, candidates: [1, 2, 3].map(i => ({
    decision: ['Who it is for', 'Payment', 'Cancelling'][i - 1], options: ['A', 'B'], recommendation: 'A',
    reason: `because ${SENTINEL} and ${auth}`, cost: 'high', undoable: true, attachTo: `n${i}`, usesFinding: false })) };
  else if (t === 'select') out = { scores: JSON.parse(user).map(c => ({ id: c.id, inSeat: true, changes: 3, silent: 3, big: 3, hers: 3, dupOf: null, kind: 'fork', question: `What does ${c.decision.toLowerCase()} mean to ${c.id}?` })) };
  else if (t === 'decide') out = { decisions: JSON.parse(user).map(c => ({ id: c.id, choice: 'A', cites: SENTINEL })) };
  else if (t === 'sounds-like') out = { text: `Sounds like: never ask for ${SENTINEL}.` };
  else out = { error: `unknown task, key ${auth}` };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(out) } }] }), { status: 200 });
};

// ---- capture everything printed ----
const printed = [];
for (const k of ['log', 'error', 'warn', 'info', 'debug']) {
  const orig = console[k];
  console[k] = (...a) => { printed.push(a.map(String).join(' ')); return orig.apply(console, a.map(x => String(x).split(SENTINEL).join('[sentinel]'))); };
}
const errWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...rest) => { printed.push(String(chunk)); return errWrite(chunk, ...rest); };

const { default: server } = await import('../server.js');

function request(port, method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const req = http.request({ port, method, path: p, headers: data ? { 'Content-Type': 'application/json' } : {} }, res => {
      let s = ''; res.on('data', d => (s += d)); res.on('end', () => resolve({ status: res.statusCode, headers: JSON.stringify(res.headers), text: s }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
function walk(d, out = []) {
  if (!fs.existsSync(d)) return out;
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

test('the fal key appears nowhere: runs/, console, HTTP responses, SSE', async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  let sse = '';
  const sseReq = http.get({ port, path: '/events' }, res => res.on('data', d => (sse += d)));
  const responses = [];
  const call = async (m, p, b) => { const r = await request(port, m, p, b); responses.push(r); return r; };
  try {
    await call('GET', '/api/health');
    const { run } = JSON.parse((await call('POST', '/api/run', { idea: 'A booking page for a small yoga studio.' })).text);
    for (const text of ['classes', 'a class', 'confirm', 'booked']) await call('POST', `/api/run/${run}/line`, { text });
    const prop = await call('POST', `/api/run/${run}/propose`, { wait: true });
    assert.equal(prop.status, 200, prop.text);
    const p = JSON.parse(prop.text);
    assert.equal(p.came, 18); // six seats x 3
    assert.equal(p.brought, 3);
    await call('POST', `/api/run/${run}/answer`, { askId: p.asks[0].id, choice: 'B' });
    const pin = await call('POST', `/api/run/${run}/pin`, { nodeId: 'n3', text: 'Never ask for a phone number. Regulars hate it.' });
    assert.equal(pin.status, 200, pin.text);
    const kept = JSON.parse(pin.text).soundsLike;
    await call('POST', `/api/run/${run}/taste`, { text: kept });
    const tally = JSON.parse((await call('GET', `/api/run/${run}/tally`)).text);
    assert.deepEqual([tally.came, tally.brought], [18, 3]);
    assert.ok(tally.reasons.filter(r => r.kind === 'decided').every(r => r.cites === 'team default')); // its bogus cite was rejected
    await call('POST', '/api/select-for-idea', { idea: "A pre-order page for a café's morning pastries." });
    await call('POST', `/api/run/${run}/propose`, { wait: true }); // 409, still scrubbed
    await call('GET', `/api/run/${run}/sketches`); // not ours: falls through to static 404
  } finally {
    await new Promise(r => setTimeout(r, 50));
    sseReq.destroy();
    server.closeAllConnections?.();
    await new Promise(r => server.close(r));
  }

  // The key really was used, and the fake really echoed it.
  assert.ok(calls > 5);
  assert.ok(seenAuth.every(a => a === `Key ${SENTINEL}`));

  const leaks = [];
  for (const f of [...walk(process.env.RUNS_DIR), ...walk(path.resolve('runs'))]) {
    if (fs.readFileSync(f, 'utf8').includes(SENTINEL)) leaks.push(`file ${f}`);
  }
  responses.forEach((r, i) => { if ((r.text + r.headers).includes(SENTINEL)) leaks.push(`response ${i}: ${r.text.slice(0, 120)}`); });
  if (sse.includes(SENTINEL)) leaks.push('SSE stream');
  if (printed.some(s => s.includes(SENTINEL))) leaks.push('console/stderr');
  assert.deepEqual(leaks, []);
  assert.ok(walk(process.env.RUNS_DIR).some(f => f.endsWith('events.jsonl')));
  assert.ok(sse.includes('"type":"ask"'));
  // The hostile echoes did reach our code and were scrubbed on the way out (so the test can see a leak).
  assert.ok(walk(process.env.RUNS_DIR).some(f => fs.readFileSync(f, 'utf8').includes('[key]')));
});
