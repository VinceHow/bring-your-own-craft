// Room chatter: the team's light talk about its own work, written by code from real run events (no model), never
// addressed to her, never a question. Wren: "found a source on full classes." Bo: "name and email, no account."
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
// long to say is not said; a warm line too long loses its tail clause first (lineFor).
// 12 words at most (the lead, Sun 08:53: calm, but sounding human).
export const CHATTER_WORDS = 12;
export const chatterLine = text => okLine(text) && !/:.*:/.test(text) && !/…|\.\.\./.test(text) && words(text) <= CHATTER_WORDS;

// The line a teammate would say about this event, or null. Only things a colleague would actually say out loud:
// a source it found, or a call it just made. A teammate's work note is a log, not talk, so it is never chatter.
// No "Name:" prefix: the room sets the speaker's name beside the line (public/room.js chat), and the event carries `by`.
// Warmer variants per event (the PO, Sun 09:15); the variant is picked by a hash of the event's id, so a replay (R)
// says the same line every time.
// The PO's lines (Sun 08:49), per teammate: (a) a source found, (b) a call made itself. Templates are 8 words or fewer
// plus the slot; a line chatterLine refuses (a long slot) falls to the next variant, else nothing is said.
// Wren's "that matches what I've read" is left out: a call made itself may cite no source, so it could be untrue.
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const VARIANTS = {
  source: {
    research: [t => `Ooh, found a good piece on ${t}.`, t => `Interesting, someone's written about ${t}.`, t => `Reading up on ${t}, worth it.`, t => `Found something solid on ${t}.`, t => `Saving a source on ${t} for later.`],
    design: [t => `Found a lovely reference on ${t}.`, t => `Pinning a reference on ${t}.`, t => `Good inspiration on ${t}, saving it.`],
    strategy: [t => `Useful read on ${t}, saving it.`, t => `Found a source on ${t}, good for the pitch.`, t => `Worth knowing about ${t}, bookmarked.`],
    engineering: [t => `Bookmarked a source on ${t}.`, t => `Found a write-up on ${t}, handy.`],
    data: [t => `Logged a source on ${t}.`, t => `Found a decent source on ${t}.`],
    other: [t => `Found a good piece on ${t}.`, t => `Saving a source on ${t}.`],
  },
  call: {
    engineering: [c => `Going with ${c}; it keeps things simple.`, c => `${cap(c)}, done. One less thing to worry about.`, c => `Keeping it simple, ${c}.`, c => `${cap(c)}. Easy to build, easy to change.`],
    design: [c => `Settled on ${c}, it feels right.`, c => `Going with ${c}, cleaner that way.`, c => `${cap(c)}. Less on the page, better.`],
    strategy: [c => `${cap(c)}, easiest to run day to day.`, c => `Going with ${c}, it's what customers expect.`, c => `${cap(c)}. Keeps the shop side simple.`],
    research: [c => `Going with ${c} for now.`],
    data: [c => `${cap(c)}, that's the cleanest.`, c => `Going with ${c}, easy to track.`],
    other: [c => `Going with ${c}.`, c => `${cap(c)}, done.`],
  },
};
export function hashPick(key, n) {
  let h = 2166136261; for (const ch of String(key ?? '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return n > 0 ? h % n : 0;
}
// Too long: cut the tail clause after the slot ("…, it's what customers expect." -> "."), never the slot itself.
export function trimTail(line, slot) {
  const at = line.toLowerCase().indexOf(String(slot).toLowerCase());
  if (at < 0) return null;
  const end = at + String(slot).length, tail = line.slice(end);
  const m = tail.match(/^\s*[;,.]\s/);
  return m ? line.slice(0, end).replace(/[\s;,.]+$/, '') + '.' : null;
}
const pick = (list, key, arg) => {
  const i = hashPick(key, list.length);
  for (let k = 0; k < list.length; k++) {
    const line = list[(i + k) % list.length](arg);
    if (chatterLine(line)) return line;
    const short = trimTail(line, arg);
    if (short && chatterLine(short)) return short;
  }
  return null;
};
export function lineFor(ev) {
  if (!NAMES[ev.seat]) return null;
  const key = ev.id || ev.source?.title || ev.choice || '';
  if (ev.type === 'candidate' && ev.source?.title) return pick(VARIANTS.source[ev.seat] || VARIANTS.source.other, key, lower(plain(ev.source.title)));
  if (ev.type === 'decided' && ev.choice && ev.cites === 'team default' && words(ev.choice) >= 2) return pick(VARIANTS.call[ev.seat] || VARIANTS.call.other, key, lower(plain(ev.choice)));
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
