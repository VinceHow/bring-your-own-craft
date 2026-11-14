// The painted look's single entry point (index.html loads looks/<name>.js after the room scripts when ?look=<name>).
// It loads the three plug-ins and glues them to the room. Every piece is optional: if one fails to load, the others
// and the room keep working, and with no look nothing here runs at all.
//   1. painted-living.js (+ .css): the living painting as the room's backdrop, teammates' moods from run events.
//   2. playful-ink.js (+ .css): the record player, cat, coffee, lights and the day / night pill.
//   3. painted.css: the room's own components as ink and paper (already linked by the room's ?look loader).
//   4. painted-fixes.css: bug fixes from Vincent's testing, loaded last.
//   5. cover: the stage fills the window (cropping the painting's edges) instead of letterboxing.
// Shared document events: 'studio:focus' { open } when her focus document opens or closes, 'studio:time' { time }.
// Z-order inside #room, bottom to top: painting (fallback image), living backdrop (z 0), playful layer (z 2), the room's
// UI (pills, sheet, notes: z 5-9), panels (55), the focus document (60). The Replay label stays on top of everything.
(function () {
  'use strict';
  if ((new URLSearchParams(location.search).get('look') || '').toLowerCase() !== 'painted') return;
  const B = window.BYOC, room = document.getElementById('room');
  if (!B || !room) return;
  const base = '/looks/';
  const css = href => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + href; document.head.appendChild(l); };
  const js = src => new Promise(res => { const s = document.createElement('script'); s.src = base + src; s.onload = () => res(true); s.onerror = () => { s.remove(); res(false); }; document.body.appendChild(s); });

  // ---- focus: one event for every layer (the living painting holds still, the music ducks) ----
  let focusOpen = false;
  const focus = open => { if (open === focusOpen) return; focusOpen = open; document.dispatchEvent(new CustomEvent('studio:focus', { detail: { open } })); };
  B.on('focus.open', () => focus(true));
  B.on('focus.close', () => focus(false));
  B.on('focus', f => { if (f && typeof f.open === 'boolean') focus(f.open); });
  B.on('reset', () => focus(false));

  // ---- 1. the living painting: it puts itself first in #room at z 0 and sets #room[data-scene] ----
  js('painted-living.js').then(() => {
    document.addEventListener('studio:time', e => {
      const t = e.detail && e.detail.time; if (!t) return;
      room.dataset.time = t === 'night' ? 'night' : 'day';
    });
  });

  // ---- 2. the playful objects, over the painting and under the room's UI ----
  css('playful-ink.css');
  js('playful-ink.js').then(ok => {
    if (!ok || !window.PlayfulInk) return;
    const box = document.createElement('div');
    box.className = 'painted-playful';                     // the painting's box: 1612 x 900, centred, as the backdrop draws it
    const bg = room.querySelector(':scope > iframe.painted-living'); room.insertBefore(box, bg ? bg.nextSibling : room.firstChild);
    const night = new URLSearchParams(location.search).get('night') === '1';
    room.dataset.time = night ? 'night' : 'day';
    try { window.PlayfulInk.mount(box, { night: base + 'cast/living/painting-night.jpg', music: base + 'cast/music', time: night ? 'night' : 'day' }); }
    catch (err) { console.warn('playful-ink', err); box.remove(); }
  });

  // ---- 4. bug fixes from testing, last so they win over painted.css (selectors on data-* only) ----
  css('painted-fixes.css');

  // ---- 5. the room fills the window: COVER, never letterbox ----
  // stage.js scales the 1600 x 900 stage to FIT, which leaves dark bars when the window isn't 16:9 (Vincent's
  // 1920 x 1130 lost the bottom of the painting to a band). The painted look scales the whole stage (painting, living
  // iframe, hotspots and UI together, so everything stays aligned) to cover the area under the key bar instead, and
  // crops the painting's edges. --crop-x / --crop-y on #room say how many stage px each edge loses, so UI pinned to
  // the stage's edges (painted-fixes.css) steps inside what's visible.
  const playful = () => room.querySelector('.painted-playful .pi-sky');
  let want = '';
  function cover() {
    const top = document.body.classList.contains('stage') ? 0 : 30;   // the key bar stage.js leaves above the room
    const vw = window.innerWidth, vh = window.innerHeight - top;
    // cover, but never crop more than ~110 stage px off a side (or 130 off top and bottom), so all five faces, the table
    // and her stool always stay in view; a window shaped far from 16:9 (portrait) letterboxes a little instead
    const s = Math.max(Math.min(vw / 1600, vh / 900), Math.min(Math.max(vw / 1600, vh / 900), vw / 1380, vh / 640));
    want = `scale(${s.toFixed(4)})`;
    if (room.style.transform !== want) room.style.transform = want;
    room.style.setProperty('--crop-x', Math.max(0, (1600 * s - vw) / 2 / s).toFixed(1) + 'px');
    room.style.setProperty('--crop-y', Math.max(0, (900 * s - vh) / 2 / s).toFixed(1) + 'px');
    room.dataset.fill = 'cover';
    const sky = playful(); if (sky && !sky.dataset.component) sky.dataset.component = 'time-pill'; // a data hook for painted-fixes.css
  }
  window.addEventListener('resize', cover);                              // after stage.js's own fit, so cover wins
  new MutationObserver(() => { if (room.style.transform !== want) cover(); }).observe(room, { attributes: true, attributeFilter: ['style'] });
  cover(); setTimeout(cover, 600);                                       // and once the playful layer has mounted
})();
