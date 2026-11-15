import { sendJson } from '../lib/http.js';
import { backend, hasFalKey } from '../lib/model.js';
export default [{ method: 'GET', path: '/api/health', handler: (req, res) => sendJson(res, 200, { ok: true, backend: backend(), falKey: hasFalKey(), deployUrl: deployUrl() }) }];
// The live site on stage (the Railway bakery), when DEPLOY_URL is set: the room's app button adds "Open the live site".
// Only an http(s) URL is passed on; anything else reads as unset.
function deployUrl() {
  const u = String(process.env.DEPLOY_URL || '').trim();
  try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; }
}
