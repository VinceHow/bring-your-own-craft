# Bakery app: acceptance contract

The gate an agent-built bakery ordering app must pass before it deploys. Bo builds to this; the suite in
`deploy/acceptance/bakery.acceptance.js` checks it over HTTP only, against `BASE_URL`. The app is plain Node 22 with
`node:sqlite` (Railway). The suite never imports the app's code.

Every rule below comes from a decision the team made in the run, or a line in `DEMO.md`. Rules are named, not keyed
to run ids, so a fresh recorded run keeps the same tests. The suite names the decision and its author in each test.

## Test mode
- The app runs with `TEST_MODE=1` for the suite. Without it, `/api/test/*` answers `404`, and the clock override
  is ignored.
- **The clock:** in test mode, every request may carry `X-Test-Now: <ISO 8601 with offset>`, for example
  `2027-01-14T20:30:00+00:00`. The app uses it as "now" for that request. A `?now=` query parameter does the same
  job, for a browser.
- **The bakery's time zone** is `Europe/London`. "Today", "tomorrow" and "20:00" are wall-clock times there. The
  suite only uses winter dates, so the UTC offset is `+00:00`.

## Shapes
Money is in whole pence. Dates are `YYYY-MM-DD`. A loaf is `{ id, name, price_pence, limit, left }`, where `limit` is the
per-pickup-day cap and `left` is what's still orderable for that day.

### `POST /api/test/reset` (test mode only)
Body `{ loaves: [{ id, name, price_pence, limit }] }`. This wipes every order and seeds these loaves, and the same limit
applies to every pickup day. Returns `200 { ok: true }`.

### `GET /api/loaves?date=YYYY-MM-DD`
Returns `200 { date, loaves: [loaf] }`, where `left` is the stock for that pickup date.

### `POST /api/orders`
Body `{ pickup_date, items: [{ loaf_id, qty }], first_name? }`.

- **201: the order is held.** Returns
  `{ id, status: "held", pickup_date, pickup_window: { from: "07:00", to: "10:00" }, items: [{ loaf_id, qty, price_pence }], total_pence, first_name? }`.
- **422 `{ error: "cutoff", message }`:** the order is after the cut-off. Orders for tomorrow close at 20:00 today.
  Same-day orders, and pickup dates in the past, are refused the same way.
- **409 `{ error: "sold_out", loaf_id, offer: { action: "hold_for_tomorrow", pickup_date } }`:** a loaf has fewer
  left than asked for. `offer.pickup_date` is the first day after the requested one with room for the order, which
  is usually the next day. When no day could take it (more than a day's limit), `offer` is left out.
- **400 `{ error: "bad_order", message }`:** the order is malformed, for example no items, an unknown loaf, or a
  `qty` below 1.
- **Personal data:** the only personal field accepted is `first_name`, which is optional.
  - Any other field (`phone`, `email`, `last_name`, `address`, …) is either refused with
    `400 { error: "field_not_allowed", field }` or dropped.
  - It must never appear in any response, now or later.

### `GET /api/orders/:id`
Returns `200` with the same shape as a created order, or `404`.

### `GET /api/bake-list?date=YYYY-MM-DD`
Returns `200 { date, loaves: [{ loaf_id, name, qty }] }`. Each loaf's `qty` is the sum of that day's held orders
for it. It lists every seeded loaf, with `0` where nothing is ordered.

## The rules the suite checks
| Rule | The decision behind it | Author |
|---|---|---|
| `ordering` | A valid order is held, with each loaf's price and the total; she pays the same at pickup. Decided as "Show each loaf's price and total, pay the same at pickup", plus "Pay at pickup". | Ines · Strategy |
| `cutoff-8pm` | "Orders close at 8pm for the next morning." Also decided as "Order by evening before" (Product seat) and "Free changes until the evening before" (Ines · Strategy). | Bo · Engineering, with Ines and Mika (team space) |
| `hold-until-10` | "Then we hold it for them till ten." Also in her answer: "hold their usual for them". | Bo · Engineering |
| `no-phone` | "Then the phone field goes, and so does every question we can remember." | Mika · Design |
| `stock` | Decided as "Cap each loaf per pickup day and show 'sold out' on the page" (Bo · Engineering) and "Guaranteed up to a daily limit per loaf" (Noor · Research; team space: Noor, Bo, Ines). A sold-out loaf links to a different day (Mika · Design). | Bo · Engineering, Noor · Research |
| `bake-list` | Decided as "Both totals and list" for how the baker sees orders (Noor · Research), and "Simple daily order list page" (Bo · Engineering). | Noor · Research |
| `personal-data` | Her takeaway: "Never ask for what we could remember." Contact stays on her device, never the server, decided as "Pay at pickup, remember name and contact on this device" (Bo · Engineering). | Priya (her takeaways), Bo · Engineering |

## Running it
```
TEST_MODE=1 PORT=8787 node server.js          # the bakery app
BASE_URL=http://localhost:8787 node --test deploy/acceptance/bakery.acceptance.js
```
`test/acceptance.test.js` proves the suite against a throwaway stub (`test/fixtures/bakery-stub.mjs`). It also checks
that the suite fails against deliberately broken stubs.
