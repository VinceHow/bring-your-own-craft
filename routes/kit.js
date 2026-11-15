// GET /api/kit?idea=… -> { design: [..], research: [..], data, strategy, engineering, made: { <seat>: [..] } }: what each teammate is really
// loaded with for this idea (lib/kit.js), for the meet cards' "Loaded with" list.
import { sendJson } from '../lib/http.js';
import { kitFor, madeFor, cardsFor } from '../lib/kit.js';

export default [
  {
    method: 'GET', path: '/api/kit', handler: async (req, res) => {
      const idea = new URL(req.url, 'http://x').searchParams.get('idea') || '';
      try { const i = idea.slice(0, 400); return sendJson(res, 200, { ...kitFor(i), made: madeFor(i), ...cardsFor(i) }); } catch { return sendJson(res, 200, {}); }
    },
  },
];
