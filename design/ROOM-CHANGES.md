# Changes the room needs outside polish.css (for the lead to hand on)

1. ~~`public/flow.js:98`, boxes invisible~~ **Done** on main (b2f4f46); the polish stopgap is removed.
2. **`public/index.html` (room owner):** add `<link rel="stylesheet" href="polish.css">` right after
   `<link rel="stylesheet" href="room.css">`. flow.js and sketches.js append their own stylesheets later; that's fine:
   polish only overrides room.css rules, and its one flow rule (`.fl-box`) is `!important`.
3. **Her flow, lower fork clipped (flow owner):** with 4 boxes plus a branch, the fork's option notes fall below
   `.her-flow`'s bottom edge and are cut off (see `screens/after-sheet-close.png`). The canvas fits to width only;
   fitting to `min(width, height)` would keep the options on the sheet.
