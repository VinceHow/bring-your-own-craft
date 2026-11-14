// Voice: push-to-talk for her "I love…" line (her card) and her agenda answer (her sheet's first line).
// Hold the mic mark, or hold ` (anywhere) or V (when no field is focused), to record; release to send.
// The words land as editable text through BYOC.typeInto. Typing always works: if voice is unavailable
// (no key, no mic, a failed call) the mic hides and a quiet "typed" mark shows instead.
(function () {
  const BYOC = window.BYOC = window.BYOC || {};
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'voice.css';
  document.head.appendChild(css); // before polish.css, which loads last

  const MIN_MS = 300, MAX_MS = 20000;
  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  let available = canRecord ? null : false; // null: still asking the server
  let stream = null, rec = null, chunks = [], t0 = 0, maxTimer = 0, target = null, state = 'idle'; // idle|listening|writing

  const MIC = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="5" y="1.5" width="6" height="8.5" rx="3" fill="currentColor"/>' +
    '<path d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2.5M5 15h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';

  // ---- which field ----------------------------------------------------------------------------
  const intro = () => document.getElementById('intro-input');
  const herInput = () => document.getElementById('her-input');
  const ideaOpen = () => {
    const f = document.getElementById('her-form'), idea = document.getElementById('her-idea');
    return !!(f && !f.hidden && idea && !idea.textContent.trim());
  };
  // Any other spoken field opts in with data-voice="<name>" (e.g. her reaction to Design's first sketch):
  // the mic mark appears right after it, and the words land in it as editable text.
  const shown = el => !!(el && el.isConnected && el.offsetParent !== null && !el.disabled && !el.readOnly);
  const extras = () => [...document.querySelectorAll('[data-voice]')].filter(shown);
  function fieldFor(el) {
    if (el && el.id === 'intro-input') return 'intro';
    if (el && el.id === 'her-input') return 'idea';
    if (el && el.dataset && el.dataset.voice) return String(el.dataset.voice).toLowerCase().replace(/[^a-z]/g, '').slice(0, 20) || null;
    return null;
  }
  function currentTarget() {
    const a = document.activeElement;
    if (fieldFor(a) === 'intro' || (fieldFor(a) === 'idea' && ideaOpen())) return a;
    if (a && a.dataset && a.dataset.voice && shown(a)) return a;
    if (intro()) return intro();
    const x = extras(); if (x.length) return x[x.length - 1]; // the newest open spoken field
    if (ideaOpen()) return herInput();
    return null;
  }

  // ---- the mic marks --------------------------------------------------------------------------
  function mark(field, el) {
    const b = document.createElement('span');
    b._field = el; b.className = 'voice-mic'; b.dataset.field = field;
    b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'Hold to speak');
    b.title = 'Hold to speak (or hold `)';
    b.innerHTML = MIC + '<span class="voice-word">hold to speak</span>';
    b.addEventListener('pointerdown', e => {
      if (!available || state !== 'idle') return;
      e.preventDefault(); // keep the caret where it is
      try { b.setPointerCapture(e.pointerId); } catch {}
      start(b._field && b._field.isConnected ? b._field : field === 'intro' ? intro() : herInput());
    });
    const up = () => { if (state === 'listening') stop(); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    return b;
  }
  function sync() {
    const i = intro();
    if (i && !i.parentNode.querySelector('.voice-mic')) { i.after(mark('intro', i)); recheck(); }
    for (const x of document.querySelectorAll('[data-voice]')) {
      if (!(x.nextElementSibling && x.nextElementSibling._field === x)) { x.after(mark(fieldFor(x) || 'other', x)); recheck(); }
    }
    const f = document.getElementById('her-form');
    if (f && !f.querySelector('.voice-mic')) {
      const m = mark('idea', herInput()); const hint = document.getElementById('her-hint');
      hint ? f.insertBefore(m, hint) : f.appendChild(m);
    }
    if (f) f.classList.toggle('voice-idea', ideaOpen());
    document.body.classList.toggle('voice-typed', available === false);
    document.body.classList.toggle('voice-on', available === true);
    for (const m of document.querySelectorAll('.voice-mic')) {
      const w = m.querySelector('.voice-word');
      const mine = target && (m._field ? m._field === target : fieldFor(target) === m.dataset.field);
      const s = available === false ? 'typed' : mine && state !== 'idle' ? state : 'idle';
      const word = s === 'typed' ? 'typed' : s === 'listening' ? 'listening' : s === 'writing' ? 'writing it down' : 'hold to speak';
      // Write only on a change: these writes are inside the observed room, and must not wake the observer forever.
      if (m.dataset.state !== s) m.dataset.state = s;
      if (w.textContent !== word) w.textContent = word;
      if (m.getAttribute('aria-disabled') !== String(available !== true)) m.setAttribute('aria-disabled', String(available !== true));
    }
  }
  const room = document.getElementById('room') || document.body;
  const ours = n => n && (n.nodeType === 1 ? n : n.parentElement)?.closest?.('.voice-mic');
  new MutationObserver(list => { if (list.some(r => !ours(r.target))) sync(); }).observe(room, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
  const ideaEl = document.getElementById('her-idea');
  if (ideaEl) new MutationObserver(() => sync()).observe(ideaEl, { childList: true, characterData: true, subtree: true });

  // Her card just opened: if voice was off (say, the key arrived after the page loaded), ask again.
  function recheck() {
    if (!canRecord || available !== false) return;
    fetch('/api/voice/status').then(r => r.json()).then(j => { if (j.available) { available = true; sync(); } }).catch(() => {});
  }
  function unavailable() { available = false; sync(); }

  // ---- record and send --------------------------------------------------------------------------
  async function start(field) {
    if (!available || state !== 'idle' || !field) return;
    target = field; state = 'listening'; t0 = Date.now(); chunks = []; sync();
    try {
      if (!stream || !stream.active) stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch { state = 'idle'; target = null; return unavailable(); } // no mic, or permission refused: she types
    if (state !== 'listening') return; // released before the mic opened
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported?.(t)) || '';
    try { rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined); }
    catch { state = 'idle'; target = null; return unavailable(); }
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = send;
    rec.start(250);
    maxTimer = setTimeout(stop, MAX_MS);
  }
  function stop() {
    clearTimeout(maxTimer);
    if (state !== 'listening') return;
    if (!rec || rec.state === 'inactive') { state = 'idle'; target = null; return sync(); } // mic never opened
    if (Date.now() - t0 < MIN_MS) { rec.onstop = null; rec.stop(); rec = null; state = 'idle'; target = null; return sync(); }
    state = 'writing'; sync();
    rec.stop();
  }
  async function send() {
    const r = rec; rec = null;
    const blob = new Blob(chunks, { type: (r && r.mimeType) || 'audio/webm' }); chunks = [];
    const field = target;
    try {
      const b64 = await new Promise((ok, no) => {
        const fr = new FileReader(); fr.onerror = no;
        fr.onload = () => ok(String(fr.result).split(',')[1] || ''); fr.readAsDataURL(blob);
      });
      const res = await fetch('/api/voice/stt', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: b64, mime: blob.type, field: fieldFor(field), run: BYOC.run || undefined }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.error) { state = 'idle'; target = null; return unavailable(); }
      let text = String(j.text || '').trim();
      if (fieldFor(field) === 'intro') text = text.replace(/^i\s+love[,.]?\s*/i, '');
      text = text.replace(/[.]$/, '');
      if (text && field && document.contains(field)) {
        field.focus();
        const own = fieldFor(field) === 'intro' || fieldFor(field) === 'idea';
        if (own && BYOC.typeInto) BYOC.typeInto(text);
        else { // a data-voice field: typeInto only knows her card and sheet, so the words go straight in, as typing would
          if ('value' in field) field.value = text; else field.textContent = text;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          // One spoken take, for a field that keeps takes as pieces (the focus doc, public/focus-doc.js).
          field.dispatchEvent(new CustomEvent('byoc:voice', { detail: { text } }));
        }
        // Caret at the end, so she can fix a word and press Enter.
        try { field.setSelectionRange(field.value.length, field.value.length); } catch {}
      }
    } catch { state = 'idle'; target = null; return unavailable(); }
    state = 'idle'; target = null; sync();
  }

  // ---- keys: hold ` anywhere, or V when she isn't typing -------------------------------------------
  const typing = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  const isTalkKey = e => !e.metaKey && !e.ctrlKey && !e.altKey &&
    (e.code === 'Backquote' || ((e.key === 'v' || e.key === 'V') && !typing(e.target)));
  window.addEventListener('keydown', e => {
    if (!isTalkKey(e)) return;
    const f = currentTarget();
    if (!f || !available) return; // nothing to speak into: the key does what it always did
    e.preventDefault(); e.stopPropagation();
    if (!e.repeat && state === 'idle') start(f);
  }, true);
  window.addEventListener('keyup', e => {
    if (e.code === 'Backquote' || e.key === 'v' || e.key === 'V') { if (state === 'listening') { e.preventDefault(); stop(); } }
  }, true);
  window.addEventListener('blur', () => { if (state === 'listening') stop(); });

  // ---- is voice there? -------------------------------------------------------------------------
  BYOC.voice = { get available() { return available; }, get state() { return state; }, start: () => start(currentTarget()), stop };
  if (available !== false) {
    fetch('/api/voice/status').then(r => r.json()).then(j => { available = !!j.available; sync(); })
      .catch(() => unavailable());
  }
  sync();
})();
