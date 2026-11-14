# The living room (cast-living)

Page: `public/looks/comps/cast-living.html`. Assets are in `public/looks/cast/living/` (about 23 MB, webm + mp4 of each clip). Everything plays from local files: nothing calls fal and the page works offline.
Shots are in `design/studio/shots/cast-living/`. Tools are in this folder: `qc.py` (per-clip checks), `masks2.py` (masks), `light.py` (colour fits per time of day), `stabilise.py`.

## What it is
- **Paintings:** a corrected afternoon painting (one empty seat, the pink stool; Ines as the explorer; a clear table; no bakery model) made with fal-ai/nano-banana-pro/edit. Morning, building and evening are edits of that painting. All four line up within 0.06 px.
- **Ambient loops:** one Wan 3.0 loop per time of day, with the same image as first and last frame. The seam is 1.4/255 and the room stays still.
- **Patches:** 5 teammates × 8 moods (idle, working, thinking, talking, delighted, note, signature, celebrating), plus record player, cat and coffee machine. Each is a 5 s Wan clip cut from the afternoon painting, starting and ending on its rest frame.
- **Masks:** each teammate's own motion plus their body and props, limited to their own territory. The edge is hard where two teammates meet and soft only over wood, wall or chair.
- **Other times of day:** a fitted colour matrix per teammate (an SVG feColorMatrix) grades the afternoon patches. I checked evening and morning at full size and found no visible seam (`step4-grade-zoom-evening-morning.jpg`).

## Product rules in the page
- **Moods come only from run events:** `living.run({type, who, text})`, where type is start, think, idle, say, found, done or milestone. There is no randomness.
  - The comp plays a prepared sample run (DEMO.md lines where they exist), labelled as prepared in `?notes=1`.
  - A mood starts at the next clean clip boundary, so a slip can appear up to 5 s after its event. That keeps every swap seamless.
- **Focus wins:** `living.focus(true)` holds everyone idle, disables the clickables and ducks the music.
- **Clickables:** record player (each click moves to the next track: electronic, chiptune, piano, then off; never autoplays), cat (stretch clip plus hearts), coffee machine (brew clip plus steam), string lights (a glow drawn in code, toggled on click).
- **Overlays:** slips and cards sit on solid paper. The time label, the review card and the review keys appear only with `?notes=1`.

## QC (all 43 clips)
- **41 pass:** first and last frame match the rest frame; no camera drift; no clipping into the table, chairs, props or neighbours.
- **Fixed for free:** all 8 Ines clips, plus the record player and coffee machine, came out about 1.5 px off the painting. I re-aligned them to the background in post.
- **Fail (1), redone:** Ines "note" held the note in front of Theo. One approved redo ($0.25) has the note held at the chest.
  - The redo leaves the note on the book and drops it on the last 2 frames. I faded the last 0.7 s into the rest frame, so it dissolves instead of popping.
- **Nit:** Noor "celebrating" hides the face behind the book for about a second. Kept.
- **Weak:** the record player's tonearm barely moves; the record does turn.

## Not tested
- Safari and Firefox.
- Long runs.
- Clicks checked once in Chromium (`step4-clicks.jpg`): the cat stretches with no seam, the coffee machine steams, the record player's arm moves and the string lights glow.
- Music: playback starts on the click in code, but sound can't be heard in a headless browser, so it is unconfirmed by ear.
