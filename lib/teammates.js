// The five teammates plus Product's engine: six parallel calls, each listing the decisions its craft raises.
// Product's system prompt is built around write-spec's SKILL.md (vendor/product-management, Apache-2.0); Design's
// carries taste-skill's design rules (vendor/taste-skill/RULES-FOR-THE-ROOM.md, MIT); Research cites only
// data/research-finding.json.
import fs from 'node:fs';
import path from 'node:path';
import { callModel as realCallModel } from './model.js';
import { logEvent, readEvents } from './events.js';
import { scanText } from './policy.js';
import { formatTaste, asLines } from './taste.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PROMPTS = path.join(ROOT, 'prompts');

export const SEATS = ['product', 'design', 'data', 'research', 'strategy', 'engineering'];
export const STANCES = {
  product: 'what we build, and for whom',
  design: 'sketch first, polish last',
  data: "only what we'll measure",
  research: "what's known, with sources",
  strategy: 'who pays, and why now',
  engineering: 'boring and correct',
};
// Each seat's riso ink (BRIEF section 3), for any server-side use; the room keeps its own copy in public/.
export const INKS = { product: '#FF48B0', design: '#0078BF', data: '#00A95C', research: '#FF6C2F', strategy: '#BB8B41',
  engineering: '#FFE800' };
// Teammates' names (DEMO.md: names only, never pronouns). Her own seat's teammate has no name of its own.
export const TEAMMATES = { design: 'Mika', research: 'Noor', data: 'Theo', strategy: 'Ines', engineering: 'Bo' };
export const teammateName = seat => TEAMMATES[seat] || `${NAMES[seat] || 'Product'}'s teammate`;

// Her private profile (lib/profile.js, built from her intro and idea). Until that module lands, an empty profile.
// Loaded without blocking this module (profile.js may import this one), long before any run asks for it.
let readProfile = () => ({}), formatProfile = null;
import('./profile.js').then(m => {
  if (typeof m.readProfile === 'function') readProfile = m.readProfile;
  if (typeof m.formatProfile === 'function') formatProfile = m.formatProfile;
})
  .catch(e => { if (e?.code !== 'ERR_MODULE_NOT_FOUND') console.error('profile.js failed to load:', e.message); });
export function profileFor(run, given) {
  let p = given;
  if (p === undefined && run) { try { p = readProfile(run); } catch { p = {}; } }
  if (!p || typeof p !== 'object' || !Object.keys(p).length) return '(nothing yet: assume sensibly from her words)';
  return (formatProfile && formatProfile(p)) || JSON.stringify(p, null, 1);
}
// Her intro sentence, as she said it at her card (run.start carries it).
export function introOf(run) {
  if (!run) return null;
  try { return readEvents(run).find(e => e.type === 'run.start')?.intro || null; } catch { return null; }
}
// Her domains: the areas that are hers, where a big question routes to her (VISION.md). The profile deduces them
// from her two setup sentences (profile.domains); until it does, her seat's own areas.
export const SEAT_DOMAINS = {
  product: ['target customer', 'customer problem', 'user journey'],
  design: ['look and feel', 'user journey'],
  research: ['target customer', 'customer problem'],
  data: ['what success looks like'],
  strategy: ['who pays and why', 'positioning'],
  engineering: ['how it works'],
};
export function domainsFor(run, herSeat = 'product', given) {
  let p = given;
  if (p === undefined && run) { try { p = readProfile(run); } catch { p = null; } }
  const raw = p?.domains;
  const list = (Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items
    : typeof raw?.text === 'string' ? raw.text.split(/[,;]|\band\b/) : typeof raw === 'string' ? raw.split(/[,;]/) : [])
    .map(x => String(typeof x === 'object' ? x?.text ?? x?.name ?? '' : x).trim().toLowerCase()).filter(Boolean);
  return list.length ? [...new Set(list)] : (SEAT_DOMAINS[herSeat] || []);
}
// Does the scorer's named domain match one of hers? (loose: either contains the other, case-insensitive)
export function inDomains(name, domains) {
  const n = String(name ?? '').trim().toLowerCase();
  if (!n) return false;
  return domains.some(d => d === n || d.includes(n) || n.includes(d));
}

// Her name tag, for a craft we've never listed (the "Your own craft" seat). Empty in the six listed seats.
export function herTagLine(herSeat, herTag) {
  if (!herTag || typeof herTag !== 'object') return '';
  const bits = [herTag.craft && `craft: ${herTag.craft}`, herTag.goodAt && `good at: ${herTag.goodAt}`,
    herTag.loves && `loves: ${herTag.loves}`].filter(Boolean);
  return bits.length ? `Her name tag, in her words: ${bits.join(' · ')}.` : '';
}

const NAMES = { product: 'Product', design: 'Design', data: 'Data', research: 'Research', strategy: 'Strategy', engineering: 'Engineering' };

// Default model for teammates, chosen by measurement (see docs/dry-runs/timings.md). Override with TEAM_MODEL.
export const TEAM_MODEL = process.env.TEAM_MODEL || 'sonnet';
export const TEAM_EFFORT = process.env.TEAM_EFFORT || 'low';
// 4 per seat x 6 seats = 24 candidates, about the 25 the five-seat team sent, so selecting costs the same.
export const PER_SEAT = Number(process.env.TEAM_COUNT || 4);

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

// Research's prepared findings, one per topic. Each says which ideas it fits and which decisions it can back; code
// picks the one that fits her idea, or none. A wrong source on stage is worse than none, and so is an unread one:
// only a VERIFIED finding is ever cited or shown (isVerified: its URL, a line quoted from it, the date it was read).
// `key` picks an entry inside the file (the bakery file keeps its verified finding under "regulars").
export const FINDINGS = [
  { file: 'research-finding-bakery.json', key: 'regulars', topic: 'who buys bread at artisan bakeries, and how often (weekly regulars)',
    idea: /\b(bakery|bakeries|bakers?|breads?|loaf|loaves|sourdough|pastry|pastries|pre-?orders?|order(s|ing)? ahead|sells? out|sold out|how many to bake)\b/i,
    decision: /regulars?|weekly|every week|each week|repeat|usual (loaf|order|bread)|loyal|first customers|who (it'?s|we build|this is) for|for first|audience|sourdough/i,
    // the shape shows it when regulars (and their usual) are a user or a stage
    shows: /regular|weekly|usual/i },
  { file: 'research-finding.json', topic: 'waitlists and full classes for booked group sessions',
    idea: /\b(class(es)?|sessions?|lessons?|workouts?|fitness|yoga|pilates|gym|courses?|bootcamp|spin|barre|dance)\b/i,
    decision: /\bwait[- ]?list|\bfull (class|session|lesson)|\b(class|session|lesson)(es|s)? (is |are )?full\b|\bwhen .*\bfull\b|\bspots? (open|free)/i,
    shows: /\bfull\b|wait[- ]?list|spots? (open|free)/i },
];
// Verified = it can be cited: an http(s) URL, a line quoted from the page, the date it was read, and not marked
// verified:false. Anything else is never cited, never shown, never fed to a prompt.
export function isVerified(f) {
  return !!(f && typeof f === 'object' && f.verified !== false && /^https?:\/\/\S+$/.test(String(f.url || ''))
    && String(f.quote || '').trim().length > 0 && String(f.fetched || f.readAt || '').trim().length > 0);
}
const findingCache = new Map();
const readFinding = (file, key) => {
  const id = file + '#' + (key || '');
  if (!findingCache.has(id)) {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
    findingCache.set(id, key ? json[key] : json);
  }
  return findingCache.get(id);
};
// The verified finding that fits her idea, with its topic rules: { ...entry, finding } or null.
export function findingFor(idea) {
  const e = FINDINGS.find(f => f.idea.test(String(idea || '')));
  if (!e) return null;
  const finding = readFinding(e.file, e.key);
  return isVerified(finding) ? { ...e, finding } : null;
}
// With an idea: the verified finding that fits it (or null). Without one: the yoga finding, if verified.
export function loadFinding(idea) {
  if (idea === undefined) { const f = readFinding('research-finding.json'); return isVerified(f) ? f : null; }
  return findingFor(idea)?.finding ?? null;
}
export function designRules() {
  return fs.readFileSync(path.join(ROOT, 'vendor', 'taste-skill', 'RULES-FOR-THE-ROOM.md'), 'utf8');
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
          question: { type: ['string', 'null'] }, // drafted in this teammate's voice; select.js checks it and decides
          seats: { type: 'array', items: { type: 'string' } }, // the other crafts this decision touches
        },
        required: ['decision', 'options', 'recommendation', 'reason', 'cost', 'undoable', 'attachTo', 'usesFinding'],
      },
    },
  },
  required: ['note', 'candidates'],
};

export function systemFor(seat, { run, idea, flow, taste, herSeat = 'product', herTag = null, profile, count = PER_SEAT }) {
  const notes = seat === 'product' ? prompt('product', { WRITE_SPEC: writeSpec() })
    : seat === 'research' ? prompt('research', { FINDING_NOTE: researchNote(idea) })
    : seat === 'design' ? prompt('design', { RULES: designRules() })
    : prompt(seat);
  return prompt('teammate', {
    SEAT: NAMES[seat], STANCE: STANCES[seat], HER_SEAT: herSeat,
    HER_TAG: herTagLine(herSeat, herTag), INTRO: introOf(run) || '(not said yet)', PROFILE: profileFor(run, profile),
    HER_DOMAINS: domainsFor(run, herSeat, profile).join(', ') || '(not known yet)',
    IDEA: idea, FLOW: formatFlow(flow),
    TASTE: formatTaste(asLines(taste)), SEAT_NOTES: notes, COUNT: count,
  });
}
function publicFinding(f) {
  return { title: f.title, claim: f.claim, quote: f.quote, url: f.url, read: f.fetched || f.readAt, label: f.label, how_verified: f.how_verified, not_claimed: f.not_claimed };
}
function researchNote(idea) {
  const e = findingFor(idea);
  if (!e) return `You have no prepared finding for this idea. Never invent sources, studies or numbers. Frame your
decisions as what we'd learn first. \`usesFinding\` is always false.`;
  return `You have exactly one finding, gathered before the demo. Cite only this finding; never invent other sources,
studies or numbers. It covers one thing: ${e.topic}. Set \`usesFinding\` to true only for a decision about exactly
that. For any other decision, \`usesFinding\` is false: no source beats the wrong one. Decisions not resting on it are
framed as what we'd learn first.

The finding (JSON):
${JSON.stringify(publicFinding(e.finding), null, 2)}`;
}

// Kept for older callers: the yoga finding's topic rules.
export const FINDING_COVERS = { idea: FINDINGS[1].idea, decision: FINDINGS[1].decision };
// Code attaches a finding only when it fits her idea AND the decision is on its topic.
export function findingFits(idea, c) {
  const e = findingFor(idea);
  const text = [c.decision, c.recommendation, ...(c.options || [])].join(' ');
  return !!e && e.decision.test(text);
}

// Turn one model reply into clean Candidates. Code, not the model, owns: ids, seat, the option list containing the
// recommendation, attachTo pointing at a real box, and Research citing only its prepared finding, and only on its topic.
export function normalise(seat, raw, { flow, nextId, idea }) {
  const nodeIds = new Set((flow?.nodes || []).map(n => n.id));
  const finding = loadFinding(idea ?? '');
  return (raw?.candidates || []).filter(c => c && c.decision).map(c => {
    const options = [...new Set((c.options || []).map(String).filter(Boolean))].slice(0, 4);
    let rec = String(c.recommendation || options[0] || '');
    if (!options.includes(rec)) options.unshift(rec);
    const out = {
      id: nextId(), seat, decision: String(c.decision), options: options.length >= 2 ? options : [...options, 'Leave it out'],
      recommendation: rec, reason: String(c.reason || ''), cost: c.cost === 'high' ? 'high' : 'low',
      undoable: c.undoable !== false, attachTo: nodeIds.has(c.attachTo) ? c.attachTo : null,
      // Every seat the decision touches, its own first; code keeps only real seats (the team space reads this).
      seats: [...new Set([seat, ...(Array.isArray(c.seats) ? c.seats : []).map(x => String(x).toLowerCase().trim())])]
        .filter(x => SEATS.includes(x)),
      ...(typeof c.question === 'string' && c.question.trim() ? { question: c.question.replace(/\s+/g, ' ').trim().slice(0, 240) } : {}),
    };
    if (seat === 'research' && c.usesFinding && isVerified(finding) && findingFits(idea, out)) {
      out.source = { title: finding.title, url: finding.url, quote: finding.quote, read: finding.fetched || finding.readAt, label: finding.label, how_verified: finding.how_verified, prepared: true };
    }
    return out;
  });
}

// Six parallel calls. Logs teammate.start / candidate / teammate.done (and a stamp for any question in a note).
// Returns { candidates, timings: { seat: ms }, ms }. A teammate that fails logs teammate.error and contributes none.
export async function propose({ run, idea, flow, taste, herSeat = 'product', herTag = null, profile, seats = SEATS, count = PER_SEAT,
  model = TEAM_MODEL, effort = TEAM_EFFORT, callModel = realCallModel } = {}) {
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
        system: systemFor(seat, { run, idea, flow, taste, herSeat, herTag, profile, count }),
        user: `List the decisions for: ${idea}`,
        schema: CANDIDATES_SCHEMA, model, effort, label: `teammate ${seat}`,
      });
    } catch (e) {
      if (run) logEvent(run, 'teammate.error', { pane: seat, seat, error: String(e.message).slice(0, 200) });
    }
    timings[seat] = Date.now() - s0;
    const cs = raw ? normalise(seat, raw, { flow, nextId, idea }) : [];
    if (run) {
      if (raw?.note) scanText(run, seat, raw.note);
      for (const c of cs) logEvent(run, 'candidate', { pane: seat, ...c });
      logEvent(run, 'teammate.done', { pane: seat, seat, count: cs.length, ms: timings[seat], note: raw?.note || '' });
    }
    return cs;
  }));
  const candidates = results.flat().sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  // Every teammate failed: say so in the run log (the room shows it), not a quiet round with nothing in it.
  if (run && seats.length && !candidates.length) {
    const errs = readEvents(run).filter(e => e.type === 'teammate.error' && e.t >= t0).map(e => e.error);
    if (errs.length >= seats.length) logEvent(run, 'propose.error', { error: `every teammate failed: ${String(errs[0] || '').slice(0, 160)}` });
  }
  return { candidates, timings, ms: Date.now() - t0 };
}
