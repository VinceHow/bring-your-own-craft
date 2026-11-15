// Browser check on a phone: the delivered moment. The scripted headline "Delivered: your sourdough is here" lands
// within 1 s of Deliver, with the celebration (flour puff, hand-lettered stamp) around it; under
// prefers-reduced-motion the stamp is there but nothing animates and no flour flies.
//   BASE_URL=… ADMIN_TOKEN=… node deploy/acceptance/delivered.browser.mjs   (resets the shop: never during a talk)
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const { BASE_URL: BASE, ADMIN_TOKEN: TOKEN, SHOTS } = process.env;
const fail = m => { console.error('FAIL:', m); process.exitCode = 1; };
const admin = (p, method = 'POST') => fetch(BASE + p, { method, headers: { Authorization: `Bearer ${TOKEN}` } });

async function run(reducedMotion) {
  await admin('/api/admin/reset');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(String(e)));
  await p.goto(BASE + '/'); await p.waitForTimeout(1000);
  const card = p.locator('li.loaf[data-id="sourdough"]');
  await card.getByRole('button', { name: /put my name down/i }).click();
  await card.locator('input[name="first_name"]').fill('Ana');
  await card.getByRole('button', { name: /^reserve$/i }).click();
  await p.waitForSelector('.bag.reserved', { timeout: 5000 });
  if (SHOTS && !reducedMotion) await p.screenshot({ path: `${SHOTS}/reserved.png` });
  const t0 = Date.now();
  await admin('/api/admin/deliver');
  const headline = await p.waitForSelector('.bag.delivered .sticker', { timeout: 1500 }).catch(() => null);
  const ms = Date.now() - t0;
  if (!headline) return fail(`${reducedMotion ? 'reduced' : 'full'}: no delivered bag within 1.5 s`);
  if (ms > 1000) fail(`delivered after ${ms} ms, want within 1 s`);
  const text = await headline.innerText();
  if (text.trim() !== 'Delivered: your sourdough is here') fail(`headline is "${text}"`);
  const stamp = await p.locator('.bag.delivered .stamp').innerText().catch(() => '');
  if (!/fresh out of the oven/i.test(stamp)) fail(`stamp is "${stamp}"`);
  const flour = await p.locator('.bag.delivered .flour').count();
  const flourShown = flour ? await p.locator('.bag.delivered .flour').isVisible() : false;
  const anim = await p.$eval('.bag.delivered', n => getComputedStyle(n).animationName);
  if (reducedMotion) {
    if (flourShown) fail('reduced motion: flour is showing');
    if (anim !== 'none') fail(`reduced motion: the bag animates (${anim})`);
  } else {
    if (!flour) fail('no flour puff on delivery');
    if (anim === 'none') fail('no reveal animation on delivery');
    await p.waitForTimeout(250);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/delivered.png` });
  }
  if (errors.length) fail('page errors: ' + errors.join(' | '));
  console.log(`${reducedMotion ? 'reduced motion' : 'full motion'}: headline in ${ms} ms, stamp "${stamp}", flour ${flourShown ? 'shown' : 'none'}, animation ${anim}`);
  await browser.close();
}
await run(false);
await run(true);
await admin('/api/admin/reset');
if (!process.exitCode) console.log('ok: the delivered moment lands within 1 s with its headline; reduced motion rests');
