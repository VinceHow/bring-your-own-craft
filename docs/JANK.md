# Jank

## [design] findings: painted look (`?look=painted`)

Found by `scripts/design-qa.mjs`, which walks the whole painted flow and checks it by eye against `design/studio/QA.md`. Nothing here is fixed by QA. The fixer picks findings up.

Each finding lists the shot (repo-relative), the size and mode, the component hook, and a one-line fix suggestion. Shots are in `design/studio/qa/<stamp>/<size>-<mode>/<state>.jpg`. Only the shots cited here are committed; the walk writes all of them (about 200 per pass), plus `index.html` (a contact sheet) and `report.md`. The committed `findings.json` holds the automatic flags behind these findings.

States are reached from:
- the recorded rehearsal run;
- the fake fixture;
- stubbed sample events, the same ones `/gallery` and `e2e/beats` use.

No model calls and no fal spend.

<!-- PASS-1 -->
### Pass 1 · main 6008ee6 · 14 Nov 23:36 UTC

1. [design] **Seat panels open off the screen.** Bo's full pad runs past the bottom of the room: the last item ("Time zone") is cut in half, with no scroll, and the Fake run label sits on it. Mika's panel sits on the time-of-day pill at top left. Ines's and Bo's panels touch the right edge.
   - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-day/07-engineering-full.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/07-design-full.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/07-strategy-empty.jpg`
   - Where: 1920x1130 day
   - Hook: `[data-component="sketchpad-open"]` (`#room-panel`)
   - Fix: keep the panel inside the room's safe box (top ≥ the pills, bottom ≥ 24px above the labels), with `max-height` and a quiet scroll on `[data-slot="body"]`.
2. [design] **Her focus documents have browser-default parts.**
   - "Add this" is a grey ButtonFace button, wrapped onto two lines.
   - The source link is default blue and underlined, and runs into the site with no space ("…every weekBakery Business").
   - Focus 2's steps run the time into the text ("7:05Sam leaves for work").
   - The mic pill floats loose against the field's edge.
   - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-day/09-focus1.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/09-focus1-typed.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/10-focus2.jpg`
   - Where: 1920x1130 day
   - Hooks: `[data-component="focus-doc"] [data-slot="add-piece"]`, the finding's `a` source link, the `journey-words` step
   - Fix: style `add-piece` as the ink pill `send` uses (and `white-space: nowrap`); ink-coloured link with a dot or gap before the site; a gap after the time; sit the mic inside the field's row.
3. [design] **The focus document is mostly empty paper.** The work and the question take the top 40%, and the bottom half is blank. At first open the document is half width, with the right half empty, and full width once she types. That layout jump is worth checking by eye.
   - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-day/09-focus1.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/10-focus2.jpg`
   - Where: 1920x1130 day
   - Hook: `[data-component="focus-doc"][data-state="asking"]`
   - Fix: centre the column vertically, or size the paper to its content, and keep one width from open to answer.
4. [design] **The unblock card's "Yes" leaves a blank drawer.** After Yes, "Needs you" is an empty paper column. The header still says "Bo's blocked · When do orders close?" and nothing confirms what she told Bo.
   - Shot: `design/studio/qa/2026-11-14-23-36/1920x1130-day/11-unblock-yes.jpg`
   - Where: 1920x1130 day
   - Hooks: `[data-component="inbox"][data-state="expanded"]`, `[data-component="inbox-action"][data-state="yes"]`
   - Fix: keep the answered card for a beat as a one-line receipt ("Told Bo: 8pm the night before"), then the "Nothing needs you right now" line. Collapse the drawer to its content height.
5. [design] **The inbox drawer has browser defaults.**
   - "Next" has a native ▶ disclosure marker.
   - The owner-task steps are native checkboxes.
   - The task title is weight 700 (the taste rule is 400/500).
   - Shot: `design/studio/qa/2026-11-14-23-36/1920x1130-day/08-drawer.jpg`
   - Where: 1920x1130 day
   - Hooks: `[data-component="inbox"] [data-slot="drawer"]`, `[data-component="owner-task"] [data-slot="tick"]`, `[data-slot="title"]`
   - Fix: `summary { list-style: none }` with an ink chevron; draw `tick` as a rounded ink box (`appearance: none`); title at weight 500.
6. [design] **The collapsed inbox item clips its question.** "Full classes: waitlist or "full"?" is cut at the card's right edge, with no ellipsis.
   - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-day/12-decision-open.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/08-new.jpg`
   - Where: 1920x1130 day
   - Hook: `[data-component="inbox-item"] [data-slot="text"]`
   - Fix: wrap onto two lines, or `text-overflow: ellipsis`, with a right padding of at least 16px.
7. [design] **The idea sheet clips the journey.** Opened large, the journey row runs off the paper's right edge ("Pick u…"), with no wrap or scroll, and the lower half of the sheet is empty. At a glance, the chips are cut at the sheet's edge ("boo…").
   - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-day/05.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/04.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/06.jpg`
   - Where: 1920x1130 day
   - Hooks: `[data-component="idea-sheet"][data-open="true"] [data-component="journey"]`, and at a glance `[data-component="journey"] [data-slot="box"]`
   - Fix: wrap the journey onto two rows (or scale it to fit) when it's wider than the sheet; at a glance, show only the chips that fit, plus "+3".
8. [design] **Meeting the team is a bare card on a blank page.** The painting is gone, the face circle is empty, and the card has square corners (TASTE: none). About 80% of the screen is flat beige.
   - Shot: `design/studio/qa/2026-11-14-23-36/1920x1130-day/02.jpg`
   - Where: 1920x1130 day
   - Hook: `[data-component="meet-card"]` (`[data-slot="face"]`)
   - Fix: keep the blurred painting behind it as on the name tag, round the corners like the name tag paper, and fill `face` with the teammate's rest crop from `looks/cast/living/rest-<who>.jpg` until the art lands.
9. [design] **Her empty workspace is a huge panel with four short lines.** About 75% of the room holds "Not said yet", "Nothing agreed yet" and "None yet".
   - Shot: `design/studio/qa/2026-11-14-23-36/1920x1130-day/07-hers-empty.jpg`
   - Where: 1920x1130 day
   - Hook: `[data-component="workspace"]`
   - Fix: size the panel to its content, or show the empty workspace as one short line ("Your workspace fills as the team works").
10. [design] **Empty teammate pads are small floating boxes.** "Nothing on the pad yet." sits in a box with nothing tying it to its seat.
    - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-day/07-research-empty.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/07-data-empty.jpg`
    - Where: 1920x1130 day
    - Hook: `[data-component="sketchpad-open"]`
    - Fix: anchor the panel to the seat it opened from (a tail, or open beside the name pill), and say what's coming: "Theo hasn't started yet. Their calls land here."
11. [design] **The close's judge box is mostly empty.** The label and field start halfway across the paper; the left half and the lower two thirds are blank.
    - Shot: `design/studio/qa/2026-11-14-23-36/1920x1130-day/14-close.jpg`
    - Where: 1920x1130 day
    - Hook: `[data-component="close-view"][data-state="asking"]`
    - Fix: one column, left-aligned, with the paper sized to the field (or a short line under the field saying what happens next).
12. [design] **Replay and Fake run labels use weight 600.** The taste rule is 400/500.
    - Where: every shot
    - Hooks: `[data-component="replay-label"]` and `[data-component="focus-doc"] [data-slot="send"]`
    - Fix: weight 500.
13. [design] **The team-space decision card, opened, covers the idea sheet.** The open card lands on top of the idea sheet's chips.
    - Shot: `design/studio/qa/2026-11-14-23-36/1920x1130-day/12-decision-open.jpg`
    - Where: 1920x1130 day
    - Hook: `[data-component="decision-card"][data-state="open"]`
    - Fix: open it upward, or as a panel like the pads, so it never overlaps the sheet.
14. [design] **The team-status button looks like a browser default.** "Open it" and "Retry" are grey ButtonFace buttons.
    - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-day/09-focus1.jpg` (room before open, from the trial run), `design/studio/qa/2026-11-14-23-36/1920x1130-day/08-collapsed.jpg`
    - Where: 1920x1130 day
    - Hook: `[data-component="team-status"] [data-slot="open"]`, `[data-slot="retry"]`
    - Fix: the same ink text-link style as "Open your inbox".
15. [break, not design] **`/slides/` returns 404 on this server.** Only `/slides/index.html` serves.
    - Shot: `design/studio/qa/2026-11-14-23-36/1920x1130-day/15-slides.jpg`, which is the index.html shot
    - Fix: serve the directory index for `/slides/` in `server.js`.
16. [design] **At night, the name tag and meeting the team stay in daylight.** Behind them is the bright, blurred day painting on beige, while the room behind is the night painting. (TASTE says night should be really night.)
    - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-night/01.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-night/02.jpg`
    - Where: 1920x1130 night
    - Hooks: `[data-component="setup"]`, `[data-component="character-card"]`, `[data-component="meet-card"]`
    - Fix: under `#room[data-time="night"]` (or `?night=1`), use `looks/cast/living/painting-night.jpg` blurred behind the setup, and a dusk paper tone.
17. [design] **The room leaves 25px dark bands at the top and bottom on Vincent's Mac.** The room is 16:9, so at 1920x1130 it scales to 1920x1080, leaving a band above and below. Seen in every room shot, and flagged automatically by the extras pass.
    - Where: 1920x1130 day and night
    - Hook: `#room` inside `#viewport`
    - Fix: for the painted look, scale to cover (`max(w/1600, h/900)`) and crop the painting's edges, keeping the edge UI inside a safe box. The stool, the table and all five faces are well inside at 1080/1130 (crops in `extras/art-*.jpg`).
18. [design] **The day/night pill and the painting disagree.** At `?night=1`, clicking the pill makes it say "Afternoon · tap for night", but 6 s later the painting is still the rainy night scene with the lamp lit, and only the characters are graded lighter. In day mode the pill says "Afternoon" while `#room[data-scene]` is `morning`.
    - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-night/extras/toggled-time.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/extras/toggled-time.jpg`
    - Where: 1920x1130 night, then day
    - Hooks: the pill (`button[aria-label^="Switch to"]`, which has no data-component yet), `#room[data-scene]`, `iframe.painted-living`
    - Fix: the pill's label should read from `#room[data-scene]` (Morning / Building / Evening / Night). On toggle, `studio:time` must swap the scene video as well as the grade; check `living.setTime` from night to afternoon.
19. [design] **The string lights give no readable reaction to a click.** All 10 frames are identical, day and night. The cat (stretch + hearts), the coffee (steam) and the record player (track pill + notes) react clearly, and none of them shakes or wobbles across the frames.
    - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-*/extras/toy-lights-*.jpg` (cat, coffee and record strips beside them)
    - Where: 1920x1130 day and night
    - Hook: `button[data-spot="lights"]`
    - Fix: make the toggle visible: bulbs brighten with a soft 300 ms fade in the day, and dim at night.
20. [design] **Art at 1:1 is clean.** No extra limbs or paws, and no broken hands or faces, on Mika, Wren, Theo, Ines, Bo, the cat, the coffee machine or the record player, day or night. One small thing: the idea sheet's paper covers Bo's hand on the laptop.
    - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-*/extras/art-*.jpg`
    - Where: 1920x1130 day and night
    - Hook: `[data-component="idea-sheet"]`
    - Fix: optional; nudge the sheet about 40px left or down so Bo's hand shows.
21. [not on main yet] `[data-component="app-button"]` and the custom cursor are not on this build. The walk checks for them and will shoot their states once they land.
22. [content, for builder 7, reported by the lead] **On the rehearsal replay, the focus doc's labels run together.** Journey step labels carry a stray digit ("Browse breads1", "Choose pickup time2"), and the teammate name is glued onto its line ("WrenWarm bread…", "MikaWren, I'd lead…"). Seen at about 45–60 s into the replay on main. This is the same missing-separator pattern as finding 2's "7:05Sam" and "weekBakery Business".
    - Hooks: `[data-component="focus-doc"] [data-slot="work"]` (the journey boxes with their pin count), `[data-component="pin-reply"] [data-slot="who"]`
    - Fix: put a space or separator (" · ", or a block-level `who`) between name and text, and keep the pin count (`[data-slot="count"]`) visually apart from the box label.
23. [design] **Scrollbars a Mac will show.** These were measured, not seen: headless Chromium hides overlay scrollbars.
    - Bo's full pad: `[data-component="sketchpad-open"]`, content 434x549 in 420x400 → a vertical and a horizontal bar.
    - Her full workspace: `[data-component="workspace"]`, 1438x821 in 1420x796 → both bars.
    - The inbox drawer: `[data-component="inbox"] [data-slot="drawer"]`, 292 wide in 268 → a horizontal bar on every drawer state. Its text also sits 0px from the drawer's left edge ("Needs you").
    - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-day/07-engineering-full.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/07-hers-full.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/08-drawer.jpg`, `design/studio/qa/2026-11-14-23-36/1920x1130-day/11-unblock-yes.jpg`
    - Where: 1920x1130 day; the same CSS applies at every size
    - Fix: `overflow-x: hidden` (or remove the 14–24px of extra width: a child with `width:100%` plus padding or margin); vertical overflow scrolls inside the body with `scrollbar-width: thin` and a painted fade; give the drawer an inner padding of at least 16px.
24. [design] **Painted frames clipped by 2px.** The `::before` paper frame sits 2px outside its box and is cut by the element's own `overflow: hidden/auto`, so one edge of the hand-drawn frame is shaved. This was measured: check one by eye at 200%.
    - Hooks: `[data-component="idea-sheet"]` (every state), `[data-component="idea-layer"]`, `[data-component="focus-doc"]` and its `[data-slot="work"]`, `[data-component="sketchpad-open"]`, `[data-component="workspace"]`
    - Where: 1920x1130 day; the same CSS applies at every size
    - Fix: draw the frame inside (`inset: 0`), or move `overflow` to an inner body wrapper so the root can show its frame.
25. [design] **On smaller laptops, text drops under 13px and the labels hang off the room.** At 1440x900 the room scales to 0.9, and at 1280x800 to 0.8, so every 13px label renders at 10–12px: 344 small-text flags at 1440 and 936 at 1280, against none at 1920. At both sizes the room leaves 45px dark bands (40px at 1280), and the Replay / Fake run label hangs below the room into the band, over the inbox and Bo's pad. At 1280 the inbox drawer reaches the window's bottom edge.
    - Shots: `design/studio/qa/2026-11-14-23-36/1440x900-day/03.jpg`, `design/studio/qa/2026-11-14-23-36/1280x800-day/03.jpg`, `design/studio/qa/2026-11-14-23-36/1280x800-day/07-engineering-full.jpg`, `design/studio/qa/2026-11-14-23-36/1280x800-day/11-unblock-asking.jpg`, `design/studio/qa/2026-11-14-23-36/1280x800-night/03.jpg`
    - Where: 1440x900 and 1280x800, day and night
    - Hooks: `[data-component="replay-label"]`, `[data-component="inbox"]`, and all room text
    - Fix: the cover scale from finding 17 also fixes the bands. Keep the labels inside the room's safe box; set a floor of `font-size: max(13px, …)` (or `calc(13px / var(--scale))`) on the painted look's small labels.
26. [checked, clean] **No contrast below 4.5 on paper, at any size, day or night.** The only machine flags were false positives: text on the slides' textured cards and on the yellow replay label, where the check can't see the background image. Text that sits straight on the painting is always on a paper pill (checked by eye).

## [build] findings: builder 7 sweep (painted, real run and R)

Builder 7, Sat night into Sun. Overlaps with the [design] list above: #7 = design 7, #12 = design 2, #11 = design 1. **Sweep 1** ran on main 6c1df0f / 6008ee6 with `?look=painted`, at 1440×900, 1280×800 and
1920×1130 (deviceScaleFactor 1). It covered one real run (claude-code backend) and one R replay of `runs/rehearsal`.
Screenshots are in `docs/jank/`, with the full set in the sweep's scratch folder. Owners: **DESIGN** (looks: placement,
styling) and **BUILD** (behaviour or copy). Skipped as owned elsewhere: empty sketchpads and the workspace's "Not said
yet" (b1), and Focus 1 and the phone rule (b3).

Status key: **fixed** (pushed on `build/questions`, real e2e attached on handover) · **sent** (with the design
studio) · **open**.

| # | What | Where (component · state) | Screenshot | Size | Owner | Status |
|---|---|---|---|---|---|---|
| 1 | **P0.** On painted she could not type her idea: `painted.css` hid `#her-form` (her input, the mic, Team go). Nothing was focused after the reveal, so typing the idea fired the shortcuts (S toggled stage mode, R started the replay). | `her-idea` · asking | `jank/idea-sheet-no-input-1440.jpg` → `jank/idea-sheet-input-fixed-1440.jpg` | all | BUILD (in a look) | **fixed** (c8e91a9 and design/painted-form 2b0a228, both on main): shown while the room asks, focused; e2e checks it |
| 2 | **P0.** The name tag could block her for 25 s when the tag call was slow (Vincent's Mac). | `character-card` · thinking | `jank/nametag-before-1440.jpg` → `jank/nametag-after-1440.jpg` | all | BUILD | **fixed** c8e91a9: rough card at once (`data-state="rough"`), filled in place; flat schema |
| 3 | Chatter says the speaker twice: "Wren: Wren: guaranteed up to…". The log line already starts with the name. | `chatter-line` · in | `jank/chatter-name-twice-1440.jpg` | all | BUILD | **fixed** c8e91a9 (client strips it, so old recordings read right too) |
| 4 | A pin's reply reads "WrenYou're right…", and the source reads "…every weekBakery Business". | `pin-reply` · shown; finding `source` | `jank/focus-doc-unstyled-1440.jpg` | all | BUILD | **fixed** c4a8139 (a space between the slots) |
| 5 | The rough journey never shows on the table in painted. Once a question arrives, the team-status line ("Wren has a question for you → Open it") takes the journey's place in the clipped glance card (160 px). | `her-sheet` glance · `team-status` · question | `jank/team-status-hides-journey-1280.jpg` | all | DESIGN | sent |
| 6 | The team-status "Open it" button and Retry are browser-default grey buttons in painted. | `team-status` · question/failed | same | all | DESIGN | sent |
| 7 | The journey pills in the glance card are cut mid-word ("Choo…", "Chec"). | `her-sheet` glance · flow | `jank/idea-pills-clipped-1440.jpg` | all | DESIGN | sent |
| 8 | Team-space cards stack over Bo's body and the right-hand plant at 1920×1130 and 1440×900. | `team-space` · cards | `jank/team-space-over-bo-1920.jpg` | 1440, 1920 | DESIGN | sent |
| 9 | Meet the team in painted: a plain card with an empty avatar circle and no character. | `meet-card` | `jank/meet-card-empty-avatar-1440.jpg` | all | DESIGN | sent |
| 10 | While Mika and Wren draw the first sketch, nothing in the painted room shows that anyone is working (the `thinking` state is invisible on the pills). | `place-card` · thinking | `jank/no-thinking-sign-1920.jpg` | all | DESIGN | sent |
| 11 | The sketchpad panel covers the Afternoon/night pill (top left). | `sketchpad-open` | `jank/sketchpad-over-pill-1440.jpg` | 1440, 1280 | DESIGN | sent |
| 12 | Focus document in painted: the pins and pin replies are unstyled (a bare "1" with the text under it), "Read the conversation" and "Add this" are default buttons, and the source link is default blue. | `focus-doc` · replying/takeaways; `pin`; `fd-read` | `jank/focus-doc-unstyled-1440.jpg` | all | DESIGN | sent |
| 13 | R replays `runs/rehearsal`, recorded at 18:53: it has no unblock and no Focus 2, so the replay no longer matches the demo. At the end of the replay, her page did not appear in the shot. | `replay-label`; `page-sheet` | `jank/replay-end-no-page-1440.jpg` | all | BUILD | page: **fixed** (build.done opens the sheet her page lives on; painted kept it small, so the page never showed; e2e/page.e2e.js). Rehearsal: b3's new bakery recording (all three moments) is on main 5d48c19; re-check R in the re-sweep; re-record once, on fal, after painted is the default |
| 14 | "Nothing needs you right now · Open your inbox" sits on the rug from the reveal on, before anything has happened. | `inbox` · collapsed, empty | `jank/no-thinking-sign-1920.jpg` | all | BUILD (copy) | open, low |
| 16 | A replay asks the live server for the original run's sketches (`/api/run/run-…-y22q/sketches`, a 404 in the console). | `replay` | — | all | BUILD | **fixed**: a replay asks for its recording's own sketches (`/api/run/<recording>/sketches`, cached) |
| 15 | On load nothing is focused, so typing before clicking the name tag fires the shortcuts (R, S, B…). The name is prefilled "Priya". Kept on purpose: autofocusing her field would swallow R at the start, the demo's fallback. The presenter clicks her field first. | `character-card` · asking | — | all | BUILD | won't fix: "click her name field first" goes in docs/REHEARSAL.md (lead's call) |

### Sweep 1b · one real run on fal (`MODEL_BACKEND=fal`), painted, build/questions 48d8f09 + main 23efe3a, 00:12 Sun

Whole flow, no model failures: Focus 1 asked at 42 s, then the unblock and Focus 2 (first, u-engineering-1, feel),
team done 194 s, her page 231 s. Her idea input is focused after the reveal and typed for real (fix #1 holds).

| # | What | Where (component · state) | Screenshot | Size | Owner | Status |
|---|---|---|---|---|---|---|
| 17 | The meter read "0 decisions came up · 3 brought to you" when the team started: the three asks are raised before any candidate, and came up counted candidates only. | `tally` · counter | `jank/meter-0-came-3-brought-1440.jpg` | all | BUILD | **fixed**: came = candidates + asks raised without one (lib/tally.js and the client tally; test) |
| 18 | Team-space cards (Ines, Mika) sit on the idea sheet from Focus 1 to the end: they cover the journey pills and the team-status line ("The team has done its fir…"). | `team-space` · cards over `her-sheet` | `jank/ts-over-idea-sheet-1440.jpg` | 1440, 1280 | DESIGN | sent |
| 19 | A pin reply shows "Wren" with the ":" on its own line. | `pin-reply` · shown, `who` slot | `jank/pin-who-colon-1440.jpg` | all | DESIGN | sent |
| 20 | Focus 2's takeaways panel shows its labels and Keep with no text while the team reads (an empty box). | `focus-doc` · replying, `fd-brief` | `jank/takeaways-empty-box-1440.jpg` | all | DESIGN (b-polish's reading state) | sent |
| 21 | The live step ("The team is choosing what to bring you · taking a while · R replays the rehearsal") is cut by the frame's bottom edge. | `live-step` | `jank/live-step-clipped-1440.jpg` | 1440 | DESIGN | sent |
| 22 | "No app yet · Bo starts once you agree the page" sits on the focus document's bottom-right corner; "v1 · no reason asked to cancel…" overlaps her page's sheet. | `app-pill`; `page-sheet` | `jank/takeaways-empty-box-1440.jpg`, `jank/her-page-live-1440.jpg` | all | DESIGN | sent |
| 23 | Works: the unblock (Yes → "Bo: Got it: 8pm the night before. Carrying on."), Focus 2's word diff on Mika's steps, the five sketchpads, her workspace, her page after the build. | — | `jank/unblock-answered-1440.jpg`, `jank/her-page-live-1440.jpg` | — | — | clean |

### Sweep 2 · the R recording run: claude-code, painted, main with the meeting model + build/questions, 00:48 Sun

One real run, recorded as the new `runs/rehearsal` (R): Focus 1 in two rounds then End meeting, the unblock, Focus 2
in one round then End, Team go, her page (279 s; no model failures, no error events). R replayed once on painted:
all three moments, both meetings, her page, no 4xx or page errors (250 s).

**Fixed since sweep 1 (by the design studio unless noted):** #5 (the journey shows on the table), #7 (pills fit,
"+3"), #8 and #18 (team-space cards moved to the top left, off the idea sheet and Bo), #17 (meter reads 27 came
up · 3 brought, builder 7), #1 and #2 (the idea input and the name tag hold in the real flow).

| # | What | Where (component · state) | Screenshot | Size | Owner | Status |
|---|---|---|---|---|---|---|
| 24 | **P0.** Her focus document overprints under the meeting model on painted. Once she adds a piece or a round runs, the work (finding, or Mika's steps) slides over the kicker and the question; her pieces and "Round 2" land on the source line; the reply card covers the work; the right "Your thoughts" box stays empty. painted.css still targets the old `.fd-side`/`.fd-read`. | `focus-doc` · composing/discussing/ended; `meeting` column | `jank/focus-meeting-overprint-1440.jpg`, `jank/focus2-meeting-overprint-1440.jpg`, `jank/focus-meeting-takeaways-1440.jpg` | all | DESIGN | **fixed** on main 126c271 (9fc778f + dc43dbd): stub re-check, 2 rounds + End in Focus 1 and Focus 2 at 1920/1440/1280: 0 overlaps; `jank/focus-meeting-fixed-1440.jpg`, `jank/focus2-meeting-fixed-1920.jpg` |
| 25 | "End meeting" is a default grey button. | `end-meeting` | same | all | DESIGN | **fixed** (outlined pill) |
| 26 | Plain look, meeting layout: the form sits in the narrow side column, so her textarea is about 40 px wide. My helper line inside the form made it worse. | `focus-doc` form (plain) | — | all | BUILD (b3's layout) | helper line **fixed** (858fb60, now under the form); layout told to b3 |
| 27 | The inbox drawer for Focus 2: the "Needs you" card is blank and Mika's note floats beside it. | `inbox` · expanded, `inbox-item` | `jank/inbox-drawer-empty-needs-1440.jpg` | 1440 | DESIGN | sent |
| 28 | Chatter bubbles land on the teammates' pills (Mika's, Ines's) after Team go. | `chatter-line` | `jank/room-after-team-go-1440.jpg` | 1440 | DESIGN | sent |
| 29 | The team-status line under the idea card is cut by her place card ("…team has done its first pass."). | `team-status` · done | `jank/status-line-clipped-1440.jpg` | 1440 | DESIGN | sent |

| 30 | After End meeting at 1440 and 1280, the takeaways card's Keep button and the help line sit 12–15 px past the column's visible bottom; the column scrolls, so they're reachable, but Keep is half cut at first sight. | `takeaways` · shown; `help` | `jank/focus-meeting-end-1280.jpg` | 1440, 1280 | DESIGN | sent (minor) |

Next: #27–30 from the design studio, then the clean bill by 05:00.
<!-- PASS-2 -->
### Pass 2 · main 3fd9fbc · 14 Nov 23:52 UTC (after the look merges: team at work, cat tail, her idea on the glance card)

The pixel diff shows 245 shots changed, as expected after the look merges and with the living video moving. The pass-1 findings above all still stand. Of the 549 new flags, most come from the two checks added since pass 1 (overflow measured numerically, and clipped frames), and they confirm findings 23 and 24. Genuinely new:

27. [design] **The inbox drawer scrolls sideways and cuts its own text.** In the unblock card's speaking state, focusing her words scrolls the 13–24px-too-wide drawer to the right. Every line loses its first letters ("eeds you", "ings only you can do", "ur meeting notes…"), and the card's frame is cut by 18px. This is finding 23's overflow, now visible on stage.
    - Shot: `design/studio/qa/2026-11-14-23-52/1920x1130-day/11-unblock-speaking.jpg`
    - Where: all three sizes, day and night
    - Hooks: `[data-component="inbox"] [data-slot="drawer"]`, `[data-component="inbox-action"][data-state="speaking"]`
    - Fix: `overflow-x: hidden` on the drawer, and find the child that's wider than 268px (most likely the speaking card with its frame offset, or the field at `width:100%` plus padding).
28. [design] **Every teammate pad scrolls sideways, even when empty.** `[data-component="sketchpad-open"]` has 432 wide in 420 in all 12 pad states (5 teammates + hers, empty and full), at every size and mode. A Mac shows a horizontal bar under "Nothing on the pad yet."
    - Shot: `design/studio/qa/2026-11-14-23-52/1920x1130-day/07-design-empty.jpg`
    - Where: every size and mode
    - Hook: `[data-component="sketchpad-open"]`
    - Fix: as in finding 23: `overflow-x: hidden`, or remove the 12px of extra width.
29. [design] **The new mic pill on the glance card has a hard black outline.** It reads as a different kit from the soft paper pills, and at 1440 and 1280 it sits on the card's right edge.
    - Shot: `design/studio/qa/2026-11-14-23-52/1440x900-day/03.jpg`
    - Where: 1440x900 and 1280x800 (on the edge); 1920 (the look)
    - Hook: `[data-component="her-idea"]` mic (the "tap or hold to speak" button)
    - Fix: use the name tag's mic pill (pink, no black frame), with at least 12px of right padding.

Checked, fine: "the team is visibly at work" (`design/studio/qa/2026-11-14-23-52/1920x1130-day/06.jpg`): the captions read well and sit on paper. The name tag frame flags as cut by 24px at `#room`, but by eye the paper and its pink edge are whole, so it's left as is.

<!-- PASS-3 (takeaways, asked by the lead) -->
### Focus 1 after Send, long takeaways (~60 words of guidance) · main 03a7a59 · 15 Nov 00:20 UTC

30. [design] **At 1440 and 1280 the takeaways card cuts the guidance off and hides Keep.** The card's content is 345x520 in 336x416 (1280) or 336x468 (1440): the guidance stops mid-line ("…not at"), Keep sits inside a scroll box, and a Mac shows a bar. Meanwhile the right column has free space under the card. At 1920 everything fits, Keep included. In all three sizes the takeaways card is also 9px too wide (a horizontal bar), and its text sits 0px from the box edge.
    - Shots: `design/studio/qa/2026-11-15-takeaways/1280x800-day-09-focus1-takeaways.jpg`, `design/studio/qa/2026-11-15-takeaways/1440x900-day-09-focus1-takeaways.jpg`, and the 1920 one for comparison
    - Hook: `[data-component="takeaways"][data-state="shown"]`, plus `[data-slot="keep"]`
    - Fix: let the card grow into the column (no fixed height); take the 9px of extra width away (padding plus `width:100%`); keep `keep` outside any scrolling part; give it an inner padding of at least 14px.
31. [design] **Pin replies put the colon on its own line.** They read "Wren / : / That matches the finding…" over three lines.
    - Shots: the same three
    - Hook: `[data-component="pin-reply"] [data-slot="who"]`
    - Fix: `who` inline with the text ("Wren: …"), or drop the colon and keep `who` as a small label above.
32. [design] **The app button sits on top of the focus document's bottom-right corner.** "No app yet · Bo starts once you agree the page" overlaps the document's edge at every size.
    - Shots: the same three
    - Hooks: `[data-component="app-button"]` over `[data-component="focus-doc"]`
    - Fix: hide or dim the app button while a focus document is open (`body.focus-open`), or move it into the room's safe box below the document. Its label is also weight 600 (taste rule: 400/500).
- Checked, fine: the takeaways show fully within 6 s at 1920. Before then the guidance is still animating in, so a shot at 2.8 s shows it blank: not a bug, but the walk now waits 6 s. Nothing at the top of the document is clipped at any size.
- Pending: meeting modes (3 rounds of the conversation column, End meeting, then the takeaways). The walk adds them once b3 lands.

### Pass 3 · main 03a7a59 · 15 Nov 00:07 UTC (the app button, /slides/, painted-focus.css)

Fixed since pass 2:
- "Add this" is no longer a browser-default button, and Send is no longer weight 600 (finding 2, partly).
- The focus doc's frame is no longer clipped (part of finding 24).
- The pads no longer scroll sideways (finding 28). Only Bo's full list scrolls inside `[data-slot="items"]`, which is real overflow, so it needs a quiet scroll style.
- `/slides/` serves (finding 15).

New:

33. [design] **The app button hangs off the room.** In all four states (no app yet, building, ready, new version) it sits half below the room's bottom edge, over the dark band. Its label is weight 600. The states themselves read well: the new-version note "v2 · orders close at 8pm, sold-out loaves greyed" and "v2, just now" are clear.
    - Shots: `design/studio/qa/2026-11-15-00-07/1920x1130-day/16-app-none.jpg`, `16-app-building.jpg`, `16-app-ready.jpg`, `16-app-new-version.jpg`
    - Where: every size; worst at 1440 and 1280, where the band is 40–45px
    - Hook: `[data-component="app-button"]`, plus `[data-slot="label"]`
    - Fix: anchor it inside the room's safe box (bottom ≥ 16px inside `#room`); label at weight 500. See also finding 32: hide it while a focus document is open.

### Pass 4 · main 25c285f · 15 Nov 00:24 UTC (targeted: the app button's shop tag, the focus-doc strip, her page)

A targeted pass: only the states the look change touches (the room, Focus 1 and 2, her page, the app button), at all sizes, day and night. Meeting modes are not on main as UI yet: that merge changed only DEMO.md and VISION.md.

Fixed:
- Finding 32: while a focus document is open, the app button now sits in a strip under it, compact.
- The app button's label weight (finding 33, partly).

Still open:
- Finding 30, at 1280 and 1440: the guidance is still cut mid-line, and Keep is still inside the scroll box.
  - Shot: `design/studio/qa/2026-11-15-00-24/1280x800-day-09-focus1-takeaways.jpg`
- Finding 33, at 1440 and 1280: the tag still sits half on the band below the room.
  - Shot: `design/studio/qa/2026-11-15-00-24/1440x900-night-16-app-ready.jpg`

New:

34. [design] **With her page open, the app tag and the Replay label sit on the page sheet's bottom-right corner.**
    - Shot: `design/studio/qa/2026-11-15-00-24/1920x1130-day-13-her-page.jpg`
    - Where: 1920x1130 day
    - Hooks: `[data-component="app-button"]`, `[data-component="replay-label"]` over `[data-component="idea-layer"]` (`#page-sheet`)
    - Fix: give the open sheet the same foot strip the focus document now has, or tuck the tag left of the Replay label inside it.

### Pass 5 · main 8019281 · 15 Nov 00:42 UTC (full walk: jank sweep 1, the app tag's strip, the note flight)

Fixed, checked by eye and by the numbers:
- Finding 10: an empty pad now says what's coming ("Theo joins once the team gets going").
- Finding 7, at a glance: the chips wrap, with "+3".
- Finding 27: the drawer no longer cuts its text while she speaks.
- Finding 14: no ButtonFace Retry.
- Finding 12, part: the app tag's weight.
- Finding 24, part: the idea sheet and team status frames are no longer shaved.
- The team-at-work strip now sits under her glance card, clear of the cat.

Still open:
- Finding 8: meeting the team is still a bare square card with an empty face circle.
  - Shot: `design/studio/qa/2026-11-15-00-42/1920x1130-day-02.jpg`
- Finding 7, opened large: the journey still runs off the right edge ("Pick u…"), and the lower half is empty.
  - Shot: `design/studio/qa/2026-11-15-00-42/1920x1130-day-05.jpg`
- Finding 4: after Yes, the drawer is still a blank column.
  - Shot: `design/studio/qa/2026-11-15-00-42/1920x1130-day-11-unblock-yes.jpg`
- Finding 5: native ▶ and checkboxes, and the 700 title, remain in the drawer.
  - Shot: `design/studio/qa/2026-11-15-00-42/1920x1130-day-08-drawer.jpg`
- Finding 17: the 25px bands remain until the room-cover change lands.
- Flags for the idea layer's `::before` frame (2px) and for the note flight's frame cut at `#room` (finding 24).

New:

35. [design] **While a new note flies to her inbox, the inbox shows a blank card for about 3.5 s.** The note arcs from the teammate (`note-flight`). Meanwhile `[data-component="inbox-item"] [data-slot="text"]` sits at opacity 0 from the moment the ask lands until about 4 s, so the collapsed inbox reads as an empty paper with only "Open your inbox". Opened during that time, the drawer shows an empty white box under "Needs you". Measured at 300, 800, 1500, 2500 and 4000 ms (opacity 0, 0, 0, 0, 1).
    - Shots: `design/studio/qa/2026-11-15-00-42/1920x1130-day-08-new.jpg` (600 ms), `design/studio/qa/2026-11-15-00-42/1920x1130-day-08-drawer.jpg`
    - Hooks: `[data-component="inbox-item"][data-state="top"] [data-slot="text"]`, `[data-component="note-flight"]`
    - Fix: show who is asking at once ("Bo asks…"), and fade the question in as the flight lands; keep the flight at 1.5 s or less. In the drawer, show the item's text at once.

### Pass 6 · main 92e5225 · 15 Nov 01:01 UTC (day/night, rain, the handwritten name tag; plus the meeting walk)

Passing at all three sizes:
- Day/night: the labels match each mode; within 1 s exactly one room video is playing; no patch is frozen; Day survives a reload; 4 quick clicks during a replay land right.
- Sound: Day is silent and the window is hidden; at night, rain.mp3 plays; the record cycles piano → electronic → chiptune → off, with no rain track; the window toggles only the rain, and the music keeps playing; both choices survive a reload; `?stage=1` is silent until a tap.
- The mic: idle, listening and writing are all ink-paper (fake microphone, stubbed speech-to-text).
- The name tag, all but its height: after Enter the form is gone, the pen writes her name and then the title, and the fallback says plainly that the tag is in her own words.
- `?look=plain` (checked on design/meetcard): no painted layers.
- The meet cards (on design/meetcard, ahead of its merge): each wave plays, a tap plays the reaction and then the wave, and the frame is inked and rounded with a 34px radius, at all three sizes.

Name tag height:
- The card still gets shorter at Enter, by 147, 111 and 98px at 1920, 1440 and 1280. design/nametag-2 should fix this; re-check when it lands.

New:

36. [design, blocks the demo] **In the painted look, Focus 1 breaks as soon as she sends a round.** Walked with the real meeting flow: Send, the team's replies, three rounds, End meeting, then the takeaways.
    - The question, the research quote and her answer print on top of each other.
    - The replies spill over the work.
    - The right column collapses to an empty pink bar.
    - End meeting is a grey ButtonFace button, and "New replies ↓" is another.
    - After End meeting, the takeaways card is a 32px strip, and its guidance sits below the window (top 1045px at 1920x1130).
    - Cause: main has the meeting's code (focus-doc.js, `[data-component="meeting"]` composing · discussing · ended) but not its painted CSS.
    - Shots: `design/studio/qa/2026-11-15-01-01/main-1920-09-meeting-r1.jpg`, `design/studio/qa/2026-11-15-01-01/main-1920-09-meeting-ended.jpg`, `design/studio/qa/2026-11-15-01-01/main-1280-09-meeting-ended.jpg`
    - Hooks: `[data-component="focus-doc"]`, `[data-component="meeting"]`, `[data-component="end-meeting"]`, `[data-component="takeaways"]`
    - Fix: merge design/meetcard (b3037ad). On that branch the same walk is clean: one conversation column, an inked End meeting, and full takeaways with Keep inside the card at 1920 and 1280. That also closes finding 30.
      - Shots: `design/studio/qa/2026-11-15-01-01/meetcard-1920-09-meeting-r3.jpg`, `design/studio/qa/2026-11-15-01-01/meetcard-1920-09-meeting-ended.jpg`

### Pass 7 · main c24f7a8 · 15 Nov 01:35 UTC (meeting look, meetcard, nametag-2, painted by default, sweep fixes)

Fixed, checked by eye and by the numbers:
- Finding 36, the focus meeting: one conversation column over three rounds, an inked End meeting, and full takeaways with Keep inside the card, at all three sizes. Finding 30 is fixed too.
  - Shots: `design/studio/qa/2026-11-15-01-35/1920x1130-day-09-meeting-r3.jpg`, `design/studio/qa/2026-11-15-01-35/1280x800-day-09-focus1-takeaways.jpg`
- The name tag keeps one size from asking to tag: 864x772, 648x579 and 576x514 at 1920, 1440 and 1280, in spin and fallback, day and night.
- Finding 8: meeting the team is now a waving portrait in an inked, rounded frame beside its card. Each wave plays, and a tap plays the reaction and then the wave, at all three sizes.
  - Shot: `design/studio/qa/2026-11-15-01-35/1920x1130-day-02.jpg`
- Finding 7, opened large: the journey fits on the sheet.
  - Shot: `design/studio/qa/2026-11-15-01-35/1920x1130-day-05.jpg`
- Finding 35: "Bo's blocked" shows at once while the note flies.
  - Shot: `design/studio/qa/2026-11-15-01-35/1920x1130-day-08-new.jpg`
- Finding 4: after Yes, a receipt shows ("Told Bo: 8pm the night before").
- `?look=plain` has no painted layers.
- Day/night, the sound and the mic still pass at all three sizes.

Still open:
- Finding 5: the native ▶ and checkboxes in the drawer.
  - Shot: `design/studio/qa/2026-11-15-01-35/1920x1130-day-08-drawer.jpg`
- Finding 17: the bands.

New:

37. [design] **After Yes, the drawer scrolls sideways again and cuts its text.** The new receipt chip ("Told Bo: 8pm the night before", with its offset frame) is wider than the drawer, so the drawer scrolls to it, and every line loses its first letters: "eeds you", "hings only you can do", "othing only you can do". This is finding 27 again, in the yes state.
    - Shot: `design/studio/qa/2026-11-15-01-35/1920x1130-day-11-unblock-yes.jpg`
    - Where: all sizes
    - Hooks: `[data-component="inbox"] [data-slot="drawer"]`, `[data-component="inbox-action"][data-state="yes"]`
    - Fix: `overflow-x: hidden` on the drawer (once, for every state), and keep the receipt's frame inside its box (`max-width: 100%` with its offset inside the padding).
38. [question for the lead] **The "No app yet" tag shows on the setup pages.** It sits bottom-right on both the name tag and meet-the-team, the same at every size: 240x63 at 1664,1053 (1920x1130), 1184,823 (1440x900) and 1024,723 (1280x800). Its hint, "Bo starts once you agree the page", means nothing before she has met Bo.
    - Shots: `design/studio/qa/2026-11-15-01-35/1920x1130-day-01.jpg`, `design/studio/qa/2026-11-15-01-35/1920x1130-day-02.jpg`
    - Hooks: `[data-component="app-button"]` while `[data-component="setup"]` has `data-step` nametag or team
    - Suggestion: hide it until the reveal (`#room[data-setup]` or `setup[data-step] ≠ off`); it has nothing to say before the room.
