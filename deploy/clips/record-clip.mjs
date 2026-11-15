// Records the stage fallback clip: a phone reserves a sourdough, it's on its way, the baker taps Deliver (shown in a
// corner), and the phone flips to Delivered. Runs the bakery locally on a scratch database; never touches the live site.
// A "Recorded earlier" label sits on every frame.   node deploy/clips/record-clip.mjs  -> deploy/clips/order.mp4
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const APP = new URL('../app/', import.meta.url).pathname;
const OUT = new URL('./', import.meta.url).pathname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bakery-clip-'));
const PORT = 4170 + Math.floor(Math.random() * 20);
const TOKEN = 'clip-' + Math.random().toString(36).slice(2);
const app = spawn('node', ['server.js'], { cwd: APP, env: { ...process.env, PORT: String(PORT), ADMIN_TOKEN: TOKEN, DB_PATH: path.join(tmp, 'clip.db') }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const B = `http://localhost:${PORT}`;
const label = () => {
  const add = () => { const d = document.createElement('div'); d.textContent = 'Recorded earlier';
    d.style.cssText = 'position:fixed;z-index:99999;top:8px;right:8px;background:#111;color:#fff;font:600 13px system-ui;padding:6px 10px;border-radius:6px;opacity:.85;pointer-events:none';
    document.documentElement.appendChild(d); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
};
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, recordVideo: { dir: tmp, size: { width: 390, height: 844 } } });
await ctx.addInitScript(label);
const p = await ctx.newPage();
const pause = ms => p.waitForTimeout(ms);
try {
  await p.goto(B + '/'); await pause(1800);
  await p.mouse.wheel(0, 500); await pause(1200);
  await p.getByRole('button', { name: /put my name down/i }).first().click(); await pause(700);
  await p.locator('input:visible').first().pressSequentially('Ana', { delay: 140 }); await pause(500);
  await p.keyboard.press('Enter'); await pause(800);
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await pause(4000); // reserved, on its way
  const r = await fetch(B + '/api/admin/deliver', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) throw new Error('deliver ' + r.status);
  await pause(4500); // the stamp lands
} finally {
  const video = p.video();
  await ctx.close(); await browser.close(); app.kill();
  const webm = await video.path();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, 'order.mp4')]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('wrote deploy/clips/order.mp4');
}
