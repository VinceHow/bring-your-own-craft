// Her name tag, made with her from a few words (her intro, or the "Your own craft" seat). One fast call turns them into
// { craft, goodAt, loves } in her words, every word editable. It reaches the team through her private profile
// (lib/profile.js). templateFor(): which of the two page templates her idea fits, if any.
import { callModel as realCallModel, scrub, logFail } from './model.js';
import { prompt } from './teammates.js';

export const TAG_MODEL = process.env.TAG_MODEL || 'haiku';
export const TAG_EFFORT = process.env.TAG_EFFORT || 'low';
export const TAG_LIMIT_MS = Number(process.env.TAG_LIMIT_MS || 25000); // a cold first call on a laptop, with margin (warm: ~3 s)
const strs = { type: 'array', items: { type: 'string' } };
// Flat on purpose: a nested object (the old `alternates`) cost the CLI extra turns and up to ~2x the time; flat
// arrays answered in ~2.2 s here against ~3.8 s. The reply's `alternates` object is still built by cleanTag.
export const TAG_SCHEMA = {
  type: 'object',
  properties: { craft: { type: 'string' }, title: { type: 'string' }, traits: strs, superpower: { type: 'string' },
    altTitles: strs, altTraits: strs, altSuperpowers: strs,
    goodAt: { type: 'string' }, loves: { type: 'string' } },
  required: ['craft', 'title', 'traits', 'superpower', 'goodAt', 'loves'],
};

const clip = (s, n) => String(s ?? '').trim().replace(/\s+/g, ' ').replace(/^["'“”]+|["'“”.]+$/g, '').slice(0, n).trim();
const list = (a, n, len) => [...new Set((Array.isArray(a) ? a : []).map(x => clip(x, len)).filter(Boolean))].slice(0, n);
const theTitle = t => (t && !/^the\b/i.test(t) ? 'the ' + t : t).replace(/^The\b/, 'the');
// Her character card: the team's playful read (title, two or three traits, maybe a superpower, each swappable from
// `alternates`), her craft, and her own words (goodAt, loves) for the private profile.
export function cleanTag(t) {
  const tag = { craft: clip(t?.craft, 40), goodAt: clip(t?.goodAt, 80).replace(/^(i'?m |i am )?good at\s+/i, ''),
    loves: clip(t?.loves, 80).replace(/^i (really )?love\s+/i, ''), title: theTitle(clip(t?.title, 50)),
    traits: list(t?.traits, 3, 30), superpower: clip(t?.superpower, 80) };
  if (tag.craft) tag.craft = tag.craft[0].toUpperCase() + tag.craft.slice(1);
  const alt = t?.alternates || { titles: t?.altTitles, traits: t?.altTraits, superpowers: t?.altSuperpowers };
  tag.alternates = { titles: list(alt.titles, 3, 50).map(theTitle).filter(x => x !== tag.title),
    traits: list(alt.traits, 5, 30).filter(x => !tag.traits.includes(x)), superpowers: list(alt.superpowers, 2, 80).filter(x => x !== tag.superpower) };
  return tag.craft ? tag : null;
}
// Her tag as one line, for prompts: `Baker (good at mixing dough; loves the first batch out at 6am)`.
export function tagText(tag) {
  if (!tag?.craft) return '';
  const bits = [tag.goodAt && `good at ${tag.goodAt}`, tag.loves && `loves ${tag.loves}`].filter(Boolean);
  return bits.length ? `${tag.craft} (${bits.join('; ')})` : tag.craft;
}
// The name her seat goes by in prompts: her craft in the DIY seat, else the seat.
export const seatLabel = (seat, tag) => (seat === 'diy' && tag?.craft ? tag.craft : seat);

// Without the model: her own words, split on "good at" / "love", the craft left for her to write.
export function roughTag(text) {
  const s = String(text || '');
  const good = s.match(/good at\s+([^,.;]+?)(?:,|\.|;|\s+and\s+i\b|$)/i)?.[1];
  const love = s.match(/\blove\s+([^,.;]+?)(?:,|\.|;|$)/i)?.[1];
  const craft = s.match(/\bi'?m an?\s+([a-z][a-z -]{1,30}?)(?:,|\.|;|\s+and\b|\s+who\b|$)/i)?.[1];
  return { craft: clip(craft, 40), goodAt: clip(good, 80), loves: clip(love, 80), title: '', traits: [], superpower: '', alternates: { titles: [], traits: [], superpowers: [] } };
}

// Her character card, split in two (Vincent's call, Sat night): the call she waits on does only what the card shows
// (title, traits, superpower: a tiny prompt and a flat schema, about 2 s), and everything else (craft, goodAt, loves,
// the swaps) comes from a second call in the background that nothing waits on.
export const CARD_SCHEMA = { type: 'object', properties: { title: { type: 'string' }, traits: strs, superpower: { type: 'string' } },
  required: ['title', 'traits', 'superpower'] };
export const MORE_SCHEMA = { type: 'object', properties: { craft: { type: 'string' }, goodAt: { type: 'string' }, loves: { type: 'string' },
  altTitles: strs, altTraits: strs, altSuperpowers: strs }, required: ['craft', 'goodAt', 'loves'] };
const herWords = (text, seat) => `Her words: "${text}"` + (seat && seat !== 'diy' ? `\nHer seat at the table: ${seat[0].toUpperCase() + seat.slice(1)}` : '');
async function raced(call, limitMs) {
  let t;
  try { return await Promise.race([call, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`over ${limitMs / 1000} s`)), limitMs); })]); }
  finally { clearTimeout(t); }
}
export async function tagCard(text, { callModel = realCallModel, limitMs = TAG_LIMIT_MS } = {}) {
  text = String(text || '').trim().slice(0, 400);
  if (!text) return { code: 400, body: { error: 'text required' } };
  const t0 = Date.now();
  try {
    const raw = await raced(callModel({ system: prompt('tag-card'), user: herWords(text), schema: CARD_SCHEMA, model: TAG_MODEL, effort: TAG_EFFORT, timeoutMs: limitMs, label: 'name tag' }), limitMs);
    const card = { title: theTitle(clip(raw?.title, 50)), traits: list(raw?.traits, 3, 30), superpower: clip(raw?.superpower, 80) };
    if (!card.title && !card.traits.length) throw new Error('an empty card');
    return { code: 200, body: { ...card, alternates: { titles: [], traits: [], superpowers: [] }, ms: Date.now() - t0 } };
  } catch (e) {
    logFail('name tag (rough card shown)', e.message);
    return { code: 200, body: { title: '', traits: [], superpower: '', ms: Date.now() - t0, rough: true, error: scrub(e.message).slice(0, 160) } };
  }
}
// The rest, in the background: her craft and her words for the private profile, and the swaps. On failure, her own
// words (roughTag) and no swaps; the team falls back to her raw sentence.
export async function tagMore(text, { card = null, seat = null, callModel = realCallModel, limitMs = TAG_LIMIT_MS } = {}) {
  text = String(text || '').trim().slice(0, 400);
  if (!text) return { code: 400, body: { error: 'text required' } };
  const t0 = Date.now();
  const cardLine = card ? [card.title, ...(card.traits || []), card.superpower].filter(Boolean).join(' · ') || '(not made yet)' : '(not made yet)';
  try {
    const raw = await raced(callModel({ system: prompt('tag-more', { CARD: cardLine }), user: herWords(text, seat), schema: MORE_SCHEMA, model: TAG_MODEL, effort: TAG_EFFORT, timeoutMs: limitMs, label: 'profile (background)' }), limitMs);
    const full = cleanTag({ ...raw, ...(seat && seat !== 'diy' ? { craft: seat } : {}), title: card?.title, traits: card?.traits, superpower: card?.superpower });
    if (!full) throw new Error('no craft in the reply');
    const { craft, goodAt, loves, alternates } = full;
    return { code: 200, body: { craft, goodAt, loves, alternates, ms: Date.now() - t0 } };
  } catch (e) {
    logFail('profile (background)', e.message);
    const r = roughTag(text);
    return { code: 200, body: { craft: r.craft, goodAt: r.goodAt, loves: r.loves, alternates: r.alternates, ms: Date.now() - t0, rough: true } };
  }
}

// seat: her seat at the table; in a listed seat (e.g. Product) her craft is that seat unless her words say otherwise.
export async function nameTag(text, { callModel = realCallModel, limitMs = TAG_LIMIT_MS, seat = null } = {}) {
  text = String(text || '').trim().slice(0, 400);
  if (!text) return { code: 400, body: { error: 'text required' } };
  const t0 = Date.now();
  let t;
  try {
    const raw = await Promise.race([
      callModel({ system: prompt('tag'), user: `Her words: "${text}"` + (seat && seat !== 'diy' ? `\nHer seat at the table: ${seat[0].toUpperCase() + seat.slice(1)}` : ''), schema: TAG_SCHEMA, model: TAG_MODEL, effort: TAG_EFFORT, timeoutMs: limitMs, label: 'name tag' }),
      new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`over ${limitMs / 1000} s`)), limitMs); }),
    ]);
    // In a listed seat her craft is the seat (Priya · Product); the model's words go to good at / loves.
    const tag = cleanTag(seat && seat !== 'diy' ? { ...raw, craft: seat } : raw);
    if (!tag) throw new Error('no craft in the reply');
    return { code: 200, body: { ...tag, ms: Date.now() - t0 } };
  } catch (e) {
    // Her words stay hers: a rough split she can edit, said plainly. The Terminal says why.
    logFail('name tag (rough card shown)', e.message);
    return { code: 200, body: { ...roughTag(text), ms: Date.now() - t0, rough: true, error: scrub(e.message).slice(0, 160) } };
  } finally { clearTimeout(t); }
}

// Which prepared page template her idea fits, if any (the build has two: yoga booking, café pre-order).
export function templateFor(idea) {
  const s = String(idea || '');
  if (/caf[eé]|pastr|bak(e|er|ery|ing)|croissant|coffee|bread|pre-?order/i.test(s)) return 'cafe';
  if (/\b(book|booking|class(es)?|sessions?|lessons?|appointments?|studio|yoga|pilates|gym|fitness|workshops?)\b/i.test(s)) return 'yoga';
  return null;
}
