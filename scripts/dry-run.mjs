#!/usr/bin/env node
// Terminal dry run of steps 1-3: idea + journey -> five teammates' candidates -> her (at most) three -> the rest
// decided, cited. Real model calls through lib/model.js; logs a real run under runs/.
// Usage: node scripts/dry-run.mjs [yoga|cafe|tattoo] [--idea "..." --name x --lines "a|b|c"] [--team <model>]
//          [--sketch] (the journey comes from Design's real first sketch, as on stage) [--intro "I love..."]
//          [--select <model>] [--count 5] [--out file.md]   (--count 3 is the close's fast path)
import fs from 'node:fs';
import { newRunId, logEvent, readEvents } from '../lib/events.js';
import { proposeAndSelect, SELECT_MODEL, SELECT_EFFORT } from '../lib/select.js';
import { TEAM_MODEL, TEAM_EFFORT, PER_SEAT } from '../lib/teammates.js';
import { initTaste } from '../lib/taste.js';
import { tally } from '../lib/tally.js';
import { backend } from '../lib/model.js';
import { parseFlow } from '../lib/flow.js';
import { firstSketch, currentLines } from '../lib/sketch.js';
import { GRANULAR, validAsk } from '../lib/select.js';

const IDEAS = {
  yoga: {
    idea: 'A booking page for a small yoga studio.',
    lines: ['classes', 'a class', 'confirm', 'booked', 'regulars → "Book your usual"'],
  },
  tattoo: { idea: 'A booking site for a tattoo studio.', lines: [] },
  cafe: {
    idea: "A pre-order page for a café's morning pastries.",
    lines: ["today's pastries", 'pick a pastry', 'pickup time', 'pay', 'see you at the counter', 'regulars → "My usual"'],
  },
};
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const which = opt('idea') ? (opt('name') || 'custom') : args.find(a => !a.startsWith('--') && IDEAS[a]) || 'yoga';
const { idea, lines } = opt('idea')
  ? { idea: opt('idea'), lines: (opt('lines') || '').split('|').map(s => s.trim()).filter(Boolean) }
  : IDEAS[which];


const SKETCH = args.includes('--sketch');
const intro = opt('intro', 'I love working on the customer journey, understanding the problems customers face, and building products that solve them.');
const run = newRunId(`dry-${which}`);
const taste = initTaste(run, { intro });
logEvent(run, 'run.start', { pane: 'sheet', mode: 'craft', idea, seat: 'product', intro });
let sketch = null;
if (SKETCH) {
  sketch = await firstSketch({ run, idea, dripMs: 0, withGuest: false });
  lines.splice(0, lines.length, ...currentLines(readEvents(run)));
} else for (let i = 0; i < lines.length; i++) {
  const f = parseFlow(lines.slice(0, i + 1));
  logEvent(run, 'flow.line', { pane: 'flow', mode: 'craft', text: lines[i], nodes: f.nodes, edges: f.edges });
}
const flow = parseFlow(lines);
const sk = readEvents(run).find(e => e.type === 'sketch.done');

const r = await proposeAndSelect({
  run, idea, flow, taste, herSeat: 'product',
  teamModel: opt('team'), selectModel: opt('select'), count: opt('count') ? Number(opt('count')) : undefined,
});
const t = tally(readEvents(run), taste);

const out = [];
const p = s => out.push(s);
p(`# Dry run: ${which}`);
p('');
p(`- Run: \`runs/${run}/\` (backend: ${backend()}, team: ${opt('team') || TEAM_MODEL} effort ${TEAM_EFFORT}, ${opt('count') || PER_SEAT} per seat; select: ${opt('select') || SELECT_MODEL} effort ${SELECT_EFFORT})`);
p(`- Idea: ${idea}`);
p(`- Her intro: "${intro}"`);
p(`- Her journey${SKETCH ? ` (Design's first sketch, ${(sk.ms / 1000).toFixed(1)} s, ${sk.prepared ? 'PREPARED' : 'live'}, usedFinding ${sk.usedFinding})` : ''}: ${lines.length ? lines.map(l => `"${l}"`).join(', ') : '(none given)'}`);
if (SKETCH) p(`- Users: ${(sketch.body.users || []).map(u => u.label).join(', ')}`);
p(`- Boxes: ${flow.nodes.map(n => `${n.id} ${n.label}`).join(' · ')}`);
p(`- Her file: ${taste.map(l => `[${l.id}] ${l.text}`).join(' / ')}`);
p('');
p(`## Timings (real)`);
p(`- Teammates in parallel: ${(r.teamMs / 1000).toFixed(1)} s (${Object.entries(r.teamTimings).map(([s, ms]) => `${s} ${(ms / 1000).toFixed(1)} s`).join(', ')})`);
p(`- Select (score and decide in parallel): ${(r.selectMs / 1000).toFixed(1)} s`);
p(`- Total: ${(r.totalMs / 1000).toFixed(1)} s`);
p('');
p(`## Counter: ${t.came} decisions came up · ${t.brought} brought to you · ${t.decided} decided`);
p('');
p(`## Her ${r.asks.length}`);
for (const a of r.asks) {
  p(`- **${a.by}:** "${a.question}"`);
  p(`  - on: ${a.artifact.kind}${a.artifact.ref ? ` (${a.artifact.ref})` : ''} · settles: ${a.decisionIds.join(', ')} · valid Ask: ${validAsk(a)}`);
  p(`  - from ${a.id}: ${a.decision} (team's recommendation if she skips it: ${a.recommendation})`);
  p(`  - why (logged only): ${a.why}`);
}
const refused = readEvents(run).filter(e => e.type === 'ask.refused');
if (refused.length) {
  p('');
  p('## Refused by code');
  for (const e of refused) p(`- ${e.id}: ${e.reason}`);
}
p('');
p('## Decided for her');
for (const d of t.reasons.filter(x => x.kind === 'decided')) {
  p(`- ${d.id} ${d.seat}: ${d.decision} → **${d.choice}** (cites ${d.cites}${d.line ? `: "${d.line}"` : ''})`);
}
const rej = readEvents(run).filter(e => e.type === 'cite.rejected');
if (rej.length) { p(''); p('## Citations rejected by code'); for (const e of rej) p(`- ${e.id} cited "${e.cited}" → team default`); }
p('');
p('## All candidates');
for (const c of r.candidates) {
  const s = r.scores.get(c.id);
  p(`- ${c.id} ${c.seat} [${c.cost}${c.undoable ? '' : ', not undoable'}] ${c.decision}` +
    (s ? ` (big ${s.big}, hers ${s.hers}, silent ${s.silent}${s.granular || GRANULAR.test(c.decision) ? ', GRANULAR' : ''}${s.showable ? '' : ', not showable'}${s.dupOf ? `, dup of ${s.dupOf}` : ''})${s.question ? ` q: "${s.question}"` : ''}` : ' (not scored)'));
}
p('');
p(`Meter so far: ${t.meter.pct}% (${t.meter.craft} craft, ${t.meter.stamp} stamp)`);
const text = out.join('\n') + '\n';
process.stdout.write(text);
if (opt('out')) fs.writeFileSync(opt('out'), text);
