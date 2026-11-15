# Rehearsal and run sheet

The 05:30 UTC rehearsals (timed full run on `MODEL_BACKEND=fal`, then the three fallbacks) are written up here once
they've run. Until then, this is the run sheet: things the presenter does that the room can't do for them.

## Run sheet
- **Click her name field first.** On load nothing is focused on purpose: R (replay the rehearsal) must work from the
  first screen. Typing before a click goes to the room's keys (R, S, B…), not to the name tag. One click on "I love…",
  then type or speak.
- Her name tag never waits on the model: her rough card shows at once, "Meet your team" works straight away, and the
  team's read fills the card in when it lands (about 3 s here; up to 25 s on a cold, busy laptop).

## Fallback notes

- **fal backend, known model-judgement gap (no owner; the demo runs on claude-code):** in the full e2e on fal at 00:31
  UTC on 15 Nov, `e2e/yoga.e2e.js:186` ("a decision cites her new line") failed. At Build, no re-decision cited her newest
  takeaway (L4); every cite was L2, L3 or the team default. It's model judgement, not a crash. On claude-code the same
  spec passes. If the room falls back to fal on stage, her page may not quote her latest line.
