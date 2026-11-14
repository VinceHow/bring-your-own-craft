// Room chatter: the team's light talk about its own work, written by code from real run events (no model), never
// addressed to her, never a question. "Noor: found a source on full classes." "Bo: name and email, no account."
// From: a finding attached, a call a teammate settled. Calm by design: at most CHATTER_PER_SEAT lines per teammate
// and CHATTER_MAX per run; her own seat never chatters.
import { logEvent, readEvents, onEvent } from './events.js';
import { NAMES } from './interpret.js';

export const CHATTER_MAX = Number(process.env.CHATTER_MAX || 10);
export const CHATTER_PER_SEAT = 2;
const lower = s => (s ? s[0].toLowerCase() + s.slice(1) : s);
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const plain = s => String(s ?? '').trim().replace(/\s+/g, ' ').replace(/[.;:,]+$/, '');
// Never to her, never asking (shared: lib/joint.js uses it for its exchange lines).
export const okLine = text => !!text && !/\?/.test(text) && !/\byou(r|rs|'re|’re|'ll|’ll)?\b/i.test(text);
// Room chatter, stricter: never a log line either (no label-colon inside, nothing cut, at most 15 words). A line too
// long to say is not said.
export const chatterLine = text => okLine(text) && !/:.*:/.test(text) && !/…|\.\.\./.test(text) && words(text) <= 15;

// The line a teammate would say about this event, or null. Only things a colleague would actually say out loud:
// a source it found, or a call it just made, said as the call ("Bo: name and email, no account."). A teammate's
// work note is a log, not talk, so it is never chatter.
export function lineFor(ev) {
  const by = NAMES[ev.seat];
  if (!by) return null;
  if (ev.type === 'candidate' && ev.source?.title) return `${by}: found a source on ${lower(plain(ev.source.title))}.`;
  if (ev.type === 'decided' && ev.choice && ev.cites === 'team default' && words(ev.choice) >= 2) return `${by}: ${lower(plain(ev.choice))}.`;
  return null;
}

let off = null;
export function installChatter() {
  if (off) return off;
  off = onEvent(ev => {
    if (!ev.run || !['candidate', 'decided'].includes(ev.type)) return;
    const text = lineFor(ev);
    if (!chatterLine(text)) return;
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
