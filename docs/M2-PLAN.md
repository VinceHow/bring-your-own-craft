# Milestone 2 plan: overnight to submission

Product owner, with the lead, the build lead and the design lead. 14 Nov, ~21:15 UTC. Sources: `DEMO.md` (stage flow
Vincent confirmed), `docs/BAKERY-BRIEF.md` (his bakery walkthrough). Status: **waiting on Vincent's yes.**

**The answer: feasible. Usage is at 28% after this afternoon's reset (the lead watches the burn and alerts if the
overnight pace would pass ~70% before the demo), and the hard freeze is 10:00, so the full ~18.5 builder-hours fit.
The four cuts below are now the pre-agreed cut order, applied only if the 70% alarm or the 02:00 check says so.**

## Scope, in priority order (builder-hours, estimated from 21:10)
| # | Piece | Owner | Est. | Done by |
|---|---|---|---|---|
| 1 | Fix red e2e; video Range support for Safari | b7 | 1 h | ~22:30 |
| 2 | The quick-unblock action card (counts toward the 3, through the policy) | b1 | 2.5 h | ~23:45 |
| 3 | Stage flow: the first decision at 0:38, one focus moment, the cap test (exactly 3 grants) | b3 | 3.5 h | ~01:00 |
| 4 | Bakery re-record (the REPLAY fallback) | b3 | 0.5 h | ~01:30 |
| 5 | The bakery, slimmed: a fresh recorded run → **one** Bo attempt from the brief + the run's decisions → images → Railway → admin (Deliver, Restock, Reset) → the card | b6 | 2.5 h | ~04:00 |
| 6 | Slim acceptance suite: order, one per drop, hold and release, Deliver flip, restock/reset, admin locked, first name only | b1 | 1 h | ~01:30 |
| 7 | Full rehearsal on the backup route (MODEL_BACKEND=fal) **(must-have)** | b7 | 1 h | 07:00 |
| 8 | Restored (no longer cut up front): any seat is hers | b8 | 2 h | ~01:00 |
| 9 | Restored: the full build, Bo up to 2 attempts (instead of 1), the full suite, the live logo | b6, b1 | +4.5 h | ~07:00 |
| | **Total** | | **~18.5 h** | |

**Design, in parallel (~4.5 designer-hours, ~$0.50 of fal on design's own $5):** moments 1 and 2 in the room (the
decision cascade, the Yes action card) by 23:30; the bakery's art direction, admin readability notes and the "Built by
the team" strip by 23:00; the QR slide and the five close slides (HTML deck, PDF fallback) by 23:59. First open at
stage pace (≤30 s) is in hand.

Already done: the focus moment, voice, the inbox, the setup reveal; Railway (live, volume attached).

## Cut order (only on the 70% usage alarm or a red 02:00 check)
1. **The bread collection page.** One of each item per drop stays; the stamp card across demos goes to later.
2. **Any seat is hers.** Parked on its branch; the role choice stays Product · Your own craft.
3. **The full build drops to one Bo attempt and the slim suite.** If that attempt fails the suite, builders fix only
   what fails and list every edit, and the card says *"built by the team's engineer agent, finished by our builders."*
4. **The live logo.** Made ahead and labelled.

If we fall further behind at 02:00, design's cuts are next: the painted multiplayer scene, then the cascade's stagger.
**Never cut:** the three moments, the judges' order → Deliver flip, the cap test, the QR slide, the close line with
real numbers.

## Checkpoints
- **02:00 check:** each builder reports green or behind; the lead reports usage.
- **07:00 `demo-final` (aim):** the default path is frozen as a branch, with M1 kept as the fallback.
- **Three fallbacks, rehearsed once overnight by a builder (~15 min):** (a) model calls → MODEL_BACKEND=fal (the
  must-have full rehearsal by 07:00), with the labelled REPLAY as the last resort; (b) judges' phones or venue wifi →
  the bakery URL on screen plus a labelled clip of an order landing (Vincent's hotspot in the room); (c) the painted
  look or Safari video → the plain default look. In the morning Vincent toggles each once on his laptop.
- **07:00, Vincent:** set `ADMIN_TOKEN` in Railway (his own passphrase, never shared).
- **10:00 hard freeze** (Vincent engages while travelling): nothing new reaches the default path. **11:30:** submit.

## Budget
- **Builder-hours:** ~18.5 h; ~12 h if the cut order is applied. Builders use fakes first, one real e2e per push, and idle when done. If usage
  heads past ~70%, the cut order applies and everything but must-haves pauses.
- **Usage (the one real risk):** the overnight work and the live demo share one account, now at 28% after this
  afternoon's reset; the lead alerts before ~70%. The net: the fal backend runs the whole room (tested 9/9, ~1.5x
  slower) plus the labelled REPLAY, so the demo can't be blocked outright.
- **Money:** bakery images ~1¢; design's fal ~$0.50 (from the $5 Vincent gave design); Railway cents a day inside
  his $20 credit; fal text calls only if we fall back, ~$0.20–0.50 a run (estimated). Nothing else.
