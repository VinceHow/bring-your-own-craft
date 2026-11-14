# How it works: the cap, the ask policy, her file, the key

One page for judges who want to check the claims in the code.

## The 3-question cap
The pitch rests on this, so it is enforced in code twice, not left to a prompt.

1. **The selector** (`lib/select.js`, `pickAsks`). One model call scores every candidate decision: is it in her
   seat, how much does it change what she's building, how little does her file already say. Then code applies the
   rules:
   - a candidate counts only if it changes the build and her file isn't already deciding it;
   - in her seat counts double; a decision Research can back with its finding gets a point;
   - outside her seat, it qualifies only if it is costly or hard to undo; a cheap, undoable one is refused;
   - duplicates are asked once; one question per box on her flow;
   - the result is cut to `MAX_ASKS`, whatever `max` a caller passes.
2. **The door** (`lib/policy.js`, `ask`). The only code that writes an `ask` event. It opens only with a grant the
   selector made (`selectorGrant`, which itself refuses more than 3 ids). Before letting an ask through it re-counts
   the run's log, so a fourth is refused even if a caller gets the cap wrong. `MAX_ASKS = 3` lives here.

**Tests** (`npm test`, offline, with a fake model):
- `test/select.test.js`: a fourth never gets through, with 10 strong candidates, with any `max` (3, 4, 10, Infinity,
  NaN), over 500 random score sets, and across two selector runs on the same run; a cheap out-of-seat pick is
  refused, decided and logged; a different idea changes the picks; picks spread across her work. One more test, marked
  LIVE, runs the real model (`LIVE=1 npm test`).
- `test/policy.test.js`: an ask without the selector's grant is refused, decided and logged; a grant lets its picks
  through once each; a scan of the source checks that only `lib/policy.js` writes `ask` events.

## The ask policy
Only the selector's picks reach her, and they arrive inside her work: a fork on her flow or a pin on a box
(`kind: 'fork' | 'pin'`, attached to a box id). Anything else that tries to ask is refused: an `ask.refused` event
with the reason, then a `decided` event, so nothing is dropped (`refuse` in `lib/policy.js`).

A question in a teammate's plain text ("Which layout do you prefer?") counts as a stamp: `scanText` logs it as a
`stamp` event, and it lowers the IN YOUR CRAFT % meter. Craft is her working in her own medium; a stamp is saying
yes or no to the tool. The meter is craft / (craft + stamp) over her events (`lib/tally.js`, tested in
`test/tally.test.js`).

## Everything else is decided, with a citation
Every candidate not brought to her is decided in one model call (`decideCore` in `lib/select.js`). Each decision
cites a line of her file (`L1`, `L2`, ...) or "team default". Code checks every citation (`checkCitation`): a cite to
a line that isn't in her file is rejected, falls back to "team default", and is logged as `cite.rejected`. At build
time the rest are re-decided against her updated file (`decideRest`), so a decision can cite a line she wrote a minute
earlier. Both are tested in `test/select.test.js`. (The build route that calls `decideRest` is in progress, not yet
on `main`.)

## Her file
- The seed is `data/taste.seed.md`: two lines, each tagged "(prepared for the demo)".
- Each run works on its own copy, `runs/<id>/taste.md`, one principle per line: `- [L3] text`.
- When she pins a comment, one model call suggests a "Sounds like" line (`inferSoundsLike` in `lib/taste.js`,
  prompt in `prompts/sounds-like.md`). She keeps it or rewords it; `POST /api/run/:id/taste` writes it as the next
  line (`writeLine`) and logs `taste.written`, noting whether she reworded it.
- The file only grows from her decisions. There is no questionnaire.

## The key
The fal key is only needed for `MODEL_BACKEND=fal`; the demo runs on the default Claude Code backend, which needs no
key.
- It is read from `FAL_KEY` and held in server memory (`lib/model.js`). It is never written to disk, logs, `runs/`,
  the browser or the repo.
- `scrub()` in `lib/model.js` strips the key, and anything key-shaped, from error messages; `sendJson` in
  `lib/http.js` scrubs every HTTP response.
- The Claude Code backend runs with `FAL_KEY` blanked in its environment, in `/tmp`, so the key and the repo's files
  never reach it.
- **Leak test** (`test/leak.test.js`, offline): a full run through the HTTP API with `MODEL_BACKEND=fal` and a
  sentinel key, against a hostile fake fal that echoes the key back in its replies and in an error. It asserts the
  sentinel appears nowhere in `runs/`, the console, or any HTTP response, SSE included. `e2e/yoga.e2e.js` step 8
  repeats the check through the real UI.
- In cloud build sessions the network proxy injects the key, so the code never sees it there.
