# Design QA: the bar before anything goes to the merger

Vincent, 14 Nov (~23:25 UTC): "I don't want to flag them one by one." Every designer does this on the MERGED tree
(their change applied to current origin/main), in a real browser, before handing over. Attach the screenshots.

1. **Sizes and times.** Walk every state you touch, and the screens next to it, at **1920×1130** (Vincent's
   window), **1440×900** and **1280×800**, by day and by night.
2. **Open everything.** Every seat panel (all five teammates and hers), every tray/inbox note, every focus
   document, the unblock card, her page and the close. Check each empty and full.
3. **Check every screenshot for:**
   - visible scrollbars or white frames;
   - clipped painted frames;
   - text touching an edge;
   - panels mostly empty;
   - anything floating detached from what it belongs to;
   - default browser controls (grey buttons, square inputs);
   - blank or uninformative states (Vincent can't tell what's happening);
   - contrast under 4.5:1;
   - the room not covering the viewport (dark bands, the floor or her stool cut off), or edge UI outside the visible area;
   - toys that shake or jitter when clicked instead of a deliberate, readable reaction;
   - generated art with anatomy artefacts (paws, hands, faces, extra limbs), checked at 100% zoom.
4. **Selectors** only on `data-component` / `data-slot` / `data-state` (docs/COMPONENTS.md), never class names.
5. **The handover message** lists the screenshot paths, the sizes checked, and anything not checked.

**Design QA (a separate designer from the fixers)** walks the whole painted flow end to end after every merge to
main, from the name tag to the close, using the replay (R) and one real run. It files findings in `docs/JANK.md`
next to builder 7's sweep, marked `[design]`, with a screenshot path and a size.

## Magical and simple: the bar for every screen (Vincent, 15 Nov)
Above all the opening (door → idea → tidy → name tag → meet the team), every screen must feel magical and simple: she does
exactly ONE thing per screen.
1. **One action.** Exactly one primary thing to do is visible (one input or one button). Anything else competing for
   attention (counters, pills, hints, toolbars, chatter, the app tag, previews) is hidden on that screen. Secondary things
   appear only when needed. Hiding beats restyling.
2. **One line of guidance at most.** Cut every sentence not needed to do the one thing.
3. **The magic moments land.** Score each "magical / fine / flat" with a still or a short clip; fix anything flat:
   the door (the plaque reads before it opens), the tidy (her words visibly rearrange, unhurried, never a flicker;
   a skipped tidy never glitches), the handwritten name tag, each meet card's entrance.
4. **Nothing distracts.** No jitter, layout shift, overlap, scrollbars or default browser controls.
