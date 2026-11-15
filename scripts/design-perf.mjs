// Performance of the painted room mid-run: 30 s of the rehearsal replay (R), headed Chromium (run under xvfb-run on a
// server), day and night. Frame times from requestAnimationFrame, long tasks from PerformanceObserver, CPU from the
// DevTools Performance domain, plus a Chrome trace file per mode for anyone who wants to open it.
//   xvfb-run -a node scripts/design-perf.mjs            (BASE=… to use a running server; QA_OUT for the output folder)
// Caveat printed with the result: a cloud VM with software GL is not Vincent's Mac; read it for what's heavy, not for
// the absolute frame rate.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(process.env.NODE_PATH || '/usr/lib/node_modules', 'playwright'))); }
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.QA_PORT) || 4450, BASE = process.env.BASE || `http://localhost:${PORT}`;
const OUT = path.resolve(ROOT, process.env.QA_OUT || 'design/studio/qa/perf'); fs.mkdirSync(OUT, { recursive: true });
const SECS = Number(process.env.PERF_SECS) || 30;
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = process.env.BASE ? null : spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), MODEL_BACKEND: 'fal' }, stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await wait(200); }
const browser = await chromium.launch({ headless: !process.env.DISPLAY ? true : false });
const results = {};
for (const mode of ['day', 'night']) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1130 }, deviceScaleFactor: 1 });
  await ctx.route('**/api/**', r => r.request().method() === 'GET' ? r.continue() : r.fulfill({ json: { ok: true } }));
  const p = await ctx.newPage();
  await p.goto(BASE + `/?look=painted&stage=1&night=${mode === 'night' ? 1 : 0}`); await wait(2000);
  await p.keyboard.press('r'); await wait(6000);            // the rehearsal replay, past its first beats: mid-run
  const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  await browser.startTracing(p, { path: path.join(OUT, `trace-${mode}.json`), screenshots: false, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute'] });
  const sample = await p.evaluate(secs => new Promise(res => {
    const frames = [], longs = []; let last = performance.now(); const end = last + secs * 1000;
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) longs.push({ d: Math.round(e.duration), at: Math.round(e.startTime) }); }).observe({ type: 'longtask', buffered: false }); } catch {}
    const tick = t => { frames.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else res({ frames, longs, videos: document.querySelectorAll('video').length, frameDocs: document.querySelectorAll('iframe').length }); };
    requestAnimationFrame(tick);
  }), SECS);
  await browser.stopTracing();
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  const f = sample.frames.slice(1).sort((a, b) => a - b); const avg = f.reduce((a, b) => a + b, 0) / f.length;
  const pct = q => f[Math.min(f.length - 1, Math.floor(q * f.length))];
  const wall = SECS;
  results[mode] = {
    fps: +(1000 / avg).toFixed(1), frames: f.length, p50ms: +pct(0.5).toFixed(1), p95ms: +pct(0.95).toFixed(1), p99ms: +pct(0.99).toFixed(1), maxms: +f.at(-1).toFixed(1),
    over33ms: f.filter(x => x > 33.4).length, over50ms: f.filter(x => x > 50).length,
    longTasks: sample.longs.length, longestTaskMs: sample.longs.reduce((a, b) => Math.max(a, b.d), 0),
    cpuBusyPct: +(100 * ((m1.TaskDuration || 0) - (m0.TaskDuration || 0)) / wall).toFixed(0),
    scriptPct: +(100 * ((m1.ScriptDuration || 0) - (m0.ScriptDuration || 0)) / wall).toFixed(0),
    layoutPct: +(100 * ((m1.LayoutDuration || 0) - (m0.LayoutDuration || 0)) / wall).toFixed(0),
    stylePct: +(100 * ((m1.RecalcStyleDuration || 0) - (m0.RecalcStyleDuration || 0)) / wall).toFixed(0),
    layouts: (m1.LayoutCount || 0) - (m0.LayoutCount || 0), styleRecalcs: (m1.RecalcStyleCount || 0) - (m0.RecalcStyleCount || 0),
    heapMB: +((m1.JSHeapUsedSize || 0) / 1e6).toFixed(0), videosInPage: sample.videos, iframes: sample.frameDocs,
  };
  // the living painting is its own document: count its playing videos
  const living = p.frames().find(fr => fr.url().includes('cast-living'));
  if (living) results[mode].livingVideosPlaying = await living.evaluate(() => [...document.querySelectorAll('video')].filter(v => !v.paused).length);
  console.log(mode, JSON.stringify(results[mode]));
  await ctx.close();
}
await browser.close(); if (srv) srv.kill();
fs.writeFileSync(path.join(OUT, 'perf.json'), JSON.stringify({ at: new Date().toISOString(), headed: !!process.env.DISPLAY, secs: SECS, results }, null, 1));
console.log(`traces and perf.json in ${path.relative(ROOT, OUT)} (headed: ${!!process.env.DISPLAY}). A cloud VM with software GL is not the demo Mac: read for what is heavy, not absolute fps.`);
