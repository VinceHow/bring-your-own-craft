# Fallbacks and live bakery: audit results (commit 1f6e56c, 15 Nov ~05:00–05:30 UTC)

Own server: `PORT=4300 RUNS_DIR=<tmp copy of runs/rehearsal + runs/yoga> node server.js` (backend claude-code, no fal).
Playwright Chromium, deviceScaleFactor 1, JPEG. Every page was checked for pageerror/console errors and for visible
"undefined", "null", "[object" and "NaN". None of those strings appeared on any page.
Screenshots are in this folder. Note: Playwright sets `navigator.webdriver`, which makes `/` load plain (see 1b).

| # | Check | Result |
|---|---|---|
| 1a | `?look=plain` loads, opening works | **PASS, with a visual defect** |
| 1b | `/` default look vs docs | **FAIL (docs)**: RUN-LOCALLY is wrong |
| 2 | R replay (painted and plain) | **PASS** (4 min 24 s long; see notes) |
| 3 | `?setup=classic` | **PASS** |
| 4 | `?meeting=0` | **PASS**, verified by stub only |
| 5 | Fallback B route lines and doctor | **PASS** |
| 6 | Bakery clip and URL | **FAIL (clip)**: no clip exists. The URL is correct |
| e1 | Live bakery loads (desktop and phone) | **PASS** |
| e2 | `GET /admin` with no credentials returns 401 | **PASS** |
| e3 | Credit line "Built earlier by this same team" on the site | **FAIL** |
| e4 | Honesty label (demo bread) | **PASS** |

## 1a `?look=plain`: PASS, with a visual defect
- The first screen (the idea paper) shows at 1920 and 1440, and the full opening runs: idea, then name tag, meet the team, the reveal, and a run starts. The run reached the room 22 s after the idea. No page errors. One unexplained console line: "Failed to load resource: 409 (Conflict)". Nothing showed on screen.
  Evidence: `c1-plain-first-1920.jpg`, `c1-plain-first-1440.jpg`, `c1-plain-nametag-done-1440.jpg`, `c1-plain-meet-1440.jpg`, `c1-plain-room-later-1440.jpg`.
- **Defect:** in plain, the idea paper is unstyled and sits in the bottom-right corner, not centred. The textarea sits inline beside the question. Cause: `public/room.css:504` gives `.setup .big-card.nt-paper` a relative, full-width layout. `.idea-card` has no matching rule, so it keeps `.big-card`'s `position:absolute; left:470px; top:250px` (`public/room.css:328`) inside the 760 px `.setup-stage`. Painted styles it at `public/looks/painted.css:1331`. Owner: **design** (CSS), with b7 (setup).
- Minor: in the plain room, the "Noor has a question →" pill overlaps the Engineering card's title (`c1-plain-room-later-1440.jpg`). Owner: b3/design.

## 1b `/` with no look: FAIL (the docs disagree)
- Code: `public/index.html:110-113`. With no `?look`, a normal browser (`!navigator.webdriver`) gets **painted**, and the URL is rewritten to `?look=painted`. Automated browsers stay **plain**.
- Headless Playwright on `/` loaded plain (`c1-default-root-headless-webdriver-1440.jpg`). With `navigator.webdriver` spoofed to false, it loaded painted and the URL became `/?look=painted` (`c1-default-root-normal-browser-1440.jpg`).
- REHEARSAL.md ("Open / and confirm the painted room shows (not plain)") **matches the code**.
- RUN-LOCALLY.md:35 ("`/` (the studio, plain look) · `/?look=painted`") **is wrong**: `/` is painted for Vincent. It should list `/` as painted and `/?look=plain` as the fallback. Owner: **b7** (docs).

## 2 R replay: PASS
- Pressed R from the first screen, with nothing focused. The label showed for the whole run and through 26 s after the end, in both looks. Painted shows "Replay · recorded run "rehearsal" · Sun 02:49 AM". Plain shows "REPLAY …".
- Over the run: 3 asks (Noor's "Who should we build this for first?", Bo's unblock "When do orders close?", "What should this feel like for a regular?"), 3 rounds, 2 takeaways, 56 decisions, then build.done. Her page ("The Bakery · Reserve your loaf for tomorrow morning") opens full size. No page errors, and no HTTP ≥ 400.
- **Duration: 263.6 s (4 min 24 s) at speed 1**, from R to build.done. That is longer than the whole 3-minute demo.
- Focus 1's rounds play while the room is showing. The doc opens at about 84 s of recorded time, when the meeting ends, and then shows the whole conversation plus the takeaways. For about 80 s the room shows only "Noor has a question →".
  Evidence: painted 1920 `c2-replay-painted-1920-t003/t081/t161/t200/end.jpg` and `…-focus-first/-focus-u-engineering-1/-focus-feel.jpg` (the last three were taken with `&speed=4`). Plain 1440 `c2-replay-plain-1440-t003/t041/t120/t161/t201/t241/end.jpg`.
- Minor: the painted inbox counter reads "1 decisions" (`c2-replay-painted-1920-t081.jpg`). The label is a static CSS `content: 'decisions'` at `public/looks/painted-fixes.css:244`. Owner: **design**.

## 3 `?setup=classic`: PASS
- The order is name tag, then the team, then her idea, asked at the reveal ("What's the idea? / Write the idea"). `BYOC.setupOrder === 'classic'`. Tested in painted at 1920 and plain at 1440, with no errors.
  Evidence: `c3-classic-painted-1920-first.jpg`, `-team.jpg`, `-reveal-idea.jpg`, `c3-classic-plain-1440-first.jpg`, `-reveal-idea.jpg`.

## 4 `?meeting=0`: PASS (verified by stub only)
- Code: `public/focus-doc.js:81` (`MEETING = meeting !== '0'`). With `meeting=0`:
  - the help line drops "· End meeting for the takeaways" (line 83);
  - End meeting stays hidden (line 94);
  - Send posts once to `/answer`, not `/round`, and hides the form (lines 557-575).
- Stubbed as in e2e/focus-ack: route `/api/run/stub-run/**`, dispatch an ask, then `openNote`.
  - With `meeting=0`, Send posted `answer {"askId":"first","text":…}`, the form was hidden and End meeting was hidden.
  - The default (meeting on) posted `round {…}`, kept the form and showed End meeting.
  - No errors in plain or painted, at 1440 or 1920.
  Evidence: `c4-m0-plain-1440-open/after-send.jpg`, `c4-m0-painted-1440-*.jpg`, `c4-m0-painted-1920-*.jpg`, and for comparison `c4-meeting-default-painted-1440-*.jpg`.

## 5 Fallback B: PASS
- `scripts/env-local.mjs:31` reads `ENV_LOCAL_FILE`, or else `<repo>/.env.local`. I used `ENV_LOCAL_FILE` with scratch copies that hold **dummy values only**. No `.env.local` was created in the repo; `.env.local` is gitignored (`.gitignore:10`).
- The switch was made exactly as REHEARSAL describes: `#` added before `MODEL_BACKEND=fal`, and the six `*_MODEL=sonnet` lines uncommented.
  - `npm run doctor -- --only node`, first line: `route: claude-code (company gateway: haiku roles → sonnet)`. This matches REHEARSAL word for word.
  - `npm run local` (PORT=4310), first lines: `route: claude-code (company gateway: haiku roles → sonnet)`, then `loaded 10 keys…`, `model backend: claude-code`, `Open http://localhost:4310/`. I stopped it after reading these.
  - `doctor --only claude`: PASS (Claude Code answers in 3.7 s; name-tag call on sonnet in 3.2 s).
  - `doctor --only burst` (**2c**): `A Send-shaped burst (4 calls at once, claude-code): 8.2 s wall`. That is under 10 s.
- Original file (fal on): the first line is `route: fal`. This matches.
- WARN case (fal on plus the six sonnet lines):
  - first line: `route: fal (TAG_MODEL=sonnet, …, TIDY_MODEL=sonnet)`;
  - second line: `WARN  MODEL_BACKEND=fal with TAG_MODEL, … set to sonnet: on fal the fast roles then run on sonnet and slow down. Comment out the *_MODEL lines in .env.local.`
  The doctor summary ends "(1 warning: the room still runs)". This matches REHEARSAL ("A WARN line under it").
- **Not run:** the full `npm run doctor` and `npm run local` with fal on. The full doctor POSTs to fal (whose key the proxy injects here) and to Linkup. For the fal-on files I ran only `doctor --only node`, which makes no model call, and the route function itself.
- Cosmetic: with `ENV_LOCAL_FILE`, the doctor and local scripts still print "from .env.local".

## 6 Bakery clip and URL: FAIL (clip), PASS (URL)
- **URL:** `https://bring-your-own-craft-production.up.railway.app`, in `docs/BAKERY-BRIEF.md:5`, `public/slides/numbers.json:21`, `public/slides/build.mjs:16` and the slide QR (`public/slides/data.js`). It matches.
- **Clip:** the plan for it is `docs/M2-PLAN.md:48-50`: fallback (b), "the bakery URL on screen plus a labelled clip of an order landing". POLISH.md:62 requires "the bakery clip/URL". DEMO.md, REHEARSAL.md and README.md never name a clip file. SUBMISSION.md:108 says "Demo video: **TBD**".
- **No such clip is in the repo.** `git ls-files` lists no bakery or order video. The only video files are the cast loops in `public/looks/cast/` and the studio design shots in `design/studio/shots/*.webm`; neither shows a bakery order. Owner: **lead/b7** (record it, or cut it from POLISH §7). ffprobe is available, but there was nothing to probe.

## e Live bakery (read-only: GETs only, no clicks, no forms, Playwright saw no non-GET requests)
- **e1 PASS:** `/` returns 200 and loads in 1.3 s at 1440×900 and 0.8 s at 390×844. No console or page errors.
  Evidence: `e-bakery-1440.jpg`, `e-bakery-1440-full.jpg`, `e-bakery-phone-390.jpg`, `e-bakery-phone-390-full.jpg`.
  At audit time the shelf read **Sourdough 1 left**, Seeded rye 8, Butter brioche 40. Run **Reset demo** before the talk.
- **e2 PASS:** `curl -s -o /dev/null -w '%{http_code}' …/admin` returns **401** (body: "The baker's page · Passphrase · Open").
- **e3 FAIL:** the site's credit line is exactly **"Built by Bo, the team's engineer. Polished by our builders."** in the footer `p.credit`. "Built earlier by this same team" is nowhere on the site.
  - DEMO.md:72 says "The slide **and site** carry the label 'Built earlier by this same team'". BAKERY-BRIEF.md:20 says "built earlier by this team".
  - Only the slide has it (`public/slides/index.html:78`).
  - The "Built by the team" strip (database, rules, tests) is not on the storefront either. It may be on the locked admin page, which I could not check.
  - Owner: bakery site (builder 6 per BAKERY-BRIEF; in this repo's buckets, **b7**/lead).
- **e4 PASS:** a banner at the top of every state: **"Demo bakery for a hackathon: no real bread, nothing to pay."** The lede reads "Nothing to sign up for, nothing to pay: this one only rises." The Delivered message comes from the server and was not seen, because that needs an order.

## Housekeeping
My server on 4300 has been stopped. The `npm run local` test server (4310) exited on timeout. No `.env.local` was created, and nothing was committed. Other node processes were not touched.
