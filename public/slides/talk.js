// The talk deck (skeleton): fit the 1600×900 stage to the window, step with the keys or a clicker, ?n=N deep link
// (1-based), ?print=1 for the PDF. No libraries; the ink comes from looks/ink-paper.js.
(function () {
  const q = new URLSearchParams(location.search);
  const stage = document.getElementById('stage'), counter = document.getElementById('counter');
  const slides = [...document.querySelectorAll('.slide')];
  const PRINT = q.has('print'); if (PRINT) document.body.classList.add('print');
  let cur = Math.max(0, Math.min(slides.length - 1, (parseInt(q.get('n'), 10) || 1) - 1));
  function fit() { if (PRINT) return; const s = Math.min(innerWidth / 1600, innerHeight / 900); stage.style.transform = `scale(${s}) translate(-50%, -50%)`; }
  function show(i) {
    cur = Math.max(0, Math.min(slides.length - 1, i));
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
  document.fonts.ready.then(() => {
    if (window.InkPaper) InkPaper.dress(document.body);
    slides.forEach(s => { s.style.visibility = ''; });
    show(cur); document.body.dataset.ready = '1';
  });
})();
