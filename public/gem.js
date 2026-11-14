// The gem: the idea as a stone on the table, six faces in the seat inks.
// A pure function of the run's log (BYOC.events / BYOC.on):
//   a teammate's face is cut by its own `decided` events (and its asks once she answers them),
//     as a share of everything that seat put forward (`candidate` events from it);
//   her face (Product) is polished only by her own `answer`s and `reshape`s;
//   at the symphony (`build.step`) every face is drawn in, and at `build.done` the gem turns into her page.
// While a check-in is open (`checkin.open` .. `checkin.close`) nothing here moves: changes wait until she answers.
// Two looks, the same numbers: the gem (default) and the cut line, six ink bars (?gem=bars, or if SVG fails).
(function () {
  'use strict';
  const BYOC = window.BYOC = window.BYOC || {};
  const SEATS = ['product', 'design', 'data', 'research', 'strategy', 'engineering'];
  const NAMES = { product: 'Product (you)', design: 'Design', data: 'Data', research: 'Research', strategy: 'Strategy', engineering: 'Engineering' };
  const INK = { product: '#FF48B0', design: '#0078BF', data: '#00A95C', research: '#FF6C2F', strategy: '#BB8B41', engineering: '#FFE800' };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const q = new URLSearchParams(location.search);
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- the numbers: a pure function of the events -------------------------------------------
  // Returns { stage: 'none'|'rough'|'cutting'|'symphony'|'page', cut: {seat: 0..1}, counts: {...} }.
  function gemState(events) {
    const proposed = {}, settled = {}, askSeat = {};
    let answers = 0, reshapes = 0, asks = 0, stage = 'none';
    for (const s of SEATS) { proposed[s] = 0; settled[s] = 0; }
    for (const e of events || []) {
      switch (e.type) {
        case 'run.start': stage = 'rough'; break;
        case 'candidate': if (e.seat in proposed) proposed[e.seat]++; break;
        case 'decided': if (e.seat in settled && e.seat !== 'product') { settled[e.seat]++; if (stage === 'rough') stage = 'cutting'; } break;
        case 'ask': asks++; if (e.id) askSeat[e.id] = e.seat; break;
        case 'answer': {
          answers++;
          const s = askSeat[e.askId];
          if (s && s !== 'product' && s in settled) settled[s]++;
          if (stage === 'rough') stage = 'cutting';
          break;
        }
        case 'reshape': reshapes++; break;
        case 'build.step': if (stage !== 'page') stage = 'symphony'; break;
        case 'build.done': stage = 'page'; break;
      }
    }
    const cut = {};
    for (const s of SEATS) {
      if (s === 'product') continue;
      // a seat with nothing put forward yet stays rough; settled can't pass what it proposed
      cut[s] = proposed[s] ? Math.min(1, settled[s] / proposed[s]) : 0;
    }
    // her face: each answer to a check-in polishes it; a reshape (her reaction to the first sketch) starts it
    const fromAnswers = asks ? answers / Math.max(asks, 1) : 0;
    cut.product = Math.min(1, fromAnswers * 0.85 + Math.min(reshapes, 2) * 0.075 + (answers && answers >= asks ? 0.15 : 0));
    if (stage === 'symphony' || stage === 'page') for (const s of SEATS) cut[s] = 1;
    return { stage, cut, counts: { proposed, settled, answers, reshapes, asks } };
  }
  BYOC.gemState = gemState; // exposed for tests and for anyone who wants the numbers

  // ---- geometry: a hexagonal stone seen from above, a face per seat -------------------------
  const R = 70, C = 80;                       // radius, centre (viewBox 160 x 160)
  const ORDER = ['product', 'design', 'data', 'research', 'strategy', 'engineering']; // clockwise from bottom
  const corner = i => { const a = Math.PI / 2 + i * Math.PI / 3; return [C + R * Math.cos(a), C + R * Math.sin(a)]; };
  // deterministic roughness per seat, so a rough stone looks the same on every screen and every replay
  function rng(seed) { let x = seed * 9301 + 49297; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); }
  const ROUGH = {};
  ORDER.forEach((s, i) => {
    const r = rng(i + 7), a = corner(i), b = corner(i + 1);
    // the rough face: the centre, a bumpy outer edge (5 points between the corners), pulled in and pushed out
    const pts = [[C + (r() - .5) * 10, C + (r() - .5) * 10]];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      const pull = 0.78 + r() * 0.2;            // rough stones sit inside the cut outline
      pts.push([C + (x - C) * pull + (r() - .5) * 6, C + (y - C) * pull + (r() - .5) * 6]);
    }
    ROUGH[s] = pts;
  });
  const CUT = {};
  ORDER.forEach((s, i) => {
    const a = corner(i), b = corner(i + 1), pts = [[C, C]];
    for (let k = 0; k <= 4; k++) { const t = k / 4; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    CUT[s] = pts;
  });
  const lerpPts = (A, B, t) => A.map((p, k) => [p[0] + (B[k][0] - p[0]) * t, p[1] + (B[k][1] - p[1]) * t]);
  const ptsAttr = P => P.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

  // ---- the element ---------------------------------------------------------------------------
  let root = null, faces = {}, facets = {}, bars = {}, shown = {}, target = {}, anim = null, frozen = false;
  const mode = () => (q.get('gem') === 'bars' || !document.createElementNS) ? 'bars' : 'gem';

  function mount() {
    const room = document.getElementById('room');
    if (!room || root) return;
    root = document.createElement('section');
    root.id = 'gem'; root.className = 'gem'; root.hidden = true;
    root.setAttribute('aria-label', 'The idea, cut by the team');
    root.dataset.mode = mode();
    root.dataset.stage = 'none';
    if (mode() === 'gem') {
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 160 160'); svg.setAttribute('class', 'gem-stone'); svg.setAttribute('aria-hidden', 'true');
      const shadow = document.createElementNS(SVGNS, 'g'); shadow.setAttribute('class', 'gem-shadow');
      const body = document.createElementNS(SVGNS, 'g'); body.setAttribute('class', 'gem-body');
      for (const s of ORDER) {
        const sh = document.createElementNS(SVGNS, 'polygon'); sh.dataset.seat = s; shadow.appendChild(sh);
        const p = document.createElementNS(SVGNS, 'polygon'); p.setAttribute('class', 'gem-face'); p.dataset.seat = s;
        p.style.setProperty('--ink', INK[s]); body.appendChild(p); faces[s] = { el: p, sh };
        const f = document.createElementNS(SVGNS, 'polygon'); f.setAttribute('class', 'gem-facet'); f.dataset.seat = s; body.appendChild(f);
        facets[s] = f;
      }
      svg.appendChild(shadow); svg.appendChild(body); root.appendChild(svg);
    }
    // the bars: the cut line, and under the gem a quiet legend of whose face is whose
    const list = document.createElement('ol'); list.className = 'gem-bars';
    for (const s of ORDER) {
      const li = document.createElement('li'); li.dataset.seat = s; li.style.setProperty('--ink', INK[s]);
      li.title = NAMES[s];
      li.innerHTML = `<span class="gem-bar"><i></i></span><span class="gem-bar-name">${NAMES[s].slice(0, 2)}</span>`;
      list.appendChild(li); bars[s] = li.querySelector('i');
    }
    root.appendChild(list);
    const label = document.createElement('div'); label.className = 'gem-label'; root.appendChild(label);
    room.appendChild(root);
    for (const s of SEATS) { shown[s] = 0; target[s] = 0; }
    draw();
  }

  function draw() {
    for (const s of ORDER) {
      const t = shown[s];
      if (faces[s]) {
        // a face cuts from rough to clean; its ink comes in as it is cut (paper grey while rough)
        const P = lerpPts(ROUGH[s], CUT[s], ease(t));
        faces[s].el.setAttribute('points', ptsAttr(P));
        faces[s].el.style.setProperty('--cut', t.toFixed(3));
        faces[s].sh.setAttribute('points', ptsAttr(P.map(p => [p[0] + 3, p[1] + 3])));
        // a facet (the polished plane) appears once a face is half cut, growing to its full size
        const k = Math.max(0, (t - 0.45) / 0.55);
        const at = (pt, f) => [C + (pt[0] - C) * f, C + (pt[1] - C) * f];
        facets[s].setAttribute('points', ptsAttr([at(P[1], 0.62), at(P[3], 0.9), at(P[5], 0.62)]));
        facets[s].style.opacity = (k * 0.55).toFixed(3);
      }
      if (bars[s]) bars[s].style.transform = `scaleY(${t.toFixed(3)})`;
    }
  }
  const ease = t => 1 - Math.pow(1 - t, 3);

  // calm motion: each face eases to its new cut over ~0.9 s; no bounce, nothing else moves
  function animateTo(next) {
    for (const s of SEATS) target[s] = next[s] || 0;
    if (reduced || BYOC.replayInstant) { for (const s of SEATS) shown[s] = target[s]; draw(); return; }
    if (anim) return;
    const step = () => {
      let moving = false;
      for (const s of SEATS) {
        const d = target[s] - shown[s];
        if (Math.abs(d) > 0.002) { shown[s] += d * 0.08; moving = true; } else shown[s] = target[s];
      }
      draw();
      anim = moving ? requestAnimationFrame(step) : null;
    };
    anim = requestAnimationFrame(step);
  }

  function render() {
    if (!root) return;
    const st = gemState(BYOC.events ? BYOC.events() : []);
    if (frozen) return;           // her focus time: nothing moves until she answers
    root.hidden = st.stage === 'none';
    root.dataset.stage = st.stage;
    const label = root.querySelector('.gem-label');
    label.textContent = st.stage === 'page' ? 'her page' : st.stage === 'symphony' ? 'everyone brings their part' : st.stage === 'rough' ? 'a rough idea' : '';
    animateTo(st.cut);
  }

  function onEvent(ev) {
    if (!ev || !ev.type) return;
    if (ev.type === 'reset') { frozen = false; for (const s of SEATS) { shown[s] = 0; target[s] = 0; } if (root) { root.hidden = true; root.dataset.stage = 'none'; draw(); } return; }
    if (ev.type === 'checkin.open') { render(); frozen = true; if (root) root.classList.add('still'); return; }
    if (ev.type === 'checkin.close') { frozen = false; if (root) root.classList.remove('still'); render(); return; }
    render();
  }

  function start() {
    mount();
    if (BYOC.on) { BYOC.on('*', onEvent); BYOC.on('reset', () => onEvent({ type: 'reset' })); }
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
