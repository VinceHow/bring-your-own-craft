const { chromium } = require('playwright'); const fs = require('fs');
const [W, H] = process.argv[2].split('x').map(Number), dir = 'sync-' + W;
(async () => {
  fs.rmSync(dir, { recursive: true, force: true });
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir, size: { width: W, height: H } } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.setItem('byoc.timeMode', 'day'); } catch (e) {} });
  await page.goto('http://localhost:5177/?look=painted&stage=1'); await page.waitForTimeout(2500);
  await page.evaluate(() => { BYOC.reset(); BYOC.stage(2,{instant:true}); BYOC.stage(3,{instant:true}); });
  await page.waitForTimeout(3500);
  const fr = page.frames().find(f => f.url().includes('cast-living'));
  const fe = await page.locator('[data-component="living-backdrop"]').boundingBox();
  const g = await fr.evaluate(() => { const r = document.querySelector('.patch[data-who="theo"]').getBoundingClientRect(), c = document.getElementById('canvas').getBoundingClientRect();
    return { r: { x: r.x, y: r.y, w: r.width, h: r.height }, c: { x: c.x, y: c.y, k: c.width / 1600 }, iw: innerWidth }; });
  const s = fe.width / g.iw;
  const P = [fe.x + (g.r.x + g.r.w * .35) * s, fe.y + (g.r.y + g.r.h * .3) * s, g.r.w * .3 * s, g.r.h * .25 * s];
  const R = [fe.x + (g.c.x + 1470 * g.c.k) * s, fe.y + (g.c.y + 130 * g.c.k) * s, 90 * g.c.k * s, 150 * g.c.k * s];
  const crop = [fe.x + (g.c.x + 430 * g.c.k) * s, fe.y + (g.c.y + 240 * g.c.k) * s, 640 * g.c.k * s, 330 * g.c.k * s];
  for (const m of ['night', 'day']) { await page.evaluate(m => PlayfulInk.current.setMode(m), m); await page.waitForTimeout(2500); }
  await ctx.close(); await b.close();
  fs.writeFileSync(dir + '/regions.json', JSON.stringify({ P: P.map(Math.round), R: R.map(Math.round), crop: crop.map(Math.round) }));
})();
