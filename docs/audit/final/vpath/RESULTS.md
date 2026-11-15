# Check d: Vincent's path (main @ 1f6e56c), audit results

I made a clean clone at 1f6e56c, on Linux (Node 22.23.4), and followed `docs/RUN-LOCALLY.md` and `docs/REHEARSAL.md`
command by command. I ran without proxy variables, to act like a Mac. I never used fal: MODEL_BACKEND was never set,
and I never set NODE_USE_ENV_PROXY by hand. `.env.local` was used in two ways: left out, and filled with dummy values
(`FAL_KEY=dummy-not-real` and the like, no `MODEL_BACKEND`). The browser walk ran at 1440x900 in the painted look, with
`navigator.webdriver` hidden so that `/` behaves as it would in Vincent's own Chrome. The model routes were stubbed
(details under "Caveats"). Anything checked in the browser is **verified by stub only**. Screenshots are in this folder.

## Commands

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | `npm run doctor`, no `.env.local` | PASS | The first line of script output is `route: claude-code` (npm's `> doctor` banner prints above it, and `--silent` hides that banner in Start). Five PASS lines: Node, Claude Code installed, logged in (3.3 s), the room's call (3.6 s of 25 s), and the Send-shaped burst `5.5 s wall`. Four `NOTE  <KEY>: missing`, each followed by `fix: add a line <KEY>=... to .env.local`. `PASS port 3000 is free`. Exit 0, 12.6 s. Nothing hung. |
| 1b | `npm run doctor`, dummy `.env.local` | PASS | `loaded 4 keys from .env.local (FAL_KEY, ELEVENLABS_API_KEY, LINKUP_API_KEY, ADMIN_TOKEN)`. Each key reads `PASS <KEY>: set`. `WARN fal ...: HTTP 401 ...` with a fix line; ElevenLabs and Linkup give `WARN ... fetch failed` with fix lines. The summary reads `All required checks pass (3 warnings: the room still runs)`. Exit 0. No key value appears in any output. |
| 1c | REHEARSAL "doctor: … **2c under 10 s**" | NOTE (doc wording) | The doctor never prints a "2c" label. The line to read is `A Send-shaped burst (4 calls at once, …): N s wall`. Owner b7 (docs/REHEARSAL.md:9, :49). |
| 2 | `npm run local` with port 3000 held by a dummy app | PASS | `route: claude-code` (first line) · `port 3000 is busy (another app), so we use 3001` · `Open  http://localhost:3001/`. The dummy app on 3000 still answered `OTHER APP` the whole time. |
| 2b | `PORT=4401 npm run local`; a second copy on the same PORT | PASS | It runs on 4401. The second copy prints `Port 4401 (from PORT) is in use. Stop what runs there, or unset PORT to pick a free one.`, exits, and leaves the first copy's pid and port files alone. |
| 2c | Route must say **fal** (REHEARSAL 07:00 step 1) | NOT TESTED | Out of scope: never run on fal. The `routeLine` code path for `fal` was read, not run. |
| 3a | `Start BYOC.command` / `Stop BYOC.command`: mode, shebang, line endings | PASS | `git ls-files -s`: both are `100755`. Both start with `#!/bin/bash` and have no CR characters. `bash -n` passes on both. |
| 3b | Start, with `open` stubbed on PATH | PASS (Linux dry-run) | Start runs `npm run --silent doctor` (stopping on a FAIL), then `node scripts/local.mjs &`. It waits until the pid file holds that PID and the port file exists, polls the URL with curl, and then calls `open`. On Linux there is no Chrome.app, so it calls plain `open`. Fake open received `http://localhost:3001/`, which is the port the server picked. Output: `Room running at http://localhost:3001/`. **Mac-only, not run:** `open -a "Google Chrome"`, Gatekeeper's "can't be opened", and the double-click from Finder. |
| 3c | Stop on the room that Start started | PASS | `Stopped the room (process 11415).` Start then printed `The room stopped.`. The pid and port files were removed, and the app on 3000 was untouched. |
| 3d | Stop with no pid file (falls back to the port in `.byoc-server.port`) | PASS | `Stopped the room (process 14188, port 3001).` It killed `server.js` from this folder; local.mjs exited after it, and so did Start. |
| 3e | Stop must never kill another app | PASS | Three cases left the target running. (1) Pid file pointing at the dummy app on 3000, port file 3000: `The room wasn't running (nothing of ours to stop).` (2) A lookalike `node scripts/local.mjs` started from a different folder (listening on 4402): its cwd doesn't match, so it was left alive. (3) Stopping BYOC on 3001 left 3000 serving `OTHER APP`. |
| 3f | "Close its Terminal window to stop" (SIGHUP to Start) and SIGTERM | PASS | Both stop the server and remove the pid and port files. My first try under `nohup` didn't stop, but that was my test setup: nohup ignores SIGHUP. Ctrl-C can't be tested from a background job; the trap is the same one (`INT TERM HUP`). |
| 3g | Stop also stops `npm run local` started from a terminal | PASS | `Stopped the room (process 2610).` |

## The walk (verified by stub only)

| # | Step | Result | Evidence |
|---|---|---|---|
| 4.1 | Open `/` | PASS | The URL becomes `/?look=painted` and `data-look=painted`. Nothing has focus on load. The idea paper reads "What do you want to build today?" (01) |
| 4.2 | Type "I want to build a checkout website for a bakery", then Enter | PASS | "I want to build" is struck through in pink ink, and `data-tidy=cut` (02, 03). The paper then moves on, and pendingIdea is "A checkout website for a bakery". The tidy itself is a stub that returns the cut line. |
| 4.3 | Name tag | PASS | step=nametag, then the tag shows as "the Journey Mapper" (stub) (04, 05). |
| 4.4 | Meet the team | PASS | One card at a time; the last button reads "Into the studio" (06, 07). |
| 4.5 | The door, then the room | PASS | The plaque reads "Bring your own craft", then the doors open (08, 09). The room shows her idea on the sheet, the URL gains `&run=<id>`, and the Start over link is at top right (10). |
| 4a | Refresh mid-room | PASS | `data-resume=resumed`, same run, REPLAY label hidden, setup hidden, idea kept. Requests after reload, GETs only: `/api/voice/status, /api/health, /api/replay/<id>, /events, /api/taste/<id>, /api/run/<id>/tally`. POSTs: `[]` (16). |
| 4a' | Refresh mid-Focus 1 (the rehearsal log cut at `answer.piece`, as in resume.e2e) | PASS | Resumed, `replay=false`, REPLAY hidden, the inbox holds ask `first`, and the status line reads "picked up run run-audit-midroom where you left off". POSTs `[]` on the first reload and `[]` on a second reload (25). |
| 4b | Start over (top-right link, and Shift+N) | PASS | Clicking it shows "Start a new studio? This one is kept in your past runs." with "Start a new studio" and "Keep this one" (18). Keep leaves the run as it is. Shift+N asks too. Yes takes her back to the idea paper; localStorage is cleared, `?run=` is gone from the URL, and the run stays on disk (19). |
| 4c | Home key | PASS | step=idea, beat 0, run=null; a refresh afterwards stays fresh (`resume=null`, step idea) (20). |
| 4d | `e2e/resume.e2e.js` (supporting) | PASS | 8/8 pass in 32 s. |
| 4e | Keys `?`, `S`, `R` | PASS | The help card lists 14 keys, Shift+N among them (21). S turns on `body.stage` (22). R shows the REPLAY label (23). |

## REHEARSAL "07:00 · Step 1 on Vincent's Mac"

| Step | Result | Note |
|---|---|---|
| 1 `npm run local`, the route reads fal | NOT TESTED (fal) | The route line is printed first: `route: claude-code`. |
| 2 doctor: the route first, 2c under 10 s | PASS on claude-code | Burst 4.1–6.6 s over three runs. See 1c on the "2c" label. |
| 3 Full stage-path run (Focus 1 rounds, Bo's unblock, Focus 2, Team go, her page) | NOT TESTED | Needs live model calls. I only walked up to the room. |
| 4 Refresh mid-room resumes | PASS (stub) | 4a, 4a'. |
| 5 Start over (top right, or Shift+N) | PASS (stub) | 4b. The link sits at top right of the chrome bar (x≈1370, y 6). |

## The 3-minute look check

| Step | Result | Note |
|---|---|---|
| 1 Open `/`: the painted room shows (not plain) | PASS | `public/index.html:110-113`: painted is the default, unless `navigator.webdriver` is true or `?look=` says otherwise. CPU in Activity Monitor is Mac-only and wasn't measured. |
| 2 The door: the plaque reads "Bring your own craft", then the doors open | PASS, but **the order is wrong in the doc** | The plaque is correct (08) and the doors open (09). But the door plays at the **reveal, after meet the team** (`public/looks/painted.js:301`, `B.on('reveal')`), not before the idea paper. On the idea paper the door is a blurred backdrop with a blank plaque (01). Owner b7 (docs/REHEARSAL.md:19, list order). |
| 3 Idea paper: "I want to build" is struck, fades, closes up; the paper moves on | PASS (stub) | Strike seen (03). The fade and close-up are animation and weren't captured frame by frame. |
| 4 Cursor: pink paper triangle, the fold over buttons, an I-beam in the box | PASS (computed style) | body: `url(svg) 3 3, auto` (pink `#D47288`, in painted.css). Next button: `url(svg) 3 3, pointer` (the fold, set by painted.js). textarea: `url(svg) 16 16, text` (I-beam). Headless screenshots don't draw a cursor. |
| 5 Time pill 5×, Cycle → Day → Night …; the painting keeps moving at night | PASS (stub) | Modes went `cycle -> day -> night -> cycle -> day -> night`, and the night class was applied (11–15; 15 is the lamp-lit night). CPU under ~60% wasn't measured (Mac-only). |
| 6 Refresh mid-run, the room comes back | PASS (stub) | 4a, 4a'. |

## Docs vs code

| Check | Result | Evidence |
|---|---|---|
| RUN-LOCALLY "`/` (the studio, plain look) · `/?look=painted`" | **FAIL (doc)** | The code makes painted the default at `/`: `public/index.html:110-113` (`if(!k&&!navigator.webdriver){k="painted"…}`). `/?look=plain` is the plain fallback. REHEARSAL's "Open `/` and confirm the painted room" is the one that's true. Only automated browsers get plain at `/`; I checked that a Playwright context without the mask shows `data-look=null`. Fix `docs/RUN-LOCALLY.md:33`. Owner **b7**. |
| RUN-LOCALLY Keys S, R, ? vs KEYS.md and the help card | PASS | All three match `docs/KEYS.md` and the help card (`public/stage.js:21-36`). Small point: the header comment at `public/stage.js:2-15` says "keep them the same", but it leaves out the `V`/`` ` `` and `Shift+N` lines, which the KEYS array and KEYS.md both have. Comment only. Owner b7. |
| RUN-LOCALLY "Start … close its Terminal window to stop" | PASS | 3f. |

## Caveats (honest)
- **A few real model calls did happen, all on claude-code and never on fal.**
  - The doctor makes its own calls.
  - `npm run local` warms the model on start-up (`[model] warm: first call answered in 1.8 s`).
  - In the walk I let `POST /api/run` reach the real server, so the run would exist on disk and could be resumed. On the server, that request starts `buildProfile` (`routes/run.js:144`; one call, logged as `profile.built` at 12.3 s).
  - My stubs missed `POST /api/run/<id>/sketch`, so Design's first sketch ran for real (`sketch.done` at 3.1 s). That's where the journey boxes and Noor's question in 10/15/18 came from.
  - Every refresh, Start over and Home check made no POST at all.
- No dummy key value appears in `runs/`, the server output or the doctor output.
- Mac-only, not run: double-clicking from Finder, Gatekeeper, `open -a "Google Chrome"`, Activity Monitor CPU, and Safari.
- Screenshot 17 is a second refresh of the walked run, because `?run=` in the URL wins over localStorage. Screenshot 25 is the true mid-Focus-1 resume.

## FAILs
1. **RUN-LOCALLY says `/` is the plain look.** It's painted (`public/index.html:110-113`). Edit `docs/RUN-LOCALLY.md:33` to read "`/` (the studio, painted) · `/?look=plain` (the plain fallback)". Owner **b7**.
2. **(Minor, doc order) REHEARSAL look check step 2 puts the door before the idea paper.** The door opens at the reveal, after meet the team (`public/looks/painted.js:301`). Reorder the steps or reword them in `docs/REHEARSAL.md:19`. Owner **b7**.
3. **(Minor, wording) REHEARSAL's "2c under 10 s".** The doctor prints no "2c" label. Say "the Send-shaped burst line" instead (`docs/REHEARSAL.md:10`). Owner **b7**.

There are no code FAILs. Nothing broke in the demo path that I walked.
