// The guest chair: after Design's first sketch, a stand-in for the sketch's main user type reacts in its own voice.
// One teammate-style call. It never creates an ask and never overrides her. Its points (G1, G2...) may be cited by
// decideRest like her file's lines; code checks every G-citation against the logged `guest` event.
import { callModel as realCallModel, scrub } from './model.js';
import { logEvent, readEvents } from './events.js';
import { prompt } from './teammates.js';

// Measured Sat 14 Nov (yoga, guest prompt): haiku at low effort ~2.8-3.3 s, sonnet at low ~3.7-3.8 s; same voice.
export const GUEST_MODEL = process.env.GUEST_MODEL || 'haiku';
export const GUEST_EFFORT = process.env.GUEST_EFFORT || 'low';
export const GUEST_LIMIT_MS = Number(process.env.GUEST_LIMIT_MS || 12000);
// Optional, only if time at the end (Vincent, 14 Nov): off unless GUEST_CHAIR=1.
export const GUEST_ON = process.env.GUEST_CHAIR === '1';
export const STAND_IN = 'a stand-in for your customer, not a real one';

export const GUEST_SCHEMA = {
  type: 'object',
  properties: {
    persona: { type: 'string' },
    reaction: { type: 'string' },
    points: { type: 'array', items: { type: 'object',
      properties: { text: { type: 'string' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] } },
      required: ['text', 'confidence'] } },
  },
  required: ['persona', 'reaction', 'points'],
};

const clip = (s, n) => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, n);

// Code owns ids, the limit of three points, and the "check with a real <user>" mark on low-confidence points.
export function cleanGuest(raw, userType) {
  const who = String(userType || 'customer').toLowerCase().replace(/^(the|a|an)\s+/, '').replace(/s$/, '');
  const points = (raw?.points || []).filter(p => p && clip(p.text, 200)).slice(0, 3).map((p, i) => {
    const confidence = ['high', 'medium', 'low'].includes(p.confidence) ? p.confidence : 'low';
    const out = { id: `G${i + 1}`, text: clip(p.text, 200), confidence };
    if (confidence === 'low') out.check = `check with a real ${who}`;
    return out;
  });
  const reaction = clip(raw?.reaction, 280);
  if (!reaction) throw new Error('guest said nothing');
  return { persona: clip(raw?.persona, 80) || userType, userType, reaction, points, label: STAND_IN };
}

// One call, no logging: the guest, or throws.
export async function askGuest({ idea, users, stages, callModel = realCallModel, limitMs = GUEST_LIMIT_MS }) {
  const userType = users?.[0] || 'customer';
  const t0 = Date.now();
  let t;
  try {
    const raw = await Promise.race([
      callModel({
        system: prompt('guest', { PERSONA: userType, IDEA: idea, USERS: (users || []).join(', '), STAGES: (stages || []).join(' / ') }),
        user: 'React to the sketch.', schema: GUEST_SCHEMA, model: GUEST_MODEL, effort: GUEST_EFFORT, timeoutMs: limitMs,
      }),
      new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`over ${limitMs / 1000} s`)), limitMs); }),
    ]);
    return { ...cleanGuest(raw, userType), ms: Date.now() - t0 };
  } finally { clearTimeout(t); }
}
// Log what askGuest settled to: `guest { persona, reaction, points }`, or guest.error (nothing else changes).
export function logGuest(run, settled) {
  if (settled.guest) return logEvent(run, 'guest', { pane: 'guest', ...settled.guest });
  logEvent(run, 'guest.error', { pane: 'guest', error: scrub(settled.error?.message || 'guest failed').slice(0, 200) });
  return null;
}
export const settle = p => p.then(guest => ({ guest }), error => ({ error }));
// Ask and log. Returns the logged guest, or null.
export async function pullUpGuest({ run, ...args }) { return logGuest(run, await settle(askGuest(args))); }

// The guest's points as citable lines, from the log only (the latest guest).
export function guestLines(evs) {
  const g = (evs || []).findLast(e => e.type === 'guest');
  return (g?.points || []).map(p => ({ id: p.id, text: `Guest (${g.persona}; ${STAND_IN}${p.check ? '; ' + p.check : ''}): ${p.text}` }));
}
export const guestLinesFor = run => (run ? guestLines(readEvents(run)) : []);
