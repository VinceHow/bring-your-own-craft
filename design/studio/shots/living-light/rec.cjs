const { chromium } = require('playwright');
const tag = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: 'rec-' + tag, size: { width: 1440, height: 900 } } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.setItem('byoc.timeMode', 'day'); } catch (e) {} });
  await page.goto('http://localhost:5177/?look=painted&stage=1'); await page.waitForTimeout(2500);
  await page.evaluate(() => { BYOC.reset(); BYOC.stage(2,{instant:true}); BYOC.stage(3,{instant:true}); });
  await page.waitForTimeout(3500);
  const fr = page.frames().find(f => f.url().includes('cast-living'));
  // a marker: the page records when each toggle fires, relative to the video start (approx: video starts at page creation)
  const marks = [];
  for (const m of ['night', 'day']) { marks.push([m, await page.evaluate(m => { PlayfulInk.current.setMode(m); return performance.now(); }, m)]); await page.waitForTimeout(2500); }
  const ct = await fr.evaluate(() => [...document.querySelectorAll('.patch video.on')].map(v => v.paused));
  console.log(tag, 'marks(ms since page start)', JSON.stringify(marks), 'patch videos paused at end:', JSON.stringify(ct));
  await ctx.close(); await b.close();
})();
