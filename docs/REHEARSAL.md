# Rehearsal and run sheet

The 05:30 UTC rehearsals (timed full run on `MODEL_BACKEND=fal`, then the three fallbacks) are written up here once
they've run. Until then, this is the run sheet: things the presenter does that the room can't do for them.

## 07:00 · Step 1 on Vincent's Mac (before any polish judging)
The lead's and the tech lead's run, in this order, on his Mac:
1. `npm run local`, then read the route line: it must say **fal**.
2. `npm run doctor`: the route on its first line, and the line **"A Send-shaped burst (4 calls at once, fal): … s wall"** under 10 s.
3. One full stage-path run: idea → name tag → meet the team → Focus 1 (2 rounds + End meeting) → Bo's unblock →
   Focus 2 → Team, go → her page.
4. One refresh mid-room: it must **resume** her run (no REPLAY label, nothing asked twice).
5. **Start over** (top right, or Shift+N): back to the idea paper.

His rehearsal and stage fal spend is separate from the $10 test cap. "Check the fal balance" stays on the pre-talk list.

### The 3-minute look check (the design lead's), on his own Chrome, painted, at his normal window size
1. Open `/` and confirm the painted room shows (not plain). In Activity Monitor, note Chrome's CPU at idle.
2. The idea paper, first, over the closed door: type "I want to build a checkout website for a bakery" and press Enter.
   "I want to build" is struck, fades and closes up; the paper moves on.
3. After his name tag and the team: the door. The plaque reads "Bring your own craft", then the doors open into the
   studio.
4. The cursor: the pink paper triangle; the fold over buttons; an I-beam in the box.
5. In the room: tap the time pill 5× (Cycle → Day → Night …). The painting keeps moving at night and the light stays in
   step. CPU stays under ~60% while it runs.
6. Refresh mid-run: the room comes back where he was.

If any step fails, note which, and open `?look=plain` as the fallback.

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
`npm run doctor` with the switch made and read the line "A Send-shaped burst (4 calls at once, …): … s wall": under about 10 s is fine.

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
- **A refresh picks up where she was** (her run is kept in this browser and in the URL's `?run=`): the room, her idea,
  journey, inbox and a build in progress come back at once, with no model call. To begin again on purpose: **Start
  over** in the top bar, or **Shift+N** (asks once; the old run stays in `runs/`). **Home** also starts fresh.
- **The opening is IDEA → YOU → TEAM** (Vincent, Sun 01:21): her idea first ("What do you want to build today?"),
  then her name tag, then the team, each teammate's line written for her idea (one call, under about 6 s, fired while
  she makes her name tag; static lines if it's slow). The room opens with her idea on the sheet and the team already
  sketching. **Fallback:** add `&setup=classic` to the URL for the old order (name tag, team, then her idea).
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
