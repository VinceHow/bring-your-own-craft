# Evidence: design/polish-inputs + design/polish-motion (painted look)

Checked against docs/POLISH.md in a real browser, painted look, at 1920×1130 and 1440×900. The 1280×800 check was earlier
in the session; its numbers are in the handover message. All files below are in this folder.

## POLISH.md items
| Item | Result | Evidence |
|---|---|---|
| §2 long text (~300 words, pasted paragraph): the idea card scrolls inside itself, nothing overflows, no page scroll | PASS | `1920-1-idea.jpg`, `1440-1-idea.jpg`, `ev-inputs-1920.txt`, `ev-inputs-1440.txt` |
| §2 the name tag likewise (it clipped long text with no scroll before) | PASS | `1920-2-nametag.jpg`, `1440-2-nametag.jpg`, same logs |
| §2 the focus field likewise | PASS | `1920-4-focus.jpg`, `1440-4-focus.jpg`, same logs |
| §2 the unblock answer: grows to a few lines, then scrolls (it reached 839 of 900 px before) | PASS | `1920-hers-300w.jpg`, `1440-hers-300w.jpg`, `ev-hers-*.txt` |
| §2 mic inside the box (idea, name tag, focus) | PASS | the shots above |
| §2 mic on #her-input and #close-input | FAIL, build side: neither input has data-voice | `ev-inputs-*.txt` ("no mic") |
| §2 empty input: Next / Make my tag / Send visibly unavailable | PASS | `*-empty.jpg`, the "empty:" lines in the logs (opacity .42, cursor default) |
| §3 the name tag fades in once (it dipped to ~70% and back) | PASS | `ev-motion-*.txt` (opacity rises only) |
| §3 no one-frame 17 px jump of the name tag on Enter | PASS | `ev-motion-*.txt` ("make my tag": top steady) |
| §3 End meeting → takeaways without a blank beat | PASS | `1440-end-meeting-strip.jpg` |
| §3 reduced motion: the setup's papers appear static, and no note flies | PASS | handover message (frame log under reducedMotion: reduce) |
| §1 her composer: Send is the one primary, "Add this" and End meeting secondary | PASS (CSS keyed on [data-rank], else on the slot) | handover message |

## e2e, painted (stubbed), on this branch
- `E2E_LOOK=painted node --test e2e/nametag.e2e.js e2e/focus-ack.e2e.js`: 16 pass / 0 fail (`e2e-nametag-focus-ack-painted.log`)
- `E2E_LOOK=painted node --test --test-name-pattern="^(1e|2b|2c)\." e2e/beats.e2e.js`: 3 pass / 0 fail (`e2e-beats-1e-2b-2c-painted.log`)
- `npm test`: 281 pass / 0 fail
