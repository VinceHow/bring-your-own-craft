// POST /api/book: the built page's form posts here (taste-skill's system.js sends FormData by fetch).
// Stores the booking in runs/<run>/bookings.jsonl and answers with a real confirmation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUNS_DIR } from '../lib/events.js';
import { sendJson } from '../lib/http.js';

const RUN_ID = /^[\w.-]{1,120}$/;
const FIELDS = ['run', 'page', 'name', 'email', 'class', 'item', 'pastry', 'order', 'quantity', 'time', 'phone', 'remember'];

// server.js parses bodies as JSON or urlencoded. A multipart body (FormData) arrives mangled by URLSearchParams,
// so rebuild the text and read its parts back out. Lossy only for '+' and '%' inside values.
export function readForm(body) {
  if (!body || typeof body !== 'object') return {};
  const keys = Object.keys(body);
  if (!keys.some(k => /content-disposition/i.test(k) || /^-{2,}/.test(k))) return body;
  const text = Object.entries(body).map(([k, v]) => (v === '' ? k : `${k}=${v}`)).join('&');
  const out = {};
  for (const m of text.matchAll(/name="([^"]+)"(?:; filename="[^"]*")?\r?\n(?:[^\r\n]+\r?\n)*\r?\n([\s\S]*?)\r?\n-{2,}/g)) out[m[1]] = m[2];
  return out;
}

export function storeBooking(form) {
  const run = String(form.run || '');
  if (!RUN_ID.test(run) || !fs.existsSync(path.join(RUNS_DIR, run))) return { code: 404, body: { ok: false, error: 'unknown run' } };
  // "Order/book your usual" sends the remembered order only: the page knows who she is on this device.
  const usual = form.order === 'usual';
  if (!usual && (!String(form.name || '').trim() || !/@/.test(String(form.email || '')))) return { code: 400, body: { ok: false, error: 'name and email are needed' } };
  const booking = { at: new Date().toISOString(), ref: crypto.randomBytes(3).toString('hex').toUpperCase() };
  for (const k of FIELDS) if (form[k] != null && form[k] !== '') booking[k] = String(form[k]).slice(0, 200);
  fs.appendFileSync(path.join(RUNS_DIR, run, 'bookings.jsonl'), JSON.stringify(booking) + '\n');
  const what = booking.class || booking.pastry || booking.item || 'your booking';
  return { code: 200, body: { ok: true, ref: booking.ref, confirmation: `Booked: ${what}, ${usual ? '(your usual)' : `for ${booking.name}`}. Reference ${booking.ref}.${booking.email ? ` A confirmation is on its way to ${booking.email}.` : ''}` } };
}

export default [{
  method: 'POST', path: '/api/book',
  handler: (req, res, { body }) => { const r = storeBooking(readForm(body)); sendJson(res, r.code, r.body); },
}];
