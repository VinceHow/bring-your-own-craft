# Components: the contract between the room's code and its looks

**Status: draft 2: names, states, slots, events, and markup skeletons from the live DOM.** ✅ means the attributes are in the code. It's based on the markup on `main` (593d900) and on
`build/beats` (71e4ccc). Markup skeletons and the `/gallery` page come next.

**Why it exists:** visuals now come only from the design studio (`?look=<name>`, layered from `public/looks/`). A look
should target stable hooks, not whatever class a builder happened to write. Each component gets the following:

- **Root hook:** its existing class, plus `data-component="<name>"`. Never rename the class; the attribute is added
  next to it.
- **`data-state`:** one value at a time, from the list below, kept on the root. JS sets it, and looks only read it.
- **`data-slot`:** on each content part a look may restyle or hide. Slots never change what's in them.
- **`data-seat`** (`design|data|research|strategy|engineering|product`): on anything that belongs to a seat.
  Looks pick that seat's ink from it.
- **Events:** the `BYOC` events the component listens to (`on`) or sends (`emit`). They show how to drive a state
  from fixture data, which is what `/gallery` does.

Rules for builders: add the attributes and keep the existing classes. The attributes are hooks for looks and tests
only; never build logic on them. Room-wide state stays on `<body>`: `body.focus-open`, `body.stage`, and
`body[data-beat]`.

Who adds the attributes, file by file:

| Who adds the attributes | Files |
|---|---|
| beats | `room.js`, `focus-doc.js`, `close.js`, `index.html` |
| builder 6 | `first-sketch.js`, `name-tag.js` |
| this doc's author (lead-assigned; those builders are done) | `flow.js`, `sketches.js`, `idea-sheet.js`, `team-space.js`, `replay.js` |

---

## 1. Room furniture

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `room` | `main#room` | (none; see body classes) | (none) | on `stage`, `reset` |
| `table` | `.table` | (none) | (none) | (none) |
| `seat` | `.seat[data-seat]` | `empty` · `filled` · `her` | `empty-label` (`.seat-empty`) | on `stage`, `teammate.start` |

## 2. Cards at the table

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `place-card` (a seat's card once filled) | `.seat .card` | `idle` · `working` · `done` · `error` | `band` (`.card-band`), `name` (`.card-name`), `agent` (`.card-agent-name`), `agent-mark` (`.agent-mark`), `stance` (`.card-stance`), `note` (`.card-note`) | on `teammate.start` / `teammate.done` / `teammate.error` |
| `her-place-card` | `.seat-product .card` | `empty` · `named` (her character is set) | `band`, `who` (`.card-who`), `title` (`.card-title`, planned), `traits` (`.card-traits`, planned); `stance` (`.card-her-stance`) is to be removed | on `intro` |
| `teammate-card` (big, mid-table, while the team assembles) | `.big-card[data-seat]` | `arriving` · `holding` · `seating` | `band`, `loves` (`.bc-loves`), `brings` (`.bc-brings`), `stance` (`.bc-stance`, to be removed) | on `stage` (beat 2) |
| `character-card` (her card: build your character; one component, two roots) | DIY craft: `.name-tag` ✅ (builder 6) · her seat path: `.big-card[data-seat="product"]` (beats, planned) | `asking` (her sentence) · `thinking` (the team is writing it) · `shown` (every word swappable) | `head`, `ask`, `input`, `title`, `traits` > `trait`, `superpower`, `craft`, `hint` | `BYOC.nameTag.open()`; on `stage`, `reset` |
| `no-page-note` (DIY idea with no page template) | `.idea-note` ✅ | (one state) | (none) | (builder 6) |

## 3. The work

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `sketchpad` (a teammate's own calls) | `.mini-sheet[data-sheet]` | `waiting` · `working` · `done` · `error` | `head` (`.mini-head`), `title` (`.mini-title`), `step` (`.mini-step`), `lines` (`.mini-lines`), `more` (`.mini-more`) | on `candidate`, `decided`, `teammate.*`, `lean`, `stamp` |
| `idea-sheet` (the middle sheet) | `.idea-sheet` ✅ | `blank` · `rough` · `sketched` · `reshaped` · `wires` · `page` (same as `data-step`) | `tabs` (`.idea-tabs`), `tab` (`.idea-tab`) | on `run.start`, `stage`, `reset` |
| `idea-layer` | `.idea-layer` (`#sketch-sheet`, `#page-sheet`) ✅ | `on` · `off` | (none) | (none) |
| `her-idea` (her rough sentence) | `#her-sheet .her-q` + `.her-idea` + `.her-form` | `asking` · `said` | `question` (`.her-q`), `idea` (`.her-idea`), `input` (`.her-form input`), `hint` (`.her-hint`) | on `stage` |
| `journey` (the rough journey) | `.fl-wrap` inside `#her-flow` ✅ | `empty` · `drawing` (new boxes landing, ~0.6 s) · `drawn` | `box` (`.fl-box`, with `data-node`), `arrow`, `label` (`.fl-label`), `note` (`.her-notes`) | on `flow.line`, `flow.reset`, `pin` |
| `first-sketch` (her journey sketched by Noor and Mika) | `.fs-bar` ✅ (in the close: `.fs-close-sketch`) | `drawing` · `drawn` · `reshaping` | `users`, `user`, `who`, `tag` (PREPARED / timing), `said`, `edit` (`.fs-pop`); in the close: `boxes`, `box`, `arrow` | on `sketch.user`, `sketch.done`, `reshape`, `sketch.error` |
| `wireframes` | `.sk-host` ✅ | `shown` · `drafting` (she is pinning a note); the wait before them is `#sketch-wait` in room.js | `frame` (`.sk-frame`), `screen` (`.sk-screen`), `head` (`.sk-head`), `title` (`.sk-title`), `caption` (`.sk-cap`), `tag` (`.sk-tag`), `note` (`.sk-note`), `row` (`.sk-row`), `pinned` (`.sk-pinned`) | on `sketches` |
| `page-frame` (her page) | `.page-frame` in `#page-sheet` | `building` · `built` · `error` | `head` (`.page-head`), `title` (`.page-title`), `url` (`.page-url`), `frame` (`iframe`) | on `build.step`, `build.done`, `build.error` |
| `her-file` (taste.md) | `#file-card.file-card` | `empty` · `filled` | `name` (`.file-name`), `path` (`.file-path`), `lines` (`.file-lines`), `line` (`.file-lines li`), `note` (`.file-note`), `sounds-like` (`.sounds-like`, to be removed) | on `taste.suggested`, `taste.written` |
| `tally` (counter and meter) | `#tally.tally` | `hidden` · `counting` · `settled` | `came` (`#came`), `brought` (`#brought`), `pct` (`#pct`), `bar` (`.meter-bar`), `counts` (`.meter-counts`) | on `decided`, `ask`, `select.done`; emit `counter.tap` |

## 4. Her focus

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `tray` | `aside#tray.tray` | `empty` (hidden) · `waiting` | (none) | on `ask`, `answer`, `reset` |
| `tray-note` | `.tray-note[data-seat][data-ask]` | `top` (`.tray-top`) · `waiting` | `seat` (`.tray-seat`), `text` (`.tray-text`) | click opens the focus doc |
| `focus-doc` (her document) | `section#focus-doc.focus-doc[data-seat]` | `asking` (no answer yet) · `speaking` (`.fd-said.speaking`) · `answered` · `chiming` · `takeaways` · `working` (`.fd-team` filled) | `kicker` (`.fd-kicker`), `by` (`.fd-by`), `close` (`.fd-close`), `work` (`.fd-work`, with `data-kind`: `journey\|finding\|wires\|page`), `question` (`.fd-question`), `input` (`.fd-input`), `team` (`.fd-team`) | on `chime`, `brief`, `answer`, `answer.mapped`, `flow.line`; emit `focus.open`, `focus.close`, `focus` |
| `her-answer` (her spoken words) | `.fd-said` > `blockquote.fd-words` | `speaking` · `landed` | `words` (`.fd-words`) | (inside `focus-doc`) |
| `chime` (a teammate's reaction) | `li.chime[data-seat]` in `ol.fd-chimes` | `in` (the only state) | `who` (`.chime-who`), `text` (`.chime-text`) | on `chime` |
| `takeaways` | `.fd-brief` | `hidden` · `shown` · `editing` · `kept` | `believe` (`.brief-believe .brief-text`), `guidance` (`.brief-guidance .brief-text`), `label` (`.brief-label`), `keep` (`.fd-keep`); `why` (`.brief-why`) is to be removed | on `brief`; POSTs `/brief` |

## 5. The team's thinking

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `chatter` (container) | `.chatter` | (none) | (none) | on `chatter` |
| `chatter-line` | `.chatter-line[data-seat]` | `in` · `leaving` | `who` (`.chatter-who`), `text` (`.chatter-text`) | on `chatter` |
| `team-space` | `section.team-space` ✅ | `empty` (hidden) · `shown` | `title` (`.ts-title`), `cards` (`.ts-cards`) | on `joint.agreed`, `run.start`, `reset` |
| `decision-card` | `li.ts-card[data-joint]` ✅ | `closed` · `open` (mirrors `aria-expanded`) | `marks` (`.ts-marks`), `mark` (`.ts-mark[data-seat]`), `headline` (`.ts-headline`), `takeaways-note` (`.ts-takeaways`), `label` (`.ts-label`), `exchange` (`.ts-exchange`), `turn` (`.ts-turn[data-seat]`) > `by` (`.ts-by`), `text` (`.ts-text`) | on `joint.agreed` |
| `check-in` (retired on main 5ea3915: questions reach her through the tray and her document; kept for old runs) | `.fl-item[data-ask]` ✅ | `waiting` · `open` · `answered` (each option keeps `is-rec` / `is-chosen` / `is-dropped`) | `question` (`.fl-qtext`), `options` (`.fl-opts`), `option` (`.fl-opt`), `why` (`.fl-why`), `source` (`.fl-src`) | on `ask`, `answer`; emit `checkin.open`, `checkin.close` |
| `guest-card` (optional) | `.guest-card` ✅ | `in` · `shown` | `head`, `tag`, `who`, `note`, `says`, `points` | on `guest` |

## 6. The close and labels

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `close-view` | `#close-sheet.close-sheet` | `asking` (judge's idea) · `sketching` · `contrast` (data-phase) | `input` (`.close-input`), `sketch` (`.close-sketch`), `question` (`.close-q`), `them` (`.close-them`), `her` (`.close-her`), `count` (`.close-count`), `big` (`.close-big`), `label` (`.close-label`) | on `stage`, `reset` |
| `replay-label` | `#replay-label.replay-label` ✅ | `hidden` · `fake` (fixture) · `replay` (recorded run) | `note` (the small line) | on `reset`; `BYOC.replayLabel(kind, …)` |
| `prepared-label` | `.prepared` / `.prep` | (one state) | (none) | (none) |
| `live-step` (a call she's waiting on; never a spinner) | `.live-step` | `running` · `slow` · `failed` · `done` | `label` | `BYOC.api(…, { step })` |

---

## Markup skeletons
Taken from the live DOM in `/gallery` on main 845551e. Each one is the component in the state named, with text
cut short and repeated siblings collapsed (`… ×n more`). Only hook attributes are kept: class, id, `data-*` and
aria. Where a skeleton has no `data-component` yet, its builder still has to add the attributes from the tables
above. To regenerate after markup changes: `OUT=skel.json node design/skeletons.js` with the server running.

One collision to know about: `voice.js` already puts `data-state` (`typed` · `listening` …) on its `.voice-mic`
inside other components. A look should always scope a state to its component, as in
`[data-component="focus-doc"][data-state="asking"]`, never bare `[data-state="asking"]`.

### `seat` (empty)
```html
<div class="seat seat-design" data-seat="design">
  <div class="seat-empty">Design</div>
</div>
```

### `place-card` (working)
```html
<div class="card">
  <div class="card-band">
    <svg>…</svg>
    <span class="card-name">Design</span>
    <span class="card-who">
      <span class="card-agent-name">Mika</span>
      <span class="agent-mark">agent</span>
    </span>
  </div>
  <div class="card-stance">sketch first, polish last</div>
  <div class="card-note">Seat open: invite a teammate. Your a…</div>
</div>
```

### `her-place-card` (empty)
```html
<div class="card">
  <div class="card-band">
    <svg>…</svg>
    <span class="card-name">Product</span>
  </div>
  <div class="card-her">
    <span class="card-who">Priya · your seat</span>
    <span class="card-her-stance empty" id="her-stance">We’ll find out today.</span>
  </div>
</div>
```

### `teammate-card` (holding)
```html
<div class="big-card" data-seat="engineering">
  <div class="card-band">
    <svg>…</svg>
    <span class="card-name">Engineering</span>
    <span class="card-who">
      <span class="card-agent-name">Bo</span>
      <span class="agent-mark">agent</span>
    </span>
  </div>
  <dl class="bc-body">
    <dt>Loves</dt>
    <dd class="bc-loves">“Boring, correct, shipped.”</dd>
    <dt>Brings</dt>
    <dd class="bc-brings">the page template and the live build</dd>
    <dt>Stance</dt>
    <dd class="bc-stance">boring and correct</dd>
  </dl>
</div>
```

### `character-card` (asking)
```html
<section class="name-tag" data-component="character-card" data-state="asking">
  <div class="tag-head" data-slot="head">Name tag</div>
  <div class="tag-say">
    <div class="tag-ask" data-slot="ask">Your own craft. In a few words: what…</div>
    <input class="tag-input" data-slot="input" type="text"></input>
    <span class="voice-mic" role="button" data-state="typed">
      <svg>…</svg>
      <span class="voice-word">typed</span>
    </span>
    <div class="tag-hint" data-slot="hint">Enter: the team makes your name tag …</div>
  </div>
  <div class="tag-card" hidden>
    <div class="tag-craftline">
      <span class="tag-craft" contenteditable="true" data-slot="craft"></span>
    </div>
    <span class="tag-title" data-slot="title"></span>
    <div class="tag-traits" data-slot="traits"></div>
    <div class="tag-power" data-slot="superpower"></div>
    <div class="tag-hint" data-slot="hint">The team’s read of you · click any p…</div>
  </div>
</section>
```

### `sketchpad` (working)
```html
<section class="mini-sheet" data-sheet="design">
  <div class="mini-head">
    <i></i>
    <span class="mini-title">Design</span>
    <span class="mini-step">working: proposing</span>
  </div>
  <ul class="mini-lines">
    <li>Class list as cards or rows?</li>
  </ul>
  <div class="mini-more"></div>
</section>
```

### `idea-sheet` (blank)
```html
<section id="her-sheet" class="her-sheet idea-sheet" data-component="idea-sheet" data-state="blank">
  <h1 class="her-q">What’s the idea?</h1>
  <p class="her-idea" id="her-idea"></p>
  <div class="her-flow fl-host" id="her-flow">
    <div class="fl-wrap" data-component="journey" data-state="empty">
      <div class="fl-canvas">
        <svg>…</svg>
      </div>
    </div>
    <div class="fl-lens"></div>
  </div>
  <div class="her-notes" id="her-notes"></div>
  <form id="her-form" class="her-form voice-idea">
    <input id="her-input" class="her-input" type="text"></input>
    <span class="voice-mic" role="button" data-state="typed">
      <svg>…</svg>
      <span class="voice-word">typed</span>
    </span>
    <span class="her-hint" id="her-hint">Enter to write it down</span>
  </form>
  <section id="sketch-sheet" class="sketch-sheet idea-layer" hidden data-component="idea-layer" data-state="off">
    <div class="sketch-wait" id="sketch-wait"></div>
    <div class="sketch-inner" id="sketch-inner"></div>
  </section>
  <section class="page-sheet idea-layer" id="page-sheet" hidden data-component="idea-layer" data-state="off">
    <div class="page-head">
      <span class="page-title">Her page</span>
      <span class="page-url" id="page-url"></span>
    </div>
    <div class="page-frame">
      <iframe id="page-iframe">
    </div>
  </section>
  <nav class="idea-tabs" data-slot="tabs" hidden>
    <button class="idea-tab is-on" type="button" data-slot="tab" data-view="sketch" hidden>sketch</button>
    <button class="idea-tab" type="button" data-slot="tab" data-view="screens" hidden>screens</button>
    … ×1 more
  </nav>
</section>
```

### `journey` (drawn)
```html
<div class="fl-wrap" data-component="journey" data-state="drawn">
  <div class="fl-canvas">
    <svg>…</svg>
    <button class="fl-box" data-slot="box" type="button" data-node="n1">
      <span class="fl-label" data-slot="label">classes</span>
    </button>
    … ×4 more
  </div>
</div>
```

### `wireframes` (shown)
```html
<div class="sketch-inner sk-host" id="sketch-inner" data-component="wireframes" data-state="shown">
  <div class="sk-head" data-slot="head">
    <span class="sk-tag" data-slot="tag">DESIGN</span>
    <span class="sk-title" data-slot="title">First sketches</span>
    <span class="sk-note" data-slot="note">REPLAY</span>
  </div>
  <div class="sk-row" data-slot="row">
    <div class="sk-frame" data-slot="frame" data-node="n1">
      <div class="sk-cap" data-slot="caption">Classes</div>
      <div class="sk-screen" data-slot="screen">
        <div class="bk bk-header" data-kind="header">
          <span class="bk-logo"></span>
          <span class="bk-title">Classes</span>
          <span class="bk-menu">
            <span class="bk-bar"></span>
            … ×2 more
          </span>
        </div>
        <div class="bk bk-list" data-kind="class-list">
          <div class="bk-cap">This week's classes</div>
          <div class="bk-row">
            <span class="bk-time"></span>
            <span class="bk-rowtext">
              … ×1 more
            </span>
            <span class="bk-pill"></span>
          </div>
          … ×2 more
        </div>
        <div class="bk bk-text" data-kind="text">Full classes are marked as full.</div>
        <div class="bk bk-button" data-kind="button">Book your usual</div>
      </div>
    </div>
    … ×4 more
  </div>
</div>
```

### `page-frame` (built)
```html
<div class="page-frame">
  <iframe id="page-iframe">
</div>
```

### `her-file` (empty)
```html
<section id="file-card" class="file-card">
  <header class="file-head">
    <span class="file-name">her file</span>
    <span class="file-path">taste.md</span>
  </header>
  <ol class="file-lines" id="file-lines"></ol>
  <div class="sounds-like" id="sounds-like" hidden></div>
  <div class="file-note" id="file-note">Her file opens when a run starts.</div>
</section>
```

### `tally` (settled)
```html
<section id="tally" class="tally">
  <button class="counter" id="counter" type="button">
    <span class="counter-row">
      <span class="roll" id="came">
        <span class="col">
          <span>0</span>
          … ×9 more
        </span>
        … ×1 more
      </span>
      <span class="counter-label">decisions came up</span>
    </span>
    … ×1 more
  </button>
  <div class="meter" id="meter">
    <div class="meter-label">In your craft</div>
    <div class="meter-num">
      <span class="roll" id="pct">
        <span class="col">
          <span>0</span>
          … ×9 more
        </span>
        … ×2 more
      </span>
      <span class="meter-unit">%</span>
    </div>
    <div class="meter-bar">
      <span class="meter-craft" id="meter-craft"></span>
      <span class="meter-stamp" id="meter-stamp"></span>
    </div>
    <div class="meter-counts" id="meter-counts">craft 14 · stamping 0</div>
  </div>
</section>
```

### `tray` (waiting)
```html
<aside class="tray" id="tray">
  <button type="button" class="tray-note tray-top" data-ask="re1" data-seat="research">
    <span class="tray-seat">Noor · Research</span>
    <span class="tray-text">Full classes: waitlist or "full"?</span>
  </button>
  <button type="button" class="tray-note" data-ask="pr1" data-seat="product">
    <span class="tray-seat">Product</span>
    <span class="tray-text">What counts as a regular?</span>
  </button>
  … ×1 more
</aside>
```

### `tray-note` (top)
```html
<button type="button" class="tray-note tray-top" data-ask="re1" data-seat="research">
  <span class="tray-seat">Noor · Research</span>
  <span class="tray-text">Full classes: waitlist or "full"?</span>
</button>
```

### `focus-doc` (asking)
```html
<section class="focus-doc" id="focus-doc" data-seat="research">
  <header class="fd-head">
    <span class="fd-kicker">Noor · Research</span>
    <span class="fd-by">proposed by Noor and Mika</span>
    <button type="button" class="fd-close">Back to the room</button>
  </header>
  <div class="fd-main">
    <div class="fd-work" data-kind="journey">
      <div class="fd-row">
        <span class="fd-box" data-node="n1">classes</span>
        <span class="fd-arrow">→</span>
        <span class="fd-box" data-node="n2">a class</span>
        <span class="fd-arrow">→</span>
        <span class="fd-box" data-node="n3">confirm</span>
        <span class="fd-arrow">→</span>
        <span class="fd-box" data-node="n4">booked</span>
      </div>
      … ×1 more
    </div>
    <h2 class="fd-question">What makes someone come back to a st…</h2>
    <div class="fd-said"></div>
    <form class="fd-form">
      <textarea class="fd-input"></textarea>
      <span class="voice-mic" role="button" data-state="typed">
        <svg>…</svg>
        <span class="voice-word">typed</span>
      </span>
    </form>
  </div>
  <aside class="fd-side">
    <ol class="fd-chimes"></ol>
    <div class="fd-brief" hidden>
      <div class="brief-part brief-believe">
        <span class="brief-label">What I believe</span>
        <p class="brief-text" contenteditable="false"></p>
      </div>
      <div class="brief-part brief-why">
        <span class="brief-label">Why</span>
        <p class="brief-text" contenteditable="false"></p>
      </div>
      <div class="brief-part brief-guidance">
        <span class="brief-label">Guidance to the team</span>
        <p class="brief-text" contenteditable="false"></p>
      </div>
      <button type="button" class="fd-keep">Keep it</button>
  …
```

### `takeaways` (shown)
```html
<div class="fd-brief">
  <div class="brief-part brief-believe">
    <span class="brief-label">What I believe</span>
    <p class="brief-text" contenteditable="true">Regulars should never hunt for their…</p>
  </div>
  <div class="brief-part brief-why">
    <span class="brief-label">Why</span>
    <p class="brief-text" contenteditable="true"></p>
  </div>
  <div class="brief-part brief-guidance">
    <span class="brief-label">Guidance to the team</span>
    <p class="brief-text" contenteditable="true">Put a regular’s usual class first, o…</p>
  </div>
  <button type="button" class="fd-keep">Keep it</button>
</div>
```

### `chime` (in)
```html
<li class="chime" data-seat="design">
  <span class="chime-who">Mika · Design</span>
  <span class="chime-text">Love that. Regulars go first, their …</span>
</li>
```

### `chatter-line` (in)
```html
<div class="chatter-line" data-seat="design">
  <span class="chatter-who">Mika:</span>
  <span class="chatter-text">then remember them on the device.</span>
</div>
```

### `team-space` (shown)
```html
<section class="team-space" data-component="team-space" data-state="shown">
  <div class="ts-title" data-slot="title">Team space</div>
  <ol class="ts-cards" data-slot="cards">
    <li class="ts-card" data-joint="g-j1" role="button" aria-expanded="false" data-component="decision-card" data-state="closed">
      <span class="ts-marks" data-slot="marks">
        <span class="ts-mark" data-slot="mark" data-seat="engineering">Bo</span>
        … ×1 more
      </span>
      <span class="ts-headline" data-slot="headline">Waitlist auto-offers the spot, no lo…</span>
      <span class="ts-takeaways" data-slot="takeaways-note">with your takeaways in mind</span>
      <span class="ts-label" data-slot="label">Talk this through: coming</span>
      <ol class="ts-exchange" data-slot="exchange">
        <li class="ts-turn" data-slot="turn" data-seat="engineering">
          <span class="ts-by" data-slot="by">Bo:</span>
          <span class="ts-text" data-slot="text">Logins slow regulars down.</span>
        </li>
        … ×2 more
      </ol>
    </li>
    … ×1 more
  </ol>
</section>
```

### `decision-card` (closed)
```html
<li class="ts-card" data-joint="g-j1" role="button" aria-expanded="false" data-component="decision-card" data-state="closed">
  <span class="ts-marks" data-slot="marks">
    <span class="ts-mark" data-slot="mark" data-seat="engineering">Bo</span>
    … ×1 more
  </span>
  <span class="ts-headline" data-slot="headline">Waitlist auto-offers the spot, no lo…</span>
  <span class="ts-takeaways" data-slot="takeaways-note">with your takeaways in mind</span>
  <span class="ts-label" data-slot="label">Talk this through: coming</span>
  <ol class="ts-exchange" data-slot="exchange">
    <li class="ts-turn" data-slot="turn" data-seat="engineering">
      <span class="ts-by" data-slot="by">Bo:</span>
      <span class="ts-text" data-slot="text">Logins slow regulars down.</span>
    </li>
    … ×2 more
  </ol>
</li>
```

### `close-view` (asking)
```html
<section id="close-sheet" class="close-sheet">
  <div class="close-left">
    <div class="close-pile">
      <i></i>
      … ×8 more
    </div>
    <div class="close-them">
      <div class="close-label">A default coding agent</div>
      <div class="close-big"> asked  guessed
        <b id="close-b-asked">0</b>
        <span>·</span>
        <b class="red" id="close-b-guessed">22</b>
      </div>
      <div class="close-src" id="close-b-src">plain coding agent, same prompt, 14 …</div>
    </div>
    <div class="close-her" id="close-her" hidden>
      <div class="close-label">Her, in the Product seat</div>
      <div class="close-big"> asked the rest handled by her …
        <b class="pink" id="close-asked"></b>
        <span>·</span>
      </div>
      <div class="close-src" id="close-her-src"></div>
    </div>
    <p class="close-built" id="close-built" hidden>This project was built the same way.…</p>
  </div>
  <div class="close-right">
    <div class="close-label">A judge’s idea</div>
    <form id="close-form">
      <input id="close-input" class="close-input"></input>
    </form>
    <div class="close-step" id="close-step"></div>
    <div class="close-sketch" id="close-sketch"></div>
    <div class="close-count" id="close-count"></div>
    <ol class="close-asks" id="close-asks"></ol>
  </div>
</section>
```

### `replay-label` (fake)
```html
<div id="replay-label" class="replay-label fake" data-component="replay-label" data-state="fake"> Fake run
  <small data-slot="note">fixture for building the room · not …</small>
</div>
```

## The gallery: `/gallery`
`public/gallery.html` + `public/gallery.js`. One section per component, its states side by side.
- **How it's drawn:** each state is the real room in its own iframe, so states never leak into each other.
  `gallery.js` plays recorded events into `BYOC` instantly, then zooms the frame onto the component.
  - The recordings are the rehearsal run in `runs/` and the fake fixture.
  - No model calls, no flow.
- **Sample events:** where no recording has a state yet (chime-ins, takeaways, team space, chatter), the gallery
  sends a few made-up events and says so under that state.
- **Under each state,** it shows whether the root carries `data-component` / `data-state` yet, and how many
  `data-slot`s it holds, so builders can see what's left to add.
- `?look=<name>` passes through to every frame, so the design studio sees a look on every component at once.
- A state whose markup isn't on this branch shows as "Not drawn" with the reason, never as a broken frame.
- **To add a state:** add an entry to `CATALOGUE` in `gallery.js`, with the events that reach it.

## Which events reach each state
The `CATALOGUE` in `public/gallery.js` lists, per component and state, the recorded or sample events that reach
it. It runs, so it stays true, unlike a list written here.
