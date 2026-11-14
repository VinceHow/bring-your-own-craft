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
    box.append(slot(h('div', 'ts-title', 'Team space'), 'title'));
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
    if (a.unblock) { li.dataset.kind = 'unblock'; li.dataset.seat = a.seat || ''; if (a.yours) { li.dataset.her = ''; li.appendChild(slot(h('span', 'ts-yours', 'your call'), 'yours')); } }
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
    // A quick unblock she answered (or the team decided, once her three were spent) lands here too, owned by its seat.
    for (const d of new Map(evs.filter(e => e.type === 'decided' && e.unblock && e.choice).map(e => [e.id, e])).values())
      { const yours = /^her /.test(d.cites || '');
        agreed.push({ id: 'ub-' + d.id, seat: d.seat, seats: yours ? ['product', d.seat] : [d.seat], unblock: true, yours,
          headline: d.headline || `${String(d.decision || '').replace(/[.?]+$/, '')}: ${d.choice}` }); }
    for (const c of [...list.children]) {
      const a = agreed.find(x => x.id === c.dataset.joint);
      if (!a || (a.revised && c.dataset.revised !== '1')) c.remove();
    }
    const have = new Set([...list.children].map(c => c.dataset.joint));
    for (const a of agreed) {
      if (have.has(a.id)) continue;
      const li = card(a);
      if (a.revised) li.dataset.revised = '1';
      const next = [...list.children].find(c => agreed.findIndex(x => x.id === c.dataset.joint) > agreed.indexOf(a));
      list.insertBefore(li, next || null);
      if (typeof li.animate === 'function' && !B.replay) li.animate([{ transform: 'translateY(14px) rotate(-1.5deg)', opacity: 0 },
        { transform: 'translateY(0) rotate(0deg)', opacity: 1 }], { duration: 140, easing: 'ease-out' });
    }
    box.hidden = agreed.length === 0; box.dataset.state = agreed.length ? 'shown' : 'empty';
    B.teamSpace.count = agreed.length;
  }
  B.teamSpace = { render, count: 0 };
  if (typeof B.on === 'function') {
    B.on('joint.agreed', () => requestAnimationFrame(render));
    B.on('decided', ev => { if (ev && ev.unblock) requestAnimationFrame(render); });
    B.on('joint.revised', () => requestAnimationFrame(render));
    B.on('reset', () => { if (list) list.innerHTML = ''; if (box) { box.hidden = true; box.dataset.state = 'empty'; } B.teamSpace.count = 0; });
    B.on('run.start', () => requestAnimationFrame(render));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
