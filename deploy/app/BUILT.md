# Built by the team: Proof of Concept

> **What Bo did not write.** Bo built this app in one attempt (15 Nov, 00:16–00:23 UTC). Our builders then made five
> listed hand edits (`deploy/README.md`): a CSS fix so "Sold out" shows only when sold out; the admin login form and
> session cookie; asking a device for its first name once; and a polish pass (the name "Proof of Concept", which was
> "Priya's"; the delivered celebration; playful copy; the Regulars' corner; the credit line); and a design polish of the storefront's look (typography, spacing, the cards,
> photo framing, the hero), with no behaviour change. Bo wrote none of those.

Built by Bo from the team's run (decisions recorded 2026-11-15) and the brief. Plain Node 22 with `node:sqlite`, no dependencies.
"Demo bakery for a hackathon: no real bread, nothing to pay."

## The tables

| Table | What it holds |
|---|---|
| `loaves` | The shelf: id, name, tier, one-line description, this drop's starting stock, the stock the next Restock will use, and how many are left (never below 0). |
| `reservations` | One row per reservation: first name, loaf, time, status (reserved / delivered / released), the drop number and the device id from the cookie. Nothing else. |
| `settings` | The current drop number and the hold length in minutes. |

The shelf (given by the builders): Sourdough (rare, 3), Seeded rye (medium, 8), Butter brioche (plentiful, 40).

## The rules

| Rule | Source |
|---|---|
| Reserve with just a first name (1–30 characters); any other field is refused, not dropped | first-d1 · Mika, c3 · Bo, c6 · Theo, brief |
| One of each loaf per device per drop, enforced by a unique index in the database; a new drop starts at each Restock | first-d2 · Bo, c23 · Priya (loosened by the brief to one of *each* item) |
| Sold out reads "Sold out for today", warmly, with a hand-drawn line through the name | first-d3 · Ines, c15 · Mika, c18 · Wren, brief |
| No login, no payment, no deposit | first-d4 · Wren, c9 · Ines, c10 · Ines |
| Only a first name, a loaf and a time are kept (plus the device id the brief asks for) | first-d5 · Theo, c6 · Theo, brief |
| Stock can never go below 0; two people racing for the last loaf: exactly one wins | c2 · Bo, brief |
| A reservation is held 15 minutes (changeable on the admin page, 1–240), then released: stock returns, the customer's page says they can try again next bake, and Deliver skips it | c1 · Bo, c22 · Priya, c11 · Ines, brief |
| Customers never see a countdown or the exact hold | brief |
| Deliver flips every reserved order's page within a second (server-sent events); no phone push | c24 · Priya (in the brief's form), brief |
| Restock starts a new drop; Reset demo clears orders, restocks, goes back to drop 1 and clears the rate limit | brief |
| At most 10 reservation attempts per device per minute (the 11th gets 429) | brief |
| The admin is locked unless the token is right (constant-time compare); no token set means always 401; `?t=` swaps for an HttpOnly, SameSite=Strict cookie and redirects to a clean `/admin` | brief |
| Only a valid admin token can move the clock (`X-Test-Now`); the header is ignored otherwise | brief |
| No first name, token or key in any log line; the app logs only "bakery on <port>" | brief, house rule 2 |
| The collection (loyalty stamps) is not built: no `/api/collection`, no page | the lead, 14 Nov |

## The tests

`npm test` runs `test/bakery.test.js` (27 tests, each starting the app on a free port with a temporary database):

| Test | What it proves |
|---|---|
| first-d1 · Mika | Only a first name goes in; phone, email, last name and address are refused |
| first-d2 · Bo | A second of the same loaf from one device is a kind 409; a different loaf is fine |
| first-d3 · Ines | Sold out says "Sold out for today" and the booking is refused |
| first-d4 · Wren | A customer reserves with no login or token, and gets the sticker message |
| first-d5 / c6 · Theo | The reservation table has no personal column beyond first name, loaf, time, device id |
| c15 · Mika, c18 · Wren | A sold-out loaf stays on the shelf, marked sold out, count 0 |
| c9 / c10 · Ines | No payment or deposit step exists |
| c11 · Ines, c22 · Priya | An unclaimed reservation is released with a "try again next bake" note |
| c8 · Theo, c20 / c21 · Priya | Records stay until Reset; a first-time visitor can reserve (see below) |
| c14 · Mika | Each loaf has a name, a short description, a tier and a count; no exclamation marks, no emoji |
| brief · photos | The three loaf photos and the logo are served |
| brief · rules | Stock never below 0; the race for the last loaf; first name 1–30; new drop at Restock; rate limit and its Reset; the hold, the test clock and its limits; released loaves can be reserved again; adjustable starting stock and its validation |
| brief · delivered | Deliver reaches every open page within a second, with "Delivered: your … is here" |
| brief · storefront | The shelf streams changes, so a Restock shows at once |
| brief · baker | The admin is locked (no token, wrong token, no token set); the `?t=` swap, cookie and `Referrer-Policy`; Reset demo |
| brief · cut | `/api/collection` is not built |
| brief · look | The honest banner, the real-text name and icon-only logo, the device cookie |
| house rule 2 | No first name, token or key in the log or any response |

The team's gate (`../acceptance/bakery.acceptance.js`): 12 pass, 1 skipped (3b, the collection, cut), 0 fail.

## Decisions set aside, because the brief overrides them

| Decision | What the brief says instead, and why |
|---|---|
| c4 · Bo, c16 · Mika, c24 · Priya: text message when ready, with time ready, loaf and pickup deadline | No SMS or push. The open page updates itself when Vincent taps Deliver. The brief rules out anything that collects more than a first name. |
| c9 · Ines: pay at collection | Nothing to pay. It's a demo with no real bread. |
| c1 · Bo, c19 · Wren: 15 minutes from when they were notified | The hold runs from when the order was placed and ends at "the end of the talk". Customers see no countdown. |
| c8 · Theo: delete a record immediately after pickup | Records stay on the baker's page until Reset demo, because Vincent shows "who ordered what". |
| c5 · Theo, c17 · Wren: count regulars with two reservations a month | No analytics, and no month of history in a demo. |
| c3 · Bo: "device recognition" | Kept in the brief's form only: a random device id in a cookie, used for the one-per-drop rule. No account. |
| c20 · Wren, c21 · Priya: visit in person once, regulars only | Every judge scans a QR and reserves on the spot, so anyone can reserve. |
| c23 · Priya: one loaf in total per batch | One of *each* item per drop, so every judge gets something. |
| c2 · Bo: lock a slot while someone is reserving | Reserving is one atomic step in the database, so two people can't take the same loaf and no lock is needed. |
| c12 · Ines: different prices by loaf | No prices: nothing to pay. |
| c13 · Mika: notice board you sign | The page is a one-column shelf, as the brief and look document describe. The sign-up feel lives in the copy ("Put my name down"). |
| Delivery timing from the brief's customer side §6 and the run's collection ideas | The collection is cut. |

## Choices I made (not in the brief)

- **Reset applies the saved starting stock as well**, as the brief says Reset "restocks". A changed starting stock otherwise waits for a Restock.
- **Already reserved beats sold out**: if you already hold the last loaf and tap again, you hear "you already have one", not "sold out".
- **Released reservations free the place**, so the same device can reserve the loaf again. A release only puts the loaf back on the shelf if it belongs to the current drop.
- **The storefront reads the current drop** (`drop` is added to `GET /api/loaves`) and keeps this device's reservations in the browser's own storage to show "Your bag".
- **Fonts:** Fraunces, Hanken Grotesk and Caveat load from Google Fonts with a system fallback. If the Wi-Fi blocks them, the page looks plainer but works.
- `package.json` test script is `node --test test/*.test.js`: on Node 22 the form `node --test test/` fails to load.

## What I did not test

- I never opened either page in a real browser. The storefront and admin scripts are syntax-checked, and every server route they call is tested, but the layout, the oven animation, the stamp landing, the vibration and the 1920×1080 fit are unseen.
- Load: 100+ phones on one stream set, and 4G load time, are not measured.
- Not run against Railway, only locally. The gate's log went to a scratch folder rather than `/tmp`.
