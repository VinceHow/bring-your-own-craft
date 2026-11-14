# Skills taken from ECC (everything-claude-code)

Cherry-picked from github.com/affaan-m/everything-claude-code (MIT, `ECC-LICENSE`), unmodified. No hooks, agents or
commands taken; ECC is not installed.

- `verification-loop`: check work before calling it done.
- `e2e-testing`: Playwright test patterns (here: use the preinstalled Chromium; never run `playwright install`).
- `frontend-design-direction`: design direction for the room's polish pass (its `check-evidence.js` script isn't in
  the upstream folder, so that step is skipped).
- `ui-demo`: recording the backup demo video in the 03:00–07:00 block.

Skipped: agents `build-error-resolver` (TypeScript/ESLint focused; we have no build step) and `e2e-runner` (asks
for a global `agent-browser` install and `playwright install`, which breaks the preinstalled browser here).

# taste-skill (design-taste-frontend)

Installed in full at Vincent's request (14 Nov), on `design/studio`: github.com/Leonxlnx/taste-skill at f6b7657
(tasteskill 2.5.1), folder `skills/taste-skill` copied unmodified as `design-taste-frontend` (MIT, its `LICENSE`).
Used by the design studio for the room's looks. One change from upstream: the `hooks:` block (a Stop hook that runs
the finish gate for up to 10 minutes) is removed from SKILL.md's frontmatter, so it never blocks a session from ending. `vendor/taste-skill/` (the earlier partial copy) stays as it was.
