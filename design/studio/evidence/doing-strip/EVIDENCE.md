# Evidence: design/doing-strip (AUDIT final F4, "the team at work" strip over her input, lingering)
Fix (painted.js only):
- The strip hangs 10 px under her sheet's actual bottom edge, measured each time it shows, so it follows the sheet as it grows.
- It steps aside while she's typing in her sheet.
- Each teammate's line is fresh for 6 s; nothing fresh, no strip.
- The pair turns every 4 s.
Measured (a probe on the live page, every 1.5 s), at 1920, 1440 and 1280:
- her idea form open: overlap with her sheet false, overlap with her input false, inside the window;
- while she's typing: hidden;
- 7 s after the last line: hidden;
- in the rehearsal the strip shows from 3 s to 11 s (Wren picturing, Mika drawing), then hides. Before, a line stayed ~2 minutes.
Kept: b3's copy and the bug fixer's CSS (unchanged).
Tests: npm 282/0; E2E_LOOK=painted beats 1a–1e/2b–2d 7/0; teamgo 5/0.
