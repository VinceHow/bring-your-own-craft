// The raw → tidy word diff (public/word-diff.js), loaded as the browser loads it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const box = {}; box.globalThis = box;
vm.runInNewContext(fs.readFileSync(new URL('../public/word-diff.js', import.meta.url), 'utf8'), box);
const { wordDiff, wordDiffClean } = box.BYOC;
const kinds = d => [...d.tokens].map(t => `${t.kind}:${t.word}>${t.as}`);

test('fillers drop, words kept, case and punctuation become', () => {
  const raw = 'um so like it should feel like the baker already knows you, you know';
  const tidy = 'It should feel like the baker already knows you.';
  const d = wordDiff(raw, tidy);
  assert.equal(d.same, false);
  assert.deepEqual([...kinds(d).slice(0, 5)], ['drop:um>', 'drop:so>', 'drop:like>', 'becomes:it>It', 'keep:should>should']);
  assert.ok(kinds(d).includes('becomes:you,>you.'));
  assert.equal(wordDiffClean(d), tidy, 'the kept and changed words read exactly as the tidy');
  assert.equal(d.tokens.filter(t => t.word).map(t => t.word).join(' '), raw, 'the raw words read exactly as she said them');
});

test('identical: same, nothing to animate', () => {
  const d = wordDiff('Regulars go first.', 'Regulars go first.');
  assert.equal(d.same, true);
  assert.ok(d.tokens.every(t => t.kind === 'keep'));
});

test('a new word takes a dropped word’s place; one with no place is added', () => {
  const d = wordDiff('don’t ask them for anything you, like, already know', 'Don’t ask for anything we already know.');
  assert.equal(wordDiffClean(d), 'Don’t ask for anything we already know.');
  assert.ok(d.tokens.some(t => t.kind === 'becomes' && t.as === 'we'));
  const e = wordDiff('pass first', 'Regulars: pass first');
  assert.deepEqual(kinds(e), ['added:>Regulars:', 'keep:pass>pass', 'keep:first>first']);
  assert.equal(wordDiff('', '').same, true);
});
