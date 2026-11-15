# Bring your own craft

**Start with [VISION.md](VISION.md)**: the one-page picture of the product and this hackathon build.

**Do the part you love, and a team of agents gets your idea built.**

You take the seat of the craft you love. A team of autonomous agents fills every other seat, handles everything it
can, and brings you only the few big questions that need you. Hackathon build, 14–15 Nov 2026, Autonomous Agents
track. Licence: [PolyForm Noncommercial 1.0.0](LICENSE). The Devpost write-up is [`SUBMISSION.md`](SUBMISSION.md);
how we built it is [`BUILT-THIS-WAY.md`](BUILT-THIS-WAY.md).

## Built with our sponsors
- **[fal](https://fal.ai):** the painted cast portraits and the living-room clips were generated with fal (ledger in
  [`design/FAL-SPEND.md`](design/FAL-SPEND.md)); the deployed bakery's images are made with fal flux in the team's
  build run. The demo's chat runs on Claude through fal's OpenRouter router.
- **[ElevenLabs](https://elevenlabs.io):** live speech-to-text, so she speaks her idea and her answers.
- **[Linkup](https://www.linkup.so):** Noor's research finding was found and cited with Linkup before the demo, and is
  labelled that way on screen (not a live search on stage).
- **[Figma](https://www.figma.com/design/EwqOeVqbMUWXHEzM6pqOvB):** the room's design, exported code→Figma as editable
  frames and tokens ([`design/FIGMA.md`](design/FIGMA.md)). The frames show the early look, not the final painted one.
- **[Anthropic](https://www.anthropic.com):** Claude, Claude Code (the team's agents and how we built it) and the
  product-management skills.
- **Hackathon:** built 14–15 Nov 2026 for the Imperial AI hackathon, Autonomous Agents track.

The teammates' "meet" cards list the same tools as "Loaded with", so what each agent says it brings is what it uses.

Most projects don't die from bad ideas. They die in the questions nobody signed up for. Prompt-to-app tools guess
everything; coding agents ask about everything, or approve-and-continue you to death. Either way the person stops
doing their own craft.

We measured it before writing any code. We gave a default coding agent one prompt: "Build me an ordering website for
a small bakery, so customers can order bread ahead." It asked **0 questions**, made **24 guesses** about the bakery
(its name, opening hours, the whole menu and its prices, a 6 pm cut-off, pay at pickup…) and stopped for **20
approvals**. Every guess, with evidence, is in
[`docs/baseline/run-3-bakery/GUESSES.md`](docs/baseline/run-3-bakery/GUESSES.md); the earlier runs are kept in
[`docs/baseline/`](docs/baseline/).

## What we built
A hand-painted studio with a round table and six seats: Product, Design, Research, Data, Strategy and Engineering,
plus "Your own craft" for anyone else (a baker, a tattoo artist). In the demo, Priya, a product manager, takes the
Product seat to build an ordering website for a friend's small bakery. Her teammates are agents with names, each with
its own craft: Mika (Design), Noor (Research), Theo (Data), Ines (Strategy) and Bo (Engineering).

1. **She introduces herself** in one sentence, spoken or typed, and the team turns it into a playful character card.
2. **She says the idea** in one sentence. Within seconds Noor and Mika put a rough journey on the table: who the
   users are and the stages they go through. She reacts in plain words, and it redraws.
3. **The team works on its own.** Each teammate proposes the decisions its craft needs and settles every small one
   itself. Joint decisions are talked out between teammates, each turn its own model call, and land as cards in a
   team space. Nothing is addressed to her.
4. **A few questions reach her**, only if they're big and draw on what she knows best. One waits in her tray; when
   she opens it the room goes quiet: one document with the work, and one open question in plain words. Code enforces
   a hidden ceiling of three.
5. **She says her piece**, in pieces if she likes, and a quick tidy turns her spoken words into her own note. When
   she sends, only the teammates her words touch reply, building on her and on each other, and the meeting's
   takeaways sum up what she believes and her guidance to the team.
6. **One press, and her page appears**, built from her answers.

Behind the scenes the team keeps a private picture of her (her customers, her taste, her philosophy) and decides
everything else her way.

## How it works
```
 her intro + idea (voice or typed)
          |
          v
 [1 First sketch]   Research's finding feeds Design's rough journey (live call; PREPARED fallback if slow)
          |
          v
 [2 Propose]        each teammate, in parallel, a model call -> candidate decisions in its craft
          |
          v
 [3 Select]         one model call scores every candidate; CODE applies the bar:
          |         big, hers, in one of her domains, not granular -> at most 3 asks (lib/policy.js is the only door)
     +----+--------------------------------+
     v                                     v
 [4 Focus moment]                      the rest: decided by the team, joint ones talked out
  one document, one question            in the team space (each turn its own call)
     |
     v
 [5 Her answer]     pieces -> tidy -> Send -> relevant teammates chime in -> takeaways -> her profile updates
     |
     v
 [6 Build]          the page, filled from her answers into a prepared template
```
Every step writes to one event log per run, `runs/<id>/events.jsonl`. Every number on screen (how many came up, how
many reached her, how long things took) is computed from that log, never typed in.

More detail on the ceiling, the ask policy and the key: [`docs/HOW-IT-WORKS.md`](docs/HOW-IT-WORKS.md).

## Run it
Needs Node 22 and, for the default backend, Claude Code installed and logged in on the machine. No `npm install`:
there are no dependencies (Playwright is only needed for `npm run e2e`).

```
npm start        # the studio, at http://localhost:3000 (PORT to change)
npm run local    # the same with .env.local keys, on the first free port from 3000 (it prints the URL)
npm run doctor   # is this machine ready? (docs/RUN-LOCALLY.md)
npm test         # unit tests, offline, fake models, no model calls (LIVE=1 adds one real-model test)
npm run e2e      # the demo walked through the real UI in Chromium (Playwright), with real model calls
```

`MODEL_BACKEND` picks where model calls go. Every call goes through one function, `callModel` in `lib/model.js`, and
returns JSON validated against a schema.
- `fal` (what runs in the demo, `MODEL_BACKEND=fal`): Claude through fal's OpenRouter router on your own key
  (`FAL_KEY`). Tested 9/9 schema-valid against Claude Code on 3 real calls per step, and covered by the leak test. It
  runs the demo because on the demo laptop Claude Code's fast model, through a company gateway, took over 25 s a call
  while fal answered in about 1 s.
- `claude-code` (the alternative route, and the default when `MODEL_BACKEND` is unset): Claude Code run headless
  (`claude -p`), with our own system prompt, no tools and no project files loaded. It uses the machine's own Claude
  Code login, so no key is needed. `docs/REHEARSAL.md` has the one-step switch to it.

Voice is ElevenLabs speech-to-text, on the server, with a key in `ELEVENLABS_API_KEY` (or injected by the cloud
proxy). Without a key the mic hides and she types; everything still works.

## What's real and what's prepared
**Real, and tested:**
- Every teammate's work comes from a live run on her idea; the rough journey is a live call.
- The questions are chosen live, never scripted. The ceiling of three is enforced in code (`lib/policy.js` is the
  only code that can ask her), with tests that a fourth never gets through; granular decisions never reach her.
- The team's replies and the takeaways come from what she actually said; a reply never ends on a question to her.
- Her answers change the page.
- Voice is real speech-to-text.
- The counts come from the run's log.
- The fal key never leaves server memory (leak test).
- The baseline, from a real default-agent run with its transcript kept.

**Prepared, and labelled where it shows:**
- The page templates (`templates/`): the build fills them, it doesn't write new code.
- Research's finding, gathered before the demo from a real source (`data/research-finding-bakery.json`, labelled
  "seen in search summaries").
- A prepared bakery journey if the live one is slow (PREPARED), and recorded runs as fallbacks (REPLAY).
- The room's light chatter and the motion.

**Said, not built:** multiplayer (a real engineer in the Engineering seat); the team chiming in mid-sentence.

## Timings (from real runs)
| Moment | Time |
|---|---|
| The first rough journey draws in | about 2.5 s |
| The first teammate replies after she sends | about 1 s |
| The team's work plus choosing what reaches her | about 18–20 s |
| The page builds | about 22 s |
| A judge's own idea: journey and first question | about 11 s |
| The whole demo run, one sentence to her page | **TBD** |

Dry runs on other ideas, with their timings, are in [`docs/dry-runs/`](docs/dry-runs/).

## Built with: APIs, models and open-source
| What | Used for | Licence |
|---|---|---|
| Claude Code, headless (`claude -p`) | the alternative model route: teammates and the selector on Claude Sonnet (Claude Code's `sonnet` alias), the quick speech tidy on Claude Haiku (`haiku`) | Anthropic commercial terms; not redistributed |
| [ElevenLabs](https://elevenlabs.io) speech-to-text | her spoken intro, idea and answers | ElevenLabs terms; API only |
| [taste-skill](https://github.com/Leonxlnx/taste-skill) (© Leonxlnx) | the Design teammate and the built page: Design deals the page's palette and type live when the skill's scripts are installed on the machine (otherwise the template's own type stays); its rules guide the studio's look. Vendored in `vendor/taste-skill/` with its licence; never installed as a plugin in this repo | MIT |
| Anthropic [product-management plugin](https://github.com/anthropics/knowledge-work-plugins), `write-spec` skill | the Product teammate's instructions. Vendored unchanged in `vendor/product-management/` (commit `e91a134`) with its licence | Apache-2.0 |
| [`motion`](https://motion.dev) 14.14.0 | springs for the studio's animation; copied to `public/vendor/motion/` for offline use | MIT |
| Archivo Black, via [@fontsource](https://fontsource.org) | display type | SIL OFL 1.1 (`public/fonts/LICENSE-archivo-black.txt`) |
| IBM Plex Sans and IBM Plex Mono, via @fontsource | UI type | SIL OFL 1.1 (`public/fonts/LICENSE-ibm-plex.txt`) |
| The typefaces taste-skill can deal for a place page (Fraunces, Figtree, Besley, Albert Sans and others), via @fontsource | the built page's type, dealt live by Design and served locally | SIL OFL 1.1 (each `vendor/fonts/<face>/LICENSE`) |
| Bakery photographs (Wikimedia Commons) | the bakery page | CC BY / CC BY-SA, credited on the page's `credits.html` |
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) skills: `verification-loop`, `e2e-testing`, `frontend-design-direction`, `ui-demo` | agent skills used while building; in `.claude/skills/`, unmodified | MIT (`.claude/skills/ECC-LICENSE`) |
| [Playwright](https://playwright.dev) | end-to-end tests in Chromium | Apache-2.0 |
| [fal](https://fal.ai) | the model backend that runs in the demo (Claude via OpenRouter); planned: flux/schnell brand images for the bakery site | fal terms; API only |
| Node.js 22 (`node:http`, `node:test`) | the server and unit tests | MIT |

fal: Claude via fal's OpenRouter router is the model backend that runs in the demo (`MODEL_BACKEND=fal`); fal flux/schnell is
planned for the bakery site's brand images (timed at a median 2.2 s, about 0.3¢ an image). Paid APIs: the Claude Code
login, ElevenLabs and fal.

Datasets: none. Research's finding is a public web page, cited in `data/research-finding-bakery.json`.

All project code was written during the hackathon. The libraries above are credited open-source.

## Where things are
- `VISION.md`: the one-pager. `DEMO.md`: the 3-minute demo script. `BRIEF.md`: what we build and the schedule.
  `CONTRACT.md`: the seams between the build pieces. `NEXT.md`: parked ideas.
- `lib/`: model adapter, first sketch, teammates, selector, ask policy, her profile and file, the team's replies
  (`thread.js`), the speech tidy, the team space (`joint.js`), the page fill.
- `prompts/`: the system prompt for each teammate and each model call.
- `public/`: the studio (vanilla JavaScript, no build step). `docs/COMPONENTS.md`: every component's hooks, for design.
- `docs/baseline/`: the default-agent baseline. `docs/dry-runs/`: real runs on other ideas, with timings.
- `docs/DECISIONS.md`: who decided what during the build. `docs/HOW-THE-IDEA-EVOLVED.md`: how the experience changed.
