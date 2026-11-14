// Her idea is a sheet in the middle of the table (DEMO.md 0:30 on; no gem). Her sheet is that sheet: her sentence on
// top, then Design's first sketch and her reshape, later Design's wireframes and finally her page, all on it. At the
// symphony (beat 8, her build press) each seat slides its part into it. Progress shows only through the work.
// Touches no room.js function: it moves #sketch-sheet and #page-sheet inside #her-sheet as layers (same ids, same
// hidden flags), and listens to the room's 'stage' event.
(function () {
  'use strict';
  const B = (window.BYOC = window.BYOC || {});
  const SEATS = ['design', 'data', 'research', 'strategy', 'engineering', 'product'];
  const INK = { product: '#FF48B0', design: '#0078BF', data: '#00A95C', research: '#FF6C2F', strategy: '#BB8B41', engineering: '#FFE800' };
  const NAME = { product: 'Product', design: 'Design', data: 'Data', research: 'Research', strategy: 'Strategy', engineering: 'Engineering' };
  const LATE = [7, 8, 9, 10, 11].map(n => `body[data-beat="${n}"]`);
  const css = `
${LATE.map(b => `${b} .idea-sheet.big`).join(', ')} { width: 1130px; z-index: 7; overflow: hidden; }
.idea-sheet > .idea-layer { position: absolute; left: 8px; right: 0; top: var(--idea-top, 76px); bottom: 0; width: auto; height: auto;
  border: 0; border-top: 2px solid var(--ink, #141414); border-radius: 0; box-shadow: none; z-index: 6; }
/* Same sheet, next page: no fly-in or tilt of its own (the room's place() sets an inline transform), a quick turn instead */
.idea-sheet > .idea-layer { transform: none !important; }
.idea-sheet > .idea-layer:not([hidden]) { animation: idea-turn 140ms linear both; }
@keyframes idea-turn { from { opacity: 0; } to { opacity: 1; } }
.idea-sheet > .sketch-sheet.idea-layer::before { height: 6px; }
.idea-sheet > .page-sheet.idea-layer .page-frame iframe { transform: scale(0.7778); }
.idea-tabs { position: absolute; top: 12px; right: 16px; z-index: 9; display: flex; gap: 6px; }
.idea-tabs[hidden] { display: none !important; }
.idea-tab { font: 500 12px var(--mono, monospace); padding: 3px 9px 2px; background: var(--sheet, #FBF9F4); color: var(--ink, #141414);
  border: 2px solid var(--ink, #141414); border-radius: 3px 3px 0 0; cursor: pointer; }
.idea-tab[hidden] { display: none !important; }
.idea-tab.is-on { background: var(--ink, #141414); color: var(--sheet, #FBF9F4); }
/* She flips back to any kept page: the view overrides what the beat last showed (nothing is cleared away). */
.idea-sheet[data-view="sketch"] > .idea-layer[hidden], .idea-sheet[data-view="sketch"] > .idea-layer { display: none !important; }
.idea-sheet[data-view="screens"] > #sketch-sheet[hidden], .idea-sheet[data-view="screens"] > #sketch-sheet { display: block !important; }
.idea-sheet[data-view="screens"] > #page-sheet { display: none !important; }
.idea-sheet[data-view="page"] > #page-sheet[hidden], .idea-sheet[data-view="page"] > #page-sheet { display: flex !important; }
.idea-sheet[data-view="page"] > #sketch-sheet { display: none !important; }
/* A page on top hides the one beneath (layers can be see-through paper): her flow, its notes and the who-bar step back */
.idea-sheet[data-view="screens"] > :is(.her-flow, .fs-bar, .her-notes), .idea-sheet[data-view="screens"] > :is(.her-flow, .fs-bar, .her-notes) *,
.idea-sheet[data-view="page"] > :is(.her-flow, .fs-bar, .her-notes), .idea-sheet[data-view="page"] > :is(.her-flow, .fs-bar, .her-notes) *,
.idea-sheet:not([data-view]):has(> .idea-layer:not([hidden])) > :is(.her-flow, .fs-bar, .her-notes),
.idea-sheet:not([data-view]):has(> .idea-layer:not([hidden])) > :is(.her-flow, .fs-bar, .her-notes) * { visibility: hidden !important; }
.symphony-slip { position: absolute; z-index: 20; width: 220px; padding: 8px 10px 9px 14px; background: var(--sheet, #FBF9F4);
  border: 2px solid var(--ink, #141414); border-radius: 4px; box-shadow: 3px 3px 0 var(--ink, #141414); pointer-events: none;
  font: 500 13px/1.25 var(--ui, sans-serif); }
.symphony-slip::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: var(--slip-ink, #141414); }
.symphony-slip .slip-seat { display: block; font: 600 11px var(--mono, monospace); letter-spacing: .08em; text-transform: uppercase; margin-bottom: 3px; }
.symphony-slip .slip-text { display: block; }
`;
  const style = document.createElement('style'); style.dataset.byoc = 'idea-sheet'; style.textContent = css;
  document.head.appendChild(style);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function adopt() {
    const sheet = document.getElementById('her-sheet');
    if (!sheet) return null;
    sheet.classList.add('idea-sheet');
    for (const id of ['sketch-sheet', 'page-sheet']) {
      const layer = document.getElementById(id);
      if (layer && layer.parentNode !== sheet) { layer.classList.add('idea-layer'); sheet.appendChild(layer); }
    }
    return sheet;
  }
  // The layers start just under her idea sentence, so the sheet keeps its title all the way to her page.
  function measure() {
    const sheet = adopt(); if (!sheet) return;
    const idea = document.getElementById('her-idea'), q = sheet.querySelector('.her-q');
    const last = idea && idea.textContent ? idea : q;
    if (!last || !last.offsetHeight) return;
    sheet.style.setProperty('--idea-top', Math.round(last.offsetTop + last.offsetHeight + 10) + 'px');
  }

  // ---- keep what matters: tabs to flip back to her sketch, Design's screens and her page ----
  const VIEWS = [['sketch', 'sketch'], ['screens', 'screens'], ['page', 'page']];
  let tabs = null;
  function kept() {
    const evs = typeof B.events === 'function' ? B.events() : [];
    const inner = document.getElementById('sketch-inner');
    return { sketch: evs.some(e => e.type === 'flow.line'), screens: !!(inner && inner.children.length),
      page: evs.some(e => e.type === 'build.done') };
  }
  function visibleView(sheet) {
    if (sheet.dataset.view) return sheet.dataset.view;
    const shown = id => { const e = document.getElementById(id); return e && !e.hidden; };
    return shown('page-sheet') ? 'page' : shown('sketch-sheet') ? 'screens' : 'sketch';
  }
  function updateTabs() {
    const sheet = adopt(); if (!sheet) return;
    if (!tabs || !tabs.isConnected) {
      tabs = h('nav', 'idea-tabs'); tabs.setAttribute('aria-label', 'Pages of her idea');
      for (const [view, label] of VIEWS) {
        const b = h('button', 'idea-tab', label); b.type = 'button'; b.dataset.view = view;
        b.addEventListener('click', e => { e.stopPropagation(); sheet.dataset.view = view; b.blur(); updateTabs(); step(); });
        tabs.appendChild(b);
      }
      sheet.appendChild(tabs);
    }
    const k = kept();
    const n = Object.values(k).filter(Boolean).length;
    tabs.hidden = n < 2 || B.beat < 7; // tabs only once there is more than one page to flip between
    const on = visibleView(sheet);
    for (const b of tabs.children) { b.hidden = !k[b.dataset.view]; b.classList.toggle('is-on', b.dataset.view === on); }
  }

  // The paper matures with the work (polish.css styles each step): rough -> sketched -> reshaped -> wires -> page.
  function step() {
    const sheet = adopt(); if (!sheet) return;
    const evs = typeof B.events === 'function' ? B.events() : [];
    const shown = id => { const e = document.getElementById(id); return e && !e.hidden; };
    const idea = document.getElementById('her-idea');
    const view = sheet.dataset.view;
    const st = view === 'page' ? 'page' : view === 'screens' ? 'wires' : view === 'sketch' ? (evs.some(e => e.type === 'flow.reset') ? 'reshaped' : 'sketched')
      : shown('page-sheet') ? 'page' : shown('sketch-sheet') ? 'wires'
      : evs.some(e => e.type === 'flow.reset') ? 'reshaped'
      : evs.some(e => e.type === 'flow.line') ? 'sketched'
      : idea && idea.textContent.trim() ? 'rough' : null;
    if (st) sheet.dataset.step = st; else delete sheet.dataset.step;
    updateTabs();
  }

  // ---- the symphony: every seat slides its part into the sheet ----
  function partOf(seat, evs) {
    if (seat === 'product') {
      const asks = new Map(evs.filter(e => e.type === 'ask').map(a => [a.id, a]));
      const a = evs.filter(e => e.type === 'answer').at(-1);
      if (a) return `Your call: ${a.choice}`;
      const r = evs.filter(e => e.type === 'reshape').at(-1);
      return r ? `Your shape: ${r.text}` : (asks.size ? 'Your calls' : 'Your idea');
    }
    const d = evs.find(e => e.type === 'decided' && e.seat === seat && e.choice);
    if (d) return `${d.decision}: ${d.choice}`;
    if (seat === 'engineering') return 'The page template and the build';
    return null;
  }
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  let played = false;
  async function symphony() {
    const sheet = adopt(); const room = B.el && B.el.room;
    if (!sheet || !room || played) return;
    played = true;
    const evs = typeof B.events === 'function' ? B.events() : [];
    const tx = sheet.offsetLeft + sheet.offsetWidth / 2 - 110, ty = sheet.offsetTop + sheet.offsetHeight / 2 - 30;
    const slips = [];
    room.classList.add('symphony');
    SEATS.forEach((seat, i) => {
      const text = partOf(seat, evs);
      const from = room.querySelector(`.seat[data-seat="${seat}"]`);
      if (!text || !from) return;
      const s = h('div', 'symphony-slip handing'); s.dataset.seat = seat; s.style.setProperty('--slip-ink', INK[seat]);
      s.append(h('span', 'slip-seat', NAME[seat]), h('span', 'slip-text', clip(text, 90)));
      const fx = from.offsetLeft + from.offsetWidth / 2 - 110, fy = seat === 'product' ? from.offsetTop - 70 : from.offsetTop + from.offsetHeight - 10;
      s.style.left = fx + 'px'; s.style.top = fy + 'px'; s.style.opacity = '0';
      room.appendChild(s);
      slips.push({ s, dx: tx - fx, dy: ty - fy, delay: i * 140 });
    });
    const runs = slips.map(({ s, dx, dy, delay }) => {
      if (typeof s.animate !== 'function') { s.remove(); return Promise.resolve(); }
      const a = s.animate([
        { transform: 'translate(0,0) rotate(-3deg) scale(1)', opacity: 0, offset: 0 },
        { transform: 'translate(0,-6px) rotate(-2deg) scale(1)', opacity: 1, offset: 0.12 },
        { transform: `translate(${dx}px, ${dy}px) rotate(1deg) scale(.55)`, opacity: 1, offset: 0.88 },
        { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(.4)`, opacity: 0, offset: 1 },
      ], { duration: 1050, delay, easing: 'cubic-bezier(.3,.1,.2,1)', fill: 'forwards' });
      return a.finished.catch(() => {}).then(() => s.remove());
    });
    await Promise.all(runs);
    room.classList.remove('symphony');
    if (typeof sheet.animate === 'function') sheet.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.012)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
    B.symphonyPlayed = slips.length;
  }

  if (typeof B.on === 'function') {
    for (const t of ['run.start', 'flow.line', 'flow.reset', 'sketch.done', 'build.done', 'reset']) B.on(t, () => requestAnimationFrame(step));
    B.on('stage', ev => {
      const sh = adopt();
      if (sh) delete sh.dataset.view; // a new beat shows its own page; the tabs still flip back
      requestAnimationFrame(step);
      if (ev.beat >= 6) requestAnimationFrame(measure);
      if (ev.beat === 8) symphony();
      if (ev.beat < 8) played = false;
    });
    B.on('run.start', () => requestAnimationFrame(measure));
    B.on('reset', () => { const sh = document.getElementById('her-sheet'); if (sh) delete sh.dataset.view; played = false; B.el && B.el.room && B.el.room.classList.remove('symphony'); B.symphonyPlayed = 0; document.querySelectorAll('.symphony-slip').forEach(s => s.remove()); });
  }
  function boot() {
    adopt();
    const mo = new MutationObserver(() => step());
    const inner = document.getElementById('sketch-inner');
    if (inner) mo.observe(inner, { childList: true });
    for (const id of ['sketch-sheet', 'page-sheet', 'her-idea']) {
      const e = document.getElementById(id);
      if (e) mo.observe(e, id === 'her-idea' ? { childList: true, characterData: true, subtree: true } : { attributes: true, attributeFilter: ['hidden'] });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  B.ideaSheet = { adopt, measure, symphony, step, updateTabs };
})();
