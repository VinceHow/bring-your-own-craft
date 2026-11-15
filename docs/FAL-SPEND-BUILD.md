# fal spend: build tests (builder 7)

Real-model test runs on `MODEL_BACKEND=fal` (Vincent's call, Sat 23:53, to save the Claude limit). Approximate cost
from the number of calls at OpenRouter-via-fal rates for the models named; Vincent's fal dashboard is the source of
truth. Each run is grepped for `[model] … failed`; none so far.

## build tests
| Time (UTC) | Spec / check | Calls | Approx. $ | Result |
|---|---|---|---|---|
| Sun 00:05 | name-tag smoke: `/api/name-tag` part=card, part=more (haiku) | 2 | < $0.01 | card 2.9 s, more 4.1 s |
| Sun 00:12 | jank sweep 1b: one full painted flow, name tag to her page (haiku tidy/tag, sonnet teammates, selector, joint, build) | ~25 | ~$0.30–0.50 | 231 s, no failures |
| Sun 00:35 | `e2e/craft.e2e.js` (her own craft: tag, sketch, team, select, build press) | ~20 | ~$0.25–0.40 | 4/4 |
