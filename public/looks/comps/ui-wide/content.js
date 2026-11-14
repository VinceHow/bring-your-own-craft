// Shared content for the wide UI exploration (ui-glass.html, ui-film.html): the same parts, room and focus document in
// every direction, so they compare fairly. Text from painted-system.html. Each page brings its own CSS and motion.
// Views: ?view=parts|room|focus · ?still=1 for the end state · ?pop=0 hides Noor's popover in the room.
(function () {
  'use strict';
  const PILLS = [
    { who: 'mika', name: 'Mika', x: 262, y: 258 },
    { who: 'noor', name: 'Noor', x: 560, y: 220 },
    { who: 'theo', name: 'Theo', x: 770, y: 262 },
    { who: 'ines', name: 'Ines', x: 1062, y: 228 },
    { who: 'bo', name: 'Bo', x: 1236, y: 330 },
  ];
  const pill = (p, cls = '') => `<button class="pill ${cls}" data-who="${p.who}" type="button"><span class="dot"></span><span class="nm">${p.name}</span><span class="agent">agent</span></button>`;
  const herPill = (cls = '') => `<button class="pill is-her ${cls}" data-who="her" type="button"><span class="dot">P</span><span class="nm">Priya</span><span class="agent">the Customer Whisperer</span></button>`;
  const invite = `<button class="pill is-invite" data-who="her" type="button"><span class="dot"></span><span class="nm">Take your seat</span></button>`;
  const bubble = (who, name, text) => `<div class="bubble" data-who="${who}"><b>${name}</b><span class="t">${text}</span></div>`;
  const note = `<div class="note" data-who="noor"><span class="lab"><i></i>Noor</span><span class="t">What sells out first, and what should we do about it?</span></div>`;
  const decision = `<div class="decision"><span class="t">Orders close at 8pm for the next morning.</span>
    <span class="by"><span class="marks"><i data-who="bo"></i><i data-who="ines"></i><i data-who="mika"></i></span><span class="lab">Bo, Ines and Mika</span></span></div>`;
  const sheet = (big) => `<div class="sheet"><span class="lab">Her idea · rough journey by Noor and Mika</span>
    <h3>A website for a small bakery, so customers can order bread ahead.</h3>
    ${big ? '' : '<div class="steps"><span class="step hers">Their usual loaf</span><span class="step hers">One tap</span><span class="step">Held till ten</span></div>'}
    <div class="tabs" role="tablist"><span class="on">Journey</span><span>Screens</span><span>Page</span></div></div>`;
  const pop = `<div class="pop" data-who="noor"><div class="pop-head"><span class="dot"></span><span class="nm">Noor</span><span class="lab">Research</span></div>
    <span class="lab">Working on</span><p class="t">What sells out first at small bakeries</p>
    <span class="lab">Settled</span><ul><li>Sourdough and morning buns go before 9am</li><li>Two sources, both linked</li></ul></div>`;
  const btns = `<div class="btns"><button class="btn" type="button">Build it</button><button class="btn quiet" type="button">Back to the room</button></div>`;
  const tally = `<span class="tag tally"><b>24</b> handled by your team · <b>3</b> for you</span>`;
  const replay = `<span class="tag replay">Replay<small>recorded run</small></span>`;

  const PARTS = `<section class="view v-parts">
    <div class="board">
      <header class="b-head"><h1 class="b-title"></h1><p class="b-lede"></p></header>
      <div class="cell c-pills"><h2>Who’s who</h2><div class="row">${PILLS.map((p, i) => pill(p, ['', 'is-hover', 'is-talking', '', ''][i])).join('')}</div>
        <div class="row">${invite}${herPill()}</div><p class="cap">Rest · hover · talking · her seat, before and after</p></div>
      <div class="cell c-chat"><h2>Chatter</h2>${bubble('bo', 'Bo', 'Orders after 8pm miss the morning bake.')}</div>
      <div class="cell c-note"><h2>A note for her</h2>${note}</div>
      <div class="cell c-dec"><h2>Decided together</h2>${decision}</div>
      <div class="cell c-sheet"><h2>Her sheet</h2>${sheet(true)}</div>
      <div class="cell c-pop"><h2>A teammate’s work</h2>${pop}</div>
      <div class="cell c-act"><h2>Actions and quiet labels</h2>${btns}<div class="row">${tally}${replay}</div></div>
    </div></section>`;

  const ROOM = `<section class="view v-room">
    ${PILLS.map(p => `<div class="at" style="left:${p.x}px;top:${p.y}px" data-in>${pill(p, p.who === 'bo' ? 'is-talking' : p.who === 'noor' ? 'is-open' : '')}</div>`).join('')}
    <div class="at a-bubble" style="left:1250px;top:232px" data-in>${bubble('bo', 'Bo', 'Orders after 8pm miss the morning bake.')}</div>
    <div class="at a-pop" style="left:222px;top:26px">${pop}</div>
    <div class="at a-sheet" style="left:586px;top:494px" data-in>${sheet(false)}</div>
    <div class="at a-dec" style="left:1062px;top:716px" data-in>${decision}</div>
    <div class="glow"></div>
    <div class="at a-her" style="left:584px;top:664px" data-in>${herPill()}</div>
    <div class="at a-note" style="left:812px;top:758px" data-in>${note}</div>
    <div class="at a-tally" style="right:22px;bottom:20px">${tally}</div>
    <div class="at a-replay" style="right:22px;top:18px">${replay}</div>
  </section>`;

  const FOCUS = `<section class="view v-focus">
    <div class="doc">
      <div class="main">
        <span class="lab">From Noor and Mika · the rough journey</span>
        <h1>A website for a small bakery, so customers can order bread ahead.</h1>
        <div class="jr"><span></span><span class="h">Choose</span><span class="h">Order</span><span class="h">Pick up</span>
          <span class="who">Morning regulars</span><span class="step hers">Their usual loaf</span><span class="step hers">One tap</span><span class="step">Held till ten</span>
          <span class="who">Weekend crowd</span><span class="step">Browse pastries</span><span class="step">Order by Friday</span><span class="step">Collect Saturday</span></div>
        <p class="q">What do people come to a bakery like this for that they can’t get at the supermarket?</p>
        <p class="said">Bread that’s still warm, and being known. The regulars come every morning, and they hate it when the sourdough’s gone by nine.</p>
      </div>
      <aside class="side">
        <span class="lab">The team</span>
        ${bubble('mika', 'Mika', 'Love that. Regulars first, their usual loaf one tap away.')}
        ${bubble('bo', 'Bo', 'Then we hold it for them till ten.')}
        ${bubble('ines', 'Ines', 'Hmm, regulars might want a standing weekly order. Show that first?')}
        <div class="take"><span class="lab">Your takeaways</span><p class="b">People come for bread that’s still warm, and for being known.</p>
          <p class="g"><em>Guidance</em>Their usual loaf first, one tap away.</p></div>
        <div class="btns"><button class="btn" type="button">Send to the team</button><button class="btn quiet" type="button">Back to the room</button></div>
      </aside>
    </div>
    <div class="at a-replay" style="right:22px;top:18px">${replay}</div>
  </section>`;

  const q = new URLSearchParams(location.search);
  const view = ['parts', 'room', 'focus'].includes(q.get('view')) ? q.get('view') : 'room';
  const c = document.getElementById('c');
  c.dataset.view = view;
  c.insertAdjacentHTML('beforeend', '<div class="painting"></div>' + (view === 'parts' ? PARTS : view === 'focus' ? FOCUS : ROOM));
  if (q.get('pop') === '0') { const p = c.querySelector('.a-pop'); if (p) p.remove(); }
  window.UIW = { view, still: q.get('still') === '1', c };
})();
