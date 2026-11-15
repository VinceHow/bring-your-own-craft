// The storefront. Names go in with textContent only, never as HTML.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const NS = 'http://www.w3.org/2000/svg';

  // ---- what this device has reserved (kept on the device; the server knows only the cookie) ----
  const KEY = 'priyas-bags';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(bags.slice(0, 8))); } catch { /* private mode: fine */ } };
  let bags = load(); // [{ id, loaf_id, drop, status, message }]
  // The first name this device reserves under: asked once, then "Reserving as <name> · not you?" (builder hand edit 3).
  // The server keeps it against the device cookie (GET /api/me); localStorage is only a hint. Never read from the URL.
  const NAME_KEY = 'priyas-name';
  let myName = (() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } })();
  const rememberName = (n) => { myName = n; try { localStorage.setItem(NAME_KEY, n); } catch { /* private mode */ } refreshAs(); };
  function refreshAs() { for (const c of cards.values()) { c.asName.textContent = myName; c.as.hidden = !myName || c.changing; c.lab.hidden = c.input.hidden = !!myName && !c.changing; } }
  let currentDrop = 1;
  const streams = new Map();

  const loafListEl = $('#loaves');
  const cards = new Map();

  // ---------- the shelf ----------
  function scribble() {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'scribble'); svg.setAttribute('viewBox', '0 0 200 18'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M2 11 C 30 4, 60 15, 95 8 S 160 4, 198 9'); p.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(p);
    return svg;
  }

  function buildCard(l) {
    const li = el('li', 'loaf'); li.dataset.id = l.id;
    const fig = el('div', 'photo'); const img = new Image(); img.src = `/img/${l.id}.jpg`; img.alt = l.name; img.width = 800; img.height = 600; fig.appendChild(img);
    const nameRow = el('div', 'name-row'); const name = el('h3', 'name', l.name); const count = el('span', 'count');
    nameRow.append(name, count);
    const desc = el('p', 'desc', l.description);
    const hand = el('p', 'hand', 'Sold out for today'); hand.hidden = true;
    const open = el('button', 'btn', 'Put my name down'); open.type = 'button'; open.setAttribute('aria-expanded', 'false');

    const form = el('form', 'reserve'); form.hidden = true; form.noValidate = true;
    const lab = el('label', null, 'Your first name'); const id = `n-${l.id}`; lab.htmlFor = id;
    const input = el('input'); input.id = id; input.name = 'first_name'; input.type = 'text'; input.maxLength = 30; input.autocomplete = 'given-name'; input.autocapitalize = 'words'; input.enterKeyHint = 'go';
    const go = el('button', 'btn', 'Reserve'); go.type = 'submit';
    const note = el('p', 'note'); note.setAttribute('role', 'status');
    const as = el('p', 'as'); const asName = el('strong'); const notYou = el('button', 'not-you', 'not you?'); notYou.type = 'button';
    as.append('Reserving as ', asName, ' \u00b7 ', notYou);
    form.append(as, lab, input, go, note);

    open.addEventListener('click', () => {
      const show = form.hidden; form.hidden = !show; open.setAttribute('aria-expanded', String(show));
      if (show) { (input.hidden ? go : input).focus(); form.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    });
    notYou.addEventListener('click', () => { const c = cards.get(l.id); c.changing = true; input.value = ''; refreshAs(); input.focus(); });
    form.addEventListener('submit', (e) => { e.preventDefault(); reserve(l.id, input, go, note); });

    li.append(fig, nameRow, desc, hand, open, form);
    cards.set(l.id, { li, name, count, hand, open, form, input, note, scribble: null, as, asName, lab, changing: false });
    loafListEl.appendChild(li);
    refreshAs();
  }

  function renderShelf(loaves) {
    for (const l of loaves) {
      if (!cards.has(l.id)) buildCard(l);
      const c = cards.get(l.id);
      c.li.classList.toggle('out', l.sold_out);
      if (c.count.textContent !== l.label) c.count.textContent = l.sold_out ? '' : l.label;
      c.hand.hidden = !l.sold_out;
      if (l.sold_out && !c.scribble) { c.scribble = scribble(); c.name.appendChild(c.scribble); }
      if (!l.sold_out && c.scribble) { c.scribble.remove(); c.scribble = null; }
      const mine = bags.find((b) => b.loaf_id === l.id && b.drop === currentDrop && b.status !== 'released');
      c.open.hidden = l.sold_out || !!mine;
      if ((l.sold_out || mine) && !c.form.hidden) c.form.hidden = true;
      if (mine && !l.sold_out) c.count.textContent = `${l.label}, one is yours`;
    }
  }

  async function fetchLoaves() {
    try {
      const r = await fetch('/api/loaves', { credentials: 'same-origin' });
      const data = await r.json();
      currentDrop = data.drop;
      renderShelf(data.loaves);
    } catch { /* offline for a moment: the next tick tries again */ }
  }

  // ---------- reserving ----------
  async function reserve(loafId, input, go, note) {
    const c = cards.get(loafId);
    const first = (input.hidden ? myName : input.value).trim();
    note.className = 'note';
    if (!first) { note.textContent = 'What shall I write on the bag? Just a first name.'; input.focus(); return; }
    go.disabled = true; note.textContent = 'Setting one aside...';
    try {
      const r = await fetch('/api/reservations', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loaf_id: loafId, first_name: first }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 201) {
        const bag = { id: data.id, loaf_id: data.loaf_id, drop: data.drop, status: data.status, message: data.message };
        bags.unshift(bag); save(); input.value = ''; note.textContent = '';
        c.changing = false; rememberName(first);
        renderBags(); watch(bag); fetchLoaves();
        $('#bags').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (r.status === 409 && data.error === 'sold_out') {
        note.textContent = 'Sold out for today'; note.className = 'note warm'; fetchLoaves();
      } else if (r.status === 409) {
        note.textContent = data.message; note.className = 'note warm';
      } else if (r.status === 429) {
        note.textContent = "Steady on. Give it a minute and try again."; note.className = 'note warm';
      } else {
        note.textContent = data.message || 'That did not go through. Try once more.';
      }
    } catch { note.textContent = 'No signal just now. Try once more.'; }
    go.disabled = false;
  }

  // ---------- the bag ----------
  const bagEls = new Map();
  function ovenSvg() {
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'oven'); s.setAttribute('viewBox', '0 0 150 96'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<rect x="10" y="22" width="130" height="70" rx="10" fill="#5A3B22"/>' +
      '<path d="M30 92 V58 a45 28 0 0 1 90 0 V92 Z" fill="#2B1B0E"/>' +
      '<path class="glow" d="M38 92 V60 a37 22 0 0 1 74 0 V92 Z" fill="#C8662F"/>' +
      '<g class="loaf-shape"><ellipse cx="75" cy="74" rx="26" ry="14" fill="#B9823F"/><path d="M60 70 q8 -6 12 0 M76 68 q8 -6 12 0" stroke="#F3DDB4" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>' +
      '<rect x="10" y="86" width="130" height="8" rx="3" fill="#5A3B22"/>';
    return s;
  }

  function renderBag(b, landing) {
    let node = bagEls.get(b.id);
    if (!node) { node = el('article', 'bag'); bagEls.set(b.id, node); $('#bag-list').appendChild(node); }
    node.className = `bag ${b.status}${landing ? ' landing' : ''}`;
    node.replaceChildren();
    const top = el('div', 'bag-top'); const img = new Image(); img.className = 'bag-photo'; img.src = `/img/${b.loaf_id}.jpg`; img.alt = '';
    top.append(img, el('p', 'sticker', b.message));
    node.appendChild(top);
    if (b.status === 'reserved') {
      node.append(ovenSvg(), el('p', 'keep', 'On its way. Keep this page open and it will tell you the moment it is here.'));
    } else if (b.status === 'delivered') {
      const w = el('div', 'stamp-wrap'); w.appendChild(el('span', 'stamp', 'Delivered')); node.appendChild(w);
    }
  }

  function renderBags() {
    $('#bags').hidden = bags.length === 0;
    for (const b of bags) renderBag(b, false);
    const list = $('#bag-list'); for (const b of bags) list.appendChild(bagEls.get(b.id)); // newest first
  }

  function update(id, next) {
    const b = bags.find((x) => x.id === id); if (!b) return;
    const was = b.status; b.status = next.status; b.message = next.message; save();
    const landing = was === 'reserved' && next.status === 'delivered';
    renderBag(b, landing);
    if (landing) { try { navigator.vibrate && navigator.vibrate([60, 50, 120]); } catch { /* not on this phone */ } }
    if (next.status !== 'reserved') { streams.get(id)?.close(); streams.delete(id); }
    fetchLoaves();
  }

  function forget(id) {
    bags = bags.filter((b) => b.id !== id); save(); bagEls.get(id)?.remove(); bagEls.delete(id);
    streams.get(id)?.close(); streams.delete(id); renderBags(); fetchLoaves();
  }

  function watch(b) {
    if (b.status !== 'reserved' || streams.has(b.id) || !('EventSource' in window)) return;
    const es = new EventSource(`/api/reservations/${b.id}/events`);
    streams.set(b.id, es);
    es.onmessage = (e) => { try { update(b.id, JSON.parse(e.data)); } catch { /* ignore a bad line */ } };
    es.onerror = async () => {
      if (es.readyState !== EventSource.CLOSED) return; // it will reconnect by itself
      streams.delete(b.id);
      try { const r = await fetch(`/api/reservations/${b.id}`); if (r.status === 404) forget(b.id); } catch { /* try again on the next poll */ }
    };
  }

  // A quiet backup: if a stream is blocked, ask for the status now and then.
  async function poll() {
    for (const b of bags.filter((x) => x.status === 'reserved')) {
      try {
        const r = await fetch(`/api/reservations/${b.id}`);
        if (r.status === 404) { forget(b.id); continue; }
        const d = await r.json(); if (d.status !== b.status) update(b.id, d);
      } catch { /* later */ }
    }
  }

  // ---------- start ----------
  (async () => {
    renderBags();
    await fetchLoaves();
    // The server's memory of this device's name wins over the local hint (after a Reset demo it forgets: ask again).
    try { const me = await (await fetch('/api/me', { credentials: 'same-origin' })).json(); if (me.first_name) rememberName(me.first_name); else { myName = ''; try { localStorage.removeItem(NAME_KEY); } catch {} refreshAs(); } } catch { /* keep the hint */ }
    await poll();
    bags.forEach(watch);
    if ('EventSource' in window) {
      const shelf = new EventSource('/api/events'); // the shelf changes: refetch at once
      shelf.onmessage = () => fetchLoaves();
    }
    setInterval(fetchLoaves, 5000);
    setInterval(poll, 8000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { fetchLoaves(); poll(); bags.forEach(watch); } });
  })();
})();
