# Components: the contract between the room's code and its looks

**Status: first draft (names, states, slots, events).** It's based on the markup on `main` (593d900) and on
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
| builder 6 | `first-sketch.js` |
| this doc's author (lead-assigned; those builders are done) | `flow.js`, `sketches.js`, `idea-sheet.js`, `team-space.js` |
| to confirm with the lead | `name-tag.js`, `replay.js` |

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
| `character-card` (her card: build your character) | `.big-card.char-card[data-seat="product"]` (**planned**, markup not built) | `asking` (her "I love…" input) · `writing` (team is writing it) · `ready` (editable) · `kept` | `intro` (`.bc-loves` / `#intro-input`), `name` (`.char-name`), `title` (`.char-title`), `traits` (`.char-traits`), `trait` (`.char-trait`), `power` (`.char-power`), `swap` (`.char-swap`), `seat-pick` (`.char-seat-pick`), `hint` (`.char-hint`) | emit `intro`, `leaned` |
| `name-tag` (DIY craft, optional path) | `.name-tag` | `asking` · `ready` | `ask` (`.tag-ask`), `input` (`.tag-input`), `craft` (`.tag-craft`), `good-at` (`.tag-good`), `loves` (`.tag-loves`), `hint` (`.tag-hint`) | on `stage`, `reset` |

## 3. The work

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `sketchpad` (a teammate's own calls) | `.mini-sheet[data-sheet]` | `waiting` · `working` · `done` · `error` | `head` (`.mini-head`), `title` (`.mini-title`), `step` (`.mini-step`), `lines` (`.mini-lines`), `more` (`.mini-more`) | on `candidate`, `decided`, `teammate.*`, `lean`, `stamp` |
| `idea-sheet` (the middle sheet) | `.idea-sheet` | `rough` · `sketched` · `reshaped` · `wires` · `page` (already `data-step`; mirror it to `data-state`) | `tabs` (`.idea-tabs`), `tab` (`.idea-tab`) | on `run.start`, `stage`, `reset` |
| `idea-layer` | `.idea-layer` (`#her-sheet`, `#sketch-sheet`, `#page-sheet`) | `on` · `off` (`.is-on`) | (none) | (none) |
| `her-idea` (her rough sentence) | `#her-sheet .her-q` + `.her-idea` + `.her-form` | `asking` · `said` | `question` (`.her-q`), `idea` (`.her-idea`), `input` (`.her-form input`), `hint` (`.her-hint`) | on `stage` |
| `journey` (the rough journey) | `.fl-wrap` inside `#her-flow` | `drawing` · `drawn` · `redrawing` | `box` (`.fl-box`, with `data-node`), `arrow`, `label` (`.fl-label`), `note` (`.her-notes`) | on `flow.line`, `flow.reset`, `pin` |
| `first-sketch` (her journey sketched by Noor and Mika) | `.fs-box` / `.fs-users` | `drawing` · `drawn` · `reshaping` | `user` (`.fs-user`), `box` (`.fs-box`), `arrow` (`.fs-arrow`), `said` (`.fs-said`), `who` (`.fs-who`) | on `sketch.user`, `sketch.done`, `reshape`, `sketch.error` |
| `wireframes` | `.sk-host` | `waiting` (`#sketch-wait`) · `drafting` (`data-drafting`) · `shown` | `frame` (`.sk-frame`), `screen` (`.sk-screen`), `head` (`.sk-head`), `title` (`.sk-title`), `caption` (`.sk-cap`), `tag` (`.sk-tag`), `note` (`.sk-note`), `pinned` (`.sk-pinned`) | on `sketches` |
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
| `team-space` | `section.team-space` | `empty` (hidden) · `shown` | `title` (`.ts-title`), `cards` (`.ts-cards`) | on `joint.agreed`, `run.start`, `reset` |
| `decision-card` | `li.ts-card[data-joint]` | `closed` · `open` (mirrors `aria-expanded`) | `marks` (`.ts-marks`), `mark` (`.ts-mark[data-seat]`), `headline` (`.ts-headline`), `takeaways-note` (`.ts-takeaways`), `label` (`.ts-label`), `exchange` (`.ts-exchange`), `turn` (`.ts-turn[data-seat]`) | on `joint.agreed` |
| `check-in` (older in-sheet question card; may retire in favour of the tray) | `.fl-q` / `.checkin-open` | `open` · `answered` · `chosen` · `dropped` · `rec` (from `is-*`) | `question` (`.fl-qtext`), `options` (`.fl-opts`), `option` (`.fl-opt`), `why` (`.fl-why`), `source` (`.fl-src`) | on `ask`, `answer`; emit `checkin.open`, `checkin.close` |
| `guest-card` (optional) | `.guest-card` | `in` · `shown` | `tag` (`.guest-tag`), `head` (`.guest-head`), `who` (`.guest-who`), `says` (`.guest-says`), `points` (`.guest-points`), `note` (`.guest-note`) | on `guest` |

## 6. The close and labels

| Component | Root hook | `data-state` | `data-slot`s | Events |
|---|---|---|---|---|
| `close-view` | `#close-sheet.close-sheet` | `asking` (judge's idea) · `sketching` · `contrast` (data-phase) | `input` (`.close-input`), `sketch` (`.close-sketch`), `question` (`.close-q`), `them` (`.close-them`), `her` (`.close-her`), `count` (`.close-count`), `big` (`.close-big`), `label` (`.close-label`) | on `stage`, `reset` |
| `replay-label` | `#replay-label.replay-label` | `replay` · `fake` (fixture) · `hidden` | (none) | on `reset` |
| `prepared-label` | `.prepared` / `.prep` | (one state) | (none) | (none) |
| `live-step` (a call she's waiting on; never a spinner) | `.live-step` | `running` · `slow` · `failed` · `done` | `label` | `BYOC.api(…, { step })` |

---

## Next in this doc
- A markup skeleton per component, taken from the live DOM in `/gallery`.
- For each `data-state`: the exact fixture events that reach it (that's how `/gallery` drives it).
