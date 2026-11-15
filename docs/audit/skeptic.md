# Is the core real, or smoke and mirrors? A skeptic's read of origin/main 42c2d7c

This is read the way a skeptical judge's coding agent would read it. Code only: nothing was run and there were no fal
calls. Written by the final auditor on Sun 15 Nov, about 08:55–09:15 UTC; the key file:line claims were re-checked by
hand.

**Verdicts:**
- **REAL:** live model or code on every run.
- **STAGED:** scripted, forced or prepared for the stage path.
- **MIRROR:** looks live but isn't.

## The one thing a judge will find first

**On the default path, the three things that reach her are fixed by code, not chosen by the selector.**
- **The stage path is the default.** `public/room.js:324` sets `BYOC.stagePath = … get('path') !== 'full'`, and
  `routes/run.js:143` adds `stagePath: true` unless the client sends `path: 'full'`.
- **On the stage path the selector may bring zero.** `lib/first.js:55-57`:
  `selectorMax(run) { return isStage(evs) ? 0 : … }`.
- **All three questions are literals.**
  - Focus 1 is `question: 'Who should we build this for first?'` (`lib/first.js:96`).
  - The unblock is a constant: `STAGE_UNBLOCK_CARD = { seat: 'engineering', question: 'When do orders close?',
    suggestion: '8pm the night before', … }` (`lib/first.js:33`). It is raised on a 3.5 s timer after the Focus 1
    decisions, **for any idea** (a yoga idea is also asked "When do orders close?").
  - Focus 2 is `question: 'What should this feel like for a regular?'` (`lib/first.js:210`), "for a regular" whatever
    the idea.
- **The recorded R run shows it:** `select.done … "brought":0`.
- **What is real:** the 3-ask cap holds through the same policy door (`lib/policy.js`, `select.js askOne`). The
  selector itself is real (one scoring call, then code rules `clearsBar`/`pickAsks`), but only on `?path=full`, which
  the demo doesn't use.
- **Stale comment:** `routes/run.js:47` says "on the stage path the selector brings one focus moment"; the code brings
  none.

**The honest framing:** the demo fixes *which* three moments reach her. Everything inside them is live: the team's
replies, the takeaways, Mika's journey, the decisions they unlock, and the page fill.

## Claim by claim

| # | Claim | Verdict | Evidence | What a judge would say |
|---|---|---|---|---|
| 1 | The team decides most things | **REAL**, with labelled prepared inputs | 6 live candidate calls per run, `Promise.all(seats.map(... callModel ...))` (`lib/teammates.js:256-265`, 4 per seat). One live decide call (`lib/select.js:303-317`); a failed decide falls back to each teammate's own model-written recommendation, cited `team default`. Citations are checked by code (`checkCitation`, `select.js:279-285`). After Focus 1, one live call turns her answer into 3–6 decisions (`lib/first.js:146-160`). **Prepared:** her file's L2 is a seed line, "Ship the smallest version… (prepared for the demo)" (`data/taste.seed.md:3`; `lib/taste.js:41-42` puts her sentence in as L1). The research finding is a JSON file. The fallback sketch is prepared and marked `prepared: true` (`lib/sketch.js:68,141-147`). | Real decisions from real calls. Most "from her file" cites point at a line prepared before the demo. |
| 2 | Only the big questions reach her | **STAGED** on the default path; **REAL** on `?path=full` | See the top of this file. Off stage, one scoring call, then `clearsBar` (big≥2, hers≥2, not granular, showable, in her domain; `select.js:159-161`) and `pickAsks` (`:179-243`). | The selector is real, but the demo doesn't use it. |
| 3 | The meetings (live replies, takeaways) | **REAL** | Who replies is a **keyword heuristic in code**, not a model or round-robin (`lib/thread.js:97-126`). Each reply is a live call that gets her words, the thread so far and that teammate's own candidates (`thread.js:247-293`). A failed reply is silence (`chime.error`), with no canned line (`:296-299`). Takeaways are one live call at End meeting (`lib/interpret.js:136-146`); a failure gives a 502, with no canned text. | The talk is genuinely live. The routing is a heuristic, which is fine if we say so. |
| 4 | The tidy | **REAL**, with a strict guard | One live haiku call with a 6 s limit (`lib/tidy.js:18-19,144-147`). `checkTidy`/`keepsHerWords` refuse any new word (except a/an/the/and) and any lost negation (`:45-71`). Slow or refused, her raw words stand (`:139,148`). There is no client-side fake: `public/voice.js:202-212` only POSTs `/api/tidy`. | Honest. |
| 5 | The build | **REAL fill into fixed templates**: not code generation | One sonnet call returns slot JSON, which is schema-checked; "The model never writes HTML" (`lib/fill.js:1-3,271-274`). **3 hand-built templates** (bakery, cafe, yoga). The model controls words, switch booleans, step order and which decided items show; markup, CSS, JS and photos are fixed. **Code overrides model switches:** `phone` is forced off (`fill.js:131`), regex rules run over decided items (`applyChoices`, `:56-92`), and `herLines()` (`:106-120`) sets email/quantity/regularsFirst from regexes on **her own answer text** (deterministic, tuned to the demo lines). **Template pick:** `pickTemplate` (`fill.js:24-27`) sends bake/bread → bakery, café/pastry/coffee → cafe, and **everything else → yoga**, so a dog-walking idea gets a yoga booking page. The DIY seat refuses with 409 instead (`routes/build.js:135`). `templateFor` (`lib/tag.js`) and `pickTemplate` disagree on bakery ideas. | Live words in a prepared page. "Any idea" really means "3 page shapes". |
| 6 | The live logo | **Not live, and not claimed on the page** | No image generation anywhere in `lib/ routes/ public/ templates/`; the only fal URL is the chat router (`lib/model.js:134`). Her page's "logo" is a CSS mark, `<span class="mark" data-mark="dots">` (`templates/bakery/index.html:94`). The flux images were made ahead for the Railway site (`design/FAL-SPEND.md:19`). DEMO.md:71's "the logo Mika made" isn't backed by the page. | No live logo. Fine, as long as nobody says there is one. |
| 7 | Live research | **STAGED** (prepared, and labelled) | Nothing in `lib/` or `routes/` calls Linkup (only `lib/kit.js` names it). Every run reads `data/research-finding-bakery.json` (`lib/teammates.js:111-143`), shown only when `isVerified` passes. On screen it's labelled "researched before the demo" (`public/focus-doc.js:226`, `public/fd-cards.js:15`). **Two blurs:** the meet card lists "Linkup finding" under **Loaded with** (`lib/kit.js:31-32`), the "live" list (`kit.js:1,50`), though its own "Made with" line says "before the demo". The doctor's hint, "Research falls back to its prepared finding without it" (`scripts/doctor.mjs:164`), implies a live path that doesn't exist. | One cached, sourced finding, labelled fairly on screen, a little blurred on the card. |
| 8 | The chatter | **REAL** content in fixed frames | "written by code from real run events (no model)" (`lib/chatter.js:1`). The frames are `${by}: found a source on ${title}.` and `${by}: ${choice}.` (`:25-26`). Joint-discussion lines are live model turns (`lib/joint.js:165`). The status strip uses fixed verbs ("picturing", "weighing", "talking it through with the team", `public/looks/painted.js:175-187`). The unblock ack is a template: `` `Got it: ${choice}. Carrying on.` `` (`lib/unblock.js:45`). | Genuine, and tied to logged events. |
| 9 | The R replay | **REAL recording**, labelled throughout | `runs/rehearsal/RECORDED.json`: from `run-…02-49-17-034Z-vf5r`, 188 events, 3 asks, built. `scripts/record-run.mjs` only copies a finished run's folder. The events carry model timings, a real `joint.error` and `build.done` ms. The label "Replay · recorded run …" is on screen the whole time (`public/replay.js:24-26`; the close adds `· REPLAY`). Her side of the replay is scripted driver text (the same lines as the e2e specs). | Honest recording, honestly labelled. |
| 10 | The bakery site | **Real deployed app, but its source is not in this repo** | `deploy/` holds only `ACCEPTANCE.md` and an HTTP-only acceptance suite. `deploy/app/` and `deploy/make-images.mjs` are **cited in SUBMISSION.md:81,86 but exist in no commit on any branch** (`git log --all -- deploy/app` is empty). There's no committed Bo run log or diff for "Bo's agent wrote it". "Delivered" is demo-only, under the banner "Demo bakery for a hackathon: no real bread, nothing to pay." The site's credit reads "Built by Bo, the team's engineer. Polished by our builders." | Can't verify "built by the same team" from the submission. |

**Sponsors, as the code stands:**
- **Claude:** live, every call through `callModel`.
- **ElevenLabs:** live speech-to-text (`routes/voice.js`).
- **fal:** live only for the chat router; the images, clips and music were made ahead.
- **Linkup:** used before the demo only.
- **Figma:** prepared frames only. The README says so.

## README / SUBMISSION sentences a skeptic would call overclaiming

| Quote | File:line | Why | Honest rewrite |
|---|---|---|---|
| "…brings her only the big questions that need her craft. In our audited run she was asked 3 things…" | README.md:17-19 | On the default path the three are fixed in code; the selector brings 0 (`lib/first.js:33,55-57,96,210`). | "On the demo path we set which three moments reach her (who it's for, the cut-off, how it should feel); what the team says and decides around them is live. Off the demo path a selector picks up to three." |
| "The team decided 14 others itself, her way." | README.md:20 | 14 counts decisions citing a line of her file (`public/close.js:76`), not all decisions. Several of those lines are prepared seed lines (`data/taste.seed.md`). | "…and made 14 decisions that cite her file (others on its own defaults)." |
| "a real bakery site this same team built earlier" | README.md:22-23 | The app's source isn't in the repo; only black-box tests are. | "…a live bakery site Bo's agent drafted earlier and our builders finished; its source is deployed separately, its acceptance tests are in `deploy/`." |
| "A question reaches her only if it changes the shape of the product…" | README.md:27-28 | That bar applies only off the stage path. | Add: "(off the demo path; on stage the three moments are fixed)." |
| "only the teammates her words touch reply, building on her and on each other" | README.md:32-33 | Who replies is a keyword heuristic (`lib/thread.js:97-126`); in the recorded run each round had one reply. | "…one or two teammates, picked by which crafts her words touch, reply live." |
| "Every number on screen is counted from the run's own log." | README.md:36 | The baseline 0/24/20 is a hand count (`docs/baseline/`). | "Every number about her run is counted from its log; the baseline's numbers are a hand count, linked." |
| "Anything made ahead says so on screen" | README.md:36-37; SUBMISSION.md:89 | Her page's logo mark is unlabelled template art, and "Linkup finding" sits under "Loaded with" (`lib/kit.js:31`). | Keep, but move the Linkup item to "Made with", or say "Anything made ahead is labelled where it is shown as hers." |
| "Models run through Claude Code headless…" vs "The demo's chat runs on Claude through fal" | SUBMISSION.md:64-65 vs README.md:65 | They contradict each other. The code default is claude-code (`lib/model.js:12`); the demo sets `MODEL_BACKEND=fal`. | "Every call goes through one function, on fal (the demo) or headless Claude Code." |
| "Bo's blocked: when do orders close? We suggest 8pm the night before." | SUBMISSION.md:42-43 | A constant (`lib/first.js:33`), raised for any idea. | "A scripted unblock card (Bo, the order cut-off), fixed for the demo; her answer is decided and logged like any other." |
| "Every line traces to her or her team." | SUBMISSION.md:53 | The page is a fill of 1 of 3 prepared templates (`lib/fill.js:24-27`); its structure and default copy aren't from the run. | "Every filled slot traces to her or her team; the layout is a prepared template." |
| "That bakery was built earlier by the same team of agents… Real software with a real database, rules and tests" | SUBMISSION.md:57-60 | No source in the repo. | "…drafted by Bo's agent and finished by our builders to pass the acceptance suite in `deploy/ACCEPTANCE.md`; the app itself is deployed separately." |
| "The live bakery (`deploy/app/`)…" and "(`deploy/make-images.mjs`…)" | SUBMISSION.md:81, 86 | **Neither path exists in any commit.** | Remove the paths, or commit the app and the script. |
| "One spoken sentence to a working ordering page" | SUBMISSION.md:110 | Her page is a filled static template; the working app is the separate Railway site. | "…to her own ordering page, filled live into a prepared template." |
| "Her team: 3 asked, 14 decided…, 0 approvals" (vs the default agent's 0/24/20) | SUBMISSION.md:114 | "3 asked" is set by the stage script, not measured; "14" counts only profile-cited decisions. | "Her team (demo path, three set moments): 3 asked, 14 decisions citing her file." |
| "Research cites a real, sourced finding." | SUBMISSION.md:69 | True, but it is one prepared JSON entry; there's no live search. | "Research cites one real, sourced finding, prepared before the demo." |
| Self-reported process ("up to eight builder agents… every change reviewed by an agent that didn't write it"); "fal… about 1 s vs Claude Code over 25 s" | README.md:88-91; SUBMISSION.md:78-80, 90-92 | "Every" can't be shown from the repo; the timings are self-reported. | "…each merge got an independent agent review (DECISIONS.md, AUDIT.md)"; "in our tests (DECISIONS.md)". |
| TBD items (timed run, repo URL, demo video) | SUBMISSION.md:111, 136-137 | Must be filled in or removed before submitting. | — |

**Also a skeptic will notice (not overclaims, but code to know about):**
- `herLines()` forces page switches from regexes on her answer, so "the page follows her line" is guaranteed by code.
  That's defensible, but say so.
- Any idea outside bakery or café becomes a yoga page.
- The doctor's Linkup hint implies a live path that doesn't exist.

## Bottom line for the lead
- **Real:** the team's candidates and decisions, the meeting replies and takeaways, the tidy, the page fill (into 3
  templates), the chatter's content, the R recording, and the 3-ask cap.
- **Staged:** which three questions reach her on stage, the unblock card itself, and the research finding (labelled).
- **Not in the repo:** the bakery app's source and its image script.
- **A mirror only through wording:** none of it is fake in code. The README and SUBMISSION sentences above make the
  stage script sound like the selector's judgement, and point at files that don't exist. Fix the wording, and the
  rest stands up to a skeptic.
