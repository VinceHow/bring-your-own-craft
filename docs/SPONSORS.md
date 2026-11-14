# Sponsor layer (00:00–03:00, after core is green and tagged; first thing cut)

Vincent's rule: "low prio like I said. Only do these if they dont add significantly to our build."
Each item is a thin layer behind a flag, dropped outright if it runs over its budget. Free credits only; demo data only.
Keys are asked for (secure form) only when that item starts. Each one used goes in the README's API list.

| # | Sponsor | Thin use | Budget | Flag |
|---|---|---|---|---|
| 1 | fal (generative media bounty) | Design generates the page's hero image with a fal image model, cached per run, labelled. (Routing Claude through fal doesn't count; the image does.) | 30 min | `SPONSOR_FAL_IMAGE=1` |
|   | | **Route:** server-side fal if its key works from a fresh session; else pre-generated via the lead's fal MCP, one per demo idea, labelled "made with fal before the demo". | | |
| 2 | Linkup (Tavily as swap) | Research does a live web search that finds and cites the source behind her first fork. | 30 min | `SPONSOR_LINKUP=1` |
| 3 | MongoDB Atlas (free tier) | Her taste file and the decisions log in Atlas, behind the same interface as the local files. Drop if setup fights. | 45 min | `SPONSOR_MONGO=1` |
| 4 | ElevenLabs | Priya speaks her flow lines (real-time speech-to-text into the flow box). Only if 1–3 are done and ≥45 min remain; ask Vincent for key help. | 45 min | `SPONSOR_VOICE=1` |
| 5 | Figma | Vincent's own design work. If frames/PNGs land in `design/`, match the room to them and credit. Nothing built for Figma. | — | — |
