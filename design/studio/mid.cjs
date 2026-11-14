// node mid.cjs <page> <out-prefix> <ms,ms,...> [dpr]
const { chromium } = require('playwright');
(async () => {
  const [,, page, out, times, dpr] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: Number(dpr || 1) });
  await p.goto('http://localhost:4400/looks/comps/' + page);
  const t0 = Date.now();
  for (const t of times.split(',').map(Number)) { const w = t - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); await p.screenshot({ path: `shots/${out}-${t}.png` }); }
  await b.close();
})();
