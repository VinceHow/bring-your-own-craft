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
| 15 Nov, reported by 00:12 (builder 8) | one select call, recorded for the fix (24 candidates from a yoga run), main 03a7a59 | 1 (Sonnet 4.5), HTTP 200 | 4,202 / 1,324 (fal's own count) | $0.03 | $0.19 | every score had changes 0, a field the prompt never asks for: nothing cleared the bar. Kept as test/fixtures/fal-select-reply.json |
| 15 Nov, reported by 00:12 (builder 8) | e2e/yoga.e2e.js on fal with the selector fix, main 03a7a59 | not metered | not metered | ≈$0.16 (estimate: the 00:03 run of the same spec) | ≈$0.35 | 7/8: the selector brought 2 of 24 (tests 4 and 5 pass). Test 3 failed: the intro tidy on fal changed her words ("getting" → "get"), so L1 isn't verbatim |
| 15 Nov, reported by 00:16 (builder 8) | e2e/yoga.e2e.js on fal: main 4058b17 + the intro tidy guard + the selector fix | not metered | not metered | ≈$0.16 (estimate: the 00:03 run of the same spec) | ≈$0.51 | 8/8: her L1 kept her exact words, the selector brought 2 of 24, no joint.error |
| 15 Nov, reported by 00:16 (builder 6, via the tech lead) | bakery recorded run on fal, 4 runs | not metered, all HTTP 200 | not metered | ≈$0.4–0.6 (estimate) | ≈$0.9–1.1 | recorded runs |
| 15 Nov, reported by 00:16 (builder 6, via the tech lead) | images: 4 × flux/schnell | 4 | n/a | ≈$0.012 | ≈$0.9–1.1 | images |
| 15 Nov 00:18 (merger) | full `npm run e2e` on fal, main 25c285f | 164 (96 Sonnet 4.5, 68 Haiku 4.5): 158 HTTP 200, 6 HTTP 401 (voice.e2e.js strips the proxy env, so its calls go out keyless) | 232,942 / 38,481 | $1.15 | ≈$2.1–2.3 | 80/82: nametag.e2e.js:86 (300 ms wait) and voice.e2e.js:88 (its tidy call 401s without the proxy) |
| 15 Nov 00:05 (builder 7) | name-tag smoke: `/api/name-tag` part=card and part=more (Haiku) | 2 | not metered | < $0.01 (estimate) | ≈$2.1–2.3 | card 2.9 s, more 4.1 s |
| 15 Nov 00:12 (builder 7) | jank sweep 1b: one full painted flow, name tag to her page | ~25 | not metered | ≈$0.30–0.50 (estimate) | ≈$2.4–2.8 | 231 s, no `[model]` failures |
| 15 Nov, reported by 00:26 (builder 7) | e2e/craft.e2e.js (her own craft) | ~20 | not metered | ≈$0.25–0.40 (estimate) | ≈$2.7–3.2 | 4/4 |
| 15 Nov 00:31 (merger) | full `npm run e2e` on fal: main 1e1fd2a + d17c88f + 7d46a22 + painted 14f8afd + app-button-2 3b44f4d | 155 (91 Sonnet 4.5, 64 Haiku 4.5): 149 HTTP 200, 6 HTTP 401 (voice.e2e.js strips the proxy env, as before) | 224,428 / 37,006 | $1.12 | ≈$3.8–4.3 | 83/86: beats.e2e.js:78 "1b" (fails every time: it still expects the retired DIY popup's .tag-input, after 6bd9dbf), voice.e2e.js (proxy env), yoga.e2e.js:186 (no re-decision cited her new L4 on fal) |
| 15 Nov 00:44 (merger) | e2e/beats.e2e.js on fal: main 8019281 + build/beats b9a6859 (the meeting model) | 34 (26 Sonnet 4.5, 8 Haiku 4.5), all HTTP 200 | 57,555 / 9,664 | $0.30 | ≈$4.0–4.5 | 11/11, including 2 Focus rounds then End meeting |
