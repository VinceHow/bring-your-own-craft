# Room polish: Figma frames and evidence

## Figma frames
**Not found yet.** The Figma connector is signed in as Vincent, but it has no way to search his files by name, and no
file link was in the repo or the brief. The lead has been asked for the link (14 Nov, ~12:30). When it arrives, this
section gets: each frame's link, what was taken from it (tokens, layout, type), and where his frames overrule §3.

Until then the polish follows `BRIEF.md` §3 (risograph room) only.

## What changed (`public/polish.css`, loads last, overrides only)
| Area | Change | Why |
|---|---|---|
| Fit | The 1600×900 room is centred by its midpoint, not by grid centring | **Fixes a break on main**: at 1280×720 the room overflowed right and the counter and meter were cut off |
| Paper | Inline SVG `feTurbulence` grain (≈400 bytes, no image), multiplied over the room at 16% | Printed stock, not a flat screen fill |
| Misregistration | Seat names, glyphs and her file's title carry a 2px offset ghost in ink; the headline, the counter's "came up" and the meter's % carry a pink second pass, 2–4px out of register | The riso look, kept to the display type so body text stays clean |
| Edges | Her file, her sheet and the tally share one top (372px) and bottom (792px) | Three columns read as one row |
| Spacing | One 4px scale (`--s1`…`--s6`) for paddings and gaps in cards, sheets, file, counter and meter | Consistent rhythm |
| Back-of-room legibility | Counter numbers 54→64px, meter 124→132px, counter labels 600 weight, meter bar 22px, small sheet lines 12.5→13px (14px in stage mode), card notes 13px (14px in stage) | Read from the back of a room |
| Small sheets | Titles stay on one line; the "to her" tag is pinned right and never clipped (it read "t…" before) | Clipped labels |
| (removed) | The `.fl-box` stopgap is gone: main's flow.js fix (b2f4f46) brings the boxes and their landing motion back |

Banned list checked: no gradients, glass, purple, emoji, sparkles, chat bubbles, spinners or pop-ups added.

## Screenshots (1600×900, deviceScaleFactor 2, stage mode, fixture run `F` at speed 4, labelled FAKE RUN)
| | Before (main @ 8f83d64) | After |
|---|---|---|
| Walk-in, team seated | `screens/before-walkin.png` | `screens/after-walkin.png` |
| Her sheet with asks | `screens/before-sheet-close.png` | `screens/after-sheet-close.png` |
| Whole room, counter and meter | `screens/before-tally.png` | `screens/after-tally.png` |
| Counter and meter, close | `screens/before-tally-close.png` | `screens/after-tally-close.png` |

Shots are of the fixture (fake) run, not a real one. "After" PNGs are reduced to 128 colours to keep the repo small.
Also checked by eye at 1280×720 (stage mode): whole room fits, nothing clipped except her flow's lower fork (below).

## Not tested
Non-stage mode at 1280×720 beyond one look; the walk-in mid-animation; the build and page beats (no fixture events for
them yet); real (non-fixture) runs; any browser but Chromium.
