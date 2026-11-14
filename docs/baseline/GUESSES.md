# What the default agent guessed (run 2, interactive), counted by hand

Rule: one line per choice the studio owner would have to change if it was wrong, that the agent made without asking.
Source: `run-2-interactive/yoga-booking.html` and its closing message in `run-2-interactive/transcript.jsonl`.
Content it filled in (class descriptions, the exact timetable) counts once per kind, not per item.

| # | Guess | Evidence |
|---|---|---|
| 1 | Studio name "Juniper Street Yoga" | page title |
| 2 | Two rooms (main room, loft) | `ROOMS` |
| 3 | Capacity: 12 mats and 8 mats | `ROOMS` |
| 4 | Seven class types (Vinyasa, Hatha, Power, Yin, Restorative, Lunch, Prenatal) | `C` |
| 5 | Levels per class | `C` |
| 6 | Class lengths (45/60/75 min) | `C` |
| 7 | Class descriptions | `C` |
| 8 | Four teachers, with names | `T` |
| 9 | The weekly timetable | `WEEK` |
| 10 | A heated class at 90°F | `C.heated` |
| 11 | Booking window: the next 7 days | page, closing message |
| 12 | Drop-in price $22 (and US dollars) | "Before you come" |
| 13 | 10-class pass, $190, valid 6 months | "Before you come" |
| 14 | No online payment: pay at the front desk | "Before you come", closing message |
| 15 | Arrive 10 minutes early | "Before you come" |
| 16 | Loaner mats and blocks, free | "Before you come" |
| 17 | Cancel up to 2 hours before class | "Before you come", closing message |
| 18 | Address "412 Juniper Street, 2nd floor" | "Before you come" |
| 19 | Must be signed in to book | closing message |
| 20 | Other bookers shown by first name and photo | closing message |
| 21 | "Few spots left" warning at 3 or fewer | closing message |
| 22 | Full class is just "Full": no waitlist | closing message |

**N = 22 guesses, 0 questions, 1 approval.** Counted by the build lead, 14 Nov. Recount welcome; change the
number on stage only from this file.
