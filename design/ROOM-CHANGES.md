# Changes the room needs outside polish.css (for the lead to hand on)

1. **`public/flow.js:98` (flow owner) — boxes invisible.** `settle(r.el, 'translateY(-10px) scale(0.94) rotate(-2deg)', 'none')`:
   motion interpolates to `'none'` as all-zero functions, so every box ends at `scale(0)`. Change `'none'` to
   `'translateY(0px) scale(1) rotate(0deg)'`. Then delete the `.fl-box` stopgap at the end of `polish.css`.
2. **`public/index.html` (room owner):** add `<link rel="stylesheet" href="polish.css">` right after
   `<link rel="stylesheet" href="room.css">`. flow.js and sketches.js append their own stylesheets later; that's fine:
   polish only overrides room.css rules, and its one flow rule (`.fl-box`) is `!important`.
3. **Her flow, lower fork clipped (flow owner):** with 4 boxes plus a branch, the fork's option notes fall below
   `.her-flow`'s bottom edge and are cut off (see `screens/after-sheet-close.png`). The canvas fits to width only;
   fitting to `min(width, height)` would keep the options on the sheet.
