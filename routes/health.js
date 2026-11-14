import { sendJson } from '../lib/http.js';
import { backend, hasFalKey } from '../lib/model.js';
export default [{ method: 'GET', path: '/api/health', handler: (req, res) => sendJson(res, 200, { ok: true, backend: backend(), falKey: hasFalKey() }) }];
