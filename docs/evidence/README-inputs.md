# Evidence: every input (builder 7, Sun 15 Nov, 03:20–03:35 UTC)

What was checked against `docs/POLISH.md` §2 and §4 for the stage-path inputs, and how. Stubs only: no model calls.

## Checks run
- **`e2e/inputs.e2e.js`: 16/16** (12 at 03:30) (painted and plain × 1920×1130 and 1440×900). Fields covered: the idea card, the name tag,
  her sheet's line (`#her-input`), the meeting's piece/reply (`.fd-input`), Bo's unblock answer (`.ia-hers`), and the
  judge's idea (`#close-input`). For each one:
  - the mic is shown next to it;
  - typing `s r j ? v` inside fires no shortcut, and the letters land;
  - a 300-word paste puts no scrollbar on the page, the field stays inside its card and on screen, and the primary
    control stays visible;
  - Shift+Enter makes a new line where the field is multi-line;
  - empty + Enter sends no request;
  - Esc lets go of the field;
  - Enter with words changes something visible within 300 ms.
- `npm test` 282/0. Stubbed e2e: reorder 10/0, nametag 14/0, inbox 7/0, tidy 5/0, app 2/0, focus-ack 2/0, resume 8/0,
  page 2/0, voice 9/0. Plain look (`E2E_LOOK=plain`): nametag 14/0, reorder 10/0, inbox 7/0.

## Fixed in this batch
- The judge's idea had no visible primary action: it now has **"Build it →"** (`#close-make`, `[data-slot="make"]`). Its
  states are `off`, `ready`, `working` ("Building…", set the moment it's pressed) and `done`. When the build fails, the
  status says to build again or press R. The idea gets its own line, and the mic and the button sit under it, so the
  idea is never cut off.
- Mics: her sheet's line keeps its mic after the idea is down (journey lines, the sketch reaction), and the judge's idea
  has one (`data-voice="close"`).
- An empty Enter never moves on by accident:
  - the idea paper and the name tag nudge the box (`data-nudge="empty"`) and keep her there. Next is `off` until she
    types. The clicker's forward key still skips the idea paper, as the stage fallback;
  - Bo's unblock asks for her words instead of sending the struck-out suggestion.
- Mika's "Made with" lists "The room's frames, laid out in Figma" (evidence: `design/FIGMA.md`).

## Added at 03:45
- Enter on her idea now shows who's working within 300 ms, even while a slow tidy runs. Her box reads "Design is
  sketching… or type your own steps"; plain also shows Design's bar. If no run opens, the line comes down.
  `inputs.e2e` holds the tidy 2 s and the run 1.5 s, and the line is there in under 300 ms. The matrix is now 16/16.
- The meet card's entrance is a ~380 ms ease-out with no overshoot, sampled in a browser (x: 21.8 → 0 px, falling the
  whole way). With reduced motion it only fades.

## Screenshots (`docs/evidence/inputs/`)
- `close-empty-painted-1920.jpg`, `close-empty-plain-1920.jpg`: Build it is `off` while nothing is typed.
- `close-ready-painted-1440.jpg`, `close-ready-plain-1440.jpg`: the idea on its own line; the mic and Build it under it.
- `her-sheet-mic-painted-1440.jpg`, `her-sheet-mic-plain-1920.jpg`: her sheet's mic.
- `idea-empty-nudge-painted-1440.jpg`, `idea-empty-nudge-plain-1440.jpg`: Enter on an empty paper; Next is `off`.
- `idea-typed-painted-1920.jpg`: Next is ready once she types.

## Not checked here
- **Voice → tidy, end to end** (a recorded take landing in each field, then tidied). Builder 8's `e2e/tidy-all.e2e.js`
  walks the tidy on every field; voice.e2e covers the mic on the idea card, her sheet and the name tag.
- **No fal run of these screens.** The one allowed smoke was refused by this session's permission check, so the close's
  Build it has not been seen against a live model, only with stubs.
- 1280×800, day versus night, and `prefers-reduced-motion` (the nudge has a static version in CSS; not checked in a
  browser).
