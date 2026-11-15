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

## Re-check of the fixes (main 0095d1a): 17 PASS, 0 FAIL

Every line here is **verified by stub only**: no fal spend. Each fix was checked against what its owner claimed,
independently. Evidence is in `docs/audit/final/recheck/` (`visual.txt`, `tests.txt`, `f9.txt`, screenshots).

| Item | Result | Evidence |
|---|---|---|
| F1 (61ab4d9): one → after Team, go builds | **PASS**. Painted, from the working room: the pill reads "Press → and Bo builds the page", and the first PageDown fires `POST /build` (stubbed). Plain: the third press does, as REHEARSAL:78-79 says. | `F1b-*.jpg`; `public/stage.js:129-131`, `public/app-button.js:37-39` |
| F2 (275bdb4): plain first screen | **PASS**. The idea card is centred and styled at 1920×1130 and 1440×900. | `F2-plain-*.jpg` |
| F3 (95735a9): "Your page" not clipped | **PASS**. 1280 and 1440, day and night: the title is in full, and `elementFromPoint` at its left edge returns the title. | `F3-*-head.jpg` (I viewed the 1280 night shot myself) |
| F4 (1a1555d): chatter clear of her sheet | **PASS**. The strip hangs 9–10 px under her sheet, follows it when it grows, hides when the sheet opens large, and fades about 5.8 s after the last line (was about 2 min). Not measured: overlap with a focused `#her-input` while typing. | `F4-f4b-*.jpg` |
| F5 (b016d1a): "1 decision" | **PASS**. Count 1 reads "1 decision · 1 to you"; 2 and 27 read "decisions". | `F5-*.jpg`; `public/room.js:814` |
| F6 (604db55): "Make my tag" not clipped | **PASS**. While "The team is writing your tag…" shows, the button sits fully inside the card at 1280 and 1440 (`elementFromPoint` checked at its bottom corners). | `F6-*-thinking.jpg` |
| F7: cut order in effect | **PASS**. REHEARSAL.md:10 and :72, and DEMO.md:43 and its rows (Focus 2 straight to End meeting, her page 5 s). | docs |
| F8 (55c87ca): docs match the screen | **PASS**. RUN-LOCALLY:33 says `/` is painted (the default) and `?look=plain` is the fallback. DEMO 0:00 reads "What do you want to build today?". REHEARSAL puts the door after the team, and names the doctor's real line ("A Send-shaped burst…"). | docs |
| F9 (8d3ecc7): her page follows her line | **PASS**. Re-filled with **my fal run's own recorded model output** (`page/slots.json` `.model`) and its real answers, not the owner's stub. The form is First name, Bread and collection time, and Remember me. There's no Email or How many field, no phone, no "A text arrives" and no "Decided for you". Regulars come first (order: hero, regulars, bread, …). "Email" appears only as the "Email the bakery" contact link. | `f9.txt`, `f9-her-page-1440-*.jpg` |
| F10 (6e4528e): bakery clip | **PASS**. `/clips/bakery-order.mp4` serves 200 `video/mp4` (14.6 s, 390×844), labelled "Recorded earlier" in every frame, and REHEARSAL:94 points at it. No `railway.json`. `deploy/` exists, but only with `ACCEPTANCE.md` and an acceptance spec, unchanged since 1f6e56c. | `f10-clip-frames.jpg` |
| F12 (60da476): the tidy guard | **PASS**. `checkTidy(raw, "…bakery where customers can…")` returns null (refused), and `tidyText` gives back her raw words (`reason: changed words`); the control with ", so" is accepted. pad-status passed 3/3 painted and 3/3 plain, and it now stubs `/api/tidy`. | `tests.txt` |
| The /first 409 | **PASS**. Two `POST /first` on a run return 200 `{"already":true}` both times (checked on my server and on the helper's). | |
| `npm test` | **PASS**. 285 pass / 0 fail / 1 skip (LIVE only). | `tests.txt` |
| Leak test | **PASS**. 1/1. | `tests.txt` |
| Cap test, and 5 rounds = 1 ask | **PASS**. 41/0 across select, stagepath, unblock, policy and meeting; `meeting.test.js:58` passes. | `tests.txt` |
| Key grep of the whole tree | **PASS**. The only hits are the test sentinels and canaries. | `tests.txt` |
| beats 1–2e, both looks | **PASS**. 10/10 painted, 10/10 plain. Test 2 (the live path) ran on real claude-code calls (not fal) in about 60 s. | `tests.txt` |

**Accepted, not defects:**
- **The instant "Design is sketching…" at the idea's Enter.** I agree with the owner: on the IDEA → YOU → TEAM order
  the run hasn't started there, so the line would be untrue.
- **F11 is accepted as slide-only.** One doc word is left: `DEMO.md:72` still says "The slide **and site** carry the
  label". It should say the slide only (b7, docs).

**Not landed, not checked:** the plain meeting styling (design QA P1–P4). It isn't on origin/main.

**Observations, not FAILs:**
- **Her tag after a resume.** A resume via `?run=` in a fresh browser shows "Priya · your seat", not her tag title,
  because her tag lives in that browser's localStorage. In Vincent's own Chrome a refresh keeps it (d, `vpath/16`).
- **Resuming a cut-short copy started work.** It made the room continue the run: `POST /propose`, and 2 `sketches`
  events added on resume. That is expected for a run that hadn't finished.

### Last pass on final main f5de3a1 (06:17–06:25 UTC): 5 PASS, 1 known red (documented)

Verified by stub only. Evidence is in `docs/audit/final/recheck/final/`.

**What landed after 0095d1a:**
- design/plain-inbox (P2/P3/P4): `public/room.css` +61 lines.
- DEMO re-syncs (F11 wording; the her-page fallback dropped).
- REHEARSAL's plain-meeting note.
- AUDIT-design.md text.
- **P1, the plain meeting, did not land.**

| Item | Result | Evidence |
|---|---|---|
| Painted unchanged on beats 1a–2e | **PASS.** The only code change is `public/room.css`, and all 61 new lines sit under `html:not(.painted-on)` (painted adds `painted-on`, `painted-living.js:44`). So painted can't see them, and no other public/ file changed since 0095d1a, where beats 1–2e passed 10/10 painted. I didn't re-run beats on f5de3a1; I'm relying on the diff. | `git diff 0095d1a f5de3a1 -- public` |
| Plain unblock card | **PASS.** One card, "Bo's blocked · Setting up ordering", "When do orders close?", a dashed "We suggest" box, an ink Yes (`appearance: none`) and "Say something else". | `unblock-card-plain-1440.jpg`, `unblock.json` |
| Plain inbox (new / drawer) | **PASS.** `e2e/inbox.e2e.js` 8/0 plain and 8/0 painted, covering the collapsed line, the drawer and the unblock flow. My own drawer screenshot didn't open (my click), so the evidence for it is the spec. | `inbox-e2e.txt`, `inbox-new-plain-1440.jpg` |
| **Plain meeting after one Send** | **RED, known and documented.** The field, Send and End are in the DOM but covered: `elementFromPoint` at each centre hits another element, and the screenshot shows no field, Send or End, only the help line. Mika's reply also lands inside the work box. This is P1, which did not land. REHEARSAL already says the meeting fallback is the **R replay**, not `?look=plain`. Painted's meeting is fine (field, Send, End visible). | `meeting-after-send-plain-1440.jpg`, `result.json` |
| DEMO.md:72 slide-only | **PASS.** "The slide carries the label "Built earlier by this same team"" (4d90118). | DEMO.md:72 |
| `npm test` on f5de3a1 | **PASS.** 286 tests, 285 pass, 0 fail, 1 skipped (LIVE). | |
| Key grep of the whole tree on f5de3a1 | **PASS.** No hits outside the known test sentinels and canaries. | |

## Submission re-audit (bbb49aa)

Checked at 10:00–10:15 UTC, Sun 15 Nov, on final main **bbb49aa** (141 commits since 273aa9e). **Verified by stub
only:** every server ran with the proxy env, `FAL_KEY`, `LINKUP_API_KEY` and `MODEL_BACKEND` removed, so there was
**no fal and no Linkup spend**.

A few real calls went through the default claude CLI backend, never fal:
- beats 1b and 2;
- tidy-first tests 1–4;
- the server's warm-up.

Evidence is in `docs/audit/final/sa/` (`A.txt`, `B.txt`, `C.txt`, screenshots).

**Result: 0 stage-visible FAILs. 15 items: 14 PASS, 1 FAIL (item 15, submission text only).** The checks all pass.
There are two test flakes, and a few notes that aren't on stage.

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Cap removal | **PASS** | `git grep MAX_ASKS lib public` is empty. No count-based refusal is left: `lib/policy.js` refuses only a missing or forged grant, a grant for another run, an ask the selector didn't pick, or the same decision twice. `askCount()` (`policy.js:24`) is exported but never called. The stage path gets `max: 0` and raises exactly Focus 1, the unblock and Focus 2 (`lib/first.js:31-32,55-57`). stagepath, ranking and policy tests pass 17/17, including "only lib/policy.js writes ask events" and "the stage path raises exactly its moments… the selector brings none". |
| 2 | Live logo | **PASS** | logo unit tests pass; `e2e/logo.e2e.js` 2/2. With a stubbed fetch, success writes a local `logo.jpg`; a timeout gives `timeout after 300 ms` and the page keeps its usual mark. The prompt asks for "symbol only, no text, no letters" (`lib/logo.js:20-26`); whether flux really draws no letters needs a live run. Neither built page contains fal.media, fal.run or v3.fal. "Painted live with fal" appears only on the live build. |
| 3 | Live Linkup | **PASS** | live-finding unit tests pass. With a stubbed fetch: verified gives "found just now with Linkup"; unverifiable gives "no quotable line…"; a timeout falls back; a tampered quote fails. beats 2f, the browser label test, passes ("researched before the demo" on none or timeout, and the label never swaps under her). The doctor with no key prints `NOTE  live research: off (prepared finding)`. |
| 4 | Any seat | **PASS** | anyseat e2e 12/12. All 7 chips in both looks reach the room with 0 page or console errors; Product is the default. |
| 5 | App button | **PASS** | app-button unit tests; app-first e2e 3/3; app e2e 2/2. Team, go starts v1. A press during v1 queues v2 (build codes [200, 200], no 409). v2 shows "v2 · no standing order". With `APP_V1=0` the button stays "No app yet" until the press. |
| 6 | Chatter | **PASS** | `CHATTER_WORDS=12`, with no "Name:" prefix; a line over 12 words is dropped. Samples: "Ooh, found a good piece on full classes at small studios." and "Pickup only on Saturdays, easiest to run day to day." interpret tests pass 14/14. |
| 7 | Meet cards say "live" only when live | **PASS, by configuration (note N2)** | With no keys, research shows "Prepared finding…" and there's no emblem chip. With keys, "Linkup web search, live" and "The page's emblem, painted live on fal" appear. N2: the chips follow the config, not the run's outcome (`lib/kit.js:85,89`). Builder 9's role-card diff claims to fix this; see its own line below. |
| 8 | User-paced meet | **PASS** | meet-paced e2e 2/2; reorder 10/10. Painted and plain at 1440×900: still on card 1 after 12 s idle; PageDown, →, PageUp, ← and Next/Back each move one card; the dots are correct; the last card reads "Into the studio" and waits. 0 errors. |
| 9 | Tidy | **PASS** | Commits 091752c, c082470 and 8c8dad7. For "So, um, I wanna build a bakery shop", `checkTidy` accepts "I want to build a bakery shop." and refuses "open a bakery". `tidyText` with a bad answer or a timeout falls back to "I wanna build a bakery shop". On 10 inputs, `cutFillers` only deletes words (its output is always a subsequence of the input). tidy and leak tests 17/17; tidy and tidy-all e2e 8/8 in each look; tidy-first 7/7. |
| 10 | Reply notes | **PASS** | 7b89813, `painted-focus.css` only. In a stubbed painted meeting, a team note's corners are `6px 16px 16px`, the mirror of hers, with the ink ring and offset shadow, inside the column. Plain is unaffected. 0 errors. |
| 11 | Localhost bind | **PASS (code)**; docs gap, see F1 | Read from `/proc/net/tcp`: the default listens on 127.0.0.1 and refuses on the other address; `HOST=0.0.0.0` listens on 0.0.0.0 and answers. `scripts/local.mjs` passes the environment through. |
| 12 | QR card | **PASS** | It shows only for `DEPLOY_URL=https://bring-your-own-craft-production.up.railway.app` (with or without a trailing `/`). It stays hidden when unset, for another https URL, for `http://`, `/admin` or `?x=1` (`public/app-button.js:78`; `routes/health.js:6-9`). **Decoded:** jsQR (mine) reads the SVG `public/qr-live-site.svg`, the card `public/qr-live-site-card.png` and the in-room card, and all give exactly `https://bring-your-own-craft-production.up.railway.app` (no /admin, no token, no query). This matches the tech lead's jsQR decode and the lead's OpenCV decodes; the lead also reports the card PNG is byte-identical and `qr-1920.png` decodes the same. Note: the small "Open the live site" link shows for any https `DEPLOY_URL` (`app-button.js:93`). DEPLOY_URL is the bare storefront address (tech lead). |
| 13 | deploy/ | **PASS** | The bakery source is in `deploy/app/`, plus `acceptance/`, `bo/`, `run/`, `clips/` and `shots/`. There's no `railway.json` anywhere. No `.env` files or key-shaped strings; `ADMIN_TOKEN` appears only as placeholders. No real customer data: only demo names, a fictional 07700 900xxx number and an `@example.org` address, in a test that checks they're rejected. Root `npm test` covers `test/**` only, so `deploy/app/test/` doesn't run; `test/acceptance.test.js` runs the deploy acceptance suite against a stub on purpose. |
| 14 | Noor → Wren | **PASS** | `git grep -il noor` finds only the known binary `docs/screens/page-bakery-390.png`. Text grep, untracked files and `runs/rehearsal`/`runs/yoga` are clean (they say Wren). |
| 15 | README / SUBMISSION vs code | **FAIL (submission text, not stage)** | Every cited path exists. The names, 3 templates, logo and Linkup labels, any seat, timings, "3 asked · 14 decided", the bakery's tiers, hold and credit, and the QR all match. Mismatches below. |

**The checks:**
- `npm test`: 308 tests, 307 pass, **0 fail**, 1 skipped (LIVE).
- **Leak test:** PASS.
- **Key grep of the whole tree:** 9 hits, none a real key (test sentinels and canaries, the README placeholder, the
  pattern quoted in this file).
- **Personal-email grep** (addresses never printed): the only addresses in the tree are the GitHub noreply author,
  `noreply@anthropic.com` in baseline transcripts, the vendored taste-skill contact and `.example`/`.org` demo
  addresses. Every commit since 273aa9e uses the noreply author.
- **beats 1–2f plus 4:** 11/12 in each look. Painted: 2c failed once under load, then passed 3/3 alone (F4). Plain:
  4 failed on a record-vs-live timing race in the test (F3).
- **R replay:** a manual stubbed run in both looks. "Replay · recorded run rehearsal" shows throughout; her page
  appears at 265 s, with 0 errors.

**Item 15 mismatches** (sent to the tech lead at 10:12):
- **(a)** `SUBMISSION.md:145` says "Run `npm start`, open http://localhost:3000". `npm start` doesn't load
  `.env.local` (`scripts/local.mjs:8` is the only loader). Use `npm run local`, which picks a port in 3000–3010.
- **(b)** `README.md:91` says "There is nothing to install", but `npm run e2e` needs Playwright (no deps in
  `package.json`, and `docs/RUN-LOCALLY.md` doesn't mention it).
- **(c)** `SUBMISSION.md:62` says "one of each per person", but `:92` and the code say per device per drop
  (`deploy/acceptance/bakery.acceptance.js:116`).
- **(d)** `SUBMISSION.md:90` says "11-test acceptance suite", but the file has 13 `test()` calls (11 numbered rules).
- **(e)** TBDs at `SUBMISSION.md:120`, `:145` and `:146`.
- **(f)** The localhost bind is undocumented (F1).
- **Not checkable offline:** the vendor commit `e91a134` (`README.md:127`).

**Non-stage notes:**
- **F1:** the bind is documented only in the `server.js:105-107` comment. `scripts/env-local.mjs:76` ("every address
  the server listens on (all of them)") is stale. Fix: one README line, and reword that comment.
- **F2:** stale cap wording, **not stage-visible**: `lib/select.js:2` "at most 3 asks", and `"capped at 3 in
  lib/policy.js"` in `public/slides/numbers.json:5` and `data.js:2`. The slide renders only the text before " ("
  (`public/slides/index.html:136`), and `slides.pdf` has no text layer. (CLAUDE.md:14 already describes the
  selector, not a cap.)
- **F3:** beats test 4 compares the recording with a run that is still being written (around `e2e/beats.e2e.js:690`);
  a test fix only.
- **F4:** beats 2c is flaky under heavy load (`e2e/beats.e2e.js:544`); it passes alone.
- **N1 (dropped, Vincent's call):** the painted "v2 · what changed" note hides while her page is open
  (`painted.css:1135`).
- **Off the stage path, minor:**
  - The doctor ignores `LIVE_FINDING=1` (`scripts/doctor.mjs:167`), while `lib/live-finding.js:20` honours it.
  - `lib/chatter.js:15` still says "at most 15 words".
  - When she takes another seat, the Product seat can chatter under the name "Product".
  - A possible race between makeCharacter and introDone (`public/room.js:1599-1601`); it was seen only when the
    script forced it.

**Not tested:**
- any real fal or Linkup call, so whether a live flux emblem really has no letters is unknown;
- the Claude-backed routes beyond the calls listed above;
- the vendor commit.

### Builder 9's build/role-card (merged as d361a1a on top of bbb49aa): PASS for the diff; N2 NOT fixed

Verified by stub only, with the proxy env and keys removed.

**What the diff does:** when she takes another seat, the teammate who holds Product shows a product card in its own
name. That's `lib/kit.js` `cardFor` plus a product card, mirrored in `public/room.js` `meetCardFor`. That teammate's
meet line is asked for as Product (`lib/meet.js` `meetSystem(wearing)`; `routes/meet.js` passes `wearing`).

**Off-stage only:** the Product path is untouched. With no worn role, `meetCardFor` returns the home card and
`askCastLine` returns early, so it makes no extra call.

**Tests:**
- `test/kit.test.js` + `test/meet.test.js`: 12/0.
- `e2e/role-card.e2e.js`: 2/0.
- anyseat: 12/0.
- reorder: 10/0.
- meet-paced: 2/0.
- `npm test`: 310 tests, 309 pass, 0 fail, 1 skipped.

**N2 is not fixed by this diff.** The meet-card "live" chips still follow the configuration, not the run's outcome:
- `lib/kit.js:85`: `liveResearchOn(idea) ? ['Linkup web search, live', …]`.
- `lib/kit.js:89`: `logoOn() ? ['The page's emblem, painted live on fal']`.

On fal, a logo timeout still leaves Mika's card having said "painted live on fal". A minimal fix is to reword the
chip as an intent ("Paints the page's emblem live on fal, if it can") or drop it.

**Greps on d361a1a:**
- `git grep -il noor` finds only the known binary `docs/screens/page-bakery-390.png`.
- The key grep finds only the test sentinels and canaries (`test/leak.test.js`, `e2e/studio.e2e.js`,
  `e2e/yoga.e2e.js`, `test/env-local.test.js`).
- No key-shaped string appears in any file the diff touches.

**Line verdict:**
- (1) Cards follow the worn role: PASS.
- (2) N2: **FAIL**. The diff doesn't touch `lib/kit.js:85,89`.
- (3) The Product stage path is unchanged: PASS.
- (4) The greps: PASS.

### d361a1a..859f330: role-card final 58a709b (N2 fix) and PO's po/final: PASS

Verified by stub only, with no fal or Linkup spend.

**(1) N2: PASS.** `git grep -n "painted live on fal\|search, live" -- lib public` on 859f330 is empty. The chips now
state intent:
- `lib/kit.js:89`: "Paints the page's emblem live on fal".
- `lib/kit.js:33,85`: "Looks for a live finding with Linkup", next to "Prepared finding if nothing verifies
  (labelled)".

**(2) Theo's flex card and the Engineering pill: PASS, with no regression on the Product stage path.**
- The flex card (`public/room.js` `meetCardFor`) applies only when `BYOC.cast.roles[seat] === 'flex'`, and the cast is
  null on the Product path (`room.js:294-297`).
- The pill copy (`public/app-button.js` `appCopy`) changes only when her craft is engineering. The Product path keeps
  "Bo is on it" and "Press → and Bo builds the page".
- `public/qr-live-site-card.png` and `public/qr-live-site.svg` are still on main after the merge. The branch had been
  behind main, so its diff against main showed them as deleted.
- Tests on 859f330:
  - `npm test`: 312 tests, 311 pass, 0 fail, 1 skipped.
  - role-card 3/0, anyseat 12/0, reorder 10/0, app 2/0, app-first 3/0, meet-paced 2/0.
  - beats 1–2f: 11/0 painted and 11/0 plain.

**(3) The PO's text against item 15: PASS, with 2 TBDs Vincent fills.**
- (a) `npm run local` (README:122; SUBMISSION:196, "open the address it prints (port 3000–3010)").
- (b) Playwright for e2e (README:125; SUBMISSION:196-197).
- (c) "one of each per phone" (SUBMISSION:111).
- (d) "its 13-test acceptance suite" (SUBMISSION:140).
- (f) The loopback line: "The room listens on this machine only (loopback); `HOST=0.0.0.0` opens it to the network
  on purpose" (README:125-126).
- (e) The demo video TBD is resolved ("There is no demo video: we present live", SUBMISSION:4). Still TBD:
  SUBMISSION:170 (the full-run time, Vincent's own timed run) and :195 (the repo URL).
- The claims "Open the app shows a QR card for The Usual" (README:28; SUBMISSION:109) match item 12's card. Any seat
  is described as taking "the seat of your craft"; "every seat polished" is listed as next (SUBMISSION:182), which
  matches the code.
- README:117 still says "There is nothing to install", but the Playwright line follows at :125, so that's fine.

### design/qr-inline (859f330..64a9623): PASS

Verified by stub only.

**What changed:** with the live deploy, "Open the app" calls `showQr()` and returns before `window.open`
(`public/app-button.js`). The gate (`gated()`) is the same exact-URL check as before: `deployUrl` with trailing
slashes stripped, compared to `QR_URL`.

**Tests:**
- `e2e/qr-card.e2e.js` 4/0. It asserts `window.__opened` is empty, there's no popup, and the page count stays the
  same when gated. Not gated, "the new tab still opens" (exactly 1 open).
- app e2e 2/0; app-first 3/0.
- `npm test`: 312 tests, 311 pass, 0 fail, 1 skipped.

**QR:** `public/qr-live-site-card.png` and `public/qr-live-site.svg` are byte-identical to bbb49aa, where they were
decoded (jsQR by me and the tech lead, OpenCV by the lead) to exactly
`https://bring-your-own-craft-production.up.railway.app`.

**Noor grep:** only the known PNG.

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
