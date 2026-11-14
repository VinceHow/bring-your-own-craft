# Timings and model choice (measured 14 Nov, claude-code backend, this cloud container)

All numbers are wall-clock from real runs; the dry-run files beside this one hold each run's own numbers.

| Call | Setting | Measured |
|---|---|---|
| One tiny call | haiku / sonnet | 1.9 s / 2.1 s |
| Score 25 candidates | sonnet, default effort | 16.8 s (1,159 thinking tokens) |
| Score 25 candidates | sonnet, effort low | 7.2 s (no thinking) |
| Score 25 candidates | haiku, default effort | 31.6 s (5,425 thinking tokens) |
| Decide 25 candidates | sonnet, default / haiku | 10.2 s / 20.5 s |
| Five teammates in parallel, 5 each | sonnet, effort low | 8.3–8.5 s (slowest seat) |
| Five teammates in parallel, 3 each | sonnet, effort low | 6.0–7.4 s |
| Select (score and decide in parallel) | sonnet, effort low | 4.9–11.5 s |
| "Sounds like" | sonnet, effort low | 2.1–2.7 s |

**Chosen:** sonnet at low effort for teammates, scoring, deciding and "Sounds like". Haiku was slower here because it
thinks more by default. Full run (5 per seat, 25 candidates): 17.8–20.1 s. Judge's-idea fast path (3 per seat, 15
candidates): 11.4–15.1 s over six ideas.

Override with `TEAM_MODEL`, `TEAM_EFFORT`, `TEAM_COUNT`, `SELECT_MODEL`, `SELECT_EFFORT`, `FAST_COUNT`.

## Six seats (Strategy added), measured 14 Nov, same backend and container

Teammates now run 4 each (6 x 4 = 24 candidates, against 25 before), so select costs the same.

| Run | Teammates (slowest seat) | Select | Total |
|---|---|---|---|
| `six-seats-yoga-1.md` | 7.9 s | 10.2 s | 18.1 s |
| `six-seats-yoga-2.md` | 7.7 s | 13.3 s | 21.0 s |
| `six-seats-yoga-3.md` (Design prompt tweak) | 8.4 s | 10.5 s | 18.9 s |
| `six-seats-fast-yoga.md` (3 per seat, the close's count) | 6.4 s | 8.4 s | 14.8 s |

Strategy was never the slowest seat by much (6.9–7.5 s). Select varies more than the team does.
| `six-seats-yoga-4.md` (finding gated to its topic) | 9.6 s | 11.0 s | 20.5 s |
| `six-seats-cafe.md` (finding gated; no source attached) | 8.7 s | 12.4 s | 21.1 s |
