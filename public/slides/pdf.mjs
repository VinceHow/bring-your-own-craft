// Prints the close deck to public/slides/slides.pdf, the fallback if the browser deck can't run on stage.
// Each slide is captured exactly as it shows on screen (1920×1080), then the captures are printed with page.pdf, one
// landscape page per slide. (Printing the live page directly rasterises ink-paper's paper textures at print
// resolution: 110 MB. Captures keep it small and identical to the screen.)
//   node public/slides/pdf.mjs      (needs Playwright with Chromium)
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)('playwright');   // require finds a global install; import doesn't
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const deck = pathToFileURL(join(here, 'index.html')).href;
const shots = [];
for (let s = 0; ; s++) {
  await page.goto(`${deck}?s=${s}&still=1`);
  await page.waitForSelector('body[data-ready]');
  await page.waitForTimeout(300);
  if (await page.evaluate(n => !document.querySelector(`.slide[data-n="${n}"]`), s)) break;
  shots.push((await page.screenshot({ type: 'jpeg', quality: 90 })).toString('base64'));
}
await page.setContent(`<!doctype html><style>@page{size:1920px 1080px;margin:0}body{margin:0}img{display:block;width:1920px;height:1080px;break-after:page}</style>${shots.map(b => `<img src="data:image/jpeg;base64,${b}">`).join('')}`);
await page.pdf({ path: join(here, 'slides.pdf'), width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(`wrote ${join(here, 'slides.pdf')}: ${shots.length} slides`);
