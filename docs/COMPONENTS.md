# Components: the contract between the room's code and its looks

**Status: first draft (names, states, slots, events).** ✅ means the attributes are in the code. It's based on the markup on `main` (593d900) and on
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

## Next in this doc
- A markup skeleton per component, taken from the live DOM in `/gallery`.
- For each `data-state`: the exact fixture events that reach it (that's how `/gallery` drives it).
