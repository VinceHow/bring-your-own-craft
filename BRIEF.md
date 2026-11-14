# Brief: Bring your own craft

> **Take the seat of the craft you love, and a team fills the rest.** They bring you **at most three questions**,
> chosen for your craft and what you're building, and decide everything else your way. You leave with a page that's
> yours, and a file of your own philosophy you never had to write.

**Deadline: Devpost submissions close 12:00 Sun 15 Nov; judging is live 13:00–16:30. Core done by 00:00 Sat night; we
submit at 11:30. Solo: me (Vincent) plus agents. I'm off site 21:00–10:00; agents keep working.** (Schedule: section 5.) The 3-minute demo (section 2) is the spine: **if it doesn't serve a beat, don't build it.**
Where this is silent, decide from the promise and the demo, carry on, and tell me what you chose. **[checked]** marks
what a tech lead already ran against the real tools; re-measure here, don't re-research.

## 1. The idea
Prompt-to-app tools guess everything; coding agents ask about everything. Here you take one of six seats (**Product,
Design, Data, Research, Strategy, Engineering**), do your craft, and the team brings you only the decisions worth your time,
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
| **0:00–0:06** Her seat | An empty table from above, six seats. She **clicks Product**; her card drops in. | live |
| **0:06–0:26** Assembling the team | Five teammates, one by one: each card lands big mid-table showing what it **loves**, what it **brings** (true) and its **stance**, holds ~2 s, then shrinks into its seat. Silent, no names. Card copy in `DEMO.md`. | live |
| **0:26–0:34** Her card | Her card lifts mid-table, same layout as the team's. **Loves:** she finishes *"I love…"* (spoken via ElevenLabs, core; typed if voice is unavailable); it becomes L1 of her file. **Brings:** pre-filled, true. **Stance:** empty, *"We'll find out today."*, filled later by her reworded "Sounds like" line. | live |
| **0:34–0:40** First move | A blank sheet in front of her, the meeting's one agenda item: **"What are we building today?"** She says or writes: "A booking page for a small yoga studio." | live |
| **0:40–0:56** Her journey | She writes one line a step; each becomes a box with arrows: classes → a class → confirm → booked; regulars → "Book your usual". | live |
| **0:56–1:04** Team works | Sheets fill at each seat; a counter rolls: **"23 decisions came up · 3 brought to you"** (real numbers). | live |
| **1:02–1:35** Her three | **In her work**: a fork on her flow, a pin on a box, each with a recommendation and reason (in rehearsal: a waitlist, backed by Research's sourced finding; how a regular is recognised; what confirm asks for). **The run picks them.** At least once she overrules the team: the other branch is marked **YOUR CALL**, the recommendation struck through, and the page follows her. | live |
| **1:35–1:55** Her taste, named | Design's grey sketches slide over. She pins a call on confirm, not a principle: *"Cut the phone field. Name's enough; regulars hate forms."* Her file card: **"Sounds like: never ask for what you could remember."** She rewords it (*"…anything you could remember or skip"*); it writes into her file. | live |
| **1:55–2:20** Build | One press; Engineering's sheet ticks through the build. She taps the counter: why her three made the cut; for each of the rest, the line of her file that decided it. | **live**, from her answers |
| **2:20–2:32** Her page | Regulars first, no phone field, her words, her overruled call. Under it, "decided for you": cancel is one tap, no reason asked, **citing the line she wrote a minute ago**. | live |
| **2:32–3:00** Close (28 s) | **A judge's idea, live:** a judge gives an idea, I type it, the team starts (selector only, ~15 s). **While it runs**, the contrast from the real baseline: **"A default coding agent asked 0 questions and guessed 22 things about your studio"** (`docs/baseline/GUESSES.md`) beside her **3 asked, M decided from her file**. Then the judge's three questions land, with counter and reasons. Last line, true: this project was built the same way (`BUILT-THIS-WAY.md`). | live / real counts |

The café run ("a pre-order page for a café's morning pastries") is no longer a beat: it's the **fallback** for the
judge's idea, REPLAY of a real run. Earlier beats are each a few seconds shorter to make room (see `DEMO.md`).

**Slow build:** reasons until ~2:25, then the rehearsal build, labelled REPLAY. **Every number is a placeholder**
until a real run makes it; the baseline is a plain coding-agent run on the same prompt (`docs/baseline/`): it asked 0 and guessed everything, so the close counts its guesses. A weak pick in
rehearsal means fixing the ranking, never the script.

## 3. The look: a risograph-printed room
Physical, inky, a little playful. Her work lies full size in front of her seat; teammates' sheets are small, to
glance at, never to approve.
- **Paper and ink:** background `#F2EEE6`; ink `#141414` for text, 2px borders, **hard offset shadows** (`4px 4px 0
  #141414`, no blur); corners ≤ 6px.
- **One riso ink per seat**, on its card, glyph, sheet and log tags: Product pink `#FF48B0`, Design blue `#0078BF`,
  Engineering yellow `#FFE800` (ink text on it), Data green `#00A95C`, Research orange `#FF6C2F`, Strategy gold `#BB8B41`. **Red `#E5322D` means
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

**One model adapter, two backends.** Every model call goes through one function, `callModel({system, user, schema})`,
which returns validated JSON. `MODEL_BACKEND` picks the backend:
- **`claude-code` (the default, build with this first):** Claude Code run headless, `claude -p "<user>" --output-format
  json` with our own system prompt, no tools and no project files loaded (use the CLI's flags for a custom system prompt,
  no tools and skipping CLAUDE.md, or `--bare`; check `claude --help`). It uses the machine's own Claude Code login, so no
  key is needed. Checked in the lead's cloud session: one call came back in about 2 s of API time, but the default setup
  loaded ~40k tokens of context (about $0.12 a call), which is why the flags matter. Time six calls in parallel.
- **`fal` (swap in later, the sponsor route):** below. Switching is one env var; nothing else changes.

**The fal backend: models through fal on the user's own key (BYO fal key).** Each call: a Claude model via fal's OpenRouter
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
2. **Propose:** six parallel calls (Product with write-spec's SKILL.md; the others with their stance; Strategy covers price, payment and who pays) return
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
baseline count, transcript kept. On stage, say whichever backend actually ran: **"models run through fal with your own key"** only if `MODEL_BACKEND=fal` on the day.
**Prepared, labelled where shown:** the templates and booking logic, her file's first two lines, Research's finding, the
café idea (REPLAY of a real run), the rehearsal run (fallback). **Cut:** other personas or seats, onboarding, more than
one inference, design checking on stage, a build that writes new code, any question as a card.

## 5. Schedule
**Every block ends with something running end to end on `main`, tagged (`demo-1`…).** Check-ins with me ~16:00,
~20:00 (before I leave the venue at 21:00) and 07:00, with screenshots.

| By | What's done | Cut line if behind |
|---|---|---|
| **16:00** | Selector + cap + ask policy with tests; teammates; decide-with-citations; template built; flow parsing. Terminal run: idea + flow → candidates → 3 picks → the rest decided, cited. | Template not gate-passing → fill taste-skill's `starter.html` by hand. Teammates + select over 20 s → fewer candidates, faster model. |
| **20:00** | **The whole demo runs roughly on `main`:** room → flow → three questions → frames → "Sounds like" → Build → page → close. I see it before leaving. | Walk-in motion → plain placement. Sketches → static images per node. |
| **00:00** | **Core done.** Voice: ElevenLabs speech-to-text for her "I love…" line and her agenda answer, push-to-talk, editable text, typed fallback (core, Vincent's call; key `xi-api-key` for `api.elevenlabs.io` from Vincent). Live fill, reasons, counter and meter from the log, café run and rehearsal run recorded, the close with real baseline counts, the e2e check passing. Tag `demo-core`. | Café run → its three questions only, no page. Live build unreliable → build beat REPLAY. Voice key missing or speech unreliable → typed, said plainly. Never cut the cap, the file write or the live fill. |
| **00:00–03:00** | Sponsor layers (`docs/SPONSORS.md`, in order, each behind a flag), then reliability. | Any sponsor over budget → drop it. |
| **03:00–07:00** | Polish: the look, motion, timings, every beat; the judge's-idea close rehearsed against 10+ varied ideas (fix the selector where picks are weak); `BUILT-THIS-WAY.md`; README and `SUBMISSION.md`; two recorded rehearsal runs; a backup video. Tag `demo-final`. | Judge's idea weak → café replay closes. |
| **07:00** | Check-in: screenshots and a short list of polish choices for me. | |
| **10:00–11:30** | My on-site polish and rehearsal: small, safe changes only. | Anything risky → don't. |
| **11:30** | Repo public; Devpost submitted (30 min buffer). | |

**Sponsors** (`docs/SPONSORS.md`): low priority, only if they don't add significantly to the build; never on the core
path. Tracks: Autonomous Agents (main), with fal and ElevenLabs bounties from Voice, Vision & Generative Media if
the organisers allow it; Figma's design prize is my own design work.

**Submission** (Devpost, by 12:00 Sun): a public repo with a README for judges (problem, what we built, how it works,
how to run it); every API, model, dataset and open-source library used, with its licence; `SUBMISSION.md` with the
write-up to paste. Rule: all project code is written during the hackathon; taste-skill and the product-management
plugin are credited open-source libraries.

**One shot, no mistakes on the core.** Four builders work at once, so the seams are fixed in `CONTRACT.md` and only the
lead changes them. Each piece ships with its own tests and passes them before review. `npm run e2e` (Playwright,
`--trace off`) walks the yoga script through the real UI: room → flow → three asks arrive in her work (never more) →
pin → "Sounds like" written to her file → Build → page shows her choices and a decision citing her new line → counter
and meter match the log → the key appears nowhere. The lead merges to `main` only with `npm test` and `npm run e2e`
green, and re-runs e2e after every merge. A failure gets a diagnosis before a patch.

## 6. Working agreements
- **taste-skill** is in `vendor/taste-skill/` (MIT, credited), used two ways: it builds the page template in its own
  folder, and its design rules (type, colour, spacing, no generic AI look) guide the room's own look where they fit the
  risograph style. Never install it as a plugin in this repo: its finish hook blocks the session.
- Push back with your reshape where this can't be built; don't wait more than a few minutes for me; bring me only what
  changes the demo, with a recommendation. New spending beyond the user's fal key needs my yes; keys never in the repo.
- Call something done only when you've seen it work; say what's untested. If real numbers or a live beat disappoint,
  tell me at once: we change the script, not the truth.
