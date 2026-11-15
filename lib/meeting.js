// A focus moment is a meeting (Vincent, 15 Nov): she composes (pieces, no team reaction), then each Send is ONE
// round of discussion (the team replies live, one thread over her new words and the conversation so far, no
// takeaways), as many rounds as she likes; End meeting runs the reading (lib/interpret.js) over ALL her rounds:
// takeaways and answer.mapped, the same events as before, so everything downstream is unchanged.
//   round({ run, askId, text, pieces })  -> 202; logs answer.round { askId, round, text }, then the thread's chimes
//   end({ run, askId })                  -> interpret over the rounds: answer, takeaways, answer.mapped (and the stage path)
// Rounds belong to one ask: they never call the grantor or the policy (5 rounds are still 1 ask). The quick unblock is
// not a meeting (its inbox card answers once). Old runs (one `answer`, no rounds) replay as before.
import { callModel as realCallModel, scrub } from './model.js';
import { logEvent, readEvents } from './events.js';
import { gatherPieces } from './tidy.js';
import { runThread } from './thread.js';
import { interpret } from './interpret.js';

const clip = (s, n) => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, n);
const talking = new Set(); // run + askId with a round being discussed right now
export const roundsOf = (evs, askId) => evs.filter(e => e.type === 'answer.round' && e.askId === askId);

function meetingAsk(evs, askId) {
  const ask = evs.find(e => e.type === 'ask' && e.id === askId);
  if (!ask) return [404, 'no such ask'];
  if (ask.unblock) return [409, 'a quick unblock is answered once, from her inbox'];
  if (evs.some(e => e.type === 'answer' && e.askId === askId)) return [409, 'the meeting has ended'];
  return [200, ask];
}
// What the team reads in a round: the conversation so far, then her new words.
export function roundText(evs, askId, words) {
  const said = [];
  for (const e of evs) {
    if (e.askId !== askId) continue;
    if (e.type === 'answer.round') said.push(`She said: ${e.text}`);
    if (e.type === 'chime') said.push(`${e.by}: ${e.text}`);
  }
  return said.length ? `Earlier in this meeting:\n${said.join('\n')}\n\nNow she says: ${words}` : words;
}

export async function round({ run, askId, text, pieces, callModel = realCallModel, wait = false }) {
  let evs = readEvents(run);
  const [code, ask] = meetingAsk(evs, askId);
  if (code !== 200) return { code, body: { error: ask } };
  let words = clip(text, 2000);
  if (Array.isArray(pieces) && pieces.length) {
    const ids = pieces.map(String);
    if (words) { const pieceId = `p-send-${roundsOf(evs, askId).length + 1}`; logEvent(run, 'answer.piece', { pane: 'doc', askId, pieceId, text: words }); ids.push(pieceId); evs = readEvents(run); }
    words = clip(gatherPieces(evs, askId, ids).text, 2000);
  }
  if (!words) return { code: 400, body: { error: 'text required' } };
  const key = `${run}\u0000${askId}`;
  if (talking.has(key)) return { code: 409, body: { error: 'the team is still replying' } };
  const n = roundsOf(evs, askId).length + 1;
  const heard = roundText(evs, askId, words);
  logEvent(run, 'answer.round', { pane: 'doc', mode: 'craft', askId, round: n, text: words });
  talking.add(key);
  const job = runThread({ run, ask, text: heard, callModel })
    .then(thread => { logEvent(run, 'round.done', { pane: 'doc', askId, round: n, replies: thread.length }); return thread; })
    .catch(e => { logEvent(run, 'chime.error', { pane: 'doc', askId, error: scrub(String(e.message || e)).slice(0, 200) }); logEvent(run, 'round.done', { pane: 'doc', askId, round: n, replies: 0 }); return []; })
    .finally(() => talking.delete(key));
  if (wait) return { code: 200, body: { round: n, thread: await job } };
  return { code: 202, body: { round: n } };
}

// End meeting: the reading over all her rounds (no new thread: the team already spoke), then the same events as ever.
export async function end({ run, askId, callModel = realCallModel }) {
  const evs = readEvents(run);
  const [code, ask] = meetingAsk(evs, askId);
  if (code !== 200) return { code, body: { error: ask } };
  const rounds = roundsOf(evs, askId);
  if (!rounds.length) return { code: 409, body: { error: 'no round yet: Send first' } };
  const all = clip(rounds.map(r => r.text).join(' '), 2000);
  logEvent(run, 'meeting.end', { pane: 'doc', askId, rounds: rounds.length });
  const r = await interpret({ run, askId, text: all, callModel, thread: false });
  return { code: r.code, body: { ...r.body, profile: undefined, rounds: rounds.length } };
}
