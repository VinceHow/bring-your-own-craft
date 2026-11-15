# Final audit: main @ 1f6e56c

Independent final auditor (built none of tonight's work), Sun 15 Nov, 05:02–05:40 UTC. Branch `audit/final`.
Evidence: `docs/audit/final/` (`fal/` = the one paid run, `vpath/` = Vincent's path, `fallbacks/` = fallbacks + live
bakery, `stub-tests.txt` = npm test + stubbed e2e).

## Verdict: GO for the 07:00 stage path, with fixes. 12 FAILs.

**GO.** On fal, the whole stage path ran first time, end to end. The route was idea → name tag → meet → room →
Focus 1 (2 rounds + End) → Bo's unblock → Focus 2 (1 round + End) → Team, go → her page, and then the close's
"Build it →". It hit 0 page errors, 0 visible "undefined/null/NaN/[object", 0 `[model] failed` and 0 401/402 lines.
Exactly 3 things reached her. Her page was built in 22 s, a refresh resumed the run with no model call, and the fal key
appears nowhere.

None of the FAILs stop the run. They are what Vincent and the judges would see as rough:
1. After Team, go, nothing on screen says how to build her page. The pill says "Bo starts once you agree the page",
   and it took three presses of → before anything visibly happened (b3).
2. The plain fallback's first screen is broken (design/b7).
3. On painted: overlapping chatter, the "our page" header clipped at the left, "1 decisions", and "Make my tag"
   clipped during the 2 s while the tag is written (design).
4. Timing. The team's work took 33 s against the 17.5–20 s DEMO assumes, so the talk will likely run past 3:00 and
   the agreed cut order applies. R replay takes 4:24.
5. The tidy rewords her words a little, and one spec flakes on it (b7).
6. Docs and the bakery. RUN-LOCALLY says `/` is plain; the bakery clip doesn't exist; the live site lacks the
   "Built earlier by this same team" credit.

**Every number below comes from a run I saw.** The fal run's timings include my driver's pacing, so I give
per-segment times, not a stage total (see a).

---

## The fal run (one run, the only spend)

- **Setup:** `MODEL_BACKEND=fal NODE_USE_ENV_PROXY=1`, main 1f6e56c, 1280×800, `?look=painted&night=1` with dark color
  scheme, Playwright video.
- **Driver:** `docs/audit/final/fal/` holds `log.txt` (timeline), `steps.json` (per step: console, failed requests,
  bad text, long tasks over 200 ms, screenshot), `events-summary.json` and `storage.txt`.
- **Video:** `fal-run-1280x800-night.webm` (re-encoded to 800 px, 12 fps; time 0 = page load).
- **Spend:** logged in `design/FAL-SPEND.md` at about $0.45–0.60 (estimate; the server doesn't meter). Total now
  about $7.9–8.5 of $10.
- **Driver artefacts, not product faults:**
  - My selector for "Focus 1 in her inbox" was wrong (`#inbox .inbox-now`). Meanwhile a stray → opened Focus 1 at
    about 64 s, and that → also caused the one 409 (`POST /first`, a repeat). The video shows "Noor has a question →"
    about 7 s after the reveal.
  - That gap, about 75 s of dead time between 68 s and 147 s, is my driver's, not the app's.

### Timeline (fal, from `log.txt` and the video)

| Segment | Measured | DEMO.md expects |
|---|---|---|
| Idea Enter → the name-tag paper | ≈2–4 s (the tidy on fal; video 5.6 → ~9 s) | 0:00–0:05 |
| Name tag Enter → the team's read on her tag | 2.1 s ("Priya, the Journey Mapper") | 0:05–0:15 |
| Meet the team, 5 cards (driver pressed Next every ~2 s) + door + reveal | ≈14 s | 0:15–0:31 |
| Reveal → first sketch drawn | already drawn at the reveal (sketch.done before the room settled) | 0:31–0:38 |
| Reveal → "Noor has a question →" | ≈7 s (video 37 → 44 s) | by 0:38 |
| Focus 1 Send → first reply visible | 2.2 s (round 1); round 2 done in 1.3 s | "under a second" (aim) |
| Focus 1 End meeting → takeaways | 3.7 s | |
| Focus 1 closed → Bo's unblock in inbox | < 0.1 s | 0:58 |
| Yes → decided; → Focus 2 in inbox | instant; 0.9 s | |
| Focus 2 Send → round done; End → takeaways | 1.1 s; 3.0 s | 1:08–1:30 |
| **Team, go → team + selector done** | **33.3 s** | **17.5–20 s** ("team + selection", DEMO §1) |
| Build press → her page | 22.1 s (decide 10.8 s, fill 11.2 s) | ~22 s |
| Close: judge's idea Enter → first check-in | 23.2 s (sketch 2.0 s) | ~11 s (the close is slides on stage; this is Q&A) |

**Estimate of the presenter's real time, idea to her page: about 2:15, against DEMO's 1:55.** It assumes she speaks
her answers (about 10 s each), one Send round per focus (the DEMO script, not REHEARSAL's 2 rounds), and one build
press. With the page, the proof and the close, that is about 3:15–3:20. **So the agreed cut order (DEMO §1) will
likely be needed.** Vincent's 07:00 timed run is the real number.

### Recorded explicitly
- **"Build it →" on the close:**
  - empty: "Build it →", `data-state=off`, aria-disabled;
  - typed: "Build it →", `ready`;
  - pressed: "Building…", `working`, within 400 ms;
  - done: back to "Build it →", `ready`, and the close shows "11 handled by the team · 1 for you", one question, and
    her "3 asked · 14 decided from the file".
  - Screenshots: `fal/36-close-empty.jpg` → `39-close-done.jpg`.
- **"Design is sketching…" after the idea's Enter: does not appear right after it on the default (IDEA → YOU → TEAM)
  path.**
  - Polling every 25 ms for 12 s after Enter found no "Design is sketching" text (`steps.json`, `idea-entered`:
    `sketchingLineMs: null`).
  - The paper moves on to her name tag instead.
  - The line first shows at the reveal (video ≈38 s: "Design is sketching… or type your own steps").
  - Why: `firstSketch.soon()` is called only from the room's own idea input (`public/room.js:548`, `:687`). On the
    default order the run starts at beat 3 (`public/room.js:1563-1564`).
  - This isn't a FAIL in itself, since the setup moves on visibly within 300 ms. But if the instant line was meant
    for the idea paper, it isn't there (b7).
- **The fal-only specs not run at the freeze (beats 3–5, voice):**
  - Beat 3, the close on a real idea: ran; a judge's idea gave its sketch and one check-in.
  - Beat 4, replays: R ran on stubs in both looks (`fallbacks/RESULTS.md`).
  - Beat 5, slow/failing fallbacks: not exercised on fal. Nothing failed, so there was no failure path to see.
  - Voice: the mic is on every input I passed (idea, name tag, focus pieces, the close). No ElevenLabs call was made
    in this run (typed only); voice.e2e ran on stubs (f).

---

## a. The demo, beat by beat

| Beat | Result | Evidence |
|---|---|---|
| New opening, IDEA → YOU → TEAM | **PASS.** Idea paper, then name tag, then 5 meet cards with tailored lines (all 5 `tailored`), the door, the room with her idea on the sheet and the run already sketched. | `fal/02`–`13`, `fal/x-reveal-grid.jpg` |
| 0:00 on-screen words | **FAIL (doc vs screen).** DEMO.md's 0:00 row says the blank sheet reads **"What's the idea?"**; the paper says **"What do you want to build today?"** REHEARSAL (Sun 01:21) has the new words, so DEMO.md wasn't re-synced. "What's the idea?" is now the room sheet's label. | `fal/02-idea-paper.jpg` |
| Name tag | PASS. "Priya, the Journey Mapper · problem detective · user obsessed · solution builder", superpower line, "In your words" kept verbatim, "tap any piece to swap it". | `fal/06-nametag-shown.jpg` |
| Meet the team | PASS. Name · role · agent mark, a tailored line each, "Brings", "Loaded with" / "Made with". DEMO says "the teammate fitted to this idea comes last"; the order was Mika, Theo, Noor, Ines, Bo, and I can't tell from the screen which teammate was "fitted". | `fal/07`–`11` |
| Reveal + team gets going | PASS. Users "Regular customers · First-time visitors · Bakery staff", stages "Browse breads → Pick a loaf → Choose pickup time → Place order → Collect". No screens. | `fal/x-chatter-overlap-1280.png` |
| Focus 1 | PASS. Noor · Research; "researched before the demo"; the Bakery Business finding with its source and date; "Who should we build this for first?"; two rounds of replies (Noor, Theo), End meeting, takeaways in her voice, Keep, Team notes · 5. | `fal/15`–`22` |
| Unblock | PASS, word for word: "Bo's blocked · Setting up ordering · When do orders close? · We suggest 8pm the night before · Yes · Say something else". Yes → "Told Bo: 8pm the night before"; Bo's chatter "Got it: 8pm the night before. Carrying on." | `fal/24`, `fal/25` |
| Focus 2 | PASS. Mika's journey in words (6 timed steps, "Sam" 7:10–8:45); "What should this feel like for a regular?"; one round; 4 steps rewritten in front of her; takeaways "ordering ahead should feel like the baker already knows you… just their first name: no account, no payment". Odd model text: "Sam says Sam's name, reserves Sam's usual loaf" (the names-only rule). | `fal/27`–`29` |
| **The Focus 2 line's cite** | **PASS.** Her Focus 2 takeaway became L4. Of 29 distinct team decisions, **7 cite L4** (and 3 cite L3, Focus 1). The page's own list shows "Book your usual with just your first name". | `fal/events-summary.json` |
| Build it (her one press) | **FAIL**, see FAIL 1. | `fal/32-team-done.jpg`, `fal/x-build-pagedowns-grid.jpg` |
| Her page | **FAIL (partly)**, see FAIL 9. It has the 8pm cut-off, "No account, no payment now. Your loaf waits at the counter under your first name", no phone field and "Book your usual". But `regularsFirst: false` ("the bread first"), and the page asks for **Email** and How many, says "A text arrives once your loaf is set aside" with no phone field, and carries a **"Decided for you"** list that BRIEF.md cut. | `fal/34-her-page.jpg`, page text in this file's notes |
| Proof (live bakery) | see e | |
| Timing | **FAIL** (see the timeline): team + selection took 33 s, not 17.5–20 s; the estimate runs over 3:00. | |

## b. The 3 rules

| Check | Result | Evidence |
|---|---|---|
| Honesty labels | PASS. "researched before the demo" (Focus 1); "Replay"/"REPLAY" plus "recorded run "rehearsal" · Sun 02:49 AM" throughout R; meet cards "Made with … before the demo"; the bakery banner "Demo bakery for a hackathon: no real bread, nothing to pay." | `fal/15`, `fallbacks/c2-*`, `fallbacks/RESULTS.md` |
| Bakery credit | **FAIL**: the live site's only credit is "Built by Bo, the team's engineer. Polished by our builders."; "Built earlier by this same team" is on the slide only (`public/slides/index.html:78`), not the site (DEMO.md 2:10). | curl of the live page |
| fal-key leak test (BRIEF §4, `test/leak.test.js`) | PASS: `node --test test/leak.test.js` 1/0 ("the fal key appears nowhere: runs/, console, HTTP responses, SSE"), against a hostile fake fal that echoes the key. | `stub-tests.txt` |
| Grep of runs/ + server log + driver output for key-shaped strings (`Key …`, fal uuid:hex, `FAL_KEY`, `Authorization`) | PASS: 0 hits. In this cloud run the key never exists in the process (the proxy injects it; `lib/model.js:141-143`). | command in the notes below |
| Browser storage | PASS. localStorage holds only `byoc.run` and `byoc.me` (her name/intro); sessionStorage empty; no cookies; 0 key-shaped strings in storage or DOM. | `fal/storage.txt` |
| 3-question cap test | PASS: `test/select.test.js:39,:51,:64` ("a fourth never gets through"), `test/stagepath.test.js:62` (Focus 1, unblock and Focus 2 are the three grants; a fourth is refused, "cap of 3"), `test/unblock.test.js` (the cap holds, 2 selector asks + 1 unblock), `test/policy.test.js:75` (only lib/policy.js writes ask events). Enforced at `lib/policy.js:7` (`MAX_ASKS = 3`) and re-checked against the log at `:39`, `:71`. | `stub-tests.txt` |
| 5 rounds = 1 ask | PASS: `test/meeting.test.js:58` runs 5 rounds then End, gets askCount 1, 5 `answer.round`, 0 `ask.refused`; q2 and q3 are allowed and q4 gets null. In the code, `lib/meeting.js` never imports policy.js (rounds log only `answer.round` / `round.done`, lines 52–56). | |
| On fal | PASS: exactly 3 asks (`first`, `u-engineering-1`, `feel`) across 3 rounds; "3 asked" on the close. | `fal/events-summary.json` |

## c. Fallbacks (verified by stub only, except where noted)

| Fallback | Result | Evidence |
|---|---|---|
| `?look=plain` | **FAIL**: the run works end to end (room 22 s after the idea), but the **first screen is unstyled**: the idea card sits bottom-right with raw form controls. | `fallbacks/c1-plain-first-1440.jpg` (I opened it myself) |
| R replay | PASS, but **slow**. The label shows throughout, with 3 asks, 3 rounds, 2 takeaways and her page; no errors. **It takes 4 min 24 s**, and Focus 1's rounds play with the doc closed (≈80 s showing only "Noor has a question →"). If R is pressed early, it alone overruns the slot. See FAIL 7. | `fallbacks/c2-*` |
| `?setup=classic` | PASS: name tag → team → "What's the idea?" at the reveal. | `fallbacks/c3-*` |
| `?meeting=0` | PASS (stub): single Send to `/answer`, no End meeting (`public/focus-doc.js:81`). | `fallbacks/c4-*` |
| Fallback B (env lines → doctor) | PASS. After the switch, the first line of doctor and `npm run local` is `route: claude-code (company gateway: haiku roles → sonnet)`, word for word; the burst took 8.2 s (< 10). Original: `route: fal`. WARN case: `route: fal (TAG_MODEL=sonnet, …)` + the WARN line. Dummy keys only; full doctor with fal on not run. | `fallbacks/RESULTS.md` |
| Bakery clip | **FAIL**: no recorded bakery clip exists in the repo (M2-PLAN.md:48-50 and POLISH §7 call for one); SUBMISSION.md:108 "Demo video: TBD". | file search |
| Bakery URL | PASS: `https://bring-your-own-craft-production.up.railway.app` in BAKERY-BRIEF.md:5, the slides and the QR. | |

## d. Vincent's path (clean clone, Linux; verified by stub except the doctor)

| Step | Result |
|---|---|
| `npm run doctor`, no `.env.local` / dummy `.env.local` | PASS. `route: claude-code` is the script's first line (npm's banner above it); NOTE/WARN lines each with a fix; exit 0 in 12.6 s; no key value printed. |
| `npm run local`, 3000 taken | PASS: "port 3000 is busy (another app), so we use 3001", the app on 3000 untouched. |
| Start / Stop BYOC.command | PASS, read and dry-run (fake `open`). Both 100755, `#!/bin/bash`, LF, `bash -n` clean. Start runs doctor, starts the room, waits, then opens the picked port. Stop works via the pid file, via the port file, and on plain `npm run local`, and never touched another app. Mac-only parts (Gatekeeper, double-click, Chrome) not run. |
| Refresh mid-run | PASS: resumed (no REPLAY, POSTs `[]`), also mid-Focus 1. **On fal too:** the refresh after her page resumed with 0 POSTs and no REPLAY (`fal/35-refresh-resume.jpg`). |
| Start over (top right / Shift+N) | PASS: asks once, back to the idea paper, run kept on disk. Home also starts fresh. |
| 07:00 Step 1, steps 1–5 | Step 1 (route says fal): PASS on the env lines (c). Step 2: PASS (burst 4.1–6.6 s). Step 3: on fal it is my run above. Steps 4–5: PASS. |
| 3-minute look check, 1–6 | PASS: painted at `/` (for a non-automated browser), plaque "Bring your own craft", strike on "I want to build" (stub), cursor from computed styles, the time pill ×5 cycling day/night, refresh. CPU not measured (Mac-only). |
| **Doc mismatches** | **FAIL (b7)**: `docs/RUN-LOCALLY.md:33` says "`/` (the studio, plain look)", but the code makes painted the default (`public/index.html:110-113`). Minor: REHEARSAL's look check lists the door before the idea paper (it plays at the reveal, after meet the team); REHEARSAL says "2c under 10 s", but the doctor prints no "2c" label ("A Send-shaped burst … s wall"). |

## e. The live bakery (read-only: GETs only, no orders, no forms)

| Check | Result |
|---|---|
| Loads | PASS: 200, 1.3 s desktop / 0.8 s phone 390×844, no errors. **The shelf read "Sourdough 1 left": run Reset demo before the talk.** |
| `/admin` without login | PASS: 401 (re-checked myself with curl). |
| Credit line | **FAIL**: see b. |

## f. Tests

Verified by stub only. Details in `docs/audit/final/stub-tests.txt`.

**`npm test`: PASS, 282 pass / 0 fail / 1 skipped** (the skip is "LIVE: a different idea changes the picks", LIVE=1 only), about 27 s.

**Stubbed e2e (`E2E_LOOK=painted` and `=plain`):**

| spec | painted | plain |
|---|---|---|
| app | 2/0 | 2/0 |
| focus-ack | 2/0 | 2/0 |
| focus-wait | 4/0 | 4/0 |
| inbox-layout | 5/0 | 5/0 |
| inbox | 8/0 | 8/0 |
| inputs | 8/0 | 8/0 |
| nametag | 14/0 | 14/0 |
| pad-status | 2/0 | **1/1**, then 2/0 and 2/0 on reruns |
| page | 2/0 | 2/0 |
| reorder | 10/0 | 10/0 |
| resume | 8/0 | 8/0 |
| teamgo | 5/0 | 5/0 |
| tidy-all | 3/0 | 3/0 |
| tidy | 5/0 | 5/0 |
| voice (NO_PROXY=api.elevenlabs.io) | 9/0 | 9/0 |

**Result: PASS, except one flaky spec, pad-status, which is part of FAIL 12.**

Caveats:
- **Some "stubbed" specs don't stub `/api/tidy`.** In focus-wait, teamgo and pad-status, the tidy reaches the real
  model through the claude CLI (never fal).
- **pad-status flakes on that.** At `e2e/pad-status.e2e.js:113` it expects her raw words, but a fast tidy rewords them.
- **Only inbox and inputs read `E2E_LOOK`.**
  - Eight specs loop over both looks themselves.
  - app, focus-wait, pad-status, teamgo and voice run plain only.
  - For all of those, the two columns are the same run twice.
- **Not run:** the specs that need real models (beats, craft, room, studio, team, yoga).

## g. docs/POLISH.md, item by item (fal run at 1280×800 night, plus stubs at 1920×1130 / 1440×900)

**§1 One thing per screen.** **FAIL**, see FAIL 1.
- Idea paper, name tag, meet cards, focus docs and the unblock card each have one primary action. PASS.
- After Team, go there is no primary action at all, and the pill says "Bo starts once you agree the page" with nothing
  to agree (FAIL 1).
- Outside stage mode, the top bar's key hints ("→ next beat · S · R · J · ?") show on every screen. That is by design
  outside S; Vincent should press S on stage.

**§2 Every input is a good input.** PASS, with notes.
- The tidy ran on the idea and on focus pieces on fal.
- The mic is on every input passed.
- Long text, Enter/Shift+Enter/Esc and the shortcuts are covered by the stub e2e (inputs, tidy-all; f).
- Note: on fal the idea's tidy reworded "so customers can" → "where customers can" (a small word changed, not just
  cut), and it showed as a cross-fade with ~0.5 s of ghosted double text, not the strike seen on stubs
  (`fal/x-idea-tidy-fal.jpg`).

**§3 Calm, clean motion.** Scored below for the design lead to confirm.
- Reduced motion: not tested by me (the inputs e2e claims a fade under reduced motion).
- One flash: the door is painted in day light even in night mode, so the reveal goes day door → night room (video
  ≈36–40 s).

**§4 Never lost, never stuck.** **FAIL** (FAIL 1, FAIL 4).
- Every wait I saw had a plain status: "The team is writing your tag…", "The team is writing the takeaways…",
  "Building v1…", "Building…".
- The stuck point after Team, go is FAIL 1.
- Chatter didn't fade: "Noor is picturing bakery staff" stayed under her sheet from ~44 s to ~171 s.

**§5 Nothing broken-looking.** **FAIL** (FAILs 3, 4, 5, 6).
- No page scrollbars at 1920/1440/1280, day and night (`fal/sweep.txt`).
- No "undefined/NaN/[object" in the fal run (`fal/steps.json`).
- Broken: the clipped "our page" header, the chatter overlapping the input line, "1 decisions", and "Make my tag"
  clipped.
- "tap to play" under the record player sits off-screen at ≤1440 (`fal/sweep.txt`).
- Contrast: not measured.
- Cursor: PASS by computed style (d).
- Sound / stage mode muted: not tested.

**§6 True on screen.** PASS for the room, **FAIL** for the site credit (b).
- Labels, as in b.
- "Loaded with" / "Made with" on the meet cards: Linkup for Noor, Claude on every card, "Claude (Sonnet), through
  fal" and "This app, built with Claude Code" for Bo, "painted on fal / laid out in Figma" for Mika, taste-skill
  (MIT) for Mika.
- Cap and key: as in b.

**§7 Vincent's own path.** **FAIL (docs only)**: the RUN-LOCALLY `/` line (d). All commands work; the fallbacks work
except the plain first screen and the missing clip (c).

### §3 magic moments, from `fal/fal-run-1280x800-night.webm` (for the design lead to confirm)

| Moment | Time in video | My score | Why |
|---|---|---|---|
| The door plaque | ≈35–38 s | fine | The plaque reads "Bring your own craft" and the doors open, but it's daylit inside a night run and plays after the meet cards, so it reads as a pause before the room. |
| The tidy (idea) | ≈5.6–8 s | fine | A clean result in about 1.5 s, but a cross-fade with brief double text, not the strike-and-close-up. |
| The handwritten name tag | ≈19–24 s | fine | Lands in 2.1 s with a nice read, but "Make my tag" is clipped while it writes (FAIL 6). |
| Each meet card's entrance | ≈24–34 s | magical | Dealt in, calm, big face and a tailored line. |
| The team getting to work | ≈38–50 s | fine | The sketch is already drawn at the reveal and "Noor has a question →" arrives about 6 s later. Chatter overlaps the input (FAIL 4). |
| A teammate's reply arriving | ≈149–151 s | fine | 2.2 s to the first reply, against a sub-second aim; the replies themselves read well. |
| End meeting → takeaways | ≈158–162 s | magical | "The team is writing the takeaways…" then a calm card in her voice. |
| Bo's smile on Yes | ≈179–181 s | flat | Yes → "Told Bo: 8pm the night before" → room; at this size I couldn't see a distinct smile on Bo. |

## h. Nothing broken (summary of the fal capture, `fal/steps.json`)

| Signal | Result |
|---|---|
| Page errors | **0** across 39 steps. |
| Console errors/warnings | **1**: "Failed to load resource: 409 (Conflict)" on `POST /api/run/<id>/first`, caused by my driver's stray → (a repeat request). The stub run in `?look=plain` saw the same 409 once (`fallbacks/RESULTS.md`), so a double POST to `/first` is worth a look (b3); nothing visible. |
| Failed requests | **0** beyond that 409. |
| Visible "undefined/null/NaN/[object" | **0**. |
| Long tasks over 200 ms | 19 in the run, all under 0.85 s. The worst were 848 ms when the Focus 1 takeaways landed, 488 ms on unblock Yes, 438 ms on the refresh and 409 ms at the reveal. |
| Server | 3 lines in its log, no `[model] … failed`, no 401/402. |

---

## FAILs, with diagnosis and owner

**1. After Team, go: no visible way to build her page (b3).**
- **Seen:** when the team finished (33 s), the room showed "Nothing needs you yet" and the app pill "No app yet · Bo
  starts once you agree the page". There's no button, and nothing to "agree".
- **Build:** the room's build runs on entering beat 8 (`public/room.js:1586-1588`). From the room after Team, go,
  that took **three** → presses (beats 6 and 7 changed nothing visible), or **B**.
- **Expected:** DEMO 1:30 says "Her one press".
- **Likely:** the pill copy (`public/app-button.js`) and the beat sequence assume the old screens/sketch beats.
- **Fix suggestion:** a visible "Build it" (or the pill as the button) once `select.done` lands, or → jumping straight
  to beat 8.
- Evidence: `fal/32-team-done.jpg`, `fal/x-build-pagedowns-grid.jpg`.

**2. `?look=plain` first screen unstyled (design, with b7).**
- **Seen:** the idea card sits at the bottom right with raw controls.
- **Cause:** `public/room.css:504` places only `.setup .big-card.nt-paper`; `.idea-card` keeps `.big-card`'s
  `position:absolute; left:470px; top:250px` (`public/room.css:327`).
- Evidence: `fallbacks/c1-plain-first-1440.jpg`.

**3. Her page header clipped to "our page" (design).**
- **Seen:** painted at 1280×800 and 1440×900, the "Your page" title is cut at the left, under her sheet's edge.
- **Likely:** `public/looks/painted-fixes.css:64`, where `#page-sheet` gets `margin-left: calc(-1 * var(--crop-x))`
  under `data-fill="cover"`.
- Evidence: `fal/x-page-head-clipped-1280.png`, `fal/sweep-her-page-1440x900-night.jpg`.

**4. The team's chatter line overlaps her sheet's input line, and doesn't fade (design/b3).**
- **Seen:** "Noor is picturing bakery staff" sat over "React to it, or click a box" from ~44 s to ~171 s.
- **Where:** `[data-component="team-doing"]` from `public/looks/painted.js` (the "team at work" strip).
- Evidence: `fal/x-chatter-overlap-1280.png`.

**5. "1 decisions" (design).**
- **Cause:** the word is static CSS content: `public/looks/painted-fixes.css:244`
  `content: 'decisions'`.
- Seen on fal and in R.

**6. "Make my tag" clipped by the name-tag card's bottom edge (design/b7).**
- **Seen:** while "The team is writing your tag…" shows (~2 s on fal) at 1280×800.
- Evidence: `fal/x-make-my-tag-clipped-1280.png`.

**7. Timing over DEMO (lead's call; b3 for team speed, b7 for R).**
- Team + selector took 33.3 s, not 17.5–20 s. My estimate of the real time runs past 3:00, so the agreed cut order
  applies.
- R replay runs 4:24 at speed 1.
- Vincent's 07:00 timed run decides.

**8. Docs out of sync with the build (b7).**
- `docs/RUN-LOCALLY.md:33` ("`/` … plain look"; it is painted).
- DEMO.md 0:00 says "What's the idea?" (the screen says "What do you want to build today?").
- REHEARSAL's door order and its "2c" label.

**9. Her page contradicts her lines and BRIEF (lead to assign: page template/fill).**
- **Seen:** the page asks for Email and How many, despite "nothing to fill in", and says "A text arrives…" with no
  phone field.
- It also has a "Decided for you · Five choices the team made" block, which BRIEF.md §2 cut for "one margin note on
  the page".
- `regularsFirst` is false, though DEMO 1:55 says "regulars first".
- Partly model judgement (`build.done.switches`); the Email field, the text-message line and the "Decided for you"
  block look like template copy.

**10. No recorded bakery clip (lead/b7).** Called for in M2-PLAN.md:48-50 and POLISH §7; none in the repo.

**11. Live bakery lacks the "Built earlier by this same team" credit (lead / the bakery's builder).** The slide has
it, the site doesn't.

**12. The tidy rewords her words, and a spec flakes on it (b7).**
- **Seen:** on fal, the idea "…bakery, so customers can order…" became "…bakery where customers can order…".
- **The same rewording on the claude backend** breaks `e2e/pad-status.e2e.js:113` whenever the tidy answers within
  2.5 s.
- **Why it matters:** POLISH §2 says the tidy may cut and reorder, but the content words stay hers. The comment at
  `public/room.js:1276` says it never rewords.
- **Two fixes:**
  - the tidy prompt or rule: cut-only for the idea;
  - the spec: stub `/api/tidy` in pad-status, focus-wait and teamgo.

## Post-freeze exception: design/tidy-pen

**PASS, verified by stub only.** Checked on main **96d6a9f**, the merge of design/tidy-pen @ **c159a03**, which
includes aa2fcea. No fal spend.

| Check | Result |
|---|---|
| Tidy e2e | `tidy` 5/0 and `tidy-all` 3/0 in both painted and plain; `inputs` 8/0 in both. |
| No ghost text | No ghost text in the screenshots. The overlay is gone after the moment (0 left), and the paper moves on to the name tag. |
| Pen stays inside the input box | Sampled every 40 ms at 1920×1130 and 1440×900: the pen was outside the input box in 0 samples. |
| Reduced motion | Static: no moment and no pen, because `painted.js:368` skips the moment. |
| Console and page errors | 0. |

Evidence: `docs/audit/final/tidy-pen/` (`result.txt`, `e2e.txt`, `pen-*.jpg`).

This exception does not touch FAIL 12. The tidy model's rewording on fal ("so" → "where") is a separate problem from
this animation.

## What I did not test, and why
- **Mac-only:** Finder double-click, Gatekeeper and `open -a Chrome` in the launchers; Chrome CPU in Activity
  Monitor; the real cursor drawn (headless draws none, so I checked computed styles).
- **Voice on fal or ElevenLabs:** typed only; the voice spec ran on stubs.
- **Not measured:** contrast ratios, `prefers-reduced-motion` and sound/stage-mode muting.
- **Full doctor with fal on:** not run (its key check would make a fal call on the proxy-injected key, outside the
  one-run budget).
- **Spec suites that need real models** (beats, craft, room, studio, team, yoga): not run; the fal run stands in for
  the stage path.
- **The stage path at 1920×1130 and 1440×900 on fal:** not run (one paid run, at 1280×800). Those sizes are from stubs
  (`vpath/`, `fallbacks/`) and the resumed-run sweep (`fal/sweep-*`).
- **The bakery's admin page and Delivered flow:** not touched (read-only).

## Notes
- **Key grep:**
  `grep -rEn "Key [A-Za-z0-9]{8,}|<uuid>:<hex>|FAL_KEY=|Authorization" <runs dir> <server log> <driver output>` gave
  0 hits (the rehearsal and yoga copies excluded).
- **Her page's text** (fal, `run-2026-11-15T05-06-42-808Z-xhzk`):
  - The hero reads "Reserve your loaf the night before · Order by 20:00 for the next morning's bake".
  - "Book your usual · Your usual loaf, ready to reserve again…".
  - "No account, no payment now. Your loaf waits at the counter under your first name."
  - The fields: "Name · Email · Bread and collection time · How many · Remember me on this device".
  - "After you reserve: A text arrives once your loaf is set aside…".
  - "Decided for you · Five choices…".
  - Switches: `{regulars:true, regularsFirst:false, standingOrder:false, cutoff:true, phone:false, remember:true,
    oneTapCancel:true, cancelReason:false}`.
