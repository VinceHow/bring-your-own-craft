# Bring your own craft

**Start with [VISION.md](VISION.md)**: the one-page picture of the product and this hackathon build.

**Take the seat of the craft you love, and a team fills the rest.**

A team of autonomous agents that builds with you: it decides almost everything your way, and asks you only the few
questions worth your time. Hackathon build, 14–15 Nov 2026, Autonomous Agents track. Licence:
[PolyForm Noncommercial 1.0.0](LICENSE).

## The problem
Prompt-to-app tools guess everything. Coding agents ask about everything, or approve-and-continue you to death. Either
way the person stops doing their own craft. They end up stamping papers: saying yes or no to a tool.

We measured the first half. We gave a default coding agent our demo prompt, "Build me a booking page for a small yoga
studio." It asked **0 questions** and made **22 guesses** about the studio: its name, teachers, prices, cancel rule
and more. Each guess is listed with evidence in [`docs/baseline/GUESSES.md`](docs/baseline/GUESSES.md); both
transcripts are kept in [`docs/baseline/`](docs/baseline/).

## What we built
A room with five seats: Product, Design, Data, Research, Engineering. You take one (in the demo, Priya takes
Product) and do your own work: you write the idea and the customer journey, one line a step. The four other seats are
agents, working in parallel without waiting on you. Each one raises the decisions its craft needs.

The point is the autonomy, with a hard limit on interruptions. A selector, enforced in code, brings you **at most
three** of those decisions. They arrive inside your own work, as a fork on your flow or a pin on a box, each with a
recommendation and a reason. Never as a pop-up. You can take the recommendation or overrule it (it's then marked YOUR
CALL). The agents decide everything else themselves, and each decision cites the line of your file that decided it,
or says "team default".

Your file is a short list of your own principles. It grows from your decisions: when you pin a comment, the team
suggests a "Sounds like" line; you keep it or reword it, and it is written to the file. You never fill in a
questionnaire.

At the end you get a booking page built from your flow, your answers and your file (the build is in progress; see
below).

## How it works
```
 her idea + journey lines
          |
          v
   [1 Flow]  lines -> boxes and arrows (code, no model)
          |
          v
   [2 Propose]  five teammates in parallel, each a model call -> candidate decisions
          |
          v
   [3 Select]  one model call scores each candidate
          |    CODE applies the rules: at most 3, in her seat first, nothing her file already decides
          |
     +----+-------------------------------+
     v                                    v
 [4 Ask policy] up to 3 asks         the rest: decided, each citing
  -> a fork or pin on her flow        a line of her file or "team default"
     |                               (code rejects a citation to a missing line)
     v
 [5 Infer]  her pin -> one "Sounds like" line -> she keeps or rewords -> written to her file
     |
     v
 [6 Build]  re-decide the rest against her updated file, then fill a prepared page template
     |
     v
 [7 Counter, reasons, meter]  pure functions of the run's log
```
Every step writes to one event log per run, `runs/<id>/events.jsonl`. The counter ("25 decisions came up, 3 brought
to you"), the reasons and the IN YOUR CRAFT % meter are all computed from that log, never typed in.

More detail on the cap, the ask policy, her file and the key: [`docs/HOW-IT-WORKS.md`](docs/HOW-IT-WORKS.md).

## Run it
Needs Node 22 and, for the default backend, Claude Code installed and logged in on the machine. No `npm install`:
there are no dependencies (Playwright is only needed for `npm run e2e`).

```
npm start        # the room, at http://localhost:3000 (PORT to change)
npm test         # unit tests, offline, no model calls (LIVE=1 adds one real-model test)
npm run e2e      # walks the yoga script through the real UI in Chromium (Playwright)
```

`MODEL_BACKEND` picks where model calls go. Every call goes through one function, `callModel` in `lib/model.js`.
- `claude-code` (default): Claude Code run headless (`claude -p`), with our own system prompt, no tools and no
  project files loaded. It uses the machine's own Claude Code login, so no key is needed.
- `fal`: code for Claude through fal's OpenRouter router on your own key (`FAL_KEY`) exists and is covered by the
  leak test against a fake fal, but it is **not used**: it never ran against the real fal service, and it is
  not the default, and not used on the day. The demo runs on `claude-code`.

## What's real and what's prepared
**Real, and tested:**
- The selector and the cap of three. Tests: a fourth never gets through; a different idea changes the picks; a cheap
  pick from outside her seat is refused.
- Nothing else can ask her. Any other ask is refused, decided and logged. A question in a teammate's plain text counts
  as a stamp on the meter.
- Every decision cites a real line of her file or "team default"; a citation to a missing line is rejected.
- The counter, the reasons and the meter, from the log.
- The "Sounds like" line and her rewording, written to her file.
- The fal key never leaving server memory (leak test).
- The baseline count, from a real plain coding-agent run with its transcript kept.

**Prepared, and labelled where shown:**
- The page templates and their booking logic. The build fills them; it doesn't write new code.
- The first two lines of her file ("prepared for the demo").
- Research's finding, gathered before the demo from a real source, with its URL (`data/research-finding.json`).

**In progress at the time of writing** (not yet merged to `main`): the page templates and the live fill
(`lib/fill.js`, `routes/build.js`, `routes/book.js`); the recorded café run (the REPLAY fallback if a judge's live
idea fails) and the rehearsal run (the REPLAY fallback for any live beat), both to be committed under `runs/`; and
the e2e steps from "asks arrive" to "counter matches the
log", which are marked pending in `e2e/yoga.e2e.js`.

## Built with: APIs, models and open-source
| What | Used for | Licence |
|---|---|---|
| Claude Code, headless (`claude -p`) | the model backend that runs in the demo; teammates, selector and "Sounds like" use Claude Sonnet (Claude Code's `sonnet` alias) at low effort | Anthropic commercial terms; not redistributed |
| [taste-skill](https://github.com/Leonxlnx/taste-skill) (© Leonxlnx) | builds the page templates in a separate folder; its design rules guide the room's look. Its kit files and licence arrive in `vendor/taste-skill/` with the page build (in progress). Never installed in this repo. | MIT |
| Anthropic [product-management plugin](https://github.com/anthropics/knowledge-work-plugins), `write-spec` skill | the Product teammate's instructions. Vendored unchanged in `vendor/product-management/` (commit `e91a134`) with its licence | Apache-2.0 |
| [`motion`](https://motion.dev) 14.14.0 | springs for the room's animation; copied to `public/vendor/motion/` for offline use | MIT |
| Archivo Black, via [@fontsource](https://fontsource.org) | display type | SIL OFL 1.1 (`public/fonts/LICENSE-archivo-black.txt`) |
| IBM Plex Sans and IBM Plex Mono, via @fontsource | UI type, her file and the reasons | SIL OFL 1.1 (`public/fonts/LICENSE-ibm-plex.txt`) |
| The 22 typefaces taste-skill can deal for a place page (Fraunces, Figtree, Besley, Albert Sans and others), via @fontsource | the built page's type, dealt live by Design and served locally | SIL OFL 1.1 (each `vendor/fonts/<face>/LICENSE`) |
| Bakery photographs (Wikimedia Commons) | the bakery page | CC BY / CC BY-SA, credited on the page's `credits.html` |
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) skills: `verification-loop`, `e2e-testing`, `frontend-design-direction`, `ui-demo` | agent skills used while building; in `.claude/skills/`, unmodified | MIT (`.claude/skills/ECC-LICENSE`) |
| [Playwright](https://playwright.dev) | end-to-end tests in Chromium | Apache-2.0 |
| Node.js 22 (`node:http`, `node:test`) | the server and unit tests | MIT |

Not used: fal and OpenRouter (an optional backend is in `lib/model.js`; not the default, and not used on the day). No paid APIs beyond the
Claude Code login.

Datasets: none. Research's one finding is a public web page, cited with its URL in `data/research-finding.json`.

All project code was written during the hackathon. The libraries above are credited open-source.

## Where things are
- `BRIEF.md`: what we build and the schedule. `DEMO.md`: the 3-minute demo script. `CONTRACT.md`: the seams
  between the four build pieces.
- `lib/`: model adapter, flow parser, teammates, selector, ask policy, her file, tally.
- `prompts/`: the system prompts for each teammate and each model call.
- `docs/baseline/`: the default-agent baseline. `docs/dry-runs/`: real runs on six ideas, with timings.
- `docs/DECISIONS.md`: who decided what during the build.
