const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const diff = (a, b) => execFileSync('python3', ['-c', "import sys,numpy as np;from PIL import Image as I;a,b=[np.asarray(I.open(f).convert('RGB')).astype(int) for f in sys.argv[1:3]];print('%.2f'%((np.abs(a-b).sum(2)>12).mean()*100))", a, b]).toString().trim();
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [W, H] of [[1440, 900]]) for (const mode of ['day', 'night']) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(m => { try { localStorage.setItem('byoc.timeMode', m); } catch (e) {} }, mode);
    await page.goto('http://localhost:5177/?look=painted&stage=1'); await page.waitForTimeout(2500);
    await page.evaluate(() => { BYOC.reset(); BYOC.stage(2,{instant:true}); BYOC.stage(3,{instant:true}); });
    await page.waitForTimeout(3000);
    const fr = page.frames().find(f => f.url().includes('cast-living'));
    const st = () => fr.evaluate(() => ({ rooms: [...document.querySelectorAll('video.room')].map(v => [v.dataset.t, +(+getComputedStyle(v).opacity).toFixed(2), v.paused, +v.currentTime.toFixed(2)]).filter(r => r[1] > 0), playingPatchVideos: [...document.querySelectorAll('.patch video')].filter(v => !v.paused).length }));
    await page.screenshot({ path: 'r0.png' }); await page.waitForTimeout(1500); await page.screenshot({ path: 'r1.png' });
    console.log(mode, 'idle 1.5 s: screen moving', diff('r0.png', 'r1.png') + '%', JSON.stringify(await st()));
    // run events: the team starts (would play mood clips), and a Yes
    await page.evaluate(() => { BYOC.emit('teammate.start', { seat: 'design' }); BYOC.emit('action.yes', { seat: 'engineering' }); });
    await page.waitForTimeout(1500); console.log('  after team start + yes:', JSON.stringify(await st()));
    // pill tap: how fast does the scene swap?
    await page.locator('[data-mode]').first().click(); await page.waitForTimeout(60);
    console.log('  60 ms after a pill tap:', JSON.stringify(await st()));
    // pet the cat: no clip; hearts don't drift
    await page.locator('[data-spot="cat"]').click(); await page.waitForTimeout(500);
    const h1 = await page.evaluate(() => [...document.querySelectorAll('.pi-heart')].map(h => { const r = h.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), +getComputedStyle(h).opacity]; }));
    await page.waitForTimeout(700);
    const h2 = await page.evaluate(() => [...document.querySelectorAll('.pi-heart')].map(h => { const r = h.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), +getComputedStyle(h).opacity]; }));
    const cat = await fr.evaluate(() => { const v = document.querySelector('.patch[data-who="cat"] video'); return v ? { paused: v.paused, t: v.currentTime } : 'no clip'; });
    await page.waitForTimeout(1500);
    const left = await page.evaluate(() => document.querySelectorAll('.pi-heart').length);
    console.log('  cat pet: clip', JSON.stringify(cat), 'hearts at 0.5 s', JSON.stringify(h1), 'at 1.2 s', JSON.stringify(h2), 'hearts left after 2.7 s:', left);
    console.log('  page errors:', errs.length ? errs : 'none');
    if (mode === 'night') await page.screenshot({ path: 'reduced-night.png' });
    await ctx.close();
  }
  await b.close();
})();
