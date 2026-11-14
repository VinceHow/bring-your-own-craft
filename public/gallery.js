// /gallery: every component in every state (docs/COMPONENTS.md), drawn by the real room scripts.
// Each state is its own iframe of the room (so states never leak into each other). The iframe loads with no fixture
// and no run; this script then plays recorded events into BYOC instantly (the rehearsal run in runs/, the fake
// fixture), adds a few clearly labelled sample events where no recording has them yet (chime-ins, takeaways,
// team space, chatter), and zooms the frame onto the component. No model calls, no flow. ?look=<name> passes through.
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);
  const lookInput = document.getElementById('look');
  const look = (q.get('look') || '').toLowerCase();
  lookInput.value = look;
  lookInput.addEventListener('change', () => { const v = lookInput.value.trim(); location.search = v ? '?look=' + encodeURIComponent(v) : ''; });

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const data = {}; // rehearsal: { events, taste }, fixture: { events, taste }
  async function loadData() {
    const [reh, fx, fxTaste] = await Promise.all([
      fetch('/api/replay/rehearsal').then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/fixtures/fake-run.jsonl').then(r => (r.ok ? r.text() : '')).catch(() => ''),
      fetch('/fixtures/fake-taste.md').then(r => (r.ok ? r.text() : '')).catch(() => ''),
    ]);
    const sort = evs => evs.filter(e => e && e.type).sort((a, b) => a.t - b.t);
    data.rehearsal = reh ? { events: sort(reh.events || []), taste: reh.taste || '', kind: 'recorded', name: 'rehearsal' } : null;
    data.fixture = { events: sort(fx.split('\n').filter(Boolean).map(l => JSON.parse(l))), taste: fxTaste, kind: 'fixture', name: 'fixture' };
  }

  // ---- helpers each recipe gets: h.play(source, { until }), h.dispatch(ev), h.stage(n), h.wait(ms), h.B, h.doc ----
  function helpers(win) {
    const B = win.BYOC;
    const h = { B, win, doc: win.document, wait };
    // Plays a recording instantly, the way replay.js does with its timers, up to (not including) the first event `until` matches.
    h.play = (name, { until, count } = {}) => {
      const src = data[name];
      if (!src || !src.events.length) throw new Error(`no ${name} events`);
      B.reset();
      B.replay = true; B.replayKind = src.kind; B.replayName = src.name; B.run = src.events[0].run || src.name;
      if (B.replayLabel) B.replayLabel(src.kind, src.name, src.events[0].t, 'gallery');
      B.stage(2, { instant: true }); B.stage(3, { instant: true });
      if (src.taste && B.file && B.file.load) B.file.load(src.taste, src.kind === 'fixture' ? 'Fixture file, not hers.' : '');
      let seen = {};
      for (const ev of src.events) {
        seen[ev.type] = (seen[ev.type] || 0) + 1;
        if (until && until(ev, seen)) break;
        if (count && Object.entries(count).some(([t, n]) => ev.type === t && seen[t] > n)) break;
        B.dispatch(ev, 'replay');
      }
      return src.events[0].run || src.name;
    };
    h.dispatch = ev => B.dispatch(Object.assign({ t: Date.now(), run: B.run, sample: true }, ev), 'replay');
    h.emit = (type, ev) => B.emit && B.emit(type, ev);
    h.stage = (n, instant = true) => B.stage(n, { instant });
    return h;
  }

  // Sample events: not from any run. The gallery says so under every state that uses them.
  const SAMPLE_ASK = { id: 'gallery-ask', seat: 'research', by: 'Noor', question: 'What makes someone come back to a studio week after week?',
    decision: 'What makes someone come back to a studio week after week?', artifact: { kind: 'journey', by: ['Noor', 'Mika'] } };
  const CHIMES = [
    { askId: 'gallery-ask', seat: 'research', by: 'Noor', text: 'That matches what small studios report: regulars book the same slot.' },
    { askId: 'gallery-ask', seat: 'design', by: 'Mika', text: 'Love that. Regulars go first, their usual class one tap away.' },
  ];
  const BRIEF = { askId: 'gallery-ask', believe: 'Regulars should never hunt for their usual class.', why: '',
    guidance: 'Put a regular’s usual class first, one tap to book. Remember them; don’t ask again.' };
  const JOINTS = [
    { type: 'joint.agreed', id: 'g-j1', headline: 'Waitlist auto-offers the spot, no logins.', seats: ['engineering', 'design'], withTakeaways: true,
      turns: [{ by: 'Bo', seat: 'engineering', text: 'Logins slow regulars down.' }, { by: 'Mika', seat: 'design', text: 'Then remember them on the device.' },
        { by: 'Bo', seat: 'engineering', text: 'A device token, no account.' }] },
    { type: 'joint.agreed', id: 'g-j2', headline: 'Price shows on the class list, not at checkout.', seats: ['strategy', 'data'],
      turns: [{ by: 'Ines', seat: 'strategy', text: 'Surprise prices lose first-timers.' }, { by: 'Theo', seat: 'data', text: 'We’ll watch drop-off at confirm.' }] },
  ];
  async function focusOpen(h) {
    if (!h.B.focusDoc) throw new Error('missing: focus-doc.js is not on this branch yet');
    h.play('rehearsal', { until: ev => ev.type === 'ask' });
    h.B.replay = false; // a replay closes her document by itself after 3.5 s; the gallery holds it open
    h.B.focusDoc.open(SAMPLE_ASK);
  }
  function said(h, text) {
    const s = h.doc.querySelector('.fd-said'); if (!s) return;
    s.innerHTML = ''; const b = h.doc.createElement('blockquote'); b.className = 'fd-words'; b.textContent = text; s.appendChild(b);
    const f = h.doc.querySelector('.fd-form'); if (f) f.hidden = true;
  }
  const HER = 'Knowing their spot is theirs. My regulars do the same Tuesday class every week and hate hunting for it.';

  // ---- the catalogue: component -> states. sel: what the frame zooms onto. ----
  const R = 'recorded rehearsal run', F = 'fake fixture', S = 'sample events (not from a run)';
  const CATALOGUE = [
    { name: 'seat', sel: '.seat-design', states: [
      { state: 'empty', src: '', run: async h => { h.B.reset(); } },
      { state: 'filled', src: F, run: async h => { h.play('fixture'); } },
      { state: 'her', src: F, sel: '.seat-product', run: async h => { h.play('fixture'); } },
    ] },
    { name: 'pick-card', sel: '#pick-card', note: 'Her first choice: sit in Product, or bring her own craft. (picked is a moment: the card hides as she chooses.)', states: [
      { state: 'open', src: '', run: async h => { if (!h.B.pick || typeof h.B.pick.open !== 'function') throw new Error('missing: no stand-alone pick card on this branch (with the setup reveal it lives inside her paper name tag)'); h.B.reset(); h.B.pick.open(); await wait(400); } },
    ] },
    { name: 'place-card', sel: '.seat-design .card', states: [
      { state: 'thinking', src: F, run: async h => { h.play('fixture', { until: ev => ev.type === 'candidate' }); } },
      { state: 'working', src: F, run: async h => { h.play('fixture', { count: { 'teammate.done': 0 } }); } },
      { state: 'done', src: F, run: async h => { h.play('fixture'); } },
    ] },
    { name: 'her-place-card', sel: '.seat-product .card', states: [
      { state: 'empty', src: F, run: async h => { h.play('fixture'); } },
    ] },
    { name: 'teammate-card', sel: '.big-card:not([data-seat="product"])', note: 'Retired with the setup reveal (beats 82119af: teammates are met, then revealed seated); shows only on branches before it.', states: [
      { state: 'holding', src: '', run: async h => { h.B.reset(); h.stage(1); h.B.stage(2); await wait(300); } },
    ] },
    { name: 'character-card (her name tag on paper)', sel: '#setup .nt-paper', note: 'The setup: her name tag on paper, before the room is ever shown (beats 82119af).', states: [
      { state: 'asking', src: '', run: async h => { h.B.reset(); await wait(500); if (!h.doc.querySelector('#setup .nt-paper')) throw new Error('missing: the paper name tag is not on this branch yet'); } },
    ] },
    { name: 'meet-card', sel: '#setup .meet-card', note: 'Meeting the team one by one, up close; the face slot is empty, waiting for art.', states: [
      { state: 'meeting', src: '', run: async h => { h.B.reset(); await wait(200); if (!h.B.meetNext) throw new Error('missing: meeting the team is not on this branch yet'); h.B.stage(1); await wait(500); } },
    ] },
    { name: 'character-card', sel: '.name-tag', note: 'The DIY path (name-tag.js). Her seat path (.big-card[data-seat="product"]) joins once beats builds it.', states: [
      { state: 'asking', src: '', run: async h => { if (!h.B.nameTag) throw new Error('missing: name-tag.js'); h.B.reset(); h.stage(3); h.B.nameTag.open(); } },
    ] },
    { name: 'sketchpad', sel: '.mini-sheet[data-sheet="design"]', states: [
      { state: 'working', src: F, run: async h => { h.play('fixture', { count: { candidate: 2 } }); } },
      { state: 'done', src: F, run: async h => { h.play('fixture'); } },
    ] },
    { name: 'idea-sheet', sel: '#her-sheet', states: [
      { state: 'blank', src: '', run: async h => { h.B.reset(); h.stage(3); } },
      { state: 'rough', src: R, run: async h => { h.play('rehearsal', { until: ev => ev.type === 'flow.line' }); } },
      { state: 'sketched', src: R, run: async h => { h.play('rehearsal', { until: ev => ev.type === 'flow.reset' || ev.type === 'ask' }); } },
      { state: 'reshaped', src: R, run: async h => { h.play('rehearsal', { until: ev => ev.type === 'ask' }); } },
      { state: 'wires', src: R, run: async h => { h.play('rehearsal', { until: ev => ev.type === 'build.step' }); } },
      { state: 'open (data-open, clicked large)', src: R, run: async h => { h.play('rehearsal', { until: ev => ev.type === 'ask' }); h.doc.getElementById('her-sheet').click(); await wait(500); if (h.doc.getElementById('her-sheet').dataset.open !== 'true') throw new Error('missing: her sheet does not open large on this branch yet'); } },
      { state: 'page', src: R, run: async h => { h.play('rehearsal'); await wait(1500); } },
    ] },
    { name: 'journey', sel: '.fl-wrap', states: [
      { state: 'drawn', src: R, run: async h => { h.play('rehearsal', { until: ev => ev.type === 'ask' }); } },
      { state: 'drawn, with her pin', src: R, run: async h => { h.play('rehearsal', { until: ev => ev.type === 'sketches' }); } },
    ] },
    { name: 'wireframes', sel: '.sk-host', states: [
      { state: 'shown', src: R, run: async h => { h.play('rehearsal', { until: ev => ev.type === 'build.step' }); await wait(800); } },
    ] },
    { name: 'page-frame', sel: '.page-frame', states: [
      { state: 'built', src: R, run: async h => { h.play('rehearsal'); await wait(1500); } },
    ] },
    { name: 'tally', sel: '#tally', states: [
      { state: 'counting', src: R, run: async h => { h.play('rehearsal', { until: ev => ev.type === 'build.done' }); await wait(1500); } },
    ] },
    { name: 'sketchpad-open', sel: '#room-panel', note: 'One panel over the room: a teammate’s sketchpad, opened from their seat.', states: [
      { state: 'open', src: F, run: async h => { h.play('fixture'); if (!h.B.openSketchpad) throw new Error('missing: the room panel is not on this branch yet'); h.B.openSketchpad('design'); await wait(300); } },
    ] },
    { name: 'workspace', sel: '#room-panel', note: 'The same panel holding her workspace: her character, the idea, the team space, her takeaways.', states: [
      { state: 'open', src: R, run: async h => { h.play('rehearsal'); if (!h.B.openWorkspace) throw new Error('missing: the room panel is not on this branch yet'); h.B.openWorkspace(); await wait(300); } },
    ] },
    { name: 'inbox', sel: '#inbox', note: 'Her inbox by her seat (replaced the tray): collapsed, the one item that needs her; expanded, Needs you · Things only you can do · Past meetings.', states: [
      { state: 'collapsed, nothing waiting', src: '', run: async h => { if (!h.B.inbox) throw new Error('missing: inbox.js is not on this branch yet'); h.B.reset(); h.stage(5); await wait(200); } },
      { state: 'collapsed, one needs her', src: F, run: async h => { if (!h.B.inbox) throw new Error('missing: inbox.js is not on this branch yet'); h.play('fixture'); await wait(300); } },
      { state: 'expanded', src: F + ' + ' + S, run: async h => { if (!h.B.inbox) throw new Error('missing: inbox.js is not on this branch yet'); h.play('fixture');
        h.dispatch({ type: 'owner.task', id: 'g-t1', title: 'Make a Stripe account for the studio', steps: ['Sign up with the studio email', 'Confirm the email', 'Tell the team it’s done'] });
        await wait(300); h.B.inbox.expand(true); await wait(200); } },
    ] },
    { name: 'unblock-card', sel: '#inbox [data-component="unblock-card"]', note: 'A quick unblock in her inbox (DEMO 0:50): a seat needs a fact or call only she has; Yes takes the suggestion, or her own words.', states: [
      { state: 'asking', src: F + ' + ' + S, run: async h => { if (!h.B.inbox || !h.B.inbox.showUnblock) throw new Error('missing: quick unblocks are not on this branch yet'); h.play('fixture', { until: ev => ev.type === 'ask' });
        h.dispatch({ type: 'ask', id: 'g-u1', unblock: true, seat: 'engineering', by: 'Bo', question: 'When do orders close?', decision: 'When do orders close.', suggestion: '8pm the night before', kind: 'call' });
        await wait(300); h.B.inbox.showUnblock('g-u1'); await wait(200); } },
    ] },
    { name: 'focus-doc', sel: '#focus-doc', states: [
      { state: 'asking', src: R + ' + ' + S, run: async h => { await focusOpen(h); } },
      { state: 'answered (her words placed by the gallery; data-state stays as the code left it)', src: R + ' + ' + S, run: async h => { await focusOpen(h); said(h, HER); } },
      { state: 'chiming', src: R + ' + ' + S, run: async h => { await focusOpen(h); said(h, HER); CHIMES.forEach(c => h.emit('chime', c)); await wait(1200); } },
      { state: 'takeaways', src: R + ' + ' + S, run: async h => { await focusOpen(h); said(h, HER); CHIMES.forEach(c => h.emit('chime', c)); h.emit('takeaways', BRIEF); h.emit('answer.mapped', { askId: 'gallery-ask' }); await wait(2600); } },
    ] },
    { name: 'takeaways', sel: '.fd-brief', states: [
      { state: 'shown', src: S, run: async h => { await focusOpen(h); said(h, HER); h.emit('takeaways', BRIEF); await wait(300); } },
    ] },
    { name: 'chime', sel: '.chime', states: [
      { state: 'in', src: S, run: async h => { await focusOpen(h); h.emit('chime', CHIMES[1]); await wait(300); } },
    ] },
    { name: 'chatter-line', sel: '.chatter-line', states: [
      { state: 'in', src: F + ' + ' + S, run: async h => {
        h.play('fixture');
        if (!h.doc.querySelector('.chatter')) throw new Error('missing: room chatter is not on this branch yet');
        h.dispatch({ type: 'chatter', by: 'Mika', seat: 'design', text: 'then remember them on the device.' }); await wait(400);
      } },
    ] },
    { name: 'team-space', sel: '.team-space', states: [
      { state: 'shown', src: F + ' + ' + S, run: async h => { h.play('fixture'); if (!h.B.teamSpace) throw new Error('missing: team-space.js'); JOINTS.forEach(e => h.dispatch(e)); h.B.teamSpace.render(); await wait(300); } },
    ] },
    { name: 'decision-card', sel: '.ts-card', states: [
      { state: 'closed', src: S, run: async h => { h.play('fixture'); if (!h.B.teamSpace) throw new Error('missing: team-space.js'); JOINTS.forEach(e => h.dispatch(e)); h.B.teamSpace.render(); await wait(300); } },
      { state: 'open', src: S, run: async h => { h.play('fixture'); if (!h.B.teamSpace) throw new Error('missing: team-space.js'); JOINTS.forEach(e => h.dispatch(e)); h.B.teamSpace.render(); await wait(300); h.doc.querySelector('.ts-card').click(); await wait(200); } },
    ] },
    { name: 'close-view', sel: '#close-sheet', states: [
      { state: 'asking', src: '', run: async h => { if (!h.B.close) throw new Error('missing: close.js'); h.B.reset(); h.B.close.open(); await wait(400); } },
    ] },
    { name: 'replay-label', sel: '#replay-label', states: [
      { state: 'fake', src: F, run: async h => { h.play('fixture'); } },
      { state: 'replay', src: R, run: async h => { h.play('rehearsal'); } },
    ] },
  ];

  // ---- render ----
  const root = document.getElementById('gallery'), toc = document.getElementById('toc');
  const jobs = [];
  for (const c of CATALOGUE) {
    const sec = document.createElement('section'); sec.className = 'comp'; sec.id = 'c-' + c.name;
    sec.innerHTML = `<h2>${c.name}<code>${c.sel}</code></h2>${c.note ? `<p class="note">${c.note}</p>` : ''}<div class="states"></div>`;
    root.appendChild(sec);
    const a = document.createElement('a'); a.href = '#c-' + c.name; a.textContent = c.name; toc.appendChild(a);
    for (const s of c.states) {
      const fig = document.createElement('figure');
      fig.innerHTML = `<figcaption><b>${s.state}</b><span class="why">${s.src ? 'from ' + s.src : 'no events'}</span></figcaption>
        <div class="frame"><div class="msg">waiting…</div></div><div class="hooks"></div>`;
      sec.querySelector('.states').appendChild(fig);
      jobs.push({ c, s, fig });
    }
  }

  function zoom(frame, iframe, el) {
    const r = el.getBoundingClientRect();
    const pad = 20, W = frame.clientWidth, H = frame.clientHeight;
    const k = Math.min(2, W / (r.width + pad * 2), H / (r.height + pad * 2));
    const x = -(r.left - pad) * k + (W - (r.width + pad * 2) * k) / 2;
    const y = -(r.top - pad) * k + (H - (r.height + pad * 2) * k) / 2;
    iframe.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
  }
  function hooks(el) {
    const has = n => el.hasAttribute(n);
    const comp = el.closest('[data-component]');
    const bits = [
      has('data-component') ? `<span class="ok">data-component="${el.dataset.component}"</span>` : `<span class="no">no data-component yet</span>`,
      has('data-state') ? `<span class="ok">data-state="${el.dataset.state}"</span>` : `<span class="no">no data-state yet</span>`,
      `${el.querySelectorAll('[data-slot]').length} slots`,
    ];
    if (!has('data-component') && comp) bits.push(`inside ${comp.dataset.component}`);
    return bits.join(' · ');
  }

  let roomSrc = null;
  function roomHtml() {
    if (!roomSrc) roomSrc = fetch('/').then(r => r.text()).then(html => {
      const pre = '<base href="/"><script>window.EventSource = undefined;</script>' +
        (/^[a-z0-9-]{1,40}$/.test(look) ? `<link rel="stylesheet" href="/looks/${look}.css" data-gallery-look>` : '');
      return html.replace(/<head([^>]*)>/i, m => m + pre);
    });
    return roomSrc;
  }
  async function runJob({ c, s, fig }) {
    const frame = fig.querySelector('.frame'), msg = frame.querySelector('.msg');
    const iframe = document.createElement('iframe');
    iframe.title = `${c.name}: ${s.state}`;
    iframe.setAttribute('tabindex', '-1');
    // The room as served, with its live event stream switched off: a browser allows six open connections per host,
    // and every frame of the room would otherwise hold one open forever (nothing live comes to the gallery anyway).
    iframe.srcdoc = await roomHtml();
    frame.appendChild(iframe);
    msg.textContent = 'loading the room…';
    await new Promise(r => iframe.addEventListener('load', r, { once: true }));
    const win = iframe.contentWindow;
    for (let i = 0; i < 40 && !(win.BYOC && win.BYOC.stage && win.BYOC.dispatch); i++) await wait(100);
    try {
      win.document.body.classList.add('gallery');
      const h = helpers(win);
      await s.run(h);
      await wait(700);
      const el = win.document.querySelector(s.sel || c.sel);
      if (!el || !el.getClientRects().length) throw new Error(`missing: nothing matches ${s.sel || c.sel} in this state`);
      zoom(frame, iframe, el);
      fig.querySelector('.hooks').innerHTML = hooks(el);
      frame.classList.add('ready');
    } catch (e) {
      frame.classList.add('missing');
      msg.textContent = String(e.message || e).replace(/^missing: /, 'Not drawn: ');
      iframe.remove();
    }
  }

  (async () => {
    await loadData();
    if (!data.rehearsal) document.querySelector('header p').textContent += ' (The rehearsal recording didn’t load: states from it will be missing.)';
    let next = 0;
    // A state that hangs (a script waiting on something that never comes) gives up after 20 s and says so.
    const timed = job => Promise.race([runJob(job), wait(20000).then(() => {
      const fr = job.fig.querySelector('.frame');
      if (!fr.classList.contains('ready')) { fr.classList.add('missing'); fr.querySelector('.msg').textContent = 'Not drawn: timed out after 20 s'; }
    })]);
    const worker = async () => { while (next < jobs.length) await timed(jobs[next++]); };
    await Promise.all([worker(), worker(), worker()]);
    document.body.dataset.done = '1';
  })();
})();
