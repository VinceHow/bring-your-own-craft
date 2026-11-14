// Keyboard-driven beats, stage mode, the help card, and fitting the 1600x900 room to any screen.
// One line per key, here and in docs/KEYS.md (keep them the same):
//   Right / PageDown / Space : next beat (a clicker's forward button)
//   Left / PageUp            : previous beat (a clicker's back button)
//   Home or 0                : reset to the empty room
//   S                        : stage mode (body >= 20px, no chrome, no help card)
//   R                        : replay the rehearsal run; in the close, replay the cafe run's three questions
//   C                        : replay the cafe run (in the close: its three questions)
//   J                        : the close: type a judge's idea
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
    ['→ · PageDown · Space', 'next beat (clicker forward)'],
    ['← · PageUp', 'previous beat (clicker back)'],
    ['Home · 0', 'reset to the empty room'],
    ['S', 'stage mode: big type, no chrome'],
    ['R', 'replay the rehearsal (in the close: the café run)'],
    ['C', 'replay the café run'],
    ['J', 'the close: type a judge’s idea'],
    ['F', 'fake fixture run (labelled FAKE)'],
    ['Enter', 'back to her input'],
    ['Esc', 'leave the input'],
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
    room.style.transform = `translate(-50%, -50%) scale(${s})`;
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
    if (isTyping(e.target)) {
      if (k === 'Escape') { e.target.blur(); return; }
      // A clicker only has PageUp/PageDown: from an empty input they move the beat instead of doing nothing.
      const empty = 'value' in e.target ? !e.target.value : !e.target.textContent.trim();
      if ((k === 'PageDown' || k === 'PageUp') && empty) { e.target.blur(); } else return;
    }
    let handled = true;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') next();
    else if (k === 'ArrowLeft' || k === 'PageUp') { if (inClose()) { BYOC.close.close(); if (BYOC.beat === 11) BYOC.stage(10); } else BYOC.stage(BYOC.beat - 1); }
    else if (k === 'Home' || k === '0') BYOC.reset();
    else if (k === 's' || k === 'S') setStageMode(!document.body.classList.contains('stage'));
    else if (k === 'r' || k === 'R') inClose() ? BYOC.close?.replay('cafe') : BYOC.replayRun?.(q.get('replay') || 'rehearsal');
    else if (k === 'c' || k === 'C') inClose() ? BYOC.close?.replay('cafe') : BYOC.replayRun?.('cafe');
    else if (k === 'f' || k === 'F') BYOC.playFixture && BYOC.playFixture();
    else if (k === 'j' || k === 'J') BYOC.close?.open();
    else if (k === '?') toggleHelp();
    else if (k === 'Enter') focusInput();
    else handled = false;
    if (handled) e.preventDefault();
  });

  function focusInput() {
    if (inClose()) { document.getElementById('close-input')?.focus(); return; }
    const inp = document.getElementById('her-input');
    if (inp && !document.getElementById('her-form').hidden) inp.focus();
  }
  // Next beat. At "first move" the next thing is hers to write, so focus her input until the idea is down.
  // From the last live beat, next opens the close.
  function next() {
    const b = BYOC.beat;
    const idea = document.getElementById('her-idea').textContent;
    if (b === 3 && !idea) return focusInput();
    if (b >= 11 || inClose()) return;
    BYOC.stage(b + 1);
  }
})();
