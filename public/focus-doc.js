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
    </div>
    <div class="fd-side fd-column" data-slot="side" data-component="meeting" data-state="composing">
      <button type="button" class="fd-earlier" data-slot="earlier" aria-expanded="false" hidden></button>
      <ol class="fd-chimes fd-conversation" data-slot="conversation"></ol>
      <div class="fd-hearing" data-component="team-reading" data-state="idle">
        <div class="fd-team" data-slot="team"></div>
        <button type="button" class="fd-retry" data-slot="retry" hidden>Retry</button>
      </div>
      <div class="fd-brief" data-component="takeaways" data-state="hidden" hidden>
        <div class="brief-head" data-slot="head">Takeaways</div>
        <div class="brief-part brief-believe"><span class="brief-label" data-slot="label">What I believe about this</span><p class="brief-text" data-slot="believe" data-k="believe"></p></div>
        <div class="brief-part brief-guidance"><span class="brief-label" data-slot="label">Guidance to the team</span><p class="brief-text" data-slot="guidance" data-k="guidance"></p></div>
        <button type="button" class="fd-keep" data-slot="keep">Keep</button>
      </div>
      <div class="fd-said" data-component="her-answer" data-state="speaking"></div>
      <ol class="fd-pieces" data-component="pieces"></ol>
      <p class="fd-ack" data-slot="ack" data-state="hidden" role="status" aria-live="polite" hidden></p>
      <form class="fd-form" autocomplete="off">
        <textarea class="fd-input" data-slot="input" rows="3" spellcheck="false" data-voice placeholder="Say it or type it. Take your time; send when you’re ready."></textarea>
        <button type="button" class="fd-add" data-slot="add-piece">Add this</button>
        <button type="submit" class="fd-send" data-slot="send" data-state="idle">Send</button>
        <button type="button" class="fd-end" data-slot="end-meeting" data-component="end-meeting" hidden>End meeting</button>
      </form>
      <p class="fd-help" data-slot="help">Add this keeps a thought · Send when you’re ready, and the team replies</p>
      <div class="fd-leave" data-component="leave-meeting" data-state="hidden" hidden>
        <p class="fd-leave-q" data-slot="question">End the meeting now, or come back to it later?</p>
        <button type="button" class="fd-leave-end" data-slot="end-now">End the meeting</button>
        <button type="button" class="fd-leave-later" data-slot="later">Come back later</button>
      </div>
      <button type="button" class="fd-newer" data-slot="new-replies" hidden>New replies ↓</button>
    </div>`;
  room.appendChild(doc);
  const $ = sel => doc.querySelector(sel);
  $('.fd-column').addEventListener('scroll', () => { followBottom = nearBottom(); if (followBottom) $('.fd-newer').hidden = true; });

  let cur = null;          // the open ask
  // ---- the meeting (Vincent, 15 Nov): compose → Send = one round of discussion → … → End meeting = takeaways ----------
  // The right column is ONE scrollable conversation ([data-slot=side], data-state composing · discussing · ended): her
  // words and the team's replies by round, the takeaways at the bottom once she ends it. Composing: the past rounds
  // fold into "Earlier: N rounds · show" and nothing from the team shows. Discussing: "The team is reading…", then each
  // reply live, the column following the newest unless she scrolled up ("New replies ↓"). ?meeting=0: the old single Send.
  const MEETING = new URLSearchParams(location.search).get('meeting') !== '0';
  let rounds = 0, ended = false, earlierOpen = false, followBottom = true;
  if (MEETING) $('.fd-help').textContent += ' · End meeting for the takeaways';
  const column = () => $('.fd-column');
  function setMode(m) {
    const c = column(); c.dataset.state = m; doc.dataset.meeting = m;
    const list = $('.fd-conversation');
    const folded = m === 'composing' && !earlierOpen;
    list.hidden = folded || !list.children.length;
    const e = $('.fd-earlier'); e.hidden = !(m === 'composing' && rounds > 0);
    e.textContent = `Earlier: ${rounds} round${rounds === 1 ? '' : 's'} · ${earlierOpen ? 'hide' : 'show'}`; e.setAttribute('aria-expanded', String(earlierOpen));
    $('.fd-end').hidden = !MEETING || !rounds || ended || !!B.replay;
    if (m !== 'discussing') $('.fd-newer').hidden = true;
  }
  const nearBottom = () => { const c = column(); return c.scrollHeight - c.scrollTop - c.clientHeight < 40; };
  function follow() { // keep the newest reply in view unless she scrolled up herself
    const c = column();
    if (followBottom) { c.scrollTop = c.scrollHeight; $('.fd-newer').hidden = true; } else $('.fd-newer').hidden = false;
  }
  function addTurn(who, text, n, extra = {}) {
    const list = $('.fd-conversation');
    if (who === 'her' && n > 1 && !list.querySelector(`.fd-round-sep[data-round="${n}"]`)) {
      const sep = h('li', 'fd-round-sep', `Round ${n}`); sep.dataset.slot = 'round-separator'; sep.dataset.round = n; list.appendChild(sep);
    }
    const li = h('li', who === 'her' ? 'fd-turn fd-her' : 'fd-turn chime'); li.dataset.slot = 'turn'; li.dataset.turn = who; li.dataset.round = n || 1;
    if (who === 'her') { li.dataset.state = 'her-turn'; const t = h('span', 'fd-her-words', text); t.dataset.slot = 'words'; li.appendChild(t); }
    Object.assign(li.dataset, extra);
    list.appendChild(li); return li;
  }
  function teamTurn(ev, n) {
    const li = addTurn('team', '', n, { seat: ev.seat || '', component: 'chime', state: 'team-turn' });
    const w = h('span', 'chime-who', `${ev.by || AGENT(ev.seat) || SEAT_NAME(ev.seat)} · ${SEAT_NAME(ev.seat)}`); w.dataset.slot = 'who';
    const t = h('span', 'chime-text', ev.text || ''); t.dataset.slot = 'text';
    li.append(w, document.createTextNode(': '), t);
    return li;
  }
  // Rebuild the conversation from the log (reopening a meeting she left, or a replay).
  function rebuild(ask) {
    $('.fd-conversation').innerHTML = ''; rounds = 0; ended = false; earlierOpen = false; followBottom = true;
    let n = 0;
    for (const e of (B.events ? B.events() : [])) {
      if (e.askId !== ask.id) continue;
      if (e.type === 'answer.round') { n = e.round || n + 1; rounds = Math.max(rounds, n); addTurn('her', e.text, n); }
      else if (e.type === 'answer') { if (!rounds) { n = 1; rounds = 1; addTurn('her', e.text, 1); } ended = true; }
      else if (e.type === 'chime') teamTurn(e, n || 1);
    }
  }
  let chimeQ = [], chimeTimer = null, briefPending = null, kept = false, sent = false, replayClose = null;
  // ---- never a dead page: after Send she always sees that the team heard her, or what went wrong, with Retry ----
  // At once: "<names> reading what you said…" (names from thread.start, logged before any model call). Nothing from
  // the team within WAIT_MS: "Still reading…" + Retry. /answer failing, or chime/interpret/propose/teammate.error in
  // the log while she waits: a plain line + Retry. Retry resends the same gathered comment (the server re-reads the
  // answer it logged, never a second one). Her words stay on the page throughout.
  const WAIT_MS = Number(new URLSearchParams(location.search).get('answerWait')) || 25000;
  let hearing = null; // { ask, body, timer, heard, readers }
  const names = list => list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
  function status(text, state, retry = false) {
    $('.fd-team').textContent = text; $('.fd-hearing').dataset.state = state || 'idle';
    $('.fd-retry').hidden = !retry;
  }
  function reading() {
    if (!hearing || hearing.heard) return;
    const r = hearing.readers;
    status(r && r.length ? `${names(r)} ${r.length > 1 ? 'are' : 'is'} reading what you said…` : 'The team is reading what you said…', 'reading');
    clearTimeout(hearing.timer);
    hearing.timer = setTimeout(() => { if (hearing && !hearing.heard && cur === hearing.ask) status('Still reading… It’s taking longer than usual. Your words are kept.', 'slow', true); }, WAIT_MS);
  }
  function failed(why) {
    if (!hearing || hearing.heard || cur !== hearing.ask) return;
    clearTimeout(hearing.timer);
    status('The team couldn’t read that just now. Your words are kept.', 'failed', true);
    $('.fd-hearing').dataset.why = why || 'logged'; // the status code or the log's error type, for the e2e and the presenter's eye
  }
  function heard() {
    if (!hearing || hearing.heard) return;
    hearing.heard = true; clearTimeout(hearing.timer);
    if (['reading', 'slow', 'failed'].includes($('.fd-hearing').dataset.state)) status('', 'heard');
  }
  function clearWait() { if (hearing) clearTimeout(hearing.timer); hearing = null; $('.fd-retry').hidden = true; $('.fd-hearing').dataset.state = 'idle'; delete $('.fd-hearing').dataset.why; }
  async function postAnswer(w, body) {
    try {
      const r = await B.api(`/api/run/${encodeURIComponent(B.run)}/${w.path || 'answer'}`, body, { step: false });
      if (hearing !== w) return;
      if (r && r.pending) return reading(); // a resend while the first is still being heard: keep waiting
    } catch (e) {
      if (hearing !== w || e.status === 409) return; // 409: the team already heard her
      failed(e.status ? String(e.status) : 'no connection');
    }
  }
  $('.fd-retry').addEventListener('click', () => { if (!hearing || hearing.heard || cur !== hearing.ask) return; reading(); postAnswer(hearing, { ...hearing.body, retry: true }); });

  // ---- the work, large ------------------------------------------------------------------------
  function renderWork() {
    const w = $('.fd-work'); w.innerHTML = '';
    if (!cur) return;
    const kind = (cur.artifact && cur.artifact.kind) || 'journey';
    w.dataset.kind = kind; doc.dataset.doc = kind; // finding · journey-words · journey · wires · page
    if (kind === 'journey-words') return renderSteps(w);
    if (kind === 'finding' && cur.artifact.ref && cur.artifact.ref.quote) return renderResearch(w, cur.artifact.ref);
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
  // Noor's finding for Focus 1 (lib/first.js): researched before the demo, quoted exactly, with its source and date.
  function renderResearch(w, f) { w.appendChild(B.fdCards.research(document, f)); } // public/fd-cards.js
  // Mika's rough morning journey in words for Focus 2 (lib/first.js): 4-6 steps; after her answer the ones her words
  // change are struck (draft -> struck) and rewritten (.jw-new, her pink).
  function renderSteps(w) {
    const box = h('div', 'jw'); box.dataset.component = 'journey-words'; box.dataset.slot = 'journey-words';
    const ol = h('ol', 'jw-steps'); ol.dataset.slot = 'steps';
    const rewritten = (B.events ? B.events() : []).findLast(e => e.type === 'journey.words.rewritten' && e.id === cur.id);
    for (const st of (rewritten ? rewritten.steps : cur.steps) || []) ol.appendChild(B.fdCards.step(document, st)); // public/fd-cards.js
    box.appendChild(ol); w.appendChild(box);
  }
  // Mika's rewrite lands on the open document: each changed step is struck, then its new line appears.
  if (typeof B.on === 'function') B.on('journey.words.rewritten', ev => {
    if (!cur || cur.id !== ev.id) return;
    for (const st of ev.steps || []) {
      if (!st.new) continue;
      const li = doc.querySelector(`.jw-step[data-step="${st.step}"]`); if (!li) continue;
      B.fdCards.strike(document, li, st);
      setTimeout(() => B.fdCards.rewrite(document, li, st), B.replay ? 0 : 500);
    }
  });
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
    clearWait();
    cur = ask; kept = false; sent = false; briefPending = null; chimeQ = []; clearTimeout(chimeTimer); chimeTimer = null; clearTimeout(replayClose);
    // Who asked shows only when it's a named teammate (Noor · Research); otherwise no "by" at all.
    const seat = ask.seat, named = AGENT(seat), name = named && (!ask.by || ask.by === named) ? named : null;
    $('.fd-kicker').textContent = name ? `${name} · ${SEAT_NAME(seat)}` : '';
    listener = name || 'The team'; ack(false);
    const proposers = (ask.artifact && Array.isArray(ask.artifact.by) && ask.artifact.by.length) ? ask.artifact.by : null;
    $('.fd-by').textContent = proposers ? `proposed by ${proposers.join(' and ')}` : '';
    $('.fd-question').textContent = ask.question || ask.decision || '';
    $('.fd-said').innerHTML = ''; $('.fd-said').classList.remove('speaking');
    $('.fd-team').textContent = '';
    doc.querySelectorAll('.pin-reply').forEach(r => { clearTimeout(r._t1); clearTimeout(r._t2); });
    $('.fd-brief').hidden = true; doc.querySelectorAll('.brief-text').forEach(p => { p.textContent = ''; p.contentEditable = 'false'; });
    $('.fd-input').value = ''; clearPieces();
    $('.fd-leave').hidden = true; $('.fd-leave').dataset.state = 'hidden';
    rebuild(ask); $('.fd-form').hidden = !!B.replay || ended;
    if (!ended && !B.replay) restorePieces(ask);
    setMode(ended ? 'ended' : 'composing');
    doc.dataset.seat = seat || ''; doc.dataset.state = 'asking';
    $('.fd-brief').dataset.state = 'hidden'; $('.fd-said').dataset.state = 'speaking';
    doc.hidden = false;
    document.body.classList.add('focus-open');
    renderWork();
    if (M) M.animate(doc, { y: [18, 0], scale: [0.985, 1] }, SPRING);
    if (!B.replay) setTimeout(() => { if (cur === ask && !doc.hidden) $('.fd-input').focus(); }, 40); // only if she's still in this document
    B.syncFocus && B.syncFocus();
    B.emit && B.emit('focus.open', { askId: ask.id });
  }
  // close(quiet): back to the room. A brief she hasn't kept is kept as it stands (her file gets her belief).
  function close(quiet) {
    if (!cur) { doc.hidden = true; document.body.classList.remove('focus-open'); return; }
    // Leaving mid-meeting: ask her plainly (End meeting now, or come back later). The presenter's keys close quietly.
    if (!quiet && MEETING && rounds && !ended && !B.replay && $('.fd-leave').hidden) {
      $('.fd-leave').hidden = false; $('.fd-leave').dataset.state = 'asking';
      requestAnimationFrame(() => { const c = column(); c.scrollTop = c.scrollHeight; });
      $('.fd-leave-end').focus();
      return;
    }
    const was = cur;
    if (!quiet && !kept && briefShown() && !B.replay) keepBrief();
    cur = null; clearTimeout(chimeTimer); chimeTimer = null; clearTimeout(replayClose); chimeQ = []; briefPending = null; clearWait();
    // Let go of focus now: a hidden input that kept it would swallow the clicker's next forward key (its own PageDown is "send").
    if (doc.contains(document.activeElement)) document.activeElement.blur();
    doc.hidden = true;
    document.body.classList.remove('focus-open');
    B.syncFocus && B.syncFocus();
    B.emit && B.emit('focus.close', { askId: was.id });
    B.emit && B.emit('focus', { open: null });
  }
  const briefShown = () => !$('.fd-brief').hidden;

  // ---- her piece: words land on the document ----------------------------------------------------
  function landSaid(text, meeting = false) {
    const said = $('.fd-said');
    if (meeting) { said.innerHTML = ''; said.dataset.state = 'landed'; doc.dataset.state = 'answered'; return; }
    said.innerHTML = '';
    const q = h('blockquote', 'fd-words', text); q.dataset.slot = 'words';
    said.appendChild(q); said.dataset.state = 'landed'; doc.dataset.state = 'answered';
    if (M) M.animate(q, { y: [10, 0] }, SPRING);
  }

  // ---- capture: her answer in pieces (lib/tidy.js) ------------------------------------------------
  // Each spoken take (or a typed one she adds) is a piece. It shows raw at once; its tidy swaps in when it lands
  // (answer.piece.tidy). Per piece: "See what you said", "Use mine", redo, remove. While she captures, the team is
  // out of view and makes no calls; Send gathers the pieces (tidy where ready, raw where not) and never waits.
  // Hooks only (data-component / data-slot / data-state); the look is design's.
  let pieces = [], pieceN = 0;
  const pieceApi = body => B.api(`/api/run/${encodeURIComponent(B.run)}/piece`, body, { step: false });
  const shownText = p => (p.use === 'mine' || !p.tidy) ? p.raw : p.tidy;
  function capturing(on) {
    doc.dataset.capture = on ? 'on' : 'off';
    if (on && MEETING && !ended) setMode('composing'); // she's composing: the past rounds fold away, nothing from the team
  }
  function clearPieces() {
    pieces = []; const ol = $('.fd-pieces'); if (ol) ol.innerHTML = '';
    capturing(false);
  }
  function pieceState(p) {
    const s = !p.tidy ? 'raw' : p.use === 'mine' ? 'mine' : p.showRaw ? 'raw-shown' : 'tidy';
    p.li.dataset.state = s;
    if (!p.animating) wordsInto(p, s === 'tidy' ? 'tidy' : 'raw');
    p.see.hidden = !p.tidy || p.use === 'mine';
    p.see.textContent = p.showRaw ? 'See the tidy' : 'See what you said';
    p.mine.hidden = !p.tidy;
    p.mine.textContent = p.use === 'mine' ? 'Use the tidy' : 'Use mine';
  }
  // Her words as word spans, from the raw → tidy diff (public/word-diff.js). Slots: kept-word, removed-word (the
  // tidy took it out), changed-word (same word, new case or punctuation, or a new word in a dropped one's place),
  // added-word. view 'raw' shows what she said; 'tidy' the clean words.
  const SLOT = { keep: 'kept-word', drop: 'removed-word', becomes: 'changed-word', added: 'added-word' };
  function wordsInto(p, view) {
    p.words.dataset.view = view;
    if (!p.diff) { p.words.textContent = p.raw; return []; }
    p.words.innerHTML = '';
    const spans = [];
    for (const t of p.diff.tokens) {
      const text = view === 'raw' ? t.word : t.as;
      const sp = h('span', 'fd-w', text); sp.dataset.slot = SLOT[t.kind]; sp._t = t;
      if (!text) sp.hidden = true; // an added word in the raw view, a removed one in the tidy view
      p.words.append(sp, ' '); spans.push(sp);
    }
    return spans;
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // The swap: removed words leave (data-state leaving, then gone), changed words take their new spelling, added
  // words arrive, and the kept ones slide together. Identical raw and tidy: no animation, just the tidy state.
  async function landPieceTidy(p, tidy) {
    p.tidy = tidy;
    p.diff = B.wordDiff ? B.wordDiff(p.raw, tidy) : null;
    if (!p.diff || p.diff.same || p.showRaw || p.use === 'mine') { p.li.dataset.anim = 'none'; return pieceState(p); }
    p.animating = true; p.li.dataset.state = 'tidying'; p.li.dataset.anim = 'swapping';
    const spans = wordsInto(p, 'raw');
    for (const sp of spans) if (sp._t.kind === 'drop') sp.dataset.state = 'leaving';
    await wait(280);
    if (!p.li.isConnected || p.showRaw || p.use === 'mine') { p.animating = false; return pieceState(p); }
    const before = new Map(spans.map(sp => [sp, sp.getBoundingClientRect()]));
    for (const sp of spans) {
      const k = sp._t.kind;
      if (k === 'drop') { sp.dataset.state = 'gone'; sp.hidden = true; }
      if (k === 'becomes') { sp.textContent = sp._t.as; sp.dataset.state = 'changed'; }
      if (k === 'added') { sp.textContent = sp._t.as; sp.hidden = false; sp.dataset.state = 'arriving'; }
    }
    if (M) for (const sp of spans) {
      if (sp.hidden || sp._t.kind === 'added') continue;
      const b = before.get(sp), n = sp.getBoundingClientRect();
      if (b.width || b.height) M.animate(sp, { x: [b.left - n.left, 0], y: [b.top - n.top, 0] }, SPRING);
    }
    await wait(500);
    p.animating = false; p.li.dataset.anim = 'done';
    pieceState(p);
  }
  function dropPiece(p) {
    pieces = pieces.filter(x => x !== p); p.li.remove();
    if (cur) pieceApi({ askId: cur.id, pieceId: p.id, remove: true }).catch(() => {});
    if (!pieces.length) { capturing(false); ack(false); }
  }
  // addPiece(text, { id, post, tidy, use }): a restored piece (her run picked up after a refresh, or the document
  // reopened) keeps its own id, its tidy and her choice, and is not posted again.
  function addPiece(text, o = {}) {
    text = String(text || '').trim();
    if (!text || !cur || sent || B.replay) return;
    const p = { id: o.id || `p${++pieceN}-${Date.now().toString(36)}`, raw: text, tidy: o.tidy || '', use: o.use || 'tidy', showRaw: false, askId: cur.id };
    p.li = h('li', 'fd-piece'); p.li.dataset.component = 'piece'; p.li.dataset.piece = p.id;
    p.words = h('span', 'fd-piece-words', text); p.words.dataset.slot = 'words';
    const btn = (slot, label) => { const b = h('button', `fd-piece-${slot}`, label); b.type = 'button'; b.dataset.slot = slot; return b; };
    p.see = btn('see-said', 'See what you said'); p.mine = btn('use-mine', 'Use mine');
    const redo = btn('redo', 'Redo'), rm = btn('remove', 'Remove');
    p.see.addEventListener('click', () => { p.showRaw = !p.showRaw; pieceState(p); });
    p.mine.addEventListener('click', () => {
      p.use = p.use === 'mine' ? 'tidy' : 'mine'; p.showRaw = false; pieceState(p);
      if (cur) pieceApi({ askId: cur.id, pieceId: p.id, use: p.use }).catch(() => {});
    });
    // Redo: the piece goes (its pending tidy is ignored server-side) and its words come back to the field to fix or re-say.
    redo.addEventListener('click', () => { dropPiece(p); const f = $('.fd-input'); f.value = p.raw; f.focus(); f.dispatchEvent(new Event('input', { bubbles: true })); });
    rm.addEventListener('click', () => dropPiece(p));
    p.li.append(p.words, p.see, p.mine, redo, rm);
    $('.fd-pieces').appendChild(p.li); pieces.push(p); pieceState(p);
    capturing(true);
    if (o.post === false) return p;
    if (M) M.animate(p.li, { y: [8, 0] }, SPRING);
    pieceApi({ askId: cur.id, pieceId: p.id, text }).catch(() => {}); // a failed post still sends raw at Send
    ack(true);
    return p;
  }
  // Her pieces not yet sent come back from the run's log (answer.piece and its tidy, choice and removal since her last
  // Send), so a refresh or a reopened document never loses a thought she added.
  function restorePieces(ask) {
    const evs = (B.events ? B.events() : []).filter(e => e.askId === ask.id);
    let from = 0;
    evs.forEach((e, i) => { if (e.type === 'answer.round' || e.type === 'answer' || e.type === 'meeting.end') from = i + 1; });
    const kept = new Map();
    for (const e of evs.slice(from)) {
      if (e.type === 'answer.piece' && e.pieceId) kept.set(e.pieceId, { text: e.text, tidy: '', use: 'tidy' });
      else if (e.type === 'answer.piece.removed') kept.delete(e.pieceId);
      else if (e.type === 'answer.piece.tidy' && kept.has(e.pieceId)) kept.get(e.pieceId).tidy = e.text;
      else if (e.type === 'answer.piece.choice' && kept.has(e.pieceId)) kept.get(e.pieceId).use = e.use;
    }
    for (const [id, k] of kept) addPiece(k.text, { id, tidy: k.tidy, use: k.use, post: false });
    if (kept.size) ack(true);
  }
  // After "Add this" (or a spoken piece): a quiet line under her pieces says who's listening and that replies come on
  // Send, and Send pulses once (data-state="nudge", then "idle"). Vincent: added a thought, nothing reacted.
  let listener = 'The team', nudgeT = null;
  function ack(on) {
    const a = $('.fd-ack'), send = $('.fd-send');
    a.hidden = !on; a.dataset.state = on ? 'shown' : 'hidden';
    a.textContent = on ? `${listener} is listening · Send when you’re done and the team will reply` : '';
    clearTimeout(nudgeT);
    if (!on) { send.dataset.state = 'idle'; return; }
    send.dataset.state = 'nudge';
    if (M) M.animate(send, { scale: [1, 1.08, 1] }, { duration: 0.6 });
    nudgeT = setTimeout(() => { send.dataset.state = 'idle'; }, 1200);
  }
  $('.fd-form').addEventListener('submit', () => ack(false));
  B.on('answer.piece.tidy', ev => {
    const p = pieces.find(x => x.id === ev.pieceId && x.askId === ev.askId);
    if (!p || sent || ev.raw !== p.raw || !ev.text) return;
    landPieceTidy(p, ev.text);
  });
  $('.fd-add').addEventListener('click', () => {
    const f = $('.fd-input'); addPiece(f.value); f.value = ''; f.focus();
    f.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // A spoken take becomes a piece as soon as its words arrive (public/voice.js fires byoc:voice on the field).
  $('.fd-input').addEventListener('byoc:voice', e => {
    const f = e.target; addPiece(e.detail && e.detail.text); f.value = '';
    f.dispatchEvent(new Event('input', { bubbles: true }));
  });

  $('.fd-input').addEventListener('input', e => {
    // As she speaks or types, the words show on the document.
    const t = e.target.value.trim();
    $('.fd-said').classList.toggle('speaking', !!t);
    if (!sent) doc.dataset.state = t || pieces.length ? 'speaking' : 'asking';
    if (t && MEETING && !ended && column().dataset.state === 'discussing') setMode('composing'); // her next round: the conversation folds away
  });
  $('.fd-input').addEventListener('keydown', e => {
    if (doc.hidden) { e.target.blur(); return; } // closed: the key belongs to the room
    e.stopPropagation();
    if (e.key === 'Escape') { e.target.blur(); return; }
    // Her pace: nothing sends on silence; she sends when she's ready (Enter, Send, or the clicker's forward key).
    if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'PageDown') { e.preventDefault(); send(); }
  });
  $('.fd-form').addEventListener('submit', e => { e.preventDefault(); send(); });
  // Her "You" turn is tidied in place on its words (.fd-her-words: data-raw / data-state tidying → tidied / data-tidy).
  // Pieces already tidied keep their tidy and cost nothing; words still in the field, or a piece whose tidy hasn't
  // landed, are tidied here (2.5 s cap, her raw words on a miss). It's what she sees: her answer goes to the team at
  // once, as sent (the readers' names within 300 ms, e2e/focus-wait), so leaving mid-tidy never loses it.
  async function tidyTurn(li, mine, text) {
    const span = li && li.querySelector('.fd-her-words');
    const raw = [...mine.map(p => p.raw), text].filter(Boolean).join(' ');
    const shown = [...mine.map(shownText), text].filter(Boolean).join(' ');
    if (!span || typeof B.tidyInto !== 'function') return { words: shown, text };
    if (!text && mine.every(p => p.tidy || p.use === 'mine')) { // nothing left to tidy: the hooks, no call
      span.dataset.raw = raw; span.textContent = shown; span.dataset.tidy = B.tidyKind ? B.tidyKind(raw, shown) : 'cut'; span.dataset.state = 'tidied';
      return { words: shown, text };
    }
    const words = String(await B.tidyInto(span, shown) || shown).trim() || shown;
    if (span.dataset.raw !== raw) span.dataset.raw = raw; // her words as she said them, pieces included
    return { words, text };
  }
  async function send() {
    let text = $('.fd-input').value.trim();
    if ((!text && !pieces.length) || !cur || sent || ended) return;
    sent = true;
    const ask = cur, mine = pieces.filter(p => p.askId === ask.id);
    let words = [...mine.map(shownText), text].filter(Boolean).join(' ');
    $('.fd-input').value = ''; $('.fd-input').blur();
    $('.fd-said').classList.remove('speaking');
    pieces = []; $('.fd-pieces').innerHTML = ''; capturing(false);
    // No pieces: exactly { askId, text }, as always. With pieces: their ids, plus any words still in the field.
    const bodyFor = t => (mine.length ? { askId: ask.id, pieces: mine.map(p => p.id), text: t } : { askId: ask.id, text: t });
    if (MEETING) { // one round of discussion: the team replies live; no takeaways until she ends the meeting
      rounds += 1; const li = addTurn('her', words, rounds); landSaid(words, true);
      followBottom = true; setMode('discussing'); follow();
      const body = bodyFor(text);
      hearing = { ask, body, timer: null, heard: false, readers: null, path: 'round' };
      reading();
      tidyTurn(li, mine, text); // on her turn, alongside: the post never waits for it
      await postAnswer(hearing, body);
      if (cur === ask) sent = false; // she can say more and Send again
      return;
    }
    landSaid(words); const li = addTurn('her', words, 1); $('.fd-form').hidden = true;
    rounds = 1; setMode('discussing');
    // Every ask, Focus 1 and Focus 2 included, is a meeting through /answer; the stage path follows it on the server (lib/first.js).
    const body = bodyFor(text);
    hearing = { ask, body, timer: null, heard: false, readers: null };
    reading(); // at once, before the request leaves
    tidyTurn(li, mine, text).then(r => { const q = $('.fd-said .fd-words'); if (q && cur === ask) q.textContent = r.words; });
    await postAnswer(hearing, body);
  }
  // End meeting: the takeaways over all her rounds, appended at the bottom of the conversation.
  async function endMeeting() {
    if (!cur || ended || !rounds || B.replay) return;
    const ask = cur;
    $('.fd-leave').hidden = true; $('.fd-leave').dataset.state = 'hidden';
    ended = true; $('.fd-end').hidden = true; $('.fd-form').hidden = true; clearPieces();
    earlierOpen = true; setMode('discussing');
    hearing = { ask, body: { askId: ask.id }, timer: null, heard: false, readers: null, path: 'end' };
    status('The team is writing the takeaways…', 'reading');
    clearTimeout(hearing.timer);
    hearing.timer = setTimeout(() => { if (hearing && !hearing.heard && cur === hearing.ask) status('Still writing… It’s taking longer than usual. Your words are kept.', 'slow', true); }, WAIT_MS);
    B.emit && B.emit('meeting.end', { askId: ask.id, rounds });
    await postAnswer(hearing, { askId: ask.id });
  }
  $('.fd-end').addEventListener('click', () => endMeeting());
  $('.fd-earlier').addEventListener('click', () => { earlierOpen = !earlierOpen; setMode(column().dataset.state); });
  $('.fd-newer').addEventListener('click', () => { followBottom = true; follow(); });
  $('.fd-leave-end').addEventListener('click', () => endMeeting());
  $('.fd-leave-later').addEventListener('click', () => close(true));
  // The round is over: quiet again, ready for her next words (the replies stay on show until she starts composing).
  B.on('round.done', ev => { if (!forCur(ev)) return; heard(); status(ev.replies ? '' : 'No replies this round.', 'idle'); });
  B.on('thread.start', ev => { if (!forCur(ev) || !hearing || hearing.heard) return; hearing.readers = ev.by || []; if ($('.fd-hearing').dataset.state === 'reading') reading(); });
  for (const type of ['chime', 'takeaways', 'brief', 'answer.mapped']) B.on(type, ev => { if (forCur(ev)) heard(); });
  for (const type of ['chime.error', 'interpret.error', 'propose.error', 'teammate.error']) B.on(type, ev => { if (forCur(ev)) failed(type); });

  // ---- after Send she stays on her page: replies show by their pins, then fold into them ------------------
  // Each reply is anchored to a pin on the work: the journey box it names, else the box the question is about,
  // else the work itself. It shows (readable 4–8 s, by its length), fades, then folds into the pin; clicking the pin
  // shows its replies again. The full thread stays in ol.fd-chimes, opened only by "Read the conversation".
  // Hooks only (data-component / data-slot / data-state); the look is design's.
  const READ_MIN_MS = 4000, READ_MAX_MS = 8000, FADE_MS = 600;
  const readMs = text => Math.max(READ_MIN_MS, Math.min(READ_MAX_MS, 2500 + String(text || '').split(/\s+/).filter(Boolean).length * 180));
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  function anchorFor(text) {
    const w = $('.fd-work'), t = ` ${norm(text)} `;
    const named = [...w.querySelectorAll('[data-node]')].find(b => { const l = norm(b.textContent); return l.length > 2 && t.includes(` ${l} `); });
    const el = named || w.querySelector('.fd-target') || w;
    const ref = named ? named.dataset.node : (el.dataset.node || (cur && cur.artifact && typeof cur.artifact.ref === 'string' && cur.artifact.ref) || w.dataset.kind || 'work');
    return { el, id: `pin-${String(ref).replace(/[^\w-]/g, '').slice(0, 40) || 'work'}` };
  }
  function pinFor(text) {
    const { el, id } = anchorFor(text);
    let pin = $(`.fd-pin[data-pin="${id}"]`);
    if (!pin) {
      pin = h('span', 'fd-pin'); pin.dataset.component = 'pin'; pin.dataset.pin = id; pin.dataset.state = 'replying';
      pin.setAttribute('role', 'button'); pin.tabIndex = 0; pin.setAttribute('aria-label', 'Show the replies here');
      const mark = h('span', 'fd-pin-mark'); mark.dataset.slot = 'mark';
      const count = h('span', 'fd-pin-count'); count.dataset.slot = 'count';
      const list = h('div', 'fd-pin-replies'); list.dataset.slot = 'replies';
      pin.append(mark, count, document.createTextNode(' '), list);
      const reopen = e => { if (e.target.closest('.pin-reply')) return; e.preventDefault(); pin.querySelectorAll('.pin-reply').forEach(showReply); };
      pin.addEventListener('click', reopen);
      pin.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') reopen(e); });
      el.append(document.createTextNode(' '), pin); // never glued to the box's label ("Browse breads 1")
    }
    return pin;
  }
  function pinState(pin) {
    const rs = [...pin.querySelectorAll('.pin-reply')];
    pin.dataset.state = rs.some(r => r.dataset.state !== 'folded') ? 'replying' : 'folded';
    pin.querySelector('.fd-pin-count').textContent = String(rs.length);
  }
  function showReply(r) {
    clearTimeout(r._t1); clearTimeout(r._t2);
    r.dataset.state = 'shown'; r.hidden = false; pinState(r._pin);
    r._t1 = setTimeout(() => {
      r.dataset.state = 'fading';
      r._t2 = setTimeout(() => { r.dataset.state = 'folded'; r.hidden = true; pinState(r._pin); }, FADE_MS);
    }, readMs(r._text));
  }
  function pinReply(ev) {
    const pin = pinFor(ev.text);
    const r = h('div', 'pin-reply'); r.dataset.component = 'pin-reply'; r.dataset.seat = ev.seat || ''; r.dataset.pin = pin.dataset.pin;
    const w = h('span', 'pin-reply-who', ev.by || AGENT(ev.seat) || SEAT_NAME(ev.seat)); w.dataset.slot = 'who';
    const t = h('span', 'pin-reply-text', ev.text || ''); t.dataset.slot = 'text';
    r.append(w, document.createTextNode(': '), t); r._pin = pin; r._text = ev.text; // "Noor: Warm bread…"
    pin.querySelector('.fd-pin-replies').appendChild(r);
    showReply(r);
    if (M) M.animate(r, { y: [6, 0] }, SPRING);
  }

  // ---- the team chimes in, one after another; then her brief -------------------------------------
  const forCur = ev => cur && (!ev.askId || ev.askId === cur.id);
  function pumpChimes() {
    if (chimeTimer || !chimeQ.length) { if (!chimeQ.length && !chimeTimer && briefPending) { const b = briefPending; briefPending = null; showBrief(b); } return; }
    const ev = chimeQ.shift();
    const li = teamTurn(ev, rounds || 1);
    if (doc.dataset.state !== 'takeaways') doc.dataset.state = 'chiming'; // never back from her takeaways
    setMode(column().dataset.state); follow();
    pinReply(ev);
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
    ended = true; $('.fd-form').hidden = true; earlierOpen = true; setMode('ended');
    requestAnimationFrame(() => { const c = column(); c.scrollTop = box.offsetTop - 12; }); // she lands on them; everything said is above
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
  // The team is on it. Takeaways already showing stay the document's state (with fewer replies they can land first).
  B.on('answer.mapped', ev => { if (!forCur(ev)) return; $('.fd-team').textContent = 'The team is on it.'; if (doc.dataset.state !== 'takeaways') doc.dataset.state = 'working'; });
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
  B.focusDoc = { open, close, isOpen: () => !doc.hidden, openId: () => (cur && !doc.hidden ? cur.id : null), keepBrief, send, endMeeting, meeting: MEETING, mode: () => column().dataset.state };
})();
