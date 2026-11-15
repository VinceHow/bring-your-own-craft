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

  // ---- the team at work, made visible (from real run events only): a small ink strip under her glance card, a line per
  // teammate, and the room's chatter kept short (15 words) and few (two at once). No counts, no spinners, no progress.
  // It shares its place with the room's #team-status: anything for her (a question, a failure) takes the strip. ----
  const WHO = { design: 'Mika', research: 'Noor', data: 'Theo', strategy: 'Ines', engineering: 'Bo' };
  const doing = new Map();                                     // seat -> what it is on, in a few plain words
  const line = document.createElement('p');
  line.dataset.component = 'team-doing'; line.setAttribute('aria-live', 'polite'); line.hidden = true;
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
    if (next !== line.textContent) { line.dataset.state = ''; void line.offsetWidth; line.textContent = next; line.dataset.state = 'in'; }
    line.hidden = false;
  }
  function tick() { turn += 2; show(); }
  const set = (seat, what) => { if (!WHO[seat]) return; doing.set(seat, what); show(); if (!timer) timer = setInterval(tick, 4500); };
  // before the team starts, Noor and Mika are already sketching her rough journey (sketch.user / flow.line events)
  // (#room[data-sketching] marks their pills as at work: the room's place-cards stay idle until the team starts)
  const sketching = new Set(), sketchMark = () => { if (sketching.size) room.dataset.sketching = [...sketching].join(' '); else delete room.dataset.sketching; };
  let sketchQuiet = null;
  const sketchAt = seat => { sketching.add(seat); sketchMark(); clearTimeout(sketchQuiet); sketchQuiet = setTimeout(() => { sketching.clear(); sketchMark(); }, 6000); };
  B.on('sketch.user', ev => { if (ev && ev.label) { set('research', 'picturing ' + few(lower(ev.label), 5)); sketchAt('research'); } });
  B.on('flow.line', ev => { if (ev && ev.text) { set('design', 'drawing “' + few(ev.text, 5) + '”'); sketchAt('design'); } });
  ['sketch.done', 'teammate.start', 'reset'].forEach(t => B.on(t, () => { sketching.clear(); sketchMark(); }));
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
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    const t = n.dataset && n.dataset.component === 'chatter-line' && n.querySelector('[data-slot="text"]');
    if (t && !t.dataset.short) { t.dataset.short = '1'; t.textContent = few(t.textContent, 15); }
  }))).observe(room, { childList: true, subtree: true });

  // ---- her glance card's journey: whole pills only, and "+2" in ink for the rest (jank 7). Only a data attribute on the
  // boxes that don't fit (data-glance="off"); her sheet opened large shows them all. ----
  const sheet = document.getElementById('her-sheet'), flowHost = document.getElementById('her-flow');
  if (sheet && flowHost) {
    const more = document.createElement('span'); more.dataset.component = 'glance-more'; more.hidden = true; more.setAttribute('aria-hidden', 'true');
    sheet.appendChild(more);
    let busy = false;
    const fit = () => {
      if (busy) return; busy = true;
      const boxes = [...flowHost.querySelectorAll('[data-slot="box"]')];
      boxes.forEach(b => b.removeAttribute('data-glance'));
      more.hidden = true;
      if (sheet.dataset.open !== 'true' && !sheet.hidden && boxes.length && getComputedStyle(flowHost).visibility !== 'hidden') {
        // the pills wrap to two rows at most; the rest fold into "+N", which takes the end of the second row
        const top0 = boxes[0].offsetTop, rowH = boxes[0].offsetHeight, avail = flowHost.clientWidth, chip = 34;
        let off = 0;
        boxes.forEach(b => { if (b.offsetTop - top0 > rowH * 1.5) { b.dataset.glance = 'off'; off++; } });
        const shown = boxes.filter(b => !b.dataset.glance);
        while (off && shown.length > 1) {
          const last = shown[shown.length - 1];
          if (last.offsetLeft + last.offsetWidth + 6 + chip <= avail) break;
          last.dataset.glance = 'off'; shown.pop(); off++;
        }
        if (off) {
          const last = shown[shown.length - 1], fr = last.getBoundingClientRect(), sr = sheet.getBoundingClientRect(), k = sr.width / sheet.offsetWidth || 1;
          more.textContent = '+' + off; more.style.left = ((fr.right - sr.left) / k + 6) + 'px'; more.style.top = ((fr.top - sr.top) / k) + 'px'; more.hidden = false;
        }
      }
      requestAnimationFrame(() => { busy = false; });
    };
    let t = null; const soon = () => { clearTimeout(t); t = setTimeout(fit, 60); };
    new MutationObserver(soon).observe(flowHost, { childList: true, subtree: true, characterData: true });
    new MutationObserver(soon).observe(sheet, { attributes: true, attributeFilter: ['data-open', 'hidden', 'class'] });
    addEventListener('resize', soon); setInterval(fit, 1500); soon();
  }

  // ---- a new note for her arrives (port of the her-inbox comp, ?st=arrive): the teammate holds up its note in the
  // painting (painted-living plays 'found' on ask), it drifts across the tabletop on a soft paper arc, below every
  // face, and tucks into her inbox, which rises a touch to take it. Nothing flies while she's in focus.
  const HAND = { design: [472, 474], research: [695, 443], data: [850, 452], strategy: [1012, 440], engineering: [1125, 475] };
  const M = window.Motion;
  B.on('ask', ev => {
    const inbox = document.getElementById('inbox');
    if (!M || !inbox || focusOpen || B.replay === 'instant' || !HAND[ev.seat] || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const [hx, hy] = HAND[ev.seat];
    inbox.dataset.ptAwaiting = '';
    setTimeout(() => {
      const r = room.getBoundingClientRect(), k = r.width / 1600, ib = inbox.getBoundingClientRect();
      const x1 = (ib.left - r.left) / k + 40, y1 = (ib.top - r.top) / k + 6;
      const n = document.createElement('div'); n.dataset.component = 'note-flight'; n.dataset.seat = ev.seat;
      const who = document.createElement('b'), txt = document.createElement('span'); who.dataset.slot = 'who'; txt.dataset.slot = 'text';
      who.textContent = WHO[ev.seat] || ''; txt.textContent = few(ev.question || ev.decision || '', 8); n.append(who, txt);
      room.appendChild(n);
      const x0 = hx - 100, y0 = hy - 30, mx = (x0 + x1) / 2 + 30, my = 600;
      M.animate(n, { opacity: [0, 1] }, { duration: .3 });
      M.animate(n, { x: [x0, mx, x1], y: [y0, my, y1], rotate: [-8, 4, -1], scale: [.8, .9, .7] }, { duration: 1.9, ease: [.45, .05, .3, 1], times: [0, .5, 1] }).finished.then(() => {
        n.remove(); delete inbox.dataset.ptAwaiting;
        M.animate(inbox, { y: [0, -8, 0] }, { duration: 1.1, ease: [.33, 0, .2, 1] });
      });
    }, 1400);                                                  // the note is up in their hand first
    setTimeout(() => { delete inbox.dataset.ptAwaiting; }, 6000);   // never leave it hidden
  });
})();
