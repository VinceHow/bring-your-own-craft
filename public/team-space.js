// The team space (DEMO.md "The team space"; CONTRACT.md "Team space seams"): in the middle of the table, one card per
// real agreement the team talked out (`joint.agreed`). Headline only, the ink marks of who talked it out, "with your
// takeaways in mind" only when true. Tap a card: the real exchange behind it, inline (never a pop-up). Each card
// carries a quiet label, "Talk this through: coming" (a label, not a button). Sketchpads keep individual calls.
// A pure function of the run's log (BYOC.events()); polish.css styles it (class names below are the agreed seam):
//   .team-space > .ts-title + ol.ts-cards > li.ts-card[data-joint][aria-expanded]
//     > .ts-marks > .ts-mark[data-seat] · .ts-headline · .ts-takeaways? · .ts-label · ol.ts-exchange > li.ts-turn[data-seat] > .ts-by + .ts-text
(function () {
  'use strict';
  const B = (window.BYOC = window.BYOC || {});
  const NAME = { design: 'Mika', research: 'Noor', data: 'Theo', strategy: 'Ines', engineering: 'Bo', product: 'Product' };
  const SEAT = { design: 'Design', research: 'Research', data: 'Data', strategy: 'Strategy', engineering: 'Engineering', product: 'Product' };
  // Structure and a sane default place only; the look is polish.css's.
  const css = `
.team-space { position: absolute; left: 430px; right: 80px; bottom: 112px; z-index: 8; pointer-events: none;
  display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.team-space[hidden] { display: none !important; }
.team-space .ts-notes { pointer-events: auto; cursor: pointer; font: 600 12px var(--mono, monospace); padding: 2px 8px; border: 1.5px solid var(--ink, #141414); border-radius: 3px; background: var(--sheet, #FBF9F4); color: var(--ink, #141414); }
html body #room .team-space[data-notes="closed"] :is(.ts-title, .ts-cards) { display: none; } /* folded into "Team notes · N" */
.team-space .ts-title { font: 600 11px var(--mono, monospace); letter-spacing: .08em; text-transform: uppercase; color: var(--ink, #141414);
  background: var(--table, #E7E1D5); padding: 1px 6px; }
.team-space .ts-cards { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; }
.team-space .ts-card { pointer-events: auto; cursor: pointer; width: 330px; padding: 9px 12px 8px; background: var(--sheet, #FBF9F4);
  border: 2px solid var(--ink, #141414); border-radius: 4px; box-shadow: 3px 3px 0 var(--ink, #141414); color: var(--ink, #141414);
  font: 500 14px/1.3 var(--ui, sans-serif); }
.team-space .ts-card:focus-visible { outline: 2px solid var(--ink, #141414); outline-offset: 3px; }
.team-space .ts-marks { display: flex; gap: 4px; margin-bottom: 5px; }
.team-space .ts-mark { font: 600 10px var(--mono, monospace); letter-spacing: .06em; text-transform: uppercase; padding: 1px 5px;
  border: 1.5px solid var(--ink, #141414); border-radius: 2px; background: var(--mark-ink, #141414); color: #fff; }
.team-space .ts-mark[data-seat="engineering"] { color: var(--ink, #141414); }
.team-space .ts-headline { display: block; font-weight: 600; }
.team-space .ts-takeaways { display: block; margin-top: 3px; font: italic 500 12px var(--ui, sans-serif); }
.team-space .ts-label { display: block; margin-top: 5px; font: 500 11px var(--mono, monospace); opacity: .6; }
.team-space .ts-exchange { list-style: none; margin: 8px 0 2px; padding: 6px 0 0; border-top: 1.5px dashed var(--ink, #141414); }
.team-space .ts-card:not([aria-expanded="true"]) .ts-exchange { display: none; }
.team-space .ts-turn { margin: 0 0 3px; font-size: 13px; }
.team-space .ts-by { font-weight: 700; }
body[data-beat="9"] .team-space, body[data-beat="10"] .team-space, body[data-beat="11"] .team-space { display: none; }
`;
  const INK = { product: '#FF48B0', design: '#0078BF', data: '#00A95C', research: '#FF6C2F', strategy: '#BB8B41', engineering: '#FFE800' };
  const style = document.createElement('style'); style.dataset.byoc = 'team-space'; style.textContent = css;
  document.head.appendChild(style);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const slot = (e, name) => { e.dataset.slot = name; return e; }; // docs/COMPONENTS.md hooks for looks

  let box = null, list = null;
  function mount() {
    if (box && box.isConnected) return box;
    const room = document.getElementById('room');
    if (!room) return null;
    box = h('section', 'team-space'); box.setAttribute('aria-label', 'Team space'); box.hidden = true;
    box.dataset.component = 'team-space'; box.dataset.state = 'empty';
    // "Team notes · N" (Vincent's screenshot, 15 Nov): a look can fold the cards into this small tab; the tab opens and
    // closes them. data-component="team-notes" data-state closed | open (mirrored on the space as data-notes).
    const notes = slot(h('button', 'ts-notes', 'Team notes'), 'notes'); notes.type = 'button';
    notes.dataset.component = 'team-notes'; notes.dataset.state = 'closed'; notes.setAttribute('aria-expanded', 'false');
    box.dataset.notes = 'closed';
    notes.addEventListener('click', () => setNotes(notes.dataset.state !== 'open'));
    box.append(notes, slot(h('div', 'ts-title', 'Team space'), 'title'));
    list = slot(h('ol', 'ts-cards'), 'cards');
    box.appendChild(list);
    list.addEventListener('click', e => { const c = e.target.closest('.ts-card'); if (c) toggle(c); });
    list.addEventListener('keydown', e => {
      const c = e.target.closest('.ts-card');
      if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); toggle(c); }
    });
    room.appendChild(box);
    return box;
  }
  function setNotes(open) {
    const n = box && box.querySelector('[data-component="team-notes"]'); if (!n) return;
    n.dataset.state = open ? 'open' : 'closed'; n.setAttribute('aria-expanded', String(open)); box.dataset.notes = n.dataset.state;
  }
  function toggle(card) {
    const open = card.getAttribute('aria-expanded') !== 'true';
    for (const c of list.querySelectorAll('.ts-card[aria-expanded="true"]')) c.setAttribute('aria-expanded', 'false');
    card.setAttribute('aria-expanded', String(open));
    for (const c of list.querySelectorAll('.ts-card')) c.dataset.state = c.getAttribute('aria-expanded') === 'true' ? 'open' : 'closed';
  }
  function card(a) {
    const li = h('li', 'ts-card'); li.dataset.joint = a.id; li.tabIndex = 0; li.setAttribute('role', 'button');
    li.setAttribute('aria-expanded', 'false'); li.dataset.component = 'decision-card'; li.dataset.state = 'closed';
    const marks = slot(h('span', 'ts-marks'), 'marks');
    for (const s of a.seats || []) {
      const m = slot(h('span', 'ts-mark', NAME[s] || s), 'mark'); m.dataset.seat = s; m.title = `${NAME[s] || s} · ${SEAT[s] || s}`;
      m.style.setProperty('--mark-ink', `var(--${s}, ${INK[s] || '#141414'})`);
      marks.appendChild(m);
    }
    li.append(marks, slot(h('span', 'ts-headline', a.headline), 'headline'));
    if (a.withTakeaways === true) li.appendChild(slot(h('span', 'ts-takeaways', 'with your takeaways in mind'), 'takeaways-note'));
    if (a.first) { li.dataset.kind = 'first'; li.dataset.seat = (a.seats || [])[0] || ''; }
    else if (a.unblock) { li.dataset.kind = 'unblock'; li.dataset.seat = a.seat || ''; if (a.yours) { li.dataset.her = ''; li.appendChild(slot(h('span', 'ts-yours', 'your call'), 'yours')); } }
    else li.appendChild(slot(h('span', 'ts-label', 'Talk this through: coming'), 'label'));
    const ex = slot(h('ol', 'ts-exchange'), 'exchange');
    for (const t of a.turns || []) {
      const row = slot(h('li', 'ts-turn'), 'turn'); row.dataset.seat = t.seat || '';
      row.append(slot(h('span', 'ts-by', `${t.by}: `), 'by'), slot(h('span', 'ts-text', t.text), 'text'));
      ex.appendChild(row);
    }
    li.appendChild(ex);
    return li;
  }
  // All cards, from the log, in the order they were agreed.
  function render() {
    if (!mount()) return;
    const evs = typeof B.events === 'function' ? B.events() : [];
    // A card her takeaways revisited at Build (`joint.revised`) shows the new agreement, with her takeaways in mind.
    const revised = new Map(evs.filter(e => e.type === 'joint.revised').map(e => [e.id, e]));
    let agreed = [...new Map(evs.filter(e => e.type === 'joint.agreed' && e.headline).map(e => [e.id, e])).values()]
      .map(a => (revised.has(a.id) ? { ...a, headline: revised.get(a.id).headline || a.headline, withTakeaways: true, revised: true } : a));
    // A quick unblock she answered (or the team decided, once the hidden ceiling was reached) lands here too, owned by its seat.
    // Her first decision's run of decisions (lib/first.js, DEMO 0:38): each its own card, owned by its teammate.
    for (const d of new Map(evs.filter(e => e.type === 'decided' && e.round === 'first' && e.choice).map(e => [e.id, e])).values())
      agreed.push({ id: 'fd-' + d.id, seats: [d.seat], headline: d.choice, first: true });
    for (const d of new Map(evs.filter(e => e.type === 'decided' && e.unblock && e.choice).map(e => [e.id, e])).values())
      { const yours = /^her /.test(d.cites || '');
        agreed.push({ id: 'ub-' + d.id, seat: d.seat, seats: yours ? ['product', d.seat] : [d.seat], unblock: true, yours,
          headline: d.headline || `${String(d.decision || '').replace(/[.?]+$/, '')}: ${d.choice}` }); }
    for (const c of [...list.children]) {
      const a = agreed.find(x => x.id === c.dataset.joint);
      if (!a || (a.revised && c.dataset.revised !== '1')) c.remove();
    }
    const have = new Set([...list.children].map(c => c.dataset.joint));
    let flying = 0;
    const wasEmpty = !list.children.length;
    for (const a of agreed) {
      if (have.has(a.id)) continue;
      const li = card(a);
      if (a.revised) li.dataset.revised = '1';
      const next = [...list.children].find(c => agreed.findIndex(x => x.id === c.dataset.joint) > agreed.indexOf(a));
      list.insertBefore(li, next || null);
      if (a.first) { settle(li, a, flying++); continue; }
      if (typeof li.animate === 'function' && !B.replay) li.animate([{ transform: 'translateY(14px) rotate(-1.5deg)', opacity: 0 },
        { transform: 'translateY(0) rotate(0deg)', opacity: 1 }], { duration: 140, easing: 'ease-out' });
    }
    box.hidden = agreed.length === 0; box.dataset.state = agreed.length ? 'shown' : 'empty';
    if (wasEmpty && agreed.length && flying && typeof box.animate === 'function' && !B.replay) // the sheet unrolls from its top edge
      box.animate([{ opacity: 0, transform: 'translateY(-10px) scaleY(.55)', transformOrigin: '50% 0' }, { opacity: 1, transform: 'none', transformOrigin: '50% 0' }], { duration: 300, easing: 'ease-out' });
    B.teamSpace.count = agreed.length;
    { const n = box.querySelector('[data-component="team-notes"]'); if (n) { n.textContent = `Team notes · ${agreed.length}`; n.dataset.count = String(agreed.length); } }
  }
  // A first-decision card settles: data-state settling while it flies from its owner's seat to the team space on a ~1 s
  // arc (150 ms apart), then closed; emits studio:settled { id } as it lands. Replays and no-motion land at once.
  function settle(li, a, i) {
    const land = () => { li.dataset.state = 'closed'; if (typeof B.emit === 'function') B.emit('studio:settled', { id: a.id }); };
    li.dataset.state = 'settling';
    const seat = document.querySelector(`#room .seat-${CSS.escape((a.seats || [])[0] || '')}`);
    const room = document.getElementById('room');
    if (B.replay || !seat || !room || typeof li.animate !== 'function') return land();
    const fly = () => flyFrom(li, a, i, seat, room, land);
    // Her document covers the room: the cascade waits until she's back, so she sees it (Focus 1, DEMO 0:58).
    if (document.body.classList.contains('focus-open') && typeof B.on === 'function') {
      li.style.visibility = 'hidden';
      let done = false; const go = () => { if (done) return; done = true; li.style.visibility = ''; fly(); };
      B.on('focus.close', () => setTimeout(go, 300)); return;
    }
    fly();
  }
  function flyFrom(li, a, i, seat, room, land) {
    const k = room.getBoundingClientRect().width / (room.offsetWidth || 1600) || 1; // the room is scaled to fit
    const s = seat.getBoundingClientRect(), c = li.getBoundingClientRect();
    const dx = (s.left + s.width / 2 - (c.left + c.width / 2)) / k, dy = (s.top + s.height / 2 - (c.top + c.height / 2)) / k;
    const anim = li.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${dx / 2}px, ${dy / 2 - 80}px) scale(.85)`, opacity: 1, offset: 0.5 },
      { transform: 'none', opacity: 1 },
    ], { duration: 1000, delay: i * 150, easing: 'ease-in-out', fill: 'backwards' });
    anim.finished.then(land, land);
  }
  B.teamSpace = { render, count: 0 };
  if (typeof B.on === 'function') {
    B.on('joint.agreed', () => requestAnimationFrame(render));
    B.on('decided', ev => { if (ev && (ev.unblock || ev.round === 'first')) requestAnimationFrame(render); });
    B.on('joint.revised', () => requestAnimationFrame(render));
    B.on('reset', () => { if (list) list.innerHTML = ''; if (box) { box.hidden = true; box.dataset.state = 'empty'; setNotes(false); } B.teamSpace.count = 0; });
    B.on('run.start', () => requestAnimationFrame(render));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
