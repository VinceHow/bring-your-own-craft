const { chromium } = require('playwright');
const OUT = '/home/user/bring-your-own-craft/design/studio/shots/living-times/';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [W, H] of [[1920, 1130], [1440, 900], [1280, 800]]) {
    const page = await b.newPage({ viewport: { width: W, height: H } });
    await page.addInitScript(() => { try { localStorage.setItem('byoc.timeMode', 'cycle'); } catch (e) {} });
    await page.goto('http://localhost:5177/?look=painted&stage=1'); await page.waitForTimeout(2500);
    await page.evaluate(() => { BYOC.reset(); BYOC.stage(2,{instant:true}); BYOC.stage(3,{instant:true}); });
    await page.waitForTimeout(2500);
    const fr = page.frames().find(f => f.url().includes('cast-living'));
    for (const t of ['morning', 'building', 'evening']) {
      await fr.evaluate(t => window.living.setTime(t), t); await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT}room-${t}-${W}x${H}.jpg`, type: 'jpeg', quality: 86 });
    }
    await page.close(); console.log(W, 'ok');
  }
  await b.close();
})();
