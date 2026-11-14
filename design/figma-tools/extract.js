// Walk the rendered room and emit compact layer specs for a Figma rebuild.
const { chromium } = require('playwright'); const fs = require('fs');
async function grab(p, rootSel) {
  return p.evaluate((rootSel) => {
    const root = document.querySelector(rootSel);
    const R = root.getBoundingClientRect();
    const out = [];
    const rgb = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
      const a = v.length > 3 ? v[3] : 1; if (a === 0) return null; return [v[0], v[1], v[2], +a.toFixed(2)]; };
    const ang = el => { let t = 0; for (let e = el; e && e !== root.parentElement; e = e.parentElement) { const tf = getComputedStyle(e).transform;
      if (tf && tf !== 'none') { const m = new DOMMatrix(tf); t += Math.atan2(m.b, m.a); } } return +(t * 180 / Math.PI).toFixed(2); };
    const scl = el => { let t = 1; for (let e = el; e && e !== root.parentElement; e = e.parentElement) { const tf = getComputedStyle(e).transform;
      if (tf && tf !== 'none') { const m = new DOMMatrix(tf); t *= Math.hypot(m.a, m.b); } } return t; };
    const clipOK = (el, r) => { for (let e = el; e && e !== root; e = e.parentElement) { const cs = getComputedStyle(e);
      if (cs.overflow !== 'visible' || cs.overflowY !== 'visible') { const c = e.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        if (cx < c.left - 1 || cx > c.right + 1 || cy < c.top - 1 || cy > c.bottom + 1) return false; } } return true; };
    const vis = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } return true; };
    const center = r => [+(r.x + r.width / 2 - R.x).toFixed(1), +(r.y + r.height / 2 - R.y).toFixed(1)];
    const walk = el => {
      if (!vis(el)) return;
      const cs = getComputedStyle(el);
      if (el.tagName.toLowerCase() === 'svg') {
        const r = el.getBoundingClientRect(); if (r.width < 1) return;
        const sc = scl(el); const W = (el.clientWidth || el.getBBox().width) * sc, H = (el.clientHeight || el.getBBox().height) * sc;
        const c = el.cloneNode(true); const col = cs.color;
        if (!c.getAttribute('viewBox')) c.setAttribute('viewBox', `0 0 ${el.clientWidth} ${el.clientHeight}`);
        c.setAttribute('width', W); c.setAttribute('height', H);
        c.querySelectorAll('path').forEach((pp, i) => { const o = el.querySelectorAll('path')[i]; const pc = getComputedStyle(o);
          if (!pp.getAttribute('stroke') && pc.stroke !== 'none') pp.setAttribute('stroke', pc.stroke);
          if (!pp.getAttribute('stroke-width')) pp.setAttribute('stroke-width', pc.strokeWidth);
          if (pc.strokeDasharray !== 'none') pp.setAttribute('stroke-dasharray', pc.strokeDasharray.replace(/px/g, ''));
          if (!pp.getAttribute('fill')) pp.setAttribute('fill', pc.fill); pp.removeAttribute('class'); pp.removeAttribute('style'); });
        c.querySelectorAll('marker').forEach(m => m.remove());
        let s = c.outerHTML.replace(/currentColor/g, col).replace(/marker-end="[^"]*"/g, '');
        // inline computed stroke/fill for classed paths
        out.push({ k: 's', c: center(r), w: +W.toFixed(1), h: +H.toFixed(1), a: ang(el), svg: s, cl: el.getAttribute('class') || '' });
        return;
      }
      if (true) {
        const sc = scl(el); const w = +(el.offsetWidth * sc).toFixed(1), h = +(el.offsetHeight * sc).toFixed(1);
        const bg = rgb(cs.backgroundColor);
        const bw = parseFloat(cs.borderTopWidth) || 0, bl = parseFloat(cs.borderLeftWidth) || 0;
        const bc = rgb(cs.borderTopColor), blc = rgb(cs.borderLeftColor);
        let sh = null; const m = cs.boxShadow.match(/(rgba?\([^)]+\)) (-?[\d.]+)px (-?[\d.]+)px (-?[\d.]+)px/); if (m && cs.boxShadow !== 'none') sh = [rgb(m[1]), +m[2], +m[3]];
        const sides4 = ['Top','Right','Bottom','Left'].map(sd => cs['border' + sd + 'Style'] === 'none' ? 0 : parseFloat(cs['border' + sd + 'Width']) || 0);
        const hasBox = bg || sides4.some(x => x > 0) || (bw && bc && cs.borderTopStyle !== 'none') || (bl && blc && cs.borderLeftStyle !== 'none');
        if (hasBox && w > 0 && h > 0) {
          const r = el.getBoundingClientRect();
          if (clipOK(el.parentElement, r)) out.push({ k: 'b', n: (el.className && el.className.baseVal === undefined ? el.className : el.tagName).toString().split(' ')[0] || el.tagName,
            c: center(r), w, h, a: ang(el), bg, bw: cs.borderTopStyle === 'none' ? 0 : bw, bc, bs: cs.borderTopStyle, bl: cs.borderLeftStyle === 'none' ? 0 : bl, blc,
            rad: (parseFloat(cs.borderTopLeftRadius) || 0) * sc, sh, op: +cs.opacity, sides: sides4 });
        }
      }
      if (el !== root || true) { const b4 = getComputedStyle(el, '::before');
        if (b4.content !== 'none' && b4.position === 'absolute' && rgb(b4.backgroundColor) && !el.matches('.mini-lines li')) {
          const r = el.getBoundingClientRect(), sc = scl(el); const w = parseFloat(b4.width) * sc, h = parseFloat(b4.height) * sc;
          const L = parseFloat(b4.left) * sc, T = parseFloat(b4.top) * sc;
          if (w && h) out.push({ k: 'b', n: 'edge', c: [r.x + L + w / 2 - R.x, r.y + T + h / 2 - R.y], w, h, a: ang(el), bg: rgb(b4.backgroundColor), bw: 0, sides: [0,0,0,0], rad: 0, sh: null, op: 1 }); } }
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim()) {
          const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect();
          if (r.width < 1 || !clipOK(el, r)) continue;
          const tcs = getComputedStyle(el);
          let txt = n.textContent.replace(/\s+/g, ' ').trim();
          // pseudo-element text (e.g. "to her") is skipped; placeholders handled below
          out.push({ k: 't', c: center(r), w: +r.width.toFixed(1), h: +r.height.toFixed(1), a: ang(el), t: txt,
            f: tcs.fontFamily.split(',')[0].replace(/['"]/g, '').trim(), wt: +tcs.fontWeight, it: tcs.fontStyle === 'italic', sz: +(parseFloat(tcs.fontSize) * scl(el)).toFixed(1),
            lh: (parseFloat(tcs.lineHeight) * scl(el)) || null, ls: parseFloat(tcs.letterSpacing) || 0, col: rgb(tcs.color), up: tcs.textTransform === 'uppercase',
            ts: tcs.textShadow !== 'none' ? tcs.textShadow : null, op: +tcs.opacity });
        } else if (n.nodeType === 1) walk(n);
      }
      if (el.tagName === 'INPUT' && el.placeholder && !el.value) { const r = el.getBoundingClientRect();
        out.push({ k: 't', c: [r.x + 60 - R.x, center(r)[1]], w: 120, h: r.height, a: 0, t: el.placeholder, f: 'IBM Plex Sans', wt: 500, it: false, sz: parseFloat(cs.fontSize), lh: null, ls: 0, col: [20,20,20,.38], up: false }); }
      // ::after "to her" tag on brought lines
      if (el.matches && el.matches('.mini-lines li.brought')) { const a = getComputedStyle(el, '::after'); const r = el.getBoundingClientRect();
        out.push({ k: 'b', n: 'to-her', c: [r.right - 26 - R.x, center(r)[1]], w: 52, h: 16, a: ang(el), bg: rgb(a.backgroundColor), bw: 1, bc: [20,20,20,1], bs: 'solid', bl: 0, rad: 2, sh: null, op: 1 });
        out.push({ k: 't', c: [r.right - 26 - R.x, center(r)[1]], w: 44, h: 14, a: ang(el), t: 'to her', f: 'IBM Plex Mono', wt: 600, it: false, sz: 10.5, lh: 14, ls: 0, col: [20,20,20,1], up: false }); }
    };
    walk(root);
    return { w: root.offsetWidth, h: root.offsetHeight, items: out };
  }, rootSel);
}
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const prep = async () => { await p.addStyleTag({ url: '/polish.css' }); await p.addStyleTag({ content: 'body::after{display:none}' }); await p.evaluate(() => document.fonts.ready); };
  await p.goto('http://localhost:3700/?stage=1'); await prep();
  for (const w of [700, 2600, 900]) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(w); }
  fs.writeFileSync('fx-walkin.json', JSON.stringify(await grab(p, '#room')));
  await p.goto('http://localhost:3700/?stage=1&speed=4'); await prep(); await p.keyboard.press('f'); await p.waitForTimeout(13000);
  fs.writeFileSync('fx-run.json', JSON.stringify(await grab(p, '#room')));
  fs.writeFileSync('fx-sheet.json', JSON.stringify(await grab(p, '#her-sheet')));
  await b.close();
  for (const f of ['fx-walkin', 'fx-run', 'fx-sheet']) { const j = JSON.parse(fs.readFileSync(f + '.json')); const c = {}; j.items.forEach(i => c[i.k] = (c[i.k] || 0) + 1); console.log(f, fs.statSync(f + '.json').size, c); }
})();
