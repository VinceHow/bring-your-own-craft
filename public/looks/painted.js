// The painted look's single entry point (index.html loads looks/<name>.js after the room scripts when ?look=<name>).
// It loads the three plug-ins and glues them to the room. Every piece is optional: if one fails to load, the others
// and the room keep working, and with no look nothing here runs at all.
//   1. painted-living.js (+ .css): the living painting as the room's backdrop, teammates' moods from run events.
//   2. playful-ink.js (+ .css): the record player, cat, coffee, lights and the day / night pill.
//   3. painted.css: the room's own components as ink and paper (already linked by the room's ?look loader).
//   4. painted-fixes.css: bug fixes from Vincent's testing, loaded last.
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
  css('painted-focus.css');   // her focus document as her review page (look only; after painted.css so it wins)
  // Her thoughts sit on one sheet of her pink paper: a decorative layer behind her column (aria-hidden, no events,
  // nothing reads it). focus-doc.js keeps its markup; painted-focus.css places these layers in the document's grid.
  // Her pin is a second such layer: it lands on the work's corner once her words are in (painted-focus.css, by data-state).
  const fdoc = document.querySelector('[data-component="focus-doc"]');
  const layer = (name, text) => {
    if (!fdoc || fdoc.querySelector(`:scope > [data-pfd="${name}"]`)) return;
    const el = document.createElement('div');
    el.dataset.pfd = name; el.setAttribute('aria-hidden', 'true'); if (text) el.textContent = text;
    fdoc.appendChild(el);
  };
  layer('sheet', 'Your thoughts');
  layer('her-pin');
  // Her right column is ONE painted scroll (no nested scroll boxes, no browser scrollbars). focus-doc.js splits it between
  // its main block and its aside, so this look gathers those parts, in order, into one look-owned column inside the
  // document ([data-pfd="column"]); focus-doc.js still finds every part by doc.querySelector. Parts added later are
  // gathered too. While she captures, the aside's parts stay out of view, as focus-doc.js hides its aside.
  // the meeting's leave prompt sits at the column's foot: when it asks, the column brings it into view
  const leave = fdoc && fdoc.querySelector('[data-component="leave-meeting"]'), side = fdoc && fdoc.querySelector(':scope > [data-slot="side"]');
  if (leave && side) new MutationObserver(() => { if (leave.dataset.state === 'asking' && !leave.hidden) side.scrollTo({ top: side.scrollHeight, behavior: 'smooth' }); })
    .observe(leave, { attributes: true, attributeFilter: ['data-state', 'hidden'] });
  if (fdoc && !fdoc.querySelector(':scope > [data-slot="side"]')) {   // focus-doc.js's own column ([data-slot=side], build/beats) needs none of this
    const col = document.createElement('div'); col.dataset.pfd = 'column'; fdoc.appendChild(col);
    const newer = document.createElement('button'); newer.type = 'button'; newer.dataset.pfd = 'newer'; newer.hidden = true; newer.textContent = 'New replies ↓';
    const main = fdoc.querySelector(':scope > div:has(> [data-slot="work"])'), side = fdoc.querySelector(':scope > aside');
    const mine = n => n.nodeType === 1 && !n.matches('[data-slot="work"], [data-slot="question"]');
    const gather = () => {
      if (main) [...main.children].filter(mine).forEach(n => { n.dataset.pfdFrom = 'main'; col.insertBefore(n, col.querySelector(':scope > [data-pfd-from="side"]') || (newer.parentNode ? newer : null)); });
      if (side) [...side.children].filter(mine).forEach(n => { n.dataset.pfdFrom = 'side'; col.insertBefore(n, newer.parentNode ? newer : null); });
      if (!newer.parentNode) col.appendChild(newer);
    };
    gather();
    [main, side].forEach(p => p && new MutationObserver(gather).observe(p, { childList: true }));
    const nearEnd = () => col.scrollHeight - col.scrollTop - col.clientHeight < 60;
    const toEnd = () => col.scrollTo({ top: col.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    col.addEventListener('scroll', () => { if (nearEnd()) newer.hidden = true; });
    newer.addEventListener('click', () => { newer.hidden = true; toEnd(); });
    let wasEnd = true;
    new MutationObserver(ms => {
      const card = col.querySelector('[data-component="takeaways"]');
      if (ms.some(m => m.target === card && m.attributeName === 'data-state') && card.dataset.state === 'shown') {   // the takeaways: its top into view
        newer.hidden = true; requestAnimationFrame(() => col.scrollTo({ top: Math.max(0, card.offsetTop - 16), behavior: 'smooth' })); return;
      }
      if (ms.some(m => m.type === 'childList' && [...m.addedNodes].some(n => n.nodeType === 1 && n.dataset.component === 'chime'))) {   // a reply arrives
        if (wasEnd) requestAnimationFrame(toEnd); else newer.hidden = false;
      }
    }).observe(col, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });
    col.addEventListener('scroll', () => { wasEnd = nearEnd(); });
    B.on('focus.open', () => { col.scrollTop = 0; newer.hidden = true; wasEnd = true; });
  }
  const js = src => new Promise(res => { const s = document.createElement('script'); s.src = base + src; s.onload = () => res(true); s.onerror = () => { s.remove(); res(false); }; document.body.appendChild(s); });

  // ---- focus: one event for every layer (the living painting holds still, the music ducks) ----
  let focusOpen = false;
  const focus = open => { if (open === focusOpen) return; focusOpen = open; document.dispatchEvent(new CustomEvent('studio:focus', { detail: { open } })); };
  B.on('focus.open', () => focus(true));
  B.on('focus.close', () => focus(false));
  B.on('focus', f => { if (f && typeof f.open === 'boolean') focus(f.open); });
  B.on('reset', () => focus(false));

  // ---- meet the team: each teammate's face slot waves (their intro clip, muted and looping; the portrait is the poster).
  // A tap on the face plays their tap reaction once, then the wave again. Hooks: meet-card[data-seat], [data-slot="face"].
  const WAVE = { design: 'mika', research: 'noor', data: 'theo', strategy: 'ines', engineering: 'bo' };
  const waveIn = card => {
    const face = card.querySelector('[data-slot="face"]'), who = WAVE[card.dataset.seat];
    if (!face || !who || face.querySelector('video')) return;
    const v = document.createElement('video'); v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.setAttribute('aria-hidden', 'true');
    v.poster = base + `cast/intro/${who}.jpg`; v.src = base + `cast/intro/wave-${who}.mp4`; v.preload = 'auto';
    v.addEventListener('error', () => { if (v.dataset.clip !== 'tap') v.remove(); else { v.dataset.clip = 'wave'; v.loop = true; v.src = base + `cast/intro/wave-${who}.mp4`; v.play().catch(() => {}); } });
    v.addEventListener('ended', () => { if (v.dataset.clip === 'tap') { v.dataset.clip = 'wave'; v.loop = true; v.src = base + `cast/intro/wave-${who}.mp4`; v.play().catch(() => {}); } });
    face.addEventListener('click', e => { e.stopPropagation(); if (v.dataset.clip === 'tap') return; v.dataset.clip = 'tap'; v.loop = false; v.src = base + `cast/intro/tap-${who}.mp4`; v.play().catch(() => {}); });
    face.appendChild(v); v.play().catch(() => {});
  };
  const setupEl = document.getElementById('setup');
  if (setupEl) {
    setupEl.querySelectorAll('[data-component="meet-card"]').forEach(waveIn);
    new MutationObserver(() => setupEl.querySelectorAll('[data-component="meet-card"]').forEach(waveIn)).observe(setupEl, { childList: true, subtree: true });
  }

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

  // ---- after her Yes on an unblock (QA #6): the card becomes a one-line receipt, "Told Bo: 8pm the night before", and
  // the inbox's own line says the same, until the server takes the item away ("Nothing needs you right now" then).
  // Look-owned attributes only (data-pt-told); the card, its state and the inbox stay inbox.js's. ----
  const told = new Map();                                       // ask id -> receipt line
  const receipt = () => {
    const ib = document.getElementById('inbox'); if (!ib) return;
    const live = new Set([...ib.querySelectorAll('[data-action]')].map(e => e.dataset.action));
    for (const id of [...told.keys()]) if (!live.has(id)) told.delete(id);
    ib.querySelectorAll('[data-component="inbox-action"][data-action]').forEach(c => {
      const t = told.get(c.dataset.action);
      if (!t) { delete c.dataset.ptTold; c.querySelector(':scope > [data-pt-receipt]')?.remove(); return; }
      c.dataset.ptTold = '';
      if (!c.querySelector(':scope > [data-pt-receipt]')) { const r = document.createElement('p'); r.dataset.ptReceipt = ''; r.textContent = t; c.appendChild(r); }
    });
    const now = ib.querySelector('[data-slot="now"]');
    if (now) { const t = now.dataset.action && told.get(now.dataset.action); if (t) now.dataset.ptTold = t; else delete now.dataset.ptTold; }
  };
  B.on('action.yes', ev => {
    const c = document.querySelector(`[data-component="inbox-action"][data-action="${CSS.escape(String(ev.id))}"]`);
    const name = WHO[c && c.dataset.seat] || 'the team';
    told.set(String(ev.id), `Told ${name}: ${few(ev.choice || 'yes', 10)}`); receipt();
  });
  B.on('reset', () => { told.clear(); receipt(); });
  { const ib = document.getElementById('inbox'); if (ib) new MutationObserver(() => { if (told.size || ib.querySelector('[data-pt-told]')) receipt(); }).observe(ib, { childList: true, subtree: true }); }

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
        inbox.dataset.ptLanded = ''; setTimeout(() => { delete inbox.dataset.ptLanded; }, 2600);   // the inbox pulse's rise + ink redraw, now
      });
    }, 1400);                                                  // the note is up in their hand first
    setTimeout(() => { delete inbox.dataset.ptAwaiting; }, 6000);   // never leave it hidden
  });
  // ---- 4. bug fixes from testing, last so they win over painted.css (selectors on data-* only) ----
  css('painted-fixes.css');
})();
