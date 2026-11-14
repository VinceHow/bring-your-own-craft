// The run's event log: runs/<id>/events.jsonl. Counter, reasons and meter are pure functions of it.
// Every event: { t (ms epoch), run, type, pane?, mode?: 'craft'|'stamp', ...data }.
import fs from 'node:fs';
import path from 'node:path';
import { scrub } from './model.js';

export const RUNS_DIR = path.resolve(process.env.RUNS_DIR || 'runs');
const listeners = new Set(); // SSE subscribers: fn(event)

export function newRunId(prefix = 'run') {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
}
export function runDir(run) { const d = path.join(RUNS_DIR, run); fs.mkdirSync(d, { recursive: true }); return d; }

export function logEvent(run, type, data = {}) {
  const ev = { t: Date.now(), run, type, ...data };
  const line = scrub(JSON.stringify(ev));
  fs.appendFileSync(path.join(runDir(run), 'events.jsonl'), line + '\n');
  const safe = JSON.parse(line);
  for (const fn of listeners) { try { fn(safe); } catch {} }
  return safe;
}
export function readEvents(run) {
  const f = path.join(RUNS_DIR, run, 'events.jsonl');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
}
export function onEvent(fn) { listeners.add(fn); return () => listeners.delete(fn); }
