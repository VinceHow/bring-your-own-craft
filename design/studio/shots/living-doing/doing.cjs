// Replays the rehearsal (R) and samples the team-doing strip against her idea sheet and its input every 500 ms.
const { chromium } = require('playwright');
const [W, H] = (process.argv[2] || '1440x900').split('x').map(Number), SECS = +(process.argv[3] || 90), shot = process.env.SHOT;
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  await ctx.route('**/api/**', r => r.request().method() === 'GET' ? r.continue() : r.fulfill({ json: { ok: true } }));
  const page = await ctx.newPage();
  await page.goto('http://localhost:5177/?look=painted&stage=1'); await page.waitForTimeout(2500);
  await page.keyboard.press('r');
  const t0 = Date.now(); let overlaps = 0, samples = 0, visible = 0, longest = 0, run = 0, worst = null, stale = 0;
  let lastText = '', since = 0, maxSame = 0, shotDone = false; const lines = new Map(); let maxLine = 0;
  while (Date.now() - t0 < SECS * 1000) {
    const r = await page.evaluate(() => {
      const box = e => { if (!e) return null; const cs = getComputedStyle(e); if (e.hidden || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .05) return null; const b = e.getBoundingClientRect(); return b.width && b.height ? { x: b.x, y: b.y, w: b.width, h: b.height } : null; };
      const strip = document.querySelector('#room [data-component="team-doing"]');
      return { strip: box(strip), text: strip ? strip.textContent : '', sheet: box(document.getElementById('her-sheet')), input: box(document.getElementById('her-input')), form: box(document.getElementById('her-form')) };
    });
    samples++;
    const t = (Date.now() - t0) / 1000;
    if (r.strip) {
      visible++; run++; longest = Math.max(longest, run);
      if (r.text !== lastText) { lastText = r.text; since = t; } maxSame = Math.max(maxSame, t - since);
      for (const l of r.text.split('\n')) { if (!lines.has(l)) lines.set(l, t); maxLine = Math.max(maxLine, t - lines.get(l)); }
      for (const k of ['form', 'input', 'sheet']) { const o = r[k]; if (!o) continue;
        const ox = Math.min(r.strip.x + r.strip.w, o.x + o.w) - Math.max(r.strip.x, o.x), oy = Math.min(r.strip.y + r.strip.h, o.y + o.h) - Math.max(r.strip.y, o.y);
        if (ox > 0 && oy > 0) { overlaps++; if (!worst || ox * oy > worst.a) worst = { a: ox * oy, k, t: t.toFixed(1), d: `${Math.round(ox)}x${Math.round(oy)}`, text: r.text.slice(0, 50) };
          if (shot && !shotDone) { shotDone = true; await page.screenshot({ path: shot }); } break; } }
    } else { run = 0; lastText = ''; lines.clear(); }
    await page.waitForTimeout(500);
  }
  console.log(`${W}x${H} ${SECS}s replay: strip visible ${(visible / 2).toFixed(1)}s, longest unbroken ${(longest / 2).toFixed(1)}s, same text up to ${maxSame.toFixed(1)}s, one line up to ${maxLine.toFixed(1)}s, samples overlapping her sheet ${overlaps}${worst ? ' (worst ' + worst.d + ' vs ' + worst.k + ' at ' + worst.t + 's: "' + worst.text + '")' : ''}`);
  await b.close();
})();
