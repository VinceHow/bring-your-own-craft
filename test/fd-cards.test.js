// Her focus document's Act 2 cards read as text with separators between their parts (design QA: "7:05Sam",
// "weekBakery Business"). A minimal DOM, no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Just enough DOM: elements with className, dataset, children, textContent; text nodes.
class Text { constructor(t) { this.nodeValue = String(t); } get textContent() { return this.nodeValue; } }
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.className = ''; this.dataset = {}; this.children = []; }
  append(...ns) { for (const n of ns) this.children.push(typeof n === 'string' ? new Text(n) : n); }
  appendChild(n) { this.append(n); return n; }
  set textContent(t) { this.children = t ? [new Text(t)] : []; }
  get textContent() { return this.children.map(c => c.textContent).join(''); }
  querySelector(sel) { const cls = sel.replace(/^\./, ''); for (const c of this.children) { if (c instanceof El) { if (c.className.split(' ').includes(cls)) return c; const d = c.querySelector(sel); if (d) return d; } } return null; }
}
const doc = { createElement: t => new El(t), createTextNode: t => new Text(t) };
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../public/fd-cards.js', import.meta.url), 'utf8'), ctx);
const cards = ctx.window.BYOC.fdCards;

test('Mika\'s morning: a separator between the time and the line, and before the rewrite', () => {
  const li = cards.step(doc, { step: 1, time: '7:05', text: 'Sam leaves for work' });
  assert.equal(li.textContent, '7:05 Sam leaves for work');
  assert.equal(li.dataset.state, 'draft');
  const re = cards.step(doc, { step: 2, time: '7:10', text: 'Sam reserves the usual', new: 'Sam does nothing: it is held' });
  assert.equal(re.textContent, '7:10 Sam reserves the usual Sam does nothing: it is held');
  const live = cards.step(doc, { step: 3, text: 'Sam picks it up' });
  cards.strike(doc, live, { text: 'Sam picks it up' }); cards.rewrite(doc, live, { new: 'Sam picks it up, still warm' });
  assert.equal(live.textContent, 'Sam picks it up Sam picks it up, still warm');
  assert.equal(live.dataset.state, 'rewritten');
});

test('the research card: separators between the label, the quote and the source; the title and the site', () => {
  const card = cards.research(doc, { label: 'researched before the demo', quote: 'A third buy bread there at least once a week',
    title: 'New artisan bakery report', site: 'Bakery Business', fetched: '2026-11-14', url: 'https://example.org' });
  assert.equal(card.textContent, 'researched before the demo A third buy bread there at least once a week — New artisan bakery report · Bakery Business · read 2026-11-14');
  assert.doesNotMatch(card.textContent, /weekBakery|week—|reportBakery/);
  assert.equal(card.dataset.component, 'research-card');
  assert.equal(card.querySelector('.ff-src-site').dataset.slot, 'source-site', 'hooks unchanged');
});
