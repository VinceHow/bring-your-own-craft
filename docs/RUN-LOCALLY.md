# Run it on your Mac

1. **Get the latest:** in Terminal, in the project folder, run `git pull`.
2. **Check the machine:** `npm run doctor`. Every line should say PASS (NOTE and WARN are fine: the room still runs). Each FAIL comes with a fix line.
3. **Start it:** `npm run local`, then open **the URL it prints** in Chrome (usually http://localhost:3000; if another
   app already uses 3000, it picks the next free port, such as 3001, and never touches the other app). Ctrl-C stops it.

**Or double-click:** `Start BYOC.command` (in the project folder) checks the Mac, starts the room and opens it in
Chrome at the right URL; close its Terminal window to stop. `Stop BYOC.command` stops it too. The first time, macOS may say it "can't be
opened": right-click it → Open → Open, once. (Not yet tried on a Mac.)

**Your keys** go in a file called `.env.local` in the project folder. Git never commits it, and the app never prints the
values. Create it in TextEdit (Format → Make Plain Text), save it as `.env.local`, with one key per line:

```
FAL_KEY=your-fal-key-here
ELEVENLABS_API_KEY=your-elevenlabs-key-here
LINKUP_API_KEY=your-linkup-key-here
ADMIN_TOKEN=any-long-random-word
MODEL_BACKEND=fal
# Fallback B (company Claude Code): comment out MODEL_BACKEND=fal above, uncomment these six, restart.
# TAG_MODEL=sonnet
# THREAD_MODEL=sonnet
# JOINT_MODEL=sonnet
# FIRST_MODEL=sonnet
# GUEST_MODEL=sonnet
# TIDY_MODEL=sonnet
```

The demo runs on fal. `npm run local` and `npm run doctor` print the route on their first line (`route: fal`). If fal
fails on stage, see "Fallback B" in `docs/REHEARSAL.md`.

**Pages:** `/` (the studio, painted look: the default) · `/?look=plain` (the plain look, the fallback) · `/gallery` (every component).
**Keys:** **S** stage mode (big type, no chrome) · **R** replay the rehearsal · **?** the help card (all the keys).
**To update:** `git pull`, then stop it (Ctrl-C) and run `npm run local` again.
**Voice:** the browser asks for the microphone once; say Allow. Chrome is recommended (Safari works, but asks
differently).
