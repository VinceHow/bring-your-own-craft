// Ink and paper: dresses every surface inside a .ink-paper container with its crayon paper, cream sheet and ink line,
// and plays the signature gesture. Needs ink-paper.css; motion uses the room's vendored Motion if it's loaded.
//   InkPaper.dress(root)          add the layers to every surface under root (safe to call again for new ones)
//   InkPaper.lay(el, delay=0)     one gesture: the crayon goes down, the cream sheet lands, the ink line draws itself on
//   InkPaper.hide(el)             put a surface back to its before-state (ready for lay)
//   InkPaper.redraw(el)           re-ink one surface after its size changed
(function () {
  'use strict';
  const SURF = '.pill, .bubble, .note, .decision, .sheet, .pop, .btn, .tag, .doc, .take, .card';
  const NS = 'http://www.w3.org/2000/svg';
  const SEEDS = [3, 7, 11, 17, 23, 29, 37, 41, 47, 53, 59, 61];
  let seed = 0;

  // The shared filters, once per page: 12 ink wobbles (a different seed per card, so no two lines match),
  // one calmer wobble for very large shapes, and the torn edge of the crayon paper.
  function defs() {
    if (document.getElementById('ip-defs')) return;
    const wob = SEEDS.map((s, i) => `<filter id="ip-wob${i}" x="-5%" y="-8%" width="110%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="${s}"/><feDisplacementMap in="SourceGraphic" scale="${i % 3 === 2 ? 3 : 2.4}" xChannelSelector="R" yChannelSelector="G"/></filter>`).join('');
    const svg = document.createElementNS(NS, 'svg');
    svg.id = 'ip-defs'; svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = wob +
      '<filter id="ip-wob-big" x="-2%" y="-3%" width="104%" height="106%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="19"/><feDisplacementMap in="SourceGraphic" scale="1.8" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="ip-tear" x="-6%" y="-14%" width="112%" height="128%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="11" result="w"/><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4" result="f"/><feDisplacementMap in="SourceGraphic" in2="w" scale="6" xChannelSelector="R" yChannelSelector="G" result="a"/><feDisplacementMap in="a" in2="f" scale="3" xChannelSelector="G" yChannelSelector="R"/></filter>';
    document.body.prepend(svg);
  }

  // The outline follows the sheet's own corners (a speech bubble has one tight corner).
  function ink(el) {
    let sv = el.querySelector(':scope > svg.ol');
    const w = el.offsetWidth, h = el.offsetHeight; if (!w || !h) return;
    const cs = getComputedStyle(el);
    const r = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(k => Math.max(0, Math.min(parseFloat(cs['border' + k + 'Radius']) || 0, h / 2, w / 2) - .5));
    const x0 = .5, y0 = .5, x1 = w - .5, y1 = h - .5;
    const d = `M${x0 + r[0]} ${y0}H${x1 - r[1]}A${r[1]} ${r[1]} 0 0 1 ${x1} ${y0 + r[1]}V${y1 - r[2]}A${r[2]} ${r[2]} 0 0 1 ${x1 - r[2]} ${y1}H${x0 + r[3]}A${r[3]} ${r[3]} 0 0 1 ${x0} ${y1 - r[3]}V${y0 + r[0]}A${r[0]} ${r[0]} 0 0 1 ${x0 + r[0]} ${y0}Z`;
    if (!sv) {
      sv = document.createElementNS(NS, 'svg'); sv.setAttribute('class', 'ol'); sv.setAttribute('aria-hidden', 'true');
      const f = (w > 900 || h > 500) ? 'ip-wob-big' : 'ip-wob' + (seed++ % 12);
      sv.innerHTML = `<g transform="translate(3 3)" style="filter:url(#${f})"><path class="ln" pathLength="1"/></g>`;
      el.insertBefore(sv, el.querySelector(':scope > .gl').nextSibling);
    }
    sv.setAttribute('width', w + 6); sv.setAttribute('height', h + 6);
    sv.querySelector('.ln').setAttribute('d', d);
  }

  function dress(root = document) {
    defs();
    const els = [...root.querySelectorAll(SURF)];
    if (root.matches && root.matches(SURF)) els.unshift(root);
    els.forEach(el => {
      if (el.classList.contains('pane')) return;
      el.classList.add('pane');
      const first = el.firstChild, mk = cls => { const s = document.createElement('span'); s.className = cls; s.setAttribute('aria-hidden', 'true'); el.insertBefore(s, first); return s; };
      if (el.matches('.decision')) { mk('cr c3'); mk('cr c2'); }
      mk('cr'); mk('gl');
    });
    const go = () => els.forEach(ink);
    (document.fonts && document.fonts.status !== 'loaded') ? document.fonts.ready.then(go) : go();
    return els;
  }

  const words = el => [...el.children].filter(k => !k.matches('.cr, .gl, .ol'));
  function hide(el) {
    el.querySelectorAll(':scope > .cr, :scope > .gl').forEach(s => s.style.opacity = 0);
    const ln = el.querySelector(':scope > .ol .ln'); if (ln) { ln.style.strokeDasharray = 1; ln.style.strokeDashoffset = 1; }
    el.classList.add('drawing'); words(el).forEach(k => k.style.opacity = 0);
  }
  // One quick gesture: crayon paper slides down onto the table, the cream sheet lands on it, the ink draws itself on,
  // and the words come up as the line closes. Springs with no bounce. Total about 0.9 s for a card.
  function lay(el, delay = 0) {
    const M = window.Motion; if (!M || matchMedia('(prefers-reduced-motion: reduce)').matches) { show(el); return; }
    const { animate } = M, spring = { type: 'spring', visualDuration: .45, bounce: 0 };
    hide(el);
    const crs = el.querySelectorAll(':scope > .cr'), big = el.matches('.doc, .sheet, .pop, .card');
    crs.forEach((cr, i) => animate(cr, { opacity: [0, 1], x: [-18, 0], y: [-10, 0] }, { ...spring, delay: delay + i * .07 }));
    const gd = delay + .16 + crs.length * .05;
    animate(el.querySelector(':scope > .gl'), { opacity: [0, 1], y: [-8, 0], scale: [1.015, 1] }, { ...spring, delay: gd });
    const ln = el.querySelector(':scope > .ol .ln'), dur = big ? 1.1 : el.matches('.pill, .tag, .btn') ? .5 : .7;
    if (ln) animate(ln, { strokeDashoffset: [1, 0] }, { duration: dur, delay: gd + .1, ease: [.45, .05, .25, 1] });
    setTimeout(() => { el.classList.remove('drawing'); words(el).forEach(k => animate(k, { opacity: [0, 1] }, { duration: .35 })); }, (gd + .1 + dur * .55) * 1000);
  }
  function show(el) {
    el.querySelectorAll(':scope > .cr, :scope > .gl').forEach(s => s.style.opacity = '');
    const ln = el.querySelector(':scope > .ol .ln'); if (ln) { ln.style.strokeDasharray = ''; ln.style.strokeDashoffset = ''; }
    el.classList.remove('drawing'); words(el).forEach(k => k.style.opacity = '');
  }
  // talking: the crayon ring round the dot breathes slowly while a teammate speaks
  function talk(pill, on = true) {
    pill.classList.toggle('is-talking', on);
    const dot = pill.querySelector('.dot'); if (!dot || !window.Motion) return;
    if (pill._talk) { pill._talk.stop(); pill._talk = null; }
    if (on && !matchMedia('(prefers-reduced-motion: reduce)').matches)
      pill._talk = Motion.animate(dot, { scale: [1, 1.08, 1] }, { duration: 2.4, repeat: Infinity, ease: 'easeInOut' });
  }
  // night: each sheet is lit from the table lamp, brighter nearer it. x, y are the lamp in root's coordinates.
  function lamp(root, x, y) {
    const rb = root.getBoundingClientRect();
    root.querySelectorAll('.pane').forEach(el => {
      const b = el.getBoundingClientRect(); if (!b.width) return;
      const lx = ((rb.left + x - b.left) / b.width) * 100, ly = ((rb.top + y - b.top) / b.height) * 100;
      const dx = Math.max(b.left - rb.left - x, 0, rb.left + x - b.right), dy = Math.max(b.top - rb.top - y, 0, rb.top + y - b.bottom);
      const k = Math.max(.12, .62 - Math.hypot(dx, dy) / 1400);
      el.style.setProperty('--ip-lx', lx.toFixed(1) + '%'); el.style.setProperty('--ip-ly', ly.toFixed(1) + '%'); el.style.setProperty('--ip-lamp', k.toFixed(2));
    });
  }
  window.InkPaper = { dress, lay, hide, show, redraw: ink, talk, lamp, SURF };
})();
