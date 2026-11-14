// The room: seats, cards, her sheet, teammates' sheets, her file card, the counter and the meter.
// Hosts window.BYOC (see CONTRACT.md). Pieces 2 and 3 plug in through it.
(function () {
  'use strict';
  const M = window.Motion || null;
  const SPRING = { type: 'spring', stiffness: 500, damping: 30 };
  const QUICK = { duration: 0.12, ease: 'linear' }; // nothing fades for longer than 150ms

  const SEATS = ['product', 'design', 'data', 'research', 'strategy', 'engineering'];
  const TEAM = ['design', 'data', 'research', 'strategy', 'engineering'];
  // Loves / Brings / Stance: copied exactly from DEMO.md, "The team cards". Brings stays true of what each runs on.
  const INFO = {
    product: { name: 'Product', brings: 'product: user journeys and the calls that shape them' },
    design: { name: 'Design', agent: 'Mika', stance: 'sketch first, polish last', loves: 'A rough sketch in seconds. Polish at the very end.', brings: 'taste-skill’s design rules: type, colour, spacing' },
    data: { name: 'Data', agent: 'Theo', stance: 'only what we’ll measure', loves: 'One number that says it worked.', brings: 'what to measure at each step' },
    research: { name: 'Research', agent: 'Noor', stance: 'what’s known, with sources', loves: 'A source for every claim.', brings: 'a real finding with its link, researched before the demo' },
    strategy: { name: 'Strategy', agent: 'Ines', stance: 'who pays, and why now', loves: 'Knowing who pays before we build.', brings: 'pricing and payment calls' },
    engineering: { name: 'Engineering', agent: 'Bo', stance: 'boring and correct', loves: 'Boring, correct, shipped.', brings: 'the page template and the live build' },
  };
  // How long each teammate's big card holds mid-table (DEMO 0:06-0:26: about 2 s). ?hold=<ms> for tests.
  const HOLD_MS = Number(new URLSearchParams(location.search).get('hold')) || 2000;
  // One simple geometric glyph per seat. No faces, no emoji.
  const GLYPH = {
    product: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V3l14 6-14 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="miter"/></svg>',
    design: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="11" y="11" width="10" height="10" fill="currentColor"/></svg>',
    data: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="13" width="4.5" height="8" fill="currentColor"/><rect x="9.75" y="8" width="4.5" height="13" fill="currentColor"/><rect x="16.5" y="3" width="4.5" height="18" fill="currentColor"/></svg>',
    research: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M15 15l6 6" stroke="currentColor" stroke-width="3" stroke-linecap="square"/></svg>',
    engineering: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="9" y="9" width="6" height="6" fill="currentColor"/></svg>',
    strategy: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.7" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12 12V3.3A8.7 8.7 0 0 1 20.7 12z" fill="currentColor"/></svg>',
  };
  const BEATS = ['empty room', 'her seat', 'team assembles, her card', 'first move', 'her journey', 'team works', 'her three',
    'her taste', 'build', 'her page', 'not scripted', 'close'];

  const $ = (s, el = document) => el.querySelector(s);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- motion helpers -------------------------------------------------------------------------
  // place(el, {x,y,rotate,scale,opacity}, animate): spring to a pose, or jump there.
  function place(el, to, animate = true, extra = {}) {
    if (!M || !M.animate) { // no motion library: plain placement
      const t = `translate(${last(to.x) || 0}px, ${last(to.y) || 0}px) rotate(${last(to.rotate) || 0}deg) scale(${last(to.scale) ?? 1})`;
      el.style.transform = t; if (to.opacity != null) el.style.opacity = last(to.opacity); return Promise.resolve();
    }
    const opts = animate ? { ...SPRING, opacity: QUICK, ...extra } : { duration: 0 };
    const a = M.animate(el, to, opts);
    return a && a.finished ? a.finished : Promise.resolve(a);
  }
  const last = v => Array.isArray(v) ? v[v.length - 1] : v;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // Rolling digits: each digit is a 0-9 column that springs to its place.
  function roller(el) {
    let cols = [], value = undefined;
    function build(len) {
      el.innerHTML = ''; cols = [];
      for (let i = 0; i < len; i++) {
        const c = h('span', 'col', Array.from({ length: 10 }, (_, d) => `<span>${d}</span>`).join(''));
        c._v = 0; c._cur = 0; c._anim = null; el.appendChild(c); cols.push(c);
      }
    }
    return {
      set(n, animate = true) {
        if (n == null || Number.isNaN(n)) { value = null; cols = []; el.innerHTML = '<span class="dash">&ndash;</span>'; return; }
        n = Math.max(0, Math.round(n));
        if (n === value) return;
        const s = String(n);
        if (cols.length !== s.length) build(s.length);
        value = n;
        [...s].forEach((ch, i) => {
          const col = cols[i], to = Number(ch);
          col._v = to;
          // Stop the spring already running on this column, so an older one can never finish last.
          if (col._anim) { col._anim.stop(); col._anim = null; }
          const draw = v => { col._cur = v; col.style.transform = `translateY(${-v}em)`; };
          if (!animate || !M) { draw(to); return; }
          const a = M.animate(col._cur, to, { ...SPRING, onUpdate: draw });
          col._anim = a;
          Promise.resolve(a.finished || a).then(() => { if (col._anim === a) { col._anim = null; draw(to); } }, () => {});
        });
      },
      get value() { return value; },
    };
  }

  // ---- BYOC: the seam --------------------------------------------------------------------------
  const BYOC = window.BYOC = window.BYOC || {};
  const handlers = new Map(); // type -> Set(fn); '*' gets every event
  BYOC.on = function (type, fn) {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => handlers.get(type).delete(fn);
  };
  function emit(type, payload) {
    for (const key of [type, '*']) for (const fn of handlers.get(key) || []) {
      try { fn(payload); } catch (e) { console.error('BYOC handler', type, e); }
    }
  }
  // BYOC.api(path, body?, { step }): every live call she waits on shows as a step on the table (never a spinner).
  // step: a label, or false for background calls. Unset: a label from the path (see stepFor), or none.
  BYOC.api = async function (path, body, opts = {}) {
    const label = opts.step === undefined ? stepFor(path) : opts.step;
    const id = label ? stepBegin(label) : null;
    try {
      const res = await fetch(path, body === undefined ? {} : {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const text = await res.text();
      let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = { text }; }
      if (!res.ok) { const e = new Error((data && data.error) || `HTTP ${res.status}`); e.status = res.status; e.data = data; throw e; }
      if (id) stepEnd(id);
      return data;
    } catch (e) { if (id) stepEnd(id, e); throw e; }
  };

  // ---- the live step: what the room is waiting on, with its seconds ----------------------------
  // Over SLOW_MS (25 s; ?slow=<ms> to test) or on a failure it says so, and that R swaps in the rehearsal.
  const SLOW_MS = Number(new URLSearchParams(location.search).get('slow')) || 25000;
  BYOC.SLOW_MS = SLOW_MS;
  function stepFor(p) {
    const m = String(p).match(/^\/api\/run\/[^/]+\/(line|propose|answer|pin|taste|build)$/);
    if (p === '/api/run') return 'Opening the sheet';
    if (!m) return null;
    return { line: 'Drawing the step', propose: 'The team is starting', answer: 'Noting the answer',
      pin: 'The team is naming the taste', taste: 'Writing it into your file', build: 'Engineering is building' }[m[1]];
  }
  const steps = new Map(); // id -> { label, t0 }
  let stepSeq = 0, stepFail = null, stepTick = null;
  const stepEl = document.createElement('div');
  stepEl.id = 'live-step'; stepEl.className = 'live-step'; stepEl.hidden = true;
  stepEl.setAttribute('aria-live', 'polite');
  function stepBegin(label) {
    const id = ++stepSeq; steps.set(id, { label, t0: Date.now() }); stepFail = null;
    if (!stepTick) stepTick = setInterval(renderStep, 500);
    renderStep(); return id;
  }
  function stepSet(id, label) { const s = steps.get(id); if (s) { s.label = label; renderStep(); } }
  function stepEnd(id, err) {
    const s = steps.get(id); if (!s) return;
    steps.delete(id);
    if (err && err.status !== 404 && err.status !== 409) stepFail = { label: s.label, why: err.status ? `error ${err.status}` : 'no answer' };
    if (!steps.size && !stepFail) { clearInterval(stepTick); stepTick = null; }
    renderStep();
  }
  function stepClear() { steps.clear(); stepFail = null; clearInterval(stepTick); stepTick = null; renderStep(); }
  function renderStep() {
    if (BYOC.replay || (BYOC.focus && BYOC.focus.open)) { stepEl.hidden = true; return; } // her document fills the view
    const now = Date.now();
    // The newest step she is waiting on; quick ones (under 0.8 s) never flash up.
    const cur = [...steps.values()].filter(s => now - s.t0 > 800).at(-1);
    stepEl.classList.toggle('failed', !!stepFail && !cur);
    if (cur) {
      const ms = now - cur.t0, slow = ms > SLOW_MS;
      stepEl.classList.toggle('slow', slow);
      stepEl.innerHTML = `<b>${esc(cur.label)}</b> <span>${Math.floor(ms / 1000)} s</span>${slow ? '<em>slow · R replays the rehearsal</em>' : ''}`;
      stepEl.hidden = false; return;
    }
    stepEl.classList.remove('slow');
    if (stepFail) { stepEl.innerHTML = `<b>${esc(stepFail.label)}: stopped</b> <span>${esc(stepFail.why)}</span><em>R replays the rehearsal</em>`; stepEl.hidden = false; return; }
    stepEl.hidden = true;
  }
  BYOC.step = { begin: stepBegin, set: stepSet, end: stepEnd, clear: stepClear, get state() {
    return { steps: [...steps.values()].map(s => ({ ...s })), failed: stepFail }; } };
  BYOC.emit = emit; // for the room's own pieces (focus-doc.js)
  BYOC.info = seat => INFO[seat] || null;
  BYOC.run = null;
  BYOC.replay = false;      // true while a recorded (or fake) run is on screen
  BYOC.replayKind = null;   // 'recorded' | 'fixture'
  BYOC.beat = 0;
  BYOC.BEATS = BEATS;
  BYOC.SEATS = SEATS;

  // ---- elements -------------------------------------------------------------------------------
  const el = {
    room: $('#room'),
    herSheet: $('#her-sheet'),
    herFlow: $('#her-flow'),
    herIdea: $('#her-idea'),
    herNotes: $('#her-notes'),
    herForm: $('#her-form'),
    herInput: $('#her-input'),
    herHint: $('#her-hint'),
    fileCard: $('#file-card'),
    fileLines: $('#file-lines'),
    fileNote: $('#file-note'),
    soundsLike: $('#sounds-like'),
    tally: $('#tally'),
    counter: $('#counter'),
    meter: $('#meter'),
    status: $('#status'),
    seatSheet: {},
    seat: {},
  };
  el.room.appendChild(stepEl);
  for (const s of SEATS) el.seat[s] = $(`.seat[data-seat="${s}"]`);
  // Product's own teammate (the spec drafter) gets a small sheet too, tucked beside her file.
  const productSheet = h('section', 'mini-sheet'); productSheet.dataset.sheet = 'product'; productSheet.hidden = true;
  el.room.appendChild(productSheet);
  for (const s of SEATS) el.seatSheet[s] = $(`.mini-sheet[data-sheet="${s}"]`);
  BYOC.el = { herSheet: el.herSheet, herFlow: el.herFlow, seatSheet: el.seatSheet, fileCard: el.fileCard,
    counter: el.counter, meter: el.meter, room: el.room };

  const rollers = { came: roller($('#came')), brought: roller($('#brought')), pct: roller($('#pct')) };
  BYOC._rollers = rollers; // test hook (e2e/room.e2e.js)

  function status(msg) { el.status.textContent = msg || ''; }
  BYOC.status = status;

  // ---- cards ----------------------------------------------------------------------------------
  function makeCard(seat) {
    const i = INFO[seat];
    const c = h('div', 'card');
    if (seat === 'product') {
      // Her stance stays empty until her first "Sounds like" line fills it (DEMO 1:35).
      // No stance slot on her card (DEMO: her philosophy is the team's to keep, never shown unless she asks).
      c.innerHTML = `<div class="card-band">${GLYPH[seat]}<span class="card-name">${i.name}</span></div>
        <div class="card-her"><span class="card-who">Priya · your seat</span></div>`;
    } else {
      c.innerHTML = `<div class="card-band">${GLYPH[seat]}<span class="card-name">${i.name}</span><span class="card-who"><span class="card-agent-name">${i.agent}</span> <span class="agent-mark">agent</span></span></div>
        <div class="card-stance">${esc(i.stance)}</div>
        <div class="card-note">Seat open: invite a teammate. Your agents hold it until they arrive.</div>`;
    }
    return c;
  }
  // A card lands tilted 1-3 degrees, the same tilt every time for the same seat.
  const TILT = { product: -1, design: -2.2, data: 1.4, research: -1.2, strategy: 1.8, engineering: 2.6 };
  let herStance = '';
  function setHerStance(text, animate) {
    herStance = text || '';
    const st = document.getElementById('her-stance'); if (!st) return;
    st.textContent = herStance || 'We’ll find out today.';
    st.classList.toggle('empty', !herStance);
    if (herStance && animate) place(st, { y: [-8, 0], opacity: [0, 1] }, true);
  }

  function seatCard(seat, animate) {
    const s = el.seat[seat];
    if (s.querySelector('.card')) return;
    const c = makeCard(seat);
    s.appendChild(c); s.classList.add('filled');
    if (seat === 'product') {
      place(c, { y: animate ? [220, 0] : 0, rotate: animate ? [0, TILT[seat]] : TILT[seat] }, animate);
    } else {
      const fromX = (TEAM.indexOf(seat) - 1.5) * 60;
      place(c, { x: animate ? [fromX, 0] : 0, y: animate ? [-240, 0] : 0, rotate: animate ? [TILT[seat] * -3, TILT[seat]] : TILT[seat] }, animate);
    }
  }

  // ---- her own craft: the dashed seventh seat (name tag: public/name-tag.js) ----------------------------
  // At the start she can take "Your own craft" instead of Product: her name tag (craft · good at · loves) is made with
  // her, then she sits here, with the same empty Stance slot as the Product card.
  const diySeat = $('.seat-diy');
  function seatDiy(animate) {
    if (!diySeat || diySeat.querySelector('.card')) return;
    const t = BYOC.herTag || {};
    const c = h('div', 'card card-diy');
    c.innerHTML = `<div class="card-band">${GLYPH.product}<span class="card-name">${esc(t.craft || 'Your craft')}</span></div>
      <div class="card-her"><span class="card-who">${t.goodAt ? 'good at ' + esc(t.goodAt) : 'your seat'}</span></div>`;
    diySeat.appendChild(c); diySeat.classList.add('filled');
    el.room.dataset.herSeat = 'diy';
    place(c, { y: animate ? [220, 0] : 0, rotate: animate ? [0, -1] : -1 }, animate);
  }
  async function takeDiySeat() {
    if (BYOC.beat !== 0 || BYOC.replay || !BYOC.nameTag || !BYOC.nameTag.open) return;
    const tag = await BYOC.nameTag.open();
    if (!tag || BYOC.beat !== 0) return;
    stage(1);
  }
  if (diySeat) diySeat.addEventListener('click', takeDiySeat);
  BYOC.takeDiySeat = takeDiySeat;

  // ---- teammates' small sheets ----------------------------------------------------------------
  function sheetInit(seat) {
    const sh = el.seatSheet[seat];
    sh.innerHTML = `<div class="mini-head"><i></i><span class="mini-title">${seat === 'product' ? 'Product · spec' : INFO[seat].name}</span>
      <span class="mini-step">waiting</span></div><ul class="mini-lines"></ul><div class="mini-more"></div>`;
    sh._items = new Map(); sh._count = 0;
  }
  function sheetShow(seat, animate) {
    const sh = el.seatSheet[seat];
    if (!sh.hidden) return;
    sheetInit(seat); sh.hidden = false;
    const tilt = { product: 0.6, design: 1, data: -0.8, research: 0.7, strategy: -0.6, engineering: -1.1 }[seat];
    place(sh, { y: animate ? [-40, 0] : 0, rotate: tilt, opacity: animate ? [0, 1] : 1 }, animate);
  }
  function sheetStep(seat, text) {
    const sh = el.seatSheet[seat]; if (!sh) return;
    if (sh.hidden) sheetShow(seat, !instantMode);
    $('.mini-step', sh).textContent = text;
  }
  const MAX_LINES = { product: 4, design: 6, data: 6, research: 6, strategy: 6, engineering: 6 };
  function sheetAdd(seat, id, text) {
    const sh = el.seatSheet[seat]; if (!sh) return;
    if (sh.hidden) sheetShow(seat, !instantMode);
    sh._count++;
    const ul = $('.mini-lines', sh);
    const li = h('li', null, esc(text)); li.title = text;
    if (id) sh._items.set(id, li);
    // Stage type is bigger, so one line fewer fits each sheet.
    if (ul.children.length < MAX_LINES[seat] - (document.body.classList.contains('stage') ? 1 : 0)) {
      ul.appendChild(li);
      if (!instantMode) place(li, { y: [-10, 0], opacity: [0, 1] }, true);
    }
    const hiddenCount = sh._count - ul.children.length;
    $('.mini-more', sh).textContent = hiddenCount > 0 ? `+${hiddenCount} more` : '';
  }
  function findItem(id) {
    for (const s of SEATS) { const it = el.seatSheet[s]._items?.get(id); if (it) return it; }
    return null;
  }

  // ---- her sheet ------------------------------------------------------------------------------
  let inputMode = 'off'; // 'idea' | 'line' | 'off'
  function setInputMode(mode) {
    inputMode = mode;
    const inp = el.herInput;
    if (mode === 'idea') { inp.placeholder = 'Write the idea'; el.herHint.textContent = 'Enter to write it down'; }
    if (mode === 'line') { inp.placeholder = 'One step of the journey'; el.herHint.textContent = 'Enter for each step · empty Enter: team, go'; }
    el.herForm.hidden = mode === 'off' || BYOC.replay;
    if (mode !== 'off' && !BYOC.replay) setTimeout(() => inp.focus(), 30);
  }
  function setIdea(text) { el.herIdea.textContent = text || ''; }
  let flowMounted = false;
  function mountFlow() {
    if (flowMounted) return;
    if (BYOC.flow && typeof BYOC.flow.mount === 'function') {
      try { BYOC.flow.mount(el.herFlow); flowMounted = true; } catch (e) { console.error('flow.mount', e); }
    }
  }
  // Hand each journey line to piece 2's flow if it is loaded; otherwise show it as plain text.
  const hasFlow = () => !!(BYOC.flow && typeof BYOC.flow.addLine === 'function');
  function plainLine(text) {
    const d = h('div', 'plain-line'); d.textContent = text;
    el.herFlow.appendChild(d);
    if (!instantMode) place(d, { x: [-18, 0], opacity: [0, 1] }, true);
  }
  // An ask lands in her work: piece 2 draws it on the flow; until then, a sticky note on her sheet.
  function drawAsk(ask) {
    if (BYOC.flow && typeof BYOC.flow.showAsk === 'function') return; // piece 2 shows asks from its own 'ask' listener
    const n = h('div', 'note');
    n.innerHTML = `<b>${ask.kind === 'fork' ? 'fork' : 'pin'}${ask.attachTo ? ' on ' + esc(ask.attachTo) : ''} · ${esc(ask.seat)}</b>
      ${esc(ask.decision)}<span class="rec">recommend: ${esc(ask.recommendation)}</span>`;
    el.herNotes.appendChild(n);
    const tilt = [-1.5, 1.2, -0.8][el.herNotes.children.length % 3];
    place(n, { y: instantMode ? 0 : [-30, 0], x: instantMode ? 0 : [24, 0], rotate: tilt }, !instantMode);
  }

  async function startRun(idea) {
    setIdea(idea);
    setInputMode('line');
    stage(4);
    try {
      const r = await BYOC.api('/api/run', { idea, ...(BYOC.intro ? { intro: BYOC.intro } : {}), ...(BYOC.herSeat === 'diy' ? { seat: 'diy', tag: BYOC.herTag } : {}) }); // her own craft: public/name-tag.js
      BYOC.run = r.run;
      status(`run ${r.run}`);
      flushPending();
      if (BYOC.firstSketch) BYOC.firstSketch.start(r.run, idea); // Design's first sketch (public/first-sketch.js)
    } catch (e) {
      BYOC.run = 'local-' + Date.now();
      status(`no run API yet (${e.status || e.message}): drawing here only`);
    }
    loadFileForRun(BYOC.run);
  }
  // Her line, live. Piece 2's addLine posts it to /api/run/:id/line and draws what comes back;
  // without piece 2 the room posts it and shows it as plain text.
  // Lines go to the server one at a time, in order: each is parsed against the lines logged before it.
  let lineQueue = Promise.resolve();
  function addHerLine(text) { lineQueue = lineQueue.then(() => sendHerLine(text)); return lineQueue; }
  async function sendHerLine(text) {
    const local = !BYOC.run || BYOC.run.startsWith('local-');
    if (hasFlow() && !local) {
      mountFlow();
      try { await BYOC.flow.addLine(text); }
      catch (e) { status(`line not logged (${e.status || e.message})`); plainLine(text); }
      return;
    }
    plainLine(text);
    if (local) return;
    try { await BYOC.api(`/api/run/${encodeURIComponent(BYOC.run)}/line`, { text }); }
    catch (e) { status(`line not logged (${e.status || e.message})`); }
  }
  // The team's work arrives as events; the step stays up until the selector is done (or the team stops).
  let teamStep = null;
  async function teamGo() {
    if (!BYOC.run || BYOC.run.startsWith('local-')) { status('no run API yet: the team cannot start'); return; }
    teamStep = stepBegin('The team is proposing');
    try { await BYOC.api(`/api/run/${encodeURIComponent(BYOC.run)}/propose`, {}, { step: false }); }
    catch (e) { status(`propose failed (${e.status || e.message})`); if (teamStep) { stepEnd(teamStep, e); teamStep = null; } }
  }
  function teamProgress() {
    if (!teamStep) return;
    const done = new Set(seen.filter(e => e.type === 'teammate.done' || e.type === 'teammate.error').map(e => e.seat)).size;
    stepSet(teamStep, done >= SEATS.length ? 'The team is choosing what to bring you' : `The team is proposing · ${done} of ${SEATS.length} done`);
  }
  let buildStep = null;
  el.herForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = el.herInput.value.trim();
    if (inputMode === 'idea') { if (!text) return; el.herInput.value = ''; startRun(text); }
    else if (inputMode === 'line') {
      el.herInput.value = '';
      if (!text) { setInputMode('off'); stage(5); } else if (!(BYOC.firstSketch && BYOC.firstSketch.takes(text))) addHerLine(text);
    }
  });

  // ---- her file card --------------------------------------------------------------------------
  // taste.md: one principle per line, "- [L1] text", seed lines tagged "(prepared for the demo)".
  function parseTaste(md) {
    const out = [];
    for (const line of String(md || '').split('\n')) {
      const m = line.match(/^\s*-\s*\[(L\d+)\]\s*(.*)$/);
      if (!m) continue;
      const prepMatch = m[2].match(/\s*\((prepared for the demo|fixture[^)]*)\)\s*$/i);
      out.push({ id: m[1], text: prepMatch ? m[2].slice(0, prepMatch.index) : m[2], tag: prepMatch ? prepMatch[1] : null });
    }
    return out;
  }
  function fileAddLine({ id, text, tag }, isNew) {
    const li = h('li', isNew ? 'new' : '');
    li.dataset.id = id;
    li.innerHTML = `<span class="lid">${esc(id)}</span><span><span class="ltext">${esc(text)}</span>${tag ? `<br><span class="prep">${esc(tag)}</span>` : ''}</span>`;
    const existing = el.fileLines.querySelector(`li[data-id="${CSS.escape(id)}"]`);
    if (existing) existing.replaceWith(li); else el.fileLines.appendChild(li);
    if (isNew && !instantMode) place(li, { y: [-14, 0], opacity: [0, 1] }, true);
    fitFile();
  }
  // Her file always shows every line, newest included: the lines scale down (never up) to fit the card.
  function fitFile() { fitFileNow(); setTimeout(fitFileNow, 350); }
  function fitFileNow() {
    requestAnimationFrame(() => {
      const ol = el.fileLines; ol.style.transform = ''; ol.style.transformOrigin = '0 0';
      const head = el.fileCard.querySelector('.file-head');
      const others = [...el.fileCard.children].filter(c => c !== ol && c !== head && !c.hidden).reduce((a, c) => a + c.offsetHeight, 0);
      const avail = el.fileCard.clientHeight - head.offsetHeight - others - 16;
      const k = Math.min(1, avail / (ol.scrollHeight || 1));
      if (k < 0.999) { ol.style.transform = `scale(${k.toFixed(3)})`; ol.style.width = `${(100 / k).toFixed(1)}%`; } else ol.style.width = '';
    });
  }
  function fileLoad(md, note) {
    el.fileLines.innerHTML = '';
    for (const l of parseTaste(md)) fileAddLine(l, false);
    el.fileNote.textContent = note || '';
    fitFile();
  }
  async function loadFileForRun(run, tries = 3) {
    if (!run || run.startsWith('local-')) { el.fileNote.textContent = 'Your file opens when the run starts.'; return; }
    for (let i = 0; i < tries; i++) {
      try {
        const r = await BYOC.api(`/api/taste/${encodeURIComponent(run)}`);
        if (r && r.md != null) { fileLoad(r.md); return; }
      } catch {}
      await wait(800);
    }
    el.fileNote.textContent = 'Your file isn’t written yet.';
  }
  BYOC.file = { load: fileLoad, parse: parseTaste };

  // "Sounds like": types in with a yellow highlighter sweep; she can keep it (Enter) or reword it.
  let typing = null;
  function soundsLike(text) {
    text = String(text || '').replace(/^\s*sounds like\s*:\s*/i, '');
    const box = el.soundsLike;
    box.hidden = false;
    box.innerHTML = `<span class="sl-label">Sounds like:</span><span class="sl-text"><span class="sl-mark"></span><span class="sl-words"></span></span>`;
    const mark = $('.sl-mark', box), words = $('.sl-words', box);
    if (typing) clearInterval(typing);
    if (instantMode) { words.textContent = text; afterTyped(); return; }
    place(mark, { scaleX: [0, 1] }, true);
    let i = 0;
    typing = setInterval(() => { words.textContent = text.slice(0, ++i); if (i >= text.length) { clearInterval(typing); typing = null; afterTyped(); } }, 28);
    // Keep it or reword it, right there on the card: the words are editable, Enter writes them into her file.
    function afterTyped() {
      if (BYOC.replay) return;
      const hint = h('span', 'sl-hint', 'Enter keeps it \u00b7 type to reword');
      box.appendChild(hint);
      words.contentEditable = 'true';
      words.spellcheck = false;
      words.focus();
      const sel = window.getSelection(); sel.selectAllChildren(words); sel.collapseToEnd();
      words.addEventListener('keydown', async ev => {
        ev.stopPropagation();
        if (ev.key === 'Escape') { words.blur(); return; }
        if (ev.key !== 'Enter') return;
        ev.preventDefault();
        const t = words.textContent.trim();
        if (!t) return;
        words.contentEditable = 'false'; hint.textContent = 'writing it into your file';
        try { await BYOC.api(`/api/run/${encodeURIComponent(BYOC.run)}/taste`, { text: t }); }
        catch (e) { status(`file not written (${e.status || e.message})`); hint.textContent = 'Not written. Enter to try again.'; words.contentEditable = 'true'; }
      });
    }
  }

  // ---- counter and meter ----------------------------------------------------------------------
  // Client-side tally, a pure function of the events seen so far. Used during replay (to roll with the
  // events) and live until GET /api/run/:id/tally exists. came = candidates, brought = asks,
  // meter = craft / (craft + stamp) over events that carry a mode.
  function tallyFromEvents(events) {
    let came = 0, brought = 0, decided = 0, craft = 0, stamp = 0;
    for (const e of events) {
      if (e.type === 'candidate') came++;
      else if (e.type === 'ask') brought++;
      else if (e.type === 'decided') decided++;
      if (e.mode === 'craft') craft++;
      else if (e.mode === 'stamp') stamp++;
    }
    const pct = craft + stamp ? Math.round((100 * craft) / (craft + stamp)) : null;
    return { came, brought, decided, meter: { craft, stamp, pct }, source: 'client' };
  }
  BYOC.tallyFromEvents = tallyFromEvents;

  function renderTally(t) {
    const animate = !instantMode;
    rollers.came.set(t.came, animate);
    rollers.brought.set(t.brought, animate);
    rollers.pct.set(t.meter.pct, animate);
    const { craft, stamp } = t.meter, tot = craft + stamp;
    const cw = tot ? (100 * craft) / tot : 0, sw = tot ? (100 * stamp) / tot : 0;
    for (const [node, w] of [[$('#meter-craft'), cw], [$('#meter-stamp'), sw]]) {
      if (M && animate) M.animate(node, { width: `${w}%` }, SPRING); else node.style.width = `${w}%`;
    }
    $('#meter-counts').textContent = `craft ${craft} · stamping ${stamp}`;
  }
  let serverTally = null; // null: unknown, false: endpoint missing, true: in use
  let tallyTimer = null;
  function refreshTally() {
    clearTimeout(tallyTimer);
    tallyTimer = setTimeout(async () => {
      const live = !BYOC.replay && BYOC.run && !BYOC.run.startsWith('local-');
      if (live && serverTally !== false) {
        try {
          const t = await BYOC.api(`/api/run/${encodeURIComponent(BYOC.run)}/tally`, undefined, { step: false });
          serverTally = true; renderTally({ ...t, meter: t.meter || tallyFromEvents(seen).meter }); tallySource('server'); return;
        } catch (e) { if (e.status === 404) serverTally = false; }
      }
      renderTally(tallyFromEvents(seen)); tallySource('client');
    }, instantMode ? 0 : 120);
  }
  function tallySource(s) { el.tally.dataset.source = s; }
  function showTally(animate) {
    if (!el.tally.hidden) return;
    el.tally.hidden = false;
    renderTally(tallyFromEvents(seen));
    place(el.tally, { x: animate ? [60, 0] : 0, rotate: 0.8, opacity: animate ? [0, 1] : 1 }, animate);
  }
  el.counter.addEventListener('click', () => emit('counter.tap', { run: BYOC.run }));

  // ---- Design's grey sketches -----------------------------------------------------------------
  // Asked for as soon as she has answered all her asks (her answers shape them), so the beat is quick.
  const sk = { sheet: $('#sketch-sheet'), inner: $('#sketch-inner'), wait: $('#sketch-wait'), req: null };
  BYOC.el.sketchSheet = sk.sheet;
  BYOC.timings = {};
  function sketchUrl() { return `/api/run/${encodeURIComponent(BYOC.run)}/sketches`; }
  // One request for Design's frames, shared by the sketch sheet and her focus document.
  BYOC.getSketches = () => sk.req || (sk.req = BYOC.api(sketchUrl(), undefined, { step: false }).catch(e => { sk.req = null; throw e; }));
  // Her journey changed (a line, a reshape, her answer redrawing it): frames fetched for the old boxes are stale.
  // Drop them unless they're already on the table; ask again once the redraw settles.
  let staleTimer = null;
  // If the frames are already on the table, Design re-sketches on the new shape and the frames swap in.
  function staleSketches() {
    if (!sk.req || BYOC.replay) return;
    sk.req = null;
    clearTimeout(staleTimer);
    staleTimer = setTimeout(async () => {
      if (sk.sheet.hidden) return maybePrefetchSketches();
      const sid = stepBegin('Design is re-sketching on the new shape');
      try { const data = await BYOC.getSketches(); stepEnd(sid); await showSketches(data); }
      catch (e) { stepEnd(sid, e); }
    }, 800);
  }
  function maybePrefetchSketches() {
    if (BYOC.replay || sk.req || !BYOC.run || BYOC.run.startsWith('local-')) return;
    const asks = seen.filter(e => e.type === 'ask').length;
    const answered = new Set(seen.filter(e => e.type === 'answer').map(e => e.askId)).size;
    if (asks && answered >= asks) { sk.req = BYOC.api(sketchUrl(), undefined, { step: false }); sk.req.catch(() => { sk.req = null; }); }
  }
  async function showSketches(data) {
    sk.wait.textContent = '';
    if (!BYOC.sketches || !BYOC.sketches.show) { sk.wait.textContent = 'Sketches not loaded.'; return; }
    await BYOC.sketches.show(sk.inner, data);
    const fit = () => fitInto(sk.inner, sk.sheet.clientHeight - 36);
    fit(); setTimeout(fit, 400);
  }
  async function openSketches(animate) {
    sk.sheet.hidden = false;
    place(sk.sheet, { x: animate ? [-700, 0] : 0, y: animate ? [-60, 0] : 0, rotate: animate ? [-4, -0.6] : -0.6 }, animate);
    if (BYOC.replay) { if (!sk.inner.children.length) sk.wait.textContent = 'Design is sketching'; return; }
    if (!BYOC.run || BYOC.run.startsWith('local-')) { sk.wait.textContent = 'No run yet: nothing to sketch.'; return; }
    if (sk.inner.children.length) return;
    sk.wait.textContent = 'Design is sketching the screens of the journey';
    const t0 = performance.now();
    const sid = stepBegin('Design is sketching');
    try {
      const data = await (sk.req || (sk.req = BYOC.api(sketchUrl(), undefined, { step: false })));
      BYOC.timings.sketchesWaitMs = Math.round(performance.now() - t0);
      stepEnd(sid);
      await showSketches(data);
    } catch (e) { stepEnd(sid, e); sk.wait.textContent = `Sketches stopped (${e.status || e.message}). R replays the rehearsal.`; sk.req = null; }
  }

  // Scale content down (never up) so it fits its sheet; no scrolling on stage.
  function fitInto(node, avail) {
    if (!node || !node.parentElement) return;
    const natural = node.offsetHeight, wide = node.scrollWidth, room = node.parentElement.clientWidth;
    const k = Math.min(1, avail / (natural || 1), room / (wide || 1));
    const t = k < 0.999 ? `scale(${k.toFixed(3)})` : '';
    if (node.style.transform !== t) node.style.transform = t;
  }
  let fitQueued = false;
  function refit() {
    if (fitQueued) return; fitQueued = true;
    requestAnimationFrame(() => { fitQueued = false; fitInto(el.herFlow.querySelector('.fl-wrap'), el.herFlow.clientHeight); });
  }
  new MutationObserver(refit).observe(el.herFlow, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

  // ---- two states: the room, or her focus (DEMO focus rules, 14 Nov) -----------------------------
  // The room: the team at work, with its own chatter. Her focus: she opens a note from her tray and the view becomes just
  // her and that one document (public/focus-doc.js). Nothing dims or freezes; nothing opens by itself; nobody waits.
  BYOC.focus = { open: null, waiting: [] };
  const asks = new Map(); // id -> ask, in the order the team suggests them
  const answeredIds = new Set();
  const askText = a => a.question || a.decision || '';
  const who = a => { const i = INFO[a.seat] || { name: a.seat }; return (a.by || i.agent) ? `${a.by || i.agent} · ${i.name}` : i.name; };
  function syncFocus() {
    const open = BYOC.focusDoc && BYOC.focusDoc.openId ? BYOC.focusDoc.openId() : null;
    const waiting = [...asks.values()].filter(a => !answeredIds.has(a.id) && a.id !== open)
      .map(a => ({ id: a.id, seat: a.seat, by: a.by || null, question: askText(a) }));
    BYOC.focus = { open, waiting };
    renderTray();
    renderStep();
  }
  BYOC.syncFocus = syncFocus;
  BYOC.asks = () => [...asks.values()];
  function openNote(id) {
    const a = asks.get(id);
    if (!a || !BYOC.focusDoc) return false;
    BYOC.focusDoc.open(a);
    return true;
  }
  BYOC.openNote = openNote;
  // The tray: a small stack of notes at the edge of her seat, each in its teammate's ink: "Noor · Research" and a few
  // words of the question. The top note is the team's suggestion; she picks which to open. Notes slide in only at a
  // natural pause, about 1 s after it, never while she's typing or speaking. No number, no red, no pulse.
  const tray = h('aside', 'tray'); tray.id = 'tray'; tray.hidden = true;
  tray.setAttribute('aria-label', 'Notes from your team');
  el.room.appendChild(tray);
  let trayTimer = null;
  const isTypingNow = () => { const a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)); };
  const fewWords = t => { const w = String(t || '').replace(/[?.!]+\s*$/, '').split(/\s+/); return (w.length > 6 ? w.slice(0, 6).join(' ') + '…' : w.join(' ')) + '?'; };
  function renderTray() {
    const w = BYOC.focus.waiting;
    const show = !BYOC.focus.open && w.length > 0 && BYOC.beat >= 5 && BYOC.beat < 8;
    clearTimeout(trayTimer);
    if (!show) { tray.hidden = true; return; }
    const ids = w.map(n => n.id).join(',');
    if (!tray.hidden && tray.dataset.ids === ids) return;
    trayTimer = setTimeout(function slideIn() {
      if (isTypingNow()) { trayTimer = setTimeout(slideIn, 500); return; }
      if (BYOC.focus.open) return;
      tray.dataset.ids = ids;
      tray.innerHTML = w.map((n, i) => `<button type="button" class="tray-note${i ? '' : ' tray-top'}" data-ask="${esc(n.id)}" data-seat="${esc(n.seat)}">
        <span class="tray-seat">${esc(who(n))}</span><span class="tray-text">${esc(fewWords(n.question))}</span></button>`).join('');
      const was = tray.hidden; tray.hidden = false;
      if (was && !instantMode) place(tray, { y: [24, 0], opacity: [0, 1] }, true);
    }, instantMode || BYOC.replay ? 0 : 1000);
  }
  // The clicker's forward key opens the top note when the tray is out (stage.js asks first).
  BYOC.openTopNote = () => { const top = tray.hidden ? null : tray.querySelector('.tray-note'); return top ? openNote(top.dataset.ask) : false; };
  tray.addEventListener('click', e => { const b = e.target.closest('.tray-note'); if (b) openNote(b.dataset.ask); });

  // ---- the room's chatter (DEMO focus rules): the team talking about its own work, never to her ----------
  // chatter { by, seat, text } events (written by the server from real run events). Each line shows a few seconds
  // under its speaker's card; at most three at once. Her document covers the room, so she never sees it while focused.
  const chatter = h('div', 'chatter'); chatter.setAttribute('aria-hidden', 'true');
  el.room.appendChild(chatter);
  function chat(ev) {
    const s = el.seat[ev.seat]; if (!s || !ev.text) return;
    const line = h('div', 'chatter-line'); line.dataset.seat = ev.seat;
    line.appendChild(h('span', 'chatter-who', `${ev.by || (INFO[ev.seat] && INFO[ev.seat].agent) || INFO[ev.seat].name}: `));
    line.appendChild(h('span', 'chatter-text', ev.text));
    line.style.left = (s.offsetLeft + 12) + 'px';
    line.style.top = (s.offsetTop + s.offsetHeight - 6) + 'px';
    chatter.querySelectorAll(`.chatter-line[data-seat="${ev.seat}"]`).forEach(o => o.remove());
    chatter.appendChild(line);
    while (chatter.children.length > 3) chatter.firstChild.remove();
    if (!instantMode) place(line, { y: [-8, 0], opacity: [0, 1] }, true);
    setTimeout(() => { if (line.isConnected) line.remove(); }, 4500);
  }
  BYOC.chat = chat;

  // ---- leaning in (DEMO 0:45-1:05) ----------------------------------------------------------------
  // A real `lean {seat, nodeId, reason}` (a teammate picked up her change): its card nudges toward her work and its ink
  // marks the box it picked up. Never during her focus time: a lean that arrives then waits until the check-in closes.
  let leanQueue = [];
  function leanIn(ev) {
    if (!ev || !el.seat[ev.seat] || ev.seat === 'product') return;
    if (BYOC.focus && BYOC.focus.open) { leanQueue.push(ev); return; }
    const card = el.seat[ev.seat].querySelector('.card');
    if (card && !instantMode) {
      const s = el.seat[ev.seat], her = el.herSheet;
      const dx = (her.offsetLeft + her.offsetWidth / 2) - (s.offsetLeft + s.offsetWidth / 2);
      const dy = (her.offsetTop + 40) - (s.offsetTop + s.offsetHeight / 2);
      const d = Math.hypot(dx, dy) || 1, k = 22 / d; // a nudge, not a move: about 22px toward her sheet
      card.classList.add('leaning');
      place(card, { x: [0, dx * k, dx * k, 0], y: [0, dy * k, dy * k, 0], rotate: [TILT[ev.seat], TILT[ev.seat] * 0.3, TILT[ev.seat] * 0.3, TILT[ev.seat]], scale: [1, 1.04, 1.04, 1] },
        true, { type: 'tween', duration: 1.6, times: [0, 0.15, 0.8, 1], ease: 'easeOut' })
        .then(() => card.classList.remove('leaning'), () => card.classList.remove('leaning'));
    }
    // Its ink on the box it picked up (stays: a quiet record of who's on it).
    const box = el.herFlow.querySelector(`.fl-box[data-node="${CSS.escape(String(ev.nodeId || ''))}"]`);
    if (box) {
      let marks = box.querySelector('.lean-marks');
      if (!marks) { marks = h('span', 'lean-marks'); box.appendChild(marks); }
      if (!marks.querySelector(`[data-seat="${ev.seat}"]`)) {
        const m = h('i', 'lean-mark'); m.dataset.seat = ev.seat; m.title = `${INFO[ev.seat].name} picked this up${ev.reason ? ': ' + ev.reason : ''}`;
        marks.appendChild(m);
        if (!instantMode) place(m, { scale: [0, 1] }, true);
      }
    }
    emit('leaned', ev);
  }
  BYOC.leanIn = leanIn;
  BYOC.on('focus', f => { if (!f.open && leanQueue.length) { const q = leanQueue; leanQueue = []; q.forEach(leanIn); } });

  // ---- build (her one press) and her page --------------------------------------------------------
  // Entering the build beat live is her press (or B). Engineering's sheet ticks through build.step events; the
  // live step shows under the table; build.done brings her page over the table.
  let buildReq = null;
  BYOC.build = async function () {
    if (BYOC.replay || buildReq || !BYOC.run || BYOC.run.startsWith('local-')) return;
    if (seen.some(e => e.type === 'build.done')) return;
    if (!buildStep) buildStep = stepBegin('Engineering is building');
    buildReq = BYOC.api(`/api/run/${encodeURIComponent(BYOC.run)}/build`, {}, { step: false });
    try { await buildReq; }
    catch (e) { status(`build failed (${e.status || e.message})`); if (buildStep) { stepEnd(buildStep, e); buildStep = null; } }
    finally { buildReq = null; }
  };
  const pageSheet = h('section', 'page-sheet'); pageSheet.id = 'page-sheet'; pageSheet.hidden = true;
  pageSheet.innerHTML = '<div class="page-head"><span class="page-title">Your page</span><span class="page-url" id="page-url"></span></div><div class="page-frame"><iframe id="page-iframe" title="Your page" loading="eager"></iframe></div>';
  el.room.appendChild(pageSheet);
  BYOC.el.pageSheet = pageSheet;
  function pageUrl() {
    const done = [...seen].reverse().find(e => e.type === 'build.done');
    if (!done) return null;
    return BYOC.replay && BYOC.replayName ? `/runs/${encodeURIComponent(BYOC.replayName)}/page/` : done.url;
  }
  function showPage(animate) {
    const url = pageUrl(); if (!url) return;
    const fr = $('#page-iframe', pageSheet);
    if (fr.getAttribute('src') !== url) fr.setAttribute('src', url);
    $('#page-url', pageSheet).textContent = url;
    if (!pageSheet.hidden) return;
    pageSheet.hidden = false;
    place(pageSheet, { y: animate ? [520, 0] : 0, rotate: animate ? [3, 0.3] : 0.3 }, animate);
  }

  // ---- events ---------------------------------------------------------------------------------
  let seen = [];      // events of the run on screen, in order
  let pending = [];   // live events that arrived before we knew our run id
  let instantMode = false;
  BYOC.events = () => seen.slice();

  // dispatch(ev, source): source 'live' (SSE) or 'replay'. Room reacts first, then BYOC.on handlers.
  function dispatch(ev, source = 'live') {
    if (!ev || !ev.type) return;
    if (source === 'live') {
      if (BYOC.replay) return;
      if (!BYOC.run) { pending.push(ev); if (pending.length > 200) pending.shift(); return; }
      if (ev.run !== BYOC.run) return;
    }
    seen.push(ev);
    try { react(ev, source); } catch (e) { console.error('room', ev.type, e); }
    emit(ev.type, ev);
  }
  function flushPending() { const p = pending; pending = []; for (const ev of p) if (ev.run === BYOC.run) dispatch(ev, 'live'); }
  BYOC.dispatch = dispatch;

  function react(ev, source) {
    switch (ev.type) {
      case 'run.start':
        if (ev.intro) BYOC.intro = ev.intro;
        if (ev.seat === 'diy' && !diySeat?.querySelector('.card')) { // a replay of a run in her own craft
          BYOC.herSeat = 'diy'; if (ev.tag) BYOC.herTag = ev.tag;
          el.seat.product.querySelector('.card')?.remove(); el.seat.product.classList.remove('filled');
          seatDiy(false);
        }
        setIdea(ev.idea);
        if (BYOC.beat < 3) stage(3);
        if (BYOC.beat < 4) stage(4);
        break;
      case 'flow.line':
        if (BYOC.beat < 4) stage(4);
        // Piece 2 draws flow.line events itself (BYOC.on). Without it, replayed lines show as plain text;
        // live lines were already drawn as she typed them.
        if (source !== 'live' && !hasFlow()) plainLine(ev.text);
        staleSketches();
        break;
      case 'flow.reset':
        staleSketches();
        break;
      case 'teammate.start':
        if (BYOC.beat < 5) stage(5);
        sheetStep(ev.seat, 'working: proposing');
        break;
      case 'candidate':
        if (BYOC.beat < 5) stage(5);
        sheetAdd(ev.seat, ev.id, ev.decision);
        refreshTally();
        break;
      case 'teammate.done':
        sheetStep(ev.seat, `${ev.count ?? ''} proposed${ev.ms ? ' · ' + (ev.ms / 1000).toFixed(1) + 's' : ''}`);
        if (source === 'live') teamProgress();
        break;
      case 'select.done':
        if (teamStep) { stepEnd(teamStep); teamStep = null; }
        refreshTally();
        break;
      case 'ask': {
        if (BYOC.beat < 6) stage(6);
        const it = findItem(ev.id); if (it) it.classList.add('brought');
        asks.set(ev.id, ev); syncFocus(); // it waits in her tray until she opens it
        refreshTally();
        break;
      }
      case 'decided': {
        const it = findItem(ev.id);
        if (it) { let c = it.querySelector('.cite'); if (!c) { c = h('span', 'cite'); it.append(' ', c); } c.textContent = `\u00b7 ${ev.cites}`; }
        refreshTally();
        break;
      }
      case 'ask.refused': case 'stamp': case 'pin': case 'taste.written':
        if (ev.type === 'taste.written' && !ev.hidden) { el.soundsLike.hidden = true; fitFile(); fileAddLine({ id: ev.id, text: ev.text }, true); }
        refreshTally();
        break;
      case 'taste.suggested':
        if (BYOC.beat < 7) stage(7);
        soundsLike(ev.text);
        break;
      case 'answer':
        answeredIds.add(ev.askId); syncFocus();
        maybePrefetchSketches();
        refreshTally();
        break;
      case 'sketches':
        // Live, the room renders what its own request returns; a replay shows the frames from the log.
        if (source !== 'live') { if (BYOC.beat < 7) stage(7); showSketches(ev); }
        break;
      case 'lean':
        leanIn(ev, source);
        break;
      case 'chatter':
        chat(ev);
        break;
      case 'teammate.error':
        sheetStep(ev.seat, 'stopped: model error');
        if (source === 'live') teamProgress();
        break;
      case 'propose.error':
        status(`the team stopped: ${ev.error || 'error'}`);
        if (teamStep) { stepEnd(teamStep, { status: 500 }); teamStep = null; }
        break;
      case 'build.step':
        if (BYOC.beat < 8) stage(8);
        if (/^Build failed/.test(ev.step || '')) { sheetStep('engineering', 'stopped'); if (buildStep) { stepEnd(buildStep, { status: 500 }); buildStep = null; } break; }
        sheetStep('engineering', `building: ${ev.step}`);
        if (source === 'live') { if (!buildStep) buildStep = stepBegin('Engineering is building'); stepSet(buildStep, `Engineering is building: ${ev.step}`); }
        break;
      case 'build.done':
        sheetStep('engineering', `built${ev.ms ? ' in ' + (ev.ms / 1000).toFixed(1) + 's' : ''}`);
        if (buildStep) { stepEnd(buildStep); buildStep = null; }
        setTimeout(() => { if (BYOC.beat < 9) stage(9, { instant: instantMode }); else showPage(!instantMode); }, instantMode ? 0 : 600);
        break;
      case 'build.error':
        if (buildStep) { stepEnd(buildStep, { status: 500 }); buildStep = null; }
        break;
    }
  }

  function connectSSE() {
    if (!window.EventSource) return;
    const es = new EventSource('/events');
    es.onmessage = m => { try { dispatch(JSON.parse(m.data), 'live'); } catch {} };
  }

  // ---- beats ----------------------------------------------------------------------------------
  // stage(n): move the room forward to beat n, playing each beat's entrance in order.
  // stage(n, {instant:true}) jumps there with no motion. Going back to 0-3 rebuilds instantly.
  let walkToken = 0;

  // ---- assembling the team (DEMO 0:06-0:26) and her card (0:26-0:34) ------------------------------
  // Each teammate's card lands big mid-table (Loves / Brings / Stance), holds, then shrinks into its seat.
  let assembling = false, assembleSkip = false, introCard = null;
  function bigCard(seat) {
    const i = INFO[seat];
    const c = h('div', 'big-card'); c.dataset.seat = seat;
    const loves = seat === 'product'
      ? `<span class="bc-love-start">I love</span><textarea class="bc-love-input" id="intro-input" rows="2" spellcheck="false" maxlength="160" placeholder="…" aria-label="I love…"></textarea>`
      : `“${esc(i.loves)}”`;
    c.innerHTML = `<div class="card-band">${GLYPH[seat]}<span class="card-name">${i.name}</span><span class="card-who">${seat === 'product' ? 'your seat' : `<span class="card-agent-name">${i.agent}</span> <span class="agent-mark">agent</span>`}</span></div>
      <dl class="bc-body"><dt>Loves</dt><dd class="bc-loves">${loves}</dd>
      <dt>Brings</dt><dd class="bc-brings">${esc(i.brings)}</dd>
      ${i.stance ? `<dt>Stance</dt><dd class="bc-stance">${esc(i.stance)}</dd>` : ''}</dl>`;
    el.room.appendChild(c);
    return c;
  }
  // Shrink a big card into its seat, then the seat's own card takes over.
  async function flyToSeat(c, seat, animate) {
    const s = el.seat[seat];
    const dx = (s.offsetLeft + s.offsetWidth / 2) - (c.offsetLeft + c.offsetWidth / 2);
    const dy = (s.offsetTop + s.offsetHeight / 2) - (c.offsetTop + c.offsetHeight / 2);
    if (animate) await Promise.resolve(place(c, { x: dx, y: dy, scale: s.offsetWidth / c.offsetWidth, rotate: TILT[seat] }, true)).catch(() => {});
    c.remove();
    seatCard(seat, false);
  }
  async function holdFor(ms) { const end = Date.now() + ms; while (Date.now() < end && !assembleSkip) await wait(50); }
  async function assemble(animate, tok) {
    if (!animate) { for (const s of TEAM) seatCard(s, false); return; }
    assembling = true; assembleSkip = false;
    try {
      for (const s of TEAM) {
        if (tok !== walkToken) return;
        if (el.seat[s].querySelector('.card')) continue;
        if (assembleSkip) { seatCard(s, false); continue; }
        const c = bigCard(s);
        await Promise.resolve(place(c, { y: [260, 0], scale: [0.6, 1], rotate: [4, TILT[s] * 0.5] }, true)).catch(() => {});
        await holdFor(HOLD_MS);
        if (tok !== walkToken) { c.remove(); return; }
        await flyToSeat(c, s, !assembleSkip);
      }
    } finally { assembling = false; }
    if (tok !== walkToken || assembleSkip || BYOC.beat !== 2 || BYOC.replay) return;
    if (BYOC.herSeat === 'diy') { stage(3); return; } // her tag already said what she loves
    openIntro();
  }
  // Her card lifts mid-table, same layout: she finishes "I love…" (typed; voice can fill the same input).
  function openIntro() {
    const prod = el.seat.product.querySelector('.card');
    if (prod) prod.style.visibility = 'hidden';
    introCard = bigCard('product');
    place(introCard, { y: [300, 0], scale: [0.6, 1], rotate: [-3, -0.6] }, true);
    const inp = $('#intro-input', introCard);
    inp.value = BYOC.intro ? String(BYOC.intro).replace(/^i love\s*/i, '') : '';
    inp.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); introDone(); }
    });
    setTimeout(() => inp.focus(), 30);
  }
  // Her line is kept (sent as intro with the run; it becomes L1 of her file), and her card settles into her seat.
  async function introDone() {
    if (!introCard) return;
    const c = introCard; introCard = null;
    const said = $('#intro-input', c).value.trim();
    BYOC.intro = said ? 'I love ' + said.replace(/^i love\s*/i, '') : null;
    $('#intro-input', c).blur();
    const tok = walkToken;
    const s = el.seat.product;
    const dx = (s.offsetLeft + s.offsetWidth / 2) - (c.offsetLeft + c.offsetWidth / 2);
    const dy = (s.offsetTop + s.offsetHeight / 2) - (c.offsetTop + c.offsetHeight / 2);
    await Promise.resolve(place(c, { x: dx, y: dy, scale: s.offsetWidth / c.offsetWidth, rotate: TILT.product }, !instantMode)).catch(() => {});
    c.remove();
    const prod = s.querySelector('.card'); if (prod) prod.style.visibility = '';
    emit('intro', { intro: BYOC.intro });
    if (tok === walkToken && BYOC.beat === 2) stage(3);
  }
  BYOC.introOpen = () => !!introCard;
  BYOC.introDone = introDone;
  // Voice hook (sponsor, later): put spoken words into whichever line she is writing, as editable text.
  BYOC.typeInto = function (text) {
    const t = document.activeElement;
    const target = (t && (t.id === 'intro-input' || t.id === 'her-input' || t.id === 'close-input')) ? t
      : introCard ? $('#intro-input', introCard) : (!el.herForm.hidden ? el.herInput : null);
    if (!target) return false;
    target.value = String(text || ''); target.focus();
    target.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  };
  // She takes her seat herself: a click on the empty Product seat.
  el.seat.product.addEventListener('click', () => { if (BYOC.beat === 0 && !BYOC.replay) stage(1); });

  async function enter(b, animate) {
    const tok = walkToken;
    switch (b) {
      case 1:
        if (BYOC.herSeat === 'diy') seatDiy(animate); else seatCard('product', animate);
        // She took her seat; the team assembles on its own (DEMO 0:06).
        if (animate && !BYOC.replay) { await wait(1100); if (tok === walkToken && BYOC.beat === 1) stage(2); }
        break;
      case 2:
        await assemble(animate, tok);
        break;
      case 3:
        el.herSheet.hidden = false; el.fileCard.hidden = false;
        place(el.herSheet, { y: animate ? [80, 0] : 0, rotate: animate ? [1.5, 0] : 0 }, animate);
        place(el.fileCard, { x: animate ? [-80, 0] : 0, rotate: -1, opacity: animate ? [0, 1] : 1 }, animate);
        if (!el.herIdea.textContent) setInputMode('idea');
        if (!el.fileLines.children.length && !el.fileNote.textContent) el.fileNote.textContent = 'Your file opens when the run starts.';
        break;
      case 4:
        if (inputMode === 'idea' && el.herIdea.textContent) setInputMode('line');
        break;
      case 5:
        setInputMode('off');
        showTally(animate);
        for (const s of SEATS) sheetShow(s, animate);
        if (!BYOC.replay && !instantMode) teamGo();
        break;
      case 6:
        el.herSheet.classList.add('big');
        place(el.herSheet, { y: animate ? [40, 0] : 0, rotate: 0 }, animate);
        refit();
        break;
      case 7:
        openSketches(animate);
        break;
      case 8:
        sk.sheet.hidden = true; // the build takes the table
        if (!BYOC.replay && !instantMode) BYOC.build();
        break;
      case 9:
        showPage(animate);
        break;
    }
  }
  function stage(n, opts = {}) {
    n = Math.max(0, Math.min(BEATS.length - 1, Number(n) || 0));
    const animate = !opts.instant && !instantMode;
    if (n > 2 && assembling) assembleSkip = true; // moving on mid-assembly seats the rest at once
    if (n < 9) pageSheet.hidden = true;
    if (n < BYOC.beat) {
      if (n <= 3 && !BYOC.replay && !el.herIdea.textContent) { reset(); const prev = instantMode; instantMode = true; for (let b = 1; b <= n; b++) enter(b, false); instantMode = prev; }
      BYOC.beat = n;
    } else {
      const from = BYOC.beat;
      BYOC.beat = n;
      const prev = instantMode; if (!animate) instantMode = true;
      (async () => { for (let b = from + 1; b <= n; b++) { const p = enter(b, animate); if (animate && b === 2) await p; } })();
      instantMode = prev;
    }
    document.body.dataset.beat = String(n);
    emit('stage', { beat: n, name: BEATS[n] });
    renderTray();
    return n;
  }
  BYOC.stage = stage;

  // reset(): back to the empty room, live, no run.
  function reset() {
    walkToken++;
    if (typing) { clearInterval(typing); typing = null; }
    BYOC.run = null; BYOC.replay = false; BYOC.replayKind = null; BYOC.beat = 0;
    BYOC.intro = null; herStance = ''; assembleSkip = true; introCard = null; leanQueue = [];
    if (diySeat) { diySeat.querySelector('.card')?.remove(); diySeat.classList.remove('filled'); } delete el.room.dataset.herSeat;
    chatter.innerHTML = ''; asks.clear(); answeredIds.clear(); if (BYOC.focusDoc) BYOC.focusDoc.close(true); BYOC.focus = { open: null, waiting: [] };
    el.room.querySelectorAll('.big-card').forEach(c => c.remove());
    seen = []; pending = []; serverTally = null; teamStep = null; buildStep = null; stepClear();
    for (const s of SEATS) {
      el.seat[s].classList.remove('filled');
      el.seat[s].querySelector('.card')?.remove();
      el.seatSheet[s].hidden = true; el.seatSheet[s].innerHTML = '';
    }
    el.herSheet.hidden = true; el.fileCard.hidden = true; el.tally.hidden = true;
    el.herSheet.classList.remove('big');
    setIdea(''); el.herNotes.innerHTML = ''; el.herInput.value = ''; inputMode = 'off'; el.herForm.hidden = true;
    el.herFlow.innerHTML = ''; flowMounted = false; mountFlow();
    el.fileLines.innerHTML = ''; el.fileNote.textContent = ''; el.soundsLike.hidden = true;
    pageSheet.hidden = true; $('#page-iframe', pageSheet).removeAttribute('src'); buildReq = null;
    sk.sheet.hidden = true; sk.inner.innerHTML = ''; sk.inner.style.transform = ''; sk.wait.textContent = ''; sk.req = null;
    BYOC.timings = {};
    for (const r of Object.values(rollers)) r.set(null, false);
    document.body.dataset.beat = '0';
    status('');
    emit('reset', {});
  }
  BYOC.reset = reset;
  BYOC.setInstant = v => { instantMode = !!v; };

  document.addEventListener('DOMContentLoaded', () => { reset(); connectSSE(); });
})();
