#!/usr/bin/env node
// Record a finished run as a named replay: copies runs/<id>/ to runs/<name>/ (events.jsonl, taste.md, the built page).
//   node scripts/record-run.mjs rehearsal              -> the newest run with a select.done (or build.done if any)
//   node scripts/record-run.mjs cafe run-2026-...-abcd -> that run
//   --force replaces an existing runs/<name>/.  RUNS_DIR is honoured, like the server.
// The room's R / C keys replay runs/rehearsal and runs/yoga (GET /api/replay/<name>), labelled REPLAY.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const force = args.includes('--force');
const [name, id] = args.filter(a => !a.startsWith('--'));
const RUNS = path.resolve(process.env.RUNS_DIR || 'runs');
const die = m => { console.error(m); process.exit(1); };

if (!name || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,80}$/.test(name)) die('usage: node scripts/record-run.mjs <name> [run-id] [--force]');
const read = run => {
  const f = path.join(RUNS, run, 'events.jsonl');
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
};
const finished = evs => evs && evs.some(e => e.type === 'select.done' || e.type === 'build.done');

let src = id;
if (!src) {
  // The newest finished run; a built one wins over one that only got as far as the three asks.
  const runs = fs.existsSync(RUNS) ? fs.readdirSync(RUNS).filter(d => d !== name && d !== 'rehearsal' && d !== 'yoga' && d !== 'cafe') : [];
  const done = runs.map(d => ({ d, evs: read(d) })).filter(r => finished(r.evs))
    .map(r => ({ d: r.d, built: r.evs.some(e => e.type === 'build.done'), t: r.evs.at(-1).t }))
    .sort((a, b) => (b.built - a.built) || (b.t - a.t));
  if (!done.length) die(`no finished run in ${RUNS}`);
  src = done[0].d;
}
const evs = read(src);
if (!evs) die(`no runs/${src}/events.jsonl`);
if (!finished(evs)) die(`runs/${src} never finished (no select.done or build.done); not recording it`);
const dest = path.join(RUNS, name);
if (fs.existsSync(dest)) {
  if (!force) die(`runs/${name} exists; pass --force to replace it`);
  fs.rmSync(dest, { recursive: true, force: true });
}
fs.cpSync(path.join(RUNS, src), dest, { recursive: true });
// What was recorded, and from which run, kept beside it (the room shows the recording time from the events).
const start = evs.find(e => e.type === 'run.start');
fs.writeFileSync(path.join(dest, 'RECORDED.json'), JSON.stringify({
  from: src, recordedAt: new Date().toISOString(), idea: start?.idea ?? null, events: evs.length,
  asks: evs.filter(e => e.type === 'ask').length, built: evs.some(e => e.type === 'build.done'),
}, null, 2) + '\n');
console.log(`recorded runs/${src} -> runs/${name} (${evs.length} events, ${evs.filter(e => e.type === 'ask').length} asks)`);
