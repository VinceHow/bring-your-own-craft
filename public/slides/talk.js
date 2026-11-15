// The talk deck (skeleton): fit the 1600×900 stage to the window, step with the keys or a clicker, ?n=N deep link
// (1-based), ?print=1 for the PDF. No libraries; the ink comes from looks/ink-paper.js.
(function () {
  const q = new URLSearchParams(location.search);
  const stage = document.getElementById('stage'), counter = document.getElementById('counter');
  const slides = [...document.querySelectorAll('.slide')];
  const PRINT = q.has('print'); if (PRINT) document.body.classList.add('print');
  let cur = Math.max(0, Math.min(slides.length - 1, (parseInt(q.get('n'), 10) || 1) - 1));
  function fit() { if (PRINT) return; const s = Math.min(innerWidth / 1600, innerHeight / 900); stage.style.transform = `scale(${s}) translate(-50%, -50%)`; }
  // A .live slide is the real studio: the living painting (looks/comps/cast-living.html, embed: no run, no slips) with
  // the room's toys over it (looks/playful-ink.js), and no app UI. Mounted the first time the slide shows.
  function mountLive(s) {
    if (s.dataset.mounted) return; s.dataset.mounted = '1';
    const time = s.dataset.time || 'afternoon', night = time === 'night';
    const fr = document.createElement('iframe');
    fr.className = 'live-painting'; fr.tabIndex = -1; fr.setAttribute('aria-hidden', 'true'); fr.title = '';
    fr.src = '../looks/comps/cast-living.html?embed=1&run=0' + (night ? '&night=1' : '&time=' + time);
    const toys = document.createElement('div'); toys.className = 'live-toys';
    const shade = document.createElement('div'); shade.className = 'live-shade';
    const img = s.querySelector(':scope > .bleed-img');   // a poster keeps its still behind, for print and until the painting loads
    if (img) { img.after(fr); fr.after(toys); } else { s.prepend(shade); s.prepend(toys); s.prepend(fr); }
    const go = () => { try { window.PlayfulInk.mount(toys, { music: '../looks/cast/music', time: night ? 'night' : 'day' }); } catch (e) { console.warn('toys', e); } };
    if (window.PlayfulInk) go();
    else { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '../looks/playful-ink.css'; document.head.appendChild(l);
      const sc = document.createElement('script'); sc.src = '../looks/playful-ink.js'; sc.onload = go; document.head.appendChild(sc); }
  }
  // a toy's click plays its clip in the painting, as in the room (painted-living.js)
  document.addEventListener('studio:poke', e => { const o = e.detail && e.detail.obj; if (!o) return;
    document.querySelectorAll('.live-painting').forEach(f => { try { f.contentWindow.living && f.contentWindow.living.poke(o); } catch (err) { /* not ready */ } }); });
  // the toys' day/night pill drives the painting's time
  document.addEventListener('studio:time', e => { const d = e.detail || {}; if (!d.mode) return;
    document.querySelectorAll('.live-painting').forEach(f => { try { f.contentWindow.living && f.contentWindow.living.setTime(d.mode === 'night' ? 'night' : 'afternoon', { fade: 1.2 }); } catch (err) { /* not ready */ } }); });
  function show(i) {
    cur = Math.max(0, Math.min(slides.length - 1, i));
    if (slides[cur].dataset.time) mountLive(slides[cur]);
    slides.forEach((s, k) => s.classList.toggle('on', k === cur));
    counter.textContent = `${cur + 1} / ${slides.length}`;
    document.title = `${slides[cur].dataset.title} · Bring your own craft`;
    const u = new URL(location.href); u.searchParams.set('n', cur + 1); history.replaceState(null, '', u);
  }
  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (['ArrowRight', ' ', 'PageDown', 'ArrowDown', 'Enter'].includes(e.key)) { e.preventDefault(); show(cur + 1); }
    else if (['ArrowLeft', 'PageUp', 'ArrowUp', 'Backspace'].includes(e.key)) { e.preventDefault(); show(cur - 1); }
    else if (e.key === 'Home') { e.preventDefault(); show(0); }
    else if (e.key === 'End') { e.preventDefault(); show(slides.length - 1); }
  });
  addEventListener('resize', fit); fit();
  // the ink is drawn once, with every slide laid out (hidden slides keep their size, so the outlines fit)
  slides.forEach(s => { s.style.visibility = 'visible'; });
  // Copy is Vincent's to edit: when a slide's words outgrow it, its headline (then caption) steps down until it fits.
  // does the slide's content (not its backdrop) run past the stage? (in stage pixels, whatever the window's scale)
  function over(s) {
    const r = s.getBoundingClientRect(), k = r.height / 900 || 1;
    let bottom = 0;
    for (const el of s.querySelectorAll('.kicker, .headline, .caption, .paper, .foot, .line, .giant, .table, .tagline, .credits')) { bottom = Math.max(bottom, (el.getBoundingClientRect().bottom - r.top) / k); }
    return bottom > 900 - 24;
  }
  function fitAll() {
    slides.forEach(s => {
      const parts = [...s.querySelectorAll('.headline, .paper-big, .caption')];
      parts.forEach(el => { el.style.fontSize = ''; });
      for (const el of parts) {
        let size = parseFloat(getComputedStyle(el).fontSize), guard = 40;
        while (over(s) && size > 40 && guard--) { size -= 4; el.style.fontSize = size + 'px'; }
      }
    });
  }
  document.fonts.ready.then(() => {
    fitAll(); window.__fit = fitAll;
    if (window.InkPaper) InkPaper.dress(document.body);
    slides.forEach(s => { s.style.visibility = ''; });
    show(cur); document.body.dataset.ready = '1';
  });
})();
