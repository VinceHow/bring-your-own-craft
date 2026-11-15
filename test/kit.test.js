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
