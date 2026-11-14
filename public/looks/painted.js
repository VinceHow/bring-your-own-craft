// The painted look's single entry point (index.html loads looks/<name>.js after the room scripts when ?look=<name>).
// It loads the three plug-ins and glues them to the room. Every piece is optional: if one fails to load, the others
// and the room keep working, and with no look nothing here runs at all.
//   1. painted-living.js (+ .css): the living painting as the room's backdrop, teammates' moods from run events.
//   2. playful-ink.js (+ .css): the record player, cat, coffee, lights and the day / night pill.
//   3. painted.css: the room's own components as ink and paper (already linked by the room's ?look loader).
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

  // ---- 1. the living painting, moved inside the room so it scales with it and lines up with the name pills ----
  css('painted-living.css');
  js('painted-living.js').then(ok => {
    const frame = ok && document.querySelector('iframe.painted-living');
    if (!frame) return;
    frame.classList.add('in-room');
    room.prepend(frame);                                   // an iframe reloads when moved; it has barely started
    document.addEventListener('studio:time', e => {
      const t = e.detail && e.detail.time; if (!t || (e.detail && e.detail.from === 'painted')) return;
      room.dataset.time = t === 'night' ? 'night' : 'day';
      try { const l = frame.contentWindow && frame.contentWindow.living; if (l && l.setTime) l.setTime(t === 'night' ? 'night' : 'afternoon'); } catch (err) { /* not ready */ }
    });
  });

  // ---- 2. the playful objects, over the painting and under the room's UI ----
  css('playful-ink.css');
  js('playful-ink.js').then(ok => {
    if (!ok || !window.PlayfulInk) return;
    const box = document.createElement('div');
    box.className = 'painted-playful';                     // the painting's box: 1612 x 900, centred, as the backdrop draws it
    room.insertBefore(box, room.firstChild.nextSibling);
    const night = new URLSearchParams(location.search).get('night') === '1';
    room.dataset.time = night ? 'night' : 'day';
    try { window.PlayfulInk.mount(box, { night: base + 'cast/living/painting-night.jpg', music: base + 'cast/music', time: night ? 'night' : 'day' }); }
    catch (err) { console.warn('playful-ink', err); box.remove(); }
  });
})();
