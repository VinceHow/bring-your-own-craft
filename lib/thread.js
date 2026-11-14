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
import { prompt, SEATS, STANCES, loadFinding } from './teammates.js';

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
export function cleanLine(raw) {
  let s = String(raw ?? '').trim().split('\n').find(l => l.trim()) || '';
  s = s.replace(/^\s*(\*\*)?[A-Z][a-z]+( \([A-Za-z]+\))?(\*\*)?:\s*/, '') // "Mika: ..." or "Mika (Design): ..."
    .replace(/^["“'‘]+|["”'’]+$/g, '').replace(BANNED, '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s[0].toUpperCase() + s.slice(1);
}
// Never addressed to her or about her (she's in the room); a light question between teammates is fine.
export const toHer = s => /\byou(r|rs|'re|’re|'ll|’ll|'ve|’ve)?\b|\b(her|she|she's|she’s)\b/i.test(s);
export const okLine = s => !!s && !toHer(s) && words(s).length <= MAX_WORDS;
// Why a line goes back, or null when it can be said.
export function problem(s, thread = []) {
  if (!s) return 'Say one line.';
  if (toHer(s)) return 'Talk to the team, not to her or about her.';
  if (words(s).length < 4) return 'Say something concrete from your own work.';
  if (words(s).length > MAX_WORDS) return 'Shorter: 6 to 12 words.';
  const open = x => words(x.toLowerCase().replace(/[^a-z' ]/g, '')).slice(0, 3).join(' ');
  if (thread.some(t => open(t.text) === open(s))) return "Don't repeat how the last line started; add something new.";
  return null;
}

// ---- who speaks: the teammate who asked, then those whose decisions her answer touches, then the rest by work ----
export function speakers(ask, evs, herSeat) {
  const team = SEATS.filter(s => s !== herSeat);
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
export function workOf(seat, evs, ask = null) {
  const decided = new Map(evs.filter(e => e.type === 'decided').map(d => [d.id, d]));
  const touches = new Set(ask?.decisionIds || []);
  const mine = evs.filter(e => e.type === 'candidate' && e.seat === seat);
  // What this question touches first, then at most two more of its own.
  const lines = [...mine.filter(c => touches.has(c.id)), ...mine.filter(c => !touches.has(c.id)).slice(0, 2)].slice(0, 3)
    .map(c => `- ${c.decision}: ${decided.get(c.id)?.choice || c.recommendation} (options: ${c.options.join(' / ')})`);
  if (seat === 'research' && ask?.artifact?.kind === 'finding') { try { const f = loadFinding(); lines.push(`- Your finding, researched before the demo: ${f.claim} (${f.title})`); } catch {} }
  const note = evs.findLast(e => e.type === 'teammate.done' && e.seat === seat)?.note;
  if (note) lines.unshift(`- What you worked on: ${note}`);
  return lines.join('\n') || '- (nothing written down yet: speak from your stance)';
}

export function turnUser({ seat, idea, question, askedBy, answer, thread, work, decisions, last }) {
  return [
    `You are ${NAMES[seat]}, ${SEAT_NAME[seat]}. Your stance: "${STANCES[seat]}".`,
    `She is building: ${idea}`,
    '', 'Your work in this run:', work,
    '', 'What the page can show:', decisions || '- (the journey and the page words)',
    '', `${askedBy} asked her: "${question}"`,
    `She answered (everything follows from this): "${answer}"`,
    '', thread.length ? 'The team so far, after her answer:\n' + thread.map(t => `${t.by} (${SEAT_NAME[t.seat]}): ${t.text}`).join('\n') : 'Nobody has spoken yet: you go first.',
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
        if (ev?.type === 'message_stop' || m.type === 'result') { // the text is complete well before `result`
          const r = this.resolve; this.resolve = this.reject = null;
          if (r) r(text || m.result || '');
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
  const own = new RegExp(`^${NAMES[seat] || '\\0'}[,:]\\s*`, 'i'); // nobody calls themselves by name
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
    const user = turnUser({ seat, idea: start.idea || '', question: ask.question || ask.decision || '', askedBy, answer: text,
      thread, work: workOf(seat, evs, ask), decisions, last: turn === Math.min(who.length, MAX_TURNS) - 1 });
    let line = await speak(run, user, callModel, seat);
    const why = turn === 0 ? (line && !toHer(line) && words(line).length <= HARD_MAX_WORDS ? null : problem(line, thread)) : problem(line, thread);
    if (why) {
      const again = await speak(run, `${user}\n(Your first try was: "${line || ''}". ${why})`, callModel, seat);
      // The second try is said if it's sound. Failing that, silence is worse than a whole line that mentions her:
      // any line of 4 to HARD_MAX_WORDS words that doesn't ask her anything ("you ... ?") is said, never cut.
      const sayable = x => !!x && words(x).length >= 4 && words(x).length <= HARD_MAX_WORDS && !(/\byou/i.test(x) && /\?/.test(x));
      line = !problem(again, thread) ? again : sayable(again) && !toHer(again) ? again : sayable(line) && !toHer(line) ? line
        : sayable(again) ? again : sayable(line) ? line : null;
    }
    if (!line) continue;
    const wait = lastAt ? gapMs - (Date.now() - lastAt) : 0;
    await sleep(wait);
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
