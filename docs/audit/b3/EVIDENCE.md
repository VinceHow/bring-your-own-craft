# b3 polish evidence: room · inbox · meeting · action page · Team go · build

Real browser (Chromium), painted look, at 1920×1130 and 1440×900, stubbed run routes (no model), Sun 15 Nov.
Script: `docs/audit/b3/walk.cjs` (run: start the server, then `node docs/audit/b3/walk.cjs docs/audit/b3 http://localhost:<port>`).
Result: `walk-result.txt` — 80 PASS / 0 FAIL. Screenshots: `<size>-<n>-<state>.jpg` in this folder.

| POLISH.md | What was checked (both sizes) | Evidence |
|---|---|---|
| §1 one thing | Meeting: Send `data-rank=primary`, End meeting secondary. Unblock page: Yes primary, "Say something else" secondary. A failed Team go is said once (the step note stays hidden). | 5, 6, 9, 2 |
| §3 calm motion | The meeting column glides to new replies and to the takeaways (instant under reduced motion); the open inbox fades in (220 ms). End → takeaways lands the column on them. | 6, 8 (+ beats 2c) |
| §4 300 ms | Team go status 29–36 ms; meeting Send "The team is reading…" 35–40 ms; End → "writing the takeaways…" at once | walk-result.txt |
| §4 failure + way on | Team go failure: plain line + Retry. Send while the team still replies: words back in the box + why. A stopped first build: "Build again". | 2, 7, 10 |
| §4 Esc / back | Esc closes the open inbox and the meeting; the unblock page returns to the room after Yes | walk-result.txt |
| §1 + §4 inbox | Top right; "Nothing needs you yet" → "Noor has a question →" (no question text anywhere in the room). Closed: exactly ONE clickable (the line; the tally is display-only). The full inbox in two clicks: the line opens the item, its header's "All notes" opens the inbox (the whole screen). Empty and open: "When a teammate needs a call from you, it lands here." | 1, 3, 4 |
| §5 nothing broken | No page scrollbar, no "undefined"/"NaN", no cut-off text in these components, every b3 element fully on screen (inbox, focus doc, live step, team status, app button). Console: only the 500/404/409 the stubs inject. | walk-result.txt |

Fixes this pass made to get there: the focus doc and the live step were pushed past the window's left edge by the painted
look's scaled room (−19 px / cut "The"); both now pull back inside.

Real model: ONE fal smoke, a single meeting round (lib/meeting.js round → runThread on fal): first reply 1.8 s.
Not covered here: 1280×800, night scene, the magic-moment clips (§3 scoring), b7's inputs (§2), b8's tidy.
