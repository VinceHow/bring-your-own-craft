# Evidence: design/tidy-pen (the magical tidy)

What she sees: her ink pen, the same pen that writes her name tag, strikes the cut words in turn, left to right
(~150 ms each, at most 5 in view; any others are struck together). The pen lifts, the kept words close up, the first
word takes its capital, and a short pink underline signs the clean line. On her meeting turn the underline stays.
- It fits the 1.7 s the room keeps her paper up after a tidy (room.js TIDY_PAUSE_MS).
- It's clipped to her words' box; positions are read from the overlay's spans and scaled to the room.
- Reduced motion: no moment (unchanged: tidyMoment returns at once).
- Plain look: untouched (painted.js only runs with ?look=painted).

Strips at 8 fps, left→right, top→bottom. The recordings stub /api/tidy so a real cut shows: this sandbox has no model.
- The idea card (first screen): `ti1440d-strip.jpg`, `ti1440n-strip.jpg`, `ti1920d-strip.jpg`, `ti1920n-strip.jpg`
- A meeting reply (her turn): `tt1440d-strip.jpg`, `tt1920n-strip.jpg`

Tests:
- npm test 282/0
- tidy e2e: painted 5/0, plain 5/0
- beats 1a–1e, 2b–2d: painted 7/0, plain 7/0
- nametag, painted: 14/0
