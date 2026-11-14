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
finish it." Each ask is logged with its screen (`asks.log`).
- **Questions asked: 0** (no AskUserQuestion calls, no question in its text). **Approvals: 1** (publish the page).
  ASK 2 in `asks.log` is a false positive (the "?" in the shortcuts footer); the script was stopped there.
- It invented "Juniper Street Yoga", four teachers, two rooms (12 and 8 mats), a timetable, a 2-hour cancel
  cut-off, "pay at the front desk", sign-in to book, and published it, then said "replace these with your real…".
- ~2.5 min. Caveat: this ran in a claude.ai cloud container, so the agent had that environment's page-publishing
  tools; a laptop install would differ. The published page is private to Vincent's account.

## What this means for the close
The "14" doesn't hold: the default agent on this prompt asks ~0 and guesses everything. See the lead's note to Vincent.
