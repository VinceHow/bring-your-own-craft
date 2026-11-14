// The app button's "what changed" line (routes/build.js whatChanged): plain words for the page's switches that
// differ from the last version (v1: from the template's defaults), at most three; never her text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
process.env.RUNS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'byoc-appbtn-'));
const { whatChanged } = await import('../routes/build.js');

test('what changed: v1 against the defaults, v2 against v1; the cut-off says its own line', () => {
  const defaults = { phone: true, remember: true, cutoff: false, standingOrder: true };
  const v1 = { phone: false, remember: true, cutoff: true, standingOrder: true };
  assert.deepEqual(whatChanged(v1, defaults, { cutoffLine: 'Order by 8pm for tomorrow' }), ['no phone field', 'Order by 8pm for tomorrow']);
  assert.deepEqual(whatChanged({ ...v1, remember: false }, v1, {}, true), ['remembers no one']);
  assert.deepEqual(whatChanged(v1, v1, {}, true), ['same calls, fresh words']);
  assert.deepEqual(whatChanged(defaults, defaults), ['the template as the team agreed it']);
  const many = { phone: false, remember: false, cutoff: true, standingOrder: false };
  assert.equal(whatChanged(many, defaults).length, 3, 'at most three');
});
