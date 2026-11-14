// Keyboard-driven beats, stage mode, and fitting the 1600x900 room to any screen.
//   Right / PageDown / Space : next beat        Left / PageUp : previous beat
//   Home or 0 : reset to the empty room          S : stage mode (body >= 20px, no chrome)
//   R : replay the rehearsal run   C : replay the cafe run   F : play the fake fixture run
//   Enter : back to her sheet's input            Esc : leave the input (so keys work again)
// Keys are ignored while she is typing, except Esc.
(function () {
  'use strict';
  const BYOC = window.BYOC;
  const room = document.getElementById('room');

  function fit() {
    const stage = document.body.classList.contains('stage');
    const top = stage ? 0 : 30;
    const s = Math.min(window.innerWidth / 1600, (window.innerHeight - top) / 900);
    room.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit);

  function setStageMode(on) {
    document.body.classList.toggle('stage', on);
    fit();
  }
  BYOC.stageMode = setStageMode;
  const q = new URLSearchParams(location.search);
  if (q.get('stage') === '1') setStageMode(true);
  fit();

  const isTyping = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

  document.addEventListener('keydown', e => {
    if (isTyping(e.target)) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    let handled = true;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') next();
    else if (k === 'ArrowLeft' || k === 'PageUp') BYOC.stage(BYOC.beat - 1);
    else if (k === 'Home' || k === '0') BYOC.reset();
    else if (k === 's' || k === 'S') setStageMode(!document.body.classList.contains('stage'));
    else if (k === 'r' || k === 'R') BYOC.replayRun && BYOC.replayRun(q.get('replay') || 'rehearsal');
    else if (k === 'c' || k === 'C') BYOC.replayRun && BYOC.replayRun('cafe');
    else if (k === 'f' || k === 'F') BYOC.playFixture && BYOC.playFixture();
    else if (k === 'Enter') focusInput();
    else handled = false;
    if (handled) e.preventDefault();
  });

  function focusInput() {
    const inp = document.getElementById('her-input');
    if (inp && !document.getElementById('her-form').hidden) inp.focus();
  }
  // Next beat. At "first move" and "her journey" the next thing is hers to write, so focus her input,
  // unless she has written the idea and wants the team to go.
  function next() {
    const b = BYOC.beat;
    const idea = document.getElementById('her-idea').textContent;
    if (b === 3 && !idea) return focusInput();
    BYOC.stage(b + 1);
  }
})();
