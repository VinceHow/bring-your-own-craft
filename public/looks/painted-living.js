// The painted living layer, loaded only with ?look=painted. It mounts the living painting (looks/comps/cast-living.html
// in embed mode) as the room's backdrop and turns the room's run events into the teammates' moods. It draws no chat
// bubbles (the room's UI does) and adds no randomness: every mood comes from a real event. If anything here fails to
// load, the plain look underneath keeps working.
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);
  if ((q.get('look') || '').toLowerCase() !== 'painted') return;
  const BYOC = window.BYOC;
  if (!BYOC || typeof BYOC.on !== 'function') return;

  // seats in the room -> teammates in the painting (product is her seat: no character)
  const WHO = { design: 'mika', research: 'noor', data: 'theo', strategy: 'ines', engineering: 'bo' };

  const room = document.getElementById('room');
  if (!room) return;
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/looks/painted-living.css'; document.head.appendChild(css);

  const frame = document.createElement('iframe');
  frame.className = 'painted-living';
  frame.dataset.component = 'living-backdrop';                       // playful-ink keeps its still night plate off over it
  frame.title = '';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  // The time mode, remembered per viewer: 'cycle' (the run drives morning -> building -> evening, the default),
  // 'day' (always afternoon) or 'night' (always night). ?night=1 / ?night=0 override it for one visit.
  let mode = 'cycle';
  try { const m = localStorage.getItem('byoc.timeMode'); if (m === 'day' || m === 'night' || m === 'cycle') mode = m; } catch (e) { /* no storage */ }
  if (q.get('night') === '1') mode = 'night'; else if (q.get('night') === '0' && mode === 'night') mode = 'day';
  const night = mode === 'night';
  frame.src = '/looks/comps/cast-living.html?embed=1&run=0' + (night ? '&night=1' : mode === 'day' ? '&time=afternoon' : '&time=morning');
  room.prepend(frame);                                                // first child of #room, z-index 0: under every UI layer
  document.documentElement.classList.add('painted-on');

  // The living page exposes window.living once it has started. Events that arrive earlier wait in a short queue.
  let living = null; const pending = [];
  function call(fn) { if (living) { try { fn(living); } catch (e) { console.warn('painted-living', e); } } else if (pending.length < 50) pending.push(fn); }
  const poll = setInterval(() => {
    let l = null; try { l = frame.contentWindow && frame.contentWindow.living; } catch (e) { /* not ready */ }
    if (!l) return;
    clearInterval(poll); living = l;
    while (pending.length) call(pending.shift());
  }, 200);
  setTimeout(() => clearInterval(poll), 20000);                       // never loaded: the plain look stays
  frame.addEventListener('error', () => { frame.remove(); document.documentElement.classList.remove('painted-on'); });
  // a hard stop: if the painting hasn't started within 20 s, take it out so the plain look shows as it was
  setTimeout(() => { if (!living) { frame.remove(); document.documentElement.classList.remove('painted-on'); delete room.dataset.scene; } }, 20000);

  const run = (type, seat, extra) => {
    const who = seat ? WHO[seat] : undefined;
    if (seat && !who) return;                                          // her seat, or one we don't paint
    call(l => l.run(Object.assign({ type, who }, extra || {})));
  };

  // run events -> moods (no text: the room draws its own lines)
  BYOC.on('teammate.start', ev => run('start', ev.seat));
  BYOC.on('teammate.thinking', ev => run('think', ev.seat));
  BYOC.on('chatter', ev => run('say', ev.seat));
  BYOC.on('chime', ev => run('say', ev.seat));
  BYOC.on('ask', ev => run('found', ev.seat));                         // holding up a note: it brings her one
  BYOC.on('candidate', ev => run('start', ev.seat));
  BYOC.on('sketch.user', () => run('start', 'research'));             // the first sketch: Noor pictures the users,
  BYOC.on('flow.line', () => run('start', 'design'));                  // Mika draws the journey, heads down                   // proposing: at work, head down
  BYOC.on('decided', ev => run('done', ev.seat));                      // its signature move; the others perk up
  BYOC.on('joint.agreed', ev => call(l => l.run({ type: 'agree', seats: (ev.seats || []).map(s => WHO[s]).filter(Boolean) })));
  BYOC.on('build.done', () => call(l => l.run({ type: 'milestone' })));
  BYOC.on('teammate.done', ev => run('idle', ev.seat));
  BYOC.on('action.yes', ev => {                                     // she said Yes to its ask: that teammate is delighted
    let seat = ev && ev.seat;
    if (!seat && ev && ev.id) { const c = document.querySelector(`.inbox-action[data-action="${CSS.escape(ev.id)}"]`); seat = c && c.dataset.seat; }
    run('delighted', seat);
  });          // she said Yes to its ask: that teammate is delighted

  // focus wins: while a focus document is open the room holds still
  BYOC.on('focus.open', () => call(l => l.focus(true)));
  BYOC.on('focus.close', () => call(l => l.focus(false)));
  BYOC.on('focus', f => { if (f && !f.open) call(l => l.focus(false)); });

  // time of day from the run's progress: morning before the team starts, building while it works, dusk (evening) a beat
  // after her page is built, then night (the lamps on) 40 s later, as the close comes up. That's the 'cycle' mode; 'day'
  // and 'night' hold one scene all run long.
  // Tempo, for a 3-minute demo: the run's changes crossfade slowly (3 s) and come at most one per 40 s, so the audience
  // notices the day passing without it pulling their eye; a tap on the time pill answers at once (0.8 s).
  // #room[data-scene] follows the painting, so each painting can place the room's pills its own way
  let cycleAt = 'morning';                                            // where the run has got to, whatever the mode
  const shown = () => mode === 'night' ? 'night' : mode === 'day' ? 'afternoon' : cycleAt;
  let tod = shown();
  room.dataset.scene = tod;
  const RUN_FADE = 3, GAP = 40000, DUSK = 3000;
  const show = (fade) => {
    const t = shown(); if (t === tod) return false;
    tod = t; room.dataset.scene = t; call(l => l.setTime(t, { fade: fade || .8 }));
    document.dispatchEvent(new CustomEvent('studio:time', { detail: { time: t, mode, from: 'painted-living' } }));
    return true;
  };
  // the run's changes: slow, and spaced; a change that comes too soon waits its turn (the latest one wins)
  let lastRun = 0, waitT = 0, nightT = 0;
  const pace = () => {
    clearTimeout(waitT);
    if (mode !== 'cycle') return;
    const wait = lastRun + GAP - Date.now();
    if (wait > 0) { waitT = setTimeout(pace, wait); return; }
    if (show(RUN_FADE)) lastRun = Date.now();
  };
  const step = t => { cycleAt = t; pace(); };
  BYOC.on('teammate.start', () => { if (cycleAt === 'morning') step('building'); });
  BYOC.on('build.step', () => { if (cycleAt === 'morning') step('building'); });
  BYOC.on('build.done', () => {                                       // dusk a beat after it's built, then the lamps
    clearTimeout(nightT);
    nightT = setTimeout(() => { step('evening'); nightT = setTimeout(() => step('night'), GAP); }, DUSK);
  });
  BYOC.on('reset', () => {                                            // setup, not the run: straight back to morning
    clearTimeout(nightT); clearTimeout(waitT); lastRun = 0; cycleAt = 'morning'; if (mode === 'cycle') show();
  });
  // tell the other layers where we start (PlayfulInk reads the mode itself; this is the scene)
  setTimeout(() => document.dispatchEvent(new CustomEvent('studio:time', { detail: { time: tod, mode, from: 'painted-living' } })), 0);

  // shared with the other painted layers (PlayfulInk owns the toys and the day/night toggle):
  //   document 'studio:time' {time: morning|afternoon|building|evening|night} sets the painting's time of day;
  //   document 'studio:poke' {obj: record|cat|coffee} plays that object's clip (PlayfulInk draws hearts, notes, steam, music).
  //   'studio:time' {mode: cycle|day|night} from the pill switches the mode; this layer answers with {time, mode} when the scene changes.
  document.addEventListener('studio:time', e => {
    const d = e.detail || {}; if (d.from === 'painted-living') return;
    if (d.mode === 'cycle' || d.mode === 'day' || d.mode === 'night') mode = d.mode;
    else if (d.time) { mode = d.time === 'night' ? 'night' : 'day'; }  // an older caller naming a time pins it
    else return;
    clearTimeout(waitT); show();                                      // her tap: at once, 0.8 s
  });
  document.addEventListener('studio:poke', e => { const o = e.detail && e.detail.obj; if (o) call(l => l.poke(o)); });
})();
