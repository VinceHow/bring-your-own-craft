// Her inbox (DEMO "Her inbox", Vincent 14 Nov evening; ONE home at the top right, Vincent 15 Nov 02:00: "my inbox should
// live at the top right, saying it's empty until something comes in… when I open it, it takes over my whole screen. No
// stupid preview"). data-state empty | new | open. Empty: "Your inbox is empty". New: only who ("Noor has a question"),
// never the question itself: the room's one attention cue. Open: the whole screen. The tally's counters live in it.
// A quick unblock opens as its own full-screen page (data-view="action"), like her focus document.
// Collapsed: the one item that needs her now, or "Nothing needs you right now". Expanded: a drawer with three parts:
//   Needs you: one item at a time, the next ones folded. The tray's arrival rules, moved here unchanged: an item
//     slides in only at a natural pause (about 1 s after it), never while she's typing or speaking; no numbers, no red,
//     no pulse. The ceiling of three questions is the server's and is unchanged.
//   A quick unblock (ask.unblock, granted by lib/policy.js) is a Needs-you item answered right here: Yes, or her words.
//   Things only you can do: fed only by `owner.task` events { id, title, steps[] }, shown as plain steps she ticks.
//     There is no key or secret input of any kind here (a key field is Milestone 2, server-side only).
//   Past meetings: her editable "Meeting notes" (builder 7's focus work); a stub until that lands.
// Structure and hooks only (docs/COMPONENTS.md): the look comes from the design studio. room.js still decides what
// waits (BYOC.focus.waiting); this file decides when and how she sees it. Provides BYOC.inbox.
(function () {
  'use strict';
  const B = (window.BYOC = window.BYOC || {});
  const room = document.getElementById('room');
  if (!room) return;
  // Structure and a sane default spot only (where the tray sat); the look is the studio's.
  const css = `
/* Where it lives is Vincent's call, not a look's: ONE home at the top right, the whole screen when open (ids, so a look's
   class rules style it but don't move it; a look that must move it matches this specificity on purpose). */
html body #room #inbox { position: absolute; left: auto; right: 18px; top: 16px; bottom: auto; width: 340px; z-index: 9; }
html body #room #inbox[data-state="open"] { left: 40px; right: 40px; top: 20px; bottom: 20px; width: auto; z-index: 60; overflow: auto; overscroll-behavior: contain; background: var(--sheet, #fff); padding: 22px 28px; }
html body #room #inbox[data-state="open"] .inbox-drawer { max-height: none; overflow: visible; }
.inbox[hidden], .inbox [hidden] { display: none !important; }
.inbox .inbox-now, .inbox .inbox-toggle, .inbox .inbox-item { display: block; width: 100%; text-align: left; font: inherit; cursor: pointer; }
html body #room #inbox[data-state="open"] .inbox-now { display: none; }
html body #room #inbox[data-state="open"] .inbox-toggle { transform: none; } /* opened, it sits under the pointer: a hover lift would flicker */
.inbox[data-view="action"] [data-part]:not([data-part="needs"]), .inbox[data-view="action"] .inbox-part-title, .inbox[data-view="action"] .inbox-next, .inbox[data-view="action"] .counter { display: none !important; }
.inbox[data-view="action"] .inbox-action { width: auto; max-width: 860px; margin: 40px auto 0; }
.inbox .inbox-steps { margin: 0; padding-left: 0; list-style: none; }
.inbox .inbox-who, .inbox .inbox-text { display: block; }
.inbox[data-pulse="on"] { outline: 3px solid currentColor; outline-offset: 3px; }
`;
  const style = document.createElement('style'); style.dataset.byoc = 'inbox'; style.textContent = css;
  document.head.appendChild(style);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const slot = (e, name) => { e.dataset.slot = name; return e; };
  const NAME = { design: 'Design', data: 'Data', research: 'Research', strategy: 'Strategy', engineering: 'Engineering', product: 'Product' };
  const AGENT = { design: 'Mika', research: 'Noor', data: 'Theo', strategy: 'Ines', engineering: 'Bo' };
  // Who asks: the teammate's own name ("Noor asks"), from `by`, else the seat's agent; never "<her seat>'s teammate"
  // (her own seat's engine has no name of its own: then "The team asks").
  const asker = n => {
    const by = String(n.by || '').trim();
    if (by && !/teammate$/i.test(by) && !Object.values(NAME).includes(by)) return by;
    return (B.info && B.info(n.seat) && B.info(n.seat).agent) || AGENT[n.seat] || 'The team';
  };
  B.asker = asker;
  const who = n => `${asker(n)} asks`;
  // The closed inbox says only who: "Noor has a question", "Bo's blocked". Never the question (no preview in the room).
  const line = n => n.unblock ? `${n.by || AGENT[n.seat] || 'The team'}'s blocked` : `${asker(n)} has a question`;
  const fewWords = t => { const w = String(t || '').replace(/[?.!]+\s*$/, '').split(/\s+/); return (w.length > 6 ? w.slice(0, 6).join(' ') + '…' : w.join(' ')) + '?'; };

  // ---- the frame ----------------------------------------------------------------------------------
  const box = h('aside', 'inbox'); box.id = 'inbox'; box.hidden = true;
  box.setAttribute('aria-label', 'Your inbox');
  box.dataset.component = 'inbox'; box.dataset.state = 'empty'; box.dataset.view = 'list';
  const now = slot(h('button', 'inbox-now'), 'now'); now.type = 'button';
  const toggle = slot(h('button', 'inbox-toggle', 'Open your inbox'), 'toggle'); toggle.type = 'button'; toggle.setAttribute('aria-expanded', 'false');
  const drawer = slot(h('div', 'inbox-drawer'), 'drawer'); drawer.hidden = true;
  const part = (key, title) => {
    const s = slot(h('section', 'inbox-part'), key); s.dataset.part = key;
    s.appendChild(slot(h('h3', 'inbox-part-title', title), 'title'));
    const body = slot(h('div', 'inbox-part-body'), 'body'); s.appendChild(body);
    drawer.appendChild(s); return body;
  };
  const needsBody = part('needs', 'Needs you');
  const onlyBody = part('only-you', 'Things only you can do');
  const pastBody = part('meetings', 'Past meetings');
  box.append(now, toggle, drawer);
  room.appendChild(box);
  // The tally's counters ("decisions came up · brought to you") live in the inbox now; the room's #tally keeps the meter.
  // The node moves (its ids and room.js's rollers with it); it shows when the tally does.
  const counter = document.getElementById('counter'), tallyEl = document.getElementById('tally');
  if (counter) {
    counter.dataset.slot = 'tally'; box.insertBefore(counter, toggle);
    const sync = () => { counter.hidden = !tallyEl || tallyEl.hidden; };
    sync(); if (tallyEl) new MutationObserver(sync).observe(tallyEl, { attributes: true, attributeFilter: ['hidden'] });
  }

  // ---- state -------------------------------------------------------------------------------------
  let shown = [];           // the Needs-you items she can see (after the natural pause)
  let arriveTimer = null;
  const tasks = new Map();  // owner.task id -> { id, title, steps[], done:Set }
  const isTypingNow = () => { const a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)); };
  const inWindow = () => B.beat >= 4 && B.beat < 9; // from her first idea to her page

  // The tray's arrival rule, unchanged: new waiting items appear about 1 s after a natural pause, never mid-typing.
  let pulseTimer = null;
  function render() {
    const f = B.focus || { open: null, waiting: [] };
    box.hidden = !inWindow() || !!f.open;
    const ids = f.waiting.map(n => n.id).join(',');
    clearTimeout(arriveTimer);
    if (ids === shown.map(n => n.id).join(',')) return paint();
    const fewer = f.waiting.length < shown.length && f.waiting.every(n => shown.some(s => s.id === n.id));
    if (!f.waiting.length || fewer) { shown = f.waiting.slice(); return paint(); } // an answered one leaves at once
    arriveTimer = setTimeout(function slideIn() {
      if (isTypingNow()) { arriveTimer = setTimeout(slideIn, 500); return; }
      if ((B.focus || {}).open) return;
      const before = new Set(shown.map(n => n.id));
      shown = (B.focus || { waiting: [] }).waiting.slice();
      paint();
      // Something new for her: a short pulse on the inbox (data-pulse, ~2.4 s), and the room says who (inbox.new).
      const fresh = shown.find(n => !before.has(n.id));
      if (fresh && !B.replay) {
        box.dataset.pulse = 'on'; now.dataset.state = 'new';
        clearTimeout(pulseTimer); pulseTimer = setTimeout(() => { box.dataset.pulse = 'off'; now.dataset.state = 'top'; }, 2400);
        B.emit && B.emit('inbox.new', { id: fresh.id, seat: fresh.seat, by: asker(fresh), unblock: !!fresh.unblock });
      }
    }, B.replay || B.instant ? 0 : 1000);
  }

  // A quick unblock (DEMO 0:50; the studio's inbox-action, design/cast-toys m2-moments): always framed as unblocking a
  // named teammate. "Bo's blocked" + what he's doing, the question, "We suggest …", one big Yes, and a quiet "Say
  // something else" mic: her words replace the suggestion (the old one struck through below) and Yes sends hers.
  // States asking → speaking → yes. Emits action.say {id, text} and action.yes {id, choice}; the server decides it.
  function actionCard(n) {
    const c = h('article', 'inbox-action'); c.dataset.component = 'inbox-action'; c.dataset.state = 'asking';
    c.dataset.action = n.id; c.dataset.seat = n.seat || '';
    const name = n.by || AGENT[n.seat] || NAME[n.seat] || 'The team';
    const whoEl = slot(h('div', 'ia-who'), 'who');
    const face = slot(h('span', 'ia-face'), 'face'); face.dataset.seat = n.seat || ''; face.setAttribute('aria-hidden', 'true');
    whoEl.append(face, slot(h('span', 'ia-blocked', `${name}'s blocked`), 'blocked'));
    if (n.doing) whoEl.appendChild(slot(h('span', 'ia-doing', n.doing), 'doing'));
    const q = slot(h('p', 'ia-q', String(n.question || '')), 'question');
    const sug = slot(h('div', 'ia-sug'), 'suggestion');
    const sugText = String(n.suggestion || '').replace(/[.]$/, '');
    sug.append(h('span', 'k', 'We suggest'), slot(h('p', 'ia-sug-text', sugText), 'suggestion-text'));
    const yes = slot(h('button', 'ia-yes', 'Yes'), 'yes'); yes.type = 'button';
    const say = slot(h('button', 'ia-say'), 'say'); say.type = 'button';
    const sayLabel = h('span', 'ia-say-label', 'Say something else'); say.appendChild(sayLabel);
    const note = slot(h('span', 'ia-note'), 'note');
    let hers = null, tidying = null, tidied = '', sending = false;
    // Tidy her answer once per line: a spoken take as it lands, a typed one when she says Yes. Falls back to her raw words.
    const tidyHers = text => {
      const raw = String(text ?? (hers ? hers.textContent : '')).trim();
      if (!hers || !raw || !B.tidyInto) return Promise.resolve(raw);
      tidying = B.tidyInto(hers, raw).then(t => { tidied = hers.textContent.trim(); if (tidied && B.emit) B.emit('action.say', { id: n.id, text: tidied }); return t; });
      return tidying;
    };
    // "Say something else": the suggestion box becomes hers; voice opens on it (tap the button again to stop), or she types.
    say.addEventListener('click', () => {
      if (c.dataset.state === 'yes') return;
      if (B.voice && B.voice.state === 'listening') { B.voice.stop(); return; }
      if (!hers) {
        sug.classList.add('hers'); sug.replaceChildren();
        hers = slot(h('p', 'ia-hers'), 'hers'); hers.contentEditable = 'true'; hers.spellcheck = false; hers.dataset.voice = 'unblock';
        hers.setAttribute('aria-label', 'Your answer');
        hers.addEventListener('input', () => { const t = hers.textContent.trim(); if (t) { sayLabel.textContent = 'Say it again'; B.emit && B.emit('action.say', { id: n.id, text: t }); } });
        hers.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); yes.click(); } if (e.key === 'Escape') hers.blur(); });
        // Her spoken answer is tidied in place (her words, clearer order; data-raw / data-state / data-tidy on .ia-hers).
        hers.addEventListener('byoc:voice', e => { tidyHers(e.detail && e.detail.text); });
        sug.append(h('span', 'k', 'You said'), hers, slot(h('span', 'ia-was', sugText), 'was'));
      }
      c.dataset.state = 'speaking'; sayLabel.textContent = 'Listening…';
      hers.focus();
      if (B.voice && B.voice.available) B.voice.start(); else sayLabel.textContent = 'Type it, then Yes';
    });
    yes.addEventListener('click', async () => {
      if (c.dataset.state === 'yes' || sending) return;
      if (B.voice && B.voice.state === 'listening') B.voice.stop();
      sending = true;
      try {
        if (hers && hers.dataset.state === 'tidying') await tidying;
        const typed = hers ? hers.textContent.trim() : '';
        if (typed && typed !== tidied) await tidyHers(typed); // typed (or edited after the tidy): tidy that line now
      } catch {} finally { sending = false; }
      const words = hers ? hers.textContent.trim() : '';
      const body = words ? { text: words } : { yes: true };
      const prev = c.dataset.state; c.dataset.state = 'yes'; note.textContent = '';
      B.emit && B.emit('action.yes', { id: n.id, choice: words || sugText });
      try { if (!B.replay) await B.api(`/api/run/${encodeURIComponent(B.run)}/unblock/answer`, { askId: n.id, ...body }, { step: false }); }
      catch (e) { c.dataset.state = prev; note.textContent = 'Not sent. Try again.'; }
    });
    c.append(whoEl, q, sug, yes, say, note);
    return c;
  }
  function item(n, state) {
    const b = h('button', 'inbox-item'); b.type = 'button';
    b.dataset.component = 'inbox-item'; b.dataset.state = state; b.dataset.seat = n.seat || '';
    if (n.unblock) b.dataset.action = n.id; else b.dataset.ask = n.id; // an action card waiting, or a question
    const label = n.unblock ? `${n.by || AGENT[n.seat] || 'The team'}'s blocked` : who(n);
    b.append(slot(h('span', 'inbox-who', label), 'who'), slot(h('span', 'inbox-text', n.unblock ? String(n.question || '') : fewWords(n.question)), 'text'));
    return b;
  }
  function paint() {
    const top = shown[0];
    // Collapsed: the one item that needs her now, or nothing.
    now.replaceChildren(top ? slot(h('span', 'inbox-who', line(top)), 'who') : slot(h('span', 'inbox-empty', 'Your inbox is empty'), 'empty'));
    now.dataset.ask = top ? top.id : '';
    now.dataset.component = 'inbox-item'; if (now.dataset.state !== 'new' || !top) now.dataset.state = top ? 'top' : 'empty';
    if (box.dataset.state !== 'open') box.dataset.state = top ? 'new' : 'empty';
    // The unblock page closes itself once its item has gone (she answered; the server took it).
    if (box.dataset.view === 'action' && !(top && top.unblock && top.id === box.dataset.actionId)) expand(false);
    if (top && top.unblock) now.dataset.action = top.id; else delete now.dataset.action;
    if (top) now.dataset.seat = top.seat || ''; else delete now.dataset.seat;
    box.dataset.needs = top ? 'yes' : 'no';
    // Needs you: one at a time; the next ones folded.
    needsBody.replaceChildren();
    if (!top) needsBody.appendChild(slot(h('p', 'inbox-empty', 'Nothing needs you right now'), 'empty'));
    else {
      needsBody.appendChild(top.unblock ? actionCard({ ...top, ...((B.asks ? B.asks() : []).find(a => a.id === top.id) || {}) }) : item(top, 'top'));
      if (shown.length > 1) {
        const fold = slot(h('details', 'inbox-next'), 'next');
        fold.appendChild(slot(h('summary', 'inbox-next-label', 'Next'), 'next-label'));
        for (const n of shown.slice(1)) fold.appendChild(item(n, 'folded'));
        needsBody.appendChild(fold);
      }
    }
    paintTasks();
    keepInView();
  }
  // Never off-screen (Vincent's 1440x900 window clipped it at the left edge): after each paint and on resize, if any
  // edge of the inbox is outside the viewport, shift it back in (in the room's own scaled pixels). A look can place
  // it anywhere; this only keeps it visible.
  function keepInView() {
    if (box.hidden) return;
    box.style.translate = '';
    if (box.dataset.state !== 'open') { for (const k of ['left', 'top', 'right', 'bottom']) box.style[k] = ''; }
    else { // the whole visible window, whatever the look's scale or crop: fit it inside with a small margin
      const rr = room.getBoundingClientRect(), k = rr.width / (room.offsetWidth || rr.width) || 1, M = 12;
      box.style.left = Math.max(40, (M - rr.left) / k) + 'px'; box.style.top = Math.max(20, (M - rr.top) / k) + 'px';
      box.style.right = Math.max(40, (rr.right - (innerWidth - M)) / k) + 'px'; box.style.bottom = Math.max(20, (rr.bottom - (innerHeight - M)) / k) + 'px';
      return;
    }
    const r = box.getBoundingClientRect(); if (!r.width) return;
    const k = r.width / (box.offsetWidth || r.width) || 1, M = 8;
    let dx = 0, dy = 0;
    if (r.left < M) dx = M - r.left; else if (r.right > innerWidth - M) dx = innerWidth - M - r.right;
    if (r.top < M) dy = M - r.top; else if (r.bottom > innerHeight - M) dy = innerHeight - M - r.bottom;
    if (dx || dy) box.style.translate = `${(dx / k).toFixed(1)}px ${(dy / k).toFixed(1)}px`;
  }
  B.inboxKeepInView = keepInView;
  addEventListener('resize', () => requestAnimationFrame(keepInView));

  // ---- Things only you can do: owner.task only, plain steps she ticks; never an input for a key ---------
  function paintTasks() {
    onlyBody.replaceChildren();
    if (!tasks.size) { onlyBody.appendChild(slot(h('p', 'inbox-empty', 'Nothing only you can do'), 'empty')); return; }
    for (const t of tasks.values()) {
      const done = t.steps.length > 0 && t.done.size === t.steps.length;
      const card = h('article', 'inbox-task'); card.dataset.component = 'owner-task'; card.dataset.task = t.id;
      card.dataset.state = done ? 'done' : t.done.size ? 'doing' : 'todo';
      card.appendChild(slot(h('h4', 'inbox-task-title', t.title), 'title'));
      const ol = slot(h('ol', 'inbox-steps'), 'steps');
      t.steps.forEach((s, i) => {
        const li = slot(h('li', 'inbox-step'), 'step'); li.dataset.state = t.done.has(i) ? 'done' : 'todo';
        const label = h('label');
        const tick = h('input'); tick.type = 'checkbox'; tick.checked = t.done.has(i); tick.dataset.slot = 'tick';
        tick.addEventListener('change', () => { if (tick.checked) t.done.add(i); else t.done.delete(i); paintTasks(); });
        label.append(tick, h('span', 'inbox-step-text', s));
        li.appendChild(label); ol.appendChild(li);
      });
      card.appendChild(ol);
      onlyBody.appendChild(card);
    }
  }
  function addTask(ev) {
    if (!ev || !ev.id || !ev.title) return;
    const steps = (Array.isArray(ev.steps) ? ev.steps : []).map(s => String(s)).filter(Boolean).slice(0, 12);
    const was = tasks.get(ev.id);
    tasks.set(ev.id, { id: String(ev.id), title: String(ev.title), steps, done: was ? was.done : new Set() });
    paintTasks();
  }

  // ---- Past meetings: a stub until builder 7's Meeting notes land ---------------------------------------
  pastBody.dataset.state = 'stub';
  pastBody.appendChild(slot(h('p', 'inbox-empty', 'Your meeting notes will be here after your first meeting.'), 'empty'));

  // ---- open and close ----------------------------------------------------------------------------------
  function expand(open, view = 'list', actionId = '') {
    box.dataset.state = open ? 'open' : shown[0] ? 'new' : 'empty';
    box.dataset.view = open ? view : 'list'; if (open && actionId) box.dataset.actionId = actionId; else delete box.dataset.actionId;
    drawer.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = !open ? 'Open your inbox' : view === 'action' ? 'Back to the room' : 'Close your inbox';
    keepInView();
  }
  toggle.addEventListener('click', () => expand(box.dataset.state !== 'open'));
  addEventListener('keydown', e => { if (e.key === 'Escape' && box.dataset.state === 'open') { e.stopPropagation(); expand(false); } }, true);
  // Clicking the item that needs her opens it as her document; with nothing waiting, the click opens the drawer.
  now.addEventListener('click', () => { if (now.dataset.ask) openItem(now.dataset.ask); else expand(true); });
  // owner.action (the studio's event name) arrives with the granted ask; the action itself rides on BYOC.focus.waiting.
  needsBody.addEventListener('click', e => { const b = e.target.closest('button.inbox-item'); if (b) openItem(b.dataset.ask || b.dataset.action); });
  function openItem(id) {
    if (!id || !B.openNote) return false;
    if ((shown.find(n => n.id === id) || {}).unblock) return showUnblock(id);
    expand(false); return B.openNote(id);
  }
  // An unblock opens as its own full-screen page (data-view="action"): who's blocked, the question, Yes, Say it again.
  function showUnblock(id) {
    if (!shown.some(n => n.id === id)) return false;
    if (shown[0].id !== id) { shown = [shown.find(n => n.id === id), ...shown.filter(n => n.id !== id)]; paint(); }
    expand(true, 'action', id);
    const c = needsBody.querySelector(`.inbox-action[data-action="${CSS.escape(id)}"]`);
    if (c) c.querySelector('.ia-yes').focus();
    return true;
  }
  // The clicker's forward key opens the top item when one needs her (stage.js asks room.js, which asks here).
  function openTop() { return box.hidden || !shown[0] ? false : openItem(shown[0].id); }

  if (typeof B.on === 'function') {
    B.on('owner.task', addTask);
    B.on('stage', () => render());
    B.on('reset', () => { tasks.clear(); shown = []; clearTimeout(arriveTimer); expand(false); paint(); box.hidden = true; });
  }
  B.inbox = { render, openTop, expand, showUnblock, get shown() { return shown.slice(); }, tasks: () => [...tasks.values()].map(t => ({ id: t.id, title: t.title, steps: t.steps.slice(), done: [...t.done] })) };
  paint();
})();
