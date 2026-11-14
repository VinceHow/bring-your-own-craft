// Her flow: lines snap into boxes, arrows draw, and the team's asks arrive inside it as forks and pins.
// Provides BYOC.flow.{mount, addLine, render, showAsk, answer, pin, noteEditor}.
// Needs from the room: BYOC.api(path, body?), BYOC.on(type, fn) (optional), BYOC.run, BYOC.replay.
(function () {
  const B = (window.BYOC = window.BYOC || {});
  const SVG = 'http://www.w3.org/2000/svg';
  const INK = { product: '#FF48B0', design: '#0078BF', engineering: '#FFE800', data: '#00A95C', research: '#FF6C2F', strategy: '#BB8B41' };
  const BOX_W = 200, COL = 250, PAD = 24, ROW_GAP = 40;

  // Load flow.css next to this script (index.html only loads the scripts).
  const here = document.currentScript && document.currentScript.src;
  if (here && !document.querySelector('link[data-byoc="flow"]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = new URL('flow.css', here).href; l.dataset.byoc = 'flow';
    document.head.appendChild(l);
  }

  const S = { host: null, wrap: null, canvas: null, svg: null, nodes: new Map(), edges: [], drawn: new Set(), items: [], lines: [], subscribed: false };

  // Motion: springs from window.motion if the room loaded it, else a CSS transition under 150ms.
  function settle(el, from, to) {
    const m = window.motion || window.Motion;
    if (m && typeof m.animate === 'function') {
      // Spring to the same transform functions at rest: animating to 'none' ends at scale(0) and hides the box.
      const rest = to === 'none' ? from.replace(/translate([XY]?)\([^)]*\)/g, (_, ax) => ax ? `translate${ax}(0px)` : 'translate(0px, 0px)')
        .replace(/scale\([^)]*\)/g, 'scale(1)').replace(/rotate\([^)]*\)/g, 'rotate(0deg)') : to;
      try { m.animate(el, { transform: [from, rest] }, { type: 'spring', stiffness: 500, damping: 30 }); return; } catch (e) {}
    }
    el.style.transition = 'none';
    el.style.transform = from;
    el.getBoundingClientRect();
    el.style.transition = 'transform 140ms cubic-bezier(.2,1.3,.4,1)';
    el.style.transform = to;
  }
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const sv = (tag, attrs) => { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const seatInk = seat => INK[seat] || '#141414';
  const seatName = seat => (seat || 'team').toUpperCase();

  function mount(el) {
    S.host = el;
    el.classList.add('fl-host');
    el.innerHTML = '';
    S.wrap = h('div', 'fl-wrap');
    S.canvas = h('div', 'fl-canvas');
    S.svg = sv('svg', { class: 'fl-svg', 'aria-hidden': 'true' });
    const defs = sv('defs', {});
    for (const [id, color] of [['fl-arrow', '#141414'], ['fl-arrow-pink', INK.product]]) {
      const mk = sv('marker', { id, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
      mk.appendChild(sv('path', { d: 'M0,0 L10,5 L0,10 z', fill: color }));
      defs.appendChild(mk);
    }
    S.svg.appendChild(defs);
    S.canvas.appendChild(S.svg);
    S.wrap.appendChild(S.canvas);
    el.appendChild(S.wrap);
    // The lens: the one open ask, zoomed to a readable size over her flow, anchored next to its box (never a modal).
    S.lens = h('div', 'fl-lens');
    el.appendChild(S.lens);
    S.nodes = new Map(); S.edges = []; S.drawn = new Set(); S.items = []; S.lines = []; S.focus = null;
    S.breath = false; clearTimeout(S.breathTimer); S.checkinKey = ''; S.autoFirst = true;
    document.dispatchEvent(new CustomEvent('byoc:checkin', { detail: { open: null, breath: false, waiting: [] } }));
    if (!S.subscribed && typeof B.on === 'function') {
      S.subscribed = true;
      B.on('flow.line', ev => ev.nodes && render(ev));
      B.on('ask', ev => showAsk(ev));
      B.on('answer', ev => markAnswer(ev.askId, ev.choice));
      B.on('pin', ev => addPinNote(ev.nodeId, ev.text));
    }
    if (!S.resizeBound) { S.resizeBound = true; window.addEventListener('resize', () => S.canvas && layout()); }
    layout();
    return el;
  }

  // She writes a line; the server parses and logs it; we draw what comes back.
  async function addLine(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    S.lines.push(t);
    const g = await B.api('/api/run/' + B.run + '/line', { text: t });
    render(g);
    return g;
  }

  // Draw the whole graph; only boxes and arrows not seen before animate in.
  function render(g) {
    if (!S.canvas || !g || !Array.isArray(g.nodes)) return;
    const fresh = [];
    for (const n of g.nodes) {
      let rec = S.nodes.get(n.id);
      if (!rec) {
        const el = h('button', 'fl-box');
        el.type = 'button';
        el.dataset.node = n.id;
        el.appendChild(h('span', 'fl-label', n.label));
        el.addEventListener('click', () => startPin(n.id));
        S.canvas.appendChild(el);
        rec = { id: n.id, el };
        S.nodes.set(n.id, rec);
        fresh.push(rec);
      }
      if (rec.label !== n.label) { rec.label = n.label; rec.el.querySelector('.fl-label').textContent = n.label; rec.el.title = 'Pin a note on "' + n.label + '"'; }
    }
    S.edges = (g.edges || []).filter(e => S.nodes.has(e.from) && S.nodes.has(e.to));
    layout();
    for (const r of fresh) settle(r.el, 'translateY(-10px) scale(0.94) rotate(-2deg)', 'translateY(0px) scale(1) rotate(0deg)');
  }

  // Columns by order along the arrows; a branch drops to the next free row under its parent.
  function place() {
    const cells = new Set();
    const ids = [...S.nodes.keys()];
    const pos = new Map();
    for (const id of ids) {
      const inc = S.edges.find(e => e.to === id && pos.has(e.from));
      let col = 0, row = 0;
      if (inc) {
        const p = pos.get(inc.from);
        col = p.col + 1; row = p.row;
        while (cells.has(row + ':' + col)) row++;
      } else if (pos.size) {
        row = Math.max(...[...pos.values()].map(p => p.row)) + 1;
        while (cells.has(row + ':' + col)) row++;
      }
      cells.add(row + ':' + col);
      pos.set(id, { col, row });
    }
    return pos;
  }

  function layout() {
    if (!S.canvas) return;
    const pos = place();
    const rows = new Map();
    for (const [id, p] of pos) { const r = S.nodes.get(id); Object.assign(r, p); (rows.get(p.row) || rows.set(p.row, []).get(p.row)).push(r); }
    for (const r of S.nodes.values()) { r.el.style.width = BOX_W + 'px'; r.el.style.height = ''; }
    let y = PAD;
    const rowNums = [...rows.keys()].sort((a, b) => a - b);
    for (const rn of rowNums) {
      const boxes = rows.get(rn);
      const bh = Math.max(64, ...boxes.map(b => b.el.offsetHeight));
      for (const b of boxes) {
        b.x = PAD + b.col * COL; b.y = y; b.w = BOX_W; b.h = bh;
        Object.assign(b.el.style, { left: b.x + 'px', top: b.y + 'px', height: bh + 'px' });
      }
      // Notes and forks for this row hang under their box, never overlapping each other.
      let bottom = y + bh;
      const placed = [];
      const ids = new Set(boxes.map(b => b.id));
      // Notes go first so they stay on their box; forks have a stem, so they can move.
      const mine = S.items.filter(i => ids.has(i.nodeId));
      // The open ask is placed first (it's the biggest); the short notes fit around it.
      const isOpen = i => i.el.classList.contains('is-open');
      const waiting = i => i.ask && !i.answered && !isOpen(i);
      for (const it of [...mine.filter(waiting), ...mine.filter(i => !isOpen(i) && !waiting(i) && i.kind !== 'fork'), ...mine.filter(i => !isOpen(i) && !waiting(i) && i.kind === 'fork')]) {
        const b = S.nodes.get(it.nodeId);
        const w = it.el.offsetWidth, ih = it.el.offsetHeight;
        // An ask still waiting isn't on her flow at all (focus time: nothing queued shows); it waits in the tray at
        // her seat, which the room shows only between check-ins.
        it.badge = it.ask && !it.answered && !isOpen(it);
        if (it.badge) { it.left = null; continue; }
        let left = it.kind === 'fork' ? b.x + b.w / 2 - 40 : b.x + 24;
        let top = it.kind === 'fork' ? b.y + b.h + 30 : b.y + b.h - 16;
        // A closed note goes beside its box when nothing sits to its right in that row: the flow stays short.
        const rowBoxes = boxes.filter(o => o !== b);
        it.side = !it.el.classList.contains('is-open') && it.kind !== 'mine' && !rowBoxes.some(o => o.col === b.col + 1)
          && b.x + b.w + 40 + w + PAD <= Math.max(S.host.clientWidth || 0, b.x + b.w + 40 + w + PAD * 2) && !placed.some(p => p.side && p.nodeId === it.nodeId);
        if (it.side) { left = b.x + b.w + 40; top = b.y - 6; }
        // On a clash, move beside the other note if the sheet has room; only then below it.
        const maxW = Math.max(PAD * 2 + BOX_W + COL * Math.max(0, ...[...S.nodes.values()].map(n => n.col || 0)), (S.host.clientWidth || 0));
        if (left + w + PAD > maxW) left = Math.max(PAD, maxW - w - PAD);
        for (let guard = 0; guard < 20; guard++) {
          const hit = placed.find(p => !p.badge && left < p.left + p.w + 14 && p.left < left + w + 14 && top < p.top + p.h + 14 && p.top < top + ih + 14);
          if (!hit) break;
          const right = hit.left + hit.w + 24, back = hit.left - w - 24;
          if (right + w + PAD <= maxW) left = right;
          else if (back >= PAD && !placed.some(p => !p.badge && back < p.left + p.w + 14 && p.left < back + w + 14 && top < p.top + p.h + 14 && p.top < top + ih + 14)) left = back;
          else top = hit.top + hit.h + 18;
        }
        Object.assign(it.el.style, { left: left + 'px', top: top + 'px' });
        it.left = left; it.top = top; it.w = w; it.h = ih;
        placed.push(it);
        bottom = Math.max(bottom, top + ih);
      }
      y = bottom + ROW_GAP;
    }
    let W = PAD * 2 + BOX_W, H = Math.max(y, 120);
    for (const b of S.nodes.values()) W = Math.max(W, b.x + b.w + PAD);
    for (const it of S.items) if (it.left != null) W = Math.max(W, it.left + it.w + PAD);
    S.canvas.style.width = W + 'px';
    S.canvas.style.height = H + 'px';
    S.svg.setAttribute('width', W); S.svg.setAttribute('height', H);
    S.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // Fit the host by width and height; never scroll. (Only the ask she's on is open, so this stays near 1.)
    const availW = S.host.clientWidth || W, availH = S.host.clientHeight || H;
    const k = Math.min(1, availW / W, availH / H);
    S.k = k;
    placeLens(k, availW, availH);
    S.canvas.style.transform = k < 1 ? `scale(${k})` : '';
    S.wrap.style.height = H * k + 'px';
    drawEdges();
  }

  // The open ask sits in the lens at its own size (not scaled with the flow): below its box if it fits, else above,
  // else beside; kept inside her sheet.
  function placeLens(k, availW, availH) {
    const it = S.items.find(i => i.el.parentNode === S.lens);
    if (!it) return;
    const b = S.nodes.get(it.nodeId); if (!b || b.x == null) return;
    const w = it.el.offsetWidth, ih = it.el.offsetHeight, gap = 14;
    const bx = b.x * k, by = b.y * k, bw = b.w * k, bh = b.h * k;
    const cx = x => Math.max(4, Math.min(x, availW - w - 4)), cy = y => Math.max(0, Math.min(y, availH - ih));
    // Spots next to its box: below, above, right, left. It may cover some of her flow; pick the spot that covers
    // least of the boxes and her answered notes (never her own box), then the nearest.
    const spots = [[cx(bx + bw / 2 - 60), cy(by + bh + gap)], [cx(bx + bw / 2 - 60), cy(by - ih - gap)],
      [cx(bx + bw + gap), cy(by)], [cx(bx - gap - w), cy(by)],
      [cx(0), cy(by + bh + gap)], [cx(availW), cy(by + bh + gap)], [cx(0), cy(availH)], [cx(availW), cy(availH)]];
    const rects = [...[...S.nodes.values()].map(n => ({ x: n.x * k, y: n.y * k, w: n.w * k, h: n.h * k, mine: n === b })),
      ...S.items.filter(i => i !== it && i.left != null && i.el.parentNode === S.canvas)
        .map(i => ({ x: i.left * k, y: i.top * k, w: i.w * k, h: i.h * k, weight: i.answered ? 4 : i.badge ? 0.5 : 2 }))];
    const cover = ([x, y]) => rects.reduce((sum, r) => {
      const ox = Math.max(0, Math.min(x + w, r.x + r.w) - Math.max(x, r.x)), oy = Math.max(0, Math.min(y + ih, r.y + r.h) - Math.max(y, r.y));
      return sum + ox * oy * (r.mine ? 50 : r.weight || 1);
    }, 0);
    const dist = ([x, y]) => Math.hypot(x - bx, y - (by + bh));
    const [left, top] = spots.map(p => [p, cover(p), dist(p)]).sort((a, c) => (a[1] - c[1]) || (a[2] - c[2]))[0][0];
    Object.assign(it.el.style, { left: left + 'px', top: top + 'px' });
    // In canvas units, for the stem drawn in the flow's own svg.
    it.left = left / k; it.top = top / k; it.w = w / k; it.h = ih / k;
  }

  function edgePath(a, b) {
    const amy = a.y + a.h / 2, bmy = b.y + b.h / 2;
    if (b.row === a.row && b.col > a.col) return { d: `M${a.x + a.w},${amy} H${b.x - 3}`, lx: (a.x + a.w + b.x) / 2, ly: amy - 10 };
    if (b.row > a.row) { const sx = a.x + 28; return { d: `M${sx},${a.y + a.h} V${bmy} H${b.x - 3}`, lx: sx + 8, ly: bmy - 10 }; }
    if (b.row < a.row) { const ex = b.x + b.w - 28; return { d: `M${a.x + a.w},${amy} H${ex} V${b.y + b.h + 3}`, lx: (a.x + a.w + ex) / 2, ly: amy - 10 }; }
    const dy = Math.max(a.y + a.h, b.y + b.h) + 30;
    return { d: `M${a.x + a.w / 2},${a.y + a.h} V${dy} H${b.x + b.w / 2} V${b.y + b.h + 3}`, lx: (a.x + b.x) / 2 + a.w / 2, ly: dy - 8 };
  }

  function drawEdges() {
    S.svg.querySelectorAll('.fl-edge, .fl-elabel, .fl-fpath').forEach(e => e.remove());
    for (const e of S.edges) {
      const a = S.nodes.get(e.from), b = S.nodes.get(e.to);
      if (a.x == null || b.x == null) continue;
      const p = edgePath(a, b);
      const path = sv('path', { d: p.d, class: 'fl-edge', 'marker-end': 'url(#fl-arrow)' });
      S.svg.appendChild(path);
      const key = e.from + '>' + e.to;
      if (!S.drawn.has(key)) { S.drawn.add(key); drawIn(path); }
      if (e.label) { const t = sv('text', { x: p.lx, y: p.ly, class: 'fl-elabel' }); t.textContent = e.label; S.svg.appendChild(t); }
    }
    for (const it of S.items) if (it.kind === 'fork') drawFork(it);
  }

  function drawIn(path) {
    let len = 0; try { len = path.getTotalLength(); } catch (e) {}
    if (!len) return;
    path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
    path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset 140ms ease-out';
    path.style.strokeDashoffset = 0;
    setTimeout(() => { path.style.strokeDasharray = ''; path.style.transition = ''; }, 200);
  }

  // Offset of a descendant inside the canvas (offsets ignore the fit-to-width scale).
  function off(el) {
    let x = 0, y = 0, e = el;
    while (e && e !== S.canvas) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }

  function drawFork(it) {
    const b = S.nodes.get(it.nodeId);
    if (!b || it.left == null || it.badge) return;
    if (it.el.parentNode === S.lens) { drawLensStem(it, b); return; }
    const q = off(it.el.querySelector('.fl-q'));
    const ink = seatInk(it.ask.seat);
    const stem = it.side
      ? sv('path', { d: `M${b.x + b.w},${b.y + b.h / 2} C${b.x + b.w + 20},${b.y + b.h / 2} ${q.x - 20},${q.y + q.h / 2} ${q.x},${q.y + q.h / 2}`, class: 'fl-fpath fl-stem' })
      : sv('path', { d: `M${b.x + b.w / 2},${b.y + b.h} C${b.x + b.w / 2},${b.y + b.h + 20} ${q.x + 30},${q.y - 20} ${q.x + 30},${q.y}`, class: 'fl-fpath fl-stem' });
    stem.style.stroke = ink === '#FFE800' ? '#141414' : ink;
    S.svg.appendChild(stem);
    const sx = q.x + 30, sy = q.y + q.h;
    for (const opt of it.el.querySelectorAll('.fl-opt')) {
      if (!opt.offsetWidth) continue; // a closed ask hides the options she isn't looking at
      const o = off(opt);
      const ex = o.x + o.w / 2, ey = o.y;
      const cls = ['fl-fpath'];
      if (opt.classList.contains('is-rec')) cls.push('is-rec');
      if (opt.classList.contains('is-chosen')) cls.push('is-chosen');
      if (opt.classList.contains('is-dropped')) cls.push('is-dropped');
      const p = sv('path', { d: `M${sx},${sy} C${sx},${sy + 22} ${ex},${ey - 26} ${ex},${ey - 3}`, class: cls.join(' '),
        'marker-end': opt.classList.contains('is-chosen') ? 'url(#fl-arrow-pink)' : 'url(#fl-arrow)' });
      S.svg.appendChild(p);
      if (!it.drawn) drawIn(p);
    }
    it.drawn = true;
  }

  // A line from the box to the zoomed ask, so it reads as part of her flow.
  function drawLensStem(it, b) {
    const ink = seatInk(it.ask.seat);
    const above = it.top + it.h <= b.y, beside = !above && it.top < b.y + b.h;
    const from = above ? [b.x + b.w / 2, b.y] : beside ? [it.left > b.x ? b.x + b.w : b.x, b.y + b.h / 2] : [b.x + b.w / 2, b.y + b.h];
    const to = above ? [it.left + 40, it.top + it.h] : beside ? [it.left > b.x ? it.left : it.left + it.w, it.top + 30] : [it.left + 40, it.top];
    const stem = sv('path', { d: `M${from[0]},${from[1]} L${to[0]},${to[1]}`, class: 'fl-fpath fl-stem fl-lens-stem' });
    stem.style.stroke = ink === '#FFE800' ? '#141414' : ink;
    S.svg.appendChild(stem);
  }

  function targetNode(id) {
    if (id && S.nodes.has(id)) return id;
    const ids = [...S.nodes.keys()];
    return ids[ids.length - 1] || null;
  }

  // "Research: found <source>. It's your call: ..." Built only from what the run logged: the seat, its source if any,
  // and the selector's reasons for bringing it to her (score: in her seat, how much it changes, her file silent).
  function voiceLine(ask) {
    const sc = ask.score || {};
    const name = (ask.seat || 'team').replace(/^./, c => c.toUpperCase());
    const parts = [];
    parts.push(sc.inSeat === false ? 'it’s costly to undo' : 'it’s your craft');
    if ((sc.changes || 0) >= 2) parts.push('it changes the journey'); else if (sc.changes) parts.push('it changes what customers get');
    if (sc.silent) parts.push('your file doesn’t say yet');
    const why = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts.at(-1) : parts[0];
    const v = h('div', 'fl-voice');
    v.appendChild(h('b', 'fl-voice-who', name + ': '));
    v.appendChild(document.createTextNode(`${ask.source && ask.source.title ? `“I found this: ${ask.source.title}. ` : '“'}Your call, because ${why}.”`));
    return v;
  }

  // One of her three: a fork off a box, or a note pinned on one.
  function showAsk(ask) {
    if (!ask || !S.canvas) return null;
    if (S.items.some(i => i.ask && i.ask.id === ask.id)) return null;
    const nodeId = targetNode(ask.attachTo);
    if (!nodeId) return null;
    const kind = ask.kind === 'pin' ? 'pin' : 'fork';
    const el = h('div', 'fl-item fl-' + kind);
    el.dataset.seat = ask.seat || '';
    el.dataset.ask = ask.id;
    el.style.setProperty('--seat', seatInk(ask.seat));
    const q = h('div', 'fl-q');
    q.title = ask.decision;
    q.appendChild(h('span', 'fl-tag', seatName(ask.seat)));
    q.appendChild(h('span', 'fl-qtext', ask.decision));
    if (kind === 'pin') el.appendChild(h('span', 'fl-pinhead'));
    el.appendChild(q);
    // The check-in in its teammate's voice: what it found, and why this one is hers (DEMO 1:15).
    el.appendChild(voiceLine(ask));
    const opts = h('div', 'fl-opts');
    (ask.options || []).forEach((o, i) => {
      const btn = h('button', 'fl-opt');
      btn.type = 'button';
      btn.dataset.choice = o;
      if (o === ask.recommendation) { btn.classList.add('is-rec'); btn.appendChild(h('span', 'fl-rec', 'TEAM RECOMMENDS')); }
      btn.appendChild(h('span', 'fl-otext', o));
      btn.style.setProperty('--tilt', (kind === 'fork' ? (i % 2 ? 1.5 : -1.2) : 0) + 'deg');
      btn.addEventListener('click', () => answer(ask.id, o));
      opts.appendChild(btn);
    });
    el.appendChild(opts);
    if (ask.reason) el.appendChild(h('div', 'fl-why', 'Why we’d go that way: ' + ask.reason));
    if (ask.source && ask.source.title) {
      const s = h('div', 'fl-src');
      s.appendChild(h('span', 'fl-src-k', 'Researched before the demo: '));
      s.appendChild(h('span', null, ask.source.title));
      el.appendChild(s);
    }
    el.appendChild(h('div', 'fl-status'));
    S.canvas.appendChild(el);
    const it = { kind, nodeId, el, ask };
    S.items.push(it);
    // A closed ask opens when she clicks it (she can take them in any order).
    el.addEventListener('click', e => {
      if (it.answered || el.classList.contains('is-open')) return;
      e.preventDefault(); e.stopPropagation(); S.focus = ask.id; refocus();
    }, true);
    refocus();
    const rest = kind === 'pin' ? 'rotate(1.6deg)' : 'none';
    settle(el, 'translate(36px,-24px) rotate(5deg)', rest);
    return el;
  }

  // Only one ask is open at a time, full size: the one she picked, else the first she hasn't answered.
  // The rest stay on their boxes as short notes; an answered one keeps her call and the struck recommendation.
  // Focus time: one check-in at a time. The team's first opens by itself; after that nothing opens until she picks a
  // note from the tray at her seat (DEMO 1:15: "she picks the next note from her tray when she's ready"). A replay
  // plays the recorded order: the next opens after a ~1 s breath. The room hears 'byoc:checkin' { open, waiting }.
  const BREATH_MS = 1000;
  function refocus(doLayout = true) {
    const open = S.items.filter(i => i.ask && !i.answered);
    let cur = S.breath ? null : (open.find(i => i.ask.id === S.focus) || null);
    if (!cur && !S.breath && (S.autoFirst || B.replay) && open.length) { cur = open[0]; S.focus = cur.ask.id; S.autoFirst = false; }
    const moves = [];
    for (const i of S.items) if (i.ask) {
      i.el.classList.toggle('is-open', i === cur);
      i.el.classList.toggle('checkin-open', i === cur); // polish's hook: the one thing lit in her focus time
      i.el.classList.toggle('is-waiting', !i.answered && i !== cur);
      const want = i === cur ? S.lens : S.canvas;
      if (want && i.el.parentNode !== want) { moves.push([i.el, i.el.isConnected ? i.el.getBoundingClientRect() : null]); want.appendChild(i.el); }
    }
    layout();
    // Zoom in and spring back: each moved ask springs from where it was to where it now sits.
    for (const [el, r0] of moves) {
      if (!r0 || !r0.width) continue;
      const r1 = el.getBoundingClientRect(); if (!r1.width) continue;
      const sc = r0.width / r1.width;
      settle(el, `translate(${(r0.left - r1.left) / (el.parentNode === S.lens ? 1 : (S.k || 1))}px, ${(r0.top - r1.top) / (el.parentNode === S.lens ? 1 : (S.k || 1))}px) scale(${sc.toFixed(3)})`, 'none');
    }
    const key = (cur ? cur.ask.id : '') + '|' + open.filter(i => i !== cur).map(i => i.ask.id).join(',');
    if (key !== S.checkinKey) {
      S.checkinKey = key;
      document.dispatchEvent(new CustomEvent('byoc:checkin', { detail: {
        open: cur ? cur.ask.id : null, breath: !!S.breath,
        waiting: open.filter(i => i !== cur).map(i => ({ id: i.ask.id, seat: i.ask.seat, decision: i.ask.decision })) } }));
    }
  }
  // She picks a waiting note from the tray: it opens now (ends the breath).
  function openCheckin(askId) {
    const it = S.items.find(i => i.ask && i.ask.id === askId && !i.answered);
    if (!it) return false;
    S.focus = askId; S.breath = false; clearTimeout(S.breathTimer); refocus(); return true;
  }

  async function answer(askId, choice) {
    const it = S.items.find(i => i.ask && i.ask.id === askId);
    if (!it || it.answered) return;
    if (B.replay) return; // a replay shows her recorded answer from the log; clicks change nothing
    it.answered = true;
    markAnswer(askId, choice);
    try {
      await B.api('/api/run/' + B.run + '/answer', { askId, choice });
    } catch (e) {
      it.answered = false;
      it.el.classList.remove('is-answered');
      it.el.querySelectorAll('.fl-opt').forEach(o => o.classList.remove('is-chosen', 'is-dropped'));
      it.el.querySelector('.fl-status').textContent = 'Not saved. Try again.';
      drawEdges();
    }
  }

  function markAnswer(askId, choice) {
    const it = S.items.find(i => i.ask && i.ask.id === askId);
    if (!it) return;
    it.answered = true;
    it.el.classList.add('is-answered');
    it.el.querySelector('.fl-status').textContent = '';
    it.el.querySelectorAll('.fl-opt').forEach(o => {
      const mine = o.dataset.choice === choice;
      o.classList.toggle('is-chosen', mine);
      o.classList.toggle('is-dropped', !mine);
      const tag = o.querySelector('.fl-yours');
      if (mine && !tag) o.insertBefore(h('span', 'fl-yours', 'YOUR CALL'), o.firstChild);
    });
    if (S.focus === askId) S.focus = null;
    // A short breath before the next check-in.
    S.breath = true; clearTimeout(S.breathTimer);
    S.breathTimer = setTimeout(() => { S.breath = false; refocus(); }, BREATH_MS);
    refocus();
  }

  // Her own note on a box.
  function addPinNote(nodeId, text) {
    if (!S.canvas || !S.nodes.has(nodeId)) return null;
    if (S.items.some(i => i.kind === 'mine' && i.nodeId === nodeId && i.text === text)) return null;
    const el = h('div', 'fl-item fl-mine');
    el.appendChild(h('span', 'fl-pinhead'));
    el.appendChild(h('div', 'fl-tag', 'YOUR NOTE'));
    el.appendChild(h('div', 'fl-mtext', text));
    S.canvas.appendChild(el);
    S.items.push({ kind: 'mine', nodeId, el, text });
    layout();
    settle(el, 'translate(30px,-20px) rotate(-6deg)', 'rotate(-2deg)');
    return el;
  }

  async function pin(nodeId, text) {
    const t = String(text || '').trim();
    if (!t || !S.nodes.has(nodeId)) return null;
    addPinNote(nodeId, t);
    if (B.replay) return null;
    const res = await B.api('/api/run/' + B.run + '/pin', { nodeId, text: t });
    document.dispatchEvent(new CustomEvent('byoc:pin', { detail: { nodeId, text: t, result: res } }));
    return res;
  }

  // A blank sticky note she writes on, placed inside `host` (a box's canvas or a sketch frame).
  // Enter saves, Escape drops it. Resolves to the text, or null.
  function noteEditor(host, { left = 24, top = 24 } = {}) {
    return new Promise(resolve => {
      const el = h('div', 'fl-item fl-mine fl-draft');
      el.appendChild(h('span', 'fl-pinhead'));
      el.appendChild(h('div', 'fl-tag', 'YOUR NOTE'));
      const ta = h('textarea', 'fl-input');
      ta.rows = 3; ta.placeholder = 'Write a note';
      el.appendChild(ta);
      Object.assign(el.style, { left: left + 'px', top: top + 'px' });
      host.appendChild(el);
      settle(el, 'translate(30px,-20px) rotate(-6deg)', 'rotate(-2deg)');
      ta.focus();
      let done = false;
      const finish = v => { if (done) return; done = true; el.remove(); resolve(v); };
      ta.addEventListener('keydown', e => {
        e.stopPropagation(); // keep the room's beat keys away while she types
        if (e.key === 'Escape') finish(null);
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(ta.value.trim() || null); }
      });
      ta.addEventListener('blur', () => setTimeout(() => finish(ta.value.trim() || null), 0));
    });
  }

  async function startPin(nodeId) {
    if (B.replay || S.drafting) return;
    const b = S.nodes.get(nodeId);
    S.drafting = true;
    const text = await noteEditor(S.canvas, { left: b.x + 24, top: b.y + b.h - 16 });
    S.drafting = false;
    if (text) { try { await pin(nodeId, text); } catch (e) { console.error('pin not saved', e); } }
  }

  B.flow = { mount, addLine, render, showAsk, answer, markAnswer, pin, addPinNote, noteEditor, openCheckin, _state: S };
})();
