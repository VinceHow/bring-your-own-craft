// The two Act 2 cards in her focus document, built here so a unit test can read their text (test/fd-cards.test.js):
// Wren's research card (Focus 1) and Mika's morning in words (Focus 2). Every part keeps its own element and hooks
// (docs/COMPONENTS.md), and a text separator sits between parts, so the words never run together when read as text
// ("7:05 Sam…", "…once a week. — Bakery Business").
(function (root) {
  'use strict';
  const B = (root.BYOC = root.BYOC || {});
  const make = doc => (tag, cls, text, slot) => {
    const e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (slot) e.dataset.slot = slot; return e;
  };
  // Research card: label · quote · (sketch's users) · source title · site and date read.
  function research(doc, f) {
    const h = make(doc);
    const card = h('article', 'finding ff', null, 'finding'); card.dataset.component = 'research-card';
    card.append(h('span', 'ff-prepared', f.label || 'researched before the demo', 'prepared'), doc.createTextNode(' '),
      h('blockquote', 'ff-claim', f.quote || f.claim || '', 'claim'), doc.createTextNode(' '));
    if (f.users && f.users.length) card.append(h('p', 'ff-about', `Design's first sketch: ${f.users.join(' · ')}`, 'about'), doc.createTextNode(' '));
    const a = h('a', 'ff-src', null, 'source'); a.href = f.url; a.target = '_blank'; a.rel = 'noopener';
    a.append(doc.createTextNode('— '), h('span', 'ff-src-title', f.title || f.url, 'source-title'), doc.createTextNode(' · '),
      h('span', 'ff-src-site', [f.site, f.fetched && `read ${f.fetched}`].filter(Boolean).join(' · '), 'source-site'));
    card.appendChild(a);
    return card;
  }
  // One step of Mika's morning: time, then the line (struck when rewritten), then the new line.
  function step(doc, st) {
    const h = make(doc);
    const li = h('li', 'jw-step', null, 'step'); li.dataset.step = st.step; li.dataset.state = st.new ? 'rewritten' : 'draft';
    if (st.time) li.append(h('span', 'jw-time', st.time, 'time'), doc.createTextNode(' '));
    const tx = h('span', 'jw-text', null, 'text'); const sx = doc.createElement(st.new ? 's' : 'span'); sx.textContent = st.text; tx.appendChild(sx);
    li.appendChild(tx);
    if (st.new) li.append(doc.createTextNode(' '), h('span', 'jw-new', st.new, 'new'));
    return li;
  }
  // Mika's rewrite on an existing step: struck, then its new line after a separator.
  function strike(doc, li, st) {
    const tx = li.querySelector('.jw-text'); tx.textContent = ''; const sx = doc.createElement('s'); sx.textContent = st.text; tx.appendChild(sx);
    li.dataset.state = 'struck';
  }
  function rewrite(doc, li, st) { li.append(doc.createTextNode(' '), make(doc)('span', 'jw-new', st.new, 'new')); li.dataset.state = 'rewritten'; }
  B.fdCards = { research, step, strike, rewrite };
})(typeof window !== 'undefined' ? window : globalThis);
