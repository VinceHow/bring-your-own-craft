// The four teammates plus Product's engine: five parallel calls, each listing the decisions its craft raises.
// Product's system prompt is built around write-spec's SKILL.md (vendor/product-management, Apache-2.0).
import fs from 'node:fs';
import path from 'node:path';
import { callModel as realCallModel } from './model.js';
import { logEvent } from './events.js';
import { scanText } from './policy.js';
import { formatTaste, asLines } from './taste.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PROMPTS = path.join(ROOT, 'prompts');

export const SEATS = ['product', 'design', 'data', 'research', 'engineering'];
export const STANCES = {
  product: 'what we build, and for whom',
  design: 'sketch first, polish last',
  data: "only what we'll measure",
  research: "what's known, with sources",
  engineering: 'boring and correct',
};
const NAMES = { product: 'Product', design: 'Design', data: 'Data', research: 'Research', engineering: 'Engineering' };

// Default model for teammates, chosen by measurement (see docs/dry-runs/timings.md). Override with TEAM_MODEL.
export const TEAM_MODEL = process.env.TEAM_MODEL || 'sonnet';
export const PER_SEAT = Number(process.env.TEAM_COUNT || 5);

// ---- prompt helpers (shared by select.js and taste.js) ----
const cache = new Map();
export function prompt(name, vars = {}) {
  if (!cache.has(name)) cache.set(name, fs.readFileSync(path.join(PROMPTS, `${name}.md`), 'utf8'));
  return cache.get(name).replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : ''));
}
export function formatFlow(flow) {
  const nodes = flow?.nodes || [];
  if (!nodes.length) return '(no boxes yet)';
  const out = nodes.map(n => `- ${n.id}: ${n.label}`);
  const edges = (flow.edges || []).map(e => `${e.from} -> ${e.to}`);
  if (edges.length) out.push(`Arrows: ${edges.join(', ')}`);
  return out.join('\n');
}

export function loadFinding() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'research-finding.json'), 'utf8'));
}
function writeSpec() {
  const s = fs.readFileSync(path.join(ROOT, 'vendor', 'product-management', 'skills', 'write-spec', 'SKILL.md'), 'utf8');
  return s.replace(/^---[\s\S]*?---\s*/, ''); // drop the plugin frontmatter
}

export const CANDIDATES_SCHEMA = {
  type: 'object',
  properties: {
    note: { type: 'string' },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          decision: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' },
          reason: { type: 'string' },
          cost: { type: 'string', enum: ['low', 'high'] },
          undoable: { type: 'boolean' },
          attachTo: { type: ['string', 'null'] },
          usesFinding: { type: 'boolean' },
        },
        required: ['decision', 'options', 'recommendation', 'reason', 'cost', 'undoable', 'attachTo', 'usesFinding'],
      },
    },
  },
  required: ['note', 'candidates'],
};

export function systemFor(seat, { idea, flow, taste, herSeat = 'product', count = PER_SEAT }) {
  const notes = seat === 'product' ? prompt('product', { WRITE_SPEC: writeSpec() })
    : seat === 'research' ? prompt('research', { FINDING: JSON.stringify(publicFinding(), null, 2) })
    : prompt(seat);
  return prompt('teammate', {
    SEAT: NAMES[seat], STANCE: STANCES[seat], HER_SEAT: herSeat, IDEA: idea, FLOW: formatFlow(flow),
    TASTE: formatTaste(asLines(taste)), SEAT_NOTES: notes, COUNT: count,
  });
}
function publicFinding() {
  const f = loadFinding();
  return { title: f.title, claim: f.claim, url: f.url, label: f.label };
}

// Turn one model reply into clean Candidates. Code, not the model, owns: ids, seat, the option list containing the
// recommendation, attachTo pointing at a real box, and Research citing only its prepared finding.
export function normalise(seat, raw, { flow, nextId }) {
  const nodeIds = new Set((flow?.nodes || []).map(n => n.id));
  const finding = loadFinding();
  return (raw?.candidates || []).filter(c => c && c.decision).map(c => {
    const options = [...new Set((c.options || []).map(String).filter(Boolean))].slice(0, 4);
    let rec = String(c.recommendation || options[0] || '');
    if (!options.includes(rec)) options.unshift(rec);
    const out = {
      id: nextId(), seat, decision: String(c.decision), options: options.length >= 2 ? options : [...options, 'Leave it out'],
      recommendation: rec, reason: String(c.reason || ''), cost: c.cost === 'high' ? 'high' : 'low',
      undoable: c.undoable !== false, attachTo: nodeIds.has(c.attachTo) ? c.attachTo : null,
    };
    if (seat === 'research' && c.usesFinding) out.source = { title: finding.title, url: finding.url, prepared: true };
    return out;
  });
}

// Five parallel calls. Logs teammate.start / candidate / teammate.done (and a stamp for any question in a note).
// Returns { candidates, timings: { seat: ms }, ms }. A teammate that fails logs teammate.error and contributes none.
export async function propose({ run, idea, flow, taste, herSeat = 'product', seats = SEATS, count = PER_SEAT,
  model = TEAM_MODEL, callModel = realCallModel } = {}) {
  const t0 = Date.now();
  const timings = {};
  let n = 0;
  const nextId = () => `c${++n}`;
  // Each seat logs as soon as it returns, so its sheet fills while the others still work. Ids in arrival order.
  const results = await Promise.all(seats.map(async seat => {
    const s0 = Date.now();
    if (run) logEvent(run, 'teammate.start', { pane: seat, seat });
    let raw = null;
    try {
      raw = await callModel({
        system: systemFor(seat, { idea, flow, taste, herSeat, count }),
        user: `List the decisions for: ${idea}`,
        schema: CANDIDATES_SCHEMA, model,
      });
    } catch (e) {
      if (run) logEvent(run, 'teammate.error', { pane: seat, seat, error: String(e.message).slice(0, 200) });
    }
    timings[seat] = Date.now() - s0;
    const cs = raw ? normalise(seat, raw, { flow, nextId }) : [];
    if (run) {
      if (raw?.note) scanText(run, seat, raw.note);
      for (const c of cs) logEvent(run, 'candidate', { pane: seat, ...c });
      logEvent(run, 'teammate.done', { pane: seat, seat, count: cs.length, ms: timings[seat], note: raw?.note || '' });
    }
    return cs;
  }));
  const candidates = results.flat().sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  return { candidates, timings, ms: Date.now() - t0 };
}
