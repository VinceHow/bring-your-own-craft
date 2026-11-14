// "Your own craft": her name tag, made with her. She says or types a few words; one fast call turns them into
// craft · good at · loves, in her words, every word editable; Enter keeps it. No form.
// Provides BYOC.nameTag.open() -> Promise<{ craft, goodAt, loves } | null>. On keep it sets BYOC.herSeat = 'diy',
// BYOC.herTag and BYOC.intro ("I love …", so her file's L1 is in her words). The beats session seats her.
// Known limit, said quietly: two page templates, so a DIY idea neither fits gets her sketch and check-ins, no page.
(function () {
  'use strict';
  const B = (window.BYOC = window.BYOC || {});
  const css = `
.name-tag { position: absolute; left: 560px; top: 300px; width: 480px; z-index: 30; padding: 18px 22px 16px; background: var(--sheet, #FBF9F4);
  border: 2px dashed var(--ink, #141414); border-radius: 6px; box-shadow: 5px 5px 0 var(--ink, #141414); transform: rotate(-0.6deg); }
.name-tag .tag-head { font: 600 12px var(--mono, monospace); letter-spacing: .12em; text-transform: uppercase; }
.name-tag .tag-ask { margin: 8px 0 10px; font: 500 15px/1.35 var(--ui, sans-serif); }
.name-tag .tag-input { width: 100%; font: 500 18px var(--ui, sans-serif); border: 0; border-bottom: 2px solid var(--ink, #141414);
  background: transparent; outline: 0; padding: 4px 0; }
.name-tag .tag-hint { margin-top: 8px; font: 400 11px var(--mono, monospace); color: rgba(20,20,20,.6); }
.name-tag .tag-card[hidden], .name-tag .tag-say[hidden] { display: none !important; }
.name-tag .tag-craft { display: block; font: 400 34px/1.1 var(--display, serif); margin: 6px 0 10px; }
.name-tag .tag-row { display: flex; gap: 8px; align-items: baseline; margin: 4px 0; font: 500 16px/1.3 var(--ui, sans-serif); }
.name-tag .tag-key { flex: 0 0 72px; font: 500 11px var(--mono, monospace); text-transform: uppercase; letter-spacing: .08em; }
.name-tag [contenteditable] { outline: 0; border-bottom: 1px dashed rgba(20,20,20,.4); min-width: 2ch; }
.name-tag [contenteditable]:empty::before { content: attr(data-placeholder); color: rgba(20,20,20,.38); }
.idea-note { position: absolute; left: 30px; right: 30px; bottom: 14px; z-index: 8; font: 400 12px var(--mono, monospace); color: rgba(20,20,20,.7); }
.idea-note[hidden] { display: none !important; }
`;
  const style = document.createElement('style'); style.dataset.byoc = 'name-tag'; style.textContent = css;
  document.head.appendChild(style);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
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
    const el = h('section', 'name-tag'); el.setAttribute('aria-label', 'Your name tag');
    const say = h('div', 'tag-say');
    const input = h('input', 'tag-input'); input.type = 'text'; input.spellcheck = false; input.dataset.voice = 'tag';
    input.placeholder = "I'm good at mixing dough, and I love the first batch out at 6am";
    say.append(h('div', 'tag-ask', 'Your own craft. In a few words: what do you do, and what do you love about it?'), input,
      h('div', 'tag-hint', 'Enter: the team makes your name tag · Esc: back'));
    const card = h('div', 'tag-card'); card.hidden = true;
    const craft = field('tag-craft', '', 'your craft');
    const good = field('tag-good', '', 'what you’re good at');
    const loves = field('tag-loves', '', 'what you love');
    const row = (k, f) => { const r = h('div', 'tag-row'); r.append(h('span', 'tag-key', k), f); return r; };
    const hint = h('div', 'tag-hint', 'Every word is yours to change · Enter: take the seat');
    card.append(craft, row('good at', good), row('loves', loves), hint);
    el.append(h('div', 'tag-head', 'Name tag'), say, card);
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
        const tag = { craft: craft.textContent.trim(), goodAt: good.textContent.trim(), loves: loves.textContent.trim() };
        if (!tag.craft) { craft.focus(); return; }
        keep(tag);
        return;
      }
      const text = input.value.trim();
      if (!text || busy) return;
      busy = true;
      input.disabled = true;
      say.querySelector('.tag-hint').textContent = 'The team is writing your tag';
      let r = null;
      try { r = await B.api('/api/name-tag', { text }, { step: false }); } catch (e) { r = null; }
      busy = false;
      if (!open || open.el !== el) return;
      craft.textContent = r?.craft || ''; good.textContent = r?.goodAt || ''; loves.textContent = r?.loves || '';
      if (!r || r.rough) hint.textContent = 'In your words, as you said them: write your craft · Enter: take the seat';
      say.hidden = true; card.hidden = false;
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
    if (!note || !note.isConnected) { note = h('div', 'idea-note'); sheet.appendChild(note); }
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
