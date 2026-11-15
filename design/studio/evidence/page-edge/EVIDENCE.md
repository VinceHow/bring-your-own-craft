# Evidence: design/page-edge (AUDIT #8, her page off the left edge)
Cause: painted-fixes.css shifts #page-sheet left by --crop-x (right when the page stands alone in the room). Inside her
idea sheet opened large, which is already placed inside the window, the same shift pushed it 26 px past the left edge
at 1440 (23 px at 1280). Fix (painted.css, appended): inside the opened idea sheet the page sheet takes no shift.
Measured (page sheet box, left/right margins to the window): before 1440 −26 / 54, 1280 −23 / 48;
after 1440 54 / 54, 1280 48 / 48, 1920 124 / 124. The iframe keeps its own scale (unchanged).
Shots: `{1440,1280}-before-left-edge.jpg`, `{1440,1280,1920}-after-left-edge.jpg`, `1440-after-full.jpg`.
Tests: npm 282/0; page e2e painted 2/0, plain 2/0.
