// Our small grey block kit for Design's first sketches. Each block is a wireframe, not a design.
// window.BYOC_BLOCKS.render({kind, label}) -> HTMLElement. Unknown kinds render as a line of text.
(function () {
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const lines = (n, cls = 'bk-line') => { const f = document.createDocumentFragment(); for (let i = 0; i < n; i++) f.appendChild(h('span', cls)); return f; };

  // A crossed box: the wireframe sign for "a picture goes here".
  function picture() {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'bk-img'); s.setAttribute('viewBox', '0 0 200 70'); s.setAttribute('preserveAspectRatio', 'none');
    for (const [t, a] of [['rect', { x: 1, y: 1, width: 198, height: 68, rx: 3 }], ['line', { x1: 1, y1: 1, x2: 199, y2: 69 }], ['line', { x1: 199, y1: 1, x2: 1, y2: 69 }]]) {
      const e = document.createElementNS(NS, t);
      for (const k in a) e.setAttribute(k, a[k]);
      e.setAttribute('vector-effect', 'non-scaling-stroke');
      s.appendChild(e);
    }
    return s;
  }

  const KINDS = {
    header(label) {
      const e = h('div', 'bk bk-header');
      e.appendChild(h('span', 'bk-logo'));
      e.appendChild(h('span', 'bk-title', label));
      const m = h('span', 'bk-menu'); m.appendChild(lines(3, 'bk-bar')); e.appendChild(m);
      return e;
    },
    'class-list'(label) {
      const e = h('div', 'bk bk-list');
      e.appendChild(h('div', 'bk-cap', label));
      for (let i = 0; i < 3; i++) {
        const r = h('div', 'bk-row');
        r.appendChild(h('span', 'bk-time'));
        const t = h('span', 'bk-rowtext'); t.appendChild(lines(2)); r.appendChild(t);
        r.appendChild(h('span', 'bk-pill'));
        e.appendChild(r);
      }
      return e;
    },
    'class-detail'(label) {
      const e = h('div', 'bk bk-detail');
      e.appendChild(picture());
      e.appendChild(h('div', 'bk-head', label));
      e.appendChild(lines(3));
      return e;
    },
    field(label) {
      const e = h('div', 'bk bk-field');
      e.appendChild(h('div', 'bk-flabel', label));
      e.appendChild(h('div', 'bk-input'));
      return e;
    },
    button(label) { return h('div', 'bk bk-button', label); },
    confirmation(label) {
      const e = h('div', 'bk bk-confirm');
      e.appendChild(h('span', 'bk-tick'));
      e.appendChild(h('div', 'bk-head', label));
      return e;
    },
    text(label) { return h('div', 'bk bk-text', label); },
  };

  function render(block) {
    const make = KINDS[block && block.kind] || KINDS.text;
    const e = make(String((block && block.label) || ''));
    e.dataset.kind = (block && block.kind) || 'text';
    return e;
  }
  window.BYOC_BLOCKS = { render, kinds: Object.keys(KINDS) };
})();
