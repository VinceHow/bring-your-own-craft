// Her name tag, made with her from a few words (her intro, or the "Your own craft" seat). One fast call turns them into
// { craft, goodAt, loves } in her words, every word editable. It reaches the team through her private profile
// (lib/profile.js). templateFor(): which of the two page templates her idea fits, if any.
import { callModel as realCallModel, scrub } from './model.js';
import { prompt } from './teammates.js';

export const TAG_MODEL = process.env.TAG_MODEL || 'haiku';
export const TAG_EFFORT = process.env.TAG_EFFORT || 'low';
export const TAG_LIMIT_MS = Number(process.env.TAG_LIMIT_MS || 10000);
export const TAG_SCHEMA = {
  type: 'object',
  properties: { craft: { type: 'string' }, goodAt: { type: 'string' }, loves: { type: 'string' } },
  required: ['craft', 'goodAt', 'loves'],
};

const clip = (s, n) => String(s ?? '').trim().replace(/\s+/g, ' ').replace(/^["'“”]+|["'“”.]+$/g, '').slice(0, n).trim();
export function cleanTag(t) {
  const tag = { craft: clip(t?.craft, 40), goodAt: clip(t?.goodAt, 80).replace(/^(i'?m |i am )?good at\s+/i, ''),
    loves: clip(t?.loves, 80).replace(/^i (really )?love\s+/i, '') };
  if (tag.craft) tag.craft = tag.craft[0].toUpperCase() + tag.craft.slice(1);
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
  return { craft: clip(craft, 40), goodAt: clip(good, 80), loves: clip(love, 80) };
}

export async function nameTag(text, { callModel = realCallModel, limitMs = TAG_LIMIT_MS } = {}) {
  text = String(text || '').trim().slice(0, 400);
  if (!text) return { code: 400, body: { error: 'text required' } };
  const t0 = Date.now();
  let t;
  try {
    const raw = await Promise.race([
      callModel({ system: prompt('tag'), user: `Her words: "${text}"`, schema: TAG_SCHEMA, model: TAG_MODEL, effort: TAG_EFFORT, timeoutMs: limitMs }),
      new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`over ${limitMs / 1000} s`)), limitMs); }),
    ]);
    const tag = cleanTag(raw);
    if (!tag) throw new Error('no craft in the reply');
    return { code: 200, body: { ...tag, ms: Date.now() - t0 } };
  } catch (e) {
    // Her words stay hers: a rough split she can edit, said plainly.
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
