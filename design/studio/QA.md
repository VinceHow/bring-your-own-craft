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
   - contrast under 4.5:1.
4. **Selectors** only on `data-component` / `data-slot` / `data-state` (docs/COMPONENTS.md), never class names.
5. **The handover message** lists the screenshot paths, the sizes checked, and anything not checked.

**Design QA (a separate designer from the fixers)** walks the whole painted flow end to end after every merge to
main, from the name tag to the close, using the replay (R) and one real run. It files findings in `docs/JANK.md`
next to builder 7's sweep, marked `[design]`, with a screenshot path and a size.
