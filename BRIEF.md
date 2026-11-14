# Brief: Bring your own craft

> **Take the seat of the craft you love, and a team fills the rest.** They bring you **at most three questions**,
> chosen for your craft and what you're building, and decide everything else your way. You leave with a page that's
> yours, and a file of your own philosophy you never had to write.

**Deadline: core done ~06:00 Sun 15 Nov; sponsor layer 06:00–07:00; buffer to 08:00. It's ~12:45 Sat. Solo: me (Vincent)
plus you, in an empty repo.** The 3-minute demo (section 2) is the spine: **if it doesn't serve a beat, don't build it.**
Where this is silent, decide from the promise and the demo, carry on, and tell me what you chose. **[checked]** marks
what a tech lead already ran against the real tools; re-measure here, don't re-research.

## 1. The idea
Prompt-to-app tools guess everything; coding agents ask about everything. Here you take one of five seats (**Product,
Design, Data, Research, Engineering**), do your craft, and the team brings you only the decisions worth your time,
inside your work. One polished journey: **Priya, a product lead, in the Product seat**, building a booking page for a
small yoga studio. **Pitch line:** *"Bring your own craft."*

**Craft vs stamping (the meter, IN YOUR CRAFT %, uses this).** *Craft:* working in your own medium, including a choice
that arrives *inside* it (a fork on her flow). *Stamping:* anything that only says yes/no to the tool (a pop-up, an
approval, a "continue?"). Waiting is neither.

**A thin layer; build only what doesn't exist.** Product's engine: Anthropic's **product-management plugin**
(github.com/anthropics/knowledge-work-plugins, `product-management/skills/write-spec`, Apache-2.0), which drafts the
spec and the Product decisions from her flow. The page: a **taste-skill** template (github.com/Leonxlnx/taste-skill,
MIT). Vendor and credit both. Ours: the room, the selector, her file, the counter, the meter, the fill.

## 2. The demo, beat by beat (~3:00)
The presenter's lines are in the PO's demo doc (Vincent has it). Keyboard-driven. If a live beat fails, **R** swaps in the dress-rehearsal run, labelled **REPLAY** while on screen.

| Time | On screen | Live? |
|---|---|---|
| **0:00–0:22** The room | An empty table from above, five seats. Her card slides into **Product**; four teammates slide in and sit, silent, each with a stance on its place card: *sketch first, polish last* · *only what we'll measure* · *what's known, with sources* · *boring and correct*. | live |
| **0:22–0:30** First move | A blank sheet in front of her: **"What are we building today?"** She writes: "A booking page for a small yoga studio." | live |
| **0:30–0:55** Her journey | She writes one line a step; each becomes a box with arrows: classes → a class → confirm → booked; regulars → "Book your usual". | live |
| **0:55–1:10** Team works | Sheets fill at each seat; a counter rolls: **"23 decisions came up · 3 brought to you"** (real numbers). | live |
| **1:10–1:45** Her three | **In her work**: a fork on her flow, a pin on a box, each with a recommendation and reason (in rehearsal: a waitlist, backed by Research's sourced finding; how a regular is recognised; what confirm asks for). **The run picks them.** She takes one branch. | live |
| **1:45–2:05** Her taste, named | Design's grey sketches slide over. She pins: *"Never ask for a phone number. Regulars hate it."* Her file card: **"Sounds like: never ask for what you could remember."** She rewords it (*"…anything you could remember or skip"*); it writes into her file. | live |
| **2:05–2:30** Build | One press; Engineering's sheet ticks through the build. She taps the counter: why her three made the cut; for each of the rest, the line of her file that decided it. | **live**, from her answers |
| **2:30–2:42** Her page | Regulars first, no phone field, her words. Under it, "decided for you": cancel is one tap, no reason asked, **citing the line she wrote a minute ago**. | live |
| **2:42–2:52** Not scripted | Another idea in the same seat, "a pre-order page for a café's morning pastries", with three different questions. | **REPLAY** of a real run |
| **2:52–3:00** Close | For a second: a pile of red cards, **"A default coding agent asked us 14."** Beside it her **3**, her meter, her file grown by a line. Pitch line. | static, real runs |

**Slow build:** reasons until ~2:40, then the rehearsal build, labelled REPLAY. **Every number is a placeholder**
until a real run makes it; the 14 is a plain coding-agent run on the same prompt, counted by hand. A weak pick in
rehearsal means fixing the ranking, never the script.

## 3. The look: a risograph-printed room
Physical, inky, a little playful. Her work lies full size in front of her seat; teammates' sheets are small, to
glance at, never to approve.
- **Paper and ink:** background `#F2EEE6`; ink `#141414` for text, 2px borders, **hard offset shadows** (`4px 4px 0
  #141414`, no blur); corners ≤ 6px.
- **One riso ink per seat**, on its card, glyph, sheet and log tags: Product pink `#FF48B0`, Design blue `#0078BF`,
  Engineering yellow `#FFE800` (ink text on it), Data green `#00A95C`, Research orange `#FF6C2F`. **Red `#E5322D` means
  stamping**: only the default agent's pile and the meter's stamping segment.
- **Teammates are flat printed cards** (role, glyph, ink), no faces or chat, each reading *"Own mode for this seat: coming."*
- **Type, bundled locally:** **Archivo Black** display (seat names, the counter, the meter at 120px+), **IBM Plex Sans**
  UI, **IBM Plex Mono** for her file and the reasons. Stage mode (one key): body ≥ 20px, no chrome.
- **Motion** (springs ~500/30; no fade over 150ms): cards land tilted 1–3°; lines snap into boxes; forks and pins slide
  in like sticky notes; "Sounds like" **types in** with a yellow highlighter sweep; counter and meter **roll**.
- **Banned:** gradients, glassmorphism, purple, emoji, sparkle icons, chat bubbles, spinners (show the current step),
  question cards or pop-ups.


## 4. What to build
**Shape.** One Node 22 server (`node:http`): UI, built page, `/api/book`, SSE events. One HTML UI, vanilla JS, no
build step; springs from the `motion` package (Framer Motion without React), copied in for offline. No Agent SDK.

**Models run through fal on the user's own key (BYO fal key).** Every live call: a Claude model via fal's OpenRouter
router, streamed, OpenAI-compatible `https://fal.run/openrouter/router/openai/v1/chat/completions`, header
`Authorization: Key <FAL_KEY>`, model id `anthropic/claude-…` (exact id and fastest model from fal's page; not the older
`fal-ai/any-llm`). **Unverified** (fal.ai was blocked for the tech lead; this is from search results): confirm it in the
first spike. **No tool calling needed:** every call returns JSON (structured output if honoured, else prompted), which
code validates against a schema, retrying once.
- **The key:** pasted on the room's first screen, or `FAL_KEY` on the demo machine. Server memory or environment only:
  never on disk, in logs, the event log, the repo or browser storage, never sent back or echoed; errors are scrubbed.
  **Test:** a full run with a sentinel key; assert it appears nowhere in `runs/`, logs or any HTTP response.

**The pipeline, all logged to `runs/<id>/events.jsonl`:**
1. **Flow:** each line she types becomes a node, arrows by order ("→" branches). No model.
2. **Propose:** five parallel calls (Product with write-spec's SKILL.md; the others with their stance) return
   `{seat, decision, options, recommendation, reason, cost, undoable, attachTo}`. Research cites only its finding.
3. **Select:** one call scores each (in her seat? changes the build? her file silent on it?). **Code** lets **at most
   3** through, out-of-seat only if costly or not undoable. The rest are decided, citing a line id of her file or "team
   default"; code rejects a citation to a missing line.
4. **Ask policy:** only the selector's output reaches her, as a fork or pin. Any other ask is refused, decided and
   logged; a question in plain model text counts as a stamp.
5. **Infer:** after her pin, one call writes the "Sounds like" line; keeping or rewording it writes `taste.md`.
6. **Build:** re-decide the rest against her updated file (so cancel cites her new line), then one call turns flow +
   answers + file into the template's slot JSON; our code writes the page.
7. **Counter, reasons, meter:** pure functions of the log; each UI pane tags its events `craft` or `stamp`.

**The page: a taste-skill template, filled live. [checked]** A full taste-skill build can't run live (~470 KB of
references to read, ~9k output tokens for its starter alone). So a plain Claude Code session in **a separate folder**
(`~/taste-template`, taste-skill installed there) builds the yoga page, then the café page, through its finish gate. Each becomes a template with slots: `:root` tokens, words, step order, and
switches (regulars first, waitlist, phone field, "remember me on this device", one-tap cancel with or without a reason).
- The look is delegated: `start.mjs deal --page place --trade wellness` (café: `cafe`; 0.1 s, random, so log the ids), then
  `start.mjs css --palette <id> --type <id>` prints the tokens; `brand --bg --ink --accent --type` takes any colours.
- Its checker FAILs a form that thanks without sending, so the form posts to our `/api/book`. The checker takes ~36 s
  even slimmed: templates only, never on stage.
- **Don't install taste-skill in this repo**; vendor it. Its Stop hook runs its gate (up to 10 min) and blocks stopping
  while any `.taste-skill/build.json` (each deal writes one) is in the folder or two below. Deal inside a run's folder;
  never edit its `assets/` (the gate fails edited kit files).
- Offline: local `@font-face` for the dealt fonts; no yoga or pastry photos are bundled, so fetch ~12 each with
  `photos.mjs search` while online and keep its credits (unverified: it failed in the lead's container).

**Also:** grey sketches use our own block kit, laid out from Design's JSON. Research's finding is gathered beforehand
from a real source, kept with its URL, shown as **"researched before the demo"**. Her file starts with two hand-written
lines labelled "prepared for the demo".

**Real and tested** (say so plainly if asked): the selector and cap (tests: a fourth never gets through; a
different idea changes the picks; a cheap out-of-seat pick is refused); nothing else can ask her; counter, reasons and
meter from the log; the file write; the live build citing her new line; the key never leaving server memory; the
baseline count, transcript kept. On stage: **"models run through fal with your own key."**
**Prepared, labelled where shown:** the templates and booking logic, her file's first two lines, Research's finding, the
café idea (REPLAY of a real run), the rehearsal run (fallback). **Cut:** other personas or seats, onboarding, more than
one inference, design checking on stage, a build that writes new code, any question as a card.

## 5. Schedule
**Every block ends with something running end to end, committed and tagged (`demo-1`…).** At each checkpoint, two
lines to me: what works, what's next, any cut line triggered.

| Block | Build | Demoable at the end | Cut line |
|---|---|---|---|
| **12:45–14:15** | **First, in other terminals:** the template build (`~/taste-template`) and the baseline run (plain coding agent, same prompt; count its questions). Then the fal spike: endpoint, model id, streaming, JSON; time one teammate call, five in parallel, one fill (the hop via fal and OpenRouter is the latency risk). Event log + meter. | Timings; a meter from a fake log. | **14:15:** teammates + select over 20 s → fewer candidates, faster model. fal route broken → tell me at once. |
| **14:15–16:30** | Teammates, selector, cap, ask policy with its tests; decide-with-citations; write-spec vendored. | Terminal: idea + flow → candidates → 3 picks → the rest decided, cited. | **15:30:** template not gate-passing → fill taste-skill's `starter.html` by hand. |
| **16:30–19:30** | The room: look, walk-in, sheet, lines → boxes, forks and pins, counter, meter, **R** replay, stage mode. | Beats 0:00–1:45 play from a real run. | **19:30:** walk-in motion → plain placement. |
| **19:30–20:00** | Eat, away from the screen. | | |
| **20:00–23:00** | Sketches; "Sounds like" + file write; live fill; "decided for you"; reasons. | The whole yoga script once, live. | **23:00:** sketches → static images per node. Never cut the cap, the file write or the live fill. |
| **23:00–01:00** | Research finding with source; café run recorded; rehearsal capture; the close with the real baseline. | Full 3:00 once. | **01:00:** café run → shows its three questions only, no page. |
| **01:00–02:30** | Reliability: timings, keyboard beats, fallbacks (live needs network for fal; no network → full replay). Tag `demo-core-candidate`. | Two clean runs in a row. | **02:30:** live build unreliable → build beat goes REPLAY, everything else live. |
| **02:30–05:30** | **Sleep.** | | |
| **05:30–06:00** | Fix only what broke. **Core done.** Tag `demo-core`. | | |
| **06:00–07:00** | **Sponsor layer (first to cut).** Thin extras only, never touching the core path. | | **06:45:** stop; drop whatever isn't working. |
| **07:00–08:00** | Buffer: backup video of a clean run, two timed rehearsals, tag `demo-final`. | | |

**Sponsors.** fal is **core, not a layer**: every model call runs through it on the user's own key. Optional
sponsor-hour extras, first to cut, filled in once I send the list:

| Sponsor | Thin use case | Effort |
|---|---|---|
| fal (optional extra) | Design teammate generates one hero image with a fal image model for the template, cached per run, labelled | ~30 min |
| (tbc) | | |

## 6. Working agreements
- Push back with your reshape where this can't be built; don't wait more than a few minutes for me; bring me only what
  changes the demo, with a recommendation. New spending beyond the user's fal key needs my yes; keys never in the repo.
- Call something done only when you've seen it work; say what's untested. If real numbers or a live beat disappoint,
  tell me at once: we change the script, not the truth.
