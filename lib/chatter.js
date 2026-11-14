// Room chatter: the team's light talk about its own work, written by code from real run events (no model), never
// addressed to her, never a question. "Noor: found a source on full classes." "Bo: I'll take the booking form."
// From: a teammate's note when it finishes (what it worked on), a finding attached, a decision it settled. Calm by
// design: at most CHATTER_PER_SEAT lines per teammate and CHATTER_MAX per run; her own seat never chatters.
import { logEvent, readEvents, onEvent } from './events.js';
import { NAMES } from './interpret.js';

export const CHATTER_MAX = Number(process.env.CHATTER_MAX || 10);
export const CHATTER_PER_SEAT = 2;
const clip = (s, n) => { s = String(s ?? '').trim().replace(/\s+/g, ' ').replace(/[.;:,]+$/, ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const lower = s => (s ? s[0].toLowerCase() + s.slice(1) : s);
// Never to her, never asking: anything with a question mark or "you" is not chatter.
export const okLine = text => !!text && !/\?/.test(text) && !/\byou(r|rs|'re|’re|'ll|’ll)?\b/i.test(text);

// The line a teammate would say about this event, or null.
export function lineFor(ev) {
  const by = NAMES[ev.seat];
  if (!by) return null;
  if (ev.type === 'candidate' && ev.source?.title) return `${by}: found a source on ${lower(clip(ev.source.title, 70))}.`;
  if (ev.type === 'teammate.done' && ev.note) return `${by}: ${lower(clip(ev.note, 110))}.`;
  if (ev.type === 'decided' && ev.choice && ev.cites === 'team default' && ev.decision)
    return `${by}: ${lower(clip(ev.decision.replace(/^whether\s+/i, ''), 70))}, ${lower(clip(ev.choice, 50))}.`;
  return null;
}

let off = null;
export function installChatter() {
  if (off) return off;
  off = onEvent(ev => {
    if (!ev.run || !['candidate', 'teammate.done', 'decided'].includes(ev.type)) return;
    const text = lineFor(ev);
    if (!okLine(text)) return;
    const evs = readEvents(ev.run);
    const her = evs.find(e => e.type === 'run.start')?.seat || 'product';
    if (ev.seat === her) return;
    const said = evs.filter(e => e.type === 'chatter');
    if (said.length >= CHATTER_MAX || said.filter(c => c.seat === ev.seat).length >= CHATTER_PER_SEAT) return;
    if (said.some(c => c.text === text)) return;
    logEvent(ev.run, 'chatter', { pane: 'room', by: NAMES[ev.seat], seat: ev.seat, text, from: ev.type });
  });
  return off;
}
