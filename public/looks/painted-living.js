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

  const frame = document.createElement('iframe');
  frame.className = 'painted-living';
  frame.title = '';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  const night = q.get('night') === '1' || (q.get('night') !== '0' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  frame.src = '/looks/comps/cast-living.html?embed=1&run=0' + (night ? '&night=1' : '&time=morning');
  document.body.prepend(frame);
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
  BYOC.on('decided', ev => run('done', ev.seat));                      // its signature move; the others perk up
  BYOC.on('joint.agreed', ev => call(l => l.run({ type: 'agree', seats: (ev.seats || []).map(s => WHO[s]).filter(Boolean) })));
  BYOC.on('build.done', () => call(l => l.run({ type: 'milestone' })));
  BYOC.on('teammate.done', ev => run('idle', ev.seat));

  // focus wins: while a focus document is open the room holds still
  BYOC.on('focus.open', () => call(l => l.focus(true)));
  BYOC.on('focus.close', () => call(l => l.focus(false)));
  BYOC.on('focus', f => { if (f && !f.open) call(l => l.focus(false)); });

  // time of day from the run's progress: morning before the team starts, building while it works, evening once her
  // page is built. Night (?night=1, or a dark laptop) holds all run long.
  let tod = night ? 'night' : 'morning';
  const to = t => { if (night || t === tod) return; tod = t; call(l => l.setTime(t)); };
  BYOC.on('teammate.start', () => to('building'));
  BYOC.on('build.step', () => to('building'));
  BYOC.on('build.done', () => setTimeout(() => to('evening'), 9000));   // after the celebration
  BYOC.on('reset', () => { if (!night) { tod = 'morning'; call(l => l.setTime('morning')); } });
})();
