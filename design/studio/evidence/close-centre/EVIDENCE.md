# Evidence: design/close-centre (painted: the close sheet hugs its one column while asking)

Before: while asking, the close sheet stayed 1130 px wide and right-anchored, with the idea column centred in it, so a
wide blank band sat on the left (b7's close-ready-painted-1440). After: while asking the sheet is 812 px, centred in the
visible room (`50% + --crop-x`), and on Build it it opens out over 460 ms to the wide sheet with the contrast.
Sheet centre measured: 1920 → 960, 1440 → 720, 1280 → 640 (= the window centre). Reduced motion: no transition.
Shots: asking-1920/1440/1280.png, build-it-opens-1440.png (150 ms, 400 ms, 6 s).
Tests: E2E_LOOK=painted inputs.e2e 6/0; beats.e2e (see commit). Not checked: night, the replay (R/C) path.

Update: the opened-out sheet is centred too (it used to land off-centre at 1440: 288 px left, 57 px right). Final sheet
after Build it: 1920 → 280–1640, 1440 → 172–1268, 1280 → 115–1165 (centres 960 / 720 / 640). build-it-opens-1440.png
re-shot (150 ms, 400 ms, 6 s).
