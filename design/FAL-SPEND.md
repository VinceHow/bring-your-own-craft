# fal spend: build tests

The studio's full fal log (images, clips, music) is on the `design/studio` branch in this same file path; Vincent's fal
dashboard is the source of truth. This file only logs **real-model test runs on the fal backend**
(`MODEL_BACKEND=fal NODE_USE_ENV_PROXY=1`), under the tech lead's rule: budget $10, stop and ask at $8.

## build tests

Cost is estimated from the token usage fal returns for every call (logged per call by a fetch meter outside the repo),
at list rates: Sonnet 4.5 $3 / $15 and Haiku 4.5 $1 / $5 per million tokens in / out. The dashboard may differ.

| Date (UTC) | Spec(s) | Model calls | Tokens in / out | ≈ Cost | Running total | Result |
|---|---|---|---|---|---|---|
| 15 Nov 00:03 | e2e/yoga.e2e.js (smoke), main 23efe3a | 22 (10 Sonnet 4.5, 12 Haiku 4.5), all HTTP 200 | 30,987 / 5,585 | $0.16 | $0.16 | 5/8: the selector brought 0 of 24 candidates (claude-code brings 1–3), so tests 4 and 5 failed |
