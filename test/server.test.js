import { test } from 'node:test';
import assert from 'node:assert';
test('server module loads', async () => { const m = await import('../server.js'); assert.ok(m.default); });
