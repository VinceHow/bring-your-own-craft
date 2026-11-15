# Evidence: design/doc-edge (P0, her document's left edge at 1440×900)

Cause: `#room` had `overflow: hidden`, so it could still be scrolled from code. In the browser, `room.scrollLeft = 60`
moved it 24 px (a focus() or scrollIntoView() does the same), shifting her document so its title read "Vho…".
Fix: `#room { overflow: clip }` (it cannot scroll: `scrollLeft` stays 0). Her document's side padding is also 31 px
below 1500 px wide, so the title sits at least 24 px inside the paper at 1280.

Measured with a 300-word answer and 2 rounds (painted, stubbed meeting): title left edge inside the doc
- 1920×1130: 43 px · 1440×900: 31 px · 1280×800: 28 px, the same at night.
Shots: `1920-doc.jpg`, `1440-doc.jpg`, `1280-doc.jpg`, `1280-night-doc.jpg`.
Tests: npm test 282/0; E2E_LOOK=painted beats 2b/2c 2/0; inbox-layout 5/0.
