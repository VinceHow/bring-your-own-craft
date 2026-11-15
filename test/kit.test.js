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
