// Keyboard-driven beats, stage mode, the help card, and fitting the 1600x900 room to any screen.
// One line per key, here and in docs/KEYS.md (keep them the same):
//   Right / PageDown / Space : next beat (a clicker's forward button); on her name tag: make it, then meet the team; one teammate at a time
//   Left / PageUp            : previous beat (a clicker's back button)
//   Home or 0                : reset to the empty room
//   S                        : stage mode (body >= 20px, no chrome, no help card)
//   R                        : replay the rehearsal run
//   C                        : replay the yoga run
//   (J, the judge's-idea close, is unhooked from the stage path: Vincent, 15 Nov; close.js stays, unreachable)
//   B                        : build her page (same as moving on to the build beat)
//   F                        : play the fake fixture run (labelled FAKE)
//   Enter                    : back to her sheet's input
//   Esc                      : leave the input, so keys work again
//   ?                        : this help card (never in stage mode)
// Keys are ignored while she is typing, except Esc; a clicker's PageUp/PageDown still move the beat from an empty input.
(function () {
  'use strict';
  const BYOC = window.BYOC;
  const room = document.getElementById('room');

  const KEYS = [
    ['→ · PageDown · Space', 'next beat (clicker forward); name tag, then each teammate'],
    ['← · PageUp', 'previous beat (clicker back)'],
    ['Home · 0', 'reset to the empty room'],
    ['S', 'stage mode: big type, no chrome'],
    ['R', 'replay the rehearsal'],
    ['C', 'replay the yoga run'],
    ['B', 'build her page'],
    ['F', 'fake fixture run (labelled FAKE)'],
    ['V · `', 'speak: hold to talk, or tap to start and tap to stop (Esc cancels)'],
    ['Enter', 'back to her input'],
    ['Esc', 'leave the input'],
    ['Shift+N', 'start over: a new studio (asks once; this run is kept)'],
    ['?', 'this card (hidden in stage mode)'],
  ];
  const help = document.createElement('aside');
  help.id = 'help-card'; help.className = 'help-card'; help.hidden = true;
  help.innerHTML = `<div class="help-head">Keys</div><dl>${KEYS.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  document.body.appendChild(help);
  const toggleHelp = on => { help.hidden = !(on ?? help.hidden) || document.body.classList.contains('stage'); };
  BYOC.help = toggleHelp;

  function fit() {
    const stage = document.body.classList.contains('stage');
    const top = stage ? 0 : 30;
    const s = Math.min(window.innerWidth / 1600, (window.innerHeight - top) / 900);
    room.style.transform = `scale(${s})`; // centred by its negative margins (room.css)
  }
  window.addEventListener('resize', fit);

  function setStageMode(on) {
    document.body.classList.toggle('stage', on);
    if (on) help.hidden = true;
    fit();
  }
  BYOC.stageMode = setStageMode;
  const q = new URLSearchParams(location.search);
  if (q.get('stage') === '1') setStageMode(true);
  fit();

  const isTyping = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  const inClose = () => !!(BYOC.close && BYOC.close.isOpen && BYOC.close.isOpen());

  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    // Her focus document fills the view: Esc (or the clicker, once her brief is there) takes her back to the room;
    // the beat keys wait until then.
    // A teammate's open sketchpad or her workspace: Esc (or the clicker's back key) returns to the room.
    const panel = document.getElementById('room-panel');
    if (panel && !panel.hidden && !isTyping(e.target) && (k === 'Escape' || k === 'PageUp' || k === 'ArrowLeft')) { e.preventDefault(); BYOC.closePanel(); return; }
    // A focused button (her role on the name tag, an unblock's Yes): Enter and Space press it (a button's own behaviour).
    if (document.activeElement?.tagName === 'BUTTON' && (k === 'Enter' || k === ' ')) return;
    // Her idea sheet opened large: Esc puts it back.
    if (k === 'Escape' && !isTyping(e.target) && BYOC.isSheetOpen && BYOC.isSheetOpen()) { e.preventDefault(); BYOC.sheetOpen(false); return; }
    // The presenter's own keys (Home, 0, R, C, J, S, F) always work: they close her document first.
    if (BYOC.focusDoc && BYOC.focusDoc.isOpen() && !isTyping(e.target)) {
      const back = k === 'Escape' || ((k === 'PageDown' || k === 'ArrowRight') && document.querySelector('#focus-doc .fd-brief:not([hidden])'));
      if (back) { e.preventDefault(); BYOC.focusDoc.close(); return; }
      if (['PageDown', 'PageUp', 'ArrowRight', 'ArrowLeft', ' '].includes(k)) { e.preventDefault(); return; }
      if (['Home', '0', 'r', 'R', 'c', 'C', 's', 'S', 'f', 'F', 'b', 'B'].includes(k)) BYOC.focusDoc.close(true);
      else return;
    }
    if (isTyping(e.target)) {
      if (k === 'Escape') { e.target.blur(); return; }
      // A clicker only has PageUp/PageDown: from an empty input they move the beat instead of doing nothing.
      const empty = 'value' in e.target ? !e.target.value : !e.target.textContent.trim();
      if ((k === 'PageDown' || k === 'PageUp') && empty) { e.target.blur(); } else return;
    }
    let handled = true;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') next();
    else if ((k === 'ArrowLeft' || k === 'PageUp') && BYOC.beat === 1 && BYOC.meetBack && BYOC.meetBack()) { /* meet the team: the previous teammate */ }
    else if (k === 'ArrowLeft' || k === 'PageUp') { if (inClose()) { BYOC.close.close(); if (BYOC.beat === 11) BYOC.stage(10); } else BYOC.stage(BYOC.beat - 1); }
    else if (k === 'Home' || k === '0') { if (BYOC.forgetRun) BYOC.forgetRun(); BYOC.reset(); } // the presenter's reset: a refresh starts fresh too
    else if (k === 'N' && e.shiftKey && BYOC.startOver) BYOC.startOver.ask(); // Start over (asks once)
    else if (k === 's' || k === 'S') setStageMode(!document.body.classList.contains('stage'));
    else if (k === 'r' || k === 'R') inClose() ? BYOC.close?.replay('yoga') : BYOC.replayRun?.(q.get('replay') || 'rehearsal');
    else if (k === 'c' || k === 'C') inClose() ? BYOC.close?.replay('yoga') : BYOC.replayRun?.('yoga');
    else if (k === 'f' || k === 'F') BYOC.playFixture && BYOC.playFixture();
    else if (k === 'b' || k === 'B') { if (BYOC.beat < 8) BYOC.stage(8); else BYOC.build?.(); }
    else if (k === '?') toggleHelp();
    else if (k === 'Enter') { if (BYOC.introShown && BYOC.introShown()) BYOC.introDone(); else if (BYOC.beat === 1 && BYOC.meetNext) BYOC.meetNext(); else focusInput(); }
    else handled = false;
    if (handled) e.preventDefault();
  });

  function focusInput() {
    if (inClose()) { document.getElementById('close-input')?.focus(); return; }
    if (BYOC.ideaOpen && BYOC.ideaOpen()) { document.getElementById('idea-input')?.focus(); return; }
    if (BYOC.introOpen && BYOC.introOpen()) { document.getElementById('intro-input')?.focus(); return; }
    const inp = document.getElementById('her-input');
    if (inp && !document.getElementById('her-form').hidden) inp.focus();
  }
  // Next beat. At "first move" the next thing is hers to write, so focus her input until the idea is down.
  // From the last live beat, next opens the close.
  function next() {
    const b = BYOC.beat;
    const idea = document.getElementById('her-idea').textContent;
    if (b === 0) { // her paper name tag: forward makes her name tag from her words, then moves on to the team
      if (BYOC.ideaOpen && BYOC.ideaOpen()) return BYOC.ideaDone(); // her idea paper (first): forward keeps it, then her name tag
      if (BYOC.introOpen && BYOC.introOpen()) return BYOC.introDone();
      return BYOC.stage(1);
    }
    if (b === 1) return BYOC.meetNext ? BYOC.meetNext() : BYOC.stage(2); // the next teammate; after the last, the reveal
    if (b === 3 && !idea) return focusInput();
    if (b >= 9 || inClose()) return; // her page is the last beat: the judge's-idea close is unhooked
    if (BYOC.openTopNote && BYOC.openTopNote()) return; // her tray is out: forward opens the team's suggested note
    // Audit F1: in the painted look, beats 6 (her sheet large) and 7 (Design's sketches) draw nothing she can see, so one
    // forward from the working room is the build press (DEMO: one press). Live only; replays and the plain look step on.
    if (b >= 5 && b <= 7 && !BYOC.replay && new URLSearchParams(location.search).get('look') === 'painted') return BYOC.stage(8);
    BYOC.stage(b + 1);
  }
})();
