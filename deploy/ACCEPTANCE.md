# Bakery app: acceptance contract

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

### `GET /api/collection` (with the device cookie)
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
| 3 | One of each item per device per drop | a second one in the same drop is a kind `409`; after a Restock it's allowed; the collection shows both, each with its drop |
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
- **The collection is cut (the lead, 14 Nov, for usage):** test 3b, the collection, is skipped with "cut for usage".
  Test 3 still checks one of each item per device per drop. 3b is kept as written, for if the collection returns.
- **Every test starts with Reset demo,** so it's safe to run again.
- **Don't point it at the live site during a demo:** it resets the shop.

`test/acceptance.test.js` proves the suite against a throwaway stub (`test/fixtures/bakery-stub.mjs`). It also checks
that the suite fails against stubs that each break one rule.
