# Jank sweep

Builder 7, Sat night into Sun. **Sweep 1** ran on main 6c1df0f / 6008ee6 with `?look=painted`, at 1440×900, 1280×800 and
1920×1130 (deviceScaleFactor 1). It covered one real run (claude-code backend) and one R replay of `runs/rehearsal`.
Screenshots are in `docs/jank/`, with the full set in the sweep's scratch folder. Owners: **DESIGN** (looks: placement,
styling) and **BUILD** (behaviour or copy). Skipped as owned elsewhere: empty sketchpads and the workspace's "Not said
yet" (b1), and Focus 1 and the phone rule (b3).

Status key: **fixed** (pushed on `build/questions`, real e2e attached on handover) · **sent** (with the design
studio) · **open**.

| # | What | Where (component · state) | Screenshot | Size | Owner | Status |
|---|---|---|---|---|---|---|
| 1 | **P0.** On painted she could not type her idea: `painted.css` hid `#her-form` (her input, the mic, Team go). Nothing was focused after the reveal, so typing the idea fired the shortcuts (S toggled stage mode, R started the replay). | `her-idea` · asking | `jank/idea-sheet-no-input-1440.jpg` → `jank/idea-sheet-input-fixed-1440.jpg` | all | BUILD (in a look) | **fixed** c8e91a9: shown while the room asks, focused; e2e checks it. Design may restyle it |
| 2 | **P0.** The name tag could block her for 25 s when the tag call was slow (Vincent's Mac). | `character-card` · thinking | `jank/nametag-before-1440.jpg` → `jank/nametag-after-1440.jpg` | all | BUILD | **fixed** c8e91a9: rough card at once (`data-state="rough"`), filled in place; flat schema |
| 3 | Chatter says the speaker twice: "Noor: Noor: guaranteed up to…". The log line already starts with the name. | `chatter-line` · in | `jank/chatter-name-twice-1440.jpg` | all | BUILD | **fixed** c8e91a9 (client strips it, so old recordings read right too) |
| 4 | A pin's reply reads "NoorYou're right…", and the source reads "…every weekBakery Business". | `pin-reply` · shown; finding `source` | `jank/focus-doc-unstyled-1440.jpg` | all | BUILD | **fixed** c4a8139 (a space between the slots) |
| 5 | The rough journey never shows on the table in painted. Once a question arrives, the team-status line ("Noor has a question for you → Open it") takes the journey's place in the clipped glance card (160 px). | `her-sheet` glance · `team-status` · question | `jank/team-status-hides-journey-1280.jpg` | all | DESIGN | sent |
| 6 | The team-status "Open it" button and Retry are browser-default grey buttons in painted. | `team-status` · question/failed | same | all | DESIGN | sent |
| 7 | The journey pills in the glance card are cut mid-word ("Choo…", "Chec"). | `her-sheet` glance · flow | `jank/idea-pills-clipped-1440.jpg` | all | DESIGN | sent |
| 8 | Team-space cards stack over Bo's body and the right-hand plant at 1920×1130 and 1440×900. | `team-space` · cards | `jank/team-space-over-bo-1920.jpg` | 1440, 1920 | DESIGN | sent |
| 9 | Meet the team in painted: a plain card with an empty avatar circle and no character. | `meet-card` | `jank/meet-card-empty-avatar-1440.jpg` | all | DESIGN | sent |
| 10 | While Mika and Noor draw the first sketch, nothing in the painted room shows that anyone is working (the `thinking` state is invisible on the pills). | `place-card` · thinking | `jank/no-thinking-sign-1920.jpg` | all | DESIGN | sent |
| 11 | The sketchpad panel covers the Afternoon/night pill (top left). | `sketchpad-open` | `jank/sketchpad-over-pill-1440.jpg` | 1440, 1280 | DESIGN | sent |
| 12 | Focus document in painted: the pins and pin replies are unstyled (a bare "1" with the text under it), "Read the conversation" and "Add this" are default buttons, and the source link is default blue. | `focus-doc` · replying/takeaways; `pin`; `fd-read` | `jank/focus-doc-unstyled-1440.jpg` | all | DESIGN | sent |
| 13 | R replays `runs/rehearsal`, recorded at 18:53: it has no unblock and no Focus 2, so the replay no longer matches the demo. At the end of the replay, her page did not appear in the shot. | `replay-label`; `page-sheet` | `jank/replay-end-no-page-1440.jpg` | all | BUILD | open: re-record from a fresh real run (asked the lead); page check to follow |
| 14 | "Nothing needs you right now · Open your inbox" sits on the rug from the reveal on, before anything has happened. | `inbox` · collapsed, empty | `jank/no-thinking-sign-1920.jpg` | all | BUILD (copy) | open, low |
| 15 | On load nothing is focused, so typing before clicking the name tag fires the shortcuts (R, S, B…). The name is prefilled "Priya". Kept on purpose: autofocusing her field would swallow R at the start, the demo's fallback. The presenter clicks her field first. | `character-card` · asking | — | all | BUILD | won't fix (noted in the run sheet) |

Still to sweep, after the P0: the rest of the real run on painted (Focus 2, the unblock, Team go with each
teammate's pad, the build and her page), then a re-sweep once painted is the default (~02:30).
