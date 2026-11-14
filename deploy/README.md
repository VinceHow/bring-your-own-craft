# deploy/

The demo bakery, deployed on Railway from this repo (root directory `deploy/app`).

- `app/` is the only folder Railway deploys. It holds the bakery app, its images and its static page. It has no keys and nothing from the room.
- Railway variables: `DB_PATH` (a file on the `/data` volume) and `DEMO=1`. Nothing else.

## Hand edits (deploy plumbing only)
- `app/package.json`, `app/server.js`: a placeholder with a /health route, so the service exists before the real build.
