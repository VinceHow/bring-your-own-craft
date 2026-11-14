// The live fill (pipeline step 6). One model call turns her flow, her answers, her file and the decided items
// into the template's slot JSON (checked against templates/<t>/slots.schema.json); then OUR code writes
// runs/<id>/page/index.html and copies the template's assets. The model never writes HTML.
//
// Template markup (templates/<t>/index.html), all filled by render():
//   {{words.key}}              escaped text from slots.words (falls back to templates/<t>/defaults.json)
//   {{{raw.key}}}              HTML our code builds (tokens block, decided rows, hidden run input)
//   <!--step:name-->…<!--/step:name-->       sections, re-ordered to slots.steps
//   <!--if:switch-->…<!--/if:switch-->       kept only when slots.switches[switch] is true
//   <!--unless:switch-->…<!--/unless:switch--> kept only when it is false
import fs from 'node:fs';
import path from 'node:path';
import { callModel } from './model.js';
import { validate } from './schema.js';
import { fontFaceCss, copyFonts } from './design.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const TEMPLATES_DIR = path.join(ROOT, 'templates');
// sonnet: measured fill median 8.4 s (n=3) against 15.1 s (n=4) on the default model, same slots quality.
export const FILL_MODEL = process.env.FILL_MODEL || 'sonnet';
const KIT_DIR = path.join(ROOT, 'vendor', 'taste-skill', 'assets'); // the taste-skill kit files the templates load

// The bakery (the demo's idea) first; the café pre-order page for pastries and coffee; else the yoga booking page.
export function pickTemplate(idea = '') {
  if (/bak(e|er|ery|eries|ing)|bread|loa(f|ves)|sourdough/i.test(idea)) return 'bakery';
  return /caf[eé]|pastr|croissant|coffee/i.test(idea) ? 'cafe' : 'yoga';
}

export function loadTemplate(name) {
  const dir = path.join(TEMPLATES_DIR, name);
  return {
    name, dir,
    html: fs.readFileSync(path.join(dir, 'index.html'), 'utf8'),
    schema: JSON.parse(fs.readFileSync(path.join(dir, 'slots.schema.json'), 'utf8')),
    defaults: JSON.parse(fs.readFileSync(path.join(dir, 'defaults.json'), 'utf8')),
  };
}

// Her file: "- [L1] text" per line. Returns [{ id: 'L1', text }].
export function parseTaste(md = '') {
  const out = [];
  for (const line of String(md).split('\n')) {
    const m = line.match(/^\s*[-*]\s*\[(L\d+)\]\s*(.+?)\s*$/);
    if (m) out.push({ id: m[1], text: m[2].replace(/\s*\(prepared for the demo\)\s*$/i, '').trim(), prepared: /\(prepared for the demo\)/i.test(m[2]) });
  }
  return out;
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HEX = /^#[0-9a-fA-F]{6}$/;

const SEAT_NAMES = { product: 'Product', design: 'Design', data: 'Data', research: 'Research', engineering: 'Engineering', strategy: 'Strategy' };

// Read a decision and its choice for what it says about a switch; set it only when it says so plainly.
// The customer's phone (a field the form would ask for), and the business's own number (shown, never asked).
const CUSTOMER_PHONE = /\b(no|without|drop(s|ped)?|skip(s|ped)?|cut|never|removes?)\b[^.;]{0,15}\bphone\b|\b(ask(s|ed|ing)?|collect(s|ed|ing)?|require[sd]?|requiring|enter(s|ed|ing)?|customers?'?s?|people'?s|their|your|guest'?s?)\b[^.;]{0,40}\bphone\b|\bphone( number)? (fields?|box|input)\b|\bphone\b[^.;]{0,25}\b(for (pickup |collection )?texts?|to text)\b/i;
const BUSINESS_PHONE = /\b(bakery|bakery's|shop|shop's|studio|studio's|store|store's|our|business|business's|the owner's|baker's)\s+(phone|tele?phone|number)\b|\bcall (us|the (bakery|shop|studio|store))\b/i;
const SWITCH_RULES = [
  // Bakery: a standing weekly order, and a plainly stated cut-off for the next morning's bake (checked first: a
  // decision about regulars' standing order is about the standing order, not where regulars sit on the page).
  ['standingOrder', q => /standing|weekly order|orders? every week|recurring|subscri/i.test(q) && !/\bfirst\b/i.test(q),
    c => /\b(no|not|never|one-?off|later|skip)\b/i.test(c), c => /standing|weekly|every week|repeat|recurring|subscri|^\s*yes\b/i.test(c)],
  ['cutoff', q => /cut-?off|order(s)? by|deadline|last orders|orders? close|closes? at/i.test(q),
    c => /\bno (cut-?off|deadline)|any ?time|until the morning|^\s*no\b/i.test(c), c => /\d|cut-?off|order(s)? by|close|deadline|^\s*yes\b/i.test(c)],
  ['regularsFirst', q => /regular/i.test(q) && /\b(land|first|top|order|see)\b/i.test(q),
    c => /timetable first|classes first|menu first|schedule first|(bread|loaves|bake) first|\bno\b/i.test(c), c => /usual first|regulars first|\bfirst\b|\byes\b/i.test(c)],
  ['cancelReason', q => /cancel/i.test(q) && /reason|why/i.test(q),
    c => /\b(no|without|never|skip)\b[^.]{0,20}\b(reason|why)\b|^\s*(no\b|one tap$)/i.test(c),
    c => /\b(with|asks?|optional)\b[^.]{0,20}\b(reason|why)\b|^\s*yes\b/i.test(c)],
  ['oneTapCancel', q => /cancel/i.test(q),
    c => /contact|call|phone|email (us|the)|ask (us|the)|in person|no cancel/i.test(c), c => /one tap|link|self|online|button/i.test(c)],
  ['remember', q => /remember/i.test(q), c => /^\s*(no\b|never|don'?t)/i.test(c), c => /\b(yes|remember)/i.test(c)],
  // The phone field: a decision about the phone, or one about what the form asks for that lists the fields (a list of
  // fields without the phone, e.g. "Name and email only", means no phone field).
  // Positive: only a decision about collecting the CUSTOMER's phone touches it (ask/collect/require/enter/customers'/
  // their phone, a phone field). The business's own number ("the bakery phone number", "call us") never does.
  ['phone', q => (CUSTOMER_PHONE.test(q) && !BUSINESS_PHONE.test(q.match(CUSTOMER_PHONE)[0])) || (/\b(asks?|collects?|requires?)\b( (customers|people|them|you))? for\b|\bform'?s? fields\b/i.test(q) && /\b(name|email)\b/i.test(q) && !/remember/i.test(q)),
    (c, q) => (/phone/i.test(c) || !/\b(name|email)\b/i.test(c) ? /\b(no|cut|drop|skip|never|without|don'?t)\b/i.test(c) : !/phone/i.test(q.replace(c, ''))),
    c => /\b(yes|optional|ask|include|add)\b/i.test(c) || /phone/i.test(c)],
  ['waitlist', q => /waitlist|full class|sold out/i.test(q), c => /\b(no|without)\b|as full|sold out|full only/i.test(c), c => /waitlist|^\s*yes\b/i.test(c)],
];
export function applyChoices(switches, items = []) {
  for (const x of items) {
    const q = `${x.decision || ''} ${x.choice || ''}`, c = String(x.choice || '');
    for (const [key, about, no, yes] of SWITCH_RULES) {
      if (!(key in switches) || !about(q)) continue; // a switch this template doesn't have
      if (no(c, q)) switches[key] = false; else if (yes(c, q)) switches[key] = true;
      break;
    }
  }
  return switches;
}

// Make the model's slots safe and consistent; code has the last word on order, switches and citations.
export function normaliseSlots(slots, tpl, { decided = [], answers = [], taste = [], newestLine = null, design = null } = {}) {
  const d = tpl.defaults;
  const words = { ...d.words };
  for (const [k, v] of Object.entries(slots.words || {})) if (k in d.words && typeof v === 'string' && v.trim()) words[k] = v.trim().slice(0, 400);
  const switches = { ...d.switches };
  for (const k of Object.keys(d.switches)) if (typeof slots.switches?.[k] === 'boolean') switches[k] = slots.switches[k];
  // A decided item, and above all her own answer, about one of the switches wins over the model's reading of it:
  // the page shows what "decided for you" says, and the branch she chose even when she overruled the team.
  applyChoices(switches, decided);
  applyChoices(switches, answers);
  if (!switches.oneTapCancel) switches.cancelReason = true; // a cancel that isn't one tap is a cancel with a form
  // Steps: a permutation of the template's movable steps; regulars-first is a switch, so code enforces it.
  const movable = d.steps;
  let steps = Array.isArray(slots.steps) ? slots.steps.filter((s, i, a) => movable.includes(s) && a.indexOf(s) === i) : [];
  for (const s of movable) if (!steps.includes(s)) steps.push(s);
  steps = steps.filter(s => s !== 'regulars');
  if (switches.regulars) steps = switches.regularsFirst ? ['regulars', ...steps] : [...steps.slice(0, 1), 'regulars', ...steps.slice(1)];
  const tokens = { ...d.tokens };
  // Design's dealt palette and type (lib/design.js) is Design's call: it wins over the fill's colour guesses.
  if (design?.tokens) Object.assign(tokens, design.tokens);
  else for (const [k, v] of Object.entries(slots.tokens || {})) if (k in d.tokens && HEX.test(v)) tokens[k] = v;
  // "Decided for you": only decided items that exist, each citing a line that exists (or team default).
  const lineIds = new Set(taste.map(l => l.id));
  const byId = new Map(decided.map(x => [x.id, x]));
  const shown = [];
  const want = Array.isArray(slots.decidedShown) ? slots.decidedShown : [];
  // The item citing her newest line always shows first: it's the beat on stage.
  // Order: up to 3 citing her newest line (the model's picks among them first), then the model's other picks, and a
  // Strategy decision (pricing, payment) is always visible when one was made. Six rows at most.
  const wantIds = want.map(w => w?.id ?? w).filter(id => byId.has(id));
  const newest = newestLine ? decided.filter(x => x.cites === newestLine).map(x => x.id)
    .sort((a, b) => (wantIds.includes(b) ? 1 : 0) - (wantIds.includes(a) ? 1 : 0)).slice(0, 3) : [];
  for (const id of [...newest, ...wantIds]) if (!shown.includes(id)) shown.push(id);
  shown.splice(6);
  const strategy = decided.filter(x => x.seat === 'strategy');
  if (strategy.length && !shown.some(id => byId.get(id).seat === 'strategy')) {
    const pick = strategy.find(x => /pay|price|cost|deposit|card|cash/i.test(`${x.decision} ${x.choice}`)) || strategy[0];
    if (shown.length >= 6) shown.splice(5);
    shown.push(pick.id);
  }
  const labels = new Map(want.filter(w => w && typeof w === 'object').map(w => [w.id, w.label]));
  const rows = shown.map(id => {
    const x = byId.get(id);
    const cites = x.cites === 'team default' || lineIds.has(x.cites) ? x.cites : 'team default';
    const line = taste.find(l => l.id === cites);
    return { id, seat: SEAT_NAMES[x.seat] ? x.seat : null, label: String(labels.get(id) || `${String(x.decision || '').replace(/\?\s*$/, '')}: ${x.choice}`).slice(0, 160), cites, lineText: line?.text || null, newest: !!newestLine && cites === newestLine };
  });
  // No credits and no notes on her page (DEMO 2:20: the product is just the product). Who did what stays in the log.
  // The count in the lead is code's, never the model's (the section itself is hidden).
  const N = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'][rows.length];
  if ('decidedLead' in words) words.decidedLead = `${N} ${rows.length === 1 ? 'choice' : 'choices'} the team made for this page.`;
  return { words, switches, steps, tokens, decided: rows, fonts: design?.faces?.length ? design.faces : [] };
}

export function render(tpl, s, { run = '' } = {}) {
  let html = tpl.html;
  // Sections: cut each step block out, then put them back in the slot order at the first block's place.
  const blocks = {};
  html = html.replace(/<!--step:([\w-]+)-->([\s\S]*?)<!--\/step:\1-->/g, (_, name, body) => { blocks[name] = body; return `<!--@step:${name}-->`; });
  const first = Object.keys(blocks).find(n => s.steps.includes(n));
  html = html.replace(/<!--@step:([\w-]+)-->/g, (_, name) => name === first ? s.steps.map(n => blocks[n] || '').join('\n') : '');
  // Switches (nested blocks are fine: innermost first by repeating).
  for (let i = 0; i < 4; i++) {
    html = html.replace(/<!--if:([\w-]+)-->((?:(?!<!--if:)[\s\S])*?)<!--\/if:\1-->/g, (_, k, body) => s.switches[k] ? body : '');
    html = html.replace(/<!--unless:([\w-]+)-->((?:(?!<!--unless:)[\s\S])*?)<!--\/unless:\1-->/g, (_, k, body) => s.switches[k] ? '' : body);
  }
  const raw = {
    tokens: Object.entries(s.tokens).map(([k, v]) => `--${k}: ${v};`).join(' '),
    run: esc(run),
    // Kept in the markup, hidden, for the log-to-page checks: no seat tags, no list on screen.
    decidedRows: s.decided.map(r => `
        <li data-decided="${esc(r.id)}" data-cites="${esc(r.cites)}"${r.seat ? ` data-seat="${r.seat}"` : ''}>${esc(r.label)}</li>`).join(''),
    cancelNoteLi: '', cancelNoteP: '', // the cancel margin note is cut (team space, Sat): the templates' slots stay empty
  };
  html = html.replace(/\{\{\{raw\.(\w+)\}\}\}/g, (_, k) => raw[k] ?? '');
  // The dealt type's faces, local (copied into the page's fonts/ folder), declared just before the tokens.
  if (s.fonts?.length) html = html.replace('<style>:root { ', () => `<style>\n${fontFaceCss(s.fonts)}\n</style>\n<style>:root { `);
  html = html.replace(/\{\{words\.(\w+)\}\}/g, (_, k) => esc(s.words[k] ?? ''));
  return html;
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

// The prompt the fill call sees. Kept small: the slot keys with their current words, not the HTML.
export function fillPrompt({ tpl, idea, flow, answers, taste, decided }) {
  const system = [
    'You fill a prepared web page template for a small business. You never write HTML or code.',
    'Return one JSON object matching the schema: the page words in plain, short, concrete English (British spelling),',
    'the order of the steps, the on/off switches, optional colour tokens, and which decided items to show under "Decided for you".',
    'Follow her flow for the step order and her answers exactly: each answer is her choice, and where she overruled the team\'s',
    'recommendation (overruled: true) the page shows her choice, never the recommendation. Follow every line of her file: a switch her file rules out is off',
    '(e.g. "never ask for anything you could remember or skip" means no phone field and no cancel reason).',
    'Keep the business type of the template. No exclamation marks, no emoji, no invented reviews or figures.',
    'Each word value replaces the default of the same key and should be about as long as it.',
  ].join(' ');
  const user = JSON.stringify({
    idea,
    herFlow: flow,
    herAnswers: answers,
    herFile: taste.map(l => `[${l.id}] ${l.text}`),
    decidedForHer: decided.map(x => ({ id: x.id, decision: x.decision, choice: x.choice, cites: x.cites })),
    template: { name: tpl.name, steps: tpl.defaults.steps, switches: tpl.defaults.switches, tokens: tpl.defaults.tokens, words: tpl.defaults.words },
    task: 'Fill the template for her. decidedShown: up to 5 items that touch this page (include a pricing or payment one if any was decided), each { id, label } with label the decision in plain words as she would read it on the page.',
  }, null, 1);
  return { system, user };
}

// Gather what the fill needs from a run's log and files.
export function gatherRun(events, tasteMd) {
  const idea = events.find(e => e.type === 'run.start')?.idea || '';
  const lastFlow = [...events].reverse().find(e => e.type === 'flow.line');
  const flow = lastFlow ? { nodes: lastFlow.nodes, edges: lastFlow.edges } : { nodes: [], edges: [] };
  const asks = new Map(events.filter(e => e.type === 'ask').map(e => [e.id, e]));
  // Focus moments (lib/interpret.js): her answer is her words; what it settled comes as answer.mapped, one entry per
  // decision, each choice one of that decision's options. Older runs answered with { choice }.
  const mapped = events.filter(e => e.type === 'answer.mapped').flatMap(m => (m.decisions || [])
    .map(d => ({ decision: d.decision, choice: d.choice, recommendation: null, overruled: false, attachTo: asks.get(m.askId)?.attachTo || null, mapped: true })));
  const answers = events.filter(e => e.type === 'answer').map(a => {
    const q = asks.get(a.askId);
    if (a.text != null) return { decision: q?.question || q?.decision || a.askId, choice: a.text, recommendation: null, overruled: false, attachTo: q?.attachTo || null, herWords: true };
    const rec = q?.recommendation ?? null;
    return { decision: q?.decision || a.askId, choice: a.choice, recommendation: rec, overruled: rec != null && rec !== a.choice, attachTo: q?.attachTo || null };
  });
  const pins = events.filter(e => e.type === 'pin').map(p => ({ nodeId: p.nodeId, text: p.text }));
  const taste = parseTaste(tasteMd);
  const written = [...events].reverse().find(e => e.type === 'taste.written');
  const newestLine = written?.id || (taste.length ? taste[taste.length - 1].id : null);
  return { idea, flow, answers: [...answers, ...mapped, ...pins.map(p => ({ decision: 'her pinned note', choice: p.text, attachTo: p.nodeId }))], taste, newestLine };
}

// fillPage({ run, outDir, idea, flow, answers, taste, decided, newestLine, model?, call?, design? }) -> { url, ms, slots, template }
// `design` is Design's live deal (lib/design.js dealDesign): its palette, and its type when the faces are bundled.
// `call` is the model call (defaults to callModel); tests pass a fake.
export async function fillPage({ run, outDir, idea, flow, answers = [], taste = [], decided = [], newestLine = null, template, model, call = callModel, design = null, onStep = () => {} }) {
  const tpl = loadTemplate(template || pickTemplate(idea));
  const { system, user } = fillPrompt({ tpl, idea, flow, answers, taste, decided });
  onStep('Writing the page words from her flow, answers and file');
  const t0 = Date.now();
  const slots = await call({ system, user, schema: tpl.schema, model: model || FILL_MODEL, timeoutMs: 120000 });
  const modelMs = Date.now() - t0;
  const errs = validate(slots, tpl.schema);
  if (errs.length) throw new Error('slots: ' + errs.slice(0, 3).join('; '));
  onStep('Checking every citation against her file');
  const s = normaliseSlots(slots, tpl, { decided, answers, taste, newestLine, design });
  onStep('Writing the page');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), render(tpl, s, { run }));
  fs.writeFileSync(path.join(outDir, 'slots.json'), JSON.stringify({ inputs: { answers, newestLine }, model: slots, used: s }, null, 2));
  onStep('Copying the template’s fonts, photographs and kit');
  copyDir(KIT_DIR, path.join(outDir, 'assets'));
  const own = path.join(tpl.dir, 'files');
  if (fs.existsSync(own)) copyDir(own, outDir);
  if (s.fonts.length) copyFonts(s.fonts, outDir);
  return { template: tpl.name, slots: s, modelMs };
}
