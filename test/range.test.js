// Static files answer HTTP Range requests (server.js), so <video> can seek and Safari plays the painted look's clips.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { request } from 'node:http';

const { default: server, parseRange } = await import('../server.js');
await new Promise(r => server.listen(0, '127.0.0.1', r));
after(() => server.close());
const port = server.address().port;
const FILE = new URL('../public/word-diff.js', import.meta.url);
const BYTES = fs.readFileSync(FILE), SIZE = BYTES.length;

function get(path, headers = {}, method = 'GET') {
  return new Promise((ok, no) => {
    const req = request({ host: '127.0.0.1', port, path, method, headers }, res => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => ok({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', no); req.end();
  });
}

test('a range gets 206 with exactly those bytes, Content-Range and Content-Length', async () => {
  const r = await get('/word-diff.js', { Range: 'bytes=10-49' });
  assert.equal(r.status, 206);
  assert.equal(r.headers['content-range'], `bytes 10-49/${SIZE}`);
  assert.equal(r.headers['content-length'], '40');
  assert.equal(r.headers['accept-ranges'], 'bytes');
  assert.ok(r.body.equals(BYTES.subarray(10, 50)));
});

test('an open-ended range runs to the end; a suffix range is the last n bytes', async () => {
  const open = await get('/word-diff.js', { Range: `bytes=${SIZE - 7}-` });
  assert.equal(open.status, 206);
  assert.equal(open.headers['content-range'], `bytes ${SIZE - 7}-${SIZE - 1}/${SIZE}`);
  assert.ok(open.body.equals(BYTES.subarray(SIZE - 7)));
  const suffix = await get('/word-diff.js', { Range: 'bytes=-5' });
  assert.equal(suffix.status, 206);
  assert.equal(suffix.headers['content-range'], `bytes ${SIZE - 5}-${SIZE - 1}/${SIZE}`);
  assert.ok(suffix.body.equals(BYTES.subarray(SIZE - 5)));
  const past = await get('/word-diff.js', { Range: `bytes=0-${SIZE + 100}` }); // an end past the file is clipped
  assert.equal(past.status, 206);
  assert.ok(past.body.equals(BYTES));
});

test('a range past the end gets 416 with bytes */size', async () => {
  const r = await get('/word-diff.js', { Range: `bytes=${SIZE}-` });
  assert.equal(r.status, 416);
  assert.equal(r.headers['content-range'], `bytes */${SIZE}`);
  assert.equal(r.body.length, 0);
});

test('a plain GET is still 200 with the whole file, and says it accepts ranges; multi-range gets the whole file', async () => {
  const r = await get('/word-diff.js');
  assert.equal(r.status, 200);
  assert.equal(r.headers['accept-ranges'], 'bytes');
  assert.equal(r.headers['content-length'], String(SIZE));
  assert.ok(r.body.equals(BYTES));
  const multi = await get('/word-diff.js', { Range: 'bytes=0-1,5-6' });
  assert.equal(multi.status, 200);
  assert.ok(multi.body.equals(BYTES));
  assert.equal((await get('/index.html')).status, 200);
  assert.equal((await get('/no-such-file.mp4', { Range: 'bytes=0-1' })).status, 404);
});

test('the path-traversal guard still holds', async () => {
  assert.equal((await get('/..%2f..%2fpackage.json')).status, 403);
  assert.equal((await get('/runs/..%2fpackage.json')).status, 403);
});

test('parseRange', () => {
  assert.deepEqual(parseRange('bytes=0-0', 10), { start: 0, end: 0 });
  assert.deepEqual(parseRange('bytes=-20', 10), { start: 0, end: 9 });
  assert.equal(parseRange('bytes=-0', 10), 'unsatisfiable');
  assert.equal(parseRange('bytes=5-2', 10), 'unsatisfiable');
  assert.equal(parseRange('items=0-1', 10), null);
  assert.equal(parseRange('bytes=-', 10), null);
});
