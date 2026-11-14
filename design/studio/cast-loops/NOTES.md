# Living painting test (cast-loops)

Page: `public/looks/comps/cast-loops.html` (autoplays; `?still=1` shows the rest frame).
Clips: `public/looks/cast/loops/` (webm + mp4 of each, plus the rest-frame JPGs). Everything is a file, so nothing calls fal at demo time.
Shots: `design/studio/shots/cast-loops/`.

## What it is
- **Layer 1, the room:** the afternoon painting as one 5 s ambient loop, with the same image as first and last frame.
  All five teammates breathe, Ines's tea steams, the cat's tummy rises, and the room itself stays still.
- **Layer 2, two patches:** 400 px crops around Mika and Bo, each with three 5 s mood loops (idle, working, thinking),
  all starting and ending on the same rest frame. They sit in place with a soft elliptical feather and switch mood every 5–10 s.
  A new mood takes over 0.18 s before the old clip ends, with a crossfade. That hides the small snap the model makes on its forced last frame.

## Models and cost (Vincent's fal account)
| Clip | Model | Price | Result |
|---|---|---|---|
| Scene loop | Wan 3.0 Prime i2v, 720p, 5 s, audio off | about $0.25 | **Used.** Everyone breathes; the room doesn't move |
| Scene loop | Kling v3 Pro i2v, 5 s, audio off | about $0.70 | Not used: nearly a still (only Mika's hand and a mouth move) |
| Mika idle / working / thinking | Wan 3.0 Prime | about $0.25 each | All used; on model, clear moods |
| Bo idle / thinking | Wan 3.0 Prime | about $0.25 each | Used |
| Bo working, try 1 | Wan 3.0 Prime | about $0.25 | Slow push-in to about 1.1x, then snaps back on the last frame. **Rescued** by stabilising against the background (`stabilise.py`) |
| Bo working, try 2 (new seed, "fixed tripod") | Wan 3.0 Prime | about $0.25 | Worse: zooms out and paints a new face on Ines. Thrown away |

Total about **$2.70** (8 Wan clips at $0.05/s × 5 s, plus 1 Kling clip at $0.14/s × 5 s).

## Measured (`measure.py`, mean abs difference on a 0–255 scale, clip versus painted rest frame)
- **Loop seam** (last frame against first frame): 0.9–1.4 on every clip, which is invisible. The end frame lands back on the rest frame.
- **Drift**: the room stays at the compression floor (about 4.5) on 6 of the 7 Wan patch clips and on the scene.
  The exception was Bo working: the typing prompt made Wan move the camera, twice.
- **Last-frame snap**: the forced end frame jumps 3–5 on most clips (Bo working: 12 after stabilising). You can see it if you look for it,
  and the 0.18 s handover crossfade covers it at mood switches.
- **Registration**: Wan crops the 1600×893 painting to 16:9 (1588×893 from x=6), and the page maps the patches to match.
  No seams are visible at 2x (`patch-edges-2x.jpg`).
- **File sizes**: the scene is about 650 KB, each patch clip 100–145 KB, and the whole folder with both formats is 3.1 MB.

## Not tested
Safari and Firefox playback, and long runs (over 30 min) for decoder hiccups. The recording tool captures frames unevenly,
so it only shows a mood switch frame by frame, not exactly as a viewer sees it.

## Heads-up: Ines's new look
The scene loop is painted from the afternoon studio as it was, so Ines appears in her old look. Vincent has since picked the explorer
(khaki hat with a feather, rolled map). Switching means repainting the scene with the new Ines, then remaking the scene loop:
one Wan clip, about $0.25 and a few minutes. The Mika and Bo patches are unaffected, as long as the repainted scene keeps them and the table where they are.
