// "Loaded with" on the meet cards (lib/kit.js): computed from what this server really has, never invented.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kitFor, madeFor } from '../lib/kit.js';
import { findingFor } from '../lib/teammates.js';

test('the bakery: Wren names the verified finding that fits (its site and the date read), Bo the bakery template', () => {
  const k = kitFor("An ordering website for my friend's small bakery", { start: null });
  const f = findingFor("An ordering website for my friend's small bakery").finding;
  assert.match(k.research[0], /^Linkup finding: .+, \d{1,2} [A-Z][a-z]{2}$/, 'the finding, found with Linkup (its how_verified), with the day read');
  assert.ok(f.how_verified && /linkup/i.test(f.how_verified));
  assert.equal(k.engineering[0], 'The bakery page template');
  for (const l of Object.values(k).flat()) assert.ok(l.split(/\s+/).length <= 6, `at most 6 words: ${l}`);
  for (const [seat, l] of Object.entries(k)) assert.ok(l.some(x => /\bClaude\b/.test(x)), `${seat} names Claude`);
  assert.ok(Object.values(k).every(l => l.length >= 2 && l.length <= 3), '2-3 items each');
});
test('no finding fits: Wren says so and claims none; the taste-skill deal is listed only when its scripts are on this machine', () => {
  const k = kitFor('A sign-up page for a neighbourhood tool library', { start: null });
  assert.match(k.research[0], /No verified finding fits yet/);
  assert.ok(!k.design.some(x => /live palette/.test(x)), 'no deal without the scripts');
  assert.ok(kitFor('A bakery', { start: '/some/start.mjs' }).design.some(x => /live palette/.test(x)), 'listed when they are');
});
test('nothing aspirational: no fal images, no MCP, no tools the code does not run', () => {
  const all = Object.values(kitFor('A bakery', { start: '/x' })).flat().join(' | ');
  assert.doesNotMatch(all, /\bMCP\b|image|flux|Figma/i);
  assert.doesNotMatch(all.replace(/through fal/g, ''), /\bfal\b/, 'fal only as the route it really is');
});

test('"Made with" (prepared ahead): each item only on its evidence; Linkup only when the cited finding was found with it', async () => {
  // (madeFor imported above)
  const m = madeFor("An ordering website for my friend's small bakery");
  assert.deepEqual(m.research, ['Researched with Linkup, before the demo']);
  assert.deepEqual(m.design, ['Studio, clips, music painted on fal', 'The room’s frames, laid out in Figma'], 'fal for what it made; Figma for the frames (design/FIGMA.md)');
  assert.deepEqual(m.engineering, ['This app, built with Claude Code']);
  assert.deepEqual(madeFor('A sign-up page for a tool library').research, [], 'no finding cited, no Linkup');
  assert.ok(Object.values(m).every(l => l.length <= 2), 'at most 2 each');
  assert.doesNotMatch(Object.values(m).flat().join(' | '), /ElevenLabs|MCP|image/i, 'no music by ElevenLabs, no MCP, no runtime images');
});
test('Bo thinks with what this server really runs on', async () => {
  const { kitFor } = await import('../lib/kit.js');
  const old = process.env.MODEL_BACKEND;
  process.env.MODEL_BACKEND = 'fal'; assert.equal(kitFor('A bakery').engineering.at(-1), 'Claude (Sonnet), through fal');
  delete process.env.MODEL_BACKEND; assert.equal(kitFor('A bakery').engineering.at(-1), 'Claude, through Claude Code');
  if (old !== undefined) process.env.MODEL_BACKEND = old;
});

test('the meet cards (the PO copy): every teammate has an intro, loves, live and built chips; live chips only under their switches', async () => {
  const { cardsFor } = await import('../lib/kit.js');
  const bakery = "An ordering website for my friend's small bakery";
  const { cards, room } = cardsFor(bakery, { start: null });
  for (const seat of ['research', 'design', 'engineering', 'strategy', 'data']) {
    const c = cards[seat];
    assert.ok(c.intro && c.loves, `${seat}: intro and loves`);
    assert.ok(c.live.length >= 2 && c.live.some(x => /^Claude (Sonnet|Haiku|Opus)$|^Claude$/.test(x)), `${seat}: live chips, with the model it thinks with`);
    assert.ok(c.built.length >= 1, `${seat}: built with`);
    assert.doesNotMatch([c.intro, c.loves, ...c.live, ...c.built].join(' '), /\?|MCP|ECC/);
  }
  assert.ok(!cards.research.live.some(x => /Linkup/.test(x)), 'no Linkup chip without a key (liveResearchOn, b3)');
  const k = process.env.LINKUP_API_KEY; process.env.LINKUP_API_KEY = 'test-only-not-a-key';
  assert.ok(cardsFor(bakery, { start: null }).cards.research.live.includes('Looks for a live finding with Linkup'), 'Linkup live with a key, on a bakery idea');
  assert.ok(!cardsFor('A sign-up page for a tool library', { start: null }).cards.research.live.some(x => /Linkup/.test(x)), 'never claimed where it does not run');
  const off = process.env.LIVE_FINDING; process.env.LIVE_FINDING = '0';
  assert.ok(!cardsFor(bakery, { start: null }).cards.research.live.some(x => /Linkup/.test(x)), 'nor when live finding is off'); 
  if (off === undefined) delete process.env.LIVE_FINDING; else process.env.LIVE_FINDING = off;
  if (k === undefined) delete process.env.LINKUP_API_KEY; else process.env.LINKUP_API_KEY = k;
  assert.ok(!cards.design.live.some(x => /dealt live/.test(x)), 'no live palette without the scripts');
  assert.ok(cardsFor(bakery, { start: '/x' }).cards.design.live.some(x => /dealt live/.test(x)), 'listed when they are there');
  const b = process.env.MODEL_BACKEND; delete process.env.MODEL_BACKEND; delete process.env.LIVE_LOGO;
  assert.ok(!cardsFor(bakery).cards.design.live.some(x => /emblem/.test(x)), 'the live emblem only when the logo is on (fal)');
  assert.match(cardsFor(bakery).room.at(-1).text, /Claude Code/);
  process.env.MODEL_BACKEND = 'fal';
  assert.ok(cardsFor(bakery, { start: null }).cards.design.live.some(x => /^Paints the page’s emblem live on fal$/.test(x)));
  assert.equal(cardsFor(bakery).room.at(-1).text, 'thinking through fal');
  process.env.JOINT_MODEL = 'sonnet'; assert.match(cardsFor(bakery).room[0].text, /Claude Sonnet/, 'a Fallback B override shows as it runs'); delete process.env.JOINT_MODEL;
  if (b === undefined) delete process.env.MODEL_BACKEND; else process.env.MODEL_BACKEND = b;
  assert.equal(room.find(r => r.kind === 'mic').text, 'her mic on ElevenLabs speech-to-text', 'the mic item, shown only when voice works (room.js)');
  assert.deepEqual(cards.strategy.built, ['Claude Code']); assert.deepEqual(cards.data.built, ['Claude Code']);
});

test('live research on (a Linkup key): Wren is loaded with a live web search, and "before the demo" is not claimed', () => {
  const was = { k: process.env.LINKUP_API_KEY, l: process.env.LIVE_FINDING };
  try {
    process.env.LINKUP_API_KEY = 'test-only-not-a-key'; delete process.env.LIVE_FINDING;
    const idea = "An ordering website for my friend's small bakery";
    assert.equal(kitFor(idea).research[0], 'Linkup web search, live');
    assert.deepEqual(madeFor(idea).research, [], 'the prepared finding is only the fallback: no "before the demo" line');
    assert.notEqual(kitFor('A sign-up page for a tool library').research[0], 'Linkup web search, live', 'only ideas that search');
    process.env.LIVE_FINDING = '0';
    assert.match(kitFor(idea).research[0], /^Linkup finding: /, 'off: the prepared finding, as before');
    assert.deepEqual(madeFor(idea).research, ['Researched with Linkup, before the demo']);
  } finally {
    if (was.k === undefined) delete process.env.LINKUP_API_KEY; else process.env.LINKUP_API_KEY = was.k;
    if (was.l === undefined) delete process.env.LIVE_FINDING; else process.env.LIVE_FINDING = was.l;
  }
});

const FLEX = { name: 'Operations', focus: 'the morning bake', stance: 'what the counter can really do', loves: 'A bake list that adds up.', brings: 'the morning bake calls for this page' };
test('the card follows the role worn: the teammate holding Product shows the product card, in its own name', async () => {
  const { cardsFor, cardFor } = await import('../lib/kit.js');
  const { rolesFor } = await import('../lib/cast.js');
  const { cards } = cardsFor("An ordering website for my friend's small bakery", { start: null });
  const p = cards.product;
  assert.ok(p.loves && p.live.length >= 2 && p.built.length >= 1, 'product: loves, live and built chips');
  assert.ok(p.live.some(x => /^Claude (Sonnet|Haiku|Opus)$|^Claude$/.test(x)), 'names the team model');
  assert.doesNotMatch([p.loves, ...p.live, ...p.built].join(' '), /builds her page|Schema|template|Playwright|Railway|\?/i, 'no engineering chips');
  for (const [craft, seat, name] of [['engineering', 'engineering', 'Bo'], ['design', 'design', 'Mika'], ['research', 'research', 'Wren'], ['strategy', 'strategy', 'Ines'], ['data', 'strategy', 'Ines']]) {
    const roles = rolesFor(craft);
    const c = cardFor(cards, seat, roles, FLEX);
    assert.equal(c.intro, `I’m ${name}. Today I hold the product: what we build, and for whom.`, `${craft}: ${name} wears Product`);
    assert.deepEqual(c.live, p.live);
    assert.notEqual(c.intro, cards[seat].intro, `${craft}: not ${name}'s home card`);
    for (const other of ['design', 'research', 'data', 'strategy', 'engineering'].filter(s => !['product', 'flex'].includes(roles[s])))
      assert.equal(cardFor(cards, other, roles), cards[other], `${craft}: ${other} keeps its home card`);
    // She is that craft: no teammate shows its card.
    assert.ok(['design', 'research', 'data', 'strategy', 'engineering'].every(s => cardFor(cards, s, roles, FLEX) !== cards[craft]),
      `${craft}: nobody shows the ${craft} card`);
  }
  assert.match(cardFor(cards, 'engineering', rolesFor('engineering')).intro, /^I’m Bo\./);
  assert.doesNotMatch(cardFor(cards, 'engineering', rolesFor('engineering')).intro, /Boring, correct/);
  for (const s of ['design', 'research', 'data', 'strategy', 'engineering']) assert.equal(cardFor(cards, s, null), cards[s], 'the Product path: home cards');
});

test('the flex role: Theo’s card is built from the cast’s flex card; no Data card while she is Data; away, no card', async () => {
  const { cardsFor, cardFor } = await import('../lib/kit.js');
  const { rolesFor, cleanFlex } = await import('../lib/cast.js');
  const { cards } = cardsFor("An ordering website for my friend's small bakery", { start: null });
  const flex = cleanFlex(FLEX);
  for (const craft of ['data', 'diy']) {
    const roles = rolesFor(craft);
    const theo = cardFor(cards, 'data', roles, flex);
    assert.equal(theo.intro, 'I’m Theo. Today I’m Operations: the morning bake.');
    assert.equal(theo.loves, 'A bake list that adds up.');
    assert.deepEqual(theo.live, ['Operations calls, box by box', ...cards.flex.live]);
    assert.ok(theo.live.some(x => /^Claude (Sonnet|Haiku|Opus)$|^Claude$/.test(x)), 'the team model');
    assert.doesNotMatch([theo.intro, theo.loves, ...theo.live].join(' '), /measure|One number|Theo\. One/i, 'nothing from the Data card');
    assert.ok(['design', 'research', 'data', 'strategy', 'engineering'].every(s => cardFor(cards, s, roles, flex) !== cards.data), `${craft}: no Data card`);
    assert.equal(cardFor(cards, 'data', roles, null), null, `${craft}: away, no card`);
  }
  assert.equal(cardFor(cards, 'data', null, flex), cards.data, 'the Product path: Theo’s Data card');
});

test('the app pill names Bo only where someone wears Engineering; the Product path copy is exactly as before', async () => {
  const vm = await import('node:vm');
  const fs = await import('node:fs');
  const window = { BYOC: {} };
  vm.runInNewContext(fs.readFileSync(new URL('../public/app-button.js', import.meta.url), 'utf8'), { window, document: { getElementById: () => null } });
  const copy = c => JSON.parse(JSON.stringify(window.BYOC.appCopy(c))); // out of the vm realm
  assert.deepEqual(copy(undefined), { onIt: 'Bo is on it', retry: 'The build stopped. Bo can try again', press: 'Press → and Bo builds the page', wait: 'Bo starts once you agree the page' });
  for (const c of ['design', 'research', 'data', 'strategy', 'diy']) assert.deepEqual(copy(c), copy(undefined), `${c}: Bo still builds`);
  const eng = copy('engineering');
  assert.equal(eng.wait, 'Your page builds once you agree it');
  assert.ok(Object.values(eng).every(x => !/\bBo\b/.test(x)), 'never names Bo when she is Engineering');
});
