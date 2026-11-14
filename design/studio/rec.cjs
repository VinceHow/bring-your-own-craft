// node rec.cjs <comp.html> <out-basename> <ms>   -> shots/<out>.webm (motion) and shots/<out>-end.png (2x still, ?still=1)
const { chromium } = require('playwright');
(async () => {
  const [,, page, out, ms] = process.argv;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, recordVideo: { dir: 'shots/vid-' + out, size: { width: 1600, height: 900 } } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4400/looks/comps/' + page);
  await p.waitForTimeout(Number(ms || 6000));
  await ctx.close();
  const p2 = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  await p2.goto('http://localhost:4400/looks/comps/' + page + (page.includes('?') ? '&' : '?') + 'still=1');
  await p2.waitForTimeout(800);
  await p2.screenshot({ path: `shots/${out}-end.png` });
  await b.close();
  const fs = require('fs'); const d = 'shots/vid-' + out; const f = fs.readdirSync(d)[0]; fs.renameSync(`${d}/${f}`, `shots/${out}.webm`); fs.rmdirSync(d);
})();
