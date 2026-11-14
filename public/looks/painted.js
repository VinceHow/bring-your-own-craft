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

  // ---- the team at work, made visible (from real run events only): one calm status line by the table, and the
  // room's chatter kept short (15 words) and few (two at once). No counts, no spinners, no progress. ----
  const WHO = { design: 'Mika', research: 'Noor', data: 'Theo', strategy: 'Ines', engineering: 'Bo' };
  const doing = new Map();                                     // seat -> what it is on, in a few plain words
  const line = document.createElement('p');
  line.className = 'painted-status'; line.dataset.component = 'team-status'; line.setAttribute('aria-live', 'polite'); line.hidden = true;
  room.appendChild(line);
  const lower = t => t.charAt(0).toLowerCase() + t.slice(1);
  const few = (t, n) => { const w = String(t || '').replace(/\s+/g, ' ').trim().split(' '); return w.length > n ? w.slice(0, n).join(' ') + '…' : w.join(' '); };
  // "Who the first customers are: weekly regulars or …" -> "weighing who the first customers are"
  const topic = d => few(lower(String(d || '').split(/[:?(]/)[0].replace(/[.]+$/, '')), 7);
  let turn = 0, timer = null;
  function show() {
    const seats = [...doing.keys()].filter(s => WHO[s]);
    if (!seats.length || focusOpen) { line.hidden = true; return; }
    const two = [seats[turn % seats.length], seats[(turn + 1) % seats.length]].filter((s, i, a) => a.indexOf(s) === i);
    const next = two.map(s => `${WHO[s]} is ${doing.get(s)}`).join('\n');
    if (next !== line.textContent) { line.classList.remove('in'); void line.offsetWidth; line.textContent = next; line.classList.add('in'); }
    line.hidden = false;
  }
  function tick() { turn += 2; show(); }
  const set = (seat, what) => { if (!WHO[seat]) return; doing.set(seat, what); show(); if (!timer) timer = setInterval(tick, 4500); };
  // before the team starts, Noor and Mika are already sketching her rough journey (sketch.user / flow.line events)
  B.on('sketch.user', ev => { if (ev && ev.label) set('research', 'picturing ' + few(lower(ev.label), 5)); });
  B.on('flow.line', ev => { if (ev && ev.text) set('design', 'drawing “' + few(ev.text, 5) + '”'); });
  B.on('teammate.start', ev => set(ev.seat, 'getting started'));
  B.on('candidate', ev => { if (!doing.has(ev.seat) || doing.get(ev.seat) === 'getting started') set(ev.seat, 'weighing ' + topic(ev.decision)); });
  // chatter: a settled call ("Bo: email confirmation …") or the team talking it through with each other
  B.on('chatter', ev => {
    if (!ev.seat || !WHO[ev.seat]) return;
    const t = String(ev.text || '');
    if (/^[A-Z][a-z]+:/.test(t)) set(ev.seat, 'settling ' + topic(t.replace(/^[A-Z][a-z]+:\s*/, '')));
    else set(ev.seat, 'talking it through with the team');
  });
  // a teammate that's done keeps its last line until the room goes quiet (its chatter can still follow)
  let quiet = null;
  const anyEvent = () => { clearTimeout(quiet); quiet = setTimeout(() => { doing.clear(); show(); }, 15000); };
  ['teammate.start', 'candidate', 'chatter', 'decided', 'flow.line', 'sketch.user', 'joint.start', 'joint.agreed'].forEach(t => B.on(t, anyEvent));
  B.on('reset', () => { doing.clear(); clearInterval(timer); timer = null; line.hidden = true; });
  document.addEventListener('studio:focus', show);
  // the room's chatter: at most 15 words a line
  const chat = room.querySelector('.chatter');
  if (chat) new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    const t = n.querySelector && n.querySelector('.chatter-text'); if (t && !t.dataset.short) { t.dataset.short = '1'; t.textContent = few(t.textContent, 15); }
  }))).observe(chat, { childList: true });

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
