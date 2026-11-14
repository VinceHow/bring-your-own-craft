# Bakery order-ahead site

Customers pick a pickup day and time, choose their bread, and get an order code to show at the counter. They pay when they pick up. Staff use a password-protected dashboard to see each day's bake list and hand out orders.

It runs on Node.js 18 or newer and has **no dependencies**.

## Run it

```bash
ADMIN_PASSWORD=choose-something-strong npm start
```

- Shop: http://localhost:3000
- Staff dashboard: http://localhost:3000/admin (sign in with `ADMIN_PASSWORD`)

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | *(none)* | Required to use the dashboard. If unset, the dashboard is turned off. |
| `PORT` | `3000` | Port to listen on |
| `DATA_DIR` | `./data` | Where `orders.json` is saved. Back this folder up. |

## Make it yours

You can edit both files while the server runs. Changes apply on the next page load.

**`config.json`**: bakery name, address, phone, timezone, opening hours, and holidays.
- `orderCutoff`: orders for a given day close at this time on the day before. Same-day orders are not offered.
- `hours`: pickup window for each weekday. Use `null` for days you're closed.
- `closedDates`: one-off closures (`"YYYY-MM-DD"`).
- `daysAhead`: how far ahead customers can order. `slotMinutes`: length of each pickup slot.

**`menu.json`**: one entry per product.
- `price` is in cents (`850` = $8.50).
- `maxPerDay` (optional): how many you'll bake. The item shows as sold out once that many are ordered.
- `days` (optional): limits an item to certain weekdays, e.g. `["fri", "sat"]`.
- `image` (optional): a path like `/img/sourdough.jpg`. Put the file in `public/img/`.
- Keep each `id` the same once orders exist, because orders refer to items by `id`.

## Staff dashboard

- **Bake list**: how many of each item are needed for the selected day.
- **Orders**: sorted by pickup time. Use **Mark ready**, then **Picked up**. You can also **Cancel** an order, which frees its stock.
- The dashboard refreshes every minute. **Print** gives a paper copy of the day.

## Deploying

The site can run on any host that runs Node and keeps a persistent disk for `DATA_DIR`, such as a small VPS, Render, Railway or Fly.io. Put it behind HTTPS, which these hosts handle for you. The dashboard sends its password with every request, so HTTPS matters.

## Not included yet

- Online payment. Customers pay in the shop.
- Email or SMS confirmations. Customers get a confirmation page they can bookmark.
- Customers can't edit their own orders. The confirmation page asks them to call.
