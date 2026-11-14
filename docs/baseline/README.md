# Baseline: a plain coding agent on the same prompt

Prompt: "Build me a booking page for a small yoga studio." Empty folder, default Claude Code, no project files.

## Run 1: headless (`claude -p`), 14 Nov ~12:00
- **Questions asked: 0.** It invented a studio ("Stillwater Yoga"), seven classes and four teachers, and built the
  page. It was blocked twice waiting for approval (a syntax check and a publish), and ended by asking for the real
  studio details and for approval to publish.
- 11 turns, 133 s, $0.83 (as reported by the CLI).
- Why it isn't the stage number: headless mode can't show interactive questions, so this measures "guesses
  everything", not "asks about everything". Kept as evidence.

## Run 2: interactive, answered by a script
Every dialog gets its default answer; every question in text gets "Your call. Go with your best judgement and
finish it." Each ask is logged with its screen. Results below when it finishes.
