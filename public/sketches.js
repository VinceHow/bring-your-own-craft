// Design's grey sketches: one phone-sized frame per screen, laid out from Design's frames JSON,
// built from our block kit (public/blocks/). She can pin a note on any frame.
// Provides BYOC.sketches.{show(el, frames), load(el)}.
(function () {
  const B = (window.BYOC = window.BYOC || {});
  const here = document.currentScript && document.currentScript.src;
  const base = here ? new URL('.', here).href : '';
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const slot = (e, name) => { e.dataset.slot = name; return e; }; // docs/COMPONENTS.md hooks for looks

  function css(href, key) {
    if (document.querySelector(`link[data-byoc="${key}"]`)) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + href; l.dataset.byoc = key;
    document.head.appendChild(l);
  }
  css('blocks/blocks.css', 'blocks');
  css('blocks/sketches.css', 'sketches');

  let kit = null;
  function loadKit() {
    if (window.BYOC_BLOCKS) return Promise.resolve(window.BYOC_BLOCKS);
    if (!kit) kit = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = base + 'blocks/blocks.js';
      s.onload = () => res(window.BYOC_BLOCKS); s.onerror = () => rej(new Error('block kit did not load'));
      document.head.appendChild(s);
    });
    return kit;
  }

  function settle(el, from, to, delay) {
    const m = window.motion || window.Motion;
    if (m && typeof m.animate === 'function') {
      try { m.animate(el, { transform: [from, to] }, { type: 'spring', stiffness: 500, damping: 30, delay: delay / 1000 }); el.style.transform = to; return; } catch (e) {}
    }
    el.style.transition = 'none'; el.style.transform = from;
    el.getBoundingClientRect();
    el.style.transition = `transform 140ms cubic-bezier(.2,1.3,.4,1) ${delay}ms`;
    el.style.transform = to;
  }

  // frames: [{nodeId, title, blocks:[{kind,label}]}] or the route's whole reply {frames, source, ms}.
  async function show(el, frames) {
    const data = Array.isArray(frames) ? { frames } : (frames || {});
    const kitApi = await loadKit();
    el.classList.add('sk-host'); el.dataset.component = 'wireframes'; el.dataset.state = 'shown';
    el.innerHTML = '';
    const head = slot(h('div', 'sk-head'), 'head');
    const tag = slot(h('span', 'sk-tag', 'DESIGN'), 'tag');
    head.appendChild(tag);
    head.appendChild(slot(h('span', 'sk-title', 'First sketches'), 'title'));
    if (data.source === 'fallback') head.appendChild(slot(h('span', 'sk-note', 'sketched by rule: the model call failed'), 'note'));
    if (data.replay || B.replay) head.appendChild(slot(h('span', 'sk-note', 'REPLAY'), 'note'));
    el.appendChild(head);
    const row = slot(h('div', 'sk-row'), 'row');
    el.appendChild(row);
    const list = data.frames || [];
    list.forEach((f, i) => {
      const fr = slot(h('div', 'sk-frame'), 'frame');
      fr.dataset.node = f.nodeId;
      fr.appendChild(slot(h('div', 'sk-cap', f.title || f.nodeId), 'caption'));
      const screen = slot(h('div', 'sk-screen'), 'screen');
      for (const b of f.blocks || []) screen.appendChild(kitApi.render(b));
      fr.appendChild(screen);
      fr.addEventListener('click', e => startPin(fr, f.nodeId, e));
      row.appendChild(fr);
      settle(fr, `translateX(${80 + i * 30}px) rotate(3deg)`, `rotate(${(i % 2 ? 1 : -1) * (1 + (i % 3) * 0.5)}deg)`, i * 60);
    });
    return el;
  }

  async function load(el) {
    const data = await B.api('/api/run/' + B.run + '/sketches');
    return show(el, data);
  }

  async function startPin(fr, nodeId, e) {
    if (B.replay || fr.dataset.drafting || e.target.closest('.fl-item')) return;
    if (!B.flow || !B.flow.noteEditor) return;
    fr.dataset.drafting = '1'; fr.closest('.sk-host') && (fr.closest('.sk-host').dataset.state = 'drafting');
    const r = fr.getBoundingClientRect();
    const k = r.width / fr.offsetWidth || 1;
    const left = Math.max(-20, Math.min(fr.offsetWidth - 120, (e.clientX - r.left) / k - 40));
    const top = Math.max(20, (e.clientY - r.top) / k - 20);
    const text = await B.flow.noteEditor(fr, { left, top });
    delete fr.dataset.drafting; fr.closest('.sk-host') && (fr.closest('.sk-host').dataset.state = 'shown');
    if (!text) return;
    const note = slot(h('div', 'fl-item fl-mine sk-pinned'), 'pinned');
    note.appendChild(h('span', 'fl-pinhead'));
    note.appendChild(h('div', 'fl-tag', 'YOUR NOTE'));
    note.appendChild(h('div', 'fl-mtext', text));
    Object.assign(note.style, { left: left + 'px', top: top + 'px' });
    fr.appendChild(note);
    try {
      if (B.flow.pin) await B.flow.pin(nodeId, text); // also pins it on her flow, and logs it
      else await B.api('/api/run/' + B.run + '/pin', { nodeId, text });
    } catch (err) {
      note.appendChild(h('div', 'fl-status', 'Not saved. Try again.'));
    }
  }

  B.sketches = { show, load };
})();
