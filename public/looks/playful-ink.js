/* Playful ink: the room's small toys in the ink-paper look.
   PlayfulInk.mount(container, { day, night, music, time, still }) draws a layer over a painted room that fills `container`.
   Everything is placed in fractions of the painting, so it scales with it.
   - Record player: music only. A click starts it, then cycles Piano, Electronic, Chiptune, off; an inked pill shows the
     track for a few seconds after each click, then fades. Never autoplays; remembers her last track for her next tap.
   - Rain sound: the weather's, only at night (it only rains at night), on its own element and volume; the window
     toggles it (remembered, default on). Rain is cast/music/rain.mp3 when present, else made in code.
   - Stage mode (body.stage) mutes both until one is turned on by hand. Both duck while a focus document is open:
     api.duck(true), or a `studio:focus` event with detail { open: true }.
   - Owns every playful object in the painted look; the living layer owns the backdrop and moods. They share the time of
     day through `studio:time`: this layer sends { mode }, the living layer answers with { time }. api.setMode(m). A click on the record
     player, cat or coffee machine also fires `studio:poke` { obj: 'record'|'cat'|'coffee' }, so the painted layer plays
     that object's clip while this layer draws the ink and plays the sound.
   - Cat: two ink-drawn hearts rise when you pet it.
   - Coffee machine: a click sends up inked steam; on its own, only a tiny curl now and then.
   - String lights: a click toggles a soft glow (on by default at night).
   - Time pill, top left: Cycle (the run drives the time, default) -> Day -> Night, remembered per viewer.
   - These are Easter eggs: nothing shows on approach (only the pointer cursor), and nothing appears unprompted except a
     tiny, rare curl of coffee steam. Everything else answers a click. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const TRACKS = [{ id: 'piano', name: 'Piano' }, { id: 'electronic', name: 'Electronic' }, { id: 'chiptune', name: 'Chiptune' }];   // music only: rain is the weather's
  const SPOTS = {
    record: { x: .872, y: .425, w: .122, h: .22 },
    cat:    { x: .19,  y: .78,  w: .155, h: .145 },
    coffee: { x: .004, y: .395, w: .104, h: .19 },
    lights: { x: .29,  y: 0,    w: .52,  h: .105 },
    window: { x: .095, y: .06,  w: .148, h: .36 },   // the rain-streaked window: the rain-sound toggle, at night only
  };
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* no storage */ } } };
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
    cycle: '<circle cx="9" cy="9" r="6.4"/><path d="M9 2.6a6.4 6.4 0 0 1 0 12.8Z" fill="currentColor" stroke="none"/>',
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

    // hotspots: invisible; the pointer cursor is the only hint
    const spot = (key, label) => {
      const s = el('button', 'pi-spot', L); const r = SPOTS[key];
      Object.assign(s.style, { left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h), background: 'none', border: 0, padding: 0 });
      s.setAttribute('aria-label', label); s.dataset.spot = key;
      return s;
    };
    const sRecord = spot('record', 'Record player: play music'), sCat = spot('cat', 'Pet the cat'), sCoffee = spot('coffee', 'Coffee machine'), sLights = spot('lights', 'String lights');
    const sWindow = spot('window', 'Window: rain sound on or off'); sWindow.hidden = true;   // only while it rains

    // ---------- record player ----------
    const track = el('button', 'pi-pill pi-track is-hidden', L);
    track.innerHTML = `<svg class="ic" viewBox="0 0 18 18">${ICON.disc}</svg><span class="nm">Record player</span><span class="pi-sub">tap to play</span><span class="eq" hidden><i></i><i></i><i></i></span>`;
    track.style.right = '2.2%'; track.style.top = pct(SPOTS.record.y - .035);
    // Sound has two independent channels.
    //  - Music: the record player, one track at a time. Never autoplays.
    //  - Rain: the weather's own sound, on its own element and volume. It exists only at night (it only rains at night),
    //    fades in and out with the scene, and the window toggles it. Defaults on; her choice is remembered.
    //  Stage mode (body.stage) mutes both until someone turns one on by hand.
    // Rain uses public/looks/cast/music/rain.mp3 when it is there, and falls back to rain made in code.
    let music = null, rainLayer = null, ctx = null;
    const vol = () => (state.duck ? .12 : 1) * o.volume;
    const RAIN = .45;     // the rain's own level, relative to the music's
    state.rain = store.get('byoc.rainSound') !== 'off';
    let stageHush = { music: false, rain: false };
    function ramp(a, to, secs = .6) { const from = a.volume, t0 = performance.now();
      (function step(t) { const k = Math.min(1, (t - t0) / (secs * 1000)); a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k < 1) requestAnimationFrame(step); })(t0); }
    function startRain(level, fadeSecs = 1.2) {
      const layer = { level, a: null, g: null, stop: null };
      const fallback = () => {
        if (layer.dead || layer.g) return;
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume();
        layer.g = ctx.createGain(); layer.g.gain.value = 0; layer.g.connect(ctx.destination); layer.stop = rain(ctx, layer.g);
        layer.g.gain.setTargetAtTime(level * vol(), ctx.currentTime, fadeSecs / 3);
      };
      if (o.music) {
        const a = new Audio(`${o.music}/rain.mp3`); a.loop = true; a.volume = 0; layer.a = a;
        const fail = () => { a.pause(); a.removeAttribute('src'); a.load(); layer.a = null; fallback(); };
        a.addEventListener('error', fail, { once: true });
        a.play().then(() => ramp(a, level * vol(), fadeSecs)).catch(err => {
          if (err && err.name === 'NotSupportedError' && layer.a) fail();
          else if (err && err.name === 'NotAllowedError') {         // no tap yet: start on her first tap anywhere
            const go = () => { if (!layer.dead && layer.a) a.play().then(() => ramp(a, level * vol(), fadeSecs)).catch(() => {}); };
            document.addEventListener('pointerdown', go, { once: true, capture: true });
          }
        });
      } else fallback();
      layer.set = secs => { if (layer.a) ramp(layer.a, layer.level * vol(), secs); if (layer.g) layer.g.gain.setTargetAtTime(layer.level * vol(), ctx.currentTime, secs / 3); };
      layer.end = (secs = 1.2) => {
        layer.dead = true;
        if (layer.a) { const a = layer.a; ramp(a, 0, secs); setTimeout(() => a.pause(), secs * 1000 + 50); }
        if (layer.g) { const g = layer.g, stop = layer.stop; g.gain.setTargetAtTime(0, ctx.currentTime, secs / 3); setTimeout(() => { if (stop) stop(); g.disconnect(); }, secs * 1000 + 50); }
      };
      return layer;
    }
    function setVolume(secs = .6) { if (music) ramp(music, vol(), secs); if (rainLayer) rainLayer.set(secs); }
    function syncRain() {
      const want = state.night && state.rain && !stageHush.rain && !o.still;
      if (want && !rainLayer) rainLayer = startRain(RAIN);
      if (!want && rainLayer) { rainLayer.end(); rainLayer = null; }
      sWindow.hidden = !state.night;
      sWindow.dataset.state = state.rain ? 'rain-on' : 'rain-off';
      sWindow.setAttribute('aria-pressed', String(state.rain));
    }
    const syncAmbient = syncRain;
    function stopAll() { if (music) { music.pause(); music = null; } }
    function play(i, quiet) {
      stopAll(); state.track = i;
      if (!quiet) store.set('byoc.music', i < 0 ? 'off' : TRACKS[i].id);
      const nm = track.querySelector('.nm'), sub = track.querySelector('.pi-sub'), eq = track.querySelector('.eq');
      if (i < 0) { nm.textContent = 'Record player'; sub.textContent = 'tap to play'; eq.hidden = true; track.classList.remove('playing'); inkPill(track); return; }
      const t = TRACKS[i];
      nm.textContent = t.name; sub.textContent = i < TRACKS.length - 1 ? `next: ${TRACKS[i + 1].name}` : 'next: off'; eq.hidden = false; track.classList.add('playing');
      stageHush.music = false;                                         // a tap on the record is a choice, on stage too
      if (o.music) { music = new Audio(`${o.music}/${t.id}.mp3`); music.loop = true; music.volume = vol(); music.play().catch(() => {}); }
      inkPill(track);
      noteFloat();
    }
    const cycle = () => play(state.track + 1 >= TRACKS.length ? -1 : state.track + 1);
    // the pill shows only after a click, says what is playing, and fades a few seconds later
    let hideT = 0;
    const flashTrack = (ms = 3200) => { track.classList.remove('is-hidden'); inkPill(track); clearTimeout(hideT); if (!o.still) hideT = setTimeout(() => track.classList.add('is-hidden'), ms); };
    // the painted layer plays the object's own clip; this layer adds the ink and the sound
    const poke = obj => document.dispatchEvent(new CustomEvent('studio:poke', { detail: { obj, from: 'playful-ink' } }));
    sRecord.addEventListener('click', () => { poke('record'); cycle(); flashTrack(); });
    track.addEventListener('click', () => { cycle(); flashTrack(); });

    // ---------- the window: rain sound on / off (night only; the rain you see stays: it's the weather) ----------
    const rainPill = el('div', 'pi-pill pi-rain is-hidden', L);
    rainPill.setAttribute('role', 'status'); rainPill.style.left = pct(SPOTS.window.x + .01); rainPill.style.top = pct(SPOTS.window.y + .07);              // on the glass, clear of the name tags
    let rainT = 0;
    const flashRain = (html, ms = 2600) => { rainPill.innerHTML = html; rainPill.classList.remove('is-hidden'); inkPill(rainPill); clearTimeout(rainT); rainT = setTimeout(() => rainPill.classList.add('is-hidden'), ms); };
    const DROP = '<svg class="ic" viewBox="0 0 18 18"><path d="M9 2.5C9 2.5 4.2 8.2 4.2 11.2a4.8 4.8 0 0 0 9.6 0C13.8 8.2 9 2.5 9 2.5Z"/></svg>';
    sWindow.addEventListener('pointerenter', () => {           // a tiny hint, the first time only
      if (store.get('byoc.rainHint')) return; store.set('byoc.rainHint', '1');
      flashRain(`${DROP}tap the window<span class="pi-sub">rain sound on/off</span>`, 3200);
    });
    sWindow.addEventListener('click', () => {
      state.rain = !(state.rain && !stageHush.rain); stageHush.rain = false;
      store.set('byoc.rainSound', state.rain ? 'on' : 'off');
      syncRain();
      flashRain(`${DROP}Rain sound<span class="pi-sub">${state.rain ? 'on' : 'off'}</span>`);
    });

    // stage mode mutes both channels until one is turned on by hand (her saved choice is left as it was)
    const onStage = () => document.body.classList.contains('stage');
    let wasStage = onStage();
    const hushForStage = () => { stageHush = { music: true, rain: true }; if (state.track >= 0) play(-1, true); syncRain(); };
    if (wasStage) hushForStage();
    new MutationObserver(() => {                                       // act only when stage mode itself flips
      const now = onStage(); if (now === wasStage) return; wasStage = now;
      if (now) hushForStage(); else { stageHush = { music: false, rain: false }; syncRain(); }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // the record remembers what she last played: if music was on when she left, it comes back on her first tap
    // (browsers never let sound start on its own). Not on stage.
    { const last = TRACKS.findIndex(t => t.id === store.get('byoc.music'));
      if (last >= 0 && !wasStage && !o.still) document.addEventListener('pointerdown', e => {
        if (state.track >= 0 || stageHush.music || onStage() || (e.target && e.target.closest && e.target.closest('.pi-spot[data-spot="record"], .pi-track'))) return;
        play(last);
      }, { once: true, capture: true }); }
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
    sCat.addEventListener('click', () => { if (petting) return; petting = true; poke('cat'); hearts(); setTimeout(() => petting = false, 1600); });

    // ---------- coffee: inked steam curls ----------
    const curls = ['M10 60 C 2 48, 18 40, 10 28 S 4 10, 12 2', 'M10 60 C 18 50, 4 40, 12 28 S 18 12, 10 2'];
    function steamOnce(x, strong, y = .452, tiny = false) {
      const s = svgEl(22, 64, `<path pathLength="1" d="${curls[Math.random() < .5 ? 0 : 1]}"/>`, 'pi-draw pi-steam');
      Object.assign(s.style, { left: pct(x), top: pct(y), width: tiny ? '14px' : '24px', height: tiny ? '38px' : '66px' }); L.appendChild(s);
      const p = s.querySelector('path'); p.style.strokeDasharray = 1;
      if (o.still) { p.style.strokeDashoffset = 0; s.style.opacity = .9; return; }
      p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1400, fill: 'forwards', easing: 'ease-out' });
      s.animate([{ transform: 'translateY(8px)', opacity: 0 }, { opacity: strong ? 1 : .45, offset: .3 }, { transform: 'translateY(-26px)', opacity: 0 }], { duration: o.still ? 1e9 : 3200, easing: 'ease-out' }).onfinish = () => s.remove();
    }
    sCoffee.addEventListener('click', () => { poke('coffee'); steamOnce(.064, true); setTimeout(() => steamOnce(.072, true), 300); });
    // on its own: only a tiny, faint curl from the cup, every 9 to 15 s
    if (!o.still) (function loop() { setTimeout(() => { steamOnce(.066, false, .47, true); loop(); }, 9000 + Math.random() * 6000); })();
    else steamOnce(.064, true);

    // ---------- string lights ----------
    const setLights = on => { state.lights = on; L.classList.toggle('lights', on); };
    sLights.addEventListener('click', () => setLights(!state.lights));

    // ---------- day / night ----------
    const sky = el('button', 'pi-pill pi-sky', L);
    sky.style.left = '1.6%'; sky.style.top = '2.4%';
    // The pill shows the MODE and a click moves it on: Cycle -> Day -> Night -> Cycle. Cycle lets the run drive the
    // time (the living layer owns that); Day and Night hold one scene. The lamp-lit look (plate, lights, rain music)
    // follows the scene actually showing, which the living layer reports back as 'studio:time' { time }.
    const MODES = {
      cycle: { icon: 'cycle', name: 'Cycle', sub: 'tap for day',   next: 'day',   aria: 'Time of day follows the run. Switch to always day' },
      day:   { icon: 'sun',   name: 'Day',   sub: 'tap for night', next: 'night', aria: 'Always day. Switch to always night' },
      night: { icon: 'moon',  name: 'Night', sub: 'tap for cycle', next: 'cycle', aria: 'Always night. Switch to follow the run' },
    };
    const qs = new URLSearchParams(location.search);
    let mode = o.time === 'night' ? 'night' : 'cycle';
    try { const m = localStorage.getItem('byoc.timeMode'); if (MODES[m]) mode = m; } catch (e) { /* no storage */ }
    if (qs.get('night') === '1') mode = 'night'; else if (qs.get('night') === '0' && mode === 'night') mode = 'day';
    function drawPill() {
      const m = MODES[mode];
      sky.innerHTML = `<svg class="ic" viewBox="0 0 18 18">${ICON[m.icon]}</svg>${m.name}<span class="pi-sub">${m.sub}</span>`;
      sky.setAttribute('aria-label', m.aria); sky.dataset.mode = mode;
      inkPill(sky);
    }
    function setNight(on) {
      if (on === state.night) return;
      state.night = on; plate.classList.toggle('on', on); L.classList.toggle('night', on);
      setLights(on); syncAmbient();
    }
    function setMode(m) {
      if (!MODES[m]) return;
      mode = m; drawPill();
      try { localStorage.setItem('byoc.timeMode', m); } catch (e) { /* no storage: the choice lasts this visit */ }
      if (m !== 'cycle') setNight(m === 'night');                      // answer the click at once; the scene follows
      document.dispatchEvent(new CustomEvent('studio:time', { detail: { mode: m, from: 'playful-ink' } }));
    }
    sky.addEventListener('click', () => setMode(MODES[mode].next));

    // ---------- ducking during focus ----------
    document.addEventListener('studio:focus', e => api.duck(!!(e.detail && e.detail.open)));
    // the living layer reports the scene it shows: night is the only time with its own lamp-lit look, every other is day
    document.addEventListener('studio:time', e => { const d = e.detail || {}; if (d.from === 'playful-ink' || !d.time) return; setNight(d.time === 'night'); });

    const api = {
      el: L, state,
      duck(on) { state.duck = on; setVolume(); },
      setNight, setMode, mode: () => mode, setLights, play, hearts,
      showTrack: flashTrack,
      destroy() { stopAll(); if (rainLayer) rainLayer.end(0); L.remove(); },
    };
    state.night = null; drawPill(); setNight(mode === 'night' || o.time === 'night');
    window.PlayfulInk.current = api;
    return api;
  }
  window.PlayfulInk = { mount, TRACKS };
})();
