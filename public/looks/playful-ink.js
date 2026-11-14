/* Playful ink: the room's small toys in the ink-paper look.
   PlayfulInk.mount(container, { day, night, music, time, still }) draws a layer over a painted room that fills `container`.
   Everything is placed in fractions of the painting, so it scales with it.
   - Record player: hover shows the track in an inked pill; a click starts it, then cycles Piano, Electronic, Chiptune,
     Night rain, off. Never autoplays. At night, while a record plays, rain sits softly under the music. Rain is
     cast/music/rain.mp3 when present, else made in code. Ducks while a focus document is open: api.duck(true), or a
     `studio:focus` event with detail { open: true }.
   - Owns every playful object in the painted look; the living layer owns the backdrop and moods. They share the time of
     day through a `studio:time` event { time } (either side may fire it), or api.setNight(on).
   - Cat: two ink-drawn hearts rise when you pet it.
   - Coffee machine: inked steam curls, a little more when you come near.
   - String lights: a click toggles a soft glow (on by default at night).
   - Day / night: a small inked sun or moon pill, top left, crossfades to the rainy night.
   - The cue: coming near anything you can touch draws a warm rim and an ink underline. Nothing blinks or nags. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const TRACKS = [{ id: 'piano', name: 'Piano' }, { id: 'electronic', name: 'Electronic' }, { id: 'chiptune', name: 'Chiptune' }, { id: 'rain', name: 'Night rain' }];
  const SPOTS = {
    record: { x: .872, y: .425, w: .122, h: .22 },
    cat:    { x: .19,  y: .78,  w: .155, h: .145 },
    coffee: { x: .004, y: .395, w: .104, h: .19 },
    lights: { x: .29,  y: 0,    w: .52,  h: .105 },
  };
  const BULBS = [[.3117, .0405], [.3546, .0834], [.4085, .0838], [.4533, .0525], [.4914, .0289], [.5448, .0678], [.5961, .0716], [.645, .0476], [.6925, .0315], [.7375, .026], [.7789, .0323]];
  const pct = v => (v * 100).toFixed(3) + '%';
  const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
  const svgEl = (w, h, inner, cls) => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${h}`); if (cls) s.setAttribute('class', cls); s.innerHTML = inner; return s; };

  function defs() {
    if (document.getElementById('pi-defs')) return;
    const s = svgEl(0, 0, `<defs>
      <filter id="pi-wob" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="13" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="pi-wob-sm" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`);
    s.id = 'pi-defs'; s.setAttribute('width', 0); s.setAttribute('height', 0); s.style.position = 'absolute';
    document.body.appendChild(s);
  }
  function inkPill(p) {   // the hand-inked outline round a pill
    const w = p.offsetWidth, h = p.offsetHeight;
    p.querySelector(':scope > svg.ol')?.remove();
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'ol'); s.setAttribute('width', w + 6); s.setAttribute('height', h + 6);
    s.innerHTML = `<rect x="3.5" y="3.5" width="${w - 1}" height="${h - 1}" rx="${h / 2}"/>`;
    p.prepend(s);
  }
  const ICON = {
    sun: '<circle cx="9" cy="9" r="3.6"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4"/>',
    moon: '<path d="M13.5 11.6A6 6 0 0 1 6.4 4.5 6 6 0 1 0 13.5 11.6Z"/>',
    disc: '<circle cx="9" cy="9" r="7"/><circle cx="9" cy="9" r="1.6"/><path d="M9 4.2a4.8 4.8 0 0 1 4.8 4.8"/>',
  };

  // ---------- night rain, made in code: soft filtered noise and a few drops ----------
  function rain(ctx, out) {
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let b = 0; for (let i = 0; i < len; i++) { b = .985 * b + .15 * (Math.random() * 2 - 1); d[i] = b * .5; } }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 280;
    const g = ctx.createGain(); g.gain.value = .55;
    src.connect(hp).connect(lp).connect(g).connect(out); src.start();
    let alive = true;
    (function drop() {
      if (!alive) return;
      const o = ctx.createOscillator(), dg = ctx.createGain(); o.type = 'sine'; o.frequency.value = 900 + Math.random() * 1600;
      dg.gain.setValueAtTime(0, ctx.currentTime); dg.gain.linearRampToValueAtTime(.025 + Math.random() * .03, ctx.currentTime + .004);
      dg.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .09);
      o.connect(dg).connect(out); o.start(); o.stop(ctx.currentTime + .1);
      setTimeout(drop, 60 + Math.random() * 260);
    })();
    return () => { alive = false; src.stop(); };
  }

  function mount(container, opts = {}) {
    defs();
    const o = Object.assign({ day: '', night: '', music: '', time: 'day', still: false, volume: .55 }, opts);
    const L = el('div', 'pi-layer', container);
    const plate = el('div', 'pi-plate', L); if (o.night) plate.style.backgroundImage = `url(${o.night})`;
    const state = { night: false, lights: false, track: -1, duck: false };

    // string-light glows (under everything else)
    BULBS.forEach(([x, y], i) => { const b = el('div', 'pi-bulb', L); b.style.left = pct(x); b.style.top = pct(y); b.style.setProperty('--b', (.7 + (i % 3) * .1).toFixed(2)); });

    // hotspots with the near-cue
    const spot = (key, label) => {
      const s = el('button', 'pi-spot', L); const r = SPOTS[key];
      Object.assign(s.style, { left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h), background: 'none', border: 0, padding: 0 });
      s.setAttribute('aria-label', label); s.dataset.spot = key;
      const u = svgEl(100, 10, '<path d="M2 5 C 22 2, 44 8, 64 4 S 92 3, 98 6" pathLength="1"/>', 'pi-under'); u.setAttribute('preserveAspectRatio', 'none'); s.appendChild(u);
      return s;
    };
    const sRecord = spot('record', 'Record player: play music'), sCat = spot('cat', 'Pet the cat'), sCoffee = spot('coffee', 'Coffee machine'), sLights = spot('lights', 'String lights');

    // ---------- record player ----------
    const track = el('button', 'pi-pill pi-track is-hidden', L);
    track.innerHTML = `<svg class="ic" viewBox="0 0 18 18">${ICON.disc}</svg><span class="nm">Record player</span><span class="pi-sub">tap to play</span><span class="eq" hidden><i></i><i></i><i></i></span>`;
    track.style.right = '2.2%'; track.style.top = pct(SPOTS.record.y - .035);
    // Sound: one music track at a time; "Night rain" is a track too. At night, while a record plays, rain sits softly under it.
    // Rain uses public/looks/cast/music/rain.mp3 when it is there, and falls back to rain made in code.
    let music = null, rainTrack = null, ambient = null, ctx = null;
    const vol = () => (state.duck ? .12 : 1) * o.volume;
    const AMBIENT = .3;   // rain under the music, relative to the music
    function ramp(a, to, secs = .6) { const from = a.volume, t0 = performance.now();
      (function step(t) { const k = Math.min(1, (t - t0) / (secs * 1000)); a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k < 1) requestAnimationFrame(step); })(t0); }
    function startRain(level) {
      const layer = { level, a: null, g: null, stop: null };
      const fallback = () => {
        if (layer.dead || layer.g) return;
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume();
        layer.g = ctx.createGain(); layer.g.gain.value = level * vol(); layer.g.connect(ctx.destination); layer.stop = rain(ctx, layer.g);
      };
      if (o.music) {
        const a = new Audio(`${o.music}/rain.mp3`); a.loop = true; a.volume = level * vol(); layer.a = a;
        const fail = () => { a.pause(); a.removeAttribute('src'); a.load(); layer.a = null; fallback(); };
        a.addEventListener('error', fail, { once: true });
        a.play().catch(err => { if (err && err.name === 'NotSupportedError' && layer.a) fail(); });
      } else fallback();
      layer.set = secs => { if (layer.a) ramp(layer.a, layer.level * vol(), secs); if (layer.g) layer.g.gain.setTargetAtTime(layer.level * vol(), ctx.currentTime, secs / 3); };
      layer.end = () => { layer.dead = true; if (layer.a) layer.a.pause(); if (layer.stop) layer.stop(); if (layer.g) layer.g.disconnect(); };
      return layer;
    }
    function setVolume(secs = .6) { if (music) ramp(music, vol(), secs); [rainTrack, ambient].forEach(l => l && l.set(secs)); }
    function syncAmbient() {
      const want = state.night && state.track >= 0 && TRACKS[state.track].id !== 'rain';
      if (want && !ambient) ambient = startRain(AMBIENT);
      if (!want && ambient) { ambient.end(); ambient = null; }
    }
    function stopAll() { if (music) { music.pause(); music = null; } if (rainTrack) { rainTrack.end(); rainTrack = null; } }
    function play(i) {
      stopAll(); state.track = i;
      const nm = track.querySelector('.nm'), sub = track.querySelector('.pi-sub'), eq = track.querySelector('.eq');
      if (i < 0) { nm.textContent = 'Record player'; sub.textContent = 'tap to play'; eq.hidden = true; track.classList.remove('playing'); inkPill(track); syncAmbient(); return; }
      const t = TRACKS[i];
      nm.textContent = t.name; sub.textContent = i < TRACKS.length - 1 ? `next: ${TRACKS[i + 1].name}` : 'next: off'; eq.hidden = false; track.classList.add('playing');
      if (t.id === 'rain') rainTrack = startRain(1);
      else if (o.music) { music = new Audio(`${o.music}/${t.id}.mp3`); music.loop = true; music.volume = vol(); music.play().catch(() => {}); }
      syncAmbient();
      inkPill(track);
      noteFloat();
    }
    const cycle = () => play(state.track + 1 >= TRACKS.length ? -1 : state.track + 1);
    const showTrack = on => { track.classList.toggle('is-hidden', !on && state.track < 0); if (on) inkPill(track); };
    [sRecord, track].forEach(n => { n.addEventListener('mouseenter', () => showTrack(true)); n.addEventListener('focus', () => showTrack(true)); n.addEventListener('click', cycle); });
    sRecord.addEventListener('mouseleave', () => setTimeout(() => { if (!track.matches(':hover')) showTrack(false); }, 250));
    track.addEventListener('mouseleave', () => showTrack(false));
    function noteFloat() {   // one small inked note rises from the record when a track starts
      const s = svgEl(20, 26, '<path d="M7 20 V5 L17 3 V17"/><path d="M7 20 a3 2.4 -20 1 1 -1 -1 M17 17 a3 2.4 -20 1 1 -1 -1"/>', 'pi-draw');
      Object.assign(s.style, { left: pct(.925), top: pct(.52), width: '22px', height: '28px' }); L.appendChild(s);
      s.animate([{ transform: 'translate(0,0) rotate(-6deg)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: 'translate(-18px,-70px) rotate(8deg)', opacity: 0 }], { duration: 2600, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
    }

    // ---------- the cat: two ink hearts ----------
    function hearts() {
      [[0, -8, 0], [34, 10, 280]].forEach(([dx, rot, delay]) => {
        const s = svgEl(24, 22, '<path pathLength="1" d="M12 20 C 4 14, 1 9, 3.5 5 C 6 1.5, 10.5 2.5, 12 6.5 C 13.5 2.5, 18 1.5, 20.5 5 C 23 9, 20 14, 12 20 Z"/>', 'pi-draw pi-heart');
        Object.assign(s.style, { left: `calc(${pct(.215)} + ${dx}px)`, top: pct(.775), width: '34px', height: '31px' }); L.appendChild(s);
        const p = s.querySelector('path'); p.style.strokeDasharray = 1; p.style.fillOpacity = 0;
        setTimeout(() => {
          p.animate([{ strokeDashoffset: 1, fillOpacity: 0 }, { strokeDashoffset: 0, fillOpacity: 0, offset: .55 }, { strokeDashoffset: 0, fillOpacity: 1 }], { duration: 700, fill: 'forwards', easing: 'ease-out' });
          s.animate([{ transform: `translate(0,6px) rotate(${rot}deg) scale(.8)`, opacity: 1 }, { transform: `translate(${dx / 4}px,-46px) rotate(${-rot / 2}deg) scale(1)`, opacity: 1, offset: .7 }, { transform: `translate(${dx / 3}px,-60px) rotate(0deg) scale(1)`, opacity: 0 }],
            { duration: o.still ? 1e9 : 2400, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
        }, delay);
      });
    }
    let petting = false;
    sCat.addEventListener('click', () => { if (petting) return; petting = true; hearts(); setTimeout(() => petting = false, 1600); });

    // ---------- coffee: inked steam curls ----------
    const curls = ['M10 60 C 2 48, 18 40, 10 28 S 4 10, 12 2', 'M10 60 C 18 50, 4 40, 12 28 S 18 12, 10 2'];
    function steamOnce(x, strong, y = .452) {
      const s = svgEl(22, 64, `<path pathLength="1" d="${curls[Math.random() < .5 ? 0 : 1]}"/>`, 'pi-draw pi-steam');
      Object.assign(s.style, { left: pct(x), top: pct(y), width: '24px', height: '66px' }); L.appendChild(s);
      const p = s.querySelector('path'); p.style.strokeDasharray = 1;
      if (o.still) { p.style.strokeDashoffset = 0; s.style.opacity = .9; return; }
      p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1400, fill: 'forwards', easing: 'ease-out' });
      s.animate([{ transform: 'translateY(8px)', opacity: 0 }, { opacity: strong ? 1 : .75, offset: .3 }, { transform: 'translateY(-26px)', opacity: 0 }], { duration: o.still ? 1e9 : 3200, easing: 'ease-out' }).onfinish = () => s.remove();
    }
    let near = false;
    sCoffee.addEventListener('mouseenter', () => near = true); sCoffee.addEventListener('mouseleave', () => near = false);
    sCoffee.addEventListener('click', () => { steamOnce(.064, true); setTimeout(() => steamOnce(.072, true), 300); });
    // the cup under the spout, and now and then the mug on the counter
    if (!o.still) (function loop() { if (Math.random() < .3) steamOnce(.02, near, .478); else steamOnce(.063 + Math.random() * .01, near); setTimeout(loop, near ? 900 : 2000 + Math.random() * 900); })();
    else { steamOnce(.064, true); steamOnce(.072, true, .445); }

    // ---------- string lights ----------
    const setLights = on => { state.lights = on; L.classList.toggle('lights', on); };
    sLights.addEventListener('click', () => setLights(!state.lights));

    // ---------- day / night ----------
    const sky = el('button', 'pi-pill pi-sky', L);
    sky.style.left = '1.6%'; sky.style.top = '2.4%';
    function setNight(on, fromEvent) {
      state.night = on; plate.classList.toggle('on', on); L.classList.toggle('night', on);
      sky.innerHTML = on ? `<svg class="ic" viewBox="0 0 18 18">${ICON.moon}</svg>Night<span class="pi-sub">rain on the window</span>`
                         : `<svg class="ic" viewBox="0 0 18 18">${ICON.sun}</svg>Afternoon<span class="pi-sub">tap for night</span>`;
      sky.setAttribute('aria-label', on ? 'Switch to afternoon' : 'Switch to night');
      inkPill(sky); setLights(on); syncAmbient();
      // tell the living layer (backdrop and moods) so both stay on the same time of day
      if (!fromEvent) document.dispatchEvent(new CustomEvent('studio:time', { detail: { time: on ? 'night' : 'afternoon', from: 'playful-ink' } }));
    }
    sky.addEventListener('click', () => setNight(!state.night));

    // ---------- ducking during focus ----------
    document.addEventListener('studio:focus', e => api.duck(!!(e.detail && e.detail.open)));
    // the living layer can set the time too: night is the only time with its own painting here, every other time is day
    document.addEventListener('studio:time', e => { const d = e.detail || {}; if (d.from === 'playful-ink') return; const n = d.time === 'night'; if (n !== state.night) setNight(n, true); });

    const api = {
      el: L, state,
      duck(on) { state.duck = on; setVolume(); },
      setNight, setLights, play, hearts,
      cue(key, on = true) { L.querySelector(`[data-spot="${key}"]`)?.classList.toggle('is-cue', on); if (key === 'record') showTrack(on); },
      destroy() { stopAll(); if (ambient) ambient.end(); L.remove(); },
    };
    setNight(o.time === 'night', true);
    window.PlayfulInk.current = api;
    return api;
  }
  window.PlayfulInk = { mount, TRACKS };
})();
