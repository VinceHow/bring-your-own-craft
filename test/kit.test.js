// "Loaded with" on the meet cards (lib/kit.js): computed from what this server really has, never invented.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kitFor } from '../lib/kit.js';
import { findingFor } from '../lib/teammates.js';

test('the bakery: Noor names the verified finding that fits (its site and the date read), Bo the bakery template', () => {
  const k = kitFor("An ordering website for my friend's small bakery", { start: null });
  const f = findingFor("An ordering website for my friend's small bakery").finding;
  assert.match(k.research[0], new RegExp(`^A verified finding: .+, read ${f.fetched}$`));
  assert.equal(k.engineering[0], 'The bakery page template, on taste-skill’s kit');
  assert.ok(Object.values(k).every(l => l.length >= 2 && l.length <= 3), '2-3 items each');
});
test('no finding fits: Noor says so and claims none; the taste-skill deal is listed only when its scripts are on this machine', () => {
  const k = kitFor('A sign-up page for a neighbourhood tool library', { start: null });
  assert.match(k.research[0], /No verified finding fits this idea yet/);
  assert.ok(!k.design.some(x => /deal/.test(x)), 'no deal without the scripts');
  assert.ok(kitFor('A bakery', { start: '/some/start.mjs' }).design.some(x => /deal/.test(x)), 'listed when they are');
});
test('nothing aspirational: no fal images, no MCP, no tools the code does not run', () => {
  const all = Object.values(kitFor('A bakery', { start: '/x' })).flat().join(' | ');
  assert.doesNotMatch(all, /\bfal\b|\bMCP\b|image|flux|web search/i);
});

test('"Made with" (prepared ahead): each item only on its evidence; Linkup only when the cited finding was found with it', async () => {
  const { madeFor } = await import('../lib/kit.js');
  const m = madeFor("An ordering website for my friend's small bakery");
  assert.deepEqual(m.research, ['Researched with Linkup, before the demo']);
  assert.ok(m.design.includes('This studio, its clips and music, painted on fal'));
  assert.ok(m.design.includes('The room’s frames, laid out in Figma'));
  assert.deepEqual(m.engineering, ['This app, built with Claude Code']);
  assert.deepEqual(madeFor('A sign-up page for a tool library').research, [], 'no finding cited, no Linkup');
  assert.ok(Object.values(m).every(l => l.length <= 2), 'at most 2 each');
  assert.doesNotMatch(Object.values(m).flat().join(' | '), /ElevenLabs|MCP|image/i, 'no music by ElevenLabs, no MCP, no runtime images');
});
test('Bo thinks with what this server really runs on', async () => {
  const { kitFor } = await import('../lib/kit.js');
  const old = process.env.MODEL_BACKEND;
  process.env.MODEL_BACKEND = 'fal'; assert.equal(kitFor('A bakery').engineering.at(-1), 'Thinks with Claude (Sonnet), through fal');
  delete process.env.MODEL_BACKEND; assert.equal(kitFor('A bakery').engineering.at(-1), 'Thinks with Claude, through Claude Code');
  if (old !== undefined) process.env.MODEL_BACKEND = old;
});
