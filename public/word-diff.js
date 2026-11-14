// Word diff: her raw words against their tidy, for the raw → clean swap on each piece (public/focus-doc.js).
// wordDiff(raw, tidy) -> { same, tokens: [{ word, as, kind }] } in reading order, where kind is
//   'keep'    the word stays as she said it            (as === word)
//   'drop'    a word the tidy took out (um, like, …)   (as === '')
//   'becomes' the same word, spelled or cased anew      (it → It, know → know.), or a dropped word whose
//             place a new tidy word takes (you, → you)
//   'added'   a tidy word with no raw word to stand on  (word === ''; rare: lib/tidy.js rejects most additions)
// `same` is true when nothing changes (then there's nothing to animate). Matching is a longest common subsequence
// on the words with case and punctuation set aside. Runs in the browser (BYOC.wordDiff) and in node (tests).
(function (root) {
  'use strict';
  const split = s => String(s || '').trim().split(/\s+/).filter(Boolean);
  const norm = w => w.toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}']+/gu, '');

  function wordDiff(raw, tidy) {
    const a = split(raw), b = split(tidy), A = a.map(norm), Bn = b.map(norm);
    const n = a.length, m = b.length;
    // L[i][j]: LCS length of a[i..] and b[j..] (pieces are short: a few dozen words).
    const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      L[i][j] = A[i] && A[i] === Bn[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const tokens = [];
    // A gap: raw words a[i0..i1) and tidy words b[j0..j1) between two matches. Each new tidy word takes the place
    // of a dropped raw word, last ones first (the comp's "you know" → "you."); any left over is added.
    const gap = (i0, i1, j0, j1) => {
      const drops = [], adds = b.slice(j0, j1);
      for (let i = i0; i < i1; i++) drops.push({ word: a[i], as: '', kind: 'drop' });
      for (let k = adds.length - 1, d = drops.length - 1; k >= 0; k--, d--) {
        if (d >= 0) { drops[d].as = adds[k]; drops[d].kind = 'becomes'; }
        else drops.splice(0, 0, { word: '', as: adds[k], kind: 'added' });
      }
      tokens.push(...drops);
    };
    let i = 0, j = 0, gi = 0, gj = 0;
    while (i < n && j < m) {
      if (A[i] && A[i] === Bn[j]) {
        gap(gi, i, gj, j);
        tokens.push({ word: a[i], as: b[j], kind: a[i] === b[j] ? 'keep' : 'becomes' });
        i++; j++; gi = i; gj = j;
      } else if (L[i + 1][j] >= L[i][j + 1]) i++;
      else j++;
    }
    gap(gi, n, gj, m);
    return { same: tokens.every(t => t.kind === 'keep'), tokens };
  }
  const clean = d => d.tokens.map(t => t.as).filter(Boolean).join(' ');

  const B = root.BYOC = root.BYOC || {};
  B.wordDiff = wordDiff; B.wordDiffClean = clean;
  if (typeof module === 'object' && module.exports) module.exports = { wordDiff, clean };
})(typeof window !== 'undefined' ? window : globalThis);
