# Contract between the four builds

Written by the lead. Builders code against this; change it only by telling the lead. `BRIEF.md` and `DEMO.md` are the
spec; this only fixes the seams so four people can build at once.

## Already on main (lead owns; don't rewrite, ask)
- `server.js`: one `node:http` server. Serves `public/` at `/`, built pages at `/runs/<id>/page/`, SSE at `/events`
  (every logged event, as `data: <json>`). Loads every `routes/*.js`, each exporting
  `default [{ method, path, handler(req, res, { body, url }) }]`; a `path` ending in `*` is a prefix match.
- `lib/model.js`: `callModel({ system, user, schema, model?, timeoutMs? })` returns validated JSON (retries once).
  `MODEL_BACKEND=claude-code` (default) or `fal`. `scrub(s)` strips the key. `setFalKey(k)` keeps it in memory.
  Measured: one Opus call with a ~1.8k-token system prompt, ~6.5 s API time, ~$0.02. Pass `model: 'sonnet'` or
  `'haiku'` where speed matters more than depth, and say which you chose.
- `lib/events.js`: `logEvent(run, type, data)`, `readEvents(run)`, `newRunId()`, `runDir(run)`, `onEvent(fn)`.
- `lib/http.js`: `sendJson(res, code, obj)` (scrubs).
- Tests: `node --test test/` (`npm test`). Node 22, ES modules, no build step, no framework.

## Who owns what
| Piece | Branch | Owns |
|---|---|---|
| 1. Room and look | `build/room` | `public/index.html`, `public/room.css`, `public/room.js`, `public/fonts/`, `public/vendor/` (motion copied in), `public/stage.js`, `public/replay.js`, `routes/room.js` |
| 2. Her flow and grey frames | `build/flow` | `lib/flow.js`, `public/flow.js`, `public/flow.css`, `public/sketches.js`, `public/blocks/`, `routes/flow.js`, `test/flow.test.js` |
| 3. Selector, cap, her file, inference, log | `build/select` | `lib/teammates.js`, `lib/select.js`, `lib/policy.js`, `lib/taste.js`, `lib/tally.js`, `prompts/`, `vendor/product-management/`, `data/taste.seed.md`, `data/research-finding.json`, `routes/run.js`, `test/select.test.js`, `test/policy.test.js`, `test/tally.test.js`, `test/leak.test.js` |
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
- Seats: `product`, `design`, `data`, `research`, `engineering`.

## The API (piece 3 owns `routes/run.js` unless noted)
- `POST /api/run` `{ idea }` → `{ run }`. Logs `run.start`.
- `POST /api/run/:id/line` `{ text }` → `{ nodes, edges }` (piece 2's `lib/flow.js` does the parsing; piece 3's route
  calls `parseFlow(lines)`). Logs `flow.line`.
- `POST /api/run/:id/propose` → starts the five teammates and the selector; progress comes as events.
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

**Ask** (only the selector creates these; at most 3 per run): a candidate plus `{ kind: 'fork'|'pin', why }`.

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
The fal key is never written anywhere. The cap is enforced in code with its test. Every number on stage comes from a
real run. Commits as `Vincent Hao <49104178+VinceHow@users.noreply.github.com>`, no model names in commits or comments.
