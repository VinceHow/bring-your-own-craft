import { scrub } from './model.js';
export function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(scrub(JSON.stringify(obj)));
}
