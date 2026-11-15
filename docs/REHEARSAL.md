# Rehearsal and run sheet

The 05:30 UTC rehearsals (timed full run on `MODEL_BACKEND=fal`, then the three fallbacks) are written up here once
they've run. Until then, this is the run sheet: things the presenter does that the room can't do for them.

## Pre-talk checklist
- **The demo runs on fal** (lead's call, Sun 00:56: on the demo Mac, haiku via Claude Code took over 25 s; fal answers
  in about 1 s). `.env.local` has `MODEL_BACKEND=fal` (and `FAL_KEY`); `npm run local` prints the backend it uses.
- **Check the fal balance** on the fal dashboard before the talk. A 401, 402 or "balance" line in the Terminal means
  stop and top up; never switch silently.
- R replays `runs/rehearsal`: re-recorded on fal on the meeting model (Focus 1 in rounds, the unblock, Focus 2, her page).

## If fal fails on stage: Fallback B, company Claude Code

Why: on Vincent's Mac, Claude Code goes through the company's AI gateway, where "haiku" resolves to an older, slow haiku
(over 25 s for the name tag) while "sonnet" is fast. So the fallback runs every fast role on sonnet. There is no
automatic switch from fal to Claude Code: it's this one manual step.

1. In `.env.local`, put a `#` in front of `MODEL_BACKEND=fal`.
2. Remove the `#` from the six `*_MODEL=sonnet` lines.
3. Restart: Ctrl-C, then `npm run local` (or close the Terminal and double-click `Start BYOC.command`).

The first line it prints is the route. On fal it reads `route: fal`; after the switch it reads
`route: claude-code (company gateway: haiku roles → sonnet)`. A `WARN` line under it means fal is on together with
sonnet overrides, which slows fal down: comment the six lines out again. To check the fallback before the talk, run
`npm run doctor` with the switch made and read 2c, the Send-shaped burst: under about 10 s is fine.

The `.env.local` Vincent keeps (values are placeholders here; the real file is never committed):

```
FAL_KEY=<your key>
ELEVENLABS_API_KEY=<your key>
LINKUP_API_KEY=<your key>
ADMIN_TOKEN=<any long random word>
MODEL_BACKEND=fal
# Fallback B (company Claude Code): comment out MODEL_BACKEND=fal above, uncomment these six, restart.
# TAG_MODEL=sonnet
# THREAD_MODEL=sonnet
# JOINT_MODEL=sonnet
# FIRST_MODEL=sonnet
# GUEST_MODEL=sonnet
# TIDY_MODEL=sonnet
```

## Run sheet
- **Click her name field first.** On load nothing is focused on purpose: R (replay the rehearsal) must work from the
  first screen. Typing before a click goes to the room's keys (R, S, B…), not to the name tag. One click on "I love…",
  then type or speak.
- Her name tag never waits on the model: her rough card shows at once, "Meet your team" works straight away, and the
  team's read fills the card in when it lands (about 1–3 s on fal; up to 25 s on a cold laptop on Claude Code).

## Fallback notes

- **fal backend, known model-judgement gap (the demo runs on fal; resolved with the PO's Focus 2 line: decide cites it 7–12 of 24 on fal, in three replays at 01:19 UTC):** in the full e2e on fal at 00:31
  UTC on 15 Nov, `e2e/yoga.e2e.js:186` ("a decision cites her new line") failed. At Build, no re-decision cited her newest
  takeaway (L4); every cite was L2, L3 or the team default. It's model judgement, not a crash. On claude-code the same
  spec passes. With the PO's Focus 2 line, Build's decide on fal cited her newest line 8, 12 and 7 times out of 24 candidates.
