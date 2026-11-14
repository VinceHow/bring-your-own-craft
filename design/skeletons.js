// Regenerates the markup skeletons in docs/COMPONENTS.md from the live DOM in /gallery (server on PORT, default 3700).
// Usage: PORT=3700 node server.js & then OUT=skel.json node design/skeletons.js. No model calls.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await p.goto('http://localhost:' + (process.env.PORT || 3700) + '/gallery');
  await p.waitForFunction(() => document.body.dataset.done === '1', null, { timeout: 170000 });
  const out = await p.evaluate(() => {
    const KEEP = /^(data-(component|state|slot|seat|kind|ask|joint|node|sheet|step|view|look)|class|id|aria-expanded|hidden|contenteditable|type|role)$/;
    function skel(el, depth, lines) {
      if (depth > 6) return;
      const attrs = [...el.attributes].filter(a => KEEP.test(a.name)).map(a => {
        let v = a.value; if (a.name === 'class') v = v.split(/\s+/).filter(c => !/^(fs-in|is-on|tray-top)$/.test(c) || true).join(' ');
        return v === '' ? a.name : `${a.name}="${v.length > 40 ? v.slice(0, 40) + '…' : v}"`;
      });
      const tag = el.tagName.toLowerCase();
      if (tag === 'svg') { lines.push('  '.repeat(depth) + '<svg>…</svg>'); return; }
      if (tag === 'iframe') { lines.push('  '.repeat(depth) + `<iframe${attrs.length ? ' ' + attrs.join(' ') : ''}>`); return; }
      const kids = [...el.children].filter(c => !['STYLE', 'SCRIPT', 'BR'].includes(c.tagName));
      const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
      const open = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
      if (!kids.length) { lines.push('  '.repeat(depth) + open + (text ? (text.length > 36 ? text.slice(0, 36) + '…' : text) : '') + `</${tag}>`); return; }
      lines.push('  '.repeat(depth) + open + (text ? ' ' + (text.length > 30 ? text.slice(0, 30) + '…' : text) : ''));
      // collapse runs of same-shaped siblings
      let prevKey = null, run = 0;
      for (const k of kids) {
        const key = k.tagName + '.' + k.className;
        if (key === prevKey) { run++; continue; }
        if (run) lines.push('  '.repeat(depth + 1) + `… ×${run} more`);
        run = 0; prevKey = key;
        skel(k, depth + 1, lines);
      }
      if (run) lines.push('  '.repeat(depth + 1) + `… ×${run} more`);
      lines.push('  '.repeat(depth) + `</${tag}>`);
    }
    const res = {};
    for (const fig of document.querySelectorAll('figure')) {
      const comp = fig.closest('section').id.slice(2), state = fig.querySelector('b').textContent;
      if (res[comp]) continue;
      const fr = fig.querySelector('iframe'); if (!fr) continue;
      const sel = fig.closest('section').querySelector('h2 code').textContent;
      const el = fr.contentDocument.querySelector(sel); if (!el) continue;
      const lines = []; skel(el, 0, lines);
      res[comp] = { state, lines: lines.slice(0, 45).concat(lines.length > 45 ? ['  …'] : []) };
    }
    return res;
  });
  require('fs').writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  console.log(Object.keys(out).length, Object.keys(out).join(' '));
  await b.close();
})();
