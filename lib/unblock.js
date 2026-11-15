// Quick unblocks (DEMO 0:50, Vincent's stage flow): when a seat's work needs a fact or call only she has, it raises one
// short card in her inbox, with the team's suggestion. She says "Yes" (the suggestion) or says or types her own; her
// answer lands as a decided item in the team space, owned by that seat, and the seat carries on.
// Every unblock goes through lib/policy.js (askUnblock): only her facts and calls qualify; anything refused is decided on
// the suggestion, never asked. This module holds the only unblock door.
import { claimUnblocker, askUnblock, UNBLOCK_KINDS } from './policy.js';
import { logEvent, readEvents } from './events.js';

const mint = claimUnblocker();
const SEATS = ['design', 'data', 'research', 'strategy', 'engineering'];
const AGENT = { design: 'Mika', research: 'Wren', data: 'Theo', strategy: 'Ines', engineering: 'Bo' };
const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

// raiseUnblock(run, { seat, question, suggestion, kind: 'fact'|'call', by?, doing?, topic? }) -> the logged ask, or null.
// doing: one line on what the seat is doing ("Setting up ordering"); topic: the decision's subject for its team-space
// headline ("Orders close" + her choice -> "Orders close 8pm the night before").
export function raiseUnblock(run, { seat, question, suggestion, kind = 'call', by, doing, topic } = {}) {
  if (!SEATS.includes(seat)) throw new Error('unblock: unknown seat');
  if (!UNBLOCK_KINDS.includes(kind)) throw new Error('unblock: only her facts and calls');
  const q = clean(question, 140), sug = clean(suggestion, 120);
  const n = readEvents(run).filter(e => e.type === 'ask.unblock' && e.seat === seat).length + 1;
  const id = `u-${seat}-${n}`;
  const who = by || AGENT[seat];
  const extra = { ...(doing ? { doing: clean(doing, 80) } : {}), ...(topic ? { topic: clean(topic, 60) } : {}) };
  logEvent(run, 'ask.unblock', { pane: 'inbox', id, seat, by: who, question: q, suggestion: sug, kind, ...extra });
  const a = askUnblock(run, { id, seat, by: who, question: q, suggestion: sug, kind, ...extra }, mint(run, id));
  // The studio's event for the inbox action card (the ask above is what reaches her).
  if (a) logEvent(run, 'owner.action', { pane: 'inbox', id, seat, by: who, question: q, suggestion: sug, ...extra });
  return a;
}

// answerUnblock(run, { askId, yes, text }) -> [code, body]. "yes" takes the suggestion; otherwise her own words.
export function answerUnblock(run, { askId, yes, text } = {}) {
  const evs = readEvents(run);
  const a = evs.find(e => e.type === 'ask' && e.unblock && e.id === askId);
  if (!a) return [404, { error: 'no such unblock' }];
  if (evs.some(e => e.type === 'answer' && e.askId === askId)) return [409, { error: 'already answered' }];
  const hers = clean(text, 200);
  if (!yes && !hers) return [400, { error: 'yes, or her words' }];
  const choice = yes ? a.suggestion : hers;
  logEvent(run, 'answer', { pane: 'inbox', mode: 'unblock', askId, text: choice, took: yes ? 'suggestion' : 'hers' });
  const headline = a.topic ? `${a.topic} ${choice.replace(/[.!]+$/, '')}` : null;
  const d = logEvent(run, 'decided', { pane: 'team-space', id: askId, seat: a.seat, by: a.by, decision: a.decision, choice,
    cites: yes ? 'her yes' : 'her words', unblock: true, ...(headline ? { headline } : {}) });
  logEvent(run, 'chatter', { pane: 'room', by: a.by, seat: a.seat, text: `Got it: ${choice.replace(/[.!]+$/, '')}. Carrying on.` });
  return [200, { decided: d }];
}
