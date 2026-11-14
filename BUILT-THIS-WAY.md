# Built this way

We built Bring your own craft the way the product works: one person stayed in the craft he loves, and a team of agents
did the rest, bringing him only the calls that needed him.

Vincent sat in the Product seat. Everything else (splitting the work, the code, the reviews, the merges) was done by
Claude Code agents, each in its own cloud session, talking to each other through session messages. This page is
drawn from `docs/DECISIONS.md` (who decided what, as it happened), `docs/HOW-THE-IDEA-EVOLVED.md` and the git history.
Times are UTC, Saturday 14 November 2026.

**Status: draft.** Numbers marked **TBD** are filled in after the final gate run; every number here comes from the
repo or a real run, never an estimate.

## The team

| Seat | Who | What it did |
|---|---|---|
| Product | **Vincent** (human) | The idea, the vision, the calls only he could make: spending, the demo's shape, what reaches the judges |
| Product owner | an agent session | Shaped the experience with Vincent in plain conversation; wrote each agreed change into `DEMO.md`, `BRIEF.md` and `VISION.md` on its own `po/*` branch |
| Build lead | an agent session | Split the work, priced each change, wrote the seams (`CONTRACT.md`), started the builders, logged decisions |
| Builders | agent sessions, up to eight at once | Each owned one piece on its own `build/<piece>` branch and the files its brief named |
| Reviewer | an agent that didn't write the change | One quick independent pass per change: against the brief, and that the demo still runs |
| Merger | an agent session | Took finished branches, ran the gate, merged to `main` |
| Design studio | agent sessions on `design/*` branches | The look: painted studio, ink-paper overlays, comps; visuals only through CSS "looks" and `data-*` hooks |

## How a change moved

1. **Vincent and the product owner** agreed a change in conversation (for example "after Send she stays on her
   page"), and the product owner wrote it into the docs on a `po/*` branch.
2. **The lead** priced it in builder-hours and either accepted it, cut it to fit, or parked it in `NEXT.md`. Nothing
   good was dropped on an assumed scope: the lead priced before anything was cut.
3. **A builder** built it on its branch, with tests against fake models (no model spend), and pushed often.
4. **A reviewer** that didn't write it checked it. It blocked only on a demonstrated break (two real examples: a
   rolling-digit race that showed 99 instead of 90 on the meter, and two claims in the docs that weren't yet true).
5. **The merger** ran the gate (`npm test`, then the end-to-end walk in Chromium with the real model) and merged.
   `main` stayed demoable throughout; checkpoints were kept as `demo/<name>` branches.

From a builder's side, the rule was: decide technical questions yourself and say what you chose; bring the lead only
what changes the demo, needs new spending, or breaks a cut line.

## What Vincent decided, and what the agents decided

Vincent's standing rule (12:31): *agents decide most things; only spending, real blockers and the check-ins reach
him.* In practice that meant:

- **Vincent's calls:** the timetable (core by 00:00, submit 11:30); the track (Autonomous Agents); which keys to fund
  (fal, ElevenLabs) and which sponsors to drop (MongoDB); the persona and the demo idea (Priya, a product manager,
  building an ordering site for a friend's bakery); the vision itself, declared final at about 15:51; and each turn in
  how it should feel (`docs/HOW-THE-IDEA-EVOLVED.md`).
- **The agents' calls:** the four-piece split and the seams; how to call the model (Claude Code headless with our own
  system prompt and no tools, about 1.9k tokens of context); diagnosing test failures before patching them; how fast
  the close had to be (2 candidates per seat, 10.8 s instead of 18.9 s); which backend runs on stage.

`docs/DECISIONS.md` has every one, with who and why.

## The rules we kept

- **Honest numbers.** Every number on stage comes from a real run's event log, and anything prepared ahead is labelled
  PREPARED or REPLAY. When the baseline moved from a yoga studio to the bakery, the old count (22) was retired, not
  reused: the bakery baseline is **0 questions, 24 guesses, 20 approvals**, counted by hand
  (`docs/baseline/run-3-bakery/GUESSES.md`).
- **The key never leaks.** The fal key lives only in server memory or the network proxy; a leak test checks every
  place it could escape.
- **The ceiling of three is code, with its test.** The model ranks; code counts. When the question bar was redesigned
  (twice), the ceiling and its test stayed untouched.
- **Skeleton first, look second.** From 16:30, builders built structure and `data-component` / `data-slot` hooks only;
  the design studio owned every visual (`docs/COMPONENTS.md`).

## Cut lines and calls that changed the plan

- **fal stayed off for the live model calls.** The key was refused from cloud sessions, even after Vincent re-saved it;
  the demo runs on the Claude Code backend, and we say so on stage. The fal code path exists and is tested against a
  fake fal.
- **A weekly-limit scare** (16:45): one build failed with a usage-limit message from the Claude Code backend, then all
  models answered normally minutes later. It was raised to Vincent as the top demo risk.
- **The yoga studio became the bakery** (15:44), and the hard "at most three" promise became a hidden ceiling with
  no number promised on screen.
- **Usage discipline:** fakes in tests, real-model runs only when asked, the full end-to-end walk at most once per push.

## By the numbers (from git)

| | |
|---|---|
| Commits on `main` | **TBD** at submission (389 at 20:20 Sat) |
| Merges to `main` | **TBD** (163 at 20:20 Sat) |
| Builder branches (`build/*`) | 12 |
| Product-owner branches (`po/*`) | **TBD** (32 at 20:20 Sat) |
| Design branches (`design/*`) | **TBD** (19 at 20:20 Sat) |
| Unit tests (`npm test`, offline, no model calls) | **TBD** (189 passing at 20:20 Sat) |
| End-to-end walk (Chromium, real model) | **TBD** at the final gate |
| Decisions logged | **TBD** (59 rows in `docs/DECISIONS.md` at 20:20 Sat) |

## What it taught us about the product

The build was the product's own pitch, lived for a day. Vincent spent his time on the parts he's best at: what
Priya should feel, what reaches her, what the judges see. The agents handled their own work and brought him only the
few calls that were his. The same three things mattered here as in the product: a team that assumes and keeps moving,
a bar for what reaches the human, and rules that matter enforced in code.
