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
  const p = await buildProfile(run, { callModel: async a => { seen = a; return { ...P({ strengths: { text: 'customer journeys', confidence: 'high' } }),
    domains: ['Target customer', 'customer problem', 'User journey.', 'target customer'] }; } });
  assert.deepEqual(p.domains, ['target customer', 'customer problem', 'user journey'], 'her domains, clean, for the selector');
  assert.match(seen.system, /domains: 2 to 4 areas that are hers/);
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
  assert.deepEqual(p.domains, [], 'no domains from either call: empty, so the selector falls back to her seat');
  assert.ok(readEvents(run).some(e => e.type === 'profile.updated'));
});

test('a failed call: logged, and the team works without it (never waited on)', async () => {
  const run = newRun();
  assert.equal(await buildProfile(run, { callModel: async () => { throw new Error('down'); } }), null);
  assert.equal(readProfile(run), null);
  assert.ok(readEvents(run).some(e => e.type === 'profile.error'));
  assert.match(formatProfile(null), /assume, and keep moving/);
});

test('her character card: the team\'s playful read (title, 2-3 traits, maybe a superpower), each swappable; her craft and words kept', async () => {
  const { cleanTag } = await import('../lib/tag.js');
  const card = cleanTag({ craft: 'baker', title: 'Dawn Baker', traits: ['dough whisperer', 'first batch at 6am', 'knows every regular', 'one too many'],
    superpower: 'knows every regular by name', goodAt: "I'm good at mixing dough", loves: 'I love the first batch out at 6am',
    alternates: { titles: ['the Sourdough Sage', 'the Dawn Baker', 'Crust Captain'], traits: ['flour-dusted', 'dough whisperer'], superpowers: ['smells a good proof from the door'] } });
  assert.deepEqual([card.craft, card.title, card.traits, card.superpower, card.goodAt, card.loves],
    ['Baker', 'the Dawn Baker', ['dough whisperer', 'first batch at 6am', 'knows every regular'], 'knows every regular by name', 'mixing dough', 'the first batch out at 6am']);
  assert.deepEqual(card.alternates, { titles: ['the Sourdough Sage', 'the Crust Captain'], traits: ['flour-dusted'], superpowers: ['smells a good proof from the door'] }, 'swaps never repeat what is on the card');
});

test('her name tag from her intro knows her seat: in Product, her craft is Product unless she says otherwise', async () => {
  let seen;
  const r = await nameTag('I love working on the customer journey, understanding the problems customers face', {
    seat: 'product', callModel: async a => { seen = a; return { craft: 'Product manager', title: 'the Customer Whisperer', traits: ['customer-obsessed', 'hands-on builder', 'problem hunter'], superpower: '', goodAt: 'understanding the problems customers face', loves: 'working on the customer journey' }; } });
  assert.match(seen.user, /Her seat at the table: Product/);
  assert.equal(r.body.craft, 'Product', 'her seat, in code, whatever the model calls it');
  assert.equal(r.body.title, 'the Customer Whisperer');
  const diy = await nameTag("I'm good at mixing dough", { seat: 'diy', callModel: async a => { seen = a; return { craft: 'Baker', goodAt: 'mixing dough', loves: '' }; } });
  assert.ok(!/Her seat/.test(seen.user), 'her own craft: no seat hint');
  assert.equal(diy.body.craft, 'Baker');
});

test('her domains survive an update that leaves them out; the selector reads them from profile.json', async () => {
  const { domainsFor } = await import('../lib/teammates.js');
  const run = newRun({ intro: 'I love mixing dough and the first batch out at 6am' });
  await buildProfile(run, { callModel: async () => ({ ...P(), domains: ['the bake', 'the morning rush'] }) });
  await updateProfile(run, { question: 'q', answer: 'a' }, { callModel: async () => P() });
  assert.deepEqual(readProfile(run).domains, ['the bake', 'the morning rush']);
  assert.deepEqual(domainsFor(run, 'diy'), ['the bake', 'the morning rush']);
});

test('/intro in the Product seat returns the full character card (title, traits, superpower, swaps), craft = the seat', async () => {
  const { cleanTag } = await import('../lib/tag.js');
  const r = await nameTag('I love working on the customer journey', { seat: 'product', callModel: async () => ({ craft: 'Product manager', title: 'Customer Whisperer',
    traits: ['customer-obsessed', 'hands-on builder', 'problem hunter'], superpower: 'finds the friction first', goodAt: 'customer problems', loves: 'the customer journey',
    alternates: { titles: ['the Journey Mapper'], traits: ['empathy-first'], superpowers: ['reads a funnel like a map'] } }) });
  assert.deepEqual([r.body.craft, r.body.title, r.body.traits.length, r.body.superpower], ['Product', 'the Customer Whisperer', 3, 'finds the friction first']);
  assert.deepEqual(r.body.alternates.titles, ['the Journey Mapper']);
  assert.deepEqual(cleanTag(r.body).title, 'the Customer Whisperer', 'what /intro logs and returns keeps the whole card');
});

test('her name tag\'s schema is flat (no nested object: it cost the CLI extra turns), and flat swaps still reach the card', async () => {
  const { TAG_SCHEMA, cleanTag } = await import('../lib/tag.js');
  for (const [k, v] of Object.entries(TAG_SCHEMA.properties)) assert.notStrictEqual(v.type, 'object', `${k} is not a nested object`);
  const card = cleanTag({ craft: 'Product', title: 'Customer Whisperer', traits: ['listener'], superpower: '', goodAt: '', loves: '',
    altTitles: ['the Feedback Alchemist'], altTraits: ['listener', 'problem hunter'], altSuperpowers: ['hears the request inside the complaint'] });
  assert.deepEqual(card.alternates, { titles: ['the Feedback Alchemist'], traits: ['problem hunter'], superpowers: ['hears the request inside the complaint'] });
});
