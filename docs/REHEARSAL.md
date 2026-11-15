# Rehearsal and run sheet

The 05:30 UTC rehearsals (timed full run on `MODEL_BACKEND=fal`, then the three fallbacks) are written up here once
they've run. Until then, this is the run sheet: things the presenter does that the room can't do for them.

## Pre-talk checklist
- **The demo runs on fal** (lead's call, Sun 00:56: on the demo Mac, haiku via Claude Code took over 25 s; fal answers
  in about 1 s). `.env.local` has `MODEL_BACKEND=fal` (and `FAL_KEY`); `npm run local` prints the backend it uses.
- **Check the fal balance** on the fal dashboard before the talk. A 401, 402 or "balance" line in the Terminal means
  stop and top up; never switch silently.
- R replays `runs/rehearsal`: re-recorded on fal on the meeting model (Focus 1 in rounds, the unblock, Focus 2, her page).

## Run sheet
- **Click her name field first.** On load nothing is focused on purpose: R (replay the rehearsal) must work from the
  first screen. Typing before a click goes to the room's keys (R, S, B…), not to the name tag. One click on "I love…",
  then type or speak.
- Her name tag never waits on the model: her rough card shows at once, "Meet your team" works straight away, and the
  team's read fills the card in when it lands (about 1–3 s on fal; up to 25 s on a cold laptop on Claude Code).

## Fallback notes

- **fal backend, known model-judgement gap (the demo runs on fal; being worked by builder 8, timeboxed 45 min from 00:57 UTC):** in the full e2e on fal at 00:31
  UTC on 15 Nov, `e2e/yoga.e2e.js:186` ("a decision cites her new line") failed. At Build, no re-decision cited her newest
  takeaway (L4); every cite was L2, L3 or the team default. It's model judgement, not a crash. On claude-code the same
  spec passes. Since the demo runs on fal, her page may not quote her latest line on stage until this is fixed.
