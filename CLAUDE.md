# Bring your own craft: how agents work here

A one-off hackathon build. Core done by 00:00 Saturday night; Devpost submission at 11:30 Sunday 15 Nov (it closes 12:00).
Read `VISION.md` first: the agreed picture (locked by Vincent, Sat). `BRIEF.md` is what we build and the schedule; `DEMO.md` is the 3-minute script it serves. When they disagree,
`DEMO.md` wins on what the audience sees, and `BRIEF.md` on how it's built. Vincent (the owner) is a product
person: write to him in plain English, recommendation first.

## Three rules we keep, even here
1. **Be honest about what you did.** Call something done or working only when you've seen it run. Say what you
   didn't test. Every number on stage comes from a real run; anything prepared ahead is labelled on screen.
2. **The fal key never leaks.** It's injected by the network proxy in cloud sessions, or read from `FAL_KEY` on the
   demo machine. Never write it to disk, logs, `runs/`, the browser, an HTTP response or the repo. The leak test in
   `BRIEF.md` must pass.
3. **Questions reach her only if they're big and in her craft.** The selector's ranking and threshold decide, with their tests.

## How we work
- The lead (Vincent's session) splits the work and starts the builders. Each builder works on its own branch
  (`build/<piece>`), owns the files its brief names, and pushes often.
- Every change gets one quick independent review pass (a reviewer agent that didn't write it), which checks it
  against the brief and that the demo still runs. It blocks only on a demonstrated break.
- Only the lead merges to `main`, and only what's reviewed and runs. `main` is always demoable.
- Decide technical questions yourself and say what you chose. Bring the lead only what would change the demo,
  needs new spending, or breaks a cut line. Follow the cut lines in `BRIEF.md` without asking.
- Reuse before building: taste-skill (MIT, in `vendor/`, never installed as a plugin in this repo), Anthropic's
  product-management skills (Apache-2.0). Keep their licence files and credit them in the README.
- Commits use `Vincent Hao <49104178+VinceHow@users.noreply.github.com>`. No model names in commits or code
  comments.

Licence: PolyForm Noncommercial 1.0.0 (`LICENSE`).
