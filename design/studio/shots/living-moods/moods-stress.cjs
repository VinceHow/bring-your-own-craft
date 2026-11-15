const { chromium } = require('playwright');
const SECS = +(process.argv[2] || 60);
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5177/?look=painted&stage=1'); await page.waitForTimeout(2500);
  await page.evaluate(() => { BYOC.reset(); BYOC.stage(2,{instant:true}); BYOC.stage(3,{instant:true}); });
  await page.waitForTimeout(2500);
  const fr = page.frames().find(f => f.url().includes('cast-living'));
  await page.evaluate(SECS => {
    const seats = ['design','research','data','strategy','engineering']; let i = 0, seed = 3;
    const r = n => (seed = (seed * 16807) % 2147483647) % n;
    const id = setInterval(() => {
      const s = seats[r(5)], k = r(10);
      if (k < 4) BYOC.emit('chatter', { seat: s, text: 'x' }); else if (k < 6) BYOC.emit('teammate.start', { seat: s });
      else if (k < 7) BYOC.emit('teammate.thinking', { seat: s }); else if (k < 8) BYOC.emit('decided', { seat: s });
      else if (k < 9) BYOC.emit('action.yes', { seat: s }); else BYOC.emit('joint.agreed', { seats: [s, seats[r(5)]] });
      if (++i > SECS / .7) clearInterval(id);
    }, 700);
  }, SECS);
  const frozen = {}, hidden = {}, run = {}, maxRun = {}, fz = {}, maxFz = {}; let samples = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < SECS * 1000 + 3000) {
    const r = await fr.evaluate(() => [...document.querySelectorAll('.patch')].filter(p => ['noor','theo','ines','mika','bo'].includes(p.dataset.who)).map(p => [p.dataset.who, [...p.querySelectorAll('video')].some(v => !v.paused && +getComputedStyle(v).opacity > .5), [...p.querySelectorAll('video')].filter(v => !v.paused && +getComputedStyle(v).opacity < .01).length]));
    samples++; for (const [w, ok, hid] of r) { if (!ok) frozen[w] = (frozen[w] || 0) + 1; if (hid) hidden[w] = (hidden[w] || 0) + 1; run[w] = hid ? (run[w] || 0) + 1 : 0; maxRun[w] = Math.max(maxRun[w] || 0, run[w]); fz[w] = ok ? 0 : (fz[w] || 0) + 1; maxFz[w] = Math.max(maxFz[w] || 0, fz[w]); }
    await page.waitForTimeout(250);
  }
  // a teammate is frozen if no clip of theirs is both visible and playing (short gaps during a 0.18 s swap are normal: count runs of >= 3 samples)
  console.log('samples per teammate:', samples, 'no visible playing clip:', JSON.stringify(frozen), 'a clip playing hidden:', JSON.stringify(hidden), 'longest hidden run (samples):', JSON.stringify(maxRun), 'longest frozen run:', JSON.stringify(maxFz), 'errors:', errs.length);
  await b.close();
})();
