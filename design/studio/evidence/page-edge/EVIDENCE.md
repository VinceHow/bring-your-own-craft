# Evidence: design/page-edge (AUDIT #8, her page off the left edge)
Cause: painted-fixes.css shifts #page-sheet left by --crop-x (right when the page stands alone in the room). Inside her
idea sheet opened large, which is already placed inside the window, the same shift pushed it 26 px past the left edge
at 1440 (23 px at 1280). Fix (painted.css, appended): inside the opened idea sheet the page sheet takes no shift.
Measured (page sheet box, left/right margins to the window): before 1440 −26 / 54, 1280 −23 / 48;
after 1440 54 / 54, 1280 48 / 48, 1920 124 / 124. The iframe keeps its own scale (unchanged).
Shots: `{1440,1280}-before-left-edge.jpg`, `{1440,1280,1920}-after-left-edge.jpg`, `1440-after-full.jpg`.
Tests: npm 282/0; page e2e painted 2/0, plain 2/0.

## AUDIT final F3 ("Your page" header clipped to "our page")
Same cause, so the same rule now applies anywhere inside her idea sheet, not only when it's opened large.
After: the header reads "Your page" in full: `F3-1280-header.jpg`, `F3-1440-header.jpg`, `F3-1920-header.jpg`.
Its left edge sits 48 px (1280), 54 px (1440) and 124 px (1920) inside the window.
Before: `F3-before-1280-audit.png` (the audit's own shot).
