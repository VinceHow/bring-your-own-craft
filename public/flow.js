// Her flow: lines snap into boxes, arrows draw, and the team's asks arrive inside it as forks and pins.
// Provides BYOC.flow.{mount, addLine, render, showAsk, answer, pin, noteEditor}.
// Needs from the room: BYOC.api(path, body?), BYOC.on(type, fn) (optional), BYOC.run, BYOC.replay.
(function () {
  const B = (window.BYOC = window.BYOC || {});
  const SVG = 'http://www.w3.org/2000/svg';
  const INK = { product: '#FF48B0', design: '#0078BF', engineering: '#FFE800', data: '#00A95C', research: '#FF6C2F' };
  const BOX_W = 200, COL = 280, PAD = 28, ROW_GAP = 56;

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
      try { m.animate(el, { transform: [from, to] }, { type: 'spring', stiffness: 500, damping: 30 }); el.style.transform = to; return; } catch (e) {}
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
    S.nodes = new Map(); S.edges = []; S.drawn = new Set(); S.items = []; S.lines = [];
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
      for (const it of [...mine.filter(i => i.kind !== 'fork'), ...mine.filter(i => i.kind === 'fork')]) {
        const b = S.nodes.get(it.nodeId);
        const w = it.el.offsetWidth, ih = it.el.offsetHeight;
        let left = it.kind === 'fork' ? b.x + b.w / 2 - 40 : b.x + 24;
        let top = it.kind === 'fork' ? b.y + b.h + 30 : b.y + b.h - 16;
        for (let guard = 0; guard < 20; guard++) {
          const hit = placed.find(p => left < p.left + p.w + 14 && p.left < left + w + 14 && top < p.top + p.h + 14 && p.top < top + ih + 14);
          if (!hit) break;
          top = hit.top + hit.h + 18;
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
    // Fit the host's width; never scroll sideways.
    const avail = S.host.clientWidth || W;
    const k = Math.min(1, avail / W);
    S.canvas.style.transform = k < 1 ? `scale(${k})` : '';
    S.wrap.style.height = H * k + 'px';
    drawEdges();
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
    if (!b || it.left == null) return;
    const q = off(it.el.querySelector('.fl-q'));
    const ink = seatInk(it.ask.seat);
    const stem = sv('path', { d: `M${b.x + b.w / 2},${b.y + b.h} C${b.x + b.w / 2},${b.y + b.h + 20} ${q.x + 30},${q.y - 20} ${q.x + 30},${q.y}`, class: 'fl-fpath fl-stem' });
    stem.style.stroke = ink === '#FFE800' ? '#141414' : ink;
    S.svg.appendChild(stem);
    const sx = q.x + 30, sy = q.y + q.h;
    for (const opt of it.el.querySelectorAll('.fl-opt')) {
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

  function targetNode(id) {
    if (id && S.nodes.has(id)) return id;
    const ids = [...S.nodes.keys()];
    return ids[ids.length - 1] || null;
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
    el.style.setProperty('--seat', seatInk(ask.seat));
    const q = h('div', 'fl-q');
    q.appendChild(h('span', 'fl-tag', seatName(ask.seat)));
    q.appendChild(h('span', 'fl-qtext', ask.decision));
    if (kind === 'pin') el.appendChild(h('span', 'fl-pinhead'));
    el.appendChild(q);
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
    if (ask.reason) el.appendChild(h('div', 'fl-why', ask.reason));
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
    layout();
    const rest = kind === 'pin' ? 'rotate(1.6deg)' : 'none';
    settle(el, 'translate(36px,-24px) rotate(5deg)', rest);
    return el;
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
    layout();
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

  B.flow = { mount, addLine, render, showAsk, answer, markAnswer, pin, addPinNote, noteEditor, _state: S };
})();
