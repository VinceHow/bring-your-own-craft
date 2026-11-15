# Tidy evidence (builder 8, Sun 15 Nov, POLISH.md §2)

Walked by `scripts/tidy-evidence.mjs` against a local server, painted look, 1920×1130 and 1440×900:
`node scripts/tidy-evidence.mjs http://localhost:<port> docs/evidence/tidy`.

- `tidy/` uses a stubbed `/api/tidy` (0.7 s), run at about 03:25 UTC on the final code: 66/68 PASS. Full list in `tidy/results.json`.
- `tidy-fal/` used the real tidy on fal (`MODEL_BACKEND=fal`, `FAL=1`), run 03:15:42–03:16:51 UTC, before the
  "I" capital fix: 66/68 PASS. Every real tidy came back `cut`. Four screenshots kept, plus `results.json`.
- The 2 FAILs, in both runs and at both sizes: an empty Enter on the idea card moves on, where the card should stay
  and say what's needed. That's builder 7's idea card, not the tidy.

Per surface (idea card, name tag, her sheet's idea line and a line, a focus piece and one by mic, the meeting's
You turn, Bo's unblock answer by mic, the close):
- `data-state` goes to tidying within 300 ms of Enter (12–35 ms measured).
- Then tidied, with `data-raw` and `data-tidy`.
- 300 words and a pasted paragraph: no page scrollbar, and the field stays on screen.
- An empty Enter does nothing (on the close).
- No console errors, and no "undefined" on screen.

Screenshots per surface and size: `*-tidying.jpg` (her raw words), `*-moment.jpg` (design's ink, mid-play), and
`*-tidied.jpg` (settled, 2 s later).

A failed or unchanged tidy (her words stand, marked `skipped`, no error shown) is covered by `e2e/tidy-all.e2e.js`.
