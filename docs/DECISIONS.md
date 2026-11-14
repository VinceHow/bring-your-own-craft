# Decisions log (feeds BUILT-THIS-WAY.md)

Who decided what, as it happened. "Vincent" = his own words or his lead session relaying them; "agents" = the build
lead or a builder deciding for him. Only what actually happened.

| When | Who | Decision | Why |
|---|---|---|---|
| Sat 11:55 | agents (lead) | Fast-forward `setup/brief` into `main` | spec on main before building |
| Sat 11:57 | agents (lead) | Skip `--bare`; use own system prompt, no tools, no setting sources | `--bare` broke the login; this still cuts context to ~1.9k tokens |
| Sat 11:58 | agents (lead) | Shared skeleton + CONTRACT.md before builders start | four builders in parallel without editing each other's files |
| Sat 11:59 | agents (lead) | Four pieces: room, flow, selector, page | the split suggested in the kickoff, kept |
| Sat 12:00 | agents (lead) | Fonts from npm `@fontsource`, repos via git clone | Google Fonts and github.com web blocked here |
| Sat 12:05 | agents (lead) | Second, interactive baseline run | headless can't show questions; fairer test |
| Sat 12:08 | Vincent | Close becomes "asked 0, guessed N" + a judge's idea live + built-this-way line | baseline asked 0, not 14 |
| Sat 12:08 | Vincent | New timetable: core by 00:00, submit 11:30 | real hackathon times |
| Sat 12:08 | Vincent | Sponsor plan and order (docs/SPONSORS.md), low priority | "only if they dont add significantly" |
| Sat 12:10 | Vincent | fal key: yes, for fal.run only | he funded fal as the BYO-key route |
| Sat 12:11 | agents (lead) | Routes may match by function; `npm test` runs all tests | builder 2 found the seam |
| Sat 12:12 | agents (lead) | N = 22 guesses, counted by hand | docs/baseline/GUESSES.md |
| Sat 12:20 | Vincent | Declined the fal key form for now | his call; we stay on the Claude Code backend, which works |
| Sat 12:20 | agents (lead) | Don't re-ask for the fal key; on stage say "models run through Claude Code" | BRIEF §4: say whichever backend actually ran |
| Sat 12:22 | agents (lead) | E2E harness on main, unbuilt steps pending | BRIEF §5 "one shot" |
| Sat 12:24 | agents (reviewer) | Blocked build/room on a rolling-digit race (meter showed 99 vs 90) | demonstrated break |
| Sat 12:25 | agents (builder 3 → lead) | The 2:30 "decided for you" item is "does cancel ask for a reason?" (re-decided by her new line), not cancellation itself | the selector asks about cancellation in every yoga run; the ranking is not forced to fit the script |
| Sat 12:25 | agents (lead) | Run ids get a random suffix | same-millisecond ids collided in builder 3's tests |
| Sat 12:35 | Vincent → agents (lead) | Use ECC only by cherry-pick: 4 skills taken, 2 agents skipped, no hooks | wholesale install changes every session mid-build |
| Sat 12:28 | Vincent | Saved the fal key himself in the environment settings | the secure form kept rejecting it |
| Sat 12:29 | agents (lead) | fal still 401 in the lead session; test from a new session | docs: a new session picks up a saved secret |
| Sat 12:30 | Vincent → agents (lead) | Builders as visible sessions: in-flight subagents finish their task first, then all new work as sessions | handover >15 min would risk 20:00 |
| Sat 12:30 | agents (lead) | First builder session: judges' README, SUBMISSION.md, HOW-IT-WORKS (also tests fal) | needed by 07:00, no file overlap with live builders |
| Sat 12:31 | Vincent | Standing rule: agents decide most things; only spending, real blockers and the 3 check-ins reach him | "this is a hack, its not that deep" |
| Sat 12:31 | Vincent | Main track: Autonomous Agents; Figma via its connector for Best-Designed | |
| Sat 12:32 | agents (lead) | fal stays off; the demo runs on the Claude Code backend | fal key 401 from a brand-new session too; Claude Code works; not worth more time |
| Sat 12:33 | Vincent + PO | Close reordered (judge's idea first), she overrules once, new pin text | po/close-and-taste |
| Sat 12:36 | Vincent | Connected the fal MCP to the lead session (account ready, no billing block) | |
| Sat 12:37 | agents (lead) | fal MCP is for sponsor item 1 only (00:00 block): retry server-side fal from a fresh session; else pre-generate one hero image per demo idea via the MCP, labelled "made with fal before the demo" | core stays on Claude Code; nothing generated before core is green |
| Sat 12:37 | agents (reviewer) | Blocked build/docs on two not-yet-true claims (taste-skill vendored, recorded runs) | honesty rule |
| Sat 12:38 | agents (polish builder → lead) | Fixed flow boxes landing at scale(0) | found in Playwright with motion loaded |
| Sat 12:39 | Vincent | MongoDB dropped; Linkup stays (key if he adds it); ElevenLabs optional | plain-text secret not worth a voucher |
| Sat 13:00 | agents (lead) | Checkpoints are branches `demo/<name>` (also tagged locally): the git proxy drops tag pushes | demo-1 = beats 0:00–2:05 live, e2e 9/10 |
| Sat 13:46 | Vincent (via lead) | Near weekly usage limit: ≤3 builders at once, cheaper model for reviews, minimal real-model e2e runs | if the limit hits, every session stops overnight |
| Sat 13:47 | Vincent | Usage limits lifted: "all fine, I'm on ultra"; run builders and models as needed | |
| Sat 13:50 | Vincent | Merged .claude/settings.json: all Figma tools and read-only fal tools allowed without prompts; fal generation (run_model, submit_job) still prompts | builders shouldn't stall overnight |
| Sat 13:55 | agents (lead) | One e2e failure after the polish merge diagnosed as the test server being killed mid-run (run stopped 1 s after teammate.start, no error logged); 2 reruns on the same commit green 9/10; builders told to kill only their own PIDs | diagnosis before patch |
| Sat 13:57 | Vincent | Question rationing to be redesigned with the PO; existing cap code stays for now, nothing new depends on exactly 3 | "a more tasteful way rather than hard fixing that in code" |
| Sat 14:00 | Vincent + PO, lead OK'd | Sixth seat Strategy (gold #BB8B41), she clicks her seat, 'assembling the team' walk-in; CONTRACT.md seats updated | worth ~1 h; we're ahead |
| Sat 14:05 | agents (lead) | Her card's 'I love…' line: optional `intro` on POST /api/run becomes L1 (her words), one prepared seed line stays as L2 | smallest seam; keeps her new line at L3 |
| Sat 14:10 | agents (lead) | demo-2: whole yoga script end to end on main, e2e 10/10, build beat 24.7 s; beats merge held back (5 e2e failures with polish.css on main), sent back to fix | main stays demoable |
| Sat 14:18 | agents (lead) | Browser-closed e2e failures traced to builder 4's headless café session running `pkill -f chrome` before each gate run; stopped. Beats + strategy merges pushed only after a clean 15/15 e2e | diagnosis before patch |
| Sat 14:25 | Vincent (via PO) | Voice (ElevenLabs STT, push-to-talk) is core for her intro and idea; typed fallback always | |
| Sat 14:25 | agents (lead) | Her open ask zooms to readable size (≥18 px at 1280) rather than trimming the selector's words | 13 px was too small on stage |
