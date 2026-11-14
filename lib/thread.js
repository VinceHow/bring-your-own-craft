// The meeting thread (DEMO.md, focus moments): after her answer, 3-4 teammates react out loud, one at a time, each
// turn its own fast call that gets her answer plus the thread so far, so they build on, agree with or lightly push
// back on each other. Speed: the first line lands within about a second of her submit. A plain CLI call costs ~2-3 s
// just to start, so the server keeps a few model processes warm per run (started when an ask is logged or the room
// opens a focus moment) and hands her answer to one the moment she submits; each line is out as soon as its text is
// complete. Without a warm process (fal backend, or nothing warm yet) each turn is an ordinary call.
//
// takeTurn({ system, thread, seat, callModel, model, effort, user? }) -> { text }   one turn, ordinary call (shared)
// runThread({ run, ask, text, ... }) -> [{ by, seat, text, turn, ms }]               logs `chime` per turn
// warmUp(run)                                                                        pre-start processes for a run
import { spawn } from 'node:child_process';
import { callModel as realCallModel, backend, scrub } from './model.js';
import { logEvent, readEvents, onEvent } from './events.js';
import fs from 'node:fs';
import path from 'node:path';
import { prompt, SEATS, STANCES, loadFinding } from './teammates.js';
import { castOf, awaySeats } from './cast.js';

// Research's finding for this idea: the bakery one when the idea is about bread, else the prepared one.
const DATA = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'data');
export function findingFor(idea) {
  try {
    const b = JSON.parse(fs.readFileSync(path.join(DATA, 'research-finding-bakery.json'), 'utf8'));
    if ((b.fits || []).some(w => String(idea || '').toLowerCase().includes(w))) return b;
  } catch {}
  return loadFinding();
}

export const THREAD_MODEL = process.env.THREAD_MODEL || 'haiku';
export const TURN_GAP_MS = Number(process.env.TURN_GAP_MS ?? 900); // the least time between two lines, so each is read
export const MAX_TURNS = 4;
export const POOL = Number(process.env.THREAD_POOL ?? 4);
const IDLE_MS = 5 * 60 * 1000;
export const NAMES = { design: 'Mika', research: 'Noor', data: 'Theo', strategy: 'Ines', engineering: 'Bo', product: 'Product' };
const SEAT_NAME = { product: 'Product', design: 'Design', data: 'Data', research: 'Research', strategy: 'Strategy', engineering: 'Engineering' };
const sleep = ms => (ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve());

// ---- the line: code owns length, voice and safety -------------------------------------------------------------
const BANNED = /^(great|good|excellent) (point|idea|call)\b[,.!]*\s*|^(absolutely|totally|definitely|exactly|i love that idea|love this idea|love that|love it)[,.!]*\s*/i;
// Code never cuts a sentence: a line that runs long, says nothing, or echoes the line before is sent back once.
export const MAX_WORDS = 15, HARD_MAX_WORDS = 20;
const words = s => s.split(/\s+/).filter(Boolean);
// Backstop: text that reads like the service talking (limits, errors), not a teammate. Never said.
export const serviceText = s => /\b(usage|weekly|rate|daily) limit\b|hit your .*limit|resets? .*\b(am|pm|utc)\b|\bAPI error\b|overloaded|\b(401|403|429|500|529)\b|credit balance|invalid api key/i.test(String(s || ''));
export function cleanLine(raw) {
  if (serviceText(raw)) return null;
  let s = String(raw ?? '').trim().split('\n').find(l => l.trim()) || '';
  s = s.replace(/^\s*(\*\*)?[A-Z][a-z]+( \([A-Za-z]+\))?(\*\*)?:\s*/, '') // "Mika: ..." or "Mika (Design): ..."
    .replace(/^["“'‘]+|["”'’]+$/g, '').replace(BANNED, '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s[0].toUpperCase() + s.slice(1);
}
// Never addressed to her or about her (she's in the room); a light question between teammates is fine.
export const toHer = s => /\byou(r|rs|'re|’re|'ll|’ll|'ve|’ve)?\b|\b(her|she|she's|she’s)\b/i.test(s);
export const okLine = s => !!s && !toHer(s) && words(s).length <= MAX_WORDS;
// Seat rules (the lead, Sat 17:00). Research can only cite its one prepared finding: no promised write-ups, studies,
// sources or more research. Strategy talks price only when what was said touches money or orders; otherwise it
// speaks to how the offer reads.
export const aboutMoney = text => /\b(pay|paid|paying|price|pricing|cost|money|cheap|expensive|deposit|prepay|card|refund|pass(es)?|order|orders|ordering|subscription|£|\$|€)/i.test(String(text || ''));
const OVERPROMISE = /\b(write[- ]?up|write (it|this|that) up|sources?|stud(y|ies)|more research|further research|research (it|this|that|more)|i'?ll (research|look into|dig into|chase|pull what)|look (it|this) up)\b/i;
const PRICE_TALK = /\b(pric(e|es|ed|ing)|cost|fee|fees|charg(e|es|ing)|discount|cheaper|£|\$|€)/i;
export function seatRule(seat, raised) {
  if (seat === 'research') return 'You can only cite your one prepared finding (in your work below), as it is, and only if it fits. Never promise a write-up, more research, a study or sources.';
  if (seat === 'strategy') return aboutMoney(raised) ? 'What was said touches money or orders: price or payment is yours to speak to, if it helps.'
    : "What was said isn't about money: speak to how the offer reads (what's on offer, how it's named and worded), not price.";
  return '';
}
export function seatProblem(s, seat, raised) {
  if (seat === 'research' && OVERPROMISE.test(s)) return 'Cite only your prepared finding; never promise a write-up, research or sources.';
  if (seat === 'strategy' && !aboutMoney(raised) && PRICE_TALK.test(s)) return "Not price: say how the offer reads.";
  return null;
}
// Why a line goes back, or null when it can be said.
export function problem(s, thread = [], answerTo = null, seat = null, raised = '') {
  if (!s) return 'Say one line.';
  const sp = seat && seatProblem(s, seat, raised);
  if (sp) return sp;
  if (answerTo && !new RegExp(`\\b${answerTo.by}\\b`).test(s)) return `Answer ${answerTo.by} by name: start with "${answerTo.by},".`;
  if (toHer(s)) return 'Talk to the team, not to her or about her.';
  if (words(s).length < 4) return 'Say something concrete from your own work.';
  if (words(s).length > MAX_WORDS) return 'Shorter: 6 to 12 words.';
  const open = x => words(x.toLowerCase().replace(/[^a-z' ]/g, '')).slice(0, 3).join(' ');
  if (thread.some(t => open(t.text) === open(s))) return "Don't repeat how the last line started; add something new.";
  return null;
}

// ---- who speaks: the teammate who asked, then those whose decisions her answer touches, then the rest by work ----
export function speakers(ask, evs, herSeat) {
  const away = awaySeats(castOf(null, evs)); // a teammate not at the table yet doesn't speak
  const team = SEATS.filter(s => s !== herSeat && !away.includes(s));
  const cands = new Map(evs.filter(e => e.type === 'candidate').map(c => [c.id, c]));
  const touched = (ask.decisionIds || []).map(id => cands.get(id)?.seat);
  // Research speaks from its finding: only when the question is about it, or her answer touches Research's decisions.
  const researchHas = ask.seat === 'research' || ask.artifact?.kind === 'finding' || touched.includes('research');
  const order = [ask.seat, ...touched, ...(researchHas ? ['research'] : []),
    ...evs.filter(e => e.type === 'candidate' && e.attachTo && e.attachTo === ask.attachTo).map(c => c.seat),
    'strategy', 'engineering', 'design', 'data'];
  return [...new Set(order.filter(s => team.includes(s) && (s !== 'research' || researchHas)))].slice(0, MAX_TURNS);
}

// What this teammate has actually done in this run: its own decisions (recommended or settled), Research's finding.
// Words that carry a topic (for keeping each teammate on what was actually raised).
const STOP = new Set('the a an and or but of to for in on at by with is are be it its this that what when how who whether her she they them their our we i you your can should would will do does not no yes from as so if then than one two'.split(' '));
export const topicWords = text => new Set(String(text || '').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/)
  .map(w => w.replace(/'s$/, '').replace(/(ing|es|s)$/, '')).filter(w => w.length > 2 && !STOP.has(w)));
export function workOf(seat, evs, ask = null, idea = '', raised = '') {
  const decided = new Map(evs.filter(e => e.type === 'decided').map(d => [d.id, d]));
  const touches = new Set(ask?.decisionIds || []);
  const topic = topicWords(raised);
  const overlap = c => [...topicWords(`${c.decision} ${c.options.join(' ')} ${c.recommendation}`)].filter(w => topic.has(w)).length;
  const mine = evs.filter(e => e.type === 'candidate' && e.seat === seat);
  // Only its own work that touches what was raised (her answer, the question, the thread so far): first what this
  // question settles, then its other decisions that share words with what was said. Nothing else, so nobody drifts
  // to their pet topic.
  const lines = [...mine.filter(c => touches.has(c.id) && overlap(c) > 0), ...mine.filter(c => !touches.has(c.id) && overlap(c) > 0).sort((a, b) => overlap(b) - overlap(a)),
    ...mine.filter(c => touches.has(c.id) && !overlap(c))].slice(0, 3)
    .map(c => `- ${c.decision}: ${decided.get(c.id)?.choice || c.recommendation} (options: ${c.options.join(' / ')})`);
  if (seat === 'research' && ask?.artifact?.kind === 'finding') { try { const f = findingFor(idea); lines.push(`- Your finding, researched before the demo: ${f.claim} (${f.title})`); } catch {} }
  const note = evs.findLast(e => e.type === 'teammate.done' && e.seat === seat)?.note;
  if (note) lines.unshift(`- What you worked on: ${note}`);
  return lines.join('\n') || '- (nothing of yours touches this yet: build on the line before you, from your stance)';
}

export function turnUser({ seat, idea, question, askedBy, answer, thread, work, decisions, last, answerTo = null, rule = '' }) {
  return [
    `You are ${NAMES[seat]}, ${SEAT_NAME[seat]}. Your stance: "${STANCES[seat]}".`,
    `She is building: ${idea}`,
    '', 'Your work in this run:', work,
    '', 'What the page can show:', decisions || '- (the journey and the page words)',
    '', `${askedBy} asked her: "${question}"`,
    `She answered (everything follows from this): "${answer}"`,
    '', thread.length ? 'The team so far, after her answer:\n' + thread.map(t => `${t.by} (${SEAT_NAME[t.seat]}): ${t.text}`).join('\n') : 'Nobody has spoken yet: you go first.',
    rule ? `\n${rule}` : '',
    answerTo ? `\nAnswer ${answerTo.by} directly: start with "${answerTo.by}," and build on their line or push back on how, with a reason.` : '',
    last ? '\nYou speak last: if someone pushed back, settle it; else close it with what happens next.' : '',
    '', `Your line, as ${NAMES[seat]}:`,
  ].join('\n');
}

// ---- one turn, ordinary call (shared with builder 8's joint decisions) ----
export async function takeTurn({ system, thread = [], seat, callModel = realCallModel, model = THREAD_MODEL, effort = 'low', user, schema }) {
  const u = user || `${thread.map(t => `${t.by} (${t.seat}): ${t.text}`).join('\n')}\nYour line, as ${NAMES[seat] || seat}:`;
  const out = await callModel({ system, user: u, model, effort, schema: schema || { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } });
  return { ...out, text: cleanLine(out?.text) };
}

// ---- warm processes: the system prompt is set at start; her answer is written in when she submits ----
class Warm {
  constructor(system, model) {
    this.t0 = Date.now();
    this.p = spawn('claude', ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
      '--system-prompt', system, '--tools', '', '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence', '--model', model],
      { cwd: '/tmp', env: { ...process.env, FAL_KEY: '' }, stdio: ['pipe', 'pipe', 'ignore'] });
    this.dead = false; this.used = false;
    this.p.on('exit', () => { this.dead = true; this.reject?.(new Error('warm process ended')); });
    this.p.on('error', () => { this.dead = true; });
    let buf = '', text = '';
    this.p.stdout.on('data', d => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        let m; try { m = JSON.parse(line); } catch { continue; }
        const ev = m.type === 'stream_event' ? m.event : null;
        if (ev?.type === 'content_block_delta' && ev.delta?.text) text += ev.delta.text;
        // Only the model's own words are ever a line: an error result (a usage limit, an API error) is a failure,
        // never something a teammate says.
        if (m.type === 'result' && (m.is_error || m.subtype !== 'success')) {
          const rj = this.reject; this.resolve = this.reject = null;
          if (rj) rj(new Error('model error'));
          this.kill();
        } else if (ev?.type === 'message_stop' || m.type === 'result') { // the text is complete well before `result`
          const r = this.resolve; this.resolve = this.reject = null;
          if (r) r(text);
          this.kill();
        }
      }
    });
  }
  ask(user, timeoutMs = 8000) {
    this.used = true;
    return new Promise((resolve, reject) => {
      this.resolve = resolve; this.reject = reject;
      setTimeout(() => { if (this.reject) { this.reject(new Error('warm turn timeout')); this.kill(); } }, timeoutMs);
      this.p.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: user } }) + '\n');
    });
  }
  kill() { if (!this.dead) { this.dead = true; try { this.p.kill('SIGKILL'); } catch {} } }
}

const pools = new Map(); // run -> { procs: [Warm], last }
export const warmOn = () => backend() === 'claude-code' && process.env.THREAD_WARM !== '0';
export function warmUp(run, n = POOL) {
  if (!warmOn() || !run) return 0;
  const pool = pools.get(run) || { procs: [] };
  pool.procs = pool.procs.filter(w => !w.dead && !w.used);
  pool.last = Date.now();
  const system = prompt('thread');
  while (pool.procs.length < n) pool.procs.push(new Warm(system, THREAD_MODEL));
  pools.set(run, pool);
  clearTimeout(pool.timer);
  pool.timer = setTimeout(() => coolDown(run), IDLE_MS);
  return pool.procs.length;
}
export function coolDown(run) { const p = pools.get(run); if (!p) return; for (const w of p.procs) w.kill(); pools.delete(run); }
function takeWarm(run) {
  const pool = pools.get(run);
  if (!pool) return null;
  // Oldest first: the longer it has been warm, the readier it is.
  const i = pool.procs.findIndex(w => !w.dead && !w.used);
  if (i < 0) return null;
  const [w] = pool.procs.splice(i, 1);
  setImmediate(() => warmUp(run)); // keep the pool topped up for the next turn or question
  return w;
}

// One turn: a warm process if there is one, else an ordinary call. Returns the cleaned line or null.
async function speak(run, user, callModel, seat) {
  const own = new RegExp(`^${NAMES[seat] || '\\0'}( here)?[,:]\\s*`, 'i'); // nobody calls themselves by name ("Noor here:")
  const w = takeWarm(run);
  if (w) { try { const l = cleanLine(await w.ask(user)); return l && cleanLine(l.replace(own, '')); } catch {} }
  const out = await takeTurn({ system: prompt('thread'), user, callModel, model: THREAD_MODEL, seat: null,
    schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }).catch(() => null);
  return out?.text ? cleanLine(out.text.replace(own, '')) : null;
}

// The thread for her answer. Logs `chime { askId, by, seat, text, turn, ms }` as each line is ready, at least
// TURN_GAP_MS apart. 3 turns, a 4th when the third pushed back or left something to settle.
export async function runThread({ run, ask, text, callModel = realCallModel, gapMs = TURN_GAP_MS, t0 = Date.now() }) {
  const evs = readEvents(run);
  const start = evs.find(e => e.type === 'run.start') || {};
  const who = speakers(ask, evs, start.seat || 'product');
  const cands = new Map(evs.filter(e => e.type === 'candidate').map(c => [c.id, c]));
  const decisions = (ask.decisionIds || []).map(id => cands.get(id)).filter(Boolean)
    .map(c => `- ${c.decision}: ${c.options.join(' / ')}`).join('\n');
  const askedBy = ask.by ? `${ask.by} (${SEAT_NAME[ask.seat] || ask.seat})` : 'The team';
  const thread = [];
  let lastAt = 0;
  for (let turn = 0; turn < who.length; turn++) {
    const seat = who[turn];
    if (turn === 3 && !/\?|\b(hmm|but|though|instead|rather|unless|actually)\b/i.test(thread.at(-1)?.text || '')) break; // nothing to settle
    const raised = [text, ask.question, ...thread.map(t => t.text)].join(' ');
    const user = turnUser({ seat, idea: start.idea || '', question: ask.question || ask.decision || '', askedBy, answer: text,
      thread, work: workOf(seat, evs, ask, start.idea, raised), decisions, answerTo: turn === 1 ? thread[0] : null,
      last: turn === Math.min(who.length, MAX_TURNS) - 1, rule: seatRule(seat, raised) });
    let line = await speak(run, user, callModel, seat);
    const answerTo = turn === 1 ? thread[0] : null;
    // The first line stays fast: sent back only when it breaks a seat rule, is to her, or runs far too long.
    const why = turn === 0 ? (line && !toHer(line) && words(line).length <= HARD_MAX_WORDS && !seatProblem(line, seat, raised) ? null : problem(line, thread, null, seat, raised))
      : problem(line, thread, answerTo, seat, raised);
    if (why) {
      const again = await speak(run, `${user}\n(Your first try was: "${line || ''}". ${why})`, callModel, seat);
      // The second try is said if it's sound. Failing that, silence is worse than a whole line that mentions her:
      // any line of 4 to HARD_MAX_WORDS words that doesn't ask her anything ("you ... ?") is said, never cut.
      // A line that breaks a seat rule is never said (better one voice fewer than a promise the run can't keep).
      const sayable = x => !!x && words(x).length >= 4 && words(x).length <= HARD_MAX_WORDS && !(/\byou/i.test(x) && /\?/.test(x)) && !seatProblem(x, seat, raised);
      line = !problem(again, thread, answerTo, seat, raised) ? again : sayable(again) && !toHer(again) ? again : sayable(line) && !toHer(line) ? line
        : sayable(again) ? again : sayable(line) ? line : null;
    }
    if (!line) continue;
    // At least gapMs between two lines, measured, not trusted to one timer (timers can fire a little early).
    while (lastAt && Date.now() - lastAt < gapMs) await sleep(gapMs - (Date.now() - lastAt));
    lastAt = Date.now();
    const entry = { by: NAMES[seat], seat, text: line, turn: thread.length + 1, ms: lastAt - t0 };
    thread.push(entry);
    if (run) logEvent(run, 'chime', { pane: 'doc', askId: ask.id, ...entry });
  }
  return thread;
}

// Warm a run's pool as soon as a question for her exists (she may open it any moment), and when the room opens one.
let off = null;
export function installWarmth() {
  if (off) return off;
  off = onEvent(ev => { if (ev.run && (ev.type === 'ask' || ev.type === 'checkin.open')) warmUp(ev.run); if (ev.run && ev.type === 'build.done') coolDown(ev.run); });
  return off;
}
export const _pools = pools; // tests
