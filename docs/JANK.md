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
20. [design] **Art at 1:1 is clean.** No extra limbs or paws, and no broken hands or faces, on Mika, Noor, Theo, Ines, Bo, the cat, the coffee machine or the record player, day or night. One small thing: the idea sheet's paper covers Bo's hand on the laptop.
    - Shots: `design/studio/qa/2026-11-14-23-36/1920x1130-*/extras/art-*.jpg`
    - Where: 1920x1130 day and night
    - Hook: `[data-component="idea-sheet"]`
    - Fix: optional; nudge the sheet about 40px left or down so Bo's hand shows.
21. [not on main yet] `[data-component="app-button"]` and the custom cursor are not on this build. The walk checks for them and will shoot their states once they land.
22. [content, for builder 7, reported by the lead] **On the rehearsal replay, the focus doc's labels run together.** Journey step labels carry a stray digit ("Browse breads1", "Choose pickup time2"), and the teammate name is glued onto its line ("NoorWarm bread…", "MikaNoor, I'd lead…"). Seen at about 45–60 s into the replay on main. This is the same missing-separator pattern as finding 2's "7:05Sam" and "weekBakery Business".
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
31. [design] **Pin replies put the colon on its own line.** They read "Noor / : / That matches the finding…" over three lines.
    - Shots: the same three
    - Hook: `[data-component="pin-reply"] [data-slot="who"]`
    - Fix: `who` inline with the text ("Noor: …"), or drop the colon and keep `who` as a small label above.
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
