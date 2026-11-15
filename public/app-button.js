// The app button: one always-visible button that opens the app this run built, live and clickable, in a new tab.
// Its state comes only from the run's own events: none (no build yet) · building (a build.step since the last
// build.done, its step as the hint) · ready (the latest build.done: "Open the app · v2, 3 min ago"). A new version
// pulses it once and says what changed (build.done.changes). With DEPLOY_URL set (/api/health), "Open the live site".
(function () {
  const B = window.BYOC = window.BYOC || {};
  const root = document.getElementById('app-button');
  if (!root || typeof B.on !== 'function') return;
  const $ = s => root.querySelector(s);
  const btn = $('.app-open'), label = $('.app-label'), hint = $('.app-hint'), change = $('.app-change'), live = $('.app-live');
  let done = null, building = false, failed = '';

  const ago = t => {
    const s = Math.max(0, Math.round((Date.now() - (t || Date.now())) / 1000));
    return s < 45 ? 'just now' : s < 90 ? '1 min ago' : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
  };
  // The app's address: this run's page (a replay reads the replayed run's page).
  const url = () => (B.replay && B.replayName ? `/runs/${encodeURIComponent(B.replayName)}/page/` : done && done.url);

  function draw() {
    const next = done ? done.version || 1 : 1;
    root.dataset.version = done ? String(next) : '0'; // hooks: data-state none|building|ready|failed, data-version, data-pulse
    if (building) {
      root.dataset.state = 'building'; btn.disabled = !done;
      label.textContent = done ? `Building v${next + 1}…` : 'Building your app…';
      hint.textContent = failed || hintNow || 'Bo is on it';
    } else if (done) {
      root.dataset.state = 'ready'; btn.disabled = false;
      label.textContent = `Open the app · v${next}`;
      hint.textContent = failed || ago(done.t);
    } else if (failed) { // never stuck (docs/POLISH.md §4): a first build that stopped offers to try again
      root.dataset.state = 'failed'; btn.disabled = false;
      label.textContent = 'Build again';
      hint.textContent = 'The build stopped. Bo can try again';
    } else {
      root.dataset.state = 'none'; btn.disabled = true;
      label.textContent = 'No app yet';
      // painted, live, while the team works: the presenter's one press is →, and the pill says so
      const pressNow = B.beat >= 5 && B.beat <= 7 && !B.replay && new URLSearchParams(location.search).get('look') === 'painted';
      hint.textContent = pressNow ? 'Press → and Bo builds the page' : 'Bo starts once you agree the page';
    }
  }
  let hintNow = '';
  B.on('build.step', ev => {
    const step = String(ev.step || '');
    if (/^Build failed/.test(step)) { building = false; failed = 'The last build stopped: the app as it was'; if (!done) failed = 'The build stopped: no app yet'; }
    else { building = true; failed = ''; hintNow = step; }
    draw();
  });
  B.on('build.done', ev => {
    const fresh = !done || (ev.version || 1) !== (done.version || 1);
    done = ev; building = false; failed = ''; hintNow = '';
    const ch = Array.isArray(ev.changes) ? ev.changes.filter(Boolean) : [];
    change.hidden = !ch.length;
    change.textContent = ch.length ? `v${ev.version || 1} · ${ch.join(', ')}` : '';
    draw();
    if (fresh) { root.dataset.pulse = '1'; setTimeout(() => { delete root.dataset.pulse; }, 1800); }
  });
  B.on('stage', () => draw());
  B.on('reset', () => { done = null; building = false; failed = ''; hintNow = ''; change.hidden = true; change.textContent = ''; delete root.dataset.pulse; draw(); });
  btn.addEventListener('click', () => {
    if (root.dataset.state === 'failed') {
      failed = ''; building = true; hintNow = 'Starting again'; draw();
      // If the request ends with no word from the build at all, say so again rather than wait on "Starting again".
      Promise.resolve(B.build && B.build()).finally(() => { if (!done && building && hintNow === 'Starting again') { building = false; failed = 'The build stopped: no app yet'; draw(); } });
      return;
    }
    const u = url();
    if (!u || root.dataset.state === 'none') return;
    window.open(u, '_blank', 'noopener');
  });
  setInterval(() => { if (done && !building) draw(); }, 30000); // "3 min ago" stays true
  // On stage: the live site (DEPLOY_URL), when set.
  fetch('/api/health').then(r => r.json()).then(h => {
    if (h && typeof h.deployUrl === 'string' && /^https?:\/\//.test(h.deployUrl)) { live.href = h.deployUrl; live.hidden = false; }
  }).catch(() => {});
  B.app = { state: () => root.dataset.state, url, open: () => btn.click() };
  draw();
})();
