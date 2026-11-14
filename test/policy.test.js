// Nothing but the selector can ask her. Offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-policy-'));
const { select } = await import('../lib/select.js'); // claims the grantor as it loads
const { ask, refuse, claimGrantor, scanText, questionsIn } = await import('../lib/policy.js');
const { propose } = await import('../lib/teammates.js');
const { readEvents, newRunId } = await import('../lib/events.js');
// newRunId is millisecond-based; two in the same ms collide, so tests add a random part.
const uid = () => `p-${Math.random().toString(36).slice(2, 10)}`;

const cand = id => ({ id, seat: 'engineering', decision: 'Which database', options: ['Postgres', 'SQLite'], recommendation: 'SQLite',
  reason: 'r', cost: 'high', undoable: false, attachTo: null });

test('an ask without the selector\'s grant is refused, decided and logged', () => {
  const run = newRunId(uid());
  assert.equal(ask(run, cand('c1')), null);
  assert.equal(ask(run, cand('c2'), { grant: { run, ids: ['c2'] } }), null); // a look-alike grant
  assert.equal(ask(run, cand('c3'), { grant: Object.freeze({ run, ids: Object.freeze(['c3']) }) }), null); // frozen look-alike
  assert.throws(() => claimGrantor(), /belongs to the selector/); // the selector already holds the only grantor
  const evs = readEvents(run);
  assert.equal(evs.filter(e => e.type === 'ask').length, 0);
  assert.deepEqual(evs.filter(e => e.type === 'ask.refused').map(e => e.id), ['c1', 'c2', 'c3']);
  const d = evs.filter(e => e.type === 'decided');
  assert.equal(d.length, 3);
  assert.ok(d.every(e => e.cites === 'team default' && e.choice === 'SQLite' && e.refused));
});

test('the selector\'s picks go through the door as craft, never phrased as a question', async () => {
  const run = newRunId(uid());
  const c = { ...cand('c1'), seat: 'product', reason: 'Worth it?' };
  const callModel = async ({ system, user }) => /Task: select/.test(system)
    ? { scores: JSON.parse(user).map(x => ({ id: x.id, changes: 3, silent: 3, dupOf: null, kind: 'pin' })) }
    : { decisions: [] };
  const r = await select({ run, idea: 'x', flow: { nodes: [], edges: [] }, taste: [], candidates: [c], callModel });
  assert.equal(r.asks.length, 1);
  assert.equal(r.asks[0].mode, 'craft');
  assert.equal(r.asks[0].why.endsWith('?'), false);
});

test('refuse() can carry the selector\'s cited decision', () => {
  const run = newRunId(uid());
  const d = refuse(run, cand('c9'), 'test', { id: 'c9', seat: 'engineering', decision: 'Which database', choice: 'Postgres', cites: 'L2' });
  assert.equal(d.cites, 'L2');
});

test('a question in plain model text is logged as a stamp', () => {
  const run = newRunId(uid());
  assert.deepEqual(questionsIn('Sketched three screens. Should I add a waitlist? Done.'), ['Should I add a waitlist?']);
  assert.equal(scanText(run, 'design', 'Sketched the class list and the confirm screen.').length, 0);
  scanText(run, 'design', 'Laid out the list.\nDo you want photos on each class?');
  const s = readEvents(run).filter(e => e.type === 'stamp');
  assert.equal(s.length, 1);
  assert.equal(s[0].mode, 'stamp');
  assert.equal(s[0].source, 'design');
});

test('a teammate whose note asks her something costs a stamp', async () => {
  const run = newRunId(uid());
  const callModel = async ({ system }) => ({
    note: /^You are the Design teammate/m.test(system) ? 'Two layouts drafted. Which one do you prefer?' : 'Listed the decisions.',
    candidates: [],
  });
  await propose({ run, idea: 'x', flow: { nodes: [], edges: [] }, taste: [], callModel });
  const s = readEvents(run).filter(e => e.type === 'stamp');
  assert.deepEqual(s.map(e => e.source), ['design']);
});

test('only lib/policy.js writes ask events', () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', '.claude', 'vendor', 'runs', '.git', 'test', 'public', 'docs'].includes(f.name)) continue;
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p); else if (/\.(m?js)$/.test(f.name)) files.push(p);
  } };
  walk(root);
  const offenders = files.filter(f => !f.endsWith(path.join('lib', 'policy.js')) &&
    /logEvent\([^)]*['"`]ask['"`]/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, []);
});
