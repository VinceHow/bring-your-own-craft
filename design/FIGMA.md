# Room polish: Figma frames and evidence

## Figma file (code → Figma)
**File:** https://www.figma.com/design/EwqOeVqbMUWXHEzM6pqOvB — "Bring your own craft: room", in Vincent's account (team OYS).
Vincent had no frames of his own, so the room went the other way: from the running code into Figma, for him to tweak.

| Frame | Node | What it is |
|---|---|---|
| Room · walk-in, five seats | `2:2` | The empty table, four teammates seated with their stances, her seat, her file, her blank sheet |
| Room · her three arrive (fixture run) | `4:2` | Mid-run: teammates' sheets, her file lines, her flow with a fork and a pin, counter and meter |
| Priya's flow with a fork | `3:2` | Her sheet on its own: four boxes, the Research fork, the Product pin on confirm |
| Her built page | — | **Not made.** No built page exists on any branch yet (`build/page` has only the slot schema). Add it once the first fill runs |

**What went code → Figma:**
- **Tokens:** a "Room tokens" variable collection: `ink/paper`, `ink/sheet`, `ink/table`, `ink/ink`, the five seat inks, `ink/stamp`, and `space/s1`…`s6`, `space/radius`, `space/shadow`. Every fill, stroke and text colour that matches a token is **bound to the variable**, so recolouring a seat ink in Figma recolours every card, tag and edge that uses it.
- **Layout:** each box, text run and glyph was measured in the browser (`design/figma-tools/extract.js`, Playwright on the real room, stage mode, polish.css on) and rebuilt as editable Figma layers (`design/figma-tools/builder.js`, via the Figma connector's plugin API) at the same position, size and tilt. Hard offset shadows are drop shadows with 0 blur, corners as in CSS, one-sided borders as per-side strokes.
- **Type:** Archivo Black, IBM Plex Sans and IBM Plex Mono at the room's sizes, weights, tracking and case. The riso misregistration is a real second text layer named `misregistration`, offset and translucent, so it can be moved or dropped.
- **Glyphs:** the five seat glyphs and her flow's arrows are imported from the room's own SVG.

**Not carried over:** the paper grain (a screen overlay, not a layer), the table's halftone dots, the small square bullets on the teammates' sheets, and motion. The fixture's text is fake (labelled "fixture, not real" as in the room).

**Why not Figma's HTML import:** its upload host (mcp.figma.com) is blocked by this container's network policy, so the frames were drawn through the plugin API instead.

## Figma → code (round trip)
Nothing back yet. When Vincent tweaks the file, each change read back from Figma (variables, frames) and what it changed in `polish.css` gets a row here.

| Figma change | Read back how | Change in the room |
|---|---|---|
| (waiting for Vincent) | | |

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
