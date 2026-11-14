// Any seat is hers (lib/cast.js). POST /api/cast { craft } -> { craft, roles } at once (the table; no model), so the
// fixed teammates can walk in wearing their roles. POST /api/cast/flex { craft, tag?, idea? } -> the flex teammate's
// card, written by one fast call while the others are introduced: { role: 'flex', flex } or the default role on a slow
// or failed call. The run keeps it: POST /api/run { craft, flex } logs run.start with its cast (lib/cast.js makeCast).
import { sendJson } from '../lib/http.js';
import { CRAFTS, rolesFor, needsFlex, flexDefault, writeFlex } from '../lib/cast.js';
import { cleanTag } from '../lib/tag.js';

const okCraft = c => CRAFTS.includes(c) || c === 'diy';
export default [
  { method: 'POST', path: '/api/cast', handler: (req, res, { body }) => {
    const craft = String(body?.craft || '');
    if (!okCraft(craft)) return sendJson(res, 400, { error: 'unknown craft' });
    const roles = rolesFor(craft);
    // Until the flex card is written, the flex seat shows its default.
    for (const s of Object.keys(roles)) if (roles[s] === 'flex') roles[s] = flexDefault(craft);
    sendJson(res, 200, { craft, roles, flexSeat: needsFlex(craft) ? 'data' : null });
  } },
  { method: 'POST', path: '/api/cast/flex', handler: async (req, res, { body }) => {
    const craft = String(body?.craft || '');
    if (!okCraft(craft)) return sendJson(res, 400, { error: 'unknown craft' });
    const r = await writeFlex(craft, { tag: cleanTag(body?.tag) || null, idea: String(body?.idea || '').slice(0, 300) });
    sendJson(res, 200, r);
  } },
];
