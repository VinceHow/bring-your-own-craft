// Her idea is a sheet in the middle of the table (DEMO.md 0:30 on; no gem). Her sheet is that sheet: her sentence on
// top, then Design's first sketch and her reshape, later Design's wireframes and finally her page, all on it. Her build
// press (beat 8) has no staging: the page simply appears on the sheet. Progress shows only through the work.
// Touches no room.js function: it moves #sketch-sheet and #page-sheet inside #her-sheet as layers (same ids, same
// hidden flags), and listens to the room's 'stage' event.
(function () {
  'use strict';
  const B = (window.BYOC = window.BYOC || {});
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
`;
  const style = document.createElement('style'); style.dataset.byoc = 'idea-sheet'; style.textContent = css;
  document.head.appendChild(style);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function adopt() {
    const sheet = document.getElementById('her-sheet');
    if (!sheet) return null;
    sheet.classList.add('idea-sheet'); sheet.dataset.component = 'idea-sheet'; // docs/COMPONENTS.md hooks for looks
    for (const id of ['sketch-sheet', 'page-sheet']) {
      const layer = document.getElementById(id);
      if (layer && layer.parentNode !== sheet) { layer.classList.add('idea-layer'); layer.dataset.component = 'idea-layer'; sheet.appendChild(layer); }
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
      tabs = h('nav', 'idea-tabs'); tabs.dataset.slot = 'tabs'; tabs.setAttribute('aria-label', 'Pages of her idea');
      for (const [view, label] of VIEWS) {
        const b = h('button', 'idea-tab', label); b.type = 'button'; b.dataset.slot = 'tab'; b.dataset.view = view;
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
    sheet.dataset.state = st || 'blank';
    for (const id of ['sketch-sheet', 'page-sheet']) { const l = document.getElementById(id); if (l) l.dataset.state = l.hidden ? 'off' : 'on'; }
    updateTabs();
  }

  if (typeof B.on === 'function') {
    for (const t of ['run.start', 'flow.line', 'flow.reset', 'sketch.done', 'build.done', 'reset']) B.on(t, () => requestAnimationFrame(step));
    B.on('stage', ev => {
      const sh = adopt();
      if (sh) delete sh.dataset.view; // a new beat shows its own page; the tabs still flip back
      requestAnimationFrame(step);
      if (ev.beat >= 6) requestAnimationFrame(measure);
    });
    B.on('run.start', () => requestAnimationFrame(measure));
    B.on('reset', () => { const sh = document.getElementById('her-sheet'); if (sh) delete sh.dataset.view; });
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
  B.ideaSheet = { adopt, measure, step, updateTabs };
})();
