// POST /api/name-tag { text } -> { craft, goodAt, loves, ms, rough? }: her name tag before a run exists (the "Your own craft" seat).
import { sendJson } from '../lib/http.js';
import { scrub } from '../lib/model.js';
import { nameTag } from '../lib/tag.js';

export default [
  {
    method: 'POST', path: '/api/name-tag', handler: async (req, res, { body }) => {
      try { const r = await nameTag(body?.text); return sendJson(res, r.code, r.body); }
      catch (e) { console.error(scrub(e.message)); return sendJson(res, 500, { error: scrub(e.message) }); }
    },
  },
];
