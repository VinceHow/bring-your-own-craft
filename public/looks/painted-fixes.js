// The painted look's small behaviours for painted-fixes.css (loaded by painted.js, after the room). Hooks only.
//   The team notes: the team space folds to one paper tab, "Team notes · N" (N = its cards, kept on data-count); a click
//   opens the sheet (data-open="true"), a click outside it or Esc folds it again. Records stay one tap away (TASTE).
(function () {
  'use strict';
  if ((new URLSearchParams(location.search).get('look') || '').toLowerCase() !== 'painted') return;
  const room = document.getElementById('room'); if (!room) return;
  const space = () => room.querySelector('[data-component="team-space"]');
  let watched = null;
  function count() {
    const ts = space(); if (!ts) return;
    const n = String(ts.querySelectorAll('[data-component="decision-card"]').length);
    if (ts.dataset.count !== n) ts.dataset.count = n;
    const t = ts.querySelector('[data-slot="title"]'); if (t && t.dataset.count !== n) t.dataset.count = n;   // the tab's text reads it
    if (watched !== ts) { watched = ts; new MutationObserver(count).observe(ts, { childList: true, subtree: true }); }
  }
  count(); const find = setInterval(() => { count(); if (watched) clearInterval(find); }, 1000); setTimeout(() => clearInterval(find), 60000);
  const fold = () => { const ts = space(); if (ts && ts.dataset.open === 'true') delete ts.dataset.open; };
  document.addEventListener('click', e => {
    const ts = space(); if (!ts) return;
    if (ts.contains(e.target)) { if (ts.dataset.open !== 'true') { ts.dataset.open = 'true'; e.stopPropagation(); e.preventDefault(); } return; }
    fold();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fold(); });
  if (window.BYOC && BYOC.on) BYOC.on('reset', () => { fold(); count(); });
})();
