// R: replay a recorded run (runs/<name>/events.jsonl via GET /api/replay/:name) with its own timings.
// F: play the fake fixture run (public/fixtures/), for building the room before the pipeline lands.
// A label sits on screen for as long as either is showing: REPLAY for a recorded run, FAKE for the fixture.
(function () {
  'use strict';
  const BYOC = window.BYOC;
  const label = document.getElementById('replay-label');
  const q = new URLSearchParams(location.search);
  const SPEED = Number(q.get('speed')) || 1; // 1 = the run's own timings
  let timers = [];

  function clear() { timers.forEach(clearTimeout); timers = []; }
  BYOC.on('reset', () => { clear(); label.hidden = true; label.className = 'replay-label'; });

  function showLabel(kind, name, firstT) {
    label.hidden = false;
    if (kind === 'fixture') {
      label.className = 'replay-label fake';
      label.innerHTML = 'Fake run<small>fixture for building the room · not a real run</small>';
    } else {
      label.className = 'replay-label';
      const when = firstT ? new Date(firstT).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      label.innerHTML = `Replay<small>recorded run “${name}”${when ? ' · ' + when : ''}</small>`;
    }
  }

  // Taste lines written during the run are removed from the opening file, so they appear when their event plays.
  function openingFile(md, events) {
    const later = new Set(events.filter(e => e.type === 'taste.written').map(e => e.id));
    return String(md || '').split('\n').filter(l => { const m = l.match(/\[(L\d+)\]/); return !m || !later.has(m[1]); }).join('\n');
  }

  function play(events, { kind, name, taste }) {
    BYOC.reset();
    events = events.filter(e => e && e.type).sort((a, b) => a.t - b.t);
    if (!events.length) { BYOC.status(`run "${name}" has no events`); return; }
    BYOC.replay = true;
    BYOC.replayKind = kind;
    BYOC.run = events[0].run || name;
    showLabel(kind, name, events[0].t);
    BYOC.stage(2, { instant: true }); // the team is already seated when a replay starts
    BYOC.stage(3, { instant: true });
    if (taste) BYOC.file.load(openingFile(taste, events), kind === 'fixture' ? 'Fixture file, not hers.' : '');
    BYOC.status(`${kind === 'fixture' ? 'fake fixture' : 'replay'} ${name} · ${events.length} events · speed ${SPEED}`);
    const t0 = events[0].t;
    const runAtStart = BYOC.run;
    for (const ev of events) {
      timers.push(setTimeout(() => {
        if (!BYOC.replay || BYOC.run !== runAtStart) return;
        BYOC.dispatch(ev, 'replay');
      }, Math.max(0, (ev.t - t0) / SPEED)));
    }
  }

  BYOC.replayRun = async function (name) {
    let r;
    try { r = await BYOC.api(`/api/replay/${encodeURIComponent(name)}`); }
    catch (e) { BYOC.status(`no recorded run "${name}" yet (${e.status || e.message})`); return; }
    play(r.events || [], { kind: 'recorded', name, taste: r.taste });
  };

  BYOC.playFixture = async function () {
    try {
      const [ev, taste] = await Promise.all([
        fetch('fixtures/fake-run.jsonl').then(r => r.text()),
        fetch('fixtures/fake-taste.md').then(r => (r.ok ? r.text() : '')),
      ]);
      const events = ev.split('\n').filter(Boolean).map(l => JSON.parse(l));
      play(events, { kind: 'fixture', name: 'fixture', taste });
    } catch (e) { BYOC.status(`fixture failed: ${e.message}`); }
  };

  if (q.get('fixture') === '1') document.addEventListener('DOMContentLoaded', () => setTimeout(BYOC.playFixture, 50));
  if (q.get('autoreplay')) document.addEventListener('DOMContentLoaded', () => setTimeout(() => BYOC.replayRun(q.get('autoreplay')), 50));
})();
