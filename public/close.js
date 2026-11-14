// The close (DEMO 2:32-3:00). J (or beat 11) opens it. Vincent types a judge's idea; it goes to
// POST /api/select-for-idea (about 15 s). While the team works, the contrast shows: the baseline coding agent's
// pile beside her own numbers from this run. Then the judge's three questions land, with the counter.
(function () {
  'use strict';
  const BYOC = window.BYOC;
  const M = window.Motion || null;
  const SPRING = { type: 'spring', stiffness: 500, damping: 30 };
  // From a real run, counted by hand: docs/baseline/README.md (run 2) and docs/baseline/GUESSES.md (22 rows).
  const BASELINE = { asked: 0, guessed: 22, source: 'plain coding agent, same prompt, 14 Nov · counted by hand' };
  const SEAT_INK = { product: '#FF48B0', design: '#0078BF', data: '#00A95C', research: '#FF6C2F', engineering: '#FFE800' };

  const room = document.getElementById('room');
  const sheet = document.createElement('section');
  sheet.id = 'close-sheet'; sheet.className = 'close-sheet'; sheet.hidden = true;
  sheet.innerHTML = `
    <div class="close-left">
      <div class="close-pile" aria-hidden="true">${'<i></i>'.repeat(9)}</div>
      <div class="close-them">
        <div class="close-label">A default coding agent</div>
        <div class="close-big"><b>${BASELINE.asked}</b> asked <span>·</span> <b class="red">${BASELINE.guessed}</b> guessed</div>
        <div class="close-src">${BASELINE.source}</div>
      </div>
      <div class="close-her">
        <div class="close-label">Her, in the Product seat</div>
        <div class="close-big"><b class="pink" id="close-asked">–</b> asked <span>·</span> <b id="close-decided">–</b> decided from her file</div>
        <div class="close-src" id="close-her-src"></div>
      </div>
    </div>
    <div class="close-right">
      <div class="close-label">A judge’s idea</div>
      <form id="close-form" autocomplete="off"><input id="close-input" class="close-input" spellcheck="false" placeholder="Type the idea"></form>
      <div class="close-step" id="close-step"></div>
      <div class="close-count" id="close-count"></div>
      <ol class="close-asks" id="close-asks"></ol>
    </div>`;
  room.appendChild(sheet);
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let ticker = null, token = 0;

  // Her numbers come from the run on screen: asked = her asks; decided from her file = decisions citing a line of it.
  async function herNumbers() {
    const run = BYOC.run;
    if (!run || run.startsWith('local-')) { $('close-her-src').textContent = 'no run on screen yet'; return; }
    let t;
    try { t = BYOC.replay ? null : await BYOC.api(`/api/run/${encodeURIComponent(run)}/tally`); } catch { t = null; }
    const evs = BYOC.events();
    const asked = t ? t.brought : evs.filter(e => e.type === 'ask').length;
    const latest = new Map();
    for (const e of evs) if (e.type === 'decided') latest.set(e.id, e);
    const fromFile = t ? t.reasons.filter(r => r.kind === 'decided' && r.cites !== 'team default').length
      : [...latest.values()].filter(d => d.cites !== 'team default').length;
    $('close-asked').textContent = asked; $('close-decided').textContent = fromFile;
    $('close-her-src').textContent = `from this run's log${BYOC.replay ? ' (REPLAY)' : ''}`;
  }

  function open() {
    sheet.hidden = false;
    if (M) M.animate(sheet, { y: [-60, 0], x: [700, 0], rotate: [3, 0.4] }, SPRING);
    // The contrast waits for the judge's idea, so it shows while the team works.
    sheet.querySelector('.close-left').classList.remove('on');
    herNumbers();
    setTimeout(() => $('close-input').focus(), 40);
  }
  function close() { sheet.hidden = true; token++; clearInterval(ticker); }

  function showContrast() {
    const left = sheet.querySelector('.close-left');
    left.classList.add('on');
    if (!M) return;
    [...left.querySelectorAll('.close-pile i')].forEach((c, i) =>
      M.animate(c, { y: [-260, 0], rotate: [0, (i % 2 ? 1 : -1) * (2 + (i * 7) % 9)] }, { ...SPRING, delay: i * 0.06 }));
    M.animate(left.querySelector('.close-them'), { x: [-40, 0] }, SPRING);
    M.animate(left.querySelector('.close-her'), { x: [-40, 0] }, { ...SPRING, delay: 0.3 });
  }

  async function run(idea) {
    const my = ++token;
    $('close-asks').innerHTML = ''; $('close-count').textContent = '';
    showContrast();
    const t0 = Date.now();
    const step = () => { $('close-step').textContent = `The team is on it: proposing and choosing · ${Math.round((Date.now() - t0) / 1000)} s`; };
    step(); clearInterval(ticker); ticker = setInterval(step, 1000);
    let r;
    try { r = await BYOC.api('/api/select-for-idea', { idea }); }
    catch (e) { clearInterval(ticker); if (my === token) $('close-step').textContent = `The team stopped (${e.status || e.message}). R replays the café run.`; return; }
    clearInterval(ticker);
    if (my !== token) return;
    BYOC.timings.closeMs = Date.now() - t0;
    $('close-step').textContent = `${(BYOC.timings.closeMs / 1000).toFixed(1)} s · run ${r.run}`;
    $('close-count').innerHTML = `<b>${r.came}</b> decisions came up · <b class="pink">${r.brought}</b> brought to her`;
    (r.asks || []).forEach((a, i) => {
      const li = document.createElement('li');
      li.style.setProperty('--seat', SEAT_INK[a.seat] || '#141414');
      li.innerHTML = `<span class="close-seat">${esc(a.seat)}</span><span class="close-q">${esc(a.decision)}</span>
        <span class="close-rec">recommends: ${esc(a.recommendation)}</span>${a.why ? `<span class="close-why">${esc(a.why)}</span>` : ''}`;
      $('close-asks').appendChild(li);
      if (M) M.animate(li, { x: [60, 0], y: [-20, 0], rotate: [4, (i % 2 ? 0.8 : -0.8)] }, { ...SPRING, delay: i * 0.25 });
    });
  }

  $('close-form').addEventListener('submit', e => {
    e.preventDefault();
    const idea = $('close-input').value.trim();
    if (idea) { $('close-input').blur(); run(idea); }
  });
  $('close-input').addEventListener('keydown', e => { if (e.key === 'Escape') e.target.blur(); });

  BYOC.on('stage', ({ beat }) => { if (beat === 11) open(); else if (!sheet.hidden) close(); });
  BYOC.on('reset', close);
  BYOC.close = { open, run, close };
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'j' || e.key === 'J') { e.preventDefault(); open(); }
  });
})();
