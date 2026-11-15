# deploy/

The demo bakery, deployed on Railway from branch `build/first-sketch`. Nothing here is part of the room.

- `app/` is the bakery app, its images and its static page. It has no keys and nothing from the room.
- `railway.json` at the repo root is the Railway config. It lives on `build/first-sketch` only and is never merged to `main`.
- No Railway variables are needed. `PORT` comes from Railway; `DB_PATH` defaults to `bakery.db` on the Railway volume wherever it is mounted (`RAILWAY_VOLUME_MOUNT_PATH`, else `/data` if present), else `app/data/bakery.db`; `DEMO` defaults to 1.
- Railway clicks: add a volume at `/data`, then Generate Domain.

## Start command
`sh -c 'cd deploy/app 2>/dev/null; exec node server.js'` works whether the service's Root Directory is the repo root or `deploy/app`. The studio's `server.js` never starts. Both cases were tested locally; not yet tested on Railway itself.

## How the app was made
- **The run:** `deploy/run/` (run-2026-11-15T00-11-38-840Z-k9iw, the real room on the fal backend, driven by `deploy/record-bakery-run.mjs`).
- **The prompt:** `deploy/bo/PROMPT.md`, built by `deploy/bo/make-prompt.mjs` from the run plus `deploy/bo/inputs/` (brief, contract, look, admin wireframe).
- **The build:** one headless attempt by Bo, the team's engineer agent (15 Nov, 00:16–00:23 UTC, 47 turns, medium effort, no retry), working only in `deploy/app/`. Its own account is `deploy/app/BUILT.md`.
- **The photos:** `deploy/make-images.mjs` (fal flux/schnell, 4 images, about 1.2¢), compressed with ImageMagick.

## Hand edits to Bo's app (each one listed)
1. `app/public/style.css`, line 1: `[hidden] { display: none !important; }`. Bo's `.hand { display: inline-block }` beat the `hidden`
   attribute, so "Sold out for today" showed on every loaf. Found by a browser check (Bo's tests are HTTP-only).
2. `app/server.js`, the admin login (Vincent's security P0, 15 Nov: a passphrase typed into the URL bar shows on the projector):
   a POST login form at `/admin` (`/admin/login`, a password field with `autocomplete="current-password"`; right -> 303 to a
   clean `/admin`, wrong -> 401 and no cookie); the session cookie holds HMAC-SHA256(ADMIN_TOKEN, "admin-session"), not the
   token, compared in constant time (for both the form and the `?t=` phone link); `Secure` set when `x-forwarded-proto`'s
   first value is https (Railway). Checked by `deploy/acceptance/admin-login.acceptance.js` (5 tests, builder 6).
3. Name asked once per device (Vincent on live, 15 Nov: every other loaf asked for his name again). `app/bakery.js`: a
   `devices` table (device -> first name, migration v2), written on each reservation, cleared by Reset demo, read by a new
   `GET /api/me` in `app/server.js`. `app/public/app.js` + `style.css`: after the first reservation the form shows
   "Reserving as <name> · not you?" instead of the field (textContent only; never read from the URL); "not you?" reopens
   it. The reservation API is unchanged. Checked by `deploy/acceptance/name-once.acceptance.js` (HTTP) and
   `deploy/acceptance/name-once.browser.mjs` (phone browser).

Run the acceptance files one at a time (`node --test --test-concurrency=1 …`): each starts with Reset demo on the same app.

## Hand edits (deploy plumbing only)
- `app/package.json`, `app/server.js`, `app/config.js`: placeholder with /health and the defaults above.
- `../railway.json`: build watch paths, start command, healthcheck, 1 replica.
