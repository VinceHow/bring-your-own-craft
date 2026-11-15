const { chromium } = require('playwright');
const shots = process.env.SHOTS;
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let bad = 0;
  for (const [W, H] of [[1920, 1130], [1440, 900], [1280, 800]]) for (const mode of ['day', 'night']) {
    const page = await b.newPage({ viewport: { width: W, height: H } });
    await page.addInitScript(m => { try { localStorage.setItem('byoc.timeMode', m); } catch (e) {} }, mode);
    await page.goto('http://localhost:5177/?look=painted&stage=1'); await page.waitForTimeout(2500);
    await page.evaluate(() => { BYOC.reset(); BYOC.stage(2,{instant:true}); BYOC.stage(3,{instant:true}); });
    await page.waitForTimeout(2000);
    const measure = () => page.evaluate(() => {
      const els = [...document.querySelectorAll('#room [data-component="place-card"], #room [data-component="her-place-card"]')].filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed');
      const r = els.map(e => { const b = e.getBoundingClientRect(); const s = e.closest('[data-seat]'); return { seat: (s && s.dataset.seat) || e.dataset.seat || '?', state: e.dataset.state || '', x: b.x, y: b.y, w: b.width, h: b.height }; }).filter(r => r.w > 0);
      const out = [];
      for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
        const a = r[i], c = r[j], ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x), oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
        const gx = Math.max(a.x, c.x) - Math.min(a.x + a.w, c.x + c.w), gy = Math.max(a.y, c.y) - Math.min(a.y + a.h, c.y + c.h);
        out.push({ pair: a.seat + '/' + c.seat, overlap: ox > 0 && oy > 0 ? `${Math.round(ox)}x${Math.round(oy)}` : null, gap: Math.round(Math.max(gx, gy)) });
      }
      return { pills: r.map(p => `${p.seat}${p.state ? '(' + p.state + ')' : ''}:${Math.round(p.x)},${Math.round(p.y)} ${Math.round(p.w)}w`), out };
    });
    const idle = await measure();
    await page.evaluate(() => { for (const c of document.querySelectorAll('#room [data-component="place-card"]')) c.dataset.state = 'thinking'; });
    await page.waitForTimeout(1200);
    const think = await measure();
    await page.evaluate(() => { for (const c of document.querySelectorAll('#room [data-component="place-card"]')) c.dataset.state = 'working'; });
    await page.waitForTimeout(1200);
    const work = await measure();
    if (shots) await page.screenshot({ path: `${shots}/pills-working-${mode}-${W}x${H}.png` });
    for (const [k, m] of [['idle', idle], ['thinking', think], ['working', work]]) {
      const ov = m.out.filter(o => o.overlap), tight = m.out.filter(o => !o.overlap && o.gap < 6);
      if (ov.length) bad++;
      console.log(`${W}x${H} ${mode} ${k.padEnd(8)} overlaps: ${ov.map(o => o.pair + ' ' + o.overlap).join(', ') || 'none'}${tight.length ? '  (tight <6px: ' + tight.map(o => o.pair + ' ' + o.gap).join(', ') + ')' : ''}`);
      if (k === 'working' && W === 1440 && mode === 'day') console.log('   ', m.pills.join(' | '));
    }
    await page.close();
  }
  console.log(bad ? `${bad} states with overlaps` : 'no overlaps');
  await b.close();
})();
