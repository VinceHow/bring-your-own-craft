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
  // Meet the team waits for her (Vincent, Sun 01:31: he talks over each card): no auto-advance unless ?hold=<ms> is
  // given (the tests and unattended walks use it).
  const HOLD_PARAM = Number(new URLSearchParams(location.search).get('hold'));
  const HOLD_MS = HOLD_PARAM > 0 ? HOLD_PARAM : Infinity;
  // One simple geometric glyph per seat. No faces, no emoji.
  const GLYPH = {
    product: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V3l14 6-14 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="miter"/></svg>',
    design: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="11" y="11" width="10" height="10" fill="currentColor"/></svg>',
    data: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="13" width="4.5" height="8" fill="currentColor"/><rect x="9.75" y="8" width="4.5" height="13" fill="currentColor"/><rect x="16.5" y="3" width="4.5" height="18" fill="currentColor"/></svg>',
    research: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M15 15l6 6" stroke="currentColor" stroke-width="3" stroke-linecap="square"/></svg>',
    engineering: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="9" y="9" width="6" height="6" fill="currentColor"/></svg>',
    strategy: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.7" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12 12V3.3A8.7 8.7 0 0 1 20.7 12z" fill="currentColor"/></svg>',
  };
  const BEATS = ['her name tag', 'meet the team', 'the reveal', 'first move', 'her journey', 'team works', 'her three',
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
  stepEl.id = 'live-step'; stepEl.className = 'live-step'; stepEl.hidden = true; stepEl.dataset.component = 'live-step'; stepEl.dataset.state = 'done';
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
    // No paperwork in the room: a step shows only when it's slow (over SLOW_MS), as a quiet note offering R; or when it fails.
    const cur = [...steps.values()].filter(s => now - s.t0 > SLOW_MS).at(-1);
    stepEl.classList.toggle('failed', !!stepFail && !cur);
    if (cur) {
      const ms = now - cur.t0, slow = ms > SLOW_MS;
      stepEl.classList.toggle('slow', slow);
      stepEl.innerHTML = `<b data-slot="label">${esc(cur.label)}</b> <em>taking a while · R replays the rehearsal</em>`;
      stepEl.dataset.state = 'slow'; stepEl.hidden = false; return;
    }
    stepEl.classList.remove('slow');
    if (stepFail) { stepEl.innerHTML = `<b data-slot="label">${esc(stepFail.label)}: stopped</b> <span>${esc(stepFail.why)}</span><em>R replays the rehearsal</em>`; stepEl.dataset.state = 'failed'; stepEl.hidden = false; return; }
    stepEl.dataset.state = 'done'; stepEl.hidden = true;
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
    teamGoBtn: $('#team-go'),
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
      c.innerHTML = `<div class="card-band" data-slot="band">${GLYPH[seat]}<span class="card-name" data-slot="name">${i.name}</span></div>
        <span class="card-character" data-slot="character"></span>
        <div class="card-her"><span class="card-who" data-slot="who">${esc(herName())} · your seat</span><span class="card-title" data-slot="title"></span><span class="card-traits" data-slot="traits"></span></div>`;
      c.dataset.component = 'her-place-card'; c.dataset.state = 'empty';
      drawHerCharacter(c);
    } else {
      c.dataset.component = 'place-card'; c.dataset.state = 'idle'; c.dataset.seat = seat;
      c.innerHTML = `<div class="card-band" data-slot="band">${GLYPH[seat]}<span class="card-name" data-slot="name">${i.name}</span><span class="card-who"><span class="card-agent-name" data-slot="agent">${i.agent}</span> <span class="agent-mark" data-slot="agent-mark">agent</span></span></div>
        <span class="card-character" data-slot="character"></span>
        <div class="card-stance" data-slot="stance">${esc(i.stance)}</div>`;
    }
    return c;
  }
  // Her character on her seat card: the title and traits she kept (no stance: her philosophy is the team's to keep).
  function drawHerCharacter(c) {
    const t = BYOC.herTag; if (!c || !t) return;
    const ti = c.querySelector('.card-title'), tr = c.querySelector('.card-traits');
    if (ti) ti.textContent = t.title || ''; if (tr) tr.textContent = (t.traits || []).join(' · ');
    // Once she has a character, her card says who she is: "Priya" and the title, not "Priya · your seat".
    const who = c.querySelector('.card-who');
    if (who && c.dataset.component === 'her-place-card' && BYOC.herSeat !== 'diy') who.textContent = t.title ? herName() : `${herName()} · your seat`;
    c.dataset.state = t.title || (t.traits || []).length ? 'named' : 'empty';
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
    s.dataset.state = seat === 'product' ? 'her' : 'filled';
    const c = makeCard(seat);
    s.appendChild(c); s.classList.add('filled');
    if (seat === 'product') {
      place(c, { y: animate ? [220, 0] : 0, rotate: animate ? [0, TILT[seat]] : TILT[seat] }, animate);
    } else {
      const fromX = (TEAM.indexOf(seat) - 1.5) * 60;
      place(c, { x: animate ? [fromX, 0] : 0, y: animate ? [-240, 0] : 0, rotate: animate ? [TILT[seat] * -3, TILT[seat]] : TILT[seat] }, animate);
    }
  }

  // ---- her role on her paper name tag: Product, or her own craft ------------------------------------
  // Product is prefilled (the stage path). "Your own craft" is only a seat choice on this same paper: her "I love…"
  // words carry her craft (the name tag's background call names it), and she sits in her own-craft seat. The old
  // separate DIY popup (public/name-tag.js) is retired from the room: one name tag, one input, one mic.
  function pick(what) {
    if (BYOC.beat !== 0 || BYOC.replay || !introCard) return;
    const pc = $('.pick-card', introCard); if (!pc) return;
    pc.dataset.pick = what;
    pc.querySelectorAll('.pick-option').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.pick === what)); b.dataset.state = b.dataset.pick === what ? 'picked' : 'idle'; });
    emit('pick.done', { pick: what });
    $('#intro-input', introCard)?.focus();
  }
  BYOC.pick = { choose: pick, current: () => (introCard && $('.pick-card', introCard)?.dataset.pick) || null };
  // Her card in her own craft: in her seat, with the craft her name tag says.
  function seatDiy(animate) {
    const s = el.seat.product;
    if (s.querySelector('.card')) return;
    const t = BYOC.herTag || {};
    const c = h('div', 'card card-diy');
    c.innerHTML = `<div class="card-band" data-slot="band">${GLYPH.product}<span class="card-name" data-slot="name">${esc(t.craft || 'Your craft')}</span></div>
      <span class="card-character" data-slot="character"></span>
      <div class="card-her"><span class="card-who" data-slot="who">${t.goodAt ? 'good at ' + esc(t.goodAt) : 'your seat'}</span><span class="card-title" data-slot="title"></span><span class="card-traits" data-slot="traits"></span></div>`;
    c.dataset.component = 'her-place-card'; c.dataset.state = 'empty'; c.dataset.seat = 'diy';
    s.appendChild(c); s.classList.add('filled'); s.dataset.state = 'her';
    drawHerCharacter(c);
    el.room.dataset.herSeat = 'diy';
    place(c, { y: animate ? [220, 0] : 0, rotate: animate ? [0, TILT.product] : TILT.product }, animate);
  }
  async function takeDiySeat() {
    if (BYOC.beat !== 0 || BYOC.replay || !BYOC.nameTag || !BYOC.nameTag.open) return null;
    const tag = await BYOC.nameTag.open();
    if (!tag || BYOC.beat !== 0) return null;
    introCard = null; // her name tag is made: next, she meets the team
    stage(1);
    return tag;
  }
  BYOC.takeDiySeat = takeDiySeat;

  const thinking = new Set(); // teammates started but with no proposal yet (teammate.thinking)
  // The stage path (DEMO stage flow): the first decision, one quick unblock and one focus moment reach her; ?path=full
  // keeps the three focus moments (the run's stagePath setting; lib/first.js).
  BYOC.stagePath = new URLSearchParams(location.search).get('path') !== 'full';
  let firstAskedFor = null, firstSettled = 0;

  // ---- a teammate's sketchpad, open (seat.open), and her workspace (BYOC.openWorkspace) ----------------
  // A click on a teammate's card or name opens its sketchpad in full: every call it made, with the choice and what it
  // followed. A click on her own place card opens her workspace: her character, her idea and journey, what the team
  // agreed (team space) and her takeaways so far. Structure only; the tray stays the way into each question.
  const panel = h('section', 'room-panel'); panel.id = 'room-panel'; panel.hidden = true;
  el.room.appendChild(panel);
  function closePanel() { if (panel.hidden) return; panel.hidden = true; panel.dataset.state = 'closed'; panel.innerHTML = ''; delete panel.dataset.component; emit('panel.close', {}); }
  function openPanel(component, seat, head, body) {
    panel.innerHTML = '';
    panel.dataset.component = component; panel.dataset.state = 'open';
    if (seat) panel.dataset.seat = seat; else delete panel.dataset.seat;
    const top = h('header', 'rp-head'); top.dataset.slot = 'head';
    const t = h('span', 'rp-title'); t.textContent = head; t.dataset.slot = 'title';
    const x = h('button', 'rp-close', 'Back to the room'); x.type = 'button'; x.dataset.slot = 'close'; x.addEventListener('click', closePanel);
    top.append(t, x);
    panel.append(top, body);
    panel.hidden = false;
  }
  function openSketchpad(seat, { refresh = false } = {}) {
    if (!INFO[seat] || seat === 'product' || BYOC.beat < 2) return;
    const i = INFO[seat];
    const ev = seen;
    const decided = new Map(); for (const e of ev) if (e.type === 'decided') decided.set(e.id, e);
    const asked = new Set(ev.filter(e => e.type === 'ask').map(e => e.id));
    const items = ev.filter(e => e.type === 'candidate' && e.seat === seat);
    const list = h('ol', 'sp-items'); list.dataset.slot = 'items';
    for (const c of items) {
      const d = decided.get(c.id);
      const li = h('li', 'sp-item'); li.dataset.slot = 'item'; li.dataset.state = asked.has(c.id) ? 'brought' : d ? 'decided' : 'open';
      const q = h('span', 'sp-decision'); q.textContent = c.decision || ''; q.dataset.slot = 'decision';
      li.appendChild(q);
      if (d) { const ch = h('span', 'sp-choice'); ch.textContent = d.choice || ''; ch.dataset.slot = 'choice'; li.appendChild(ch); }
      else if (asked.has(c.id)) { const ch = h('span', 'sp-choice'); ch.textContent = 'brought to you'; ch.dataset.slot = 'choice'; li.appendChild(ch); }
      if (c.reason) { const r = h('span', 'sp-reason'); r.textContent = c.reason; r.dataset.slot = 'reason'; li.appendChild(r); }
      list.appendChild(li);
    }
    if (!items.length) { // never a bare "nothing yet": one plain line on what this teammate is doing or waiting for
      const st = padStatus(seat, ev);
      const e = h('p', 'sp-status'); e.textContent = st.text; e.dataset.component = 'pad-status'; e.dataset.slot = 'status'; e.dataset.state = st.state;
      list.appendChild(e);
    }
    if (refresh) { const old = panel.querySelector('.sp-items'); if (old) old.replaceWith(list); return; }
    openPanel('sketchpad-open', seat, `${i.agent} · ${i.name}`, list);
    emit('seat.open', { seat });
  }
  // What an empty pad says, from the run's real events, in this order: a snag, at work, waiting (on her, or on a joint
  // decision), not started yet, or done with nothing for her. States: error · working · waiting · empty.
  function padStatus(seat, ev) {
    const A = INFO[seat].agent;
    const at = (type, f = () => true) => ev.findLastIndex(e => e.type === type && f(e));
    const started = at('teammate.start', e => e.seat === seat), ended = Math.max(at('teammate.done', e => e.seat === seat), at('teammate.error', e => e.seat === seat));
    if (at('teammate.error', e => e.seat === seat) > started && started >= 0) return { state: 'error', text: `${A} hit a snag; the team carries on.` };
    if (started >= 0 && started > ended) return { state: 'working', text: `${A} is thinking it through…` };
    const quote = t => { const q = String(t || '').trim(); return q.length > 70 ? q.slice(0, 68).replace(/\s+\S*$/, '') + '…' : q; };
    const answered = new Set(ev.filter(e => e.type === 'answer').map(e => e.askId));
    const open = ev.filter(e => (e.type === 'ask' || e.type === 'ask.unblock') && !answered.has(e.id));
    const joints = ev.filter(e => e.type === 'joint.start' && !ev.some(x => (x.type === 'joint.agreed' || x.type === 'joint.kept') && x.id === e.jointId));
    const inJoint = joints.findLast(j => (j.seats || []).includes(seat));
    if (inJoint) { const others = inJoint.seats.filter(s => s !== seat && INFO[s]).map(s => INFO[s].agent); return { state: 'working', text: `${A} is agreeing “${quote(inJoint.decision)}”${others.length ? ` with ${others.join(' and ')}` : ''}…` }; }
    const mine = open.findLast(a => a.seat === seat);
    if (mine) return { state: 'waiting', text: mine.type === 'ask.unblock' ? `${A} is blocked until you answer: “${quote(mine.question)}”` : `${A} is waiting on your answer: “${quote(mine.question || mine.decision)}”` };
    const other = open.findLast(a => INFO[a.seat]);
    if (other) return { state: 'waiting', text: `${A} carries on once you've answered ${(other.by || (INFO[other.seat] && INFO[other.seat].agent)) ? `${other.by || INFO[other.seat].agent}'s` : 'the team’s'} question.` };
    if (joints.length) return { state: 'waiting', text: `${A} starts once the team has agreed “${quote(joints.at(-1).decision)}”.` };
    if (!ev.some(e => e.type === 'teammate.start')) return { state: 'empty', text: `${A} joins once the team gets going.` };
    return { state: 'empty', text: `${A} has nothing for you yet; still listening.` };
  }
  // An open pad follows the run: each event redraws it in place (no second seat.open).
  function refreshPad() {
    if (panel.hidden) return;
    if (panel.dataset.component === 'sketchpad-open' && panel.dataset.seat) openSketchpad(panel.dataset.seat, { refresh: true });
    else if (panel.dataset.component === 'workspace') openWorkspace({ refresh: true }); // her workspace follows the run too
  }
  BYOC.openSketchpad = openSketchpad;
  function openWorkspace({ refresh = false } = {}) {
    if (BYOC.beat < 1) return;
    const body = h('div', 'ws-body');
    const part = (slot, label) => { const p = h('section', 'ws-part'); p.dataset.slot = slot; p.dataset.state = 'filled'; const l = h('h3', 'ws-label'); l.textContent = label; p.appendChild(l); body.appendChild(p); return p; };
    // An empty part never says "not yet": one plain line on what happens next (data-state empty, data-slot status).
    const pending = (p, tag, text) => { p.dataset.state = 'empty'; const e = h(tag, tag === 'li' ? 'ws-none' : 'ws-status'); e.dataset.slot = 'status'; e.textContent = text; return e; };
    const answered = new Set(seen.filter(e => e.type === 'answer').map(e => e.askId));
    const openAsk = seen.findLast(e => (e.type === 'ask' || e.type === 'ask.unblock') && !answered.has(e.id) && INFO[e.seat]);
    const openJoint = seen.findLast(e => e.type === 'joint.start' && !seen.some(x => (x.type === 'joint.agreed' || x.type === 'joint.kept') && x.id === e.jointId));
    const teamStarted = seen.some(e => e.type === 'teammate.start');
    // her character card
    const t = BYOC.herTag || {};
    const ch = part('character', 'Your character');
    const ct = h('p', 'ws-title'); ct.textContent = t.title ? `${herName()}, ${t.title}` : herName(); ch.appendChild(ct);
    if ((t.traits || []).length) { const tr = h('p', 'ws-traits'); tr.textContent = t.traits.join(' · '); ch.appendChild(tr); }
    if (t.superpower) { const sp = h('p', 'ws-power'); sp.textContent = t.superpower; ch.appendChild(sp); }
    // her idea and its journey
    const id = part('idea', 'Your idea');
    // Her idea from the sheet, else from the run itself (run.start), so it's there the moment the run has it.
    const idea = (el.herIdea.textContent || '').trim() || (seen.findLast(e => e.type === 'run.start' && e.idea)?.idea || '').trim();
    if (idea) { const it = h('p', 'ws-idea'); it.textContent = idea; it.dataset.slot = 'idea-text'; id.appendChild(it); }
    else id.appendChild(pending(id, 'p', 'You’ll say it on the idea sheet; it shows here the moment you do.'));
    const S = BYOC.flow && BYOC.flow._state;
    if (S && S.nodes.size) { const j = h('p', 'ws-journey'); j.textContent = [...S.nodes.values()].map(n => n.label).join(' → '); j.dataset.slot = 'journey'; id.appendChild(j); }
    else if (idea) { const j = h('p', 'ws-status'); j.dataset.slot = 'status'; j.textContent = `Its journey shows here once ${INFO.design.agent} has sketched it.`; id.appendChild(j); }
    // what the team agreed
    const ts = part('team-space', 'What the team agreed');
    const agreed = [...new Map(seen.filter(e => e.type === 'joint.agreed' && e.headline).map(e => [e.id, e])).values()];
    const tl = h('ul', 'ws-list');
    for (const a of agreed) { const li = h('li', 'ws-agreed'); li.textContent = a.headline; tl.appendChild(li); }
    if (!agreed.length) tl.appendChild(pending(ts, 'li', openJoint ? `The team is agreeing “${openJoint.decision}” now; it lands here.`
      : teamStarted ? 'What the team agrees lands here as they work.' : 'The team gets going once you’ve said your idea; what they agree lands here.'));
    ts.appendChild(tl);
    // her takeaways so far (the latest per question; what she kept wins)
    // Who asked, possessive, never "undefined's": the ask's own name, else its seat's teammate, else the team.
    const askerOf = a => { const n = (a && (a.by || (INFO[a.seat] && INFO[a.seat].agent))) || ''; return n ? `${n}’s` : 'the team’s'; };
    const tk = part('takeaways', 'Your takeaways so far');
    const byAsk = new Map();
    for (const e of seen) if ((e.type === 'takeaways' || e.type === 'brief') && e.askId) byAsk.set(e.askId, { believe: e.believe, guidance: e.guidance });
    const kl = h('ul', 'ws-list');
    for (const [, k] of byAsk) { const li = h('li', 'ws-takeaway'); const b = h('span', 'ws-believe'); b.textContent = k.believe || ''; const g = h('span', 'ws-guidance'); g.textContent = k.guidance || ''; li.append(b, g); kl.appendChild(li); }
    if (!byAsk.size) kl.appendChild(pending(tk, 'li', openAsk ? `Your first takeaway comes when you answer ${askerOf(openAsk)} question.` : 'They come from your answers to the team’s questions.'));
    tk.appendChild(kl);
    if (refresh) { const old = panel.querySelector('.ws-body'); if (old) old.replaceWith(body); return; }
    openPanel('workspace', null, 'Your workspace', body);
    emit('workspace.open', {});
  }
  BYOC.openWorkspace = openWorkspace;
  BYOC.closePanel = closePanel;
  // A click on the idea sheet's paper (not a box, a tab or a button, which keep their own clicks) opens it large;
  // another click, Esc, or the beat moving puts it back. idea-sheet.js owns the sheet's data-state (blank, rough,
  // sketched...), so open is its own attribute: data-open="true" (docs/COMPONENTS.md).
  function setSheetOpen(on) {
    const sh = el.herSheet; if (!sh || on === (sh.dataset.open === 'true')) return;
    if (on) sh.dataset.open = 'true'; else delete sh.dataset.open;
    emit(on ? 'sheet.open' : 'sheet.close', {});
  }
  BYOC.sheetOpen = setSheetOpen;
  BYOC.isSheetOpen = () => el.herSheet && el.herSheet.dataset.open === 'true';
  el.herSheet.addEventListener('click', e => {
    if (e.target.closest('button, input, textarea, a, [contenteditable], [data-node], .fl-item, .fd-form')) return;
    setSheetOpen(el.herSheet.dataset.open !== 'true');
  });
  // Clicks: a teammate's card (or its name) opens its sketchpad; her own place card opens her workspace.
  el.room.addEventListener('click', e => {
    const card = e.target.closest('.seat .card'); if (!card) return;
    const seat = card.closest('.seat').dataset.seat;
    if (seat === 'product' || seat === 'diy') { if (BYOC.beat >= 3) openWorkspace(); }
    else openSketchpad(seat);
  });
  BYOC.on('reset', closePanel);

  // ---- teammates' small sheets ----------------------------------------------------------------
  function sheetInit(seat) {
    const sh = el.seatSheet[seat];
    sh.innerHTML = `<div class="mini-head" data-slot="head"><i></i><span class="mini-title" data-slot="title">${seat === 'product' ? 'Product · spec' : INFO[seat].name}</span>
      <span class="mini-step" data-slot="step"></span></div><ul class="mini-lines" data-slot="lines"></ul><div class="mini-more" data-slot="more"></div>`;
    sh.dataset.component = 'sketchpad'; sh.dataset.state = 'waiting';
    sh._items = new Map(); sh._count = 0;
  }
  function sheetShow(seat, animate) {
    const sh = el.seatSheet[seat];
    if (!sh.hidden) return;
    sheetInit(seat); sh.hidden = false;
    const tilt = { product: 0.6, design: 1, data: -0.8, research: 0.7, strategy: -0.6, engineering: -1.1 }[seat];
    place(sh, { y: animate ? [-40, 0] : 0, rotate: tilt, opacity: animate ? [0, 1] : 1 }, animate);
  }
  // A sketchpad's state (waiting · working · done · error) is on data-state; its head shows no counts or timings.
  function sheetStep(seat, text, state) {
    const sh = el.seatSheet[seat]; if (!sh) return;
    if (sh.hidden) sheetShow(seat, !instantMode);
    $('.mini-step', sh).textContent = text || '';
    if (state) sh.dataset.state = state;
    const card = el.seat[seat] && el.seat[seat].querySelector('.card');
    if (card && seat !== 'product' && state) card.dataset.state = state; // thinking · working · done · error
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
    if (el.teamGoBtn) el.teamGoBtn.hidden = mode !== 'line';
    el.herForm.hidden = mode === 'off' || BYOC.replay;
    if (mode !== 'off' && !BYOC.replay) setTimeout(() => inp.focus(), 30);
  }
  function setIdea(text) { el.herIdea.textContent = text || ''; if (!text) for (const k of ['raw', 'state', 'tidy']) delete el.herIdea.dataset[k]; }
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
  async function startRun(idea) {
    setIdea(idea);
    setInputMode('line');
    stage(4);
    try {
      const r = await BYOC.api('/api/run', { idea, ...(BYOC.stagePath ? { stagePath: true } : { path: 'full' }), ...(BYOC.intro ? { intro: BYOC.intro } : {}), ...(BYOC.herSeat === 'diy' ? { seat: 'diy', tag: BYOC.herTag } : {}) }); // her own craft: public/name-tag.js
      BYOC.run = r.run;
      remember(r.run);
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
  // "Team, go": always visible the moment it starts, never a silent wait. #team-status[data-component="team-status"]
  // data-state: idle · working · slow (no teammate has reported in 15 s) · failed (a plain line and Retry) · done.
  // The room also carries data-team="working|failed|done" for design.
  const TEAM_SLOW_MS = Number(new URLSearchParams(location.search).get('teamslow')) || 15000; // ?teamslow=<ms> to test
  const teamStatusEl = h('div', 'team-status');
  teamStatusEl.id = 'team-status'; teamStatusEl.dataset.component = 'team-status'; teamStatusEl.dataset.state = 'idle';
  teamStatusEl.setAttribute('role', 'status'); teamStatusEl.setAttribute('aria-live', 'polite'); teamStatusEl.hidden = true;
  // On the main sheet, right under her idea: where she is looking while the team works (not a corner).
  el.herIdea.after(teamStatusEl);
  let teamSlowTimer = null;
  const teamNames = () => SEATS.filter(x => x !== 'product' && INFO[x]).map(x => INFO[x].agent || INFO[x].name);
  const listNames = n => n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n.at(-1)}` : (n[0] || 'The team');
  function teamStatus(state, text, retry) {
    teamStatusEl.dataset.state = state; el.room.dataset.team = state;
    teamStatusEl.hidden = state === 'idle' || BYOC.replay;
    teamStatusEl.innerHTML = `<span data-slot="text">${esc(text || '')}</span>`;
    if (retry) {
      const b = h('button', 'team-retry', 'Retry'); b.type = 'button'; b.dataset.slot = 'retry';
      b.addEventListener('click', () => teamGo());
      teamStatusEl.appendChild(b);
    }
  }
  function teamFailed(why) {
    clearTimeout(teamSlowTimer);
    // The line says it (with Retry); the teammates' cards keep whatever their own events last said.
    teamStatus('failed', `The team couldn’t start${why ? ` (${why})` : ''}. Retry, or press R for the rehearsal.`, true);
  }
  async function teamGo() {
    if (!BYOC.run || BYOC.run.startsWith('local-')) { status('no run API yet: the team cannot start'); teamFailed('no run yet'); return; }
    teamStatus('working', `${listNames(teamNames())} are on it…`);
    for (const x of SEATS) if (x !== 'product') sheetStep(x, '', 'thinking'); // teammates visibly at work at once
    clearTimeout(teamSlowTimer);
    teamSlowTimer = setTimeout(() => {
      if (teamStatusEl.dataset.state === 'working' && !seen.some(e => e.type === 'teammate.start' || e.type === 'candidate' || e.type === 'teammate.done'))
        teamStatus('slow', 'Still starting… the team is warming up.');
    }, TEAM_SLOW_MS);
    teamStep = stepBegin('The team is proposing');
    try { await BYOC.api(`/api/run/${encodeURIComponent(BYOC.run)}/propose`, {}, { step: false }); }
    catch (e) {
      if (e.status === 409) return; // already under way (a second press): the events carry on
      status(`propose failed (${e.status || e.message})`); if (teamStep) { stepEnd(teamStep, e); teamStep = null; }
      teamFailed(e.status ? `error ${e.status}` : 'no answer');
    }
  }
  BYOC.teamGo = teamGo;
  // A note just landed in her inbox: the inbox at the top right says who; that is the room's one cue (Vincent, 15 Nov:
  // no previews in the room). The team-status line no longer repeats it.
  BYOC.on('focus.open', () => { if (teamStatusEl.dataset.state === 'question') teamStatus('idle', ''); }); // she's on it
  function teamProgress() {
    const done = new Set(seen.filter(e => e.type === 'teammate.done' || e.type === 'teammate.error').map(e => e.seat)).size;
    const all = SEATS.length - 1;
    if (teamStatusEl.dataset.state === 'working' || teamStatusEl.dataset.state === 'slow')
      teamStatus('working', done >= all ? 'The team is choosing what to bring you…' : `${listNames(teamNames())} are on it… ${done} of ${all} done`);
    if (!teamStep) return;
    stepSet(teamStep, done >= SEATS.length ? 'The team is choosing what to bring you' : `The team is proposing · ${done} of ${SEATS.length} done`);
  }
  // "Sounds good. Let's build it": a short go-phrase is go, as an empty Enter is; anything with more in it is a redraw.
  const GO = new Set(['go', 'go ahead', 'go for it', 'lets go', 'team go', 'go team', 'build', 'build it', 'lets build', 'lets build it',
    'lets build this', 'build this', 'sounds good', 'sounds great', 'sounds right', 'looks good', 'looks great', 'looks right', 'good',
    'great', 'perfect', 'nice', 'cool', 'love it', 'yes', 'yep', 'yeah', 'yup', 'ok', 'okay', 'sure', 'ship it', 'lets ship it',
    'do it', 'lets do it', 'lets do this', 'thats it', 'thats right', 'all good', 'go on', 'start', 'lets start', 'onwards', 'done']);
  // Fillers don't count ("um, sounds good" is go): the tidy's filler list (lib/tidy.js FILLER), no model call.
  const GO_FILLER = /\b(um+|uh+|er+|erm|hmm+|like|you know|i mean|sort of|kind of|basically|actually)\b/g;
  function isGo(text) {
    const t = String(text || '').toLowerCase().replace(/[’']/g, '').replace(GO_FILLER, ' ');
    if (!t.trim() || t.split(/\s+/).filter(Boolean).length > 8) return false;
    const parts = t.split(/[.,!?;:\n]+|\s+(?:and|then|so)\s+/).map(p => p.replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
    return parts.length > 0 && parts.every(p => GO.has(p) || GO.has(p.replace(/^(ok|okay|yes|yeah|great|perfect|right|alright|so|now)\s+/, '').replace(/\s+(now|please|then|team)$/, '')));
  }
  BYOC.isGo = isGo;
  let buildStep = null;
  // The click path for "team, go", next to her field (shown while she shapes the journey).
  if (el.teamGoBtn) el.teamGoBtn.addEventListener('click', e => { e.preventDefault(); if (inputMode === 'line') { el.herInput.value = ''; setInputMode('off'); stage(5); } });
  // Every line she types or speaks is tidied in place first (BYOC.tidyInto, public/voice.js: cut, never reworded; at
  // most 2.5 s, else her raw words), then sent.
  const tidyLine = async (inp, raw) => (typeof BYOC.tidyInto === 'function' ? BYOC.tidyInto(inp, raw) : raw);
  let submitting = false;
  // A tidied line stays in her field for a moment (TIDY_HOLD_MS, ?tidyhold=) so the tidy plays where she's looking;
  // the line is sent at once. Her next keystroke ends the hold early (the box clears for her), and Enter on the
  // held line doesn't send it twice.
  const TIDY_HOLD_MS = Number(new URLSearchParams(location.search).get('tidyhold') ?? 1700);
  let held = null;
  const endHold = () => { if (!held) return; clearTimeout(held.t); if (el.herInput.value === held.text) el.herInput.value = ''; delete el.herInput.dataset.hold; held = null; };
  function holdLine(text) {
    endHold();
    if (!TIDY_HOLD_MS || instantMode) { el.herInput.value = ''; return; }
    el.herInput.dataset.hold = 'on';
    held = { text: el.herInput.value, t: setTimeout(endHold, TIDY_HOLD_MS) };
  }
  el.herInput.addEventListener('keydown', e => { if (held && e.key.length === 1 && !e.ctrlKey && !e.metaKey) endHold(); });
  el.herForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (held && el.herInput.value === held.text) return; // the held line was sent already
    endHold();
    const raw = el.herInput.value.trim();
    if (submitting) return;
    if (inputMode === 'idea') {
      if (!raw) return;
      // Her idea moves up to the sheet's idea line at once (her raw words, data-state tidying) and is tidied there.
      submitting = true; el.herInput.value = '';
      try { const idea = await tidyLine(el.herIdea, raw); startRun(idea); } finally { submitting = false; }
    } else if (inputMode === 'line') {
      if (!raw || isGo(raw)) { el.herInput.value = ''; setInputMode('off'); stage(5); return; }
      submitting = true;
      let text = raw;
      try { text = await tidyLine(el.herInput, raw); } finally { submitting = false; }
      // she typed on while it tidied: her new words stay in the box; this line goes as she sent it
      if (el.herInput.dataset.tidy !== 'skipped') holdLine(text);
      if (!(BYOC.firstSketch && BYOC.firstSketch.takes(text))) addHerLine(text);
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
        let t = words.textContent.trim();
        if (!t || words.dataset.state === 'tidying') return;
        // Her rewording is tidied in place (data-raw / data-state / data-tidy on the words); the team's own line is kept as is.
        if (t !== text && typeof BYOC.tidyInto === 'function') t = String(await BYOC.tidyInto(words, t) || t).trim() || t;
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
    // An ask raised before the team proposes (Focus 1, an unblock, Focus 2) came up too: never "0 came up, 3 brought".
    const cand = new Set(events.filter(e => e.type === 'candidate').map(e => e.id));
    for (const e of events) {
      if (e.type === 'candidate') came++;
      else if (e.type === 'ask') { brought++; if (!cand.has(e.id)) came++; }
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
    el.tally.hidden = false; el.tally.dataset.state = 'counting';
    renderTally(tallyFromEvents(seen));
    place(el.tally, { x: animate ? [60, 0] : 0, rotate: 0.8, opacity: animate ? [0, 1] : 1 }, animate);
  }
  el.counter.addEventListener('click', () => emit('counter.tap', { run: BYOC.run }));

  // ---- Design's grey sketches -----------------------------------------------------------------
  // Asked for as soon as she has answered all her asks (her answers shape them), so the beat is quick.
  const sk = { sheet: $('#sketch-sheet'), inner: $('#sketch-inner'), wait: $('#sketch-wait'), req: null };
  BYOC.el.sketchSheet = sk.sheet;
  BYOC.timings = {};
  // In a replay the frames come from the recording's own folder (its cached sketches), never the original run's id,
  // which this server may not have (a 404 in the console during R).
  function sketchUrl() { return `/api/run/${encodeURIComponent(BYOC.replay && BYOC.replayName ? BYOC.replayName : BYOC.run)}/sketches`; }
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
      .map(a => ({ id: a.id, seat: a.seat, by: a.by || null, question: askText(a), ...(a.unblock ? { unblock: true, suggestion: a.suggestion } : {}) }));
    BYOC.focus = { open, waiting };
    renderTray();
    renderStep();
  }
  BYOC.syncFocus = syncFocus;
  BYOC.asks = () => [...asks.values()];
  function openNote(id) {
    const a = asks.get(id);
    if (a && a.unblock) return BYOC.inbox ? BYOC.inbox.showUnblock(id) : false; // a quick unblock is answered in her inbox
    if (!a || !BYOC.focusDoc) return false;
    BYOC.focusDoc.open(a);
    return true;
  }
  BYOC.openNote = openNote;
  // Her inbox (public/inbox.js) replaced the tray: it shows what waits here (BYOC.focus.waiting), with the tray's
  // arrival rules (a natural pause, never while she types; no number, no red), plus Things only you can do and Past meetings.
  function renderTray() { if (BYOC.inbox) BYOC.inbox.render(); }
  // The clicker's forward key opens the item that needs her now (stage.js asks first).
  BYOC.openTopNote = () => (BYOC.inbox ? BYOC.inbox.openTop() : false);

  // ---- the room's chatter (DEMO focus rules): the team talking about its own work, never to her ----------
  // chatter { by, seat, text } events (written by the server from real run events). Each line shows a few seconds
  // under its speaker's card; at most three at once. Her document covers the room, so she never sees it while focused.
  const chatter = h('div', 'chatter'); chatter.setAttribute('aria-hidden', 'true'); chatter.dataset.component = 'chatter';
  el.room.appendChild(chatter);
  function chat(ev) {
    const s = el.seat[ev.seat]; if (!s || !ev.text) return;
    const line = h('div', 'chatter-line'); line.dataset.seat = ev.seat; line.dataset.component = 'chatter-line'; line.dataset.state = 'in';
    const who = ev.by || (INFO[ev.seat] && INFO[ev.seat].agent) || INFO[ev.seat].name;
    const cw = h('span', 'chatter-who'); cw.textContent = `${who}: `; cw.dataset.slot = 'who';
    // The log's line already starts with the speaker ("Noor: found a source…"); say the name once.
    const ct = h('span', 'chatter-text'); ct.textContent = String(ev.text).replace(new RegExp('^\\s*' + who.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*', 'i'), ''); ct.dataset.slot = 'text';
    line.append(cw, ct);
    line.style.left = (s.offsetLeft + 12) + 'px';
    line.style.top = (s.offsetTop + s.offsetHeight - 6) + 'px';
    chatter.querySelectorAll(`.chatter-line[data-seat="${ev.seat}"]`).forEach(o => o.remove());
    chatter.appendChild(line);
    while (chatter.children.length > 3) chatter.firstChild.remove();
    if (!instantMode) place(line, { y: [-8, 0], opacity: [0, 1] }, true);
    setTimeout(() => { line.dataset.state = 'leaving'; }, 4200);
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
  pageSheet.innerHTML = '<div class="page-head" data-slot="head"><span class="page-title" data-slot="title">Your page</span><span class="page-url" id="page-url" data-slot="url"></span></div><div class="page-frame" data-component="page-frame" data-state="building"><iframe id="page-iframe" data-slot="frame" title="Your page" loading="eager"></iframe></div>';
  const setPageState = st => { const f = pageSheet.querySelector('.page-frame'); if (f) f.dataset.state = st; };
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
    // Her page appears over the table: the sheet it lives on opens large (a look may keep the closed sheet small).
    if (BYOC.beat >= 9) setSheetOpen(true);
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
    try { refreshPad(); } catch (e) { console.error('pad', e); }
    if (ev.mode === 'craft' || ev.mode === 'stamp') refreshTally(); // the meter counts every craft or stamp event, whatever its type
    emit(ev.type, ev);
  }
  function flushPending() { const p = pending; pending = []; for (const ev of p) if (ev.run === BYOC.run) dispatch(ev, 'live'); }
  BYOC.dispatch = dispatch;

  function react(ev, source) {
    switch (ev.type) {
      case 'run.start':
        if (ev.intro) BYOC.intro = ev.intro;
        if (ev.seat === 'diy' && !el.seat.product.querySelector('.card')) { // a replay of a run in her own craft
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
        sheetStep(ev.seat, '', 'thinking');
        thinking.add(ev.seat);
        emit('teammate.thinking', { seat: ev.seat }); // a room event (BYOC.on): from its start until its first proposal
        break;
      case 'candidate':
        if (BYOC.beat < 5) stage(5);
        if (thinking.delete(ev.seat)) sheetStep(ev.seat, '', 'working');
        sheetAdd(ev.seat, ev.id, ev.decision);
        refreshTally();
        break;
      case 'teammate.done':
        sheetStep(ev.seat, '', 'done'); // no paperwork in the room: no counts or seconds on the sheet heads
        if (source === 'live') teamProgress();
        break;
      case 'select.done':
        if (teamStep) { stepEnd(teamStep); teamStep = null; }
        clearTimeout(teamSlowTimer); if (!['idle', 'question'].includes(teamStatusEl.dataset.state)) teamStatus('done', 'The team has done its first pass.');
        refreshTally();
        break;
      case 'ask': {
        // The first decision (0:38) and a quick unblock wait in her inbox where she is: neither moves the beat.
        if (BYOC.beat < 6 && !ev.first && !ev.unblock && !ev.feel) stage(6); // Act 2's three wait in her inbox where she is
        // An empty input she isn't using shouldn't hold them back (the inbox waits while she types).
        if ((ev.first || ev.unblock || ev.feel) && document.activeElement === el.herInput && !el.herInput.value.trim()) el.herInput.blur();
        const it = findItem(ev.id); if (it) it.classList.add('brought');
        asks.set(ev.id, ev); syncFocus(); // it waits in her tray until she opens it
        refreshTally();
        break;
      }
      case 'decided': {
        if (ev.round === 'first' && el.seat[ev.seat]) { // settled by her first answer: lands with its teammate, staggered
          const i = firstSettled++;
          const land = () => { sheetAdd(ev.seat, ev.id, ev.choice); const it = findItem(ev.id); if (it) it.dataset.state = 'decided'; }; // and a card in the team space (team-space.js)
          if (instantMode || source !== 'live') land(); else setTimeout(land, i * 450);
        }
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
      // The first decision (lib/first.js): once Design's first sketch is down, "Who is this really for?" is asked from
      // its shape and lands in her inbox like any ask. Her answer redraws the journey and settles a run of decisions,
      // each with its teammate: a line on its sketchpad and a word under its card, one after another.
      case 'sketch.done':
        if (BYOC.stagePath && source === 'live' && !ev.reshape && !ev.skipped && !BYOC.replay && BYOC.run && firstAskedFor !== BYOC.run) { // the server raises it too (lib/first.js)
          firstAskedFor = BYOC.run;
          BYOC.api(`/api/run/${encodeURIComponent(BYOC.run)}/first`, {}, { step: false }).catch(() => {});
        }
        break;
      case 'first.done': {
        // On Design's redrawn sketch: the user type her answer picked (.fs-user.main, the first Design drew) and the
        // ones set aside (.fs-user.later, struck through); her words show as .fs-said (public/first-sketch.js).
        const list = document.querySelector('.fs-bar .fs-users');
        const at = seen.findIndex(x => x.type === 'reshape' && x.askId === ev.askId);
        if (ev.reshaped && list && at > 0) {
          const now = [...list.querySelectorAll('.fs-user:not(.later)')];
          now.forEach((u, i) => { u.classList.toggle('main', i === 0); u.dataset.state = i === 0 ? 'main' : 'kept'; });
          const norm = t => String(t || '').trim().toLowerCase();
          const kept = new Set(now.map(u => norm(u.textContent)));
          for (const e of seen.slice(0, at)) if (e.type === 'sketch.user' && !kept.has(norm(e.label)) && !list.querySelector(`.fs-user.later[data-user="${CSS.escape(e.id || '')}"]`)) {
            const u = h('span', 'fs-user later', esc(e.label)); u.dataset.slot = 'user'; u.dataset.state = 'later'; u.dataset.user = e.id || ''; list.appendChild(u); kept.add(norm(e.label));
          }
        }
        emit('first.settled', { askId: ev.askId, decided: ev.decided });
        break;
      }
      case 'teammate.error':
        sheetStep(ev.seat, '', 'error');
        if (source === 'live') teamProgress();
        break;
      case 'propose.error':
        status(`the team stopped: ${ev.error || 'error'}`);
        if (teamStep) { stepEnd(teamStep, { status: 500 }); teamStep = null; }
        if (source === 'live') teamFailed('a model call failed');
        break;
      case 'build.step':
        if (BYOC.beat < 8) stage(8);
        if (/^Build failed/.test(ev.step || '')) { sheetStep('engineering', '', 'error'); if (buildStep) { stepEnd(buildStep, { status: 500 }); buildStep = null; } setPageState('error'); break; }
        sheetStep('engineering', '', 'working'); setPageState('building');
        if (source === 'live') { if (!buildStep) buildStep = stepBegin('Engineering is building'); stepSet(buildStep, `Engineering is building: ${ev.step}`); }
        break;
      case 'build.done':
        sheetStep('engineering', '', 'done'); setPageState('built');
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

  // ---- the setup (DEMO 0:00-0:30): her name tag on paper, meeting the team, the reveal ------------------
  // The room is hidden under #setup until the reveal. Beat 0: her paper name tag (name, role, what she loves and brings,
  // tidied, then the team's fun spin). Beat 1: each teammate met up close, one by one (forward: the next). Beat 2: the
  // studio appears with everyone seated, and she takes her seat. Replays jump past it to beat 3, so they reveal at once.
  const setup = $('#setup');
  let introCard = null, meeting = false, meetSkip = false, meetAdvance = false;
  const herName = () => (BYOC.herName || 'Priya');
  const herNameField = () => (introCard && $('.nt-name', introCard)?.value.trim()) || herName();
  function setSetup(step) { if (!setup) return; setup.dataset.step = step; setup.dataset.state = step; setup.hidden = step === 'off'; el.room.dataset.setup = step; }
  // IDEA -> YOU -> TEAM (Vincent, Sun 01:21): her idea comes first, on its own paper. Enter stores it as the run's idea
  // (the reveal opens her sheet with her words and starts the run: the room never asks again), fires the one call that
  // tailors each teammate's intro line to it (POST /api/meet-lines, while she makes her name tag), then her name tag.
  // ?setup=classic keeps the old order (name tag, team, then her idea at the reveal): the rehearsal's fallback.
  // Hooks: #setup[data-step="idea"], .idea-card[data-component="idea-card"][data-state="asking|done"], data-slot
  // question · input · hint · make; the mic is voice.js's on [data-voice="idea"].
  const CLASSIC = new URLSearchParams(location.search).get('setup') === 'classic';
  BYOC.setupOrder = CLASSIC ? 'classic' : 'idea-first';
  let ideaCard = null;
  const MEET_LIMIT_MS = 6000;
  function openIdea() {
    if (!setup) return;
    setSetup('idea');
    const st = $('#setup-stage'); st.innerHTML = '';
    const c = h('div', 'big-card idea-card'); c.dataset.component = 'idea-card'; c.dataset.state = 'asking';
    c.innerHTML = `<label class="idea-row"><span class="idea-q" data-slot="question">What do you want to build today?</span>
        <textarea class="idea-input" id="idea-input" data-slot="input" data-voice="idea" rows="2" spellcheck="false" maxlength="300" placeholder="One sentence is plenty" aria-label="What you want to build today"></textarea></label>
      <div class="idea-hint" data-slot="hint">Say it or type it<span class="voice-credit" data-slot="voice-credit" hidden> · voice by ElevenLabs</span> · Enter: next, your name tag</div>
      <div class="idea-actions" data-slot="actions"><button type="button" class="idea-make" data-slot="make" data-state="make">Next</button></div>`;
    st.appendChild(c);
    ideaCard = c;
    voiceCredit(c);
    $('#idea-input', c).addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); ev.stopPropagation(); ideaDone(); }
    });
    $('.idea-make', c).addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); ideaDone(); });
    place(c, { y: [24, 0], opacity: [0, 1] }, !instantMode);
  }
  // Her idea, down: kept for the run, the tailored lines asked for (never waited on), then her name tag.
  // After a tidy that changed her line (data-tidy cut|reordered on the field), hold ~1.7 s so design's animation plays:
  // the cut words strike and fade, the line closes up, the clean line settles. No hold when it's unchanged or skipped.
  const TIDY_PAUSE_MS = Number(new URLSearchParams(location.search).get('tidypause') ?? 1700);
  async function tidyPause(el, raw, clean) {
    if (instantMode || !el || clean === raw || !['cut', 'reordered'].includes(el.dataset.tidy)) return;
    await wait(TIDY_PAUSE_MS);
  }
  async function ideaDone() {
    const c = ideaCard; if (!c || BYOC.beat !== 0 || c.dataset.state === 'tidying') return;
    const inp = $('#idea-input', c);
    const raw = inp.value.trim();
    // Her line, tidied in place first (BYOC.tidyInto, builder 8: cut, never reworded; her raw words if slow or refused).
    let text = raw;
    if (raw && typeof BYOC.tidyInto === 'function' && !BYOC.replay) {
      c.dataset.state = 'tidying';
      try { text = String(await BYOC.tidyInto(inp, raw) || raw).trim() || raw; } catch { text = raw; }
      if (ideaCard !== c || BYOC.beat !== 0) return;
      await tidyPause(inp, raw, text); // the paper stays while her words rearrange (Vincent: "the very first screen")
      if (ideaCard !== c || BYOC.beat !== 0) return;
    }
    c.dataset.state = 'done';
    ideaCard = null;
    BYOC.pendingIdea = text || null;
    BYOC.meetLines = null;
    if (text && !BYOC.replay) {
      const tok = walkToken;
      BYOC.meetLinesReq = Promise.race([
        BYOC.api('/api/meet-lines', { idea: text }, { step: false }).then(r => (r && r.lines) || {}),
        new Promise(res => setTimeout(() => res({}), MEET_LIMIT_MS)),
      ]).catch(() => ({})).then(lines => { if (tok === walkToken) BYOC.meetLines = lines; emit('meet.lines', { tailored: Object.keys(lines).length }); return lines; });
    }
    loadKit(text);
    emit('idea.paper', { idea: text });
    openPaper();
  }
  // "Loaded with": what each teammate really has for this idea (GET /api/kit, lib/kit.js: computed from the files and the
  // finding this server has). Asked for with her idea; without one (classic order), as she meets the team.
  function loadKit(idea) {
    const tok = walkToken;
    BYOC.kit = null;
    BYOC.kitReq = BYOC.api('/api/kit?idea=' + encodeURIComponent(idea || ''), undefined, { step: false })
      .then(k => { if (tok === walkToken) BYOC.kit = k || {}; return k; }).catch(() => null);
    return BYOC.kitReq;
  }
  // "voice by ElevenLabs" in the hints, only when the mic really works here (BYOC.voice.available, known a beat after load).
  function voiceCredit(c) {
    const show = () => { const on = !!(BYOC.voice && BYOC.voice.available); c.querySelectorAll('.voice-credit').forEach(x => { x.hidden = !on; }); return on; };
    if (!show()) [300, 1200, 3000].forEach(ms => setTimeout(show, ms));
  }
  BYOC.ideaOpen = () => !!ideaCard && BYOC.beat === 0;
  BYOC.ideaDone = ideaDone;

  // Her paper name tag. One component with the DIY name tag (character-card), so voice, swaps and the gallery carry on.
  function openPaper() {
    if (!setup) return;
    setSetup('nametag');
    const st = $('#setup-stage'); st.innerHTML = '';
    const c = h('div', 'big-card nt-paper'); c.dataset.seat = 'product';
    c.dataset.component = 'character-card'; c.dataset.state = 'asking';
    c.innerHTML = `<div class="nt-head" data-slot="head">Name tag</div>
      <label class="nt-row nt-name-row"><span class="nt-label" data-slot="label">Your name</span>
        <input class="nt-name" id="nt-name" data-slot="name" type="text" spellcheck="false" maxlength="40" value="${esc(herName())}" aria-label="Your name"></label>
      <div class="pick-card nt-row" data-component="pick-card" data-state="open" data-pick="product">
        <span class="pick-q nt-label" data-slot="question">What do you bring to the table?</span>
        <div class="pick-options" data-slot="options">
          <button type="button" class="pick-option" data-pick="product" data-slot="option" data-state="picked" aria-pressed="true">Product</button>
          <button type="button" class="pick-option" data-pick="craft" data-slot="option" data-state="idle" aria-pressed="false">Your own craft</button>
        </div>
      </div>
      <label class="nt-row nt-love-row"><span class="nt-label" data-slot="label">In a sentence: what do you love about it?</span>
        <textarea class="bc-love-input nt-love" id="intro-input" data-slot="input" data-voice="intro" rows="2" spellcheck="false" maxlength="240" placeholder="I love…" aria-label="What you love and bring"></textarea></label>
      <div class="nt-hint" data-slot="hint">Type it or say it<span class="voice-credit" data-slot="voice-credit" hidden> · voice by ElevenLabs</span> · Enter, and the team writes your tag</div>
      <div class="nt-status" data-slot="status" role="status" aria-live="polite" data-state="idle"></div>
      <div class="nt-actions" data-slot="actions"><button type="button" class="nt-make" data-slot="make" data-state="make">Make my tag</button></div>`;
    st.appendChild(c);
    introCard = c;
    voiceCredit(c);
    $('.pick-card', c).addEventListener('click', e => { const b = e.target.closest('.pick-option'); if (b) pick(b.dataset.pick); });
    $('.nt-name', c).addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); $('#intro-input', c).focus(); } });
    $('#intro-input', c).addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); ev.stopPropagation(); introDone(); }
    });
    // The click path, as well as Enter: "Make my tag", then "Meet your team" once it's made; "Try again" after a failure.
    $('.nt-make', c).addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); introDone(); });
    place(c, { y: [24, 0], opacity: [0, 1] }, !instantMode);
  }
  // Her character card (DEMO 0:22): after her "I love…" sentence, the team's playful read of it: a title, two or three
  // traits, maybe a superpower, each swappable with a click (builder 6's POST /api/name-tag, as on the craft seat).
  // What the card is doing, always visible (never silence), and never blocking her: within a frame of Enter it says
  // so ('thinking'); once her words are tidied, her ROUGH card is on the paper at once (her name, her words;
  // character-card data-state="rough") with "Meet your team" ready, and the status says the team is polishing it
  // ('polishing', then 'slow' after a while). When the team's read lands it fills the card in place
  // (data-state="shown"); if it never lands, her rough card simply stays (status 'rough', a plain line). A slow or
  // failed call never stops her meeting the team. Hooks: [data-slot="status"][data-state], [data-slot="make"].
  const TAG_LIMIT_MS = 25000, TAG_SLOW_MS = 6000;
  function tagStatus(c, state, text, button) {
    const st = $('.nt-status', c), mk = $('.nt-make', c);
    if (st) { st.dataset.state = state; st.textContent = text || ''; }
    if (mk) {
      const ready = ['polishing', 'slow', 'rough', 'done'].includes(state);
      mk.textContent = button || (ready ? 'Meet your team' : 'Make my tag'); mk.disabled = state === 'thinking';
      mk.dataset.state = state === 'failed' ? 'retry' : ready ? 'meet' : state === 'thinking' ? 'busy' : 'make';
    }
  }
  // Her card's body, drawn from `cur` (rough: her name only; then the team's title, traits and superpower).
  function drawCharacter(c, cur) {
    $('.char-body', c)?.remove();
    const body = h('div', 'char-body'); body.dataset.slot = 'character';
    const swap = (pool, value) => { const next = cur.alternates[pool] && cur.alternates[pool].shift(); if (next) cur.alternates[pool].push(value); return next || value; };
    const title = h('div', 'char-who', `<span class="char-name">${esc(herNameField())}</span>${cur.title ? `, <button type="button" class="char-title" data-slot="title">${esc(cur.title)}</button>` : ''}`);
    const traits = h('ul', 'char-traits'); traits.dataset.slot = 'traits';
    const drawTraits = () => { traits.innerHTML = cur.traits.map((t, i) => `<li class="char-trait" data-slot="trait"><button type="button" class="char-swap" data-i="${i}">${esc(t)}</button></li>`).join(''); };
    drawTraits();
    const power = cur.superpower ? h('p', 'char-power', `<span class="char-label">Superpower</span> <button type="button" class="char-swap char-power-text" data-slot="superpower">${esc(cur.superpower)}</button>`) : null;
    const hint = h('div', 'char-hint', cur.title ? 'tap any piece to swap it' : ''); hint.dataset.slot = 'hint';   // a look sets it by the pieces she can tap
    title.addEventListener('click', e => { if (!e.target.closest('.char-title')) return; cur.title = swap('titles', cur.title); e.target.closest('.char-title').textContent = cur.title; });
    traits.addEventListener('click', e => { const b = e.target.closest('.char-swap'); if (!b) return; const i = +b.dataset.i; cur.traits[i] = swap('traits', cur.traits[i]); drawTraits();
      traits.dataset.state = 'swapped'; const li = traits.children[i]; if (li) li.dataset.state = 'new'; c.focus(); });   // a look re-inks only the one she swapped
    if (power) power.addEventListener('click', e => { const b = e.target.closest('.char-power-text'); if (!b) return; cur.superpower = swap('superpowers', cur.superpower); b.textContent = cur.superpower; });
    // her own words stay on her tag, small, under the team's read (or as the whole tag if the team couldn't add its spin)
    const said = cur.loves ? h('p', 'char-said', `<span>In your words</span>“${esc(cur.loves)}”`) : null; if (said) said.dataset.slot = 'said';
    body.append(title, traits); if (power) body.appendChild(power); if (said) body.appendChild(said); body.appendChild(hint);
    c.appendChild(body);
  }
  // Her name tag's second call, in the background: the swaps land on her card (or on her kept tag if she has moved on),
  // and her words for the team's profile; 'tag.profile' says it arrived. On failure the team keeps her raw words.
  function tagMore(c, cur, said) {
    const card = { title: cur.title, traits: cur.traits, superpower: cur.superpower };
    const diy = $('.pick-card', c)?.dataset.pick === 'craft';
    BYOC.api('/api/name-tag', { text: 'I love ' + said.replace(/^i love\s*/i, ''), part: 'more', card, ...(diy ? {} : { seat: 'product' }) }, { step: false }).then(m => {
      if (!m) return;
      const alt = m.alternates || {};
      for (const k of ['titles', 'traits', 'superpowers']) if (Array.isArray(alt[k])) cur.alternates[k] = alt[k].filter(x => x && x !== cur.title && !cur.traits.includes(x) && x !== cur.superpower);
      if (m.goodAt) cur.goodAt = m.goodAt;
      if (m.loves) cur.loves = m.loves;
      if (diy && m.craft) cur.craft = m.craft;
      if (introCard !== c && BYOC.herTag) {
        BYOC.herTag = { ...BYOC.herTag, goodAt: cur.goodAt, loves: cur.loves, ...(diy ? { craft: cur.craft } : {}) };
        const name = diy && el.seat.product.querySelector('.card-diy .card-name'); if (name && cur.craft) name.textContent = cur.craft;
      }
      emit('tag.profile', { rough: !!m.rough });
    }).catch(() => emit('tag.profile', { rough: true }));
  }
  async function makeCharacter(c, said) {
    // Her rough card, at once: she can meet the team now.
    const cur = { craft: 'Product', title: '', traits: [], superpower: '', loves: said, alternates: { titles: [], traits: [], superpowers: [] } };
    c._char = cur;
    drawCharacter(c, cur);
    c.dataset.state = 'rough';
    tagStatus(c, 'polishing', 'The team is adding its spin… meet them whenever you like.');
    if (!c._keys) {
      c._keys = true;
      c.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.id !== 'intro-input') { ev.preventDefault(); ev.stopPropagation(); introDone(); } });
    }
    c.tabIndex = -1; c.focus(); // Enter or the clicker: meet the team
    const slow = setTimeout(() => { if (introCard === c && c.dataset.state === 'rough') tagStatus(c, 'slow', 'Still adding its spin… meet the team whenever you like.'); }, TAG_SLOW_MS);
    let r = null;
    try {
      r = await Promise.race([
        BYOC.api('/api/name-tag', { text: 'I love ' + said.replace(/^i love\s*/i, ''), part: 'card' }, { step: false }),
        new Promise((_, no) => setTimeout(() => no(new Error('timeout')), TAG_LIMIT_MS)),
      ]);
    } catch { r = null; }
    clearTimeout(slow);
    const usable = r && !r.rough && (r.title || (Array.isArray(r.traits) && r.traits.length));
    if (usable) {
      Object.assign(cur, { title: r.title || '', traits: Array.isArray(r.traits) ? r.traits.slice(0, 3) : [], superpower: r.superpower || '',
        alternates: { titles: [], traits: [], superpowers: [], ...(r.alternates || {}) } });
    }
    // The rest (her craft, her words for the profile, the swaps) in the background: never waited on.
    tagMore(c, cur, said);
    // She already met the team: the team's read still reaches her place card.
    if (introCard !== c) { if (usable && BYOC.herTag && !BYOC.herTag.title) { BYOC.herTag = { ...BYOC.herTag, ...cur, alternates: undefined }; drawHerCharacter(el.seat.product && el.seat.product.querySelector('.card')); emit('tag.polished', { title: cur.title }); } return; }
    if (!usable) { tagStatus(c, 'rough', 'The team couldn’t add its spin this time, so your tag is in your own words.'); return; }
    drawCharacter(c, cur);
    c.dataset.state = 'shown';
    tagStatus(c, 'done', '');
    if (!c.contains(document.activeElement) || document.activeElement === c) c.focus();
  }
  // Enter (or the clicker) on her paper: the first time with her words, they're tidied (builder 7's speech tidy) and
  // the team writes her name tag; the next time, she meets the team. Empty words move on without a line (her file
  // keeps its prepared lines).
  async function introDone() {
    const c = introCard; if (!c || BYOC.beat !== 0) return;
    const inp = $('#intro-input', c);
    const raw = inp.value.trim();
    if (raw && c.dataset.state === 'asking') {
      c.style.setProperty('--pt-nt-h', c.offsetHeight + 'px'); // the paper keeps its size as it turns into her tag (a look may use it)
      inp.readOnly = true; c.dataset.state = 'thinking'; BYOC.introRaw = raw;
      tagStatus(c, 'thinking', 'The team is writing your tag…');
      let said = raw;
      if (typeof BYOC.tidyInto === 'function') { try { said = String(await BYOC.tidyInto(inp, raw, { field: 'intro', timeoutMs: 2500 }) || raw).trim() || raw; } catch { said = raw; } }
      else if (typeof BYOC.tidy === 'function') { try { said = String(await BYOC.tidy(raw, { field: 'intro', timeoutMs: 2500 }) || raw).trim() || raw; } catch { said = raw; } }
      if (introCard !== c) return;
      await tidyPause(inp, raw, said); // her words rearrange on the paper, then her tag
      if (introCard !== c) return;
      inp.value = said;
      return makeCharacter(c, said);
    }
    if (c.dataset.state === 'thinking') return;
    introCard = null;
    BYOC.herName = herNameField();
    if (c._char) BYOC.herTag = { ...c._char, alternates: undefined };
    if ($('.pick-card', c)?.dataset.pick === 'craft') {
      BYOC.herSeat = 'diy';
      BYOC.herTag = { ...(BYOC.herTag || {}), craft: (c._char && c._char.craft !== 'Product' && c._char.craft) || 'Your own craft' };
    }
    const said = inp.value.trim();
    BYOC.intro = said ? 'I love ' + said.replace(/^i love\s*/i, '') : null;
    inp.blur();
    emit('intro', { intro: BYOC.intro, name: BYOC.herName });
    stage(1);
  }
  BYOC.introOpen = () => !!introCard && BYOC.beat === 0;
  BYOC.introShown = () => !!introCard && introCard.dataset.state === 'shown';
  BYOC.introDone = introDone;

  // Meet the team: each teammate up close, one at a time (name · role, a line in its own voice, what it brings, the
  // agent mark, an empty face slot for the studio's art). Today's order; the teammate fitted to the idea comes last
  // once builder 8's roster lands. Each holds HOLD_MS (?hold=); forward moves to the next at once.
  function meetCard(seat, i) {
    const t = INFO[seat];
    const c = h('div', 'meet-card'); c.dataset.component = 'meet-card'; c.dataset.seat = seat;
    // Her idea's own line for this teammate when the call landed and passed the rules; else today's static line.
    const tailored = BYOC.meetLines && BYOC.meetLines[seat];
    c.dataset.state = tailored ? 'tailored' : 'static';
    c.innerHTML = `<span class="meet-face" data-slot="face"></span>
      <div class="meet-who"><span class="meet-name" data-slot="name">${esc(t.agent)}</span> · <span class="meet-role" data-slot="role">${esc(t.name)}</span> <span class="agent-mark" data-slot="agent-mark">agent</span></div>
      <p class="meet-line" data-slot="line">“${esc(tailored || t.loves)}”</p>
      <p class="meet-brings" data-slot="brings"><span class="meet-label">Brings</span> ${esc(t.brings)}</p>
      ${(BYOC.kit && Array.isArray(BYOC.kit[seat]) && BYOC.kit[seat].length) ? `<div class="meet-kit-wrap"><span class="meet-label" data-slot="kit-label">Loaded with</span><ul class="meet-kit" data-slot="kit">${BYOC.kit[seat].slice(0, 3).map(k => `<li class="meet-kit-item" data-slot="kit-item">${esc(k)}</li>`).join('')}</ul></div>` : ''}
      ${(BYOC.kit && BYOC.kit.made && Array.isArray(BYOC.kit.made[seat]) && BYOC.kit.made[seat].length) ? `<div class="meet-made-wrap"><span class="meet-label" data-slot="made-label">Made with</span><ul class="meet-made" data-slot="made">${BYOC.kit.made[seat].slice(0, 2).map(k => `<li class="meet-made-item" data-slot="made-item">${esc(k)}</li>`).join('')}</ul></div>` : ''}
      <span class="meet-count" data-slot="count">${i + 1} of ${TEAM.length}</span>
      <button type="button" class="meet-next" data-slot="next" data-state="${i === TEAM.length - 1 ? 'last' : 'next'}">${i === TEAM.length - 1 ? 'Into the studio' : 'Next'}</button>`;
    $('.meet-next', c).addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); BYOC.meetNext(); });
    return c;
  }
  async function holdFor(ms) { const end = Date.now() + ms; while (Date.now() < end && !meetSkip && !meetAdvance) await wait(50); meetAdvance = false; } // ms may be Infinity: her click, →, Enter or the clicker
  async function meetTeam(animate, tok) {
    if (!setup || !animate || BYOC.replay) return;
    setSetup('team');
    const st = $('#setup-stage');
    meeting = true; meetSkip = false; meetAdvance = false;
    if (!BYOC.kit) { if (!BYOC.kitReq) loadKit(''); await Promise.race([BYOC.kitReq, wait(800)]); } // never more than a beat
    try {
      for (let i = 0; i < TEAM.length; i++) {
        if (tok !== walkToken || meetSkip) return;
        const c = meetCard(TEAM[i], i);
        st.replaceChildren(c);
        place(c, { x: [60, 0], opacity: [0, 1] }, true);
        emit('meet', { seat: TEAM[i], index: i });
        await holdFor(HOLD_MS);
      }
    } finally { meeting = false; }
    if (tok === walkToken && BYOC.beat === 1 && !meetSkip) stage(2);
  }
  // The clicker's forward during "meet the team": the next teammate (after the last: the reveal).
  BYOC.meetNext = () => { if (meeting) meetAdvance = true; else if (BYOC.beat === 1) stage(2); };
  // The reveal: the studio, everyone already seated; then she takes her seat.
  async function reveal(animate, tok) {
    meetSkip = true;
    setSetup('off');
    for (const s of TEAM) seatCard(s, false);
    if (BYOC.herSeat === 'diy') seatDiy(animate); else seatCard('product', animate);
    const prod = el.seat.product.querySelector('.card'); if (prod) drawHerCharacter(prod);
    emit('reveal', { animate: !!animate });   // animate: the walked reveal (the door may open); false for jumps and replays
    if (animate && !BYOC.replay) { await wait(1100); if (tok === walkToken && BYOC.beat === 2) stage(3); }
  }
  // Voice hook (sponsor, later): put spoken words into whichever line she is writing, as editable text.
  BYOC.typeInto = function (text) {
    const t = document.activeElement;
    const target = (t && (t.id === 'idea-input' || t.id === 'intro-input' || t.id === 'her-input' || t.id === 'close-input')) ? t
      : ideaCard ? $('#idea-input', ideaCard) : introCard ? $('#intro-input', introCard) : (!el.herForm.hidden ? el.herInput : null);
    if (!target) return false;
    target.value = String(text || ''); target.focus();
    target.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  };

  async function enter(b, animate) {
    const tok = walkToken;
    switch (b) {
      case 1:
        await meetTeam(animate, tok); // her name tag is made: she meets the team, one by one
        break;
      case 2:
        await reveal(animate, tok); // the studio, everyone seated; she takes her seat
        break;
      case 3:
        el.herSheet.hidden = false; // her file (taste.md) stays off screen: her philosophy is the team's to keep
        place(el.herSheet, { y: animate ? [80, 0] : 0, rotate: animate ? [1.5, 0] : 0 }, animate);
        place(el.fileCard, { x: animate ? [-80, 0] : 0, rotate: -1, opacity: animate ? [0, 1] : 1 }, animate);
        if (!el.herIdea.textContent) {
          // Her idea from the idea paper: her sheet opens with her words and the run starts (the first sketch follows).
          const idea = !BYOC.replay && BYOC.pendingIdea;
          if (idea) { BYOC.pendingIdea = null; setTimeout(() => { if (BYOC.beat === 3 && !el.herIdea.textContent) startRun(idea); }, animate ? 500 : 0); }
          else setInputMode('idea');
        }
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
    setSheetOpen(false);
    n = Math.max(0, Math.min(BEATS.length - 1, Number(n) || 0));
    const animate = !opts.instant && !instantMode;
    if (n > 1 && meeting) meetSkip = true; // moving on mid-introductions goes straight to the reveal
    if (n < 9) pageSheet.hidden = true;
    if (n < BYOC.beat) {
      if (n <= 3 && !BYOC.replay && !el.herIdea.textContent) { reset(); const prev = instantMode; instantMode = true; for (let b = 1; b <= n; b++) enter(b, false); instantMode = prev; }
      BYOC.beat = n;
    } else {
      const from = BYOC.beat;
      BYOC.beat = n;
      const prev = instantMode; if (!animate) instantMode = true;
      for (let b = from + 1; b <= n; b++) { if (b === 1 && n > 1) continue; enter(b, animate); } // jumping past the introductions skips them
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
    setSheetOpen(false);
    if (typing) { clearInterval(typing); typing = null; }
    BYOC.run = null; BYOC.replay = false; BYOC.replayKind = null; BYOC.beat = 0;
    firstAskedFor = null; firstSettled = 0;
    BYOC.intro = null; BYOC.introRaw = null; BYOC.herName = null; herStance = ''; meetSkip = true; introCard = null; leanQueue = [];
    delete el.room.dataset.herSeat; BYOC.herSeat = null;
    chatter.innerHTML = ''; asks.clear(); answeredIds.clear(); thinking.clear(); if (BYOC.focusDoc) BYOC.focusDoc.close(true); BYOC.focus = { open: null, waiting: [] };
    el.room.querySelectorAll('.big-card').forEach(c => c.remove());
    seen = []; pending = []; serverTally = null; teamStep = null; buildStep = null; stepClear();
    clearTimeout(teamSlowTimer); teamStatus('idle', '');
    for (const s of SEATS) {
      el.seat[s].classList.remove('filled'); el.seat[s].dataset.state = 'empty';
      el.seat[s].querySelector('.card')?.remove();
      el.seatSheet[s].hidden = true; el.seatSheet[s].innerHTML = '';
    }
    el.herSheet.hidden = true; el.fileCard.hidden = true; el.tally.hidden = true; el.tally.dataset.state = 'hidden';
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
    BYOC.pendingIdea = null; BYOC.meetLines = null; BYOC.meetLinesReq = null; BYOC.kit = null; BYOC.kitReq = null; ideaCard = null;
    if (CLASSIC) openPaper(); else openIdea(); // the room hides again: her idea first (classic: her name tag)
  }
  BYOC.reset = reset;
  BYOC.setInstant = v => { instantMode = !!v; };

  // ---- a refresh resumes (Vincent, Sun 02:17: "an accidental refresh should keep the build and the room's state") ----
  // Her live run is kept per viewer: localStorage 'byoc.run' (in try/catch: private windows) and ?run=<id> in the URL as
  // a backup, plus who she is ('byoc.me': her name, tag, seat and intro, which only this page knows). On load, a run
  // that still exists is rebuilt from its own event log, instantly, as HER live run (no REPLAY label, no model call, no
  // ask re-raised: events are only re-read), then the SSE stream carries on. Replays never write these keys.
  // "Start over" ([data-component="start-over"], Shift+N) asks once, forgets the run (kept in runs/) and goes back to
  // the start. Hooks: #room[data-resume="resumed|fresh"].
  const RUN_KEY = 'byoc.run', ME_KEY = 'byoc.me';
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: k => { try { localStorage.removeItem(k); } catch {} } };
  function urlWithRun(id) { const u = new URL(location.href); if (id) u.searchParams.set('run', id); else u.searchParams.delete('run'); return u.pathname + u.search + u.hash; }
  function remember(id) {
    if (BYOC.replay || !id || String(id).startsWith('local-')) return;
    store.set(RUN_KEY, id);
    store.set(ME_KEY, JSON.stringify({ name: BYOC.herName || null, tag: BYOC.herTag || null, seat: BYOC.herSeat || null, intro: BYOC.intro || null }));
    try { history.replaceState(history.state, '', urlWithRun(id)); } catch {}
  }
  function forget() { store.del(RUN_KEY); store.del(ME_KEY); try { history.replaceState(history.state, '', urlWithRun(null)); } catch {} }
  BYOC.forgetRun = forget;
  async function resume(id) {
    let data = null;
    try { data = await BYOC.api('/api/replay/' + encodeURIComponent(id), undefined, { step: false }); } catch { data = null; }
    const events = (data && Array.isArray(data.events) ? data.events : []).filter(e => e && e.type).sort((a, b) => a.t - b.t);
    if (!events.some(e => e.type === 'run.start')) return false;
    let me = {}; try { me = JSON.parse(store.get(ME_KEY) || '{}') || {}; } catch { me = {}; }
    const prev = instantMode; instantMode = true;
    try {
      if (me.name) BYOC.herName = me.name;
      if (me.tag) BYOC.herTag = me.tag;
      if (me.seat === 'diy') BYOC.herSeat = 'diy';
      if (me.intro) BYOC.intro = me.intro;
      meetSkip = true; introCard = null; ideaCard = null;
      stage(2, { instant: true }); stage(3, { instant: true });
      BYOC.run = id;
      firstAskedFor = id; // resume only re-reads: Focus 1 is never asked for again
      if (data.taste && BYOC.file && BYOC.file.load) BYOC.file.load(data.taste, '');
      for (const ev of events) dispatch(ev, 'resume');
    } finally { instantMode = prev; }
    const seenKey = new Set(events.map(e => `${e.t}|${e.type}`));
    pending = pending.filter(e => e.run === id && !seenKey.has(`${e.t}|${e.type}`)); flushPending();
    // A build that was under way: say so; build.done arrives on the stream.
    const building = events.some(e => e.type === 'build.step') && !events.some(e => e.type === 'build.done' || e.type === 'build.error');
    if (building) { buildStep = stepBegin('Your app is still building'); }
    if (BYOC.beat === 4 && inputMode !== 'line') setInputMode('line');
    // Her empty field isn't focused after a pickup: the inbox never slides a note in while a field has focus.
    setTimeout(() => { if (document.activeElement === el.herInput && !el.herInput.value.trim()) el.herInput.blur(); }, 80);
    loadFileForRun(id);
    el.room.dataset.resume = 'resumed';
    remember(id); // keep it (and put ?run= back in the URL) for the next refresh
    emit('run.resumed', { run: id, events: events.length, beat: BYOC.beat, building });
    status(building ? 'Your app is still building' : `picked up run ${id} where you left off`);
    return true;
  }
  BYOC.resume = resume;
  // Start over: a quiet control that asks once.
  const startOver = h('div', 'start-over'); startOver.dataset.component = 'start-over'; startOver.dataset.state = 'idle';
  startOver.innerHTML = `<button type="button" class="so-open" data-slot="open">Start over</button>
    <div class="so-ask" data-slot="ask" hidden><span class="so-q" data-slot="question">Start a new studio? This one is kept in your past runs.</span>
    <button type="button" class="so-yes" data-slot="yes">Start a new studio</button> <button type="button" class="so-no" data-slot="no">Keep this one</button></div>`;
  (document.getElementById('chrome') || document.body).appendChild(startOver); // in the top bar (hidden in stage mode: Shift+N there)
  const soAsk = on => { startOver.dataset.state = on ? 'asking' : 'idle'; $('.so-ask', startOver).hidden = !on; if (on) $('.so-yes', startOver).focus(); };
  $('.so-open', startOver).addEventListener('click', e => { e.preventDefault(); soAsk(startOver.dataset.state !== 'asking'); });
  $('.so-no', startOver).addEventListener('click', e => { e.preventDefault(); soAsk(false); });
  $('.so-yes', startOver).addEventListener('click', e => { e.preventDefault(); soAsk(false); forget(); el.room.dataset.resume = 'fresh'; reset(); emit('start.over', {}); });
  BYOC.startOver = { ask: () => soAsk(true), confirm: () => $('.so-yes', startOver).click(), cancel: () => soAsk(false) };

  async function boot() {
    const q = new URLSearchParams(location.search);
    const id = q.get('run') || store.get(RUN_KEY);
    const fixtureOrReplay = q.has('fixture') || q.has('replay');
    reset();
    connectSSE();
    if (!id || fixtureOrReplay) return;
    const ok = await resume(id).catch(() => false);
    if (!ok) {
      forget();
      el.room.dataset.resume = 'fresh';
      status('Couldn’t pick up where you left off: starting fresh.');
      emit('run.resume.failed', { run: id });
    }
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
