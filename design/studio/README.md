# Design studio tools

Screenshot and record the comps in `public/looks/comps/` (server: `PORT=4400 node server.js`). Run from a scratch
folder that has a `shots/` directory, with `NODE_PATH=$(npm root -g)` (preinstalled Playwright; never install browsers):
- `node rec.cjs <comp.html> <name> <ms>`: records the motion to `shots/<name>.webm` and a 2x end still (`?still=1`) to `shots/<name>-end.png`.
- `node mid.cjs <comp.html> <prefix> <ms,ms,...> [dpr]`: stills at given times after load.
- `node comp.cjs <comp.html[?still=1]> <out.png> [dpr] [wait]`: one still.
