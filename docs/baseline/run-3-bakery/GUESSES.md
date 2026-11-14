# What the default agent guessed on the bakery prompt (run 3, interactive), counted by hand

Prompt: "Build me an ordering website for a small bakery, so customers can order bread ahead." Empty folder, default
Claude Code, a script answering every dialog with its default and every question with "your call" (same method as
run 2). Sat 14 Nov, ~16:05 UTC, ~6 min.

- **Questions asked: 0** (no AskUserQuestion calls, no question in its text).
- **Approvals: 20** permission dialogs ("Do you want to create config.json?", "Do you want to proceed?").
- Rule (same as yoga): one line per choice the owner would have to change if it was wrong, made without asking.
  Content it filled in (the menu, the descriptions) counts once per kind. Source: `work/config.json`, `work/menu.json`,
  `work/server.js` and its closing message in `transcript.jsonl`.

| # | Guess | Evidence |
|---|---|---|
| 1 | Bakery name "Hearth & Crumb" | config.json |
| 2 | Tagline "Naturally leavened bread, baked every morning." | config.json |
| 3 | Address "12 Mill Lane" | config.json |
| 4 | Phone number | config.json |
| 5 | Time zone (New York) | config.json |
| 6 | Currency (US dollars) | config.json |
| 7 | Opening hours for every day, closed Mondays | config.json |
| 8 | Holiday closures (25–26 Dec, 1 Jan) | config.json |
| 9 | Orders close at 6 pm the day before: no same-day orders | config.json, closing message |
| 10 | Orders up to 14 days ahead | config.json |
| 11 | 30-minute pickup slots | config.json |
| 12 | The menu: eight breads | menu.json |
| 13 | Their descriptions | menu.json |
| 14 | Their prices | menu.json |
| 15 | Menu categories (Loaves; Baguettes & Rolls; Specialty) | menu.json |
| 16 | A daily maximum per item, shown as "only 3 left" / "sold out" | menu.json, closing message |
| 17 | Some breads only on certain days (challah Fri–Sun) | menu.json |
| 18 | Pay at pickup: no online payment | closing message |
| 19 | Name and phone required; email and notes optional | closing message |
| 20 | A pickup code to show at the counter | closing message |
| 21 | An order-status link to bookmark | closing message |
| 22 | A staff page with a bake list and expected takings | closing message |
| 23 | Staff page behind a password | server.js |
| 24 | Order states: ready, picked up, cancelled; cancelling frees stock | closing message |

**N = 24 guesses, 0 questions, 20 approvals.** Counted by the build lead, 14 Nov. Recount welcome; change the number on
stage only from this file. The yoga count (22, run 2) must not appear on stage any more.
Caveat, said plainly if asked: run in a claude.ai cloud container; a laptop install could differ.
