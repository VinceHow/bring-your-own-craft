# deploy/

The demo bakery, deployed on Railway from branch `build/first-sketch`. Nothing here is part of the room.

- `app/` is the bakery app, its images and its static page. It has no keys and nothing from the room.
- `railway.json` at the repo root is the Railway config. It lives on `build/first-sketch` only and is never merged to `main`.
- No Railway variables are needed. `PORT` comes from Railway; `DB_PATH` defaults to `bakery.db` on the Railway volume wherever it is mounted (`RAILWAY_VOLUME_MOUNT_PATH`, else `/data` if present), else `app/data/bakery.db`; `DEMO` defaults to 1.
- Railway clicks: add a volume at `/data`, then Generate Domain.

## Start command
`sh -c 'cd deploy/app 2>/dev/null; exec node server.js'` works whether the service's Root Directory is the repo root or `deploy/app`. The studio's `server.js` never starts. Both cases were tested locally; not yet tested on Railway itself.

## Hand edits (deploy plumbing only)
- `app/package.json`, `app/server.js`, `app/config.js`: placeholder with /health and the defaults above.
- `../railway.json`: build watch paths, start command, healthcheck, 1 replica.
