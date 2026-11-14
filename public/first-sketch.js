// Design's first sketch on her sheet: who the users are (small cards) and the stages (her flow's boxes), drawn in as
// the events arrive; her reaction redraws it; a click on a box renames, strikes or adds one (no model).
// Provides BYOC.firstSketch.{start(run, idea), takes(text), reshape(text), edit(lines), forIdea(idea, host), state}.
// Needs from the room: BYOC.api, BYOC.on, BYOC.el.herSheet/herFlow, BYOC.flow.mount (to clear the flow on a reset).
(function () {
  'use strict';
  const B = (window.BYOC = window.BYOC || {});
  const INK = '#0078BF'; // Design's blue
  const css = `
.fs-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; min-height: 0; }
.fs-bar[hidden] { display: none; }
.fs-who { font: 500 11px var(--mono, monospace); letter-spacing: .06em; text-transform: uppercase; color: ${INK}; }
.fs-user { font: 500 13px/1 var(--ui, sans-serif); padding: 6px 9px 5px 9px; background: var(--sheet, #FBF9F4);
  border: 2px solid var(--ink, #141414); border-left: 6px solid ${INK}; border-radius: 4px; box-shadow: 3px 3px 0 var(--ink, #141414); }
.fs-users { display: flex; gap: 8px; flex-wrap: wrap; }
.fs-tag { margin-left: auto; font: 400 11px var(--mono, monospace); color: rgba(20,20,20,.65); white-space: nowrap; }
.fs-tag.prepared { color: var(--ink, #141414); font-weight: 600; border: 2px solid var(--ink, #141414); padding: 3px 6px 2px; letter-spacing: .08em;
  background: #FFE800; border-radius: 3px; }
.fs-said { flex-basis: 100%; font: italic 400 13px/1.3 var(--ui, sans-serif); color: rgba(20,20,20,.75); }
.fs-said:empty { display: none; }
.fs-pop { position: absolute; z-index: 9; display: flex; gap: 6px; align-items: center; padding: 6px; background: var(--sheet, #FBF9F4);
  border: 2px solid var(--ink, #141414); border-radius: 4px; box-shadow: 4px 4px 0 var(--ink, #141414); }
.fs-pop input { font: 500 14px var(--ui, sans-serif); width: 170px; border: 0; border-bottom: 2px solid ${INK}; background: transparent; outline: 0; }
.fs-pop button { font: 500 12px var(--mono, monospace); background: var(--sheet, #FBF9F4); border: 2px solid var(--ink, #141414);
  border-radius: 3px; padding: 3px 6px; cursor: pointer; }
.fs-close-sketch { display: flex; flex-direction: column; gap: 10px; }
.fs-mini { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.fs-mini .fs-box { font: 500 13px/1.15 var(--ui, sans-serif); padding: 8px 10px; background: var(--sheet, #FBF9F4); border: 2px solid var(--ink, #141414);
  border-radius: 4px; box-shadow: 3px 3px 0 var(--ink, #141414); max-width: 150px; }
.fs-mini .fs-arrow { font: 600 16px var(--ui, sans-serif); }
.guest-card { position: absolute; left: 1206px; top: 392px; width: 300px; z-index: 3; padding: 12px 14px 12px; background: var(--sheet, #FBF9F4);
  border: 2px dashed var(--ink, #141414); border-radius: 6px; box-shadow: 4px 4px 0 rgba(20,20,20,.18); transform: rotate(1deg); }
.guest-card[hidden], body[data-beat="6"] .guest-card, body[data-beat="7"] .guest-card, body[data-beat="8"] .guest-card, body[data-beat="9"] .guest-card,
  body[data-beat="10"] .guest-card, body[data-beat="11"] .guest-card { display: none; }
.guest-head { display: flex; align-items: baseline; gap: 8px; }
.guest-tag { font: 600 12px var(--mono, monospace); letter-spacing: .12em; border: 2px dashed var(--ink, #141414); padding: 2px 6px 1px; border-radius: 3px; }
.guest-who { font: 600 14px/1.2 var(--ui, sans-serif); }
.guest-note { margin-top: 4px; font: 400 11px var(--mono, monospace); color: rgba(20,20,20,.7); }
.guest-says { margin: 10px 0 8px; font: italic 500 15px/1.35 var(--ui, sans-serif); }
.guest-points { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.guest-points li { font: 400 12px/1.3 var(--ui, sans-serif); }
.guest-points b { font: 600 11px var(--mono, monospace); margin-right: 4px; }
.guest-points i { color: rgba(20,20,20,.7); }
.fs-in { animation: fs-in 180ms cubic-bezier(.2,1.3,.4,1) both; }
@keyframes fs-in { from { transform: translateY(-8px) rotate(-2deg) scale(.94); opacity: 0; } to { transform: none; opacity: 1; } }
`;
  const style = document.createElement('style'); style.dataset.byoc = 'first-sketch'; style.textContent = css;
  document.head.appendChild(style);

  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const ARROW = /\s*(?:→|->|⟶|➔)\s*/;
  const norm = s => String(s || '').trim().toLowerCase().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').replace(/\s+/g, ' ').replace(/[.!?:;,]+$/, '');

  // state: 'off' (no sketch: typed journey) | 'pending' (first sketch on its way) | 'landed' | 'busy' (redrawing)
  const S = { state: 'off', run: null, lines: [], users: [], freshUsers: true, bar: null, list: null, tag: null, said: null, pop: null };

  function ensureBar() {
    const sheet = B.el && B.el.herSheet, flow = B.el && B.el.herFlow;
    if (!sheet || !flow) return null;
    if (S.bar && S.bar.isConnected) return S.bar;
    S.bar = h('div', 'fs-bar'); S.bar.hidden = true; S.bar.setAttribute('aria-label', "Design's first sketch: who it's for");
    S.bar.append(h('span', 'fs-who', 'Who'), S.list = h('div', 'fs-users'), S.tag = h('span', 'fs-tag'), S.said = h('div', 'fs-said'));
    flow.parentNode.insertBefore(S.bar, flow);
    flow.addEventListener('click', onBoxClick, true); // capture: in the reaction beat a click edits the box, not a pin
    return S.bar;
  }
  function setTag(text, prepared) { if (!ensureBar()) return; S.bar.hidden = false; S.tag.textContent = text; S.tag.classList.toggle('prepared', !!prepared); }
  function hint(placeholder, text) {
    const inp = document.getElementById('her-input'), hn = document.getElementById('her-hint');
    if (inp && placeholder) inp.placeholder = placeholder;
    if (hn && text) hn.textContent = text;
  }
  const canReact = () => !B.replay && B.beat <= 4 && B.run && !String(B.run).startsWith('local-');

  // ---- events (live and replayed alike) ----
  function onUser(ev) {
    if (!ensureBar()) return;
    if (S.freshUsers) { S.list.innerHTML = ''; S.users = []; S.freshUsers = false; }
    S.users.push(ev.label);
    const c = h('span', 'fs-user fs-in', ev.label); c.dataset.user = ev.id;
    S.list.appendChild(c);
    S.bar.hidden = false;
    if (ev.prepared) setTag('PREPARED', true);
    else if (!S.tag.textContent || S.state === 'pending') setTag('Design is sketching');
  }
  function onLine(ev) { S.lines.push(ev.text); }
  function onReset() {
    S.lines = [];
    closePop();
    if (B.flow && typeof B.flow.mount === 'function' && B.el && B.el.herFlow) B.flow.mount(B.el.herFlow); // clear the boxes
  }
  function onReshape(ev) {
    if (!ensureBar()) return;
    S.freshUsers = true;
    S.said.textContent = `You: “${ev.text}”`;
    S.state = 'busy';
    setTag('Design is redrawing');
  }
  function onDone(ev) {
    if (ev.skipped) { S.state = 'off'; if (S.bar && !S.users.length) S.bar.hidden = true; return; }
    S.state = 'landed';
    S.freshUsers = true;
    const secs = ev.ms != null ? ` · ${(ev.ms / 1000).toFixed(1)} s` : '';
    if (ev.prepared) setTag('PREPARED · sketched before the demo', true);
    else setTag((ev.reshape ? 'Design redrew it from what you said' : "Design's first sketch") + secs);
    if (canReact()) {
      hint('React to it, or click a box', 'Enter: redraw · empty Enter: team, go');
      const inp = document.getElementById('her-input');
      if (inp) inp.dataset.voice = 'reaction'; // voice.js puts its mic mark on it; her words arrive as an 'input' event
    }
  }
  function onError(ev) {
    if (ev.reshape) { S.state = 'landed'; setTag('Design could not redraw it: try saying it another way'); return; }
    S.state = 'off';
    if (S.bar) S.bar.hidden = true;
    if (canReact()) hint('One step of the journey', 'Enter for each step · empty Enter: team, go');
    if (typeof B.status === 'function') B.status('Design could not sketch it: write the journey instead');
  }
  // The guest chair: a stand-in for her customer, pulled up as the sketch lands.
  function onGuest(ev) {
    const room = B.el && B.el.room;
    if (!room) return;
    if (!S.guest || !S.guest.isConnected) { S.guest = h('section', 'guest-card'); S.guest.setAttribute('aria-label', 'Guest chair'); S.guest.dataset.seat = 'guest'; room.appendChild(S.guest); }
    const g = S.guest;
    g.innerHTML = '';
    g.className = 'guest-card fs-in';
    const head = h('div', 'guest-head');
    head.append(h('span', 'guest-tag', 'GUEST'), h('span', 'guest-who', ev.persona || ev.userType || 'a customer'));
    const pts = h('ul', 'guest-points');
    for (const p of ev.points || []) {
      const li = h('li'); li.append(h('b', null, p.id), document.createTextNode(p.text));
      if (p.check) { li.append(' '); li.append(h('i', null, `(${p.check})`)); }
      pts.appendChild(li);
    }
    g.append(head, h('div', 'guest-note', ev.label || 'a stand-in for your customer, not a real one'), h('p', 'guest-says', `“${ev.reaction}”`), pts);
    g.hidden = false;
  }
  function clear() {
    Object.assign(S, { state: 'off', run: null, lines: [], users: [], freshUsers: true });
    closePop();
    if (S.guest) S.guest.hidden = true;
    if (S.bar) { S.bar.hidden = true; S.list.innerHTML = ''; S.tag.textContent = ''; S.said.textContent = ''; S.tag.classList.remove('prepared'); }
  }
  if (typeof B.on === 'function') {
    B.on('sketch.user', onUser);
    B.on('flow.line', onLine);
    B.on('flow.reset', onReset);
    B.on('reshape', onReshape);
    B.on('sketch.done', onDone);
    B.on('sketch.error', onError);
    B.on('guest', onGuest);
    B.on('reset', clear);
  }

  // ---- her side ----
  async function start(run, idea) {
    if (!run || String(run).startsWith('local-') || B.replay) return null;
    S.run = run; S.state = 'pending'; S.freshUsers = true;
    setTag('Design is sketching');
    hint('Design is sketching… or type your own steps', 'Enter for each step');
    try { return await B.api(`/api/run/${encodeURIComponent(run)}/sketch`, { idea }, { step: false }); }
    catch (e) { if (S.state === 'pending') onError({}); return null; }
  }
  // The room hands her typed (or spoken) line here first. True when it was a reaction to the sketch.
  function takes(text) {
    if (!text) return false;
    if (S.state === 'busy') return true; // one redraw at a time; her words stay in the box
    if (S.state !== 'landed' || !canReact()) return false;
    reshape(text);
    return true;
  }
  async function reshape(text) {
    S.state = 'busy';
    try { return await B.api(`/api/run/${encodeURIComponent(B.run)}/reshape`, { text }, { step: false }); }
    catch (e) { if (S.state === 'busy') onError({ reshape: true }); return null; }
  }
  async function edit(lines) {
    return B.api(`/api/run/${encodeURIComponent(B.run)}/flow`, { lines }, { step: false });
  }

  // ---- a click on a box: rename it, strike it, or add one after it ----
  function lineEdit(lines, label, op, value) {
    const k = norm(label);
    const out = [];
    let done = false;
    for (const line of lines) {
      const parts = line.split(ARROW);
      const i = done ? -1 : parts.findIndex((p, j) => norm(p) === k && (parts.length === 1 || j > 0));
      if (i < 0) { out.push(line); continue; }
      done = true;
      if (op === 'rename') { parts[i] = value; out.push(parts.join(' → ')); }
      else if (op === 'strike') { parts.splice(i, 1); if (parts.length > (line.match(ARROW) ? 1 : 0)) out.push(parts.join(' → ')); }
      else if (op === 'add') { out.push(line, value); }
    }
    return out;
  }
  function closePop() { if (S.pop) { S.pop.remove(); S.pop = null; } }
  function onBoxClick(e) {
    const box = e.target.closest && e.target.closest('.fl-box');
    if (!box || S.state !== 'landed' || !canReact()) return;
    e.stopPropagation(); e.preventDefault();
    openPop(box);
  }
  function openPop(box) {
    closePop();
    const sheet = B.el.herSheet;
    const label = box.querySelector('.fl-label')?.textContent || box.textContent;
    const sr = sheet.getBoundingClientRect(), br = box.getBoundingClientRect();
    const k = sr.width / (sheet.offsetWidth || sr.width) || 1;
    const pop = h('div', 'fs-pop');
    pop.style.left = Math.max(8, (br.left - sr.left) / k) + 'px';
    pop.style.top = ((br.bottom - sr.top) / k + 6) + 'px';
    const inp = h('input'); inp.value = label; inp.setAttribute('aria-label', 'Rename the box');
    const strike = h('button', null, 'strike'); strike.type = 'button';
    const add = h('button', null, '+ box after'); add.type = 'button';
    pop.append(inp, strike, add);
    sheet.appendChild(pop);
    S.pop = pop;
    let adding = false;
    const go = async (op, value) => {
      const lines = lineEdit(S.lines, label, op, value);
      closePop();
      if (!lines.length || JSON.stringify(lines) === JSON.stringify(S.lines)) return;
      try { await edit(lines); } catch (err) { if (typeof B.status === 'function') B.status('edit not saved'); }
    };
    inp.addEventListener('keydown', ev => {
      ev.stopPropagation(); // keep the room's beat keys away while she types
      if (ev.key === 'Escape') closePop();
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const v = inp.value.trim();
        if (adding) { if (v) go('add', v); else closePop(); }
        else if (!v) go('strike');
        else if (v !== label) go('rename', v);
        else closePop();
      }
    });
    strike.addEventListener('click', () => go('strike'));
    add.addEventListener('click', () => { adding = true; inp.value = ''; inp.placeholder = 'New box'; inp.setAttribute('aria-label', 'New box'); add.hidden = true; strike.hidden = true; inp.focus(); });
    inp.focus(); inp.select(); // now, so her first keystroke never lands on the box button behind
  }
  document.addEventListener('mousedown', e => { if (S.pop && !S.pop.contains(e.target) && !(e.target.closest && e.target.closest('.fl-box'))) closePop(); });

  // ---- the close: the judge's idea gets the same first sketch, drawn into the close's own sheet ----
  // Resolves to { users, stages, nodes, edges, ms, prepared }, or null. Pass `stages` as `lines` to
  // /api/select-for-idea so the team's first check-in lands on this shape.
  async function forIdea(idea, host, { dripMs = 160 } = {}) {
    let r;
    try { r = await B.api('/api/sketch-for-idea', { idea }, { step: false }); } catch (e) { return null; }
    if (!host) return r;
    host.innerHTML = '';
    const wrap = h('div', 'fs-close-sketch');
    const users = h('div', 'fs-users'), mini = h('div', 'fs-mini');
    const tag = h('span', 'fs-tag' + (r.prepared ? ' prepared' : ''), r.prepared ? 'PREPARED' : `Design's first sketch · ${(r.ms / 1000).toFixed(1)} s`);
    wrap.append(h('span', 'fs-who', 'Who'), users, mini, tag);
    host.appendChild(wrap);
    const wait = ms => new Promise(res => setTimeout(res, ms));
    for (const u of r.users) { users.appendChild(h('span', 'fs-user fs-in', u.label)); await wait(dripMs); }
    for (let i = 0; i < r.nodes.length; i++) {
      if (i) mini.appendChild(h('span', 'fs-arrow fs-in', '→'));
      const b = h('span', 'fs-box fs-in', r.nodes[i].label); b.dataset.node = r.nodes[i].id;
      mini.appendChild(b);
      await wait(dripMs);
    }
    return r;
  }

  B.firstSketch = { start, takes, reshape, edit, forIdea, lineEdit, get state() { return S.state; }, get lines() { return S.lines.slice(); } };
})();
