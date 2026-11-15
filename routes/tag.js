// POST /api/name-tag { text } -> { craft, goodAt, loves, title, traits, superpower, alternates, ms, rough? }: her full
// name tag before a run exists (the "Your own craft" seat). { part: 'card' }: only what her paper card shows (title,
// traits, superpower), the call she waits on. { part: 'more', card, seat }: the rest (craft, goodAt, loves, swaps), in
// the background, never waited on.
import { sendJson } from '../lib/http.js';
import { scrub } from '../lib/model.js';
import { nameTag, tagCard, tagMore } from '../lib/tag.js';

export default [
  {
    method: 'POST', path: '/api/name-tag', handler: async (req, res, { body }) => {
      try {
        const r = body?.part === 'card' ? await tagCard(body?.text)
          : body?.part === 'more' ? await tagMore(body?.text, { card: body?.card || null, seat: typeof body?.seat === 'string' ? body.seat : null })
          : await nameTag(body?.text);
        return sendJson(res, r.code, r.body);
      }
      catch (e) { console.error(scrub(e.message)); return sendJson(res, 500, { error: scrub(e.message) }); }
    },
  },
];
