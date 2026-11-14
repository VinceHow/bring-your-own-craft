// "Your own craft": her character card, made with her. She says or types a few words; one fast call gives the team's
// own fun read of them (a playful title, two or three traits, maybe a superpower; a click swaps any piece) and her
// craft (editable); Enter keeps it. No form.
// Provides BYOC.nameTag.open() -> Promise<{ craft, title, traits, superpower, goodAt, loves } | null>. On keep it sets BYOC.herSeat = 'diy',
// BYOC.herTag and BYOC.intro ("I love …", so her file's L1 is in her words). The beats session seats her.
// Known limit, said quietly: two page templates, so a DIY idea neither fits gets her sketch and check-ins, no page.
(function () {
  'use strict';
  const B = (window.BYOC = window.BYOC || {});
  // Structure only (looks come from the design studio via data-component / data-state / data-slot, docs/COMPONENTS.md).
  const css = `
.name-tag { position: absolute; left: 560px; top: 300px; width: 480px; z-index: 30; padding: 16px; background: Canvas; border: 1px dashed currentColor; }
.name-tag:focus { outline: 0; }
.name-tag .tag-input { width: 100%; }
.name-tag .tag-card[hidden], .name-tag .tag-say[hidden] { display: none !important; }
.name-tag .tag-title { display: block; cursor: pointer; }
.name-tag .tag-traits { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.name-tag .tag-trait { padding: 2px 6px; border: 1px solid currentColor; cursor: pointer; }
.name-tag .tag-power { cursor: pointer; }
.name-tag .tag-power:empty { display: none; }
.name-tag [contenteditable]:empty::before { content: attr(data-placeholder); opacity: .5; }
.idea-note { position: absolute; left: 30px; right: 30px; bottom: 14px; z-index: 8; }
.idea-note[hidden] { display: none !important; }
`;
  const style = document.createElement('style'); style.dataset.byoc = 'name-tag'; style.textContent = css;
  document.head.appendChild(style);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const slot = (e, name) => { e.dataset.slot = name; return e; };
  const field = (cls, text, placeholder) => { const e = h('span', cls, text || ''); e.contentEditable = 'true'; e.spellcheck = false; e.dataset.placeholder = placeholder; return e; };

  let open = null; // { el, resolve }
  function close(value) {
    if (!open) return;
    const { el, resolve } = open; open = null;
    el.remove();
    resolve(value);
  }
  function keep(tag) {
    B.herSeat = 'diy';
    B.herTag = tag;
    B.intro = tag.loves ? 'I love ' + tag.loves : null;
    if (typeof B.status === 'function') B.status(`your own craft: ${tag.craft}`);
    close(tag);
  }
  function openTag() {
    if (open) return open.promise;
    const room = B.el && B.el.room; if (!room) return Promise.resolve(null);
    const el = h('section', 'name-tag'); el.setAttribute('aria-label', 'Your character card'); el.tabIndex = -1;
    el.dataset.component = 'name-tag'; el.dataset.state = 'asking';
    const say = h('div', 'tag-say');
    const input = slot(h('input', 'tag-input'), 'input'); input.type = 'text'; input.spellcheck = false; input.dataset.voice = 'tag';
    input.placeholder = "I'm good at mixing dough, and I love the first batch out at 6am";
    say.append(slot(h('div', 'tag-ask', 'Your own craft. In a few words: what do you do, and what do you love about it?'), 'ask'), input,
      slot(h('div', 'tag-hint', 'Enter: the team makes your name tag · Esc: back'), 'hint'));
    const card = h('div', 'tag-card'); card.hidden = true;
    const title = slot(h('span', 'tag-title'), 'title'); title.title = 'Swap the title';
    const craft = slot(field('tag-craft', '', 'your craft'), 'craft');
    const craftLine = h('div', 'tag-craftline'); craftLine.append(craft);
    const traits = slot(h('div', 'tag-traits'), 'traits');
    const power = slot(h('div', 'tag-power'), 'power'); power.title = 'Swap the superpower';
    const hint = slot(h('div', 'tag-hint'), 'hint'); hint.textContent = ('The team’s read of you · click any piece to swap it · Enter: take the seat');
    card.append(craftLine, title, traits, power, hint);
    let cur = null; // the card as it stands, with its pools of swaps
    // A click swaps a piece for the next one in its pool; the one it replaces goes back in the pool.
    // Focus stays on her card, so Enter keeps it whatever she clicked last.
    const swap = (pool, value) => { const next = cur.alternates[pool].shift(); if (next) cur.alternates[pool].push(value); el.focus(); return next || value; };
    title.addEventListener('click', () => { cur.title = swap('titles', cur.title); title.textContent = cur.title; });
    power.addEventListener('click', () => { cur.superpower = swap('superpowers', cur.superpower); power.textContent = cur.superpower; });
    function drawTraits() {
      traits.innerHTML = '';
      cur.traits.forEach((t, i) => { const b = slot(h('span', 'tag-trait', t), 'trait'); b.title = 'Swap this trait';
        b.addEventListener('click', () => { cur.traits[i] = swap('traits', cur.traits[i]); drawTraits(); }); traits.appendChild(b); });
    }
    el.append(slot(h('div', 'tag-head', 'Name tag'), 'head'), say, card);
    room.appendChild(el);
    let resolve; const promise = new Promise(r => { resolve = r; });
    open = { el, resolve, promise };
    setTimeout(() => input.focus(), 30);

    let busy = false;
    el.addEventListener('keydown', async ev => {
      ev.stopPropagation(); // keep the room's beat keys away while she types
      if (ev.key === 'Escape') { ev.preventDefault(); close(null); return; }
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      if (!card.hidden) { // keep it
        const { alternates, ...rest } = cur;
        const tag = { ...rest, craft: craft.textContent.trim() };
        if (!tag.craft) { craft.focus(); return; }
        keep(tag);
        return;
      }
      const text = input.value.trim();
      if (!text || busy) return;
      busy = true;
      input.disabled = true;
      say.querySelector('.tag-hint').textContent = 'The team is writing your tag';
      el.dataset.state = 'thinking';
      let r = null;
      try { r = await B.api('/api/name-tag', { text }, { step: false }); } catch (e) { r = null; }
      busy = false;
      if (!open || open.el !== el) return;
      cur = { craft: r?.craft || '', title: r?.title || '', traits: r?.traits || [], superpower: r?.superpower || '', goodAt: r?.goodAt || '', loves: r?.loves || '',
        alternates: { titles: [], traits: [], superpowers: [], ...(r?.alternates || {}) } };
      craft.textContent = cur.craft; title.textContent = cur.title; power.textContent = cur.superpower; drawTraits();
      if (!r || r.rough) hint.textContent = 'The team couldn’t make your card just now: write your craft · Enter: take the seat';
      say.hidden = true; card.hidden = false; el.dataset.state = 'ready';
      (craft.textContent ? card : craft).focus();
      if (!craft.textContent) craft.focus();
      el.dataset.ms = r?.ms ?? '';
    });
    return promise;
  }

  // ---- known limit: a DIY idea no page template fits gets no build, said quietly on her sheet ----
  function noTemplate() {
    const start = typeof B.events === 'function' ? B.events().find(e => e.type === 'run.start') : null;
    return !!(start && start.seat === 'diy' && start.template === null);
  }
  let note = null;
  function showNote() {
    const sheet = document.getElementById('her-sheet'); if (!sheet) return;
    if (!note || !note.isConnected) { note = h('div', 'idea-note'); note.dataset.component = 'no-page-note'; sheet.appendChild(note); }
    note.textContent = 'No page today: the build has two templates (class bookings, café pre-orders). Your shape, the screens and the team’s calls stay here.';
    note.hidden = false;
  }
  function wrapBuild() {
    if (typeof B.build !== 'function' || B.build._craft) return;
    const build = B.build;
    B.build = function () { if (noTemplate()) { showNote(); return Promise.resolve(null); } return build.apply(this, arguments); };
    B.build._craft = true;
  }
  wrapBuild();
  if (typeof B.on === 'function') {
    B.on('stage', ev => { wrapBuild(); if (ev.beat >= 8 && noTemplate()) showNote(); });
    B.on('reset', () => { close(null); B.herSeat = null; B.herTag = null; if (note) note.hidden = true; });
  }
  B.nameTag = { open: openTag, noTemplate, isOpen: () => !!open };
})();
