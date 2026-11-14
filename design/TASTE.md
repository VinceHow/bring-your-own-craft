# Using taste-skill on our own room

Yes: the room is held to taste-skill (MIT, Leonxlnx/taste-skill), without installing it as a plugin.
Two ways: its design rules (`vendor/taste-skill/RULES-FOR-THE-ROOM.md`, from taste-skill 2.5.1) shaped `polish.css`,
and its browser checker (`scripts/consistency.mjs`) was run on the room itself, before and after polish.

## Rules applied in polish.css
| taste-skill rule | In the room |
|---|---|
| One display face plus one text face with fixed jobs | Archivo Black for seat names, headline, counter and meter; IBM Plex Sans for UI; IBM Plex Mono for her file and reasons. Nothing else |
| One spacing scale (4, 8, 12, 16, 24, 32…) | `--s1`…`--s6` for every padding and gap polish touches |
| One radius family, one card recipe | Corners ≤ 6px, 2px ink border, hard offset shadow on every card and sheet |
| Equal edges, everything on the same lines | Her file, her sheet and the tally share one top and one bottom edge |
| 90–95% neutral, one accent per surface | Paper and `#141414` ink; each seat's riso ink only on its own card, glyph, sheet and tags |
| Red for one meaning only | `.fl-status` moved from red to ink; red stays for stamping |
| Contrast: labels 4.5:1, yellow takes ink | Seat tags on pink and orange now take ink text (white read 2.8–3.1:1); citations darkened |
| Visible keyboard focus | Flow boxes, options and the counter get a 3px ink ring (pink read 2.9:1 on paper) |
| No baked-in text, no gradients, no violet | Grain is an inline SVG noise filter in the paper and table, never over a sheet |

## The checker, before and after
`consistency.mjs <room> --widths 1600,1280 --page software` on the fixture run (`?fixture=1&stage=1`), headless Chromium.
"After" is the same page with `polish.css` loaded last. Logs and crops were kept out of the repo (scratch).

| | FAIL | WARN |
|---|---|---|
| Before (main, no polish) | 37 | 24 |
| First polish pass (grain overlay over everything) | 40 | 22 |
| After the fixes below | **33** | 23 |

**Fixed (real breakages):** text-contrast on the seat tags (4 FAIL → 0), focus-visible on her flow (3 → 0),
the first pass's grain overlay putting grain under words (busy-ground and contrast on the small sheets: moved the
grain into the paper and table only).

**Kept by design (the checker judges a marketing page; the room is a stage):**
- `tilt`, `button-shape`: cards and sticky notes land tilted 1–3°, which BRIEF §3 asks for.
- `nav`, `cta`, `copy-fact`, `copy-*`, `nav-family`, `page-meta`, `share-meta`, `skip-link`: no nav bar, hero action or
  marketing copy on a demo stage.
- `cut-text` on the rolling digits, `hidden-content`, `busy-ground` and `contrast` on `#came`/`#brought`: the counter
  rolls by moving a column of 0–9 inside a mask; the checker measures the hidden digits. On screen only the right
  digit shows.
- `cut-text` and `contrast` on the small sheets' citations: teammates' sheets are glanceable and end lines in an
  ellipsis by design (full text in the title); the checker measures the clipped tail over the table.
- `visual-caption` on "Researched before the demo": that label is required by the brief.

Not run: the checker's scroll sweep (`--no-sweep`; the room never scrolls) and widths under 1280 (stage only).
