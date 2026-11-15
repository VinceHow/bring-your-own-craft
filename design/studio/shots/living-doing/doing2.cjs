const { chromium } = require('playwright');
const tag = process.argv[2] || 'x';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let bad = 0;
  for (const [W, H] of [[1920, 1130], [1440, 900], [1280, 800]]) {
    const page = await b.newPage({ viewport: { width: W, height: H } });
    await page.goto('http://localhost:5177/?look=painted&stage=1'); await page.waitForTimeout(2500);
    await page.evaluate(() => { BYOC.reset(); BYOC.stage(2,{instant:true}); BYOC.stage(3,{instant:true}); });
    await page.waitForTimeout(1500);
    const meas = () => page.evaluate(() => {
      const box = e => { if (!e) return null; const cs = getComputedStyle(e); if (e.hidden || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .05) return null; const b = e.getBoundingClientRect(); return b.width && b.height ? { x: b.x, y: b.y, w: b.width, h: b.height } : null; };
      const s = box(document.querySelector('#room [data-component="team-doing"]'));
      const out = { strip: !!s, text: (document.querySelector('#room [data-component="team-doing"]') || {}).textContent || '' , hits: [] };
      for (const id of ['her-sheet', 'her-form', 'her-input']) { const o = box(document.getElementById(id)); if (!s || !o) continue;
        const ox = Math.min(s.x + s.w, o.x + o.w) - Math.max(s.x, o.x), oy = Math.min(s.y + s.h, o.y + o.h) - Math.max(s.y, o.y);
        if (ox > 0 && oy > 0) out.hits.push(`${id} ${Math.round(ox)}x${Math.round(oy)}`); }
      return out; });
    // her input focused (she's about to type), then the first sketch begins
    await page.evaluate(() => { document.getElementById('her-input') && document.getElementById('her-input').focus(); BYOC.emit('sketch.user', { label: 'Bakery staff' }); BYOC.emit('flow.line', { text: 'choose, order, pick up' }); });
    await page.waitForTimeout(800);
    const a = await meas(); if (a.hits.length) bad++;
    await page.screenshot({ path: `doing-${tag}-${W}.png` });
    // freshness: other events keep coming (chatter from others), but Noor's sketch line should go after ~6 s
    await page.evaluate(() => { const iv = setInterval(() => BYOC.emit('chatter', { seat: 'data', text: 'x' }), 2000); setTimeout(() => clearInterval(iv), 9000); });
    await page.waitForTimeout(8000);
    const b8 = await meas();
    await page.waitForTimeout(9000);
    const c17 = await meas();
    console.log(`${W}x${H} ${tag}: at 0.8s strip=${a.strip} overlaps=[${a.hits}] "${a.text.replace(/\n/g, ' / ')}" | at 8.8s "${b8.text.replace(/\n/g, ' / ')}" visible=${b8.strip} | at 17.8s (quiet 8s) visible=${c17.strip} "${c17.text.replace(/\n/g, ' / ')}"`);
    await page.close();
  }
  console.log(bad ? bad + ' sizes overlap' : 'no overlap');
  await b.close();
})();
