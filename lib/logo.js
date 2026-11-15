// The live logo (Vincent, Sun 08:31: "fal is fast"): ONE fal image call (flux/schnell, square) fired alongside the
// page fill, never awaited past the fill's own finish. Server-side only: the key is FAL_KEY or the proxy's (as
// lib/model.js), never sent to the browser. The image is saved into the run's page folder and the page points at that
// local file, never at a fal URL. Any failure, a 6 s timeout, or still painting when the fill is done: the page keeps
// its usual mark, silently.
import fs from 'node:fs';
import path from 'node:path';
import { backend, falAuthHeader } from './model.js';

export const LOGO_URL = 'https://fal.run/fal-ai/flux/schnell';
export const LOGO_TIMEOUT_MS = 6000;
export const LOGO_FILE = 'logo.jpg';
const scrubUrl = s => String(s || '').replace(/https?:\/\/\S+/g, '[url]').slice(0, 160);

// On only where the demo runs: the fal backend, unless LIVE_LOGO=0. Tests and the Claude Code backend never spend.
export const logoOn = () => process.env.LIVE_LOGO !== '0' && (process.env.LIVE_LOGO === '1' || backend() === 'fal');

export function logoPrompt({ idea = '', craft = '', palette = [] } = {}) {
  const colours = (Array.isArray(palette) ? palette : []).filter(c => /^#[0-9a-f]{3,8}$/i.test(c)).slice(0, 3);
  return `A wordless pictorial icon for a small ${craft || 'local'} business: ${String(idea).slice(0, 140)}. ` +
    'One bold centred emblem filling most of the frame, flat gouache texture, plain warm paper background, square. ' +
    'Absolutely no text, no letters, no words, no typography, no signature' +
    (colours.length ? `, palette ${colours.join(', ')}` : '') + '.';
}

// paintLogo({ outDir, idea, craft, palette }) -> { ok: true, file, ms } | { ok: false, why, ms }
export async function paintLogo({ outDir, idea, craft, palette, timeoutMs = LOGO_TIMEOUT_MS, fetchImpl = fetch }) {
  const t0 = Date.now();
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(LOGO_URL, { method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: falAuthHeader() },
      body: JSON.stringify({ prompt: logoPrompt({ idea, craft, palette }), image_size: 'square', num_inference_steps: 4, num_images: 1, sync_mode: true, enable_safety_checker: true }) });
    if (!res.ok) throw new Error(`fal ${res.status}`);
    const j = await res.json();
    const src = j?.images?.[0]?.url;
    if (!src) throw new Error('no image in the reply');
    let buf;
    if (src.startsWith('data:')) buf = Buffer.from(src.slice(src.indexOf(',') + 1), 'base64');
    else { const r = await fetchImpl(src, { signal: ctl.signal }); if (!r.ok) throw new Error(`image ${r.status}`); buf = Buffer.from(await r.arrayBuffer()); }
    if (buf.length < 200) throw new Error('image too small');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, LOGO_FILE), buf);
    const ms = Date.now() - t0;
    if (process.env.MODEL_QUIET !== '1') console.error(`[fal] logo: 1 image (flux/schnell, ~$0.003) in ${ms} ms`);
    return { ok: true, file: LOGO_FILE, ms };
  } catch (e) {
    const why = e?.name === 'AbortError' ? `timeout after ${timeoutMs} ms` : scrubUrl(e?.message || e);
    if (process.env.MODEL_QUIET !== '1') console.error(`[model] logo failed: ${why}; the page keeps its usual mark`);
    return { ok: false, why, ms: Date.now() - t0 };
  } finally { clearTimeout(timer); }
}

// The page with the live logo: the brand mark (nav and footer) becomes the painted image, and the footer says so.
const MARK = /<span class="mark" data-mark="[a-z-]+" aria-hidden="true"><\/span>/g;
export function withLiveLogo(html) {
  let n = 0;
  let out = String(html).replace(MARK, () => { n++; return `<img class="mark mark--live" src="${LOGO_FILE}" alt="" width="28" height="28" style="width:28px;height:28px;border-radius:50%;object-fit:cover;object-view-box:inset(22%);display:inline-block;vertical-align:middle">`; });
  if (!n) return html;
  const credit = '<p class="logo-credit" data-logo="live" style="margin:8px 0 0;font-size:12px;opacity:.75">Logo painted live with fal</p>';
  out = /<\/footer>/.test(out) ? out.replace(/<\/footer>/, credit + '</footer>') : out.replace(/<\/body>/, credit + '</body>');
  return out;
}
