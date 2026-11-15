# Audit

## [design]

**Walked:** 15 Nov 04:30–05:15 UTC on main `1f6e56c`. Painted look (the default), at 1920×1130 (Vincent's Mac), 1440×900 and 1280×800, day and night. Headless Chromium, with headed Chromium under Xvfb for the frame-rate trace. Every POST was stubbed, so no model, fal or ElevenLabs calls. Anything that needs a live run is marked "not checked live".

**Tools** (on `design/qa`):
- `scripts/design-qa.mjs`: the screen walk, with QA.md checks, measured WCAG contrast, the one-thing census, day/night, sound, the mic, art, toys, the name tag and the meet cards.
- `scripts/design-polish.mjs`: POLISH.md item by item.
- `scripts/design-perf.mjs`: frame rate.
- `scripts/design-audit.mjs`: builds this section.

**Evidence:** `design/studio/qa/audit-0430/painted/<size>-<mode>/<state>.jpg` (1440 and 1280 downscaled to 960 wide) and `design/studio/qa/audit-0430/polish/` (frame strips are `*-strip.jpg`). The raw flags are in `design/studio/qa/audit-0430/painted-findings.json` and `design/studio/qa/audit-0430/polish.json`.

### FAIL list, routed (status as of 05:15)

| # | FAIL | Where | Evidence | Owning files | Owner |
|---|---|---|---|---|---|
| 1 | The teammates' name pills overlap while the team works: Theo's pill, wider with its thinking dots, covers the end of Noor's by 27×13px | all sizes, day and night | `design/studio/qa/audit-0430/painted/1920x1130-day/06.jpg` | room.js · looks/painted-room.css | living designer · **FIXED** on d4e94d3 (re-walked 1920/1440/1280: 0 overlaps; `design/studio/qa/audit-0430/recheck/pills-d4e94d3.jpg`) |
| 2 | The inbox, open as a sheet, scrolls on a Mac (1526×884 of content in 1510×860); the unblock drawer slot scrolls too (326 in 311 asking, 390 in 376 speaking), and the speaking card's frame is cut by 10px | all sizes | `design/studio/qa/audit-0430/painted/1920x1130-day/08-drawer.jpg`, `design/studio/qa/audit-0430/painted/1920x1130-day/11-unblock-asking.jpg` | inbox.js · looks/painted.css | bug fixer · **FIXED** on 1922da3 (re-walked 1920/1440/1280: no scrollbar on the open inbox or the unblock slot; a 2px frame shave remains, minor) |
| 3 | The takeaways text sits 0px from its card edge (Focus 1 and Focus 2) | all sizes | `design/studio/qa/audit-0430/painted/1920x1130-day/09-focus1-takeaways.jpg` | focus-doc.js · looks/painted-focus.css | bug fixer · **FIXED** on 1922da3 (by eye: ~30px of padding inside the card; the 0px reading is an inner background box; `design/studio/qa/audit-0430/recheck/takeaways-edge-1922da3.jpg`) |
| 4 | Bo's full pad: its items list scrolls (477 in 290) and is not the intended scroll column | all sizes | `design/studio/qa/audit-0430/painted/1920x1130-day/07-engineering-full.jpg` | room.js · looks/painted.css | bug fixer · **FIXED** on 1922da3 (re-walked: Bo's full pad no longer scrolls its list) |
| 6c | The room offers 8+ clickables at once: the time pill, each journey chip as a button, the tally counter, the inbox | all sizes | `design/studio/qa/audit-0430/painted/1920x1130-day/06.jpg` | idea-sheet.js, flow.js · looks/painted.css | bug fixer · **FIXED** on c91602c (team working: the idea card is just the idea, clickables down from 8 to 3: the pill, the inbox, the tally; right after the first sketch the chips are the one thing on screen, by design (the lead, 05:39), and they fold away once the team starts; `design/studio/qa/audit-0430/recheck/6c-F2-c91602c.jpg`) |
| 7 | Bo's smile on Yes is flat: a large blank sheet flashes before the room returns (the smile's size at room scale is a scale limit and is accepted) | 1920 | `design/studio/qa/audit-0430/polish/moment-bo-s-smile-on-yes-strip.jpg` | inbox.js · looks/painted.js | bug fixer (the flash only) · **FIXED** on 4afbc95 (measured per frame after Yes: the sheet keeps its receipt "Told Bo: 8pm the night before" and fades out over ~300 ms, the room is back by ~500 ms; no blank sheet; `design/studio/qa/audit-0430/recheck/bo-yes-4afbc95-strip.jpg`) |
| 8 | At 1440 and 1280, her page sheet (idea-layer / page-frame) runs 26px off the left edge, cutting its border and the "page" label | 1440, 1280; day and night | `design/studio/qa/audit-0430/painted/1440x900-day/13-her-page-open.jpg` | room.js · looks/painted.css | painted-UI designer · **FIXED** on 1922da3 (re-walked 1440/1280/1920: 0 off-screen; the sheet keeps its border and "Your page" label; `design/studio/qa/audit-0430/recheck/page-edge-1922da3.jpg`, old main bottom right) |

**Later items (the lead's final list):** F2 plain idea card: **FIXED** on c91602c (centred, styled like the name tag; same still). F3 her page edge: **FIXED** on c91602c (0 off-screen at 1440/1280; see #8). F4 the team-at-work strip: **FIXED** on f4a8ec4 (hangs 9-12px under her sheet's edge at all 3 sizes and is gone after 7 s; `design/studio/qa/audit-0430/recheck/F4-1920-0s-f4a8ec4.jpg`, `…-7s-…`; "hides while she types" not checked). F5 "1 decision": **FIXED** on f4a8ec4 (the tally reads "decision came up" after one decision, all 3 sizes). F6 Make my tag inside the paper while the team writes: **FIXED** on f4a8ec4 (the button's box sits inside the paper at all 3 sizes; `design/studio/qa/audit-0430/recheck/F6-1440-f4a8ec4.jpg`). F10 the bakery clip: on main (4afbc95), `/clips/bakery-order.mp4` serves (200, video/mp4, 14.6 s); the "Recorded earlier" label is REHEARSAL's to show (played outside the room), not checked here.

**WON'T FIX, by design** (the design lead, 05:00):
- **#5, the close is mostly empty:** it is deliberately one field, one mic and one Build it, snug and centred. It's the one-thing screen.
- **#6a, two guidance lines on the idea and the name tag:** "tap or hold to speak · ElevenLabs" is the mic control's own label, not guidance.
- **#6b, the meeting's controls:** the controls are the meeting.
- **#6d/e, the app tag, time pill and inbox around panels and the close:** persistent chrome, out of scope this late.

### Screen by screen (pass/fail per size and mode; the count is the number of hard flags in that cell)

| Screen | 1920x1130 day | 1920x1130 night | 1440x900 day | 1440x900 night | 1280x800 day | 1280x800 night |
|---|---|---|---|---|---|---|
| The idea paper (and the tidy moment) | pass | pass | pass | pass | pass | pass |
| Her name tag (form → handwritten tag) | pass | pass | pass | pass | pass | pass |
| Meet the team | pass | pass | pass | pass | pass | pass |
| The reveal (door) | pass | pass | pass | pass | pass | pass |
| The room, calm | pass | pass | pass | pass | pass | pass |
| The team working | **fail** (1) | **fail** (1) | **fail** (1) | pass | **fail** (1) | pass |
| The idea sheet and journey | pass | pass | pass | pass | pass | pass |
| Teammate pads and her workspace | **fail** (1) | **fail** (1) | **fail** (3) | **fail** (3) | **fail** (3) | **fail** (3) |
| Focus 1 meeting (rounds, End meeting, takeaways) | **fail** (2) | **fail** (2) | **fail** (2) | **fail** (2) | **fail** (2) | **fail** (2) |
| The inbox | **fail** (1) | **fail** (1) | **fail** (1) | **fail** (1) | **fail** (1) | **fail** (1) |
| The quick unblock card | **fail** (4) | **fail** (4) | **fail** (4) | **fail** (5) | **fail** (4) | **fail** (5) |
| Focus 2 meeting | **fail** (2) | **fail** (2) | **fail** (2) | **fail** (2) | **fail** (2) | **fail** (2) |
| The team space | pass | pass | pass | pass | pass | pass |
| Her page and the app tag | **fail** (3) | **fail** (3) | **fail** (5) | **fail** (5) | **fail** (5) | **fail** (5) |
| The close | pass | pass | **fail** (2) | **fail** (2) | **fail** (2) | **fail** (2) |

· = not walked at that size or mode (see the notes).

**Failures** (one line each; where; shot):

- **FAIL** The team working · pill overlap · `[data-component="place-card"][data-state="working"] × [data-component="place-card"][data-state="working"]` · data and research overlap by 27x13px · 1920x1130 day, 1920x1130 night, 1440x900 day, 1280x800 day · `design/studio/qa/audit-0430/painted/1920x1130-day/06.jpg` · owning file: public/room.js · public/looks/painted-room.css
- **FAIL** Teammate pads and her workspace · scrollbar · `[data-component="sketchpad-open"][data-state="open"] [data-slot="items"]` · scrolls on a Mac: 374x477 of content in 374x290 (overflow hidden/auto) · 1920x1130 day, 1920x1130 night, 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1920x1130-day/07-engineering-full.jpg` · owning file: public/room.js · public/looks/painted.css
- **FAIL** Teammate pads and her workspace · off-screen · `[data-component="idea-layer"][data-state="on"]` · box -26,148 → 1386,784 in 1440x900 · 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1440x900-day/07-hers-full.jpg` · owning file: public/room.js · public/looks/painted.css
- **FAIL** Teammate pads and her workspace · off-screen · `[data-component="page-frame"][data-state="built"]` · box -26,185 → 1386,784 in 1440x900 · 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1440x900-day/07-hers-full.jpg`
- **FAIL** Focus 1 meeting (rounds, End meeting, takeaways) · text on edge · `[data-component="takeaways"][data-state="shown"]` · 0.0px from its box: “Guidance to the team” · 1920x1130 day, 1920x1130 night, 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1920x1130-day/09-focus1-takeaways.jpg` · owning file: public/focus-doc.js · public/looks/painted-focus.css
- **FAIL** Focus 1 meeting (rounds, End meeting, takeaways) · text on edge · `[data-component="takeaways"][data-state="shown"]` · 0.0px from its box: “Put a regular’s usual loaf at the top of” · 1920x1130 day, 1920x1130 night, 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1920x1130-day/09-focus1-takeaways.jpg` · owning file: public/focus-doc.js · public/looks/painted-focus.css
- **FAIL** The inbox · scrollbar · `[data-component="inbox"][data-state="open"]` · scrolls on a Mac: 1526x884 of content in 1510x860 (overflow auto/auto) · 1920x1130 day, 1920x1130 night, 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1920x1130-day/08-drawer.jpg` · owning file: public/inbox.js · public/looks/painted.css, public/looks/painted-room.css
- **FAIL** The quick unblock card · scrollbar · `[data-component="inbox"][data-state="open"]` · scrolls on a Mac: 1526x884 of content in 1510x860 (overflow auto/auto) · 1920x1130 day, 1920x1130 night, 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1920x1130-day/11-unblock-asking.jpg` · owning file: public/inbox.js · public/looks/painted.css, public/looks/painted-room.css
- **FAIL** The quick unblock card · scrollbar · `[data-component="inbox"][data-state="open"] [data-slot="drawer"]` · scrolls on a Mac: 720x326 of content in 720x311 (overflow hidden/auto) · 1920x1130 day, 1920x1130 night, 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1920x1130-day/11-unblock-asking.jpg` · owning file: public/inbox.js · public/looks/painted.css, public/looks/painted-room.css
- **FAIL** The quick unblock card · clipped frame · `[data-component="inbox-action"][data-state="speaking"]` · ::before frame cut by 10px at [data-component="inbox"][data-state="open"] [data-slot="drawer"] overflow:hidden/auto · 1440x900 night, 1280x800 night · `design/studio/qa/audit-0430/painted/1440x900-night/11-unblock-speaking.jpg` · owning file: public/inbox.js · public/looks/painted.css
- **FAIL** Focus 2 meeting · text on edge · `[data-component="takeaways"][data-state="shown"]` · 0.0px from its box: “Guidance to the team” · 1920x1130 day, 1920x1130 night, 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1920x1130-day/10-focus2-meeting.jpg` · owning file: public/focus-doc.js · public/looks/painted-focus.css
- **FAIL** Focus 2 meeting · text on edge · `[data-component="takeaways"][data-state="shown"]` · 0.0px from its box: “Hold a regular’s usual by default; let t” · 1920x1130 day, 1920x1130 night, 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1920x1130-day/10-focus2-meeting.jpg` · owning file: public/focus-doc.js · public/looks/painted-focus.css
- **FAIL** Her page and the app tag · pill overlap · `[data-component="place-card"][data-state="thinking"] × [data-component="place-card"][data-state="thinking"]` · data and research overlap by 27x13px · 1920x1130 day, 1920x1130 night, 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1920x1130-day/16-app-building.jpg` · owning file: public/room.js · public/looks/painted-room.css
- **FAIL** Her page and the app tag · off-screen · `[data-component="idea-layer"][data-state="on"]` · box -26,148 → 1386,784 in 1440x900 · 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1440x900-day/13-her-page.jpg` · owning file: public/room.js · public/looks/painted.css
- **FAIL** Her page and the app tag · off-screen · `[data-component="page-frame"][data-state="built"]` · box -26,185 → 1386,784 in 1440x900 · 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1440x900-day/13-her-page.jpg`
- **FAIL** The close · off-screen · `[data-component="idea-layer"][data-state="on"]` · box -26,148 → 1386,784 in 1440x900 · 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1440x900-day/14-close.jpg` · owning file: public/room.js · public/looks/painted.css
- **FAIL** The close · off-screen · `[data-component="page-frame"][data-state="built"]` · box -26,185 → 1386,784 in 1440x900 · 1440x900 day, 1440x900 night, 1280x800 day, 1280x800 night · `design/studio/qa/audit-0430/painted/1440x900-day/14-close.jpg`

**Excluded by eye, with the reason** (flags the check raised that are not defects):

- 60 × the setup layer is the whole room (cover scale); its frame edge is the window edge
- 181 × the "agent" mark is collapsed on purpose to make room for the role
- 54 × the carved plaque is part of the painted door, not UI text
- 180 × the label sits on a texture the contrast check cannot see; by eye it reads
- 42 × a pseudo-element backdrop, not a frame (cut by >100px = the check misreads it)
- 24 × the one intended scroll column (POLISH §5 allows it)
- 100 × replies scrolled out of view inside the conversation column
- 6 × by design: the close is one field, one mic and one Build it, snug and centred (the lead, 05:00)
- 18 × the slides' cards are textured; by eye they read
- 165 × measured against the night backdrop behind a cream paper; by eye the paper reads
- 3 × the walk's own selector (fixed); meet cards are checked in POLISH and the entrance strips

**Notes, counted not failed:**

- The idea paper (and the tidy moment): clipped frame 24, contrast 108
- Her name tag (form → handwritten tag): clipped frame 6, contrast 18
- Meet the team: clipped frame 30, contrast 39, walk 3
- The reveal (door): clipped text 30, weight 54
- The room, calm: clipped text 6
- The team working: contrast 12, clipped text 2
- The idea sheet and journey: clipped text 12, clipped frame 6
- Teammate pads and her workspace: clipped text 60, contrast 60, clipped frame 12
- Focus 1 meeting (rounds, End meeting, takeaways): clipped frame 88, scrollbar 18, off-screen 42
- The inbox: contrast 48, clipped text 22, clipped frame 6
- The quick unblock card: clipped frame 22, contrast 36, clipped text 18
- Focus 2 meeting: clipped frame 12, scrollbar 6
- The team space: contrast 24, clipped text 11
- Her page and the app tag: clipped frame 23, clipped text 20
- The close: clipped frame 18, mostly empty 6, contrast 18

#### POLISH.md, item by item

**§2 Every input is a good input**

| Item | Size | Result | Evidence | Note | Owner |
|---|---|---|---|---|---|
| the idea paper: 300 words | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-idea-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| the idea paper: has the mic | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-idea-300-words.jpg` | mic in the card |  |
| the idea paper: pasted paragraph | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-idea-pasted-paragraph.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| the idea paper: shortcuts never fire while typing | 1920x1130 | PASS |  | S R J ? typed into the field, nothing fired |  |
| the idea paper: Shift+Enter makes a new line | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920-idea-shift-enter.jpg` | new line kept |  |
| the idea paper: Esc leaves the field | 1920x1130 | PASS |  | focus left the field |  |
| the idea paper: empty input | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920-idea-empty-enter.jpg` | primary stays “Next” (enabled); Enter on empty did nothing |  |
| the idea paper: the tidy in place | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/tidy-idea-strip.jpg` | tidied: tidied/cut: “The regulars, want their usual loaf”; layout shift 0px over 10 frames |  |
| her name tag: 300 words | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-nametag-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| her name tag: has the mic | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-nametag-300-words.jpg` | mic in the card |  |
| her name tag: pasted paragraph | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-nametag-pasted-paragraph.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| her name tag: shortcuts never fire while typing | 1920x1130 | PASS |  | S R J ? typed into the field, nothing fired |  |
| her name tag: Shift+Enter makes a new line | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920-nametag-shift-enter.jpg` | new line kept |  |
| her name tag: Esc leaves the field | 1920x1130 | PASS |  | focus left the field |  |
| her name tag: empty input | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920-nametag-empty-enter.jpg` | primary stays “Make my tag” (enabled); Enter on empty did nothing |  |
| her name tag: the tidy in place | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/tidy-nametag-strip.jpg` | tidied: tidied/cut: “the regulars, want their usual loaf”; layout shift 0px over 10 frames |  |
| Focus 1 (her answer): 300 words | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-focus-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| Focus 1 (her answer): has the mic | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-focus-300-words.jpg` | mic in the card |  |
| Focus 1 (her answer): pasted paragraph | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-focus-pasted-paragraph.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| Focus 1 (her answer): shortcuts never fire while typing | 1920x1130 | PASS |  | S R J ? typed into the field, nothing fired |  |
| Focus 1 (her answer): Shift+Enter makes a new line | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920-focus-shift-enter.jpg` | new line kept |  |
| Focus 1 (her answer): Esc leaves the field | 1920x1130 | PASS |  | focus left the field |  |
| Focus 1 (her answer): empty input | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920-focus-empty-enter.jpg` | primary stays “Send” (enabled); Enter on empty did nothing |  |
| Focus 1 (her answer): the tidy in place | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/tidy-focus-strip.jpg` | tidied: tidied/cut: “The regulars, want their usual loaf”; layout shift 0px over 10 frames |  |
| the unblock card (say something else): 300 words | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-unblock-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| the unblock card (say something else): has the mic | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-unblock-300-words.jpg` | mic in the card |  |
| the unblock card (say something else): pasted paragraph | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-unblock-pasted-paragraph.jpg` | fits (field grows; primary on screen) |  |
| the unblock card (say something else): shortcuts never fire while typing | 1920x1130 | PASS |  | S R J ? typed into the field, nothing fired |  |
| the unblock card (say something else): Shift+Enter makes a new line | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920-unblock-shift-enter.jpg` | new line kept |  |
| the unblock card (say something else): Esc leaves the field | 1920x1130 | PASS |  | focus left the field |  |
| the unblock card (say something else): empty input | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920-unblock-empty-enter.jpg` | primary stays “Yes” (enabled); Enter on empty did nothing |  |
| the unblock card (say something else): the tidy in place | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/tidy-unblock-strip.jpg` | tidied: tidied/cut: “The regulars, want their usual loaf”; layout shift 0px over 10 frames |  |
| the idea paper: 300 words | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-idea-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| the idea paper: pasted paragraph | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-idea-pasted-paragraph.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| her name tag: 300 words | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-nametag-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| her name tag: pasted paragraph | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-nametag-pasted-paragraph.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| Focus 1 (her answer): 300 words | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-focus-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| Focus 1 (her answer): pasted paragraph | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-focus-pasted-paragraph.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| the unblock card (say something else): 300 words | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-unblock-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| the unblock card (say something else): pasted paragraph | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-unblock-pasted-paragraph.jpg` | fits (field grows; primary on screen) |  |
| the idea paper: 300 words | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-idea-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| the idea paper: pasted paragraph | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-idea-pasted-paragraph.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| her name tag: 300 words | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-nametag-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| her name tag: pasted paragraph | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-nametag-pasted-paragraph.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| Focus 1 (her answer): 300 words | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-focus-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| Focus 1 (her answer): pasted paragraph | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-focus-pasted-paragraph.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| the unblock card (say something else): 300 words | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-unblock-300-words.jpg` | fits (field scrolls inside itself; primary on screen) |  |
| the unblock card (say something else): pasted paragraph | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-unblock-pasted-paragraph.jpg` | fits (field grows; primary on screen) |  |

**§3 Calm, clean motion**

| Item | Size | Result | Evidence | Note | Owner |
|---|---|---|---|---|---|
| prefers-reduced-motion gets static versions | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/reduced-motion-reveal.jpg` | door layer skipped; 1 running animations right after the reveal |  |
| magic moment: the door plaque | 1920x1130 | NOTE | `design/studio/qa/audit-0430/polish/moment-the-door-plaque-strip.jpg` | frame strip (10 × 350 ms), layout shift 0px; scored by eye in the audit |  |
| magic moment: each meet card entrance | 1920x1130 | NOTE | `design/studio/qa/audit-0430/polish/moment-each-meet-card-entrance-strip.jpg` | frame strip (8 × 120 ms), layout shift 0px; scored by eye in the audit |  |
| magic moment: the team getting to work | 1920x1130 | NOTE | `design/studio/qa/audit-0430/polish/moment-the-team-getting-to-work-strip.jpg` | frame strip (8 × 300 ms), layout shift 0px; scored by eye in the audit |  |
| magic moment: a teammate reply arriving | 1920x1130 | NOTE | `design/studio/qa/audit-0430/polish/moment-a-teammate-reply-arriving-strip.jpg` | frame strip (8 × 150 ms), layout shift 0px; scored by eye in the audit |  |
| magic moment: End meeting → takeaways | 1920x1130 | NOTE | `design/studio/qa/audit-0430/polish/moment-end-meeting-takeaways-strip.jpg` | frame strip (10 × 250 ms), layout shift 1px; scored by eye in the audit |  |
| magic moment: Bo’s smile on Yes | 1920x1130 | NOTE | `design/studio/qa/audit-0430/polish/moment-bo-s-smile-on-yes-strip.jpg` | frame strip (10 × 250 ms), layout shift 0px; scored by eye in the audit |  |

**§4 Never lost, never stuck**

| Item | Size | Result | Evidence | Note | Owner |
|---|---|---|---|---|---|
| within 300 ms she sees who is doing what (Send) | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-send-300ms.jpg` | reading: “The team is reading what you said…” |  |
| the meeting: “New replies ↓” when scrolled up | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-new-replies.jpg` | pill shows |  |
| chatter: ≤8 words, at most 2 at a time | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-chatter.jpg` | 1 at once at most; longest 6 words (“then remember them on the device”) |  |
| the inbox has one home (top right) | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-chatter.jpg` | centre at 1699,63 in 1920x1130 |  |
| no question previews in the room | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/1920x1130-chatter.jpg` | none |  |
| within 300 ms she sees who is doing what (Send) | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-send-300ms.jpg` | reading: “The team is reading what you said…” |  |
| the meeting: “New replies ↓” when scrolled up | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-new-replies.jpg` | pill shows |  |
| chatter: ≤8 words, at most 2 at a time | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-chatter.jpg` | 1 at once at most; longest 6 words (“then remember them on the device”) |  |
| the inbox has one home (top right) | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-chatter.jpg` | centre at 1262,50 in 1440x900 |  |
| no question previews in the room | 1440x900 | PASS | `design/studio/qa/audit-0430/polish/1440x900-chatter.jpg` | none |  |
| within 300 ms she sees who is doing what (Send) | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-send-300ms.jpg` | reading: “The team is reading what you said…” |  |
| the meeting: “New replies ↓” when scrolled up | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-new-replies.jpg` | pill shows |  |
| chatter: ≤8 words, at most 2 at a time | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-chatter.jpg` | 1 at once at most; longest 6 words (“then remember them on the device”) |  |
| the inbox has one home (top right) | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-chatter.jpg` | centre at 1121,44 in 1280x800 |  |
| no question previews in the room | 1280x800 | PASS | `design/studio/qa/audit-0430/polish/1280x800-chatter.jpg` | none |  |

**§5 Nothing broken-looking**

| Item | Size | Result | Evidence | Note | Owner |
|---|---|---|---|---|---|
| the cursor family (day) | 1920x1130 day | PASS | `design/studio/qa/audit-0430/polish/cursor-day.jpg` | everyday url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/20…612; over a button folded (differs); input own; window hidden by day |  |
| the cursor family (night) | 1920x1130 night | PASS | `design/studio/qa/audit-0430/polish/cursor-night.jpg` | everyday url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/20…612; over a button folded (differs); input own; window paw |  |

**§6 True on screen**

| Item | Size | Result | Evidence | Note | Owner |
|---|---|---|---|---|---|
| meet cards: “Loaded with” / “Made with” only true tools | 1920x1130 | NOTE | `design/studio/qa/audit-0430/polish/meet-kit.jpg` | design: loaded [taste-skill’s design rules (MIT), Claude, sketching journeys and screens] made [Studio, clips, music painted on fal, The room’s frames, laid out in Figma] · data: loaded [Claude: one measure per step, Kee |  |
| prepared things are labelled: Noor’s finding | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/label-finding.jpg` | “researched before the demo” shows |  |
| prepared things are labelled: the replay | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/label-replay.jpg` | label: “Replay recorded run “rehearsal” · Sun 02:49 AM” |  |

**§7 Vincent's own path**

| Item | Size | Result | Evidence | Note | Owner |
|---|---|---|---|---|---|
| fallback ?setup=classic | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/fallback-setup-classic.jpg` | opens on setup step “nametag” (classic: the name tag first) |  |
| fallback ?meeting=0 (one Send, no rounds) | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/fallback-meeting-0.jpg` | single Send, no End meeting |  |
| fallback ?look=plain | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/fallback-plain.jpg` | {"iframe":false,"on":false} |  |
| fallback R replay | 1920x1130 | PASS | `design/studio/qa/audit-0430/polish/fallback-replay.jpg` | {"replay":true,"name":"rehearsal","beat":4} |  |



#### §3 The magic moments, scored by eye from frame strips (1920×1130 day)

| Moment | Score | Strip | Note |
|---|---|---|---|
| The door plaque | magical | `design/studio/qa/audit-0430/polish/moment-the-door-plaque-strip.jpg` | the plaque holds, the doors open, then a crossfade into the room; 0px layout shift |
| The tidy | **magical** (re-checked on 96d6a9f, design/tidy-pen) | `design/studio/qa/audit-0430/recheck/tidy-pen-idea-96d6a9f.jpg`, `design/studio/qa/audit-0430/recheck/tidy-pen-focus-96d6a9f.jpg` | a small pen strikes through the fillers ("um so like", "you know", "basically"), they fade, the line closes up to her own words in place, then the page moves on; 0px layout shift on the idea, the name tag and Focus 1; still tidied in place on all 4 inputs |
| The handwritten name tag | magical | `design/studio/qa/audit-0430/painted/1920x1130-day-nametag/` | the pen writes her name, then the title, the traits and the superpower; one size throughout |
| Each meet card's entrance | fine | `design/studio/qa/audit-0430/polish/moment-each-meet-card-entrance-strip.jpg` | a plain fade; the portrait waves |
| The team getting to work | magical | `design/studio/qa/audit-0430/polish/moment-the-team-getting-to-work-strip.jpg` | the light warms, sketches pin up on the shelf, "getting started" captions |
| A teammate's reply arriving | fine | `design/studio/qa/audit-0430/polish/moment-a-teammate-reply-arriving-strip.jpg` | fades into the column and onto its pin |
| End meeting → takeaways | fine | `design/studio/qa/audit-0430/polish/moment-end-meeting-takeaways-strip.jpg` | the guidance writes itself in, calmly |
| Bo's smile on Yes | fine (re-scored on 4afbc95: the receipt fades out, no blank flash; the smile itself stays small at room scale, accepted) | `design/studio/qa/audit-0430/polish/moment-bo-s-smile-on-yes-strip.jpg` | a large blank sheet flashes first (FAIL #7); the smile is too small at room scale (accepted) |

#### §1 One thing per screen (1920x1130 day; the same at every size)

WON'T FIX rows, by the lead's call: the focus meetings (6b), the app tag, time pill and inbox around panels and the close (6d/e), and the mic's own "· ElevenLabs" label (6a). The rows that stay FAIL to route: the room's clickables (6c).

| Screen | Result | Controls · competing · guidance | Owner |
|---|---|---|---|
| the first page: her idea (setup, paper) | **FAIL** | controls 3: “One sentence is plenty”, “tap or hold to speak · ElevenLabs”, “Next” · competing 0:  · guidance 2: “Say it or type it”, “voice by ElevenLabs” | bug fixer |
| the idea paper, the tidy moment at 250 ms | **FAIL** | controls 3: “um so like a website for my friend's sma”, “tap or hold to speak · ElevenLabs”, “Next” · competing 0:  · guidance 2: “Say it or type it”, “voice by ElevenLabs” | bug fixer |
| the idea paper, the tidy moment at 1100 ms | **FAIL** | controls 3: “A website for my friend's small bakery, ”, “tap or hold to speak · ElevenLabs”, “Next” · competing 0:  · guidance 2: “Say it or type it”, “voice by ElevenLabs” | bug fixer |
| the idea paper, the tidy moment at 2200 ms | **FAIL** | controls 3: “A website for my friend's small bakery, ”, “tap or hold to speak · ElevenLabs”, “Next” · competing 0:  · guidance 2: “Say it or type it”, “voice by ElevenLabs” | bug fixer |
| her name tag (setup, paper) | **FAIL** | controls 6: “Priya”, “Product”, “Your own craft”, “I love…”, “tap or hold to speak · ElevenLabs”, “Make my tag” · competing 0:  · guidance 2: “Type it or say it”, “voice by ElevenLabs” | bug fixer |
| meeting the team | PASS | controls 1: “Next” · competing 0:  · guidance 0:  |  |
| meeting the team: the next card's entrance at 120 ms | PASS | controls 1: “Next” · competing 0:  · guidance 0:  |  |
| meeting the team: the next card's entrance at 350 ms | PASS | controls 1: “Next” · competing 0:  · guidance 0:  |  |
| meeting the team: the next card's entrance at 700 ms | PASS | controls 1: “Next” · competing 0:  · guidance 0:  |  |
| meeting the team: the next card's entrance at 1300 ms | PASS | controls 1: “Next” · competing 0:  · guidance 0:  |  |
| the reveal, 300 ms after the last teammate | PASS | controls 1: “Cycle tap for day” · competing 0:  · guidance 0:  |  |
| the reveal, 1200 ms after the last teammate | PASS | controls 3: “Cycle tap for day”, “Write the idea”, “tap or hold to speak · ElevenLabs” · competing 0:  · guidance 0:  |  |
| the reveal, 2200 ms after the last teammate | PASS | controls 3: “Cycle tap for day”, “Write the idea”, “tap or hold to speak · ElevenLabs” · competing 0:  · guidance 0:  |  |
| the reveal, 3200 ms after the last teammate | PASS | controls 3: “Cycle tap for day”, “Write the idea”, “tap or hold to speak · ElevenLabs” · competing 0:  · guidance 0:  |  |
| the reveal, 4800 ms after the last teammate | PASS | controls 3: “Cycle tap for day”, “Write the idea”, “tap or hold to speak · ElevenLabs” · competing 0:  · guidance 1: “Bo starts once you agree the page” |  |
| the room, empty | PASS | controls 3: “Cycle tap for day”, “Write the idea”, “tap or hold to speak · ElevenLabs” · competing 0:  · guidance 1: “Bo starts once you agree the page” |  |
| idea sheet, glance (sketched) | **FAIL** | controls 7: “Cycle tap for day”, “Browse breads”, “Pick loaf”, “Choose pickup time”, “Order”, “Nothing needs you yet”, “0 1 2 3 4 5 6 7 8 9 decisions came up” · competing 0:  · guidance 1: “Bo starts once you agree the page” | bug fixer |
| idea sheet, open large | **FAIL** | controls 8: “Cycle tap for day”, “Browse breads”, “Pick loaf”, “Choose pickup time”, “Order”, “Confirmed”, “Nothing needs you yet”, “0 1 2 3 4 5 6 7 8 9 decisions came up” · competing 0:  · guidance 1: “Bo starts once you agree the page” | bug fixer |
| team working | **FAIL** | controls 8: “Cycle tap for day”, “classes”, “a class”, “confirm”, “booked”, “regulars”, “Nothing needs you yet”, “0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 ” · competing 0:  · guidance 1: “Bo starts once you agree the page” | bug fixer |
| seat panel design, empty | **FAIL** | controls 1: “Back to the room” · competing 3: app-button, time-pill, inbox · guidance 1: “Mika joins once the team gets going.” | bug fixer |
| seat panel design, full | **FAIL** | controls 1: “Back to the room” · competing 4: replay-label, app-button, time-pill, inbox · guidance 0:  | bug fixer |
| seat panel research, empty | **FAIL** | controls 1: “Back to the room” · competing 3: app-button, time-pill, inbox · guidance 1: “Noor joins once the team gets going.” | bug fixer |
| seat panel research, full | **FAIL** | controls 1: “Back to the room” · competing 4: replay-label, app-button, time-pill, inbox · guidance 0:  | bug fixer |
| seat panel data, empty | **FAIL** | controls 1: “Back to the room” · competing 3: app-button, time-pill, inbox · guidance 1: “Theo joins once the team gets going.” | bug fixer |
| seat panel data, full | **FAIL** | controls 1: “Back to the room” · competing 4: replay-label, app-button, time-pill, inbox · guidance 0:  | bug fixer |
| seat panel strategy, empty | **FAIL** | controls 1: “Back to the room” · competing 3: app-button, time-pill, inbox · guidance 1: “Ines joins once the team gets going.” | bug fixer |
| seat panel strategy, full | **FAIL** | controls 1: “Back to the room” · competing 4: replay-label, app-button, time-pill, inbox · guidance 1: “Ines carries on once you've answered the” | bug fixer |
| seat panel engineering, empty | **FAIL** | controls 1: “Back to the room” · competing 3: app-button, time-pill, inbox · guidance 1: “Bo joins once the team gets going.” | bug fixer |
| seat panel engineering, full | **FAIL** | controls 1: “Back to the room” · competing 4: replay-label, app-button, time-pill, inbox · guidance 0:  | bug fixer |
| her workspace, empty | **FAIL** | controls 1: “Back to the room” · competing 3: app-button, time-pill, inbox · guidance 3: “You’ll say it on the idea sheet; it show”, “The team gets going once you’ve said you”, “They come from your answers to the team’” | bug fixer |
| her workspace, full | **FAIL** | controls 1: “Back to the room” · competing 4: replay-label, app-button, time-pill, chatter-line · guidance 0:  | bug fixer |
| inbox collapsed, nothing waiting | **FAIL** | controls 8: “Cycle tap for day”, “classes”, “a class”, “confirm”, “booked”, “regulars”, “Nothing needs you yet”, “0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 ” · competing 0:  · guidance 1: “Bo starts once you agree the page” | bug fixer |
| inbox, a new note | **FAIL** | controls 8: “Cycle tap for day”, “classes”, “a class”, “confirm”, “booked”, “regulars”, “Bo's blocked →”, “0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 ” · competing 0:  · guidance 1: “Bo starts once you agree the page” | bug fixer |
| inbox, a new note after its flight lands | **FAIL** | controls 8: “Cycle tap for day”, “classes”, “a class”, “confirm”, “booked”, “regulars”, “Bo's blocked →”, “0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 ” · competing 0:  · guidance 1: “Bo starts once you agree the page” | bug fixer |
| inbox drawer | **FAIL** | controls 14: “Cycle tap for day”, “classes”, “a class”, “confirm”, “booked”, “regulars”, “0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 ”, “Close your inbox”, “Noor asks Full classes: waitlist or "ful”, “”, “”, “on”, “on”, “on” · competing 0:  · guidance 0:  | bug fixer |
| Focus 1 (Noor’s finding) | **FAIL** | controls 6: “All notes”, “Back to the room”, “Say it or type it. Take your time; send ”, “tap or hold to speak · ElevenLabs”, “Add this”, “Send” · competing 0:  · guidance 2: “Add this keeps a thought”, “Send when you” | bug fixer |
| Focus 1, her answer typed | **FAIL** | controls 6: “All notes”, “Back to the room”, “It’s really for the regulars.”, “tap or hold to speak · ElevenLabs”, “Add this”, “Send” · competing 0:  · guidance 2: “Add this keeps a thought”, “Send when you” | bug fixer |
| Focus 1 meeting: round 1 (discussing) | **FAIL** | controls 8: “All notes”, “Back to the room”, “Show the replies here”, “Say it or type it. Take your time; send ”, “tap or hold to speak · ElevenLabs”, “Add this”, “Send”, “End meeting” · competing 0:  · guidance 2: “Add this keeps a thought”, “Send when you” | bug fixer |
| Focus 1 meeting: three rounds | **FAIL** | controls 8: “All notes”, “Back to the room”, “Show the replies here”, “Say it or type it. Take your time; send ”, “tap or hold to speak · ElevenLabs”, “Add this”, “Send”, “End meeting” · competing 0:  · guidance 2: “Add this keeps a thought”, “Send when you” | bug fixer |
| Focus 1 meeting: End meeting, then long takeaways (~60 words) | **FAIL** | controls 4: “All notes”, “Back to the room”, “Show the replies here”, “Keep” · competing 0:  · guidance 0:  | bug fixer |
| Focus 2 (Mika’s journey in words) | **FAIL** | controls 6: “All notes”, “Back to the room”, “Say it or type it. Take your time; send ”, “tap or hold to speak · ElevenLabs”, “Add this”, “Send” · competing 0:  · guidance 2: “Add this keeps a thought”, “Send when you” | bug fixer |
| Focus 2 meeting: one round, End meeting, takeaways | **FAIL** | controls 4: “All notes”, “Back to the room”, “Show the replies here”, “Keep” · competing 0:  · guidance 0:  | bug fixer |
| unblock card, asking | **FAIL** | controls 10: “Cycle tap for day”, “classes”, “a class”, “confirm”, “booked”, “regulars”, “Back to the room”, “All notes”, “Yes”, “Say something else” · competing 0:  · guidance 0:  | bug fixer |
| unblock card, speaking | **FAIL** | controls 11: “Cycle tap for day”, “classes”, “a class”, “confirm”, “booked”, “regulars”, “Back to the room”, “All notes”, “typed”, “Yes”, “Say it again” · competing 0:  · guidance 0:  | bug fixer |
| unblock card, yes | **FAIL** | controls 8: “Cycle tap for day”, “classes”, “a class”, “confirm”, “booked”, “regulars”, “”, “0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 ” · competing 0:  · guidance 1: “Bo starts once you agree the page” | bug fixer |
| team space | **FAIL** | controls 9: “Cycle tap for day”, “classes”, “a class”, “confirm”, “booked”, “regulars”, “Noor has a question →”, “0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 ”, “Team notes · 2” · competing 0:  · guidance 1: “Bo starts once you agree the page” | bug fixer |
| team space, a decision open | **FAIL** | controls 9: “Cycle tap for day”, “classes”, “a class”, “confirm”, “booked”, “regulars”, “Noor has a question →”, “0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 ”, “Team notes · 2” · competing 0:  · guidance 1: “Bo starts once you agree the page” | bug fixer |
| her page, built (room) | **FAIL** | controls 5: “Open the app v1, 2 h ago”, “Cycle tap for day”, “sketch”, “screens”, “page” · competing 0:  · guidance 1: “v1, 2 h ago” | bug fixer |
| her page, built, sheet open large | **FAIL** | controls 6: “Open the app v1, 2 h ago”, “Cycle tap for day”, “Browse breads”, “Pick loaf”, “Choose pickup time”, “Order” · competing 0:  · guidance 1: “v1, 2 h ago” | bug fixer |
| the close (from the room, after the run) | **FAIL** | controls 8: “Open the app v1, 2 h ago”, “Cycle tap for day”, “sketch”, “screens”, “page”, “Type the idea”, “tap or hold to speak · ElevenLabs”, “Build it →” · competing 0:  · guidance 1: “v1, 2 h ago” | bug fixer |
| app button, no app yet | **FAIL** | controls 5: “Cycle tap for day”, “Write the idea”, “tap or hold to speak · ElevenLabs”, “Nothing needs you yet”, “– decisions came up – brought to you” · competing 0:  · guidance 1: “Bo starts once you agree the page” | bug fixer |
| app button, building | PASS | controls 3: “Cycle tap for day”, “Nothing needs you yet”, “0 1 2 3 4 5 6 7 8 9 decisions came up” · competing 0:  · guidance 1: “Laying out the order page” |  |
| app button, ready | PASS | controls 2: “Open the app v1, 3 min ago”, “Cycle tap for day” · competing 0:  · guidance 1: “v1, 3 min ago” |  |
| app button, new version pulse | PASS | controls 2: “Open the app v2, just now”, “Cycle tap for day” · competing 0:  · guidance 1: “v2, just now” |  |
| /slides/ | PASS | controls 0:  · competing 0:  · guidance 0:  |  |

### The plain look (`?look=plain`, the fallback), 1920/1440/1280, day and night

The room, the idea sheet and journey, the team working, her page and the setup pages work. The plain look keeps its own bold sticker style: weight 600 throughout, no night grade. The fallback is not held to the painted taste rules, so its weights and grey buttons are counted, not failed. These break its use:

| # | FAIL | Evidence | Owning files | Owner |
|---|---|---|---|---|
| P1 | **The meeting is stuck in plain.** After her first Send, the right column loses the field, Send, End meeting and the conversation; only the help line stays. The team's replies land as raw lines inside the research card, with a stray count ("2", "6"). She cannot see how to send another round or end the meeting. (The takeaways do show once End meeting is triggered.) | `design/studio/qa/audit-0430/plain/1920x1130-day-09-focus1.jpg` (before Send, fine), `design/studio/qa/audit-0430/plain/1920x1130-day-09-meeting-r1.jpg`, `design/studio/qa/audit-0430/plain/1920x1130-day-09-meeting-r3.jpg`, `design/studio/qa/audit-0430/plain/1920x1130-day-09-focus1-takeaways.jpg` | focus-doc.js · room.css / polish.css (the meeting column has no plain styles) | mitigated on 4afbc95: REHEARSAL.md now says the meeting's fallback is R, not plain (69f0bfb); the plain styling itself is still open |
| P2 | **The unblock card is unstyled in plain.** It's a full white sheet with a grey browser-default "Back to the room" bar, run-together text ("Bo's blockedSetting up ordering") and tiny default Yes / Say something else buttons | `design/studio/qa/audit-0430/plain/1920x1130-day-11-unblock-asking.jpg` | inbox.js · room.css / polish.css | (to route) |
| P3 | **The inbox drawer is unstyled in plain.** It covers the room as a blank white sheet, with grey default bars ("Close your inbox", the item), a native ▶ and native checkboxes | `design/studio/qa/audit-0430/plain/1920x1130-day-08-drawer.jpg` | inbox.js · room.css / polish.css | (to route) |
| P4 | The collapsed inbox's "Nothing needs you yet" is a grey ButtonFace button in the room (minor) | `design/studio/qa/audit-0430/plain/1920x1130-day-06.jpg` | inbox.js · room.css | (to route) |

Plain passes: the room (`design/studio/qa/audit-0430/plain/1920x1130-day-03.jpg`), the team working (`design/studio/qa/audit-0430/plain/1920x1130-day-06.jpg`), her page at 1280 (`design/studio/qa/audit-0430/plain/1280x800-day-13-her-page-open.jpg`), and no painted layers loaded.

**Also passing, by size** (no hard flag; evidence under `design/studio/qa/audit-0430/painted/<size>-daynight/`, `<size>-<mode>-nametag/`, `1920x1130-<mode>/extras/`):
- **Day / night, all 3 sizes:**
  - The pill label matches the mode (Cycle, Day, Night).
  - Within 1 s exactly one room video is at opacity 1 and playing.
  - No teammate patch is frozen.
  - The mode survives a reload.
  - 4 quick clicks during an R replay land on the right mode.
- **Sound, all 3 sizes:**
  - Day is silent, and the window is hidden.
  - At night rain.mp3 plays.
  - The record cycles piano → electronic → chiptune → off, with no rain track.
  - The window toggles only the rain; the music keeps playing.
  - Both choices survive a reload.
  - `?stage=1` is silent until a tap.
- **The mic, all 3 sizes:** idle, listening and writing are all ink-paper (fake microphone, stubbed speech-to-text).
- **Her name tag, all 3 sizes, day and night, spin and fallback:**
  - The form is gone after Enter.
  - The pen writes the name, then the title.
  - It keeps one size: 904×825, 720×657 and 640×584.
  - The fallback says plainly that the tag is in her own words.
- **Art at 1:1, day and night:** no anatomy artefacts.
- **The toys:** readable reactions with no jitter (the lights' reaction is subtle).

**Frame rate** (`design/studio/qa/perf/AB.md`; headed Chromium, software GL, which is pessimistic):
- The painted room runs ~15 fps by day and ~10 fps at night mid-run; plain runs at 60.
- The main thread is idle, so the cost is compositing the living painting's masked, graded video layers.
- Pausing the patches did not help (design/living-perf, not for merge). The fix is with the living designer.
- Not checked on the demo Mac: Vincent's 07:00 check with the FPS meter.

**Not checked here:**
- Live model calls: the tidy's real wording, the name tag's real spin and the meeting's real replies. The design lead ran one live name tag (2.8 s); everything else is "not checked live".
- Safari and Firefox.
- A real Mac GPU.
- RUN-LOCALLY.md and REHEARSAL.md command by command: the lead's §7; only the in-browser fallbacks are checked here.
- The full `npm run doctor`, which makes model calls.
- Fallback B (company Claude Code).
