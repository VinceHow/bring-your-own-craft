// Run: PORT=5177 node server.js, then: PORT=5177 node design/studio/shots/living-night/night-suite.js 1440 900 (needs python3 with numpy + Pillow).
// The night-freeze repro list. After each step: is the visible room video playing and advancing, does every visible
// patch video advance, and how much of the screen actually moves (from real screenshots).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const W = +(process.argv[2] || 1440), H = +(process.argv[3] || 900);
const BASE = 'http://localhost:' + (process.env.PORT || 5177) + '/?look=painted&stage=1';
let fails = 0;
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR', e.message));
  const fr = () => page.frames().find(f => f.url().includes('cast-living'));
  const setup = async () => { await page.waitForTimeout(2500); await page.evaluate(() => { BYOC.reset(); BYOC.stage(2,{instant:true}); BYOC.stage(3,{instant:true}); }); await page.waitForTimeout(2500); };
  const check = async (label) => {
    const f = fr();
    const snap = () => f.evaluate(() => ({
      room: [...document.querySelectorAll('video.room')].filter(v => +getComputedStyle(v).opacity > .5).map(v => ({ t: v.dataset.t, paused: v.paused, ct: v.currentTime })),
      patches: [...document.querySelectorAll('.patch')].filter(p => +getComputedStyle(p).opacity > .01).map(p => ({ who: p.dataset.who, ct: [...p.querySelectorAll('video.on')].map(v => v.currentTime), paused: [...p.querySelectorAll('video.on')].map(v => v.paused) })),
      time: window.living && window.living.time }));
    const a = await snap();
    await page.screenshot({ path: 's0.png' }); await page.waitForTimeout(800); await page.screenshot({ path: 's1.png' });
    const c = await snap();
    const mv = execFileSync('python3', ['-c', "import numpy as np;from PIL import Image as I;a,b=[np.asarray(I.open(f).convert('RGB')).astype(int) for f in ('s0.png','s1.png')];print('%.2f'%((np.abs(a-b).sum(2)>12).mean()*100))"]).toString().trim();
    const r0 = a.room[0], r1 = c.room.find(r => r.t === (r0 && r0.t));
    const roomOk = r0 && r1 && !r1.paused && r1.ct !== r0.ct;
    const stuck = c.patches.filter(p => { const o = a.patches.find(x => x.who === p.who); return o && p.ct.length && o.ct.length && p.ct[0] === o.ct[0]; }).map(p => p.who);
    const ok = roomOk && !stuck.length && +mv > 1;
    if (!ok) fails++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(34)} scene=${c.time} room=${r1 ? r1.t : '-'} playing=${r1 && !r1.paused} adv=${r1 && r0 ? (r1.ct - r0.ct).toFixed(2) : '-'}s patches=${c.patches.length} stuck=[${stuck}] moving=${mv}%`);
  };
  const pill = page.locator('[data-mode]').first();
  const toMode = async (m, gap) => { for (let i = 0; i < 4 && (await pill.getAttribute('data-mode')) !== m; i++) { await pill.click(); await page.waitForTimeout(gap); } };

  await page.goto(BASE); await setup();
  await check('cycle at start');
  for (let i = 0; i < 12; i++) { await pill.click(); await page.waitForTimeout(1500); }
  await toMode('night', 1500); await page.waitForTimeout(1000); await check('12 slow toggles -> night');
  for (let i = 0; i < 15; i++) { await pill.click(); await page.waitForTimeout(120); }
  await toMode('night', 120); await page.waitForTimeout(1200); await check('15 fast toggles -> night');
  for (let i = 0; i < 9; i++) { await pill.click(); await page.waitForTimeout(40); }
  await toMode('night', 40); await page.waitForTimeout(1200); await check('9 very fast (40ms) -> night');
  await page.evaluate(() => BYOC.emit('focus.open', {})); await page.waitForTimeout(1500); await check('night, focus open');
  await page.evaluate(() => BYOC.emit('focus.close', {})); await page.waitForTimeout(1500); await check('night, focus closed');
  await page.reload(); await setup(); await check('reload in night (&night=1)');
  console.log('   iframe src:', fr().url().replace(/^.*cast-living/, 'cast-living'));
  await page.waitForTimeout(60000); await check('night, after 60 s');
  await page.keyboard.press('r'); await page.waitForTimeout(8000); await check('night, replay R +8 s');
  await page.waitForTimeout(20000); await check('night, replay R +28 s');
  await page.screenshot({ path: `suite-night-${W}.png` });
  console.log(fails ? `${fails} FAILED` : 'all passed');
  await b.close();
})();
