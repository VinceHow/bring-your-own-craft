// node contrast.cjs "<page?query>" -> the lowest-contrast visible text, worst first. Only text that is really on top
// (elementFromPoint at its centre), against the composited pixels behind it (text hidden), the median pixel behind it (an outline or a rounded corner in the box doesn't count).
const { chromium } = require('playwright');
const lum = ([r, g, b]) => { const f = c => (c /= 255) <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto('http://localhost:4400/looks/comps/' + process.argv[2]); await p.waitForTimeout(3000);
  const items = await p.evaluate(() => { const out = []; let i = 0;
    for (const el of document.querySelectorAll('body *')) { const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el); if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden') continue;
      let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity; if (op < .5) continue;
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!top || !(top === el || el.contains(top) || top.contains(el))) continue;
      el.dataset.cc = i; out.push({ i: i++, t: el.textContent.trim().slice(0, 40), c: cs.color, op, size: cs.fontSize, box: [r.left, r.top, r.width, r.height] }); }
    return out; });
  await p.addStyleTag({ content: '[data-cc] { color: transparent !important; -webkit-text-fill-color: transparent !important; } [data-cc] * { color: transparent !important; }' });
  const png = (await p.screenshot()).toString('base64'), q = await b.newPage();   // decode the pixels in a blank page's canvas
  const data = await q.evaluate(async src => { const im = new Image(); im.src = src; await im.decode(); const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 900;
    const g = cv.getContext('2d'); g.drawImage(im, 0, 0); return Array.from(g.getImageData(0, 0, 1600, 900).data); }, 'data:image/png;base64,' + png);
  const shot = { data }, res = [];
  for (const it of items) { const [x, y, w, h] = it.box.map(Math.round), px = [];
    for (let yy = Math.max(0, y); yy < Math.min(900, y + h); yy += 2) for (let xx = Math.max(0, x); xx < Math.min(1600, x + w); xx += 2) { const k = (yy * 1600 + xx) * 4; px.push([shot.data[k], shot.data[k + 1], shot.data[k + 2]]); }
    if (!px.length) continue; px.sort((a, c) => lum(a) - lum(c));
    const m = it.c.match(/[\d.]+/g).map(Number), a = (m[3] ?? 1) * it.op;
    const worst = [px[Math.floor(px.length * .5)]].map(bg => ratio(bg.map((v, j) => v * (1 - a) + m[j] * a), bg));
    res.push({ ratio: +Math.min(...worst).toFixed(2), t: it.t, size: it.size }); }
  console.log(JSON.stringify(res.sort((a, c) => a.ratio - c.ratio).slice(0, 5))); await b.close();
})();
