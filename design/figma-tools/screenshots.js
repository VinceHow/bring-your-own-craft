// usage: node shots.js <before|after> [w h dpr outdir]
const { chromium } = require('playwright');
const [,, tag='after', W='1600', H='900', DPR='2', OUT='/home/user/bring-your-own-craft/design/screens'] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: +DPR });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const go = async (q) => {
    await p.goto('http://localhost:3700/' + q);
    if (tag !== 'before') await p.addStyleTag({ url: '/polish.css' });
    await p.evaluate(() => document.fonts.ready);
  };
  const suffix = (W === '1600' ? '' : `-${W}`);
  // walk-in: team seated
  await go('?stage=1');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(2600);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/${tag}-walkin${suffix}.png` });
  // her sheet with asks, and end state: fixture at speed 4
  await go('?stage=1&speed=4');
  await p.keyboard.press('f');
  await p.waitForTimeout(9500);
  await p.screenshot({ path: `${OUT}/${tag}-sheet${suffix}.png` }); await (await p.$('#her-sheet')).screenshot({ path: `${OUT}/${tag}-sheet-close${suffix}.png` });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${OUT}/${tag}-tally${suffix}.png` });
  const t = await p.$('#tally'); if (t && await t.isVisible()) await t.screenshot({ path: `${OUT}/${tag}-tally-close${suffix}.png` });
  console.log('errors:', errs);
  await b.close();
})();
