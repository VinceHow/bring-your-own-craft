// Records the room's magic moments in a real browser and writes the marks; strips.py cuts the frame strips.
const { chromium } = require('playwright');
const fs = require('fs');
const [W, H] = (process.argv[2] || '1440x900').split('x').map(Number), mode = process.argv[3] || 'day', out = process.argv[4] || 'strips';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const dir = `${out}/rec-${W}-${mode}`; fs.rmSync(dir, { recursive: true, force: true });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir, size: { width: W, height: H } } });
  const page = await ctx.newPage(); const T0 = Date.now();
  const at = () => (Date.now() - T0) / 1000;
  await page.addInitScript(m => { try { localStorage.setItem('byoc.timeMode', m); } catch (e) {} }, mode === 'day' ? 'cycle' : 'night');
  await page.goto('http://localhost:5177/?look=painted&stage=1'); await page.waitForTimeout(2500);
  await page.evaluate(() => { BYOC.reset(); BYOC.stage(2,{instant:true}); BYOC.stage(3,{instant:true}); });
  await page.waitForTimeout(3000);
  const fr = page.frames().find(f => f.url().includes('cast-living'));
  const fe = await page.locator('[data-component="living-backdrop"]').boundingBox();
  const box = async (who) => { const r = await fr.evaluate(w => { const e = document.querySelector(`.patch[data-who="${w}"]`).getBoundingClientRect(); return { x: e.x, y: e.y, w: e.width, h: e.height, iw: innerWidth }; }, who);
    const k = fe.width / r.iw; return { x: Math.round(fe.x + r.x * k), y: Math.round(fe.y + r.y * k), w: Math.round(r.w * k), h: Math.round(r.h * k) }; };
  const marks = {};
  // 1. the team getting to work: everyone starts, a beat apart, as a real run does
  const mk = await box('mika'), nr = await box('wren'); marks.team = { t: at(), crop: null }; marks.teamclose = { t: 0, crop: { x: mk.x, y: Math.min(mk.y, nr.y), w: nr.x + nr.w - mk.x, h: Math.max(mk.y + mk.h, nr.y + nr.h) - Math.min(mk.y, nr.y) } };
  await page.evaluate(async () => { for (const s of ['research', 'design', 'engineering', 'data', 'strategy']) { BYOC.emit('teammate.start', { seat: s }); await new Promise(r => setTimeout(r, 250)); } });
  marks.teamclose.t = marks.team.t;
  await page.waitForTimeout(7000);
  // 2. Bo's smile on Yes
  marks.yes = { t: at(), crop: await box('bo') };
  await page.evaluate(() => BYOC.emit('action.yes', { seat: 'engineering' }));
  await page.waitForTimeout(6000);
  // 3. the toys
  for (const toy of ['record', 'cat', 'coffee']) {
    const c = await box(toy);
    marks[toy] = { t: at(), crop: { x: Math.max(0, c.x - 30), y: Math.max(0, c.y - 30), w: Math.min(W, c.w + 60), h: Math.min(H, c.h + 60) } };
    await page.locator(`[data-spot="${toy}"]`).click();
    await page.waitForTimeout(6500);
    if (toy === 'record') { await page.locator(`[data-spot="record"]`).click(); await page.waitForTimeout(300); await page.locator(`[data-spot="record"]`).click(); await page.waitForTimeout(300); await page.locator(`[data-spot="record"]`).click(); await page.waitForTimeout(500); }
  }
  await ctx.close(); await b.close();
  fs.writeFileSync(`${dir}/marks.json`, JSON.stringify(marks));
  console.log(W, mode, 'recorded', JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, v.t.toFixed(1)]))));
})();
