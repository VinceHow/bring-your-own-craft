# Run it on your Mac

1. **Get the latest:** in Terminal, in the project folder, run `git pull`.
2. **Check the machine:** `npm run doctor`. Every line should say PASS (NOTE and WARN are fine: the room still runs). Each FAIL comes with a fix line.
3. **Start it:** `npm run local`, then open **http://localhost:3000** in Chrome. Ctrl-C in Terminal stops it.

**Or double-click:** `Start BYOC.command` (in the project folder) checks the Mac, starts the room and opens it in
Chrome; close its Terminal window to stop. `Stop BYOC.command` stops it too. The first time, macOS may say it "can't be
opened": right-click it → Open → Open, once. (Not yet tried on a Mac.)

**Your keys** go in a file called `.env.local` in the project folder. Git never commits it, and the app never prints the
values. Create it in TextEdit (Format → Make Plain Text), save it as `.env.local`, with one key per line:

```
FAL_KEY=your-fal-key-here
ELEVENLABS_API_KEY=your-elevenlabs-key-here
LINKUP_API_KEY=your-linkup-key-here
ADMIN_TOKEN=any-long-random-word
# MODEL_BACKEND=fal   (remove the # to use fal instead of Claude Code, e.g. if Claude Code hits a usage limit)
```

**Pages:** `/` (the studio, plain look) · `/?look=painted` (the painted look) · `/gallery` (every component).
**Keys:** **S** stage mode (big type, no chrome) · **R** replay the rehearsal · **?** the help card (all the keys).
**To update:** `git pull`, then stop it (Ctrl-C) and run `npm run local` again.
**Voice:** the browser asks for the microphone once; say Allow. Chrome is recommended (Safari works, but asks
differently).
