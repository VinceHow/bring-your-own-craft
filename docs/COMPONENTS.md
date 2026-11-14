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
| `seat` | `.seat[data-seat]` ✅ | `empty` · `filled` · `her` | `empty-label` (`.seat-empty`) | on `stage`, `teammate.start` |
| `pick-card` (her seat's choice: "What do you bring to the table?" · Product · Your own craft; no seventh seat) | `aside#pick-card.pick-card` ✅ | `hidden` · `open` · `picked` (with `data-pick` `product` or `craft`) | `question` (`.pick-q`), `options` (`.pick-options`), `option` (`.pick-option[data-pick]`) | opens on a click on her empty seat or the clicker's forward; forward again picks Product; Esc closes. `craft` opens the name tag (`BYOC.nameTag.open()`). Emit `pick.open`, `pick.done {pick}`; `BYOC.pick` |

## 2. Cards at the table

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `place-card` (a seat's card once filled) | `.seat .card` ✅ | `idle` · `thinking` (started, nothing proposed yet) · `working` · `done` · `error` | `band` (`.card-band`), `name` (`.card-name`), `agent` (`.card-agent-name`), `agent-mark` (`.agent-mark`), `stance` (`.card-stance`), `character` (`.card-character`, empty: for the studio's character art) | on `teammate.start` / `candidate` / `teammate.done` / `teammate.error`; emit `teammate.thinking {seat}` (between its start and its first candidate). Click opens its `sketchpad-open`; emit `seat.open {seat}` |
| `her-place-card` | `.seat-product .card` ✅ (her own craft: `.seat-product .card.card-diy[data-seat="diy"]`, named by her craft) | `empty` · `named` (her character is set) | `band`, `who` (`.card-who`: "Priya · your seat", just "Priya" once her title is set), `title` (`.card-title`), `traits` (`.card-traits`), `character` (`.card-character`, empty) | on `intro`. Click (once she's seated) opens her `workspace`: `BYOC.openWorkspace()`; emit `workspace.open` |
| `teammate-card` (big, mid-table, while the team assembles) | `.big-card[data-seat]` ✅ | `arriving` · `holding` · `seating` | `band`, `loves` (`.bc-loves`), `brings` (`.bc-brings`) | on `stage` (beat 2) |
| `character-card` (her card: build your character; one component, two roots) | her seat: `.big-card[data-seat="product"]` ✅ (beats) · DIY craft: `.name-tag` ✅ (builder 6) | `asking` (her sentence) · `thinking` (the team is writing it) · `shown` (every word swappable) | `input`, `character` (`.char-body`), `title` (`.char-title` / `.tag-title`), `traits` > `trait` (`.char-swap` / `.tag-trait`), `superpower` (`.char-power-text` / `.tag-power`), `craft` (DIY only), `hint`; DIY also `head`, `ask` | `BYOC.nameTag.open()`; on `stage`, `reset` |
| `room-panel` (one panel over the room; Esc, PageUp, ← or its close return to the room) | `section#room-panel.room-panel` ✅, `data-component` is `sketchpad-open` or `workspace` | `hidden` · open | `head` (`.rp-head`), `title` (`.rp-title`), `close` (`.rp-close`), `body` (`.rp-body`) | `BYOC.closePanel()`; closes on `reset` |
| `sketchpad-open` (a teammate's pad, opened from its card) | `#room-panel[data-component="sketchpad-open"][data-seat]` ✅ | (one state; empty shows a short line) | `items` (`ol.sp-items`) > `item` (`li.sp-item`, `data-state` `brought` · `decided` · `open`) > `decision` (`.sp-decision`), `choice` (`.sp-choice`), `reason` (`.sp-reason`) | `BYOC.openSketchpad(seat)`; emit `seat.open {seat}` |
| `workspace` (hers: character, idea, team space, takeaways so far) | `#room-panel[data-component="workspace"]` ✅ | (one state) | `body` (`.ws-body`) > parts with `data-slot` `character` · `idea` (with its journey) · `team-space` · `takeaways` | `BYOC.openWorkspace()`; emit `workspace.open`. The tray stays the way into each question |
| `no-page-note` (DIY idea with no page template) | `.idea-note` ✅ | (one state) | (none) | (builder 6) |

## 3. The work

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `sketchpad` (a teammate's own calls) | `.mini-sheet[data-sheet]` ✅ | `waiting` · `working` · `done` · `error` | `head` (`.mini-head`), `title` (`.mini-title`), `step` (`.mini-step`), `lines` (`.mini-lines`), `more` (`.mini-more`) | on `candidate`, `decided`, `teammate.*`, `lean`, `stamp` |
| `idea-sheet` (the middle sheet) | `.idea-sheet` ✅ | `blank` · `rough` · `sketched` · `reshaped` · `wires` · `page` (same as `data-step`) | `tabs` (`.idea-tabs`), `tab` (`.idea-tab`) | on `run.start`, `stage`, `reset`. A click on its paper (not a box, tab or button) opens it large: `data-open="true"` (its own attribute, since `data-state` is the step); another click, Esc, a beat change or reset puts it back. Emit `sheet.open` / `sheet.close`; `BYOC.sheetOpen(on)` |
| `idea-layer` | `.idea-layer` (`#sketch-sheet`, `#page-sheet`) ✅ | `on` · `off` | (none) | (none) |
| `her-idea` (her rough sentence) | `#her-form` ✅ | `asking` · `said` | `question` (`.her-q`), `idea` (`.her-idea`), `input` (`.her-form input`), `hint` (`.her-hint`) | on `stage` |
| `journey` (the rough journey) | `.fl-wrap` inside `#her-flow` ✅ | `empty` · `drawing` (new boxes landing, ~0.6 s) · `drawn` | `box` (`.fl-box`, with `data-node`), `arrow`, `label` (`.fl-label`), `note` (`.her-notes`) | on `flow.line`, `flow.reset`, `pin` |
| `first-sketch` (her journey sketched by Noor and Mika) | `.fs-bar` ✅ (in the close: `.fs-close-sketch`) | `drawing` · `drawn` · `reshaping` | `users`, `user`, `who`, `tag` (PREPARED / timing), `said`, `edit` (`.fs-pop`); in the close: `boxes`, `box`, `arrow` | on `sketch.user`, `sketch.done`, `reshape`, `sketch.error` |
| `wireframes` | `.sk-host` ✅ | `shown` · `drafting` (she is pinning a note); the wait before them is `#sketch-wait` in room.js | `frame` (`.sk-frame`), `screen` (`.sk-screen`), `head` (`.sk-head`), `title` (`.sk-title`), `caption` (`.sk-cap`), `tag` (`.sk-tag`), `note` (`.sk-note`), `row` (`.sk-row`), `pinned` (`.sk-pinned`) | on `sketches` |
| `page-frame` (her page) | `.page-frame` in `#page-sheet` ✅ | `building` · `built` · `error` | `head` (`.page-head`), `title` (`.page-title`), `url` (`.page-url`), `frame` (`iframe`) | on `build.step`, `build.done`, `build.error` |
| `her-file` (taste.md) | `#file-card.file-card` ✅ | hidden from the room (Vincent: her philosophy is the team's, never shown unless she asks) | `name`, `path`, `lines`, `line`, `note` | on `taste.suggested`, `taste.written` |
| `tally` (counter and meter) | `#tally.tally` ✅ | `hidden` · `counting` | `came` (`#came`), `brought` (`#brought`), `pct` (`#pct`), `bar` (`.meter-bar`), `counts` (`.meter-counts`) | on `decided`, `ask`, `select.done`; emit `counter.tap` |

## 4. Her focus

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `inbox` (her inbox by her seat; replaced the tray) | `aside#inbox.inbox` ✅ | `collapsed` · `expanded` (and `data-needs` = `yes`·`no`) | `now` (the one item, or "Nothing needs you right now"), `toggle`, `drawer`; parts `needs` · `only-you` · `meetings` (each `[data-part]` with `title`, `body`), `next` (the folded rest), `empty` | on `owner.task`, `stage`, `reset`; reads `BYOC.focus.waiting` via room.js |
| `inbox-item` (one thing that needs her) | `.inbox-item[data-ask][data-seat]` ✅ | `top` · `folded` | `who`, `text` | click opens it as her document |
| `owner-task` (a thing only she can do) | `article.inbox-task[data-task]` ✅ | `todo` · `doing` · `done` | `title`, `steps` > `step` (each `data-state` todo·done, with a `tick` box); never a text or key field | on `owner.task` `{ id, title, steps[] }` |
| `focus-doc` (her document) | `section#focus-doc.focus-doc[data-seat]` ✅ | `asking` · `speaking` · `answered` · `chiming` · `takeaways` · `working` | `kicker` (`.fd-kicker`), `by` (`.fd-by`), `close` (`.fd-close`), `work` (`.fd-work`, with `data-kind`: `journey\|finding\|wires\|page`), `question` (`.fd-question`), `input` (`.fd-input`), `send` (`.fd-send`), `team` (`.fd-team`) | on `chime`, `takeaways` (`brief` for old runs), `answer`, `answer.mapped`, `flow.line`; emit `focus.open`, `focus.close`, `focus` |
| `her-answer` (her spoken words) | `.fd-said` ✅ | `speaking` · `landed` | `words` (`.fd-words`) | (inside `focus-doc`) |
| `chime` (a teammate's reaction) | `li.chime[data-seat]` in `ol.fd-chimes` ✅ | `in` | `who` (`.chime-who`), `text` (`.chime-text`) | on `chime` |
| `takeaways` | `.fd-brief` ✅ | `hidden` · `shown` · `editing` · `kept` | `head` (`.brief-head`, "Takeaways"), `believe` (`.brief-believe .brief-text`), `guidance` (`.brief-guidance .brief-text`), `label` (`.brief-label`), `keep` (`.fd-keep`) | on `takeaways`; POSTs its route |

## 5. The team's thinking

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `chatter` (container) | `.chatter` ✅ | (none) | (none) | on `chatter` |
| `chatter-line` | `.chatter-line[data-seat]` ✅ | `in` · `leaving` | `who` (`.chatter-who`), `text` (`.chatter-text`) | on `chatter` |
| `team-space` | `section.team-space` ✅ | `empty` (hidden) · `shown` | `title` (`.ts-title`), `cards` (`.ts-cards`) | on `joint.agreed`, `run.start`, `reset` |
| `decision-card` | `li.ts-card[data-joint]` ✅ | `closed` · `open` (mirrors `aria-expanded`) | `marks` (`.ts-marks`), `mark` (`.ts-mark[data-seat]`), `headline` (`.ts-headline`), `takeaways-note` (`.ts-takeaways`), `label` (`.ts-label`), `exchange` (`.ts-exchange`), `turn` (`.ts-turn[data-seat]`) > `by` (`.ts-by`), `text` (`.ts-text`) | on `joint.agreed` |
| `check-in` (retired on main 5ea3915: questions reach her through the tray and her document; kept for old runs) | `.fl-item[data-ask]` ✅ | `waiting` · `open` · `answered` (each option keeps `is-rec` / `is-chosen` / `is-dropped`) | `question` (`.fl-qtext`), `options` (`.fl-opts`), `option` (`.fl-opt`), `why` (`.fl-why`), `source` (`.fl-src`) | on `ask`, `answer`; emit `checkin.open`, `checkin.close` |
| `guest-card` (optional) | `.guest-card` ✅ | `in` · `shown` | `head`, `tag`, `who`, `note`, `says`, `points` | on `guest` |

## 6. The close and labels

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `close-view` | `#close-sheet.close-sheet` ✅ | `asking` (judge's idea) · `sketching` · `contrast` | `input` (`.close-input`), `sketch` (`.close-sketch`), `question` (`.close-q`), `them` (`.close-them`), `her` (`.close-her`), `count` (`.close-count`), `big` (`.close-big`), `label` (`.close-label`) | on `stage`, `reset` |
| `replay-label` | `#replay-label.replay-label` ✅ | `hidden` · `fake` (fixture) · `replay` (recorded run) | `note` (the small line) | on `reset`; `BYOC.replayLabel(kind, …)` |
| `prepared-label` | `.prepared` / `.prep` | (one state) | (none) | (none) |
| `live-step` (a call she's waiting on; never a spinner) | `.live-step` ✅ | `running` · `slow` · `failed` · `done` | `label` | `BYOC.api(…, { step })` |

---

## Markup skeletons
Taken from the live DOM in `/gallery` on main 7f70102 plus build/beats da1553b (the room's own hooks). Each one is the component in the state named, with text
cut short and repeated siblings collapsed (`… ×n more`). Only hook attributes are kept: class, id, `data-*` and
aria. Where a skeleton has no `data-component` yet, its builder still has to add the attributes from the tables
above. To regenerate after markup changes: `OUT=skel.json node design/skeletons.cjs` with the server running.

One collision to know about: `voice.js` already puts `data-state` (`typed` · `listening` …) on its `.voice-mic`
inside other components. A look should always scope a state to its component, as in
`[data-component="focus-doc"][data-state="asking"]`, never bare `[data-state="asking"]`.

### `seat` (empty)
```html
<div class="seat seat-design" data-seat="design" data-component="seat" data-state="empty">
  <div class="seat-empty" data-slot="empty-label">Design</div>
</div>
```

### `place-card` (working)
```html
<div class="card" data-component="place-card" data-state="working" data-seat="design">
  <div class="card-band" data-slot="band">
    <svg>…</svg>
    <span class="card-name" data-slot="name">Design</span>
    <span class="card-who">
      <span class="card-agent-name" data-slot="agent">Mika</span>
      <span class="agent-mark" data-slot="agent-mark">agent</span>
    </span>
  </div>
  <div class="card-stance" data-slot="stance">sketch first, polish last</div>
  <span class="card-character" data-slot="character"></span>
</div>
```

### `her-place-card` (empty)
```html
<div class="card" data-component="her-place-card" data-state="empty">
  <div class="card-band" data-slot="band">
    <svg>…</svg>
    <span class="card-name" data-slot="name">Product</span>
  </div>
  <div class="card-her">
    <span class="card-who" data-slot="who">Priya · your seat</span>
    <span class="card-title" data-slot="title"></span>
    <span class="card-traits" data-slot="traits"></span>
  </div>
</div>
```

### `teammate-card` (holding)
```html
<div class="big-card" data-seat="engineering" data-component="teammate-card" data-state="arriving">
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
<section class="mini-sheet" data-sheet="design" data-component="sketchpad" data-state="working">
  <div class="mini-head" data-slot="head">
    <i></i>
    <span class="mini-title" data-slot="title">Design</span>
    <span class="mini-step" data-slot="step"></span>
  </div>
  <ul class="mini-lines" data-slot="lines">
    <li>Class list as cards or rows?</li>
  </ul>
  <div class="mini-more" data-slot="more"></div>
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
  <form id="her-form" class="her-form voice-idea" data-component="her-idea" data-state="asking">
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
    <div class="page-head" data-slot="head">
      <span class="page-title" data-slot="title">Your page</span>
      <span class="page-url" id="page-url" data-slot="url"></span>
    </div>
    <div class="page-frame" data-component="page-frame" data-state="building">
      <iframe id="page-iframe" data-slot="frame">
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
      <span class="fl-label" data-slot="label">Browse breads</span>
    </button>
    … ×6 more
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
      <div class="sk-cap" data-slot="caption">Browse breads</div>
      <div class="sk-screen" data-slot="screen">
        <div class="bk bk-header" data-kind="header">
          <span class="bk-logo"></span>
          <span class="bk-title">Browse breads</span>
          <span class="bk-menu">
            <span class="bk-bar"></span>
            … ×2 more
          </span>
        </div>
        <div class="bk bk-text" data-kind="text">Fresh bread, ready when you are</div>
        <div class="bk bk-list" data-kind="class-list">
          <div class="bk-cap">Today's breads</div>
          <div class="bk-row">
            <span class="bk-time"></span>
            <span class="bk-rowtext">
              … ×1 more
            </span>
            <span class="bk-pill"></span>
          </div>
          … ×2 more
        </div>
        <div class="bk bk-button" data-kind="button">Pick loaves</div>
        … ×1 more
      </div>
    </div>
    … ×6 more
  </div>
</div>
```

### `page-frame` (built)
```html
<div class="page-frame" data-component="page-frame" data-state="built">
  <iframe id="page-iframe" data-slot="frame">
</div>
```

### `tally` (counting)
```html
<section id="tally" class="tally" data-component="tally" data-state="counting">
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
    <div class="meter-counts" id="meter-counts">craft 11 · stamping 0</div>
  </div>
</section>
```

### `tray` (waiting)
```html
<aside class="tray" id="tray" data-component="tray" data-state="waiting">
  <button type="button" class="tray-note tray-top" data-component="tray-note" data-state="top" data-ask="re1" data-seat="research">
    <span class="tray-seat" data-slot="seat">Noor · Research</span>
    <span class="tray-text" data-slot="text">Full classes: waitlist or "full"?</span>
  </button>
  <button type="button" class="tray-note" data-component="tray-note" data-state="waiting" data-ask="pr1" data-seat="product">
    <span class="tray-seat" data-slot="seat">Product</span>
    <span class="tray-text" data-slot="text">What counts as a regular?</span>
  </button>
  … ×1 more
</aside>
```

### `tray-note` (top)
```html
<button type="button" class="tray-note tray-top" data-component="tray-note" data-state="top" data-ask="re1" data-seat="research">
  <span class="tray-seat" data-slot="seat">Noor · Research</span>
  <span class="tray-text" data-slot="text">Full classes: waitlist or "full"?</span>
</button>
```

### `focus-doc` (asking)
```html
<section class="focus-doc" id="focus-doc" data-component="focus-doc" data-state="asking" data-seat="research">
  <header class="fd-head" data-slot="head">
    <span class="fd-kicker" data-slot="kicker">Noor · Research</span>
    <span class="fd-by" data-slot="by">proposed by Noor and Mika</span>
    <button type="button" class="fd-close" data-slot="close">Back to the room</button>
  </header>
  <div class="fd-main">
    <div class="fd-work" data-slot="work" data-kind="journey">
      <div class="fd-row">
        <span class="fd-box" data-node="n1">Browse breads</span>
        <span class="fd-arrow">→</span>
        <span class="fd-box" data-node="n2">Pick loaves</span>
        <span class="fd-arrow">→</span>
        <span class="fd-box" data-node="n3">Choose pickup day</span>
        <span class="fd-arrow">→</span>
        <span class="fd-box" data-node="n4">Pay or confirm</span>
        <span class="fd-arrow">→</span>
        <span class="fd-box" data-node="n5">Baker sees orders</span>
        <span class="fd-arrow">→</span>
        <span class="fd-box" data-node="n6">Pick up</span>
      </div>
      … ×1 more
    </div>
    <h2 class="fd-question" data-slot="question">What makes someone come back to a st…</h2>
    <div class="fd-said" data-component="her-answer" data-state="speaking"></div>
    <form class="fd-form">
      <textarea class="fd-input" data-slot="input"></textarea>
      <span class="voice-mic" role="button" data-state="typed">
        <svg>…</svg>
        <span class="voice-word">typed</span>
      </span>
      <button type="submit" class="fd-send" data-slot="send">Send</button>
    </form>
  </div>
  <aside class="fd-side">
    <ol class="fd-chimes" data-slot="chimes"></ol>
    <div class="fd-brief" data-component="takeaways" data-state="hidden" hidden>
      <div class="brief-head" data-slot="head">Takeaways</div>
      <div class="brief-part brief-believe">
        <span class="brief-label" data-slot="label">What I believe about this</span>
        <p class="brief-text" data-slot="believe" contenteditable="false"></p>
      </div>
      <div class="brief-part brief-guidance">
        <span class="brief-label" data-slot="label">Guidance to the team</span>
        <p class="brief-text" data-slot="guidance" contenteditable="false"></p>
  …
```

### `takeaways` (shown)
```html
<div class="fd-brief" data-component="takeaways" data-state="shown">
  <div class="brief-head" data-slot="head">Takeaways</div>
  <div class="brief-part brief-believe">
    <span class="brief-label" data-slot="label">What I believe about this</span>
    <p class="brief-text" data-slot="believe" contenteditable="true">Regulars should never hunt for their…</p>
  </div>
  <div class="brief-part brief-guidance">
    <span class="brief-label" data-slot="label">Guidance to the team</span>
    <p class="brief-text" data-slot="guidance" contenteditable="true">Put a regular’s usual class first, o…</p>
  </div>
  <button type="button" class="fd-keep" data-slot="keep">Keep</button>
</div>
```

### `chime` (in)
```html
<li class="chime" data-seat="design" data-component="chime" data-state="in">
  <span class="chime-who" data-slot="who">Mika · Design</span>
  <span class="chime-text" data-slot="text">Love that. Regulars go first, their …</span>
</li>
```

### `chatter-line` (in)
```html
<div class="chatter-line" data-seat="design" data-component="chatter-line" data-state="in">
  <span class="chatter-who" data-slot="who">Mika:</span>
  <span class="chatter-text" data-slot="text">then remember them on the device.</span>
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
<section id="close-sheet" class="close-sheet" data-component="close-view" data-state="asking">
  <div class="close-left">
    <div class="close-pile">
      <i></i>
      … ×8 more
    </div>
    <div class="close-them" data-slot="them">
      <div class="close-label">A default coding agent</div>
      <div class="close-big"> asked  guessed
        <b id="close-b-asked">0</b>
        <span>·</span>
        <b class="red" id="close-b-guessed">24</b>
      </div>
      <div class="close-src" id="close-b-src">plain coding agent, the bakery promp…</div>
    </div>
    <div class="close-her" id="close-her" data-slot="her" hidden>
      <div class="close-label">In the Product seat</div>
      <div class="close-big"> asked the rest handled by the …
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
      <input id="close-input" class="close-input" data-slot="input"></input>
    </form>
    <div class="close-step" id="close-step"></div>
    <div class="close-sketch" id="close-sketch" data-slot="sketch"></div>
    <div class="close-count" id="close-count" data-slot="count"></div>
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
