# F9: her page follows her Focus 2 line (builder 8, Sun 15 Nov)

Stub only, no model calls (`scripts/f9-her-page-shot.mjs`). The fake fill writes what the audit saw the model write:
Email and How many switched on, "A text arrives once your loaf is set aside…", regulars not first, and a "Decided for
you" pick. Her answer is "Regulars first. Nothing to fill in: no account, no payment now, their loaf waits at the counter
under their first name."

What the page shows (1440×900): `f9/her-page-1440-top.jpg` and `f9/her-page-1440-form.jpg`.
- The form asks for First name, Bread and collection time, and the two checkboxes. There's no Email, no How many (one
  loaf is sent) and no phone.
- No line promises a text; the cut sentence leaves "Collect it warm on your way to work."
- No "Decided for you".
- Section order: hero, regulars, bread, loaf, confirm, ordered, visit (regulars first).
- The only "Email" left on the page is the footer's "Email the bakery" contact link.
Unit tests: `test/fill.test.js`, "her Focus 2 line wins…" and "an email or how-many field comes back only when…".
