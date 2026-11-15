// GET /api/kit?idea=… -> { design: [..], research: [..], data, strategy, engineering }: what each teammate is really
// loaded with for this idea (lib/kit.js), for the meet cards' "Loaded with" list.
import { sendJson } from '../lib/http.js';
import { kitFor } from '../lib/kit.js';

export default [
  {
    method: 'GET', path: '/api/kit', handler: async (req, res) => {
      const idea = new URL(req.url, 'http://x').searchParams.get('idea') || '';
      try { return sendJson(res, 200, kitFor(idea.slice(0, 400))); } catch { return sendJson(res, 200, {}); }
    },
  },
];
