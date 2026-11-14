# Bakery app: acceptance contract

The gate the team-built bakery must pass before it ships. Source: Vincent's brief, `docs/BAKERY-BRIEF.md`, with its
11 acceptance tests. Bo builds to this contract. The suite in `deploy/acceptance/bakery.acceptance.js` checks it over
HTTP only, against `BASE_URL`. The app is plain Node 22 with `node:sqlite`, on Railway. The suite never imports the
app's code.

## Identity and limits
- **A device** is the `X-Device-Id` header: an opaque id the storefront keeps in `localStorage` and sends with every
  request.
- **A person** is a device, or a first name compared case-insensitively. The brief's rule is "one of each loaf per
  person: per device, and per first name".
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
Returns `200 { loaves: [{ id, name, description, start, left, sold_out, label }] }`.
- `left` is what can still be reserved, and is never below 0.
- `start` is the starting stock. Sourdough's `start` is **4**, and every other loaf's is at least 4.
- When `left` is 0, `sold_out` is `true` and `label` is `"Sold out for today"`. Otherwise `label` is `"<left> left"`,
  for example `"4 left"`.

### `POST /api/reservations` (with `X-Device-Id`)
Body `{ loaf_id, first_name }`. Those are the only fields. `first_name` is 1–30 characters after trimming.
- **201 `{ id, loaf_id, first_name, status: "reserved", message }`:** the reservation is made, and stock drops by 1
  atomically.
- **400 `{ error: "field_not_allowed", field }`:** the body has any other field (phone, email, last name, address, …).
  It's refused, not dropped.
- **400 `{ error: "bad_reservation", message }`:** an unknown loaf, a missing or blank first name, or one over 30
  characters.
- **409 `{ error: "already_reserved", message }`:** this device, or this first name, already holds this loaf. The
  `message` is kind and non-empty.
- **409 `{ error: "sold_out", message: "Sold out for today" }`:** `left` is 0. Two simultaneous requests for the last
  loaf give exactly one `201`.
- **429 `{ error: "rate_limited" }`:** over the rate limit.

### `GET /api/reservations/:id`
Returns `200 { id, loaf_id, first_name, status, message }`, or `404`. `status` is `reserved`, `delivered` or `released`.

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
- `POST /api/admin/restock` puts every loaf back to `start`. Returns `200 { loaves }`.
- `GET /api/admin/settings` returns `200 { hold_minutes }`. `POST /api/admin/settings` with body `{ hold_minutes }`
  (a whole number, 1–240) sets it, and returns the same shape. Anything else is a `400`.
- `POST /api/admin/reset` clears every order, puts every loaf back to `start`, and clears the rate-limit counters.
  Returns `200 { ok: true }`.

## Logs
Nothing the app logs may contain a first name, the `ADMIN_TOKEN`, or any API key.

## The tests (`docs/BAKERY-BRIEF.md` § Acceptance suite)
| # | Test | Checks |
|---|---|---|
| 1 | Reserve with a first name | `201` reserved; `left` drops by 1; the order is on `/api/admin/orders` within 1 s |
| 2 | Only a first name | any other field is a `400`; a blank or 31-character name is a `400` |
| 3 | One of each loaf per person | the same device, or the same first name, gets a kind `409` |
| 4 | Sold out | at 0: `"Sold out for today"` on the storefront; the reservation is refused |
| 5 | The race for the last loaf | two simultaneous reservations: exactly one succeeds; `left` is 0, never below |
| 6 | Deliver | every reserved order's event stream says "Delivered: your … is here" within 1 s; the admin shows them delivered |
| 7 | Restock | stock back to `start`; the storefront shows it within 1 s |
| 8 | Admin locked | `401` without the token or with a wrong one; when no token is set, `401` whatever is sent |
| 9 | The hold | with the hold at 5 minutes: still reserved at +4 min; released at +6 min, stock back, Deliver skips it (test clock) |
| 10 | Reset demo | no orders, starting stock (sourdough 4) |
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
- **Every test starts with Reset demo,** so it's safe to run again.
- **Don't point it at the live site during a demo:** it resets the shop.

`test/acceptance.test.js` proves the suite against a throwaway stub (`test/fixtures/bakery-stub.mjs`). It also checks
that the suite fails against stubs that each break one rule.
