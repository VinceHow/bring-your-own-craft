// Her focus (DEMO focus rules, 14 Nov): she opens a note from her tray and the view becomes just her and one document.
// The work is shown large (her journey, a finding, Design's wireframes or the page), with one big question under it.
// She says or types her piece; her words land on the document. On send: POST /api/run/:id/answer { askId, text }.
// The team chimes in (chime events, one after another about a second apart), then the meeting's takeaways appear
// (takeaways event: what I believe / guidance to the team), each part rewordable; keeping them (Enter, the button, or
// closing) POSTs /api/run/:id/takeaways (her hidden file and profile grow). Then the team gets to work.
// Closing it brings the room back. Class names are polish's (polish.css owns the look); room.css only lays it out.
// Provides BYOC.focusDoc.{ open(ask), close(), isOpen(), openId() }.
(function () {
  'use strict';
  const B = window.BYOC;
  const M = window.Motion || null;
  const SPRING = { type: 'spring', stiffness: 500, damping: 30 };
  const room = document.getElementById('room');
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const SEAT_NAME = s => (B.info && B.info(s) && B.info(s).name) || String(s || 'team').replace(/^./, c => c.toUpperCase());
  const AGENT = s => (B.info && B.info(s) && B.info(s).agent) || null;
  const CHIME_GAP_MS = 1000;

  const doc = h('section', 'focus-doc'); doc.id = 'focus-doc'; doc.hidden = true;
  doc.dataset.component = 'focus-doc'; doc.dataset.state = 'asking';
  doc.setAttribute('aria-label', 'Your focus');
  doc.innerHTML = `
    <header class="fd-head" data-slot="head"><span class="fd-kicker" data-slot="kicker"></span><span class="fd-by" data-slot="by"></span>
      <button type="button" class="fd-close" data-slot="close">Back to the room</button></header>
    <div class="fd-main">
      <div class="fd-work" data-slot="work"></div>
      <h2 class="fd-question" data-slot="question"></h2>
      <div class="fd-said" data-component="her-answer" data-state="speaking"></div>
      <form class="fd-form" autocomplete="off">
        <textarea class="fd-input" data-slot="input" rows="3" spellcheck="false" data-voice placeholder="Say it or type it. Take your time; send when you’re ready."></textarea>
        <button type="submit" class="fd-send" data-slot="send">Send</button>
      </form>
    </div>
    <aside class="fd-side">
      <ol class="fd-chimes" data-slot="chimes"></ol>
      <div class="fd-brief" data-component="takeaways" data-state="hidden" hidden>
        <div class="brief-head" data-slot="head">Takeaways</div>
        <div class="brief-part brief-believe"><span class="brief-label" data-slot="label">What I believe about this</span><p class="brief-text" data-slot="believe" data-k="believe"></p></div>
        <div class="brief-part brief-guidance"><span class="brief-label" data-slot="label">Guidance to the team</span><p class="brief-text" data-slot="guidance" data-k="guidance"></p></div>
        <button type="button" class="fd-keep" data-slot="keep">Keep</button>
      </div>
      <div class="fd-team" data-slot="team"></div>
    </aside>`;
  room.appendChild(doc);
  const $ = sel => doc.querySelector(sel);

  let cur = null;          // the open ask
  let chimeQ = [], chimeTimer = null, briefPending = null, kept = false, sent = false, replayClose = null;

  // ---- the work, large ------------------------------------------------------------------------
  function renderWork() {
    const w = $('.fd-work'); w.innerHTML = '';
    if (!cur) return;
    const kind = (cur.artifact && cur.artifact.kind) || 'journey';
    w.dataset.kind = kind;
    if (kind === 'finding') return renderFinding(w);
    if (kind === 'wires') return renderWires(w);
    if (kind === 'page') return renderPage(w);
    return renderJourney(w);
  }
  // Her journey, as it stands now, from her flow's own state (boxes and arrows, the branch labelled).
  function renderJourney(w) {
    const S = B.flow && B.flow._state;
    const nodes = S ? [...S.nodes.values()] : [];
    if (!nodes.length) { w.appendChild(h('p', 'fd-empty', 'The journey is still being drawn.')); return; }
    const rows = new Map();
    for (const n of nodes) { const r = n.row || 0; if (!rows.has(r)) rows.set(r, []); rows.get(r).push(n); }
    const edgeIn = new Map((S.edges || []).map(e => [e.to, e]));
    const target = cur.attachTo || (cur.artifact && cur.artifact.ref);
    for (const r of [...rows.keys()].sort((a, b) => a - b)) {
      const row = h('div', 'fd-row');
      rows.get(r).sort((a, b) => (a.col || 0) - (b.col || 0)).forEach((n, i) => {
        const e = edgeIn.get(n.id);
        if (i || (e && e.label)) row.appendChild(h('span', 'fd-arrow', e && e.label ? `${e.label} →` : '→'));
        const b = h('span', 'fd-box', n.label || (n.el && n.el.textContent) || n.id);
        b.dataset.node = n.id;
        if (target && target === n.id) b.classList.add('fd-target');
        row.appendChild(b);
      });
      w.appendChild(row);
    }
  }
  // A finding: its title, what it says, and where it's from.
  function renderFinding(w) {
    const ref = (cur.artifact && typeof cur.artifact.ref === 'object' && cur.artifact.ref) || cur.source || {};
    const card = h('article', 'fd-finding');
    if (ref.title) card.appendChild(h('h3', 'fd-finding-title', ref.title));
    if (ref.text || ref.summary) card.appendChild(h('p', 'fd-finding-text', ref.text || ref.summary));
    const src = h('p', 'fd-finding-src');
    src.textContent = [ref.label || 'researched before the demo', ref.url].filter(Boolean).join(' · ');
    card.appendChild(src);
    w.appendChild(card);
  }
  // Design's grey wireframes, from the same request the room makes.
  async function renderWires(w) {
    const hold = h('p', 'fd-empty', `${AGENT('design') || 'Design'} is laying out the screens`);
    w.appendChild(hold);
    try {
      const data = await (B.getSketches ? B.getSketches() : B.api(`/api/run/${encodeURIComponent(B.run)}/sketches`, undefined, { step: false }));
      if (!cur || $('.fd-work') !== w) return;
      hold.remove();
      const inner = h('div', 'fd-wires'); w.appendChild(inner);
      if (B.sketches && B.sketches.show) await B.sketches.show(inner, data);
    } catch (e) { hold.textContent = 'The screens aren’t ready yet.'; }
  }
  function renderPage(w) {
    const done = (B.events ? B.events() : []).filter(e => e.type === 'build.done').at(-1);
    if (!done) { w.appendChild(h('p', 'fd-empty', 'The page isn’t built yet.')); return; }
    const f = h('iframe', 'fd-page'); f.src = B.replay && B.replayName ? `/runs/${encodeURIComponent(B.replayName)}/page/` : done.url; f.title = 'The page';
    w.appendChild(f);
  }

  // ---- open and close -------------------------------------------------------------------------
  function open(ask) {
    if (!ask) return;
    if (cur && cur.id === ask.id && !doc.hidden) return;
    if (cur) close(true);
    cur = ask; kept = false; sent = false; briefPending = null; chimeQ = []; clearTimeout(chimeTimer); chimeTimer = null; clearTimeout(replayClose);
    // Who asked shows only when it's a named teammate (Noor · Research); otherwise no "by" at all.
    const seat = ask.seat, named = AGENT(seat), name = named && (!ask.by || ask.by === named) ? named : null;
    $('.fd-kicker').textContent = name ? `${name} · ${SEAT_NAME(seat)}` : '';
    const proposers = (ask.artifact && Array.isArray(ask.artifact.by) && ask.artifact.by.length) ? ask.artifact.by : null;
    $('.fd-by').textContent = proposers ? `proposed by ${proposers.join(' and ')}` : '';
    $('.fd-question').textContent = ask.question || ask.decision || '';
    $('.fd-said').innerHTML = ''; $('.fd-said').classList.remove('speaking');
    $('.fd-chimes').innerHTML = ''; $('.fd-team').textContent = '';
    $('.fd-brief').hidden = true; doc.querySelectorAll('.brief-text').forEach(p => { p.textContent = ''; p.contentEditable = 'false'; });
    $('.fd-input').value = ''; $('.fd-form').hidden = !!B.replay;
    doc.dataset.seat = seat || ''; doc.dataset.state = 'asking';
    $('.fd-brief').dataset.state = 'hidden'; $('.fd-said').dataset.state = 'speaking';
    doc.hidden = false;
    document.body.classList.add('focus-open');
    renderWork();
    if (M) M.animate(doc, { y: [18, 0], scale: [0.985, 1] }, SPRING);
    if (!B.replay) setTimeout(() => $('.fd-input').focus(), 40);
    B.syncFocus && B.syncFocus();
    B.emit && B.emit('focus.open', { askId: ask.id });
  }
  // close(quiet): back to the room. A brief she hasn't kept is kept as it stands (her file gets her belief).
  function close(quiet) {
    if (!cur) { doc.hidden = true; document.body.classList.remove('focus-open'); return; }
    const was = cur;
    if (!quiet && !kept && briefShown() && !B.replay) keepBrief();
    cur = null; clearTimeout(chimeTimer); chimeTimer = null; clearTimeout(replayClose); chimeQ = []; briefPending = null;
    doc.hidden = true;
    document.body.classList.remove('focus-open');
    B.syncFocus && B.syncFocus();
    B.emit && B.emit('focus.close', { askId: was.id });
    B.emit && B.emit('focus', { open: null });
  }
  const briefShown = () => !$('.fd-brief').hidden;

  // ---- her piece: words land on the document ----------------------------------------------------
  let rawSaid = '', tidySaid = '';
  function landSaid(text) {
    const said = $('.fd-said');
    said.innerHTML = '';
    rawSaid = text; tidySaid = '';
    const q = h('blockquote', 'fd-words', text); q.dataset.slot = 'words';
    said.appendChild(q); said.dataset.state = 'landed'; doc.dataset.state = 'answered';
    if (M) M.animate(q, { y: [10, 0] }, SPRING);
  }
  // Her raw words land first; the tidy (answer.tidy, lib/tidy.js) swaps in when it's ready. She can look at what
  // she said, or keep her own words. Hooks only (data-component / data-slot / data-state); the look is design's.
  function landTidy(text) {
    const said = $('.fd-said'), q = said.querySelector('[data-slot="words"]');
    if (!q || !text) return;
    tidySaid = text;
    q.textContent = text; said.dataset.state = 'tidied';
    const bar = h('div', 'fd-tidy'); bar.dataset.component = 'tidy'; bar.dataset.state = 'tidy';
    const see = h('button', 'fd-tidy-see', 'See what you said'); see.type = 'button'; see.dataset.slot = 'see-said';
    const mine = h('button', 'fd-tidy-mine', 'Use mine'); mine.type = 'button'; mine.dataset.slot = 'use-mine';
    see.addEventListener('click', () => {
      const showing = bar.dataset.state === 'raw-shown';
      q.textContent = showing ? tidySaid : rawSaid;
      bar.dataset.state = showing ? 'tidy' : 'raw-shown';
      see.textContent = showing ? 'See what you said' : 'See the tidy';
    });
    mine.addEventListener('click', async () => {
      const toMine = bar.dataset.state !== 'mine';
      q.textContent = toMine ? rawSaid : tidySaid;
      bar.dataset.state = toMine ? 'mine' : 'tidy';
      said.dataset.state = toMine ? 'mine' : 'tidied';
      mine.textContent = toMine ? 'Use the tidy' : 'Use mine';
      see.hidden = toMine;
      if (cur) B.api(`/api/run/${encodeURIComponent(B.run)}/tidy`, { askId: cur.id, use: toMine ? 'mine' : 'tidy' }, { step: false }).catch(() => {});
    });
    bar.append(see, mine);
    said.appendChild(bar);
    if (M) M.animate(q, { opacity: [0.4, 1] }, SPRING);
  }
  B.on('answer.tidy', ev => { if (forCur(ev) && rawSaid) landTidy(ev.text); });
  $('.fd-input').addEventListener('input', e => {
    // As she speaks or types, the words show on the document.
    const t = e.target.value.trim();
    $('.fd-said').classList.toggle('speaking', !!t);
    if (!sent) doc.dataset.state = t ? 'speaking' : 'asking';
  });
  $('.fd-input').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.target.blur(); return; }
    // Her pace: nothing sends on silence; she sends when she's ready (Enter, Send, or the clicker's forward key).
    if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'PageDown') { e.preventDefault(); send(); }
  });
  $('.fd-form').addEventListener('submit', e => { e.preventDefault(); send(); });
  async function send() {
    const text = $('.fd-input').value.trim();
    if (!text || !cur || sent) return;
    sent = true;
    const ask = cur;
    landSaid(text);
    $('.fd-input').value = ''; $('.fd-input').blur(); $('.fd-form').hidden = true;
    $('.fd-said').classList.remove('speaking');
    try { await B.api(`/api/run/${encodeURIComponent(B.run)}/answer`, { askId: ask.id, text }, { step: false }); }
    catch (e) {
      if (cur !== ask) return;
      sent = false; $('.fd-form').hidden = false; $('.fd-input').value = text;
      $('.fd-team').textContent = `Not sent (${e.status || e.message}). Enter to try again.`;
    }
  }

  // ---- the team chimes in, one after another; then her brief -------------------------------------
  const forCur = ev => cur && (!ev.askId || ev.askId === cur.id);
  function pumpChimes() {
    if (chimeTimer || !chimeQ.length) { if (!chimeQ.length && !chimeTimer && briefPending) { const b = briefPending; briefPending = null; showBrief(b); } return; }
    const ev = chimeQ.shift();
    const li = h('li', 'chime'); li.dataset.seat = ev.seat || ''; li.dataset.component = 'chime'; li.dataset.state = 'in';
    const w = h('span', 'chime-who', `${ev.by || AGENT(ev.seat) || SEAT_NAME(ev.seat)} · ${SEAT_NAME(ev.seat)}`); w.dataset.slot = 'who';
    const t = h('span', 'chime-text', ev.text || ''); t.dataset.slot = 'text';
    li.append(w, t); doc.dataset.state = 'chiming';
    $('.fd-chimes').appendChild(li);
    if (M) M.animate(li, { x: [24, 0], y: [-6, 0] }, SPRING);
    chimeTimer = setTimeout(() => { chimeTimer = null; pumpChimes(); }, CHIME_GAP_MS);
  }
  B.on('chime', ev => { if (!forCur(ev)) return; chimeQ.push(ev); pumpChimes(); });
  const onTakeaways = ev => { if (!forCur(ev)) return; briefPending = ev; pumpChimes(); };
  B.on('brief', onTakeaways); B.on('takeaways', onTakeaways); // the server logs 'takeaways' (po/takeaways); 'brief' kept for old replays
  function showBrief(ev) {
    const box = $('.fd-brief');
    for (const k of ['believe', 'guidance']) {
      const p = box.querySelector(`.brief-text[data-k="${k}"]`);
      p.textContent = ev[k] || '';
      p.closest('.brief-part').hidden = !ev[k];
      p.contentEditable = B.replay ? 'false' : 'true';
      p.spellcheck = false;
    }
    box.hidden = false; box.dataset.state = 'shown'; doc.dataset.state = 'takeaways';
    $('.fd-keep').hidden = !!B.replay;
    if (M) M.animate(box, { y: [16, 0] }, SPRING);
    if (B.replay) { clearTimeout(replayClose); replayClose = setTimeout(() => close(true), 3500); }
  }
  doc.querySelectorAll('.brief-text').forEach(p => p.addEventListener('focus', () => { if (!kept) $('.fd-brief').dataset.state = 'editing'; }));
  doc.querySelectorAll('.brief-text').forEach(p => p.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { p.blur(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); p.blur(); keepBrief(); }
  }));
  $('.fd-keep').addEventListener('click', () => keepBrief());
  async function keepBrief() {
    if (!cur || kept || B.replay) return;
    kept = true;
    const body = { askId: cur.id };
    doc.querySelectorAll('.brief-text').forEach(p => { if (!p.closest('.brief-part').hidden) body[p.dataset.k] = p.textContent.trim(); p.contentEditable = 'false'; });
    $('.fd-keep').hidden = true; $('.fd-brief').dataset.state = 'kept';
    try { await B.api(`/api/run/${encodeURIComponent(B.run)}/takeaways`, body, { step: false }); }
    catch (e) { kept = false; $('.fd-keep').hidden = false; doc.querySelectorAll('.brief-text').forEach(p => { p.contentEditable = 'true'; }); $('.fd-team').textContent = `Not kept (${e.status || e.message}).`; }
  }

  // ---- the team gets to work; the document updates ----------------------------------------------
  B.on('answer.mapped', ev => { if (!forCur(ev)) return; $('.fd-team').textContent = 'The team is on it.'; doc.dataset.state = 'working'; });
  const refreshJourney = () => { if (cur && $('.fd-work').dataset.kind === 'journey') setTimeout(renderWork, 60); };
  B.on('flow.line', refreshJourney);
  B.on('flow.reset', refreshJourney);

  // ---- a replay plays her recorded answers through the same document -------------------------------
  B.on('answer', ev => {
    if (!B.replay || !ev.text) return;
    const ask = (B.asks ? B.asks() : []).find(a => a.id === ev.askId);
    if (!ask) return;
    open(ask);
    landSaid(ev.text);
  });

  B.on('build.step', () => { if (B.replay && cur) close(true); });
  $('.fd-close').addEventListener('click', () => close());
  B.on('reset', () => close(true));
  B.focusDoc = { open, close, isOpen: () => !doc.hidden, openId: () => (cur && !doc.hidden ? cur.id : null), keepBrief, send };
})();
