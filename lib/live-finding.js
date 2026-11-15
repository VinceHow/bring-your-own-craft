// Noor's Focus 1 finding, found live with Linkup (Vincent, Sun 15 Nov). Fired in the background the moment her idea is
// known (run.start on the stage path); it never holds anything up. A finding counts only when VERIFIED: a source URL,
// the site, the date read, and a quoted line that is an EXACT substring of the content Linkup returned for that URL.
// Verified -> `finding.live { askId: 'first', ref }` is logged, and the room swaps it onto Focus 1 if she hasn't opened
// it yet (and Focus 1 raised after it carries it from the start). Anything else -> `finding.none { why }`, and the
// prepared finding ("researched before the demo") stays. The key never leaves the server: LINKUP_API_KEY, or the network
// proxy in a cloud session (a placeholder is sent then). Nothing key-shaped is logged (scrub).
import { logEvent, readEvents } from './events.js';
import { scrub } from './model.js';

export const LINKUP_URL = 'https://api.linkup.so/v1/search';
export const LIVE_LABEL = 'found just now with Linkup';
const BAKERY = /\b(bakery|bakeries|bakers?|breads?|loaf|loaves|sourdough|pastry|pastries)\b/i;
const ABOUT = /\b(regular|regulars|weekly|every week|each week|once a week|daily|every day|loyal|return|repeat|customers?|shoppers?|visitors?|buy|buying)\b/i;
const today = () => new Date().toISOString().slice(0, 10);
const site = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

// Live research is on when this server can search: a Linkup key (as doctor checks it), or LIVE_FINDING=1 (e.g. a cloud
// proxy holds the key); LIVE_FINDING=0 turns it off. Only bakery ideas search (Focus 1 shows Noor's finding for those).
export const liveResearchOn = (idea = '') => process.env.LIVE_FINDING !== '0' && (!!process.env.LINKUP_API_KEY || process.env.LIVE_FINDING === '1') && BAKERY.test(String(idea || ''));

export function query(idea, users = []) {
  const who = users.length ? ` ${users.slice(0, 3).join(', ')}` : '';
  return `${String(idea || '').slice(0, 200)}: how often do regular customers buy, research or survey${who}`.trim();
}

// The best quotable sentence across Linkup's results: plain text (no markup or entities), 60-280 characters, about
// customers and how often they come, a number preferred. The quote is cut from the content itself, so it is exact.
export function pickQuote(results = []) {
  let best = null;
  for (const r of results) {
    const content = typeof r?.content === 'string' ? r.content : '';
    if (!r?.url || !/^https?:\/\//.test(r.url) || !content) continue;
    for (const s of content.split(/(?<=[.!?])\s+/)) {
      const q = s.trim();
      if (q.length < 60 || q.length > 280 || /[<>{}]|&[a-z#0-9]+;|https?:/i.test(q) || !ABOUT.test(q)) continue;
      const score = (/\d/.test(q) ? 3 : 0) + (/%|per ?cent|a third|half|quarter/i.test(q) ? 2 : 0) + (BAKERY.test(q) ? 2 : 0) + (/\bweek|daily|every\b/i.test(q) ? 1 : 0);
      if (!best || score > best.score) best = { score, quote: q, url: r.url, title: String(r.name || '').replace(/&[a-z#0-9]+;/gi, "'").slice(0, 140), content };
    }
  }
  return best;
}

// The verified-finding rule (as lib/first.js regularsFinding): quote, url and the date read; plus, live, the quote must
// be an exact substring of what Linkup returned for that source.
export function verified(f, content) {
  return !!(f && f.quote && f.url && f.fetched && typeof content === 'string' && content.includes(f.quote));
}

export async function searchFinding({ idea, users = [], fetchImpl = fetch, timeoutMs = 25000 }) {
  let res;
  try {
    res = await fetchImpl(LINKUP_URL, {
      method: 'POST', signal: AbortSignal.timeout(timeoutMs),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINKUP_API_KEY || 'placeholder'}` },
      body: JSON.stringify({ q: query(idea, users), depth: 'standard', outputType: 'searchResults' }),
    });
  } catch (e) { return { why: e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'timeout' : 'unreachable: ' + scrub(e?.message || e).slice(0, 120) }; }
  if (!res.ok) return { why: `linkup ${res.status}` };
  let data; try { data = await res.json(); } catch { return { why: 'not JSON' }; }
  const pick = pickQuote(data?.results || []);
  if (!pick) return { why: 'no quotable line about customers in the results' };
  const ref = { title: pick.title || site(pick.url), quote: pick.quote, url: pick.url, site: site(pick.url), fetched: today(),
    label: LIVE_LABEL, how_verified: 'Linkup search; the quote is an exact substring of the returned source content' };
  return verified(ref, pick.content) ? { ref } : { why: 'quote did not verify' };
}

// Background only: returns at once; logs finding.live or finding.none when the search settles.
export function startLiveFinding(run, { fetchImpl, timeoutMs } = {}) {
  const evs = readEvents(run);
  const start = evs.find(e => e.type === 'run.start');
  if (!start || !BAKERY.test(start.idea || '') || evs.some(e => e.type === 'finding.live' || e.type === 'finding.none')) return null;
  const users = evs.findLast(e => e.type === 'sketch.done' && Array.isArray(e.users))?.users || [];
  const p = searchFinding({ idea: start.idea, users, ...(fetchImpl ? { fetchImpl } : {}), ...(timeoutMs ? { timeoutMs } : {}) })
    .then(r => {
      if (r.ref) logEvent(run, 'finding.live', { askId: 'first', ref: r.ref });
      else { logEvent(run, 'finding.none', { why: r.why }); console.error(`live finding: the prepared one stays (${r.why})`); }
      return r;
    })
    .catch(e => { const why = scrub(e?.message || e).slice(0, 120); logEvent(run, 'finding.none', { why }); return { why }; });
  return p;
}
