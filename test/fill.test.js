// The live fill with a fake model: slot JSON fills the real template, switches remove what they should,
// and "decided for you" only cites lines that exist in her file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fillPage, loadTemplate, parseTaste, gatherRun } from '../lib/fill.js';
import { readForm, storeBooking } from '../routes/book.js';

const TASTE = parseTaste([
  '- [L1] Regulars come first. (prepared for the demo)',
  '- [L2] No account for the one thing they came for. (prepared for the demo)',
  '- [L3] Never ask for anything you could remember or skip.',
].join('\n'));
const DECIDED = [
  { id: 'c4', decision: 'How does cancelling work?', choice: 'Cancel is one tap, no reason asked', cites: 'L3' },
  { id: 'c6', decision: 'Account?', choice: 'No account needed', cites: 'L2' },
  { id: 'c9', decision: 'Typeface', choice: 'The dealt pairing', cites: 'L7' }, // a line that does not exist
  { id: 'c10', decision: 'Hours', choice: 'Show this week only', cites: 'team default' },
];

function fakeModel(over = {}) {
  const calls = [];
  const fn = async ({ system, user, schema }) => {
    calls.push({ system, user, schema });
    const tpl = loadTemplate(over.template || 'yoga');
    return {
      words: { ...tpl.defaults.words, heroTitle: 'Yoga in Hackney for people who come back', brand: 'Fieldhouse Yoga', ...(over.words || {}) },
      steps: over.steps || ['classes', 'class', 'confirm', 'booked', 'regulars'],
      switches: { ...tpl.defaults.switches, ...(over.switches || {}) },
      decidedShown: over.decidedShown || [{ id: 'c6', label: 'No account needed to book' }, { id: 'c9', label: 'Type' }, { id: 'nope', label: 'Invented' }],
    };
  };
  fn.calls = calls;
  return fn;
}

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fill-'));
const read = d => fs.readFileSync(path.join(d, 'index.html'), 'utf8');

for (const template of ['yoga', 'cafe']) {
  test(`${template}: slot JSON fills the template, no slot markers left`, async () => {
    const out = tmp();
    const call = fakeModel({ template, words: { heroTitle: 'A headline only the fill could write' } });
    await fillPage({ run: 'r1', outDir: out, idea: 'x', flow: {}, taste: TASTE, decided: DECIDED, newestLine: 'L3', template, call });
    const html = read(out);
    assert.match(html, /A headline only the fill could write/);
    assert.doesNotMatch(html, /\{\{|\}\}|<!--(step|if|unless|\/step|\/if|\/unless):/);
    assert.match(html, /name="run" value="r1"/);
    assert.match(html, /data-endpoint="\/api\/book"/);
    assert.equal(call.calls.length, 1, 'one model call');
    assert.ok(fs.existsSync(path.join(out, 'assets')), 'assets copied');
  });

  test(`${template}: the phone field is absent when the switch is off, present when on`, async () => {
    const off = tmp(), on = tmp();
    await fillPage({ run: 'r', outDir: off, idea: 'x', taste: TASTE, decided: DECIDED, template, call: fakeModel({ template, switches: { phone: false } }) });
    await fillPage({ run: 'r', outDir: on, idea: 'x', taste: TASTE, decided: DECIDED, template, call: fakeModel({ template, switches: { phone: true } }) });
    assert.doesNotMatch(read(off), /type="tel"|data-switch="phone"/);
    assert.match(read(on), /type="tel"/);
  });

  test(`${template}: cancel reason and remember-me follow their switches`, async () => {
    const a = tmp(), b = tmp();
    await fillPage({ run: 'r', outDir: a, idea: 'x', taste: TASTE, template, call: fakeModel({ template, switches: { oneTapCancel: true, cancelReason: false, remember: false } }) });
    await fillPage({ run: 'r', outDir: b, idea: 'x', taste: TASTE, template, call: fakeModel({ template, switches: { oneTapCancel: true, cancelReason: true, remember: true } }) });
    assert.doesNotMatch(read(a), /data-switch="cancel-reason"|data-switch="remember"/);
    assert.match(read(b), /data-switch="cancel-reason"/);
    assert.match(read(b), /data-switch="remember"/);
  });

  test(`${template}: "decided for you" cites only lines that exist, newest line first`, async () => {
    const out = tmp();
    const r = await fillPage({ run: 'r', outDir: out, idea: 'x', taste: TASTE, decided: DECIDED, newestLine: 'L3', template, call: fakeModel({ template }) });
    const rows = r.slots.decided;
    assert.equal(rows[0].id, 'c4', 'the item citing her newest line leads');
    assert.equal(rows[0].cites, 'L3');
    const ids = new Set(TASTE.map(l => l.id));
    for (const row of rows) assert.ok(row.cites === 'team default' || ids.has(row.cites), `${row.id} cites ${row.cites}`);
    assert.equal(rows.find(x => x.id === 'c9').cites, 'team default', 'a missing line is never cited');
    assert.ok(!rows.some(x => x.id === 'nope'), 'an invented decision never shows');
    const html = read(out);
    assert.match(html, /data-decided="c4"/);
    assert.match(html, /Never ask for anything you could remember or skip/);
    assert.doesNotMatch(html, />L7</);
  });

  test(`${template}: regulars first puts the regulars section straight after the hero`, async () => {
    const a = tmp(), b = tmp();
    await fillPage({ run: 'r', outDir: a, idea: 'x', taste: TASTE, template, call: fakeModel({ template, switches: { regulars: true, regularsFirst: true } }) });
    await fillPage({ run: 'r', outDir: b, idea: 'x', taste: TASTE, template, call: fakeModel({ template, switches: { regulars: true, regularsFirst: false } }) });
    const order = html => [...html.matchAll(/<section[^>]*data-step="([\w-]+)"/g)].map(m => m[1]);
    assert.deepEqual(order(read(a)).slice(0, 2), ['hero', 'regulars']);
    assert.notEqual(order(read(b))[1], 'regulars');
    const o = order(read(a));
    assert.ok(o.indexOf('decided') > o.indexOf('booked'), '"decided for you" stays under the booking steps');
  });
}

test('an answer where she overruled the team: the page follows her branch, and the fill is told so', async () => {
  const ev = [
    { type: 'run.start', idea: 'A booking page for a small yoga studio.' },
    { type: 'ask', id: 'c1', decision: 'Do full classes get a waitlist?', options: ['Waitlist', 'Show as full'], recommendation: 'Waitlist' },
    { type: 'answer', askId: 'c1', choice: 'Show as full' },
  ];
  const g = gatherRun(ev, '');
  assert.equal(g.answers[0].overruled, true);
  const out = tmp();
  // The model leaves the waitlist on (the team's recommendation); her answer must win.
  const call = fakeModel({ switches: { waitlist: true } });
  const r = await fillPage({ run: 'r', outDir: out, ...g, taste: TASTE, template: 'yoga', call });
  assert.equal(r.slots.switches.waitlist, false);
  assert.doesNotMatch(read(out), /data-switch="waitlist"/);
  const sent = JSON.parse(call.calls[0].user).herAnswers[0];
  assert.deepEqual([sent.choice, sent.recommendation, sent.overruled], ['Show as full', 'Waitlist', true]);
  // and when she takes the recommendation, the waitlist stays
  const g2 = gatherRun([...ev.slice(0, 2), { type: 'answer', askId: 'c1', choice: 'Waitlist' }], '');
  const r2 = await fillPage({ run: 'r', outDir: tmp(), ...g2, taste: TASTE, template: 'yoga', call: fakeModel({ switches: { waitlist: false } }) });
  assert.equal(g2.answers[0].overruled, false);
  assert.equal(r2.slots.switches.waitlist, true);
});

test('her pin "Cut the phone field" removes the phone field even if the model keeps it', async () => {
  const g = gatherRun([{ type: 'pin', nodeId: 'n3', text: "Cut the phone field. Name's enough; regulars hate forms." }], '');
  const out = tmp();
  await fillPage({ run: 'r', outDir: out, ...g, taste: TASTE, template: 'yoga', call: fakeModel({ switches: { phone: true } }) });
  assert.doesNotMatch(read(out), /type="tel"/);
});

test('"does cancel ask for a reason?" decided "No, one tap" removes the reason line', async () => {
  const out = tmp();
  const decided = [{ id: 'c4', decision: 'Does cancel ask for a reason?', choice: 'No, one tap', cites: 'L3' }];
  const r = await fillPage({ run: 'r', outDir: out, idea: 'x', taste: TASTE, decided, newestLine: 'L3', template: 'yoga',
    call: fakeModel({ switches: { cancelReason: true }, decidedShown: [] }) });
  assert.equal(r.slots.switches.cancelReason, false);
  assert.doesNotMatch(read(out), /data-switch="cancel-reason"/);
  assert.match(read(out), /data-decided="c4" data-cites="L3"/);
});

test('a slot JSON that breaks the schema is refused, nothing written', async () => {
  const out = tmp();
  const bad = async () => ({ words: {}, steps: 'nope' });
  await assert.rejects(fillPage({ run: 'r', outDir: out, idea: 'x', template: 'yoga', call: bad }));
  assert.ok(!fs.existsSync(path.join(out, 'index.html')));
});

test('gatherRun reads her flow, answers, pin and newest line from the log', () => {
  const ev = [
    { type: 'run.start', idea: 'A booking page for a small yoga studio.' },
    { type: 'flow.line', nodes: [{ id: 'n1', label: 'classes' }], edges: [] },
    { type: 'ask', id: 'c1', decision: 'Waitlist?', attachTo: 'n1' },
    { type: 'answer', askId: 'c1', choice: 'Waitlist' },
    { type: 'pin', nodeId: 'n1', text: 'Never ask for a phone number.' },
    { type: 'taste.written', id: 'L3', text: 'Never ask for anything you could remember or skip.' },
  ];
  const g = gatherRun(ev, '- [L1] a\n- [L3] Never ask for anything you could remember or skip.');
  assert.equal(g.newestLine, 'L3');
  assert.equal(g.answers[0].decision, 'Waitlist?');
  assert.equal(g.answers[1].choice, 'Never ask for a phone number.');
  assert.equal(g.flow.nodes.length, 1);
});

test('/api/book reads a FormData body as server.js hands it over, and stores the booking', () => {
  const b = '------x\r\nContent-Disposition: form-data; name="run"\r\n\r\nbook-test\r\n------x\r\nContent-Disposition: form-data; name="name"\r\n\r\nPriya\r\n------x\r\nContent-Disposition: form-data; name="email"\r\n\r\npriya@studio.example\r\n------x\r\nContent-Disposition: form-data; name="class"\r\n\r\nTue 07:30 Slow flow\r\n------x--\r\n';
  const form = readForm(Object.fromEntries(new URLSearchParams(b)));
  assert.deepEqual([form.run, form.name, form.email, form.class], ['book-test', 'Priya', 'priya@studio.example', 'Tue 07:30 Slow flow']);
  assert.equal(storeBooking({ ...form, run: '../etc' }).code, 404);
});
