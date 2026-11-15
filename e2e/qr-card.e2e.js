// The QR card (Vincent, 15 Nov): pressing "Open the app" also shows, in the room tab, a card the audience scans for the
// live bakery, only when /api/health's deployUrl is the Railway site public/qr-live-site.svg encodes. Stubbed: no models.
// Run: node --test e2e/qr-card.e2e.js   (QR_SHOT=path.png also saves a 1920x1080 still, painted)
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4900 + Math.floor(Math.random() * 90);
const RUNS = fs.mkdtempSync('/tmp/byoc-qr-e2e-');
const LIVE = 'https://bring-your-own-craft-production.up.railway.app';
let srv, logs = '', browser;
before(async () => {
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), RUNS_DIR: RUNS } });
  await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('server did not start:\n' + logs)), 20000);
    const check = d => { logs += d || ''; if (logs.includes('room on')) { clearTimeout(t); res(); } }; srv.stdout.on('data', check); srv.stderr.on('data', check); });
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); srv?.kill(); fs.rmSync(RUNS, { recursive: true, force: true }); });

async function room(look, deployUrl, size = { width: 1600, height: 900 }) {
  const p = await browser.newPage({ viewport: size });
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  await p.route('**/api/health', async r => { const res = await r.fetch(); const j = await res.json(); if (deployUrl) j.deployUrl = deployUrl; else delete j.deployUrl; await r.fulfill({ json: j }); });
  await p.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await p.goto(`http://localhost:${PORT}/?stage=1&look=${look}`);
  await p.waitForFunction(() => window.BYOC && BYOC.app && BYOC.dispatch, null, { timeout: 8000 });
  await p.waitForTimeout(400); // /api/health answered
  await p.evaluate(() => { BYOC.run = 'stub-run'; }); await p.evaluate(() => BYOC.dispatch({ run: 'stub-run', type: 'build.done', version: 1, url: '/runs/stub-run/page/' }, 'live'));
  await p.waitForFunction(() => BYOC.app.state() === 'ready', null, { timeout: 3000 });
  return { p, errors };
}

for (const look of ['painted', 'plain']) {
  test(`${look}: with the live deploy, Open the app shows only the QR card at once, no new tab; ×, Esc and a click outside close it`, async () => {
    const { p, errors } = await room(look, LIVE);
    const pages = () => p.context().pages().length, before = pages();
    let popups = 0; p.on('popup', () => popups++); p.context().on('page', () => popups++);
    await p.locator('#app-button .app-open').waitFor({ state: 'visible' }); // the look may bring the button in a beat later
    // the press, timed inside the page: the card is up within 500ms of the click (it is shown in the click itself)
    const ms = await p.evaluate(() => new Promise(res => { const t0 = performance.now();
      document.querySelector('#app-button .app-open').click();
      const check = () => { const c = document.querySelector('[data-component="qr-card"]'); if (c && c.offsetParent !== null) res(performance.now() - t0); else if (performance.now() - t0 > 2000) res(9999); else requestAnimationFrame(check); };
      check(); }));
    assert.ok(ms < 500, `the card within 500ms of the press (${Math.round(ms)}ms)`);
    const card = p.locator('[data-component="qr-card"]');
    await card.waitFor({ state: 'visible', timeout: 500 });
    assert.deepStrictEqual(await p.evaluate(() => window.__opened), [], 'no window.open');
    await p.waitForTimeout(300);
    assert.strictEqual(popups, 0, 'no popup or new page'); assert.strictEqual(pages(), before, 'the page count stays');
    assert.strictEqual(await card.getAttribute('data-state'), 'open');
    assert.match(await p.getAttribute('[data-component="qr-card"] img', 'src'), /qr-live-site-card\.png$/, 'the card Vincent picked, as it is');
    await p.waitForFunction(() => { const i = document.querySelector('[data-component="qr-card"] img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 3000 });
    const img = await p.locator('[data-component="qr-card"] img').boundingBox();
    assert.ok(img.height >= 480, `the card is large: at least 480px tall on the 1600x900 stage (${img.height})`);
    // never covers the app button, which stays clickable above it
    const btn = await p.locator('#app-button .app-open').boundingBox(), c = await card.boundingBox();
    const overlap = !(btn.x > c.x + c.width || btn.x + btn.width < c.x || btn.y > c.y + c.height || btn.y + btn.height < c.y);
    assert.ok(!overlap, 'the card does not cover the app button');
    assert.ok(await p.evaluate(() => { const a = document.querySelector('#app-button'), w = document.querySelector('[data-component="qr-card"]').parentElement;
      return a.parentElement === w.parentElement && +getComputedStyle(a).zIndex > +getComputedStyle(w).zIndex; }), 'the app button stacks above the card (same layer, higher z)');
    await p.keyboard.press('Escape'); assert.ok(await card.isHidden(), 'Esc closes it');
    await p.click('#app-button .app-open'); await card.waitFor({ state: 'visible' });
    await p.click('[data-component="qr-card"] [data-slot="close"]'); assert.ok(await card.isHidden(), '× closes it');
    await p.click('#app-button .app-open'); await card.waitFor({ state: 'visible' });
    await p.mouse.click(20, 20); assert.ok(await card.isHidden(), 'a click outside closes it');
    assert.deepStrictEqual(errors, []);
    await p.close();
  });
  test(`${look}: no card without the live deploy (no deployUrl, or another one)`, async () => {
    for (const d of [null, 'https://example.org']) {
      const { p, errors } = await room(look, d);
      await p.click('#app-button .app-open'); await p.waitForTimeout(300);
      assert.strictEqual(await p.evaluate(() => window.__opened.length), 1, 'the new tab still opens');
      assert.strictEqual(await p.locator('[data-component="qr-card"]:visible').count(), 0, `no card (deployUrl ${d})`);
      assert.deepStrictEqual(errors, []);
      await p.close();
    }
  });
}

test('the still: 1920x1080, painted, the card open', { skip: !process.env.QR_SHOT }, async () => {
  const { p } = await room('painted', LIVE, { width: 1920, height: 1080 });
  await p.click('#app-button .app-open');
  await p.waitForFunction(() => { const i = document.querySelector('[data-component="qr-card"] img'); return i && i.naturalWidth > 0; });
  const h = (await p.locator('[data-component="qr-card"] img').boundingBox()).height; assert.ok(h >= 560, `at least 560px tall at 1920x1080 (${h})`);
  await p.waitForTimeout(500);
  await p.screenshot({ path: process.env.QR_SHOT });
  await p.close();
});
