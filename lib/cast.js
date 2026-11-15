// Any seat is hers (design/studio/SEATS.md). The five teammates keep their names, faces and home seat ids; each wears
// whichever role the table needs. Product, Design, Research and Engineering are always at the table; the flex seat is
// Data or Strategy by default, or a role written for the idea. The teammate whose craft she takes moves to Product; if
// she takes a flex seat (Data, Strategy) or her own craft, Ines moves to Product.
// The Product path is untouched: no cast, no new fields, identity roles (castOf returns null, roleFor returns the seat).
import { callModel as realCallModel, scrub } from './model.js';
import { readEvents } from './events.js';

export const CRAFTS = ['product', 'design', 'research', 'engineering', 'data', 'strategy'];
export const TEAM = ['design', 'data', 'research', 'strategy', 'engineering']; // home seat ids, stable
export const AGENTS = { design: 'Mika', research: 'Noor', data: 'Theo', strategy: 'Ines', engineering: 'Bo' };
export const FLEX_MODEL = process.env.FLEX_MODEL || 'haiku';
export const FLEX_LIMIT_MS = Number(process.env.FLEX_LIMIT_MS || 4000);

// The table: home seat -> role worn, for what she takes. 'flex' = the generated role (default below).
export function rolesFor(craft) {
  const r = { design: 'design', data: 'data', research: 'research', strategy: 'strategy', engineering: 'engineering' };
  if (craft === 'design' || craft === 'research' || craft === 'engineering') r[craft] = 'product';
  else if (craft === 'data') { r.data = 'flex'; r.strategy = 'product'; }
  else if (craft === 'strategy') r.strategy = 'product';
  else if (craft === 'diy') { r.data = 'flex'; r.strategy = 'product'; }
  return r;
}
// The flex seat's role before its card is written, as /api/cast shows the table at once (Strategy if she is Data).
// No fallback (SEATS.md): if the card isn't written, that teammate is away, the run goes on with four, nothing pretends.
export const flexDefault = craft => (craft === 'data' ? 'strategy' : 'data');
export const needsFlex = craft => craft === 'data' || craft === 'diy';

const clip = (s, n) => String(s ?? '').replace(/[<>{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const TAKEN = /^(product|design|research|engineering|data|strategy)$/i;
// A generated flex role, made safe: a short role name that isn't one of the fixed crafts, a focus, a stance, a loves
// line. "Brings" is code's: the flex teammate's prompt lists the decisions in its focus, so that's what it brings.
export function cleanFlex(raw) {
  const name = clip(raw?.name, 24).replace(/[.!]+$/, '');
  const focus = clip(raw?.focus, 70).replace(/[.!]+$/, '');
  if (!name || !focus || TAKEN.test(name) || name.split(' ').length > 3) return null;
  return { name: name[0].toUpperCase() + name.slice(1), focus, stance: clip(raw?.stance, 50).replace(/[.!]+$/, '') || focus,
    loves: clip(raw?.loves, 90), brings: `${/^(the|a|an)\s/i.test(focus) ? '' : 'the '}${focus} calls for this page` };
}

const FLEX_SCHEMA = { type: 'object', properties: { name: { type: 'string' }, focus: { type: 'string' }, stance: { type: 'string' },
  loves: { type: 'string' } }, required: ['name', 'focus', 'stance', 'loves'] };
function flexPrompt(craft, { tag, idea }) {
  const her = craft === 'diy' ? `her own craft${tag?.craft ? `: ${tag.craft}` : ''}${tag?.goodAt ? ` (good at ${tag.goodAt})` : ''}` : `the ${craft} seat`;
  return `A small product team is forming around her. She takes ${her}. Product, Design, Research and Engineering are covered.
One teammate, Theo (careful, keeps track of things), takes the last seat: write the role that would help most here.
${idea ? `The idea: ${idea}` : 'The idea is not said yet: pick a role most small products like hers need.'}
Reply with JSON only: name (the role, one or two words, e.g. "Operations", never Product, Design, Research, Engineering,
Data or Strategy), focus (what decisions this role makes, under 8 words, plain), stance (under 6 words), loves (one short
spoken sentence, under 10 words, what this role loves).`;
}

// The flex teammate's card, written for her (one fast call, with a time limit). Resolves to { role: 'flex', flex, ms }
// or { role: null, failed: reason, ms } (that teammate stays away); never throws.
export async function writeFlex(craft, { tag = null, idea = '', callModel = realCallModel, limitMs = FLEX_LIMIT_MS } = {}) {
  const t0 = Date.now();
  if (!needsFlex(craft)) return { role: null, ms: 0 };
  let timer;
  try {
    const raw = await Promise.race([
      callModel({ system: flexPrompt(craft, { tag, idea }), user: 'Write the role.', schema: FLEX_SCHEMA, model: FLEX_MODEL, effort: 'low', timeoutMs: limitMs + 2000 }),
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`over ${limitMs} ms`)), limitMs); }),
    ]);
    const flex = cleanFlex(raw);
    if (!flex) return { role: null, failed: 'unusable role', ms: Date.now() - t0 };
    return { role: 'flex', flex, ms: Date.now() - t0 };
  } catch (e) {
    return { role: null, failed: scrub(e.message).slice(0, 120), ms: Date.now() - t0 };
  } finally { clearTimeout(timer); }
}

// The cast logged on run.start (only when she didn't take Product): { craft, roles, flex? }. `flex` is the card the
// client got from writeFlex (re-cleaned here). Without one, the flex seat is away until seat.arrived (arrival below).
export function makeCast(craft, flexIn) {
  if (!CRAFTS.includes(craft) && craft !== 'diy') return null;
  if (craft === 'product') return null;
  const roles = rolesFor(craft);
  let flex = null;
  if (needsFlex(craft)) {
    flex = flexIn && typeof flexIn === 'object' ? cleanFlex(flexIn) : null;
  }
  return { craft, roles, ...(flex ? { flex } : {}) };
}

// ---- per run ----
// The cast as it stands now: run.start's, with the flex card from seat.arrived once that teammate has come in.
export function castOf(run, evs) {
  if (!run && !evs) return null;
  try {
    const all = evs || readEvents(run);
    const cast = all.find(e => e.type === 'run.start')?.cast || null;
    if (!cast || cast.flex) return cast;
    const came = all.find(e => e.type === 'seat.arrived' && e.flex);
    return came ? { ...cast, flex: came.flex } : cast;
  } catch { return null; }
}
export const flexSeatOf = cast => TEAM.find(s => cast?.roles?.[s] === 'flex') || null;
// Teammates not at the table yet: the flex seat until its card lands. Everything that picks seats leaves them out,
// and never waits on them; once arrived, a teammate joins from the next round on (no backfill).
export const awaySeats = cast => (cast && !cast.flex && flexSeatOf(cast) ? [flexSeatOf(cast)] : []);
// The flex teammate comes in (POST /api/run/:id/arrive): its card, cleaned, or null when there's nothing to arrive.
export function arrival(cast, flexIn) {
  const seat = flexSeatOf(cast);
  if (!seat || cast.flex) return null;
  const flex = flexIn && typeof flexIn === 'object' ? cleanFlex(flexIn) : null;
  return flex ? { seat, flex } : null;
}
// The role a seat wears this run. Her own seat ('product' id) wears her craft; a teammate's seat wears the table's role.
export function roleFor(seat, cast) {
  if (!cast) return seat;
  if (seat === 'product') return cast.craft === 'diy' ? 'product' : cast.craft;
  return cast.roles?.[seat] || seat;
}
const LABEL = { product: 'Product', design: 'Design', data: 'Data', research: 'Research', strategy: 'Strategy', engineering: 'Engineering' };
export function roleLabel(seat, cast) {
  const r = roleFor(seat, cast);
  return r === 'flex' ? cast.flex?.name || 'Flex' : LABEL[r] || r;
}
// Her craft, as the prompts name it: 'product' on the Product path (unchanged), else what she took.
export const herCraftOf = (cast, herSeat = 'product') => (cast ? cast.craft : herSeat);
