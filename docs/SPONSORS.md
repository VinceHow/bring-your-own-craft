# Sponsor layer (00:00–03:00, after core is green and tagged; first thing cut)

Vincent's rule: "low prio like I said. Only do these if they dont add significantly to our build."
Each item is a thin layer behind a flag, dropped outright if it runs over its budget. Free credits only; demo data only.
Keys are asked for (secure form) only when that item starts. Each one used goes in the README's API list.

| # | Sponsor | Thin use | Budget | Flag |
|---|---|---|---|---|
| 1 | fal (generative media bounty) | Design generates the page's hero image with a fal image model, cached per run, labelled. (Routing Claude through fal doesn't count; the image does.) | 30 min | `SPONSOR_FAL_IMAGE=1` |
|   | | **Route:** server-side fal if its key works from a fresh session; else pre-generated via the lead's fal MCP, one per demo idea, labelled "made with fal before the demo". | | |
| 2 | Linkup (Tavily as swap) | Research does a live web search (key: network secret for `api.linkup.so`, header Authorization, prefix Bearer, if Vincent adds it; Tavily only if Linkup fails and a Tavily key exists) that finds and cites the source behind her first fork. | 30 min | `SPONSOR_LINKUP=1` |
| 3 | ~~MongoDB Atlas~~ | **Dropped** (Vincent, Sat 12:38): its connection string would sit in plain text in the environment; not worth it for a voucher. | — | — |
| 4 | ElevenLabs | Priya speaks her flow lines (real-time speech-to-text into the flow box). Optional; key only if Vincent adds a secret for `api.elevenlabs.io` (header xi-api-key). Only if 1–2 are done and ≥45 min remain; ask Vincent for key help. | 45 min | `SPONSOR_VOICE=1` |
| 5 | Figma | Vincent's own design work. If frames/PNGs land in `design/`, match the room to them and credit. Nothing built for Figma. | — | — |

**At 00:00:** check which network secrets exist on the environment (get_environment lists names only). Skip any item
whose key isn't there; don't ask Vincent (asleep). Order: fal hero image, then Linkup, then ElevenLabs.
