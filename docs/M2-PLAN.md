# Milestone 2 plan: overnight to submission

Product owner, with the lead, the build lead and the design lead. 14 Nov, ~21:15 UTC. Sources: `DEMO.md` (stage flow
Vincent confirmed), `docs/BAKERY-BRIEF.md` (his bakery walkthrough). Status: **waiting on Vincent's yes.**

**The answer: feasible, with one real risk (the weekly usage limit), if we cut the collection page now and keep the
rest under the caps below.**

## Scope, in priority order
| # | Piece | Owner | Est. (from 21:10) | Done by |
|---|---|---|---|---|
| 1 | Fix red e2e; video Range support for Safari | b7 | ~1 h | ~22:30 |
| 2 | Stage flow: the first decision at 0:38, one focus moment, the cap test (exactly 3 grants) | b3 | ~3.5 h | ~01:00 |
| 3 | The quick-unblock action card (counts toward the 3, through the policy) | b1 | ~2.5 h | ~23:45 |
| 4 | Bakery acceptance suite (11 tests from the brief) | b1 | ~1.5 h | ~01:30 |
| 5 | The bakery: fresh run → Bo builds it (≤2 attempts) → images → Railway → admin (Deliver, Restock, Reset) | b6 | ~6–7 h | ~06:30–07:00 |
| 6 | First open at stage pace (≤30 s) | design | [from design] | [ ] |
| 7 | Any seat is hers: finish behind its Product-path guard | b8 | ~2 h | ~01:00 |
| 8 | Bakery re-record (the PREPARED fallback) | b3 | ~0.5 h | ~01:30 |
| 9 | Full rehearsal on the backup route (MODEL_BACKEND=fal) **(must-have)** | lead | ~0.5 h | 07:00 |

Already done: the focus moment, voice, the inbox, the setup reveal; Railway (live, volume attached).

## Cut now, and the cut order if we fall behind
- **Cut now: the bread collection page.** One of each item per drop stays; the collection across demos goes to
  later. It's new work inside the bakery build and the least seen on stage.
- **Then, at the 02:00 check, in this order:** (1) any-seat, if it isn't green; (2) the full agentic build
  becomes a smaller Bo run (only the rules and admin; the storefront from builders). If builders write the bakery
  logic, the card and Vincent's line say "built by our builders", not "by the team"; (3) the live logo.
- **Never cut:** the three moments, the judges' order → Deliver flip, the cap test.

## Checkpoints
- **02:00 check:** each builder reports green or behind; cuts apply in the order above.
- **07:00 tag `demo-final`:** the default path is frozen, with M1 (demo/core) kept as the fallback. Rehearse every
  fallback once: Vincent's hotspot, the bakery URL on screen, the REPLAY run, the fal backend.
- **07:00 Vincent:** set `ADMIN_TOKEN` in Railway (his own passphrase, never shared).
- **After 07:00:** fixes only. **09:00:** nothing new merges. **11:30:** submit.

## Budget
- **Builder-hours:** ~17 h estimated from 21:10 (pieces 1–8, collection cut). The lead's guide is ~12 h for the
  usage limit, so builders use fakes first, one real e2e per push and idle when done; Bo gets at most 2 attempts.
  If any session reports a usage warning, any-seat and the full build pause first.
- **Usage (the one real risk):** the overnight work and the live demo share one account, already at "warning"
  today; it resets Sunday 21:00, after judging. The net: the fal backend runs the whole room (tested 9/9, ~1.5x
  slower) plus the labelled REPLAY, so the demo can't be blocked outright.
- **Money:** fal images a few cents (~0.3¢ each, <10); Railway cents a day inside Vincent's $20 credit; fal text
  calls only if we fall back, ~$0.20–0.50 a run (estimated). Nothing else.
