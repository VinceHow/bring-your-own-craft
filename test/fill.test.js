// The live fill with a fake model: slot JSON fills the real template, switches remove what they should,
// and "decided for you" only cites lines that exist in her file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fillPage, loadTemplate, parseTaste, gatherRun, pickTemplate, applyChoices } from '../lib/fill.js';
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
      steps: over.steps || [...tpl.defaults.steps.filter(s => s !== 'regulars'), 'regulars'],
      switches: { ...tpl.defaults.switches, ...(over.switches || {}) },
      decidedShown: over.decidedShown || [{ id: 'c6', label: 'No account needed to book' }, { id: 'c9', label: 'Type' }, { id: 'nope', label: 'Invented' }],
    };
  };
  fn.calls = calls;
  return fn;
}

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fill-'));
const read = d => fs.readFileSync(path.join(d, 'index.html'), 'utf8');
// A template not built yet runs as a todo (reported, not failing); it turns back on by itself once it lands.
const built = t => fs.existsSync(new URL(`../templates/${t}/index.html`, import.meta.url));
const opts = t => (built(t) ? {} : { todo: `${t === 'cafe' ? 'café' : t} template not built yet` });

for (const template of ['yoga', 'cafe', 'bakery']) {
  test(`${template}: slot JSON fills the template, no slot markers left`, opts(template), async () => {
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

  test(`${template}: the phone field is absent when the switch is off, present when on`, opts(template), async () => {
    const off = tmp(), on = tmp();
    await fillPage({ run: 'r', outDir: off, idea: 'x', taste: TASTE, decided: DECIDED, template, call: fakeModel({ template, switches: { phone: false } }) });
    await fillPage({ run: 'r', outDir: on, idea: 'x', taste: TASTE, decided: DECIDED, template, call: fakeModel({ template, switches: { phone: true } }) });
    assert.doesNotMatch(read(off), /type="tel"|data-switch="phone"/);
    assert.match(read(on), /type="tel"/);
  });

  test(`${template}: cancel reason and remember-me follow their switches`, opts(template), async () => {
    const a = tmp(), b = tmp();
    await fillPage({ run: 'r', outDir: a, idea: 'x', taste: TASTE, template, call: fakeModel({ template, switches: { oneTapCancel: true, cancelReason: false, remember: false } }) });
    await fillPage({ run: 'r', outDir: b, idea: 'x', taste: TASTE, template, call: fakeModel({ template, switches: { oneTapCancel: true, cancelReason: true, remember: true } }) });
    assert.doesNotMatch(read(a), /data-switch="cancel-reason"|data-switch="remember"/);
    assert.match(read(b), /data-switch="cancel-reason"/);
    assert.match(read(b), /data-switch="remember"/);
  });

  test(`${template}: "decided for you" cites only lines that exist, newest line first`, opts(template), async () => {
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
    assert.doesNotMatch(html, /follows your line/, "no notes quoting her line on her page");
    assert.doesNotMatch(html, />L7</);
  });

  test(`${template}: regulars first puts the regulars section straight after the hero`, opts(template), async () => {
    const a = tmp(), b = tmp();
    await fillPage({ run: 'r', outDir: a, idea: 'x', taste: TASTE, template, call: fakeModel({ template, switches: { regulars: true, regularsFirst: true } }) });
    await fillPage({ run: 'r', outDir: b, idea: 'x', taste: TASTE, template, call: fakeModel({ template, switches: { regulars: true, regularsFirst: false } }) });
    const order = html => [...html.matchAll(/<section[^>]*data-step="([\w-]+)"/g)].map(m => m[1]);
    assert.deepEqual(order(read(a)).slice(0, 2), ['hero', 'regulars']);
    assert.notEqual(order(read(b))[1], 'regulars');
    const o = order(read(a));
    const last = loadTemplate(template).defaults.steps.at(-1);
    assert.ok(o.indexOf('decided') > o.indexOf(last), '"decided for you" stays under the booking steps');
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

test('"decided for you" tags each row with its seat, and a Strategy payment decision always shows', async () => {
  const out = tmp();
  const decided = [
    ...['a', 'b', 'c', 'd', 'e', 'f'].map(k => ({ id: k, seat: 'design', decision: `D ${k}`, choice: 'x', cites: 'L3' })),
    { id: 's1', seat: 'strategy', decision: 'Pay online or at the desk?', choice: 'Pay at the desk', cites: 'team default' },
  ];
  const r = await fillPage({ run: 'r', outDir: out, idea: 'x', taste: TASTE, decided, newestLine: 'L3', template: 'yoga',
    call: fakeModel({ decidedShown: ['d', 'e', 'f'].map(id => ({ id, label: id })) }) });
  assert.ok(r.slots.decided.length <= 6);
  assert.ok(r.slots.decided.some(x => x.id === 's1'), 'the Strategy decision is shown');
  assert.deepEqual(r.slots.decided.map(x => x.id), ['d', 'e', 'f', 's1'], 'at most three newest-line rows (her picks first), then Strategy');
  const html = read(out);
  // No credits on her page (DEMO 2:26): the rows stay in the markup for these checks, hidden, with no seat tags.
  assert.match(html, /<li data-decided="s1" data-cites="team default" data-seat="strategy">/);
  assert.match(html, /id="decided" hidden/);
  assert.doesNotMatch(html, /decided__seat/);
});

test('no margin note on her page, even when a decision about cancelling cites her newest line', async () => {
  const cancel = [{ id: 'c4', seat: 'engineering', decision: 'Does cancel ask for a reason?', choice: 'No, one tap', cites: 'L3' }];
  const on = tmp();
  const r = await fillPage({ run: 'r', outDir: on, idea: 'x', taste: TASTE, decided: cancel, newestLine: 'L3', template: 'yoga', call: fakeModel({ decidedShown: [] }) });
  assert.doesNotMatch(read(on), /data-note=|class="margin-note"/);
  assert.equal(r.slots.cancelNote, undefined);
});

test('she overrules cancel-by-link with "contact the studio": the one-tap cancel line goes', async () => {
  const ev = [
    { type: 'ask', id: 'c9', decision: 'Whether customers can cancel, and how late', recommendation: 'Self-cancel via link up to a cutoff' },
    { type: 'answer', askId: 'c9', choice: 'Cancel by contacting the studio' },
  ];
  const out = tmp();
  const r = await fillPage({ run: 'r', outDir: out, ...gatherRun(ev, ''), taste: TASTE, template: 'yoga', call: fakeModel({ switches: { oneTapCancel: true } }) });
  assert.equal(r.slots.switches.oneTapCancel, false);
  assert.doesNotMatch(read(out), /data-switch="cancel"/);
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

// ---- the bakery (the demo's idea): built from the café pre-order template ----
const BAKERY_IDEA = 'A website for a small bakery, so customers can order bread ahead.';
const sections = html => [...html.matchAll(/<section[^>]*data-step="([\w-]+)"/g)].map(m => m[1]);

test('a bakery idea picks the bakery template; the café and yoga ideas keep theirs', () => {
  assert.equal(pickTemplate(BAKERY_IDEA), 'bakery');
  assert.equal(pickTemplate('Sourdough to order for my neighbours'), 'bakery');
  assert.equal(pickTemplate('Pastry pre-orders for a café'), 'cafe');
  assert.equal(pickTemplate('A booking page for a small yoga studio.'), 'yoga');
});

test('bakery: it fills with no café, coffee or pastry left over, and a bakery idea builds it without naming it', async () => {
  const out = tmp();
  const r = await fillPage({ run: 'r', outDir: out, idea: BAKERY_IDEA, taste: TASTE, call: fakeModel({ template: 'bakery' }) });
  assert.equal(r.template, 'bakery');
  const html = read(out);
  assert.doesNotMatch(html, /\{\{|\}\}|<!--(step|if|unless|\/step|\/if|\/unless):/);
  assert.doesNotMatch(html.replace(/<!--[\s\S]*?-->/g, ''), /caf[eé]|espresso|coffee|pastr|cardamom/i);
  assert.match(html, /name="page" value="bakery"/);
  assert.ok(fs.existsSync(path.join(out, 'img', 'photo-m33603672-1200.webp')), 'its own photographs copied');
  assert.ok(!fs.existsSync(path.join(out, 'img', 'photo-m187311853-1200.webp')), 'no coffee photographs');
});

const BAKERY_SWITCHES = [
  ['regulars', /data-switch="regulars"/],
  ['standingOrder', /data-switch="standing"/],
  ['cutoff', /data-switch="cutoff"/],
  ['phone', /type="tel"/],
  ['oneTapCancel', /data-switch="cancel"/],
  ['remember', /data-switch="remember"/],
];
for (const [key, mark] of BAKERY_SWITCHES) {
  test(`bakery: ${key} on shows it, off removes it`, async () => {
    const on = tmp(), off = tmp();
    await fillPage({ run: 'r', outDir: on, idea: BAKERY_IDEA, taste: TASTE, template: 'bakery', call: fakeModel({ template: 'bakery', switches: { [key]: true } }) });
    await fillPage({ run: 'r', outDir: off, idea: BAKERY_IDEA, taste: TASTE, template: 'bakery', call: fakeModel({ template: 'bakery', switches: { [key]: false } }) });
    assert.match(read(on), mark);
    assert.doesNotMatch(read(off), mark);
  });
}

test('bakery: regulars first on puts their usual straight after the top; off puts the bread first', async () => {
  const a = tmp(), b = tmp();
  await fillPage({ run: 'r', outDir: a, idea: BAKERY_IDEA, taste: TASTE, template: 'bakery', call: fakeModel({ template: 'bakery', switches: { regulars: true, regularsFirst: true } }) });
  await fillPage({ run: 'r', outDir: b, idea: BAKERY_IDEA, taste: TASTE, template: 'bakery', call: fakeModel({ template: 'bakery', switches: { regulars: true, regularsFirst: false } }) });
  assert.deepEqual(sections(read(a)).slice(0, 3), ['hero', 'regulars', 'bread']);
  assert.deepEqual(sections(read(b)).slice(0, 3), ['hero', 'bread', 'regulars']);
});

test('bakery: the cut-off line shows in the words she reads, and only when the switch is on', async () => {
  const on = tmp(), off = tmp();
  await fillPage({ run: 'r', outDir: on, idea: BAKERY_IDEA, taste: TASTE, template: 'bakery', call: fakeModel({ template: 'bakery', words: { cutoffLine: 'Orders close at 8pm for the next morning.' }, switches: { cutoff: true } }) });
  await fillPage({ run: 'r', outDir: off, idea: BAKERY_IDEA, taste: TASTE, template: 'bakery', call: fakeModel({ template: 'bakery', words: { cutoffLine: 'Orders close at 8pm for the next morning.' }, switches: { cutoff: false } }) });
  assert.equal((read(on).match(/Orders close at 8pm for the next morning\./g) || []).length, 3, 'top, bread list and close');
  assert.doesNotMatch(read(off), /Orders close at 8pm/);
});

test('bakery: decisions the team logged set the switches even when the model reads them otherwise', async () => {
  const out = tmp();
  const decided = [
    { id: 'j1', seat: 'engineering', decision: 'When orders close for the morning bake', choice: 'Orders close at 8pm the night before', cites: 'team' },
    { id: 'c2', seat: 'strategy', decision: 'Whether regulars can set a standing weekly order', choice: 'Yes, a standing weekly order', cites: 'team default' },
    { id: 'c3', seat: 'design', decision: 'Whether the order form asks for a phone number', choice: 'No phone field', cites: 'L3' },
    { id: 'c4', seat: 'engineering', decision: 'How cancelling works', choice: 'One tap from the confirmation email', cites: 'team default' },
  ];
  const r = await fillPage({ run: 'r', outDir: out, idea: BAKERY_IDEA, taste: TASTE, decided, template: 'bakery',
    call: fakeModel({ template: 'bakery', switches: { cutoff: false, standingOrder: false, phone: true, oneTapCancel: false } }) });
  assert.deepEqual([r.slots.switches.cutoff, r.slots.switches.standingOrder, r.slots.switches.phone, r.slots.switches.oneTapCancel], [true, true, false, true]);
  const html = read(out);
  assert.match(html, /data-switch="cutoff"/);
  assert.match(html, /data-switch="standing"/);
  assert.doesNotMatch(html, /type="tel"/);
});

test('bakery: a switch the yoga page doesn\'t have is never added to it', async () => {
  const r = await fillPage({ run: 'r', outDir: tmp(), idea: 'yoga', taste: TASTE, template: 'yoga', call: fakeModel(),
    decided: [{ id: 'x', seat: 'strategy', decision: 'Whether regulars get a standing weekly booking', choice: 'Yes', cites: 'team default' }] });
  assert.ok(!('standingOrder' in r.slots.switches));
});

test('bakery: a decision about regulars landing first stays a regulars-first decision, even if it says "repeat"', async () => {
  const r = await fillPage({ run: 'r', outDir: tmp(), idea: BAKERY_IDEA, taste: TASTE, template: 'bakery',
    call: fakeModel({ template: 'bakery', switches: { regularsFirst: false, standingOrder: false } }),
    decided: [{ id: 'x', seat: 'design', decision: 'Should regulars see a repeat of their usual order first', choice: 'Yes, their usual first', cites: 'team default' }] });
  assert.equal(r.slots.switches.regularsFirst, true);
  assert.equal(r.slots.switches.standingOrder, false);
});

test('the phone switch reads a "what the form asks for" field list, and nothing else that mentions name and email', () => {
  const phone = (decision, choice) => { const sw = { phone: true, remember: true }; applyChoices(sw, [{ decision, choice }]); return sw; };
  assert.equal(phone('What the order form asks for', 'Name and email only').phone, false);
  assert.equal(phone('What does the booking form ask for?', 'Name, email and optional phone').phone, true);
  assert.deepEqual(phone('Should the form remember your name and email?', 'No, never'), { phone: true, remember: false });
  assert.equal(phone('What details do we show on the confirmation page?', 'Name and email').phone, true);
});

test('the phone FIELD turns on only for the customer\'s phone; the business\'s own number never does', () => {
  const phone = (decision, choice, start = false) => { const sw = { phone: start, remember: true }; applyChoices(sw, [{ decision, choice }]); return sw.phone; };
  // The bakery rehearsal's c16, exactly: the bakery's own number, shown on an error. Field stays off.
  assert.equal(phone('What the page does when saving an order fails', 'Show a clear error, keep the choices, offer retry and the bakery phone number'), false);
  assert.equal(phone('Where customers get help', 'Call us at the shop', false), false);
  assert.equal(phone('What the confirmation shows', "The bakery's phone number and opening hours", false), false);
  // Collecting the customer's phone: on.
  assert.equal(phone('How we tell them it is ready', "Collect customers' phone for pickup texts"), true);
  assert.equal(phone('The order form', 'Ask for their phone number'), true);
  // Removing the field: off.
  assert.equal(phone('The order form', 'No phone field', true), false);
});
