# Build the bakery: Bo, the team's engineer

You are Bo, the engineer on a small product team. The team ran a real working session on a bakery idea and made the
decisions below. Your job: build the app they decided on, to the brief's bar, in this folder only, and prove it with
tests. This is one attempt: work carefully, run the tests, fix what fails, and stop when everything passes.

## Where you work
- Your working directory is the app folder. Create and edit files only here. Don't read or write anything outside it,
  except reading `../bo/inputs/` and running `../acceptance/bakery.acceptance.js`.
- No network except what Node itself needs. No npm dependencies: plain Node 22 and the built-in `node:sqlite`.
- Keep `config.js` (it sets DB_PATH, PORT and DEMO with safe defaults; use it). Keep `GET /health`.
- `package.json`: keep `engines` and `"start": "node server.js"`; add `"test": "node --test test/"`.
- Static files go in `public/`. The photos are already there: `public/img/{sourdough,rye,brioche,logo}.jpg`.
- Never write a model name, a key or a token into any file, comment or log line.
- Log only what's needed to run (e.g. "bakery on 8787"). Never log a first name, the admin token, a header or a body.

## The shelf (given by the builders, so the photos match)
| id | name | tier | starting stock | photo |
|---|---|---|---|---|
| sourdough | Sourdough | rare | 3 | /img/sourdough.jpg |
| rye | Seeded rye | medium | 8 | /img/rye.jpg |
| brioche | Butter brioche | plentiful | 40 | /img/brioche.jpg |
Write each loaf's one-line description yourself, in the baker's voice. The bakery's name: **Priya's** (the baker in
the brief). The logo is `/img/logo.jpg`, an icon only; the name is real text beside it.

## Source 1: the team's decisions (run run-2026-11-15T00-11-38-840Z-k9iw, recorded 2026-11-15T00:13Z)
The idea, in the baker's words: "A small bakery where neighbours reserve a loaf from each bake under their first name, and I hand them out when the batch is ready."

### What the baker said
- **Wren asked:** "Who should we build this for first?" **She said:** "Just a first name, nothing else. One of each loaf per person per bake, so the rare ones go round. When something is gone, say so warmly."
- **Bo asked:** "When do orders close?" **She said:** "There's no closing time: you can reserve while a bake lasts, and I restock for the next one."
- **Mika asked:** "What should this feel like for a regular?" **She said:** "Hold a reservation for about fifteen minutes, then let it go back on the shelf. I hand everything out at once when I say the batch is ready."

### Her takeaways (what she believes, and her guidance to the team)
- **Believes:** I want regulars to reserve by first name only, one loaf per person per bake, so everyone gets a fair turn at the rare ones.
  **Guidance:** Build reservation with just a first name field. Enforce one-per-person-per-bake in the system. Show which loaves are gone with a warm message, not an error.
- **Believes:** I hold reservations for about fifteen minutes after the batch is ready, then release them back to the shelf so nothing goes to waste.
  **Guidance:** Build a simple timer: when a batch is marked ready, each reservation gets fifteen minutes before it automatically releases back to available inventory. All handouts happen in one window when I announce the batch.

### The decisions (id · who · decision → choice)
- `first-d1` · Mika · Reservation interface complexity → **Single name input only**
- `first-d2` · Bo · Inventory management approach → **One loaf per person per batch**
- `first-d3` · Ines · Out of stock communication → **Warm message when sold out**
- `first-d4` · Wren · User authentication needs → **No login required**
- `first-d5` · Theo · Data collection scope → **Record name and loaf type only**
- `u-engineering-1` · Bo · When do orders close. → **There's no closing time: you can reserve while a bake lasts, and I restock for the next one.**
- `c1` · Bo · What happens when a reservation isn't picked up within fifteen minutes → **Release back to walk-ins and notify the customer their slot is gone**
- `c2` · Bo · How we prevent two people reserving the same loaf → **Lock the slot when someone starts reserving until they confirm or abandon**
- `c3` · Bo · What customer information we store for each reservation → **First name only with device recognition**
- `c4` · Bo · How we notify customers their batch is ready → **Text message to their phone**
- `c5` · Theo · What we measure to know the whole thing is working → **Number of regulars who reserve at least twice a month**
- `c6` · Theo · What fields to keep when someone reserves a loaf → **First name, loaf type, timestamp**
- `c7` · Theo · What we measure when the batch bakes → **Nothing, this step has no customer interaction**
- `c8` · Theo · How long we keep reservation records after pickup → **Delete immediately after marked gone**
- `c9` · Ines · When customers pay for their reserved loaf → **Pay when collecting the loaf**
- `c10` · Ines · Whether to charge a deposit to hold a reservation → **No deposit, just a reservation**
- `c11` · Ines · Refund policy when someone doesn't collect within fifteen minutes → **No refund, loaf goes back on shelf** (joint session, revised)
- `c12` · Ines · How loaves are priced → **Different prices by loaf type**
- `c13` · Mika · What the reservation page should feel like to a regular → **Notice board where you claim your name, like a sign-up sheet**
- `c14` · Mika · How much visual detail each loaf type gets → **Name, short description, and available count**
- `c15` · Mika · What customers see when all loaves of a type are reserved → **Name greyed out with '0 available'**
- `c16` · Mika · What the pickup notification shows when the batch is ready → **Time ready, loaf name, pickup deadline**
- `c17` · Wren · How long regulars can go between visits and still count as active → **One month without a reservation** (joint session, kept)
- `c18` · Wren · Whether to show sold-out loaves on the reservation page → **Show them greyed out with sold out label**
- `c19` · Wren · What counts as not picking up within the fifteen minute window → **Fifteen minutes from when they were notified**
- `c20` · Wren · Whether first-time visitors can make a reservation or must walk in first → **Must visit in person once before reserving online**
- `c21` · Priya · Whether first-name-only reservations are open to anyone or require being a known regular → **Only established regulars can reserve by first name**
- `c22` · Priya · What happens to a reservation when someone doesn't pick up within the hold window → **Released with a note to the customer explaining they can try again next bake**
- `c23` · Priya · Whether customers can reserve multiple loaf types in one batch or are limited to one loaf total → **One loaf total per batch regardless of type**
- `c24` · Priya · How customers learn about pickup timing when the batch comes out early or late → **Estimated time given at reservation, updated message when actually ready**

## Source 2: the brief (the bar). Where the brief and a decision differ, the brief wins for this demo.
Some decisions above don't fit a live demo (text messages, paying at collection, regulars only, one loaf in total,
a month's history). The brief overrides them. Build what the brief says; list each decision you set aside, and why,
in BUILT.md (below). **The collection (loyalty stamps) is cut**: don't build `/api/collection` or a collection page.

### Brief: the bakery the judges order from

Product owner, 14 Nov 2026 (Vincent signed off the stage flow; this is the bar for the bakery in its proof beat).
Owner: builder 6 (site, deploy, full build); builder 1 (acceptance suite). Design direction: Mika via taste-skill.
Lives at https://bring-your-own-craft-production.up.railway.app.

## The moment it serves (DEMO.md, 2:10–2:30)
Before the talk the judges scan a QR and land on the storefront. They reserve a loaf under their first name and are
told it's on its way. On stage Vincent says *"Here's one this team finished earlier, and you're its regulars."* He
opens the baker's admin page: who ordered what, what's sold out. He taps **Deliver**, and every judge's phone flips at
once to **"Delivered: your sourdough is here."** Twenty seconds, and the room has used real software the team built.
Restocking happens afterwards, between demos (Vincent, 14 Nov).

## The honesty rule (read first)
The team builds this, not us. This brief is two things only:
1. **The bar**: what must work, written as our acceptance suite (below). Bo's build passes it or it doesn't ship.
2. **Inputs to the run**: the bakery idea, Priya's answers and takeaways, and the design direction below go into the
   real run; Bo's agent writes the code from the run's decision log, Mika's taste-skill call sets the look.
Builders write only the deploy plumbing, the acceptance tests and the image generation step, and list every hand edit.
The stage label says "built earlier by this team".

## The customer side (the judges' phones; Vincent, 14 Nov)
Phone first: one column, big tap targets, no login, loads in under 2 s on 4G. A really simple store.
1. **The storefront.** The bakery's name and its icon-only logo (from the run; the name is real text, never in the
   image). **Three items in three tiers** (Vincent, 14 Nov),
   so every judge gets something: a **rare drop** (very few, e.g. 3, the one people race for), a **medium** item
   (e.g. 8), and a **plentiful** one (e.g. 40). Each has its photo, a one-line description in the baker's voice and
   **how many are left** ("3 left"). A small, honest banner: *"Demo bakery for a hackathon:
   no real bread, nothing to pay."*
2. **Reserve.** Tap a loaf. **One of each item per person, per drop** (a drop = the stock between two restocks). Give a **first name** only, because regulars are on a
   first-name basis (no phone, email or account; 30 characters max). Tap **Reserve**. No payment step.
3. **Reserved.** A warm confirmation, like a sticker on a paper bag: *"Your sourdough is reserved, Ana. It'll be
   with you before the end of this talk."* A gentle "on its way" animation (the loaf in the oven, then out). **No
   exact countdown**: orders are placed at different times and delivery is when Vincent taps Deliver, so a timer
   would hit zero at the wrong moment. The page asks them to keep it open.
4. **Delivered.** The page updates by itself (server-sent events, no refresh): *"Delivered: your sourdough is
   here."* It should feel like a small delight (a stamp landing, a short vibration where the phone allows), not a
   toast. This is an in-page notification on the open page, not a phone push (push needs permissions and an
   installed app; not worth the risk).
5. **Sold out.** When an item hits 0 it reads *"Sold out for today"*, with a hand-drawn mark.
6. **Your bread collection (loyalty).** Every delivered item is kept on their device as a little collection, like
   stamps in a loyalty card: the item, its photo and which drop it came from. Come to another demo (a new drop after a
   restock) and they can collect another of each, so a fan can show two sourdoughs. Kept on the device (a random
   device id in a cookie, no account); first name only, as before.

## The baker's side (Vincent's laptop)
A separate admin page, **locked** unless opened with `ADMIN_TOKEN` (a Railway variable Vincent sets himself; never in
the repo, chat or logs; no token set = locked).
- **Orders**, arriving live: first name, loaf, time, status (reserved / delivered).
- **Stock per loaf**, with what's sold out clearly marked.
- **Deliver**: one button delivers every reserved order; each customer's page flips within a second.
- **Restock**: puts each loaf back to its starting stock, for the next demo.
- **Reset demo**: clears orders and restocks, for rehearsal and just before the talk.
Readable from the back of a room when screen-shared: large type, few elements.

## The rules (each becomes a test)
- Stock can't go below 0; two judges racing for the last loaf: exactly one gets it.
- One of each item per device per drop; a new drop starts at each Restock. Delivered items join that device's collection.
- First name only; no other personal data stored, nothing logged beyond it.
- Rate limit per device so nobody empties the shop by accident.
- **A reservation is held for a set time, then released** (Vincent, 14 Nov): the loaf goes back on the shelf if it
  isn't delivered in time. The hold length is set on the admin page, **default 15 minutes** (the talk plus slides
  and setup must fit inside it; Vincent can shorten it, e.g. to 5, once timings are known). Customers see "before the
  end of this talk", never the exact hold or a countdown.
- Starting stock per drop: rare **3**, medium **8**, plentiful **40**, so every judge gets at least one item and the rare one sells out fast. Adjustable on the admin page.

## The look (Mika, through taste-skill)
The bakery's own brand, not ours: it should feel like the place Priya described, **"like the baker already knows
you."** Warm, crafted, unhurried.
- **Photos (fal, made ahead):** one per loaf plus the logo mark, in one consistent style: soft morning window light,
  flour-dusted wood or linen, close and appetising, no text in any image. Under 5¢ in total.
- **Type and colour:** chosen by taste-skill from the run's brand feel (warm neutrals, one confident accent); a
  characterful display face for the name and loaf titles, a calm text face.
- **Voice:** short, warm lines in the baker's voice ("Still warm at 7", "Your usual?"). Never corporate, never cute.
- **Details that make it feel real:** the sticker confirmation, a hand-drawn "sold out" mark, the stamp on Delivered.
- No stock-photo feel, no generic template look; if it could be any bakery, it isn't done.

## Acceptance suite (builder 1 writes these first; the build must pass all)
1. Reserve with a first name → reserved, stock −1, appears on the admin page within 1 s.
2. Any field other than a first name → rejected.
3. A second reservation of the same item from the same device in the same drop → refused, kindly; after a Restock (new drop) → allowed, and the collection shows both.
4. Stock 0 → "Sold out for today"; reservation refused.
5. Two simultaneous reservations for the last loaf → exactly one succeeds.
6. Deliver → every reserved order's page shows "Delivered" within 1 s (SSE), and the admin shows it delivered.
7. Restock → stock back to starting values, storefront shows it within 1 s.
8. Admin page without the token, or with no token set → locked (401), never open.
9. A reservation older than the hold length is released, its stock returns, and Deliver skips it.
10. Reset demo → no orders, starting stock.
11. No API key and no first name appears in any log line.

## Out
Payments, real delivery, accounts, email or SMS, maps, reviews, anything that collects more than a first name.


## The contract: this is exactly what the gate checks, over HTTP
### Bakery app: acceptance contract

The gate the team-built bakery must pass before it ships. Source: Vincent's brief, `docs/BAKERY-BRIEF.md`, with its
11 acceptance tests. Bo builds to this contract. The suite in `deploy/acceptance/bakery.acceptance.js` checks it over
HTTP only, against `BASE_URL`. The app is plain Node 22 with `node:sqlite`, on Railway. The suite never imports the
app's code.

## Devices, drops and limits
- **A device** is a random id in a cookie. The app sets it on the first request that has none, for example opening
  the storefront, and reads it back after that. There's no account.
- **A drop** is the stock between two restocks. The first drop after a Reset demo is `1`, and each Restock starts the
  next.
- **One of each item per device per drop** (the brief's rule):
  - A second reservation of the same item, from the same device, in the same drop, is refused. A different first
    name on the same device is still the same person.
  - In the next drop it is allowed again.
- **The tiers** are three items, each with a `tier`: `rare` starting at **3**, `medium` at **8**, `plentiful` at
  **40**. The starting stock is adjustable on the admin page and takes effect at the next Restock.
- **Rate limit:** at most 10 reservation attempts per device per minute. The 11th within the minute gets `429`. Reset
  demo clears the counters.

## Holds and the test clock
- **Holds:** a reservation is held for `hold_minutes` (default **15**, set on the admin page).
  - After the hold it is **released**: its status becomes `released`, its loaf goes back on the shelf (`left` +1),
    and Deliver skips it.
  - Customers never see the exact hold or a countdown.
- **The test clock:** a request carrying a valid admin token (`Authorization: Bearer <ADMIN_TOKEN>`) may also carry
  `X-Test-Now: <ISO 8601>`. The app then uses that time as "now" for everything that request does, releases included.
  - Without a valid admin token, the header is ignored. So no customer can move the clock.
  - The app may apply a release when a later "now" is seen (lazily), or on a timer. Either way, every admin read and
    action at that "now" reflects it.

## Customer side
### `GET /api/loaves`
Returns `200 { loaves: [{ id, name, tier, description, start, left, sold_out, label }] }`, setting the device cookie
if there isn't one.
- `left` is what can still be reserved in this drop, and is never below 0.
- `start` is the starting stock for each drop, by tier: rare 3, medium 8, plentiful 40, unless the admin changes it.
- When `left` is 0, `sold_out` is `true` and `label` is `"Sold out for today"`. Otherwise `label` is `"<left> left"`,
  for example `"4 left"`.

### `POST /api/reservations` (with the device cookie)
Body `{ loaf_id, first_name }`. Those are the only fields. `first_name` is 1–30 characters after trimming.
- **201 `{ id, loaf_id, first_name, status: "reserved", drop, message }`:** the reservation is made, and stock drops by 1
  atomically.
- **400 `{ error: "field_not_allowed", field }`:** the body has any other field (phone, email, last name, address, …).
  It's refused, not dropped.
- **400 `{ error: "bad_reservation", message }`:** an unknown loaf, a missing or blank first name, or one over 30
  characters.
- **409 `{ error: "already_reserved", message }`:** this device already has this item in this drop, whether reserved
  or delivered. The `message` is kind and non-empty.
- **409 `{ error: "sold_out", message: "Sold out for today" }`:** `left` is 0. Two simultaneous requests for the last
  loaf give exactly one `201`.
- **429 `{ error: "rate_limited" }`:** over the rate limit.

### `GET /api/reservations/:id`
Returns `200 { id, loaf_id, first_name, status, message }`, or `404`. `status` is `reserved`, `delivered` or `released`.

### `GET /api/collection` (with the device cookie): OUT OF SCOPE, cut for usage (the lead, 14 Nov)
**Don't build this.** It's kept below only for if the collection returns. The gate skips its test (3b).

Returns `200 { items: [{ reservation_id, loaf_id, name, drop }] }`: every item delivered to this device, one entry
per delivery, each with its drop. It is this device's only; another device sees its own.

### `GET /api/reservations/:id/events`: server-sent events
`text/event-stream`. On connect, the stream sends one `data:` line with the current
`{ "status": "...", "message": "..." }`. It then sends one more each time the status changes.
- **On Deliver** it sends, within 1 s, `{ "status": "delivered", "message": "Delivered: your <loaf> is here" }`, with
  the loaf name in lower case, for example `Delivered: your sourdough is here`.

## The baker's side: all locked
Every admin route needs `Authorization: Bearer <ADMIN_TOKEN>`. That includes the admin page itself.
- **A wrong or missing token:** `401`.
- **`ADMIN_TOKEN` unset in the app's environment:** every admin route answers `401` whatever is sent. It fails
  closed, never open.

The routes:
- `GET /admin` is the admin page (HTML).
- `GET /api/admin/orders` returns `200 { orders: [{ id, first_name, loaf_id, at, status }] }`, newest first. `status` is `reserved`,
  `delivered` or `released`.
- `GET /api/admin/stock` returns `200 { loaves: [{ id, name, start, left, sold_out }] }`.
- `POST /api/admin/deliver` delivers every reserved order that is still within its hold; released ones are skipped. Returns `200 { delivered: <count> }`.
- `POST /api/admin/restock` starts a new drop, with every item back to `start`. Returns `200 { drop, loaves }`.
- `GET /api/admin/settings` returns `200 { hold_minutes, stock: { <item id>: <starting stock> } }`.
- `POST /api/admin/settings` with body `{ hold_minutes?, stock? }` sets either or both, and returns the same shape.
  `hold_minutes` is a whole number from 1 to 240. Each `stock` value is a whole number from 0 to 500, and takes effect
  at the next Restock. Anything else is a `400`.
- `POST /api/admin/reset` clears every order (and so every collection), puts every item back to `start`, starts
  again at drop 1, and clears the rate-limit counters.
  Returns `200 { ok: true }`.

## Logs
Nothing the app logs may contain a first name, the `ADMIN_TOKEN`, or any API key.

## The tests (`docs/BAKERY-BRIEF.md` § Acceptance suite)
| # | Test | Checks |
|---|---|---|
| 1 | Reserve with a first name | `201` reserved; `left` drops by 1; the order is on `/api/admin/orders` within 1 s |
| 2 | Only a first name | any other field is a `400`; a blank or 31-character name is a `400` |
| 3 | One of each item per device per drop | a second one in the same drop is a kind `409`; after a Restock it's allowed |
| 3b | ~~The collection~~ (cut for usage: skipped, not built) | the collection shows both, each with its drop |
| 4 | Sold out | the rare item starts at 3; at 0: `"Sold out for today"` on the storefront; the reservation is refused |
| 5 | The race for the last loaf | two simultaneous reservations: exactly one succeeds; `left` is 0, never below |
| 6 | Deliver | every reserved order's event stream says "Delivered: your … is here" within 1 s; the admin shows them delivered |
| 7 | Restock | stock back to `start`; the storefront shows it within 1 s |
| 8 | Admin locked | `401` without the token or with a wrong one; when no token is set, `401` whatever is sent |
| 9 | The hold | with the hold at 5 minutes: still reserved at +4 min; released at +6 min, stock back, Deliver skips it (test clock) |
| 10 | Reset demo | no orders; starting stock rare 3, medium 8, plentiful 40; a changed starting stock applies at the next Restock |
| 11 | No secrets or first names in logs | the app's log (`APP_LOG`) has no first name, no `ADMIN_TOKEN`, no API key |
| + | Rate limit (the brief's rules) | the 11th attempt in a minute from one device is a `429` |

## Running it
```
ADMIN_TOKEN=<token> PORT=8787 node server.js > app.log 2>&1    # the bakery app, its log captured
BASE_URL=http://localhost:8787 ADMIN_TOKEN=<token> APP_LOG=app.log node --test deploy/acceptance/bakery.acceptance.js
```
- **Without `ADMIN_TOKEN`,** the suite assumes the app has none set either. It runs only test 8, checking the admin
  stays locked, and skips the rest, saying why.
- **Without `APP_LOG`,** test 11 is skipped, saying why.
- **The collection is cut (the lead, 14 Nov, for usage), and `/api/collection` is out of scope:** test 3b, the collection, is skipped with "cut for usage".
  Test 3 still checks one of each item per device per drop. 3b is kept as written, for if the collection returns.
- **Every test starts with Reset demo,** so it's safe to run again.
- **Don't point it at the live site during a demo:** it resets the shop.

`test/acceptance.test.js` proves the suite against a throwaway stub (`test/fixtures/bakery-stub.mjs`). It also checks
that the suite fails against stubs that each break one rule.


## The look (design direction, for the storefront and the moments)
### The bakery's look: art direction for the run

Design lead, 14 Nov. This is an **input to the team's run** (Mika's taste-skill call reads it), not code. The bakery is
the bakery's own brand, not ours: no ink-paper, no studio creatures. Bar: `docs/BAKERY-BRIEF.md`.

## One line
**"Like the baker already knows you."** Warm, crafted and unhurried: a small neighbourhood bakery at 7am, not a chain.

## Feel
- Morning light, flour on linen, a paper bag with a sticker.
- Short warm lines in the baker's voice: "Still warm at 7." "Your usual?" "Held for you till 10."
- Never corporate, never cute. No exclamation marks, no emoji.

## Type
- **Display:** one characterful serif with warmth (e.g. Fraunces or Newsreader at a soft optical size) for the bakery
  name and loaf titles.
- **Text:** one calm sans (e.g. Inter or Hanken Grotesk) for everything else.
- Phone first: body ≥17px, tap targets ≥48px.

## Colour
- **Warm neutrals:** cream `#F6EFE4`, crust brown `#5A3B22`, flour white `#FFFBF4`.
- **One confident accent** for Reserve and the stamp: rye red `#B5462F` or a deep olive `#55602F`. Pick one.
- Contrast ≥4.5:1 everywhere, including the "3 left" counts.

## Photos (fal, made ahead; under 5¢ in all)
- One photo per item plus the logo mark, all in one consistent set: soft morning window light from the left,
  flour-dusted wood or linen, close and appetising, shallow depth of field.
- **No text in any image.** The bakery name is real text, never painted.
- Logo: icon only (a wheat ear or a loaf scored with a simple mark), one colour.

## The moments that make it feel real
1. **Reserved:** a sticker on a paper bag: *"Your sourdough is reserved, Ana."* plus a gentle loaf-in-the-oven
   animation. No countdown.
2. **Delivered:** a rubber **stamp lands** on the bag ("Delivered"), slightly rotated, with ink texture, and a short
   vibration where the phone allows. Not a toast.
3. **Sold out:** a hand-drawn line through the item and *"Sold out for today"* in the baker's hand.
4. **Your collection:** delivered loaves as small stamps on a loyalty card.
5. **The honest banner**, small and calm at the top: *"Demo bakery for a hackathon: no real bread, nothing to pay."*

## Don't
- Stock-photo feel, gradients, glassmorphism, drop-shadow cards, a generic template look.
- If it could be any bakery, it isn't done.


## The admin page: readability (screen-shared at 1920×1080, read from the back of a room)
Exact sizes are in `../bo/inputs/admin-wireframe.html`. Six elements, nothing else on screen:
1. Title strip: the name (44px serif) and "Demo bakery, no real bread" (24px). Restock and Reset demo as two quiet
   outline pills at top right (22px text, 2px border). Reset asks to confirm first.
2. Orders, left, newest first: rows 92px tall; first name 44px bold serif, loaf 34px, time 30px muted, status pill
   28px bold. Reserved = filled warm pill; Delivered = outline stamp, slightly rotated, green, with that row muted. At
   most 5 rows, then "and N more" (28px). No scrolling, no table borders, a 2px rule between rows.
3. Stock, right: one 150px row per loaf, name 40px serif, count 88px bold right-aligned. Sold out: the row greys and a
   "Sold out" stamp (54px, heavy, 5px border, rotated −8°) sits over the count, never over the name.
4. Deliver, bottom left: THE one big button, full width of the orders column, 120px tall, 48px bold, with the live
   count ("Deliver all 4 reserved"). Dark, high contrast. Nothing else at that weight.
5. Bottom right: one quiet line, "Held until the end of the talk" (26px). Hold length and stock settings sit behind a
   small settings link, not on this screen.
Contrast ≥ 4.5:1 everywhere; nothing under 22px except the demo line; live updates change numbers in place (no
flashing, no toasts, no sound). Everything fits 1920×1080 with no scroll, even with 40 orders.
The admin page must work when opened in a browser: accept the token as `Authorization: Bearer`, and also from a
one-time `?t=` that you swap for an HttpOnly, SameSite=Strict cookie and then redirect to a clean /admin (so the
token doesn't sit in the address bar). Send `Referrer-Policy: no-referrer` on admin pages. Compare tokens in
constant time. With ADMIN_TOKEN unset, every admin route is 401.

## Build order (stop and test after each)
1. The database (migrations on boot), the shelf, `/api/loaves`, reservations with the one-per-device-per-drop limit
   (a unique constraint), atomic stock, sold out, the rate limit.
2. Admin: locked routes, orders, stock, Deliver, Restock (new drop), settings, Reset demo; the hold (release lazily,
   on each read and write, from timestamps, honouring `X-Test-Now` only with a valid admin token).
3. The event stream per reservation, and the storefront and admin pages.
4. The look and the moments: the sticker, the stamp on Delivered (with a short vibration where allowed), the
   hand-drawn sold out.

## Your tests
Write `test/*.test.js` with `node:test`, starting the app on a free port with a temporary DB_PATH. Name every test
after the decision or brief rule it proves, with its source in brackets, e.g.
`[first-d2 · Bo] one loaf per person per batch` or `[brief · rules] stock never below 0`.

## The gate (run it before you stop)
```
ADMIN_TOKEN=test-token PORT=8787 DB_PATH=/tmp/bakery-gate.db node server.js > /tmp/bakery-app.log 2>&1 &
BASE_URL=http://localhost:8787 ADMIN_TOKEN=test-token APP_LOG=/tmp/bakery-app.log node --test ../acceptance/bakery.acceptance.js
```
Expect every test to pass and one skipped (3b, the collection, cut). Also `npm test` must pass. Stop the server you
started (only that process) when you're done.

## When you finish: BUILT.md
Write `BUILT.md` for the "Built by the team" card: the tables (one line each), the rules (each with the decision id
and who made it, or "brief"), the tests (name → what it proves), and the decisions you set aside because the brief
overrides them. Plain words. Then reply with one paragraph: what you built and the final test results.
