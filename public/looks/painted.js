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
  // (QA #30) when the meeting's takeaways land, the column brings the whole card into view, Keep included and clear of
  // the column's soft foot fade: its bottom if the card fits, else its top
  { const side0 = fdoc && fdoc.querySelector(':scope > [data-slot="side"]'), card0 = side0 && side0.querySelector('[data-component="takeaways"]');
    if (card0) new MutationObserver(() => {
      if (card0.dataset.state !== 'shown' || card0.hidden) return;
      setTimeout(() => {
        const top = card0.offsetTop - 12, bottom = card0.offsetTop + card0.offsetHeight + 40;
        side0.scrollTo({ top: bottom - top <= side0.clientHeight ? bottom - side0.clientHeight : top, behavior: 'smooth' });
      }, 650);                                          // after focus-doc.js's own follow and the card's landing
    }).observe(card0, { attributes: true, attributeFilter: ['data-state', 'hidden'] }); }
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
    // No still night plate here: it sat over the living backdrop and froze the room at night (Vincent: "if I turn back to
    // Night, the painting stops moving completely"). The backdrop's own night video is the night look.
    try { window.PlayfulInk.mount(box, { music: base + 'cast/music', time: night ? 'night' : 'day' }); }
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
    // her sheet opened large (QA #7): the journey's drawn layout scaled to fit the sheet's width, never running off the right
    const fitOpen = () => {
      const canvas = flowHost.querySelector('[data-component="journey"] > div:has(> [data-slot="box"])'); if (!canvas) return;
      if (sheet.dataset.open !== 'true') { canvas.style.removeProperty('scale'); canvas.style.removeProperty('transform-origin'); return; }
      const boxes = [...canvas.querySelectorAll(':scope > [data-slot="box"]')]; if (!boxes.length) return;
      const need = Math.max(...boxes.map(b => b.offsetLeft + b.offsetWidth)) + 24, avail = flowHost.clientWidth;
      const k = Math.min(1, avail / need);
      canvas.style.transformOrigin = '0 0'; canvas.style.scale = String(Math.round(k * 1000) / 1000);
    };
        let t = null; const soon = () => { clearTimeout(t); t = setTimeout(() => { fit(); fitOpen(); }, 60); };
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
    if (!M || !inbox || inbox.dataset.state === 'expanded' || focusOpen || B.replay === 'instant' || !HAND[ev.seat] || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const [hx, hy] = HAND[ev.seat];
    inbox.dataset.ptAwaiting = '';
    setTimeout(() => {
      if (inbox.dataset.state === 'expanded' || inbox.hidden) { delete inbox.dataset.ptAwaiting; return; }   // she opened it meanwhile: no flight
      const r = room.getBoundingClientRect(), k = r.width / 1600, ib = inbox.getBoundingClientRect();
      const x1 = (ib.left - r.left) / k + 40, y1 = (ib.top - r.top) / k + 6;
      const n = document.createElement('div'); n.dataset.component = 'note-flight'; n.dataset.seat = ev.seat;
      const who = document.createElement('b'), txt = document.createElement('span'); who.dataset.slot = 'who'; txt.dataset.slot = 'text';
      who.textContent = WHO[ev.seat] || ''; txt.textContent = few(ev.question || ev.decision || '', 8); n.append(who, txt);
      room.appendChild(n);
      const x0 = hx - 100, y0 = hy - 30, mx = (x0 + x1) / 2 + 30, my = 600;
      M.animate(n, { opacity: [0, 1] }, { duration: .3 });
      M.animate(n, { x: [x0, mx, x1], y: [y0, my, y1], rotate: [-8, 4, -1], scale: [.8, .9, .7] }, { duration: 1.2, ease: [.45, .05, .3, 1], times: [0, .5, 1] }).finished.then(() => {
        n.remove(); delete inbox.dataset.ptAwaiting;
        inbox.dataset.ptLanded = ''; setTimeout(() => { delete inbox.dataset.ptLanded; }, 2600);   // the inbox pulse's rise + ink redraw, now
      });
    }, 300);                                                   // a beat with the note up in their hand
    setTimeout(() => { delete inbox.dataset.ptAwaiting; }, 3000);   // never leave it hidden
  });
  css('painted-door.css');
  // ---- the studio door opens at the reveal (door-open.mp4, 5 s), then crossfades into the room (0.6 s) ----
  // Full-bleed over the room in the room's own 16:9 box, so its crop matches the painting. The closed door (door.jpg)
  // is the layer's background until the first frame plays: never a white frame. The room and the run carry on
  // underneath. Never blocks: a load or play error, or no frame within 1.5 s, goes straight to the room; a tap skips.
  // Not for replays, jumps (BYOC.stage(n, {instant})), ?instant, or reduced motion.
  const DOOR = base + 'cast/intro/door-open.mp4';
  // The plaque in door-open.mp4 (1280 x 720) spans x 513-777, y 54-127; the lettering keeps 8% of its width clear each side.
  const DOOR_SIGN = `<svg data-slot="sign" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g font-family="Newsreader, Georgia, serif" font-weight="540" font-size="25" text-anchor="middle" textLength="214" lengthAdjust="spacing">
      <text x="645.8" y="99.9" fill="#FFE9C8" fill-opacity=".55" textLength="214" lengthAdjust="spacing">Bring your own craft</text>
      <text x="644.5" y="98.5" fill="#2A170C" fill-opacity=".35" textLength="214" lengthAdjust="spacing" data-slot="shade">Bring your own craft</text>
      <text x="645" y="99" fill="#4A2E1C" fill-opacity=".8" textLength="214" lengthAdjust="spacing" data-slot="ink">Bring your own craft</text>
    </g></svg>`;
  let doorVid = null;
  const doorPreload = () => { if (doorVid) return; doorVid = document.createElement('video');
    doorVid.muted = true; doorVid.playsInline = true; doorVid.preload = 'auto'; doorVid.src = DOOR; doorVid.load(); };
  // warm it up while she meets the team, so the first frame is ready at the reveal
  const doorSetup = room.querySelector('[data-component="setup"]');
  if (doorSetup) new MutationObserver(() => { if (doorSetup.dataset.step === 'team') doorPreload(); }).observe(doorSetup, { attributes: true, attributeFilter: ['data-step'] });
  B.on('reveal', ev => {
    if (!ev || !ev.animate || B.replay || new URLSearchParams(location.search).has('instant')
      || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    doorPreload();
    const v = doorVid; doorVid = null;          // a fresh one next time (a second reveal after a reset)
    const layer = document.createElement('div'); layer.dataset.component = 'door-open'; layer.dataset.state = 'opening';
    layer.setAttribute('aria-hidden', 'true');
    v.dataset.slot = 'clip'; layer.appendChild(v); room.appendChild(layer);
    // "Bring your own craft" carved into the plaque: drawn in the clip's own 1280 x 720 frame with the clip's cover crop
    // (xMidYMid slice), so it sits on the board at every window size. The board is still until ~0.6 s, then the doors
    // swing in front of it: the lettering shows once the clip plays and fades out by 1.0 s, before anything crosses it.
    layer.insertAdjacentHTML('beforeend', DOOR_SIGN);
    // The closed door holds for a beat (HOLD) with its plaque, so the name can be read, then the doors open.
    const HOLD = 1400;
    layer.dataset.sign = 'on';
    v.addEventListener('timeupdate', () => { if (v.currentTime >= 0.6 && layer.dataset.sign === 'on') layer.dataset.sign = 'off'; });
    let done = false, off = null;
    const finish = fade => { if (done) return; done = true; clearTimeout(guard);
      if (!fade) { layer.remove(); off && off(); return; }
      layer.dataset.state = 'leaving'; setTimeout(() => layer.remove(), 1100); };
    let guard = 0;
    v.addEventListener('ended', () => finish(true), { once: true });
    // the clip's interior isn't our studio: fade into the real room while the doors are still swinging open (~1.7 s)
    v.addEventListener('timeupdate', () => { if (v.currentTime >= 1.7) finish(true); });
    v.addEventListener('error', () => finish(false), { once: true });
    layer.addEventListener('click', () => finish(true));
    v.currentTime = 0;
    const hold = setTimeout(() => { if (done) return;
      guard = setTimeout(() => { if (v.currentTime === 0) finish(false); }, 1500);
      const p = v.play(); if (p && p.catch) p.catch(() => finish(false)); }, HOLD);
    layer.addEventListener('click', () => clearTimeout(hold), { once: true });
    off = B.on('reset', () => finish(false)); layer.addEventListener('transitionend', off, { once: true });
  });

  // ---- her cursor over clickable things: the folded paper-cut triangle (painted.css sets the everyday one) ----
  const CLICKABLE = 'a[href], button:not(:disabled), [role="button"], label, select, summary';
  let HOVER_CURSOR = '';
  document.addEventListener('mouseover', e => {
    HOVER_CURSOR = HOVER_CURSOR || getComputedStyle(document.documentElement).getPropertyValue('--pt-cursor-hover').trim();
    if (!HOVER_CURSOR) return;
    for (let el = e.target, i = 0; el && el.nodeType === 1 && i < 4; el = el.parentElement, i++) {
      if (el.dataset.ptCursor) return;
      if (el.matches(':disabled, [aria-disabled="true"], [aria-busy="true"], [data-state="tidying"], [data-state="busy"]')) return;   // their own cursor (not now / working)
      const c = getComputedStyle(el).cursor;
      if (c.startsWith('url(') && !c.includes('D47288')) return;      // someone else's cursor (the window's paw): leave it
      if (c === 'pointer' || el.matches(CLICKABLE)) { el.style.cursor = HOVER_CURSOR; el.dataset.ptCursor = '1'; return; }
      if (c !== 'auto' && !c.startsWith('url(') ) return;   // text, default, the window's paw: theirs
    }
  }, true);


  // ---- her words, tidied in place (builder 8's BYOC.tidyInto: data-raw, data-state tidying → tidied, data-tidy cut | reordered).
  // A look-owned overlay over the field shows the moment: cut words get an ink strike, fade and close up; a reordered line
  // dissolves into the clean one. The field holds the clean line all along; the overlay is decoration (aria-hidden) and goes.
  const TIDY_FIELDS = '[data-raw]';                    // any element showing her words that the tidy marks (fields or not)
  const words = s => String(s || '').trim().split(/\s+/).filter(Boolean);
  const norm = w => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
  function keptMask(raw, clean) {                       // LCS over normalised words: which raw words survive
    const a = raw.map(norm), b = clean.map(norm), n = a.length, m = b.length;
    const L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const keep = new Array(n).fill(false);
    for (let i = 0, j = 0; i < n && j < m;) { if (a[i] === b[j]) { keep[i] = true; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
    return keep;
  }
  function tidyMoment(el) {
    const raw = el.dataset.raw || '', clean = ('value' in el ? el.value : el.textContent) || '';
    if (el.dataset.tidy === 'skipped' || !raw || raw.trim() === clean.trim() || !el.offsetParent || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cs = getComputedStyle(el), ov = document.createElement('div');
    ov.dataset.component = 'tidy-moment'; ov.dataset.tidy = el.dataset.tidy || 'cut'; ov.setAttribute('aria-hidden', 'true');
    for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'color', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'textAlign'])
      ov.style[k] = cs[k];
    Object.assign(ov.style, { left: el.offsetLeft + 'px', top: el.offsetTop + 'px', width: el.offsetWidth + 'px', minHeight: el.offsetHeight + 'px' });
    if (el.tagName === 'INPUT') Object.assign(ov.style, { height: el.offsetHeight + 'px', whiteSpace: 'nowrap', overflow: 'hidden', display: 'flex', alignItems: 'center' });   // one line, like the field
    const rw = words(raw);
    if (ov.dataset.tidy === 'cut') {
      const keep = keptMask(rw, words(clean));
      ov.innerHTML = rw.map((w, i) => `<span data-slot="word"${keep[i] ? '' : ' data-state="cut"'}>${w.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])} </span>`).join('');
    } else {
      ov.textContent = raw;
    }
    el.offsetParent.appendChild(ov);
    ov.querySelectorAll('[data-slot="word"]').forEach(w => { w.style.maxWidth = w.offsetWidth + 'px'; });   // so the close-up is real
    el.dataset.ptTidy = 'hold';                                    // the field's clean text waits under the overlay
    requestAnimationFrame(() => requestAnimationFrame(() => { ov.dataset.state = 'go';
      ov.querySelectorAll('[data-slot="word"][data-state="cut"]').forEach(w => { w.style.maxWidth = '0px'; }); }));
    const total = ov.dataset.tidy === 'cut' ? 1650 : 1000;
    setTimeout(() => { el.dataset.ptTidy = 'show'; ov.dataset.leave = 'yes'; }, total - 350);
    setTimeout(() => { ov.remove(); delete el.dataset.ptTidy; }, total + 100);
  }
  new MutationObserver(ms => { for (const m of ms) { const el = m.target; if (el.matches && el.matches(TIDY_FIELDS) && el.dataset.state === 'tidied' && m.oldValue === 'tidying') tidyMoment(el); } })
    .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-state'], attributeOldValue: true });

  // ---- 4a. the table's layout: roles on the pills, her pill clear of the sheet, chatter clear of pills and faces ----
  css('painted-room.css');

  // ---- 4b. bug fixes from testing, last so they win over painted.css and painted-room.css (selectors on data-* only) ----
  css('painted-fixes.css');
  // which teammate's pad is open, as an attribute painted-fixes.css can read cheaply (its pill steps back meanwhile)
  const padOpen = seat => { if (seat) room.dataset.padOpen = seat; else delete room.dataset.padOpen; };
  B.on('seat.open', ev => padOpen(ev && ev.seat));
  B.on('workspace.open', () => padOpen(null));
  B.on('panel.close', () => padOpen(null));
  B.on('reset', () => padOpen(null));

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
