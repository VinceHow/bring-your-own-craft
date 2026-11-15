# Contract between the four builds

Written by the lead. Builders code against this; change it only by telling the lead. `BRIEF.md` and `DEMO.md` are the
spec; this only fixes the seams so four people can build at once.

## Already on main (lead owns; don't rewrite, ask)
- `server.js`: one `node:http` server. Serves `public/` at `/`, built pages at `/runs/<id>/page/`, SSE at `/events`
  (every logged event, as `data: <json>`). Loads every `routes/*.js`, each exporting
  `default [{ method, path, handler(req, res, { body, url }) }]`; a `path` ending in `*` is a prefix match, or give `match(url) => bool` instead (use this for `/api/run/:id/...` routes so pieces don't catch each other's).
- `lib/model.js`: `callModel({ system, user, schema, model?, timeoutMs? })` returns validated JSON (retries once).
  `MODEL_BACKEND=claude-code` (default) or `fal`. `scrub(s)` strips the key. `setFalKey(k)` keeps it in memory.
  Measured: one Opus call with a ~1.8k-token system prompt, ~6.5 s API time, ~$0.02. Pass `model: 'sonnet'` or
  `'haiku'` where speed matters more than depth, and say which you chose.
  On `fal`: `sonnet`/`haiku` map to OpenRouter ids (`FAL_MODEL` overrides); claude-code stays the default, fal is the
  fallback if the weekly limit bites. Behind the cloud proxy, `node server.js` re-runs itself with
  `NODE_USE_ENV_PROXY=1`; tests or scripts that import `lib/model.js` directly must set it themselves, or fal answers 401.
- `lib/events.js`: `logEvent(run, type, data)`, `readEvents(run)`, `newRunId()`, `runDir(run)`, `onEvent(fn)`.
- `lib/http.js`: `sendJson(res, code, obj)` (scrubs).
- Tests: `node --test` (`npm test`; runs `test/**/*.test.js`). Node 22, ES modules, no build step, no framework.

## Who owns what
| Piece | Branch | Owns |
|---|---|---|
| 1. Room and look | `build/room` | `public/index.html`, `public/room.css`, `public/room.js`, `public/fonts/`, `public/vendor/` (motion copied in), `public/stage.js`, `public/replay.js`, `routes/room.js` |
| 2. Her flow and grey frames | `build/flow` | `lib/flow.js`, `public/flow.js`, `public/flow.css`, `public/sketches.js`, `public/blocks/`, `routes/flow.js`, `test/flow.test.js` |
| 3. Selector, ask policy, her file, inference, log | `build/select` | `lib/teammates.js`, `lib/select.js`, `lib/policy.js`, `lib/taste.js`, `lib/tally.js`, `prompts/`, `vendor/product-management/`, `data/taste.seed.md`, `data/research-finding.json`, `routes/run.js`, `test/select.test.js`, `test/policy.test.js`, `test/tally.test.js`, `test/leak.test.js` |
| 4. Template and live fill | `build/page` | `~/taste-template/` (outside the repo), `vendor/taste-skill/`, `templates/`, `lib/fill.js`, `routes/build.js`, `routes/book.js`, `test/fill.test.js` |

Anyone may add a line to `README.md` credits. Nobody else edits a file another piece owns; if you need a change there,
put a stub in your own file and tell the lead.

## The UI seams (piece 1 hosts, pieces 2 and 3 plug in)
`public/index.html` loads, in order: `room.js`, `flow.js`, `sketches.js`. Globals on `window.BYOC`:
- Piece 1 provides `BYOC.api(path, body?)` (fetch JSON), `BYOC.on(type, fn)` (SSE events by type), `BYOC.el.herSheet`
  (the full-size sheet in front of her seat), `BYOC.el.seatSheet[seat]` (each teammate's small sheet),
  `BYOC.el.fileCard` (her file card), `BYOC.el.counter`, `BYOC.el.meter`, `BYOC.run` (current run id), `BYOC.replay`
  (true while showing a replayed run), and `BYOC.stage(n)` to move the beat.
- Piece 2 provides `BYOC.flow.mount(el)`, `BYOC.flow.addLine(text)`, `BYOC.flow.showAsk(ask)` (draws a fork or pin
  on the node `ask.attachTo`), `BYOC.sketches.show(el, frames)`.
- Seats (six, since Sat 13:00): `product`, `design`, `data`, `research`, `strategy`, `engineering`. Strategy's ink is gold `#BB8B41`; stance *who pays, and why now*.

## The API (piece 3 owns `routes/run.js` unless noted)
- `POST /api/run` `{ idea, intro? }` → `{ run }`. Logs `run.start` (with `intro` when given). `intro` is her "I love…" line from her card; it becomes L1 of her file ("her own words, today"), replacing the first prepared line, so her first new principle is still L3.
- `POST /api/run/:id/line` `{ text }` → `{ nodes, edges }` (piece 2's `lib/flow.js` does the parsing; piece 3's route
  calls `parseFlow(lines)`). Logs `flow.line`.
- `POST /api/run/:id/propose` → starts the six teammates and the selector; progress comes as events.
- `POST /api/run/:id/answer` `{ askId, choice }`. Logs `answer`.
- `POST /api/run/:id/pin` `{ nodeId, text }` → `{ soundsLike }`. Logs `pin`, then `taste.suggested`.
- `POST /api/run/:id/taste` `{ text }` (kept or reworded) → `{ id, text }`. Writes `runs/<id>/taste.md`. Logs `taste.written`.
- `GET /api/run/:id/tally` → `{ came, brought, decided, meter: { craft, stamp, pct }, reasons: [...] }`.
- `GET /api/run/:id/sketches` → Design's frames JSON (piece 2's `routes/flow.js`).
- `POST /api/run/:id/build` → re-decides the rest against her updated file (calls `decideRest` from `lib/select.js`),
  then fills the template; progress as `build.step` events; ends with `build.done { url }` (piece 4).
- `POST /api/book` the built page's form posts here (piece 4).

## Shapes
**Flow:** `parseFlow(lines: string[]) → { nodes: [{ id: 'n1', label }], edges: [{ from, to }] }`. Arrows by order;
a line with `→` (or `->`) is a branch, e.g. `regulars → "Book your usual"`. No model.

**Candidate** (one decision a teammate proposes):
`{ id, seat, decision, options: [string, string, ...], recommendation, reason, cost: 'low'|'high', undoable: bool,
attachTo: nodeId|null, source?: { title, url } }`. Research cites only its prepared finding.

**Ask** (only the selector creates these; only the big questions in her craft, no number promised): a candidate plus `{ kind: 'fork'|'pin', why }`.

**Decided:** `{ id, seat, decision, choice, cites: 'L<n>'|'team default' }`. Code rejects a `cites` to a missing line.

**Her file** (`data/taste.seed.md`, copied to `runs/<id>/taste.md`): one principle per line, `- [L1] text`, with
the two seed lines tagged `(prepared for the demo)`.

## Events (`runs/<id>/events.jsonl`)
Every event: `{ t, run, type, pane?, mode?, ...data }`. `mode` is `craft` or `stamp` on anything she does or is
shown as a demand on her; waiting events have no mode.

| type | data | mode |
|---|---|---|
| `run.start` | `{ idea, seat }` | craft |
| `flow.line` | `{ text, nodes, edges }` | craft |
| `teammate.start` / `teammate.done` | `{ seat, count, ms }` | — |
| `candidate` | a Candidate | — |
| `select.done` | `{ came, brought, ms }` | — |
| `ask` | an Ask | craft |
| `ask.refused` | `{ id, reason }` (then a `decided`) | — |
| `decided` | a Decided | — |
| `stamp` | `{ source, text }` (e.g. a question in plain model text) | stamp |
| `answer` | `{ askId, choice }` | craft |
| `pin` | `{ nodeId, text }` | craft |
| `taste.suggested` | `{ text }` | — |
| `taste.written` | `{ id, text, reworded }` | craft |
| `build.step` | `{ step }` | — |
| `build.done` | `{ url, ms }` | — |

**Counter:** came = `candidate` count; brought = `ask` count. **Meter:** craft / (craft + stamp) over her events.

## Replay
`runs/rehearsal/` and `runs/cafe/` hold recorded runs (committed). The room's **R** replays `events.jsonl` with its
timings, and everything shown is labelled **REPLAY**.

## Rules (from CLAUDE.md)
The fal key is never written anywhere. Questions reach her only if big and in her craft (the selector's ranking and threshold, with their tests); no number is promised. Every number on stage comes from a
real run. Commits as `Vincent Hao <49104178+VinceHow@users.noreply.github.com>`, no model names in commits or comments.

## Studio version seams (Sat 14:00, po/studio)
**Ownership for the studio pieces:**
| Piece | Owner | Files |
|---|---|---|
| First sketch + reshape | BYOC builder 6 (first sketch) | `lib/sketch.js`, `routes/sketch.js`, `prompts/sketch-*.md`, `public/first-sketch.js`, `data/prepared-sketch-yoga.json`, `test/sketch.test.js`, `e2e/studio.e2e.js` |
| Focus time, words, leaning in, credits | BYOC builder 3 (beats) | `public/room.js`, `public/room.css`, `public/close.js`, `public/flow.js`, `public/flow.css`, `templates/*` (credits wording only), `lib/fill.js` (credits data only) |
| The gem (bars first), studio look | BYOC builder 1 (polish) | `public/gem.js` (new), `public/polish.css`, `design/` |

**API:**
- `POST /api/run/:id/sketch` → `{ users: [{ id:'u1', label }], stages: string[] , ms }`. Design's first sketch from the idea:
  one fast call. Stages go through `parseFlow(stages)` exactly as journey lines did, so they become `flow.line` events
  (and boxes). Logs `sketch.user` per user type as it arrives, then `sketch.done { ms, prepared:false }`. If the call fails
  or takes over 12 s, the prepared sketch (`data/prepared-sketch-yoga.json`, yoga idea only) comes in with
  `sketch.done { prepared:true }`, and the room labels it **PREPARED**.
- `POST /api/run/:id/reshape` `{ text }` → her spoken or typed reaction; one call returns the redrawn `{ users, stages }`;
  logs `reshape { text }` (craft) then `sketch.done`. The flow is replaced, not appended (`flow.reset` event, then
  `flow.line`s).
- `POST /api/run/:id/flow` `{ lines }` → a direct box edit (rename/add/remove), no model; logs `flow.reset` + `flow.line`s
  (craft).
- The old typed-journey path (`/line`) stays working for tests and as a fallback.

**Events added:** `sketch.user {id,label}`, `sketch.done {ms, prepared}`, `reshape {text}` (craft), `flow.reset`,
`lean {seat, nodeId, reason}` (a teammate visibly picks up her change: emitted server-side only when a candidate's
`attachTo` is a node she touched), `checkin.open {askId}` / `checkin.close {askId}` (focus time on/off, emitted by the room
via `/api/run/:id/answer` flow: no new route).

**The gem** is a pure function of the log in the browser: face per seat = count of `decided` with that seat (+ its asks
answered); her face = her `answer`s and `reshape`s. No server state.

**Guest chair (po/guest-chair, owner: BYOC builder 6):** after the first sketch, `POST /api/run/:id/guest` (or chained
inside `/sketch`) runs one teammate-style call whose persona is the sketch's main user type. Returns
`{ persona, reaction, points: [{ id:'G1', text, confidence: 'high'|'medium'|'low' }] }`; low-confidence points carry
"check with a real <persona>". Logs `guest { persona, reaction, points }`. It never creates an `ask` and never
overrides her. `decideRest` may cite `G<n>` like a file line (validated against the logged points, as L-lines are).
The room shows it as a dashed-border GUEST card: "a stand-in for your customer, not a real one". Budget ~3 s.

## Focus moments seams (Sat 15:55, po/questions)
**Ownership:**
| Piece | Owner | Files |
|---|---|---|
| Question bar, Ask shape, open questions from teammates, Research's finding into Design's sketch | BYOC builder 7 (questions) | `lib/select.js`, `lib/teammates.js`, `prompts/select.md`, `prompts/teammate.md` + seat prompts, `prompts/sketch-first.md` (finding only), `test/select.test.js`, `test/bar.test.js`, `test/teammates.test.js` |
| Interpret call (answer → decisions + chime-ins + brief), private profile, name tag | BYOC builder 6 (first sketch) | `lib/interpret.js`, `lib/profile.js`, `lib/tag.js`, `prompts/interpret.md`, `prompts/profile.md`, `prompts/tag.md`, `routes/run.js` (new routes only), `test/interpret.test.js`, `test/profile.test.js` |
| The two states (room with chatter / her document), the tray opening a document, removing the dimming | BYOC builder 3 (beats) | `public/room.js`, `public/room.css`, `public/close.js`, `public/flow.js`, `public/focus-doc.js` (new), e2e |
| The document's look (words landing, chime-ins, her brief), room chatter's look | BYOC builder 1 (polish) | `public/polish.css`, `design/` |

**Ask (replaces fork/pin):** `{ id, seat, by?: 'Wren', question, artifact: { kind: 'journey'|'finding'|'wires'|'page', ref? },
decisionIds: [candidate ids this question settles] }`. No options, recommendation or "why".
`lib/policy.js` still guards every `ask` event.

**API:**
- `POST /api/run/:id/answer` `{ askId, text }` → streams (SSE events) `chime { by, seat, text }` ×1–2, then
  `brief { askId, believe, why, guidance }`, then `answer.mapped { askId, decisions: [{ id, choice }] }`. One model call
  (interpret). Logs `answer { askId, text }` (craft) first. Unanswered asks at Build are decided by the team.
- `POST /api/run/:id/brief` `{ askId, believe, why, guidance }` → her reworded brief; writes "what I believe" to her
  file as the next L-line (this replaces "Sounds like"); logs `taste.written`. Her Stance slot fills from it.
- `POST /api/run/:id/intro` `{ text }` → `{ tag: { craft, goodAt, loves } }` (name tag, editable) and starts the
  profile. `POST /api/run/:id/tag` `{ craft, goodAt, loves }` saves her edits.
- Profile: `lib/profile.js` `buildProfile(run)` after intro + idea, `updateProfile(run, answer)` after each answer; stored
  in `runs/<id>/profile.json` (never shown); `readProfile(run)` is passed to every teammate and the selector prompt.
- Room chatter: `chatter { by, seat, text }` events, written by the server from real run events (a candidate, a
  decision, a finding attached), never addressed to her, never a question.

## Team space seams (po/team-space)
**Owner:** BYOC builder 8 (team space): `lib/joint.js`, `routes/joint.js`, `public/team-space.js`, `prompts/joint-*.md`,
`test/joint.test.js`, `e2e/team.e2e.js`. Reuses builder 6's thread engine (the chime-in turn call) rather than a new one.
Builder 7 adds `seats: string[]` to Candidates (every seat a decision touches); a candidate touching ≥2 seats and not
brought to her is **joint**.
- After the team proposes, the 2–3 biggest joint candidates each get a real short exchange: 3–4 turns, each by one of
  the touched teammates, each its own fast call reading the thread so far. Lines go out as `chatter {by, seat, text,
  jointId}`; the result is `joint.agreed {id, headline, seats:[...], withTakeaways: bool, turns:[{by,text}]}` and the
  decision is logged as `decided` with `cites: 'team'` (or her L-line when her takeaways shaped it).
- Team space in the middle of the table: one card per `joint.agreed` (headline only, marks of who talked it out,
  "with your takeaways in mind" only when `withTakeaways`), tap → the exchange. A **label** "Talk this through: coming"
  on each card (not a button).
- **Cuts:** no cancel margin note on her page (fill), no symphony slide (one press, the page appears in the middle).
