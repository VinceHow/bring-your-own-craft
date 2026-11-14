// Her inbox (DEMO "Her inbox", Vincent 14 Nov evening): one component by her seat, replacing the tray.
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
.inbox { position: absolute; left: 296px; bottom: 8px; width: 300px; z-index: 9; }
.inbox[hidden], .inbox [hidden] { display: none !important; }
.inbox .inbox-now, .inbox .inbox-toggle, .inbox .inbox-item { display: block; width: 100%; text-align: left; font: inherit; cursor: pointer; }
.inbox .inbox-drawer { max-height: 520px; overflow: auto; }
.inbox .inbox-steps { margin: 0; padding-left: 0; list-style: none; }
`;
  const style = document.createElement('style'); style.dataset.byoc = 'inbox'; style.textContent = css;
  document.head.appendChild(style);
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const slot = (e, name) => { e.dataset.slot = name; return e; };
  const NAME = { design: 'Design', data: 'Data', research: 'Research', strategy: 'Strategy', engineering: 'Engineering', product: 'Product' };
  const AGENT = { design: 'Mika', research: 'Noor', data: 'Theo', strategy: 'Ines', engineering: 'Bo' };
  const who = n => { const s = NAME[n.seat] || n.seat || 'Team'; const a = n.by || (B.info && B.info(n.seat) && B.info(n.seat).agent) || AGENT[n.seat]; return a ? `${a} · ${s}` : s; };
  const fewWords = t => { const w = String(t || '').replace(/[?.!]+\s*$/, '').split(/\s+/); return (w.length > 6 ? w.slice(0, 6).join(' ') + '…' : w.join(' ')) + '?'; };

  // ---- the frame ----------------------------------------------------------------------------------
  const box = h('aside', 'inbox'); box.id = 'inbox'; box.hidden = true;
  box.setAttribute('aria-label', 'Your inbox');
  box.dataset.component = 'inbox'; box.dataset.state = 'collapsed';
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

  // ---- state -------------------------------------------------------------------------------------
  let shown = [];           // the Needs-you items she can see (after the natural pause)
  let arriveTimer = null;
  const tasks = new Map();  // owner.task id -> { id, title, steps[], done:Set }
  const isTypingNow = () => { const a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)); };
  const inWindow = () => B.beat >= 4 && B.beat < 9; // from her first idea to her page

  // The tray's arrival rule, unchanged: new waiting items appear about 1 s after a natural pause, never mid-typing.
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
      shown = (B.focus || { waiting: [] }).waiting.slice();
      paint();
    }, B.replay || B.instant ? 0 : 1000);
  }

  // A quick unblock (DEMO 0:50): "Bo's blocked: when do orders close? We suggest 8pm the night before." Yes takes the
  // suggestion; or she says or types her own. Her answer goes to the server, which decides it in the team space.
  function unblockCard(n) {
    const c = h('article', 'inbox-unblock'); c.dataset.component = 'unblock-card'; c.dataset.state = 'asking';
    c.dataset.ask = n.id; c.dataset.seat = n.seat || '';
    const name = (n.by || AGENT[n.seat] || NAME[n.seat] || 'The team');
    c.append(slot(h('span', 'inbox-who', who(n)), 'who'),
      slot(h('p', 'inbox-unblock-q', `${name}'s blocked: ${String(n.question || '').replace(/^\w/, ch => ch.toLowerCase())}`), 'question'),
      slot(h('p', 'inbox-unblock-sug', `We suggest ${String(n.suggestion || '').replace(/[.]$/, '')}.`), 'suggestion'));
    const yes = slot(h('button', 'inbox-unblock-yes', 'Yes'), 'yes'); yes.type = 'button';
    const own = slot(h('input', 'inbox-unblock-own'), 'own'); own.type = 'text'; own.dataset.voice = 'unblock';
    own.placeholder = 'Or say it your way'; own.setAttribute('aria-label', 'Your answer'); own.autocomplete = 'off'; own.spellcheck = false;
    const send = slot(h('button', 'inbox-unblock-send', 'Send'), 'send'); send.type = 'button';
    const note = slot(h('span', 'inbox-unblock-note'), 'note');
    const go = async body => {
      if (c.dataset.state === 'sending') return;
      c.dataset.state = 'sending'; note.textContent = '';
      try {
        if (!B.replay) await B.api(`/api/run/${encodeURIComponent(B.run)}/unblock/answer`, { askId: n.id, ...body }, { step: false });
        c.dataset.state = 'done'; // the answer event takes it out of Needs you
      } catch (e) { c.dataset.state = 'asking'; note.textContent = 'Not sent. Try again.'; }
    };
    yes.addEventListener('click', () => go({ yes: true }));
    send.addEventListener('click', () => { const t = own.value.trim(); if (t) go({ text: t }); else own.focus(); });
    own.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); send.click(); } if (e.key === 'Escape') own.blur(); });
    c.append(yes, own, send, note);
    return c;
  }
  function item(n, state) {
    const b = h('button', 'inbox-item'); b.type = 'button';
    b.dataset.component = 'inbox-item'; b.dataset.state = state; b.dataset.ask = n.id; b.dataset.seat = n.seat || '';
    b.append(slot(h('span', 'inbox-who', who(n)), 'who'), slot(h('span', 'inbox-text', fewWords(n.question)), 'text'));
    return b;
  }
  function paint() {
    const top = shown[0];
    // Collapsed: the one item that needs her now, or nothing.
    now.replaceChildren(...(top ? item(top.unblock ? { ...top, question: `${top.by || AGENT[top.seat] || 'The team'}'s blocked: ${top.question}` } : top, 'top').childNodes : [slot(h('span', 'inbox-empty', 'Nothing needs you right now'), 'empty')]));
    now.dataset.ask = top ? top.id : '';
    if (top) now.dataset.seat = top.seat || ''; else delete now.dataset.seat;
    box.dataset.needs = top ? 'yes' : 'no';
    // Needs you: one at a time; the next ones folded.
    needsBody.replaceChildren();
    if (!top) needsBody.appendChild(slot(h('p', 'inbox-empty', 'Nothing needs you right now'), 'empty'));
    else {
      needsBody.appendChild(top.unblock ? unblockCard(top) : item(top, 'top'));
      if (shown.length > 1) {
        const fold = slot(h('details', 'inbox-next'), 'next');
        fold.appendChild(slot(h('summary', 'inbox-next-label', 'Next'), 'next-label'));
        for (const n of shown.slice(1)) fold.appendChild(item(n, 'folded'));
        needsBody.appendChild(fold);
      }
    }
    paintTasks();
  }

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
  function expand(open) {
    box.dataset.state = open ? 'expanded' : 'collapsed';
    drawer.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close your inbox' : 'Open your inbox';
  }
  toggle.addEventListener('click', () => expand(box.dataset.state !== 'expanded'));
  // Clicking the item that needs her opens it as her document; with nothing waiting, the click opens the drawer.
  now.addEventListener('click', () => { if (now.dataset.ask) openItem(now.dataset.ask); else expand(true); });
  needsBody.addEventListener('click', e => { const b = e.target.closest('button.inbox-item'); if (b) openItem(b.dataset.ask); });
  function openItem(id) {
    if (!id || !B.openNote) return false;
    if ((shown.find(n => n.id === id) || {}).unblock) return showUnblock(id);
    expand(false); return B.openNote(id);
  }
  // An unblock is answered right here: open the drawer on it, ready for Yes or her words.
  function showUnblock(id) {
    if (!shown.some(n => n.id === id)) return false;
    expand(true);
    const c = needsBody.querySelector(`.inbox-unblock[data-ask="${CSS.escape(id)}"]`);
    if (c) c.querySelector('.inbox-unblock-yes').focus();
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
