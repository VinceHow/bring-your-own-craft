# The polish bar (Vincent, Sun 02:50): no mistakes when he tests at 07:00

One list, gathered from everything Vincent asked for across the lead, PO and design sessions. Every screen and every
input on the stage path (`DEMO.md` order) is checked against it, painted look, fal backend, at 1920×1130, 1440×900 and
1280×800, day and night. The final audit (`docs/AUDIT.md`) records PASS/FAIL per item with evidence (a screenshot or
clip path, or command output). Nothing is called done without evidence.

## 1. One thing per screen
- Exactly **one primary action** is visible: one input or one button. Everything else stays hidden until it's needed
  (counters, pills, hints, toolbars, chatter, the app tag, previews).
- **At most one line of guidance.** Cut every sentence she doesn't need to do the one thing.
- When something fights this rule, remove or hide it rather than restyle it.

## 2. Every input is a good input
- **Every place she types or speaks has the magical tidy in place:** the idea, the name tag, focus-doc pieces and
  replies, and the unblock card's answer. The tidy may reorder and cut; the content words stay hers. It never overwrites
  what she's typing while it runs, and it never flickers when it's skipped.
- **Every input has the mic** (tap or hold · ElevenLabs), and voice lands in the same tidy.
- **Long text in every input:** a ~300-word answer and a pasted paragraph. The field grows or scrolls inside itself;
  nothing overflows its card, pushes a control off-screen, or puts a scrollbar on the page.
- Empty input: the primary action is visibly unavailable or says what's needed. No error dumps.
- Enter submits, Shift+Enter makes a new line, Esc goes back, and shortcuts (S, R, J, ?) never fire while she's typing.

## 3. Calm, clean motion
- Every change of screen or state is a smooth transition (~200–400 ms, eased). No layout jump, no flash of unstyled
  content, no jitter (toys included), no overlap mid-transition.
- `prefers-reduced-motion` gets static versions.
- **The magic moments, each scored magical / fine / flat with a clip:** the door plaque, the tidy, the handwritten name
  tag, each meet card's entrance, the team getting to work, a teammate's reply arriving, End meeting → takeaways, and
  Bo's smile on Yes. Fix anything flat.

## 4. Never lost, never stuck
- Within 300 ms of any action she sees who is doing what ("Wren is reading what you said…").
- Every wait has a plain status. A failure says so plainly, with Retry, and keeps her words. No dead pages.
- The meeting: compose is calm (past rounds collapsed); Send shows live replies; End meeting gives the takeaways; the
  column scrolls to the newest item, with a "New replies ↓" pill if she has scrolled up.
- The inbox has one home (top right): empty / new / open. No question previews in the room. Chatter is short notes
  (≤8 words, at most 2 at a time) that fade.
- Empty states say what's next ("Bo starts once you agree the page"), never just "nothing yet".

## 5. Nothing broken-looking
- No browser scrollbars except the one intended scroll column; no white frames; no clipped painted frames; no default
  browser buttons; no text touching edges; no cut-off words; nothing floating detached.
- Contrast is at least 4.5:1 for text, on day and night scenes.
- The cursor (Vincent's pick C): her pink paper-cut triangle; over clickables its corner folds (cream underside); an
  inked I-beam in inputs; busy dots while waiting; a pale "not now" scrap when something isn't available. The paw is
  only for the rain window at night.
- Sound: the record player is music only; rain only at night, toggled by the window; stage mode starts muted.

## 6. True on screen
- Everything prepared ahead is labelled ("researched before the demo", "Recorded earlier", "made ahead").
- Sponsor credits on the meet cards come in two lists, and every line must be true: **"Loaded with"** (used live: Linkup
  for Wren, ElevenLabs on the mic, Claude for everyone, Claude Code for Bo only where it's literally true) and **"Made
  with"** (prepared ahead: fal for the painted studio, clips and music; Figma for the room's frames, taken from code into
  Figma per `design/FIGMA.md`; taste-skill).
- Only big questions in her craft reach her, no number promised (rounds don't count as asks; a hidden safety ceiling holds), and the fal key never appears in the browser, logs or `runs/`.

## 7. Vincent's own path works first time
- `docs/RUN-LOCALLY.md` and `docs/REHEARSAL.md` are followed command by command on a clean checkout, and the outputs
  match what the docs say.
- `npm run doctor` shows the route on its first line. The fallbacks work as written: `?look=plain`, R replay,
  `?setup=classic`, `?meeting=0`, Fallback B (company Claude Code, six `*_MODEL=sonnet` lines), and the bakery clip/URL.
