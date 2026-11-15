// Browser check on a phone: reserve two loaves on one device; the name field appears once. Also "not you?".
//   BASE_URL=… node deploy/acceptance/name-once.browser.mjs   (exits 1 on failure; the app should be freshly reset)
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE_URL;
const fail = m => { console.error('FAIL:', m); process.exitCode = 1; };
const browser = await chromium.launch();
const p = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
const errors = []; p.on('pageerror', e => errors.push(String(e)));
const card = id => p.locator(`li.loaf[data-id="${id}"]`);
const open = async id => { await card(id).getByRole('button', { name: /put my name down/i }).click(); await p.waitForTimeout(400); };
let asked = 0;
await p.goto(BASE + '/'); await p.waitForTimeout(1200);
for (const id of ['sourdough', 'rye']) {
  await open(id);
  const field = card(id).locator('input[name="first_name"]');
  if (await field.isVisible()) { asked++; await field.fill('Ana'); }
  else if (!(await card(id).locator('.as').isVisible()) || !/Reserving as Ana/.test(await card(id).locator('.as').innerText())) fail(`${id}: neither the name field nor "Reserving as Ana"`);
  await card(id).getByRole('button', { name: /^reserve$/i }).click(); await p.waitForTimeout(1200);
}
if (asked !== 1) fail(`the name was asked ${asked} times for 2 loaves, want 1`);
const stickers = await p.locator('.sticker').allInnerTexts();
if (stickers.filter(s => /, Ana\./.test(s)).length !== 2) fail('want two bags for Ana, got ' + JSON.stringify(stickers));
// After a reload, still asked zero times (the server remembers the device).
await p.reload(); await p.waitForTimeout(1200);
await open('brioche');
if (await card('brioche').locator('input[name="first_name"]').isVisible()) fail('asked again after a reload');
await card('brioche').getByRole('button', { name: /not you\?/i }).click();
if (!(await card('brioche').locator('input[name="first_name"]').isVisible())) fail('"not you?" did not open the name field');
await p.screenshot({ path: process.env.SHOT || '/dev/null' }).catch(() => {});
if (errors.length) fail('page errors: ' + errors.join(' | '));
await browser.close();
if (!process.exitCode) console.log('ok: name asked once for 2 loaves; remembered after reload; "not you?" opens the field');
