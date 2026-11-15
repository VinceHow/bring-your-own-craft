// The close (DEMO 2:32-3:00). J (or beat 11) opens it. Vincent types a judge's idea; it goes to
// POST /api/select-for-idea (about 15 s). In order:
//   1. the idea is typed;
//   2. while the team works, the contrast: the baseline coding agent asked 0 and guessed N (counted from
//      docs/baseline/GUESSES.md via GET /api/baseline);
//   3. the judge's questions land (as many as the run's log has; sized for 1-5), with the counter and each "why";
//   4. her "A asked, M decided from her file", counted from the log of the run on screen (decided events citing
//      a line of her file). No run, or M = 0: nothing is shown rather than a 0;
//   5. the built-this-way line (DEMO.md).
// R or C in the close replays the yoga run's check-in instead (labelled REPLAY), the judge's-idea fallback.
(function () {
  'use strict';
  const BYOC = window.BYOC;
  const M = window.Motion || null;
  const SPRING = { type: 'spring', stiffness: 500, damping: 30 };
  const SEAT_INK = { product: '#FF48B0', design: '#0078BF', data: '#00A95C', research: '#FF6C2F', strategy: '#BB8B41', engineering: '#FFE800' };
  const BUILT = 'This project was built the same way. Tomorrow, the engineer at this table is a person, with their own team.';

  const room = document.getElementById('room');
  const sheet = document.createElement('section');
  sheet.id = 'close-sheet'; sheet.className = 'close-sheet'; sheet.hidden = true;
  sheet.dataset.component = 'close-view'; sheet.dataset.state = 'asking';
  sheet.innerHTML = `
    <div class="close-left">
      <div class="close-pile" aria-hidden="true">${'<i></i>'.repeat(9)}</div>
      <div class="close-them" data-slot="them">
        <div class="close-label">A default coding agent</div>
        <div class="close-big"><b id="close-b-asked">0</b> asked <span>·</span> <b class="red" id="close-b-guessed">–</b> guessed</div>
        <div class="close-src" id="close-b-src"></div>
      </div>
      <div class="close-her" id="close-her" data-slot="her" hidden>
        <div class="close-label">In the Product seat</div>
        <div class="close-big"><b class="pink" id="close-asked"></b> asked <span>·</span> the rest handled by the team</div>
        <div class="close-src" id="close-her-src"></div>
      </div>
      <p class="close-built" id="close-built" hidden>${BUILT}</p>
    </div>
    <div class="close-right">
      <div class="close-label">A judge’s idea</div>
      <form id="close-form" autocomplete="off"><input id="close-input" class="close-input" data-slot="input" data-voice="close" spellcheck="false" placeholder="Type the idea"><button type="submit" class="close-make" id="close-make" data-slot="make" data-state="off" aria-disabled="true">Build it →</button></form>
      <div class="close-step" id="close-step"></div>
      <div class="close-sketch" id="close-sketch" data-slot="sketch"></div>
      <div class="close-count" id="close-count" data-slot="count"></div>
      <ol class="close-asks" id="close-asks"></ol>
    </div>`;
  room.appendChild(sheet);
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // The one primary action on the close: "Build it →" (Enter does the same). Hooks: [data-slot="make"][data-state]:
  // off (nothing typed), ready, working (pressed: tidying, then the run), done (a run or a replay holds the idea).
  function make(state) {
    const b = $('close-make') || sheet.querySelector('[data-slot="make"]'); if (!b) return;
    const inp = $('close-input');
    if (!state) state = inp.readOnly ? 'done' : inp.value.trim() ? 'ready' : 'off';
    b.dataset.state = state; b.setAttribute('aria-disabled', String(state !== 'ready'));
    b.textContent = state === 'working' ? 'Building…' : 'Build it →';
  }
  let ticker = null, token = 0, baseline = null, her = null;

  // The baseline, counted from GUESSES.md on the server. If it can't be read, the pile shows no number.
  async function loadBaseline() {
    if (baseline) return baseline;
    try { baseline = await BYOC.api('/api/baseline', undefined, { step: false }); } catch { baseline = null; }
    $('close-b-guessed').textContent = baseline ? baseline.guessed : '–';
    $('close-b-src').textContent = baseline ? baseline.source : 'baseline count not found';
    return baseline;
  }

  // Her numbers, from the log of the run on screen: asked = her asks; M = distinct decisions (not asked) whose
  // latest decided event cites a line of her file (L<n>), as lib/tally.js counts them.
  function countFromLog(evs) {
    const asked = new Set(evs.filter(e => e.type === 'ask').map(e => e.id));
    const latest = new Map();
    for (const e of evs) if (e.type === 'decided' && !asked.has(e.id)) latest.set(e.id, e);
    const fromFile = [...latest.values()].filter(d => /^L\d+$/.test(String(d.cites))).length;
    return { asked: asked.size, fromFile };
  }
  BYOC.countFromLog = countFromLog;
  async function herNumbers() {
    her = null;
    const run = BYOC.replay ? BYOC.replayName : BYOC.run;
    if (!run || String(run).startsWith('local-') || BYOC.replayKind === 'fixture') return null;
    let evs;
    try { evs = (await BYOC.api(`/api/replay/${encodeURIComponent(run)}`, undefined, { step: false })).events || []; }
    catch { return null; }
    const n = countFromLog(evs);
    her = { ...n, run, replay: !!BYOC.replay };
    return her;
  }

  function isOpen() { return !sheet.hidden; }
  function open() {
    if (isOpen()) { $('close-input').focus(); return; }
    sheet.hidden = false;
    if (M) M.animate(sheet, { y: [-60, 0], x: [700, 0], rotate: [3, 0.4] }, SPRING);
    clearOut();
    $('close-input').value = ''; $('close-input').readOnly = false; make();
    loadBaseline(); herNumbers();
    $('close-input').focus({ preventScroll: true }); // at once: the presenter may already be typing
  }
  function clearOut() {
    token++; clearInterval(ticker);
    sheet.querySelector('.close-left').classList.remove('on');
    sheet.dataset.phase = 'idea'; sheet.dataset.state = 'asking';
    $('close-her').hidden = true; $('close-built').hidden = true;
    $('close-asks').innerHTML = ''; $('close-asks').style.transform = ''; $('close-count').innerHTML = ''; $('close-step').textContent = '';
    $('close-sketch').innerHTML = '';
    $('close-step').classList.remove('slow');
  }
  function close() {
    sheet.hidden = true; clearOut();
    if (BYOC.closeReplayLabel) { BYOC.closeReplayLabel = false; BYOC.replay ? BYOC.replayLabel?.('recorded', BYOC.replayName) : BYOC.replayLabel?.(null); }
  }

  function showContrast() {
    const left = sheet.querySelector('.close-left');
    left.classList.add('on');
    sheet.dataset.phase = 'working'; sheet.dataset.state = 'contrast';
    BYOC.timings.contrastAt = Date.now();
    if (!M) return;
    [...left.querySelectorAll('.close-pile i')].forEach((c, i) =>
      M.animate(c, { y: [-260, 0], rotate: [0, (i % 2 ? 1 : -1) * (2 + (i * 7) % 9)] }, { ...SPRING, delay: i * 0.06 }));
    M.animate(left.querySelector('.close-them'), { x: [-40, 0] }, SPRING);
  }

  function landAsks(r, my) {
    BYOC.timings.asksAt = Date.now();
    sheet.dataset.phase = 'landed';
    $('close-count').innerHTML = `<b>${Math.max(0, r.came - r.brought)}</b> handled by the team · <b class="pink">${r.brought}</b> for you`;
    // One check-in at a time (DEMO 2:38): the team's first lands, in its teammate's voice, on Design's sketch.
    (r.asks || []).slice(0, 1).forEach((a, i) => {
      const li = document.createElement('li');
      li.dataset.ask = a.id || '';
      li.style.setProperty('--seat', SEAT_INK[a.seat] || '#141414');
      const node = a.attachTo && document.querySelector(`#close-sketch .fs-box[data-node="${a.attachTo}"]`);
      if (node) node.classList.add('close-on');
      li.innerHTML = `<span class="close-seat" data-slot="who">${esc(a.by ? `${a.by} · ${a.seat}` : a.seat)}${node ? ` · on “${esc(node.textContent)}”` : ''}</span><span class="close-q" data-slot="question">${esc(a.question || a.decision)}</span>`;
      $('close-asks').appendChild(li);
      if (M) M.animate(li, { x: [60, 0], y: [-20, 0], rotate: [4, -0.8] }, SPRING);
    });
    fitAsks(); setTimeout(fitAsks, 120);
    // Then her line, then the last line.
    (async () => {
      await wait(900 + 250 * (r.asks || []).length);
      if (my !== token) return;
      const h = await herNumbers(); // counted now: her run's log can still be growing (her takeaways, the team's mapping)
      if (my !== token) return;
      if (h && h.fromFile > 0) {
        $('close-asked').textContent = h.asked;
        $('close-her-src').innerHTML = `counted from this run’s log: <b id="close-decided">${h.fromFile}</b> decided from the file${h.replay ? ' · REPLAY' : ''}`;
        $('close-her').hidden = false;
        if (M) M.animate($('close-her'), { x: [-40, 0] }, SPRING);
        // Her log can still grow after this count (a revisit of a team agreement against her line lands a few seconds
        // later): keep the numbers on screen equal to the log while the close is up, for up to 30 s.
        (async () => {
          for (let i = 0; i < 20 && my === token && isOpen(); i++) {
            await wait(1500);
            if (my !== token || !isOpen()) return;
            const n = await herNumbers();
            if (my !== token || !n || n.fromFile <= 0) continue;
            if ($('close-decided') && $('close-decided').textContent !== String(n.fromFile)) $('close-decided').textContent = n.fromFile;
            if ($('close-asked').textContent !== String(n.asked)) $('close-asked').textContent = n.asked;
          }
        })();
        await wait(1200);
        if (my !== token) return;
      }
      $('close-built').hidden = false;
      sheet.dataset.phase = 'done';
      if (M) M.animate($('close-built'), { y: [16, 0] }, SPRING);
    })();
  }

  // Scale the questions down (never up) so all three fit the sheet; no scrolling on stage.
  function fitAsks() {
    const ol = $('close-asks'), right = sheet.querySelector('.close-right');
    ol.style.transform = '';
    const avail = right.getBoundingClientRect().bottom - ol.getBoundingClientRect().top;
    const scale = right.getBoundingClientRect().height / right.offsetHeight || 1; // the room's own fit scale
    const k = Math.min(1, avail / (ol.scrollHeight * scale || 1));
    if (k < 0.999) ol.style.transform = `scale(${k.toFixed(3)})`;
  }

  function tick(t0, my, label) {
    clearInterval(ticker);
    const step = () => {
      if (my !== token) return clearInterval(ticker);
      const ms = Date.now() - t0, slow = ms > (BYOC.SLOW_MS || 25000);
      $('close-step').classList.toggle('slow', slow);
      $('close-step').textContent = `${label} · ${Math.floor(ms / 1000)} s${slow ? ' · slow: R replays the yoga run' : ''}`;
    };
    step(); ticker = setInterval(step, 500);
  }

  async function run(idea) {
    const my = ++token;
    $('close-asks').innerHTML = ''; $('close-count').innerHTML = '';
    $('close-her').hidden = true; $('close-built').hidden = true;
    await loadBaseline();
    if (my !== token) return;
    showContrast();
    const t0 = Date.now();
    // Design's first sketch of their idea draws in; its stages are what the team's first check-in lands on.
    let lines = [];
    $('close-sketch').innerHTML = '';
    if (BYOC.firstSketch && BYOC.firstSketch.forIdea) {
      tick(t0, my, 'Design is sketching it'); sheet.dataset.state = 'sketching';
      const sk = await BYOC.firstSketch.forIdea(idea, $('close-sketch')).catch(() => null);
      if (my !== token) return;
      BYOC.timings.closeSketchMs = Date.now() - t0;
      if (sk && Array.isArray(sk.stages)) lines = sk.stages;
    }
    tick(t0, my, 'The team is on it');
    let r;
    try { r = await BYOC.api('/api/select-for-idea', lines.length ? { idea, lines } : { idea }, { step: false }); }
    catch (e) {
      clearInterval(ticker);
      if (my === token) { $('close-step').classList.add('slow'); $('close-step').textContent = `The team stopped (${e.status || e.message}). Build it again to retry, or R replays the yoga run.`; make(); }
      return;
    }
    clearInterval(ticker);
    if (my !== token) return;
    BYOC.timings.closeMs = Date.now() - t0;
    BYOC.timings.closeRun = r.run;
    $('close-step').classList.remove('slow');
    $('close-step').textContent = `${(BYOC.timings.closeMs / 1000).toFixed(1)} s · live run ${r.run}`;
    landAsks(r, my);
    make();
  }

  // The fallback: the yoga run's own check-in, from runs/yoga (a recorded real run), labelled REPLAY.
  async function replay(name = 'yoga') {
    if (!isOpen()) open();
    const my = ++token;
    clearInterval(ticker);
    let rec;
    try { rec = await BYOC.api(`/api/replay/${encodeURIComponent(name)}`, undefined, { step: false }); }
    catch (e) { if (my === token) $('close-step').textContent = `No recorded run “${name}” yet (${e.status || e.message}).`; return; }
    if (my !== token) return;
    const evs = (rec.events || []).slice().sort((a, b) => a.t - b.t);
    const start = evs.find(e => e.type === 'run.start');
    const asks = evs.filter(e => e.type === 'ask');
    BYOC.closeReplayLabel = true;
    BYOC.replayLabel?.('recorded', name, evs[0]?.t, 'the judge’s-idea fallback');
    $('close-input').value = start?.idea || ''; $('close-input').readOnly = true; $('close-input').blur(); make('done');
    $('close-sketch').innerHTML = '';
    $('close-asks').innerHTML = ''; $('close-count').innerHTML = '';
    $('close-her').hidden = true; $('close-built').hidden = true;
    await loadBaseline();
    if (my !== token) return;
    showContrast();
    // Its own timing from the log, capped: the presenter has already waited once.
    const t0 = Date.now(), took = asks.length && start ? asks.at(-1).t - start.t : 0;
    tick(t0, my, 'REPLAY · the yoga run');
    await wait(Math.min(took, 4000));
    clearInterval(ticker);
    if (my !== token) return;
    $('close-step').classList.remove('slow');
    $('close-step').textContent = `REPLAY of “${name}” · took ${(took / 1000).toFixed(1)} s when recorded`;
    landAsks({ came: evs.filter(e => e.type === 'candidate').length, brought: asks.length, asks }, my);
  }

  $('close-form').addEventListener('submit', async e => {
    e.preventDefault();
    if ($('close-input').readOnly) return;
    const raw = $('close-input').value.trim();
    if (!raw) { $('close-input').focus(); return; } // nothing typed: the button stays 'off', the caret waits in the box
    if ($('close-make')?.dataset.state === 'working') return; // one at a time (a pause tidy in flight is joined below, not dropped)
    make('working'); // pressed: it answers at once, before the tidy
    // her idea, tidied in place first (cut, never reworded; at most 2.5 s, else her raw words)
    const idea = typeof BYOC.tidyInto === 'function' ? await BYOC.tidyInto($('close-input'), raw) : raw;
    $('close-input').blur(); run(idea);
  });
  $('close-input').addEventListener('input', () => { if ($('close-make')?.dataset.state !== 'working') make(); });

  // Beat 11 opens it. Only the presenter closes it (PageUp / Left, or Home); a replay moving beats never does.
  BYOC.on('stage', ({ beat }) => { if (beat === 11) open(); });
  BYOC.on('reset', close);
  BYOC.close = { open, run, close, replay, isOpen, herNumbers };
})();
