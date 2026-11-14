const { chromium } = require('playwright');
(async () => {
  const [,, page, out, dpr, wait] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: Number(dpr||1) });
  await p.goto('http://localhost:4400/looks/comps/' + page);
  await p.waitForTimeout(Number(wait||600));
  await p.screenshot({ path: out });
  await b.close();
})();
