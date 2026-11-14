// Her private profile and her name tag from her intro. Offline: a fake model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-profile-'));
const { buildProfile, updateProfile, readProfile, formatProfile, FIELDS } = await import('../lib/profile.js');
const { logEvent, readEvents, newRunId, RUNS_DIR } = await import('../lib/events.js');
const { nameTag } = await import('../lib/tag.js');

const task = system => (system.match(/^# Task: ([\w-]+)/m) || [])[1];
const P = (over = {}) => Object.fromEntries(FIELDS.map(f => [f, { text: `${f} of hers`, confidence: 'medium', ...(over[f] || {}) }]));
const newRun = (extra = {}) => { const run = newRunId(`p-${Math.random().toString(36).slice(2, 8)}`);
  logEvent(run, 'run.start', { mode: 'craft', idea: 'A booking page for a small yoga studio.', seat: 'product', ...extra }); return run; };

test('built once from her intro and idea; kept in profile.json; the log never carries what it says', async () => {
  const run = newRun({ intro: 'I love working on the customer journey' });
  let seen;
  const p = await buildProfile(run, { callModel: async a => { seen = a; return P({ strengths: { text: 'customer journeys', confidence: 'high' } }); } });
  assert.equal(task(seen.system), 'profile');
  assert.match(seen.system, /I love working on the customer journey/);
  assert.match(seen.system, /small yoga studio/);
  assert.deepEqual(Object.keys(p).filter(k => FIELDS.includes(k)), FIELDS);
  assert.equal(readProfile(run).strengths.text, 'customer journeys');
  assert.ok(fs.existsSync(path.join(RUNS_DIR, run, 'profile.json')));
  const ev = readEvents(run).find(e => e.type === 'profile.built');
  assert.ok(ev && !JSON.stringify(ev).includes('customer journeys'), 'never shown: not in the log');
  assert.match(formatProfile(p), /- Her strengths \(high\): customer journeys/);
});

test('updated after an answer: the previous profile and her words go in; fields she did not touch are kept', async () => {
  const run = newRun({ intro: 'x' });
  await buildProfile(run, { callModel: async () => P() });
  let seen;
  const p = await updateProfile(run, { question: 'What makes someone come back?', answer: 'Knowing their spot is theirs.' },
    { callModel: async a => { seen = a; return { ...P({ customers: { text: 'regulars on a weekly class', confidence: 'high' } }), brandFeel: { text: '', confidence: 'low' } }; } });
  assert.match(seen.system, /What the team believed so far/);
  assert.match(seen.system, /Knowing their spot is theirs/);
  assert.equal(p.customers.text, 'regulars on a weekly class');
  assert.equal(p.brandFeel.text, 'brandFeel of hers', 'an empty field keeps what the team believed');
  assert.equal(p.version, 2);
  assert.ok(readEvents(run).some(e => e.type === 'profile.updated'));
});

test('a failed call: logged, and the team works without it (never waited on)', async () => {
  const run = newRun();
  assert.equal(await buildProfile(run, { callModel: async () => { throw new Error('down'); } }), null);
  assert.equal(readProfile(run), null);
  assert.ok(readEvents(run).some(e => e.type === 'profile.error'));
  assert.match(formatProfile(null), /assume, and keep moving/);
});

test('her name tag from her intro knows her seat: in Product, her craft is Product unless she says otherwise', async () => {
  let seen;
  const r = await nameTag('I love working on the customer journey, understanding the problems customers face', {
    seat: 'product', callModel: async a => { seen = a; return { craft: 'Product manager', goodAt: 'understanding the problems customers face', loves: 'working on the customer journey' }; } });
  assert.match(seen.user, /Her seat at the table: Product/);
  assert.equal(r.body.craft, 'Product', 'her seat, in code, whatever the model calls it');
  const diy = await nameTag("I'm good at mixing dough", { seat: 'diy', callModel: async a => { seen = a; return { craft: 'Baker', goodAt: 'mixing dough', loves: '' }; } });
  assert.ok(!/Her seat/.test(seen.user), 'her own craft: no seat hint');
  assert.equal(diy.body.craft, 'Baker');
});
