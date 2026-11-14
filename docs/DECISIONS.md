# Decisions log (feeds BUILT-THIS-WAY.md)

Who decided what, as it happened. "Vincent" = his own words or his lead session relaying them; "agents" = the build
lead or a builder deciding for him. Only what actually happened.

| When | Who | Decision | Why |
|---|---|---|---|
| Sat 11:55 | agents (lead) | Fast-forward `setup/brief` into `main` | spec on main before building |
| Sat 11:57 | agents (lead) | Skip `--bare`; use own system prompt, no tools, no setting sources | `--bare` broke the login; this still cuts context to ~1.9k tokens |
| Sat 11:58 | agents (lead) | Shared skeleton + CONTRACT.md before builders start | four builders in parallel without editing each other's files |
| Sat 11:59 | agents (lead) | Four pieces: room, flow, selector, page | the split suggested in the kickoff, kept |
| Sat 12:00 | agents (lead) | Fonts from npm `@fontsource`, repos via git clone | Google Fonts and github.com web blocked here |
| Sat 12:05 | agents (lead) | Second, interactive baseline run | headless can't show questions; fairer test |
| Sat 12:08 | Vincent | Close becomes "asked 0, guessed N" + a judge's idea live + built-this-way line | baseline asked 0, not 14 |
| Sat 12:08 | Vincent | New timetable: core by 00:00, submit 11:30 | real hackathon times |
| Sat 12:08 | Vincent | Sponsor plan and order (docs/SPONSORS.md), low priority | "only if they dont add significantly" |
| Sat 12:10 | Vincent | fal key: yes, for fal.run only | he funded fal as the BYO-key route |
| Sat 12:11 | agents (lead) | Routes may match by function; `npm test` runs all tests | builder 2 found the seam |
| Sat 12:12 | agents (lead) | N = 22 guesses, counted by hand | docs/baseline/GUESSES.md |
| Sat 12:20 | Vincent | Declined the fal key form for now | his call; we stay on the Claude Code backend, which works |
| Sat 12:20 | agents (lead) | Don't re-ask for the fal key; on stage say "models run through Claude Code" | BRIEF §4: say whichever backend actually ran |
| Sat 12:22 | agents (lead) | E2E harness on main, unbuilt steps pending | BRIEF §5 "one shot" |
| Sat 12:24 | agents (reviewer) | Blocked build/room on a rolling-digit race (meter showed 99 vs 90) | demonstrated break |
| Sat 12:25 | agents (builder 3 → lead) | The 2:30 "decided for you" item is "does cancel ask for a reason?" (re-decided by her new line), not cancellation itself | the selector asks about cancellation in every yoga run; the ranking is not forced to fit the script |
| Sat 12:25 | agents (lead) | Run ids get a random suffix | same-millisecond ids collided in builder 3's tests |
