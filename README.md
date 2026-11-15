# Bring your own craft

![Bring your own craft: the film poster. Mika, Wren, Theo, Ines and Bo (agents) and you, at the studio table](docs/readme/slides/01-bring-your-own-craft.jpg)

**Do the part you love; a team of agents does the rest.**

## Why I built this
I'm a builder at heart, and I love the craft: understanding people, deciding what's worth building, and writing some of the code too. But building with AI today pulls me away from it. **Coding agents ask about everything.** One prompt stopped for **20 approvals**, including which backend language to use. **AI app builders assume everything**, so it's hard to weave in my own craft and judgement. I wanted a way to spend 90% of my time on the part I love.

<sub>The baseline: a default coding agent on one bakery prompt asked 0 questions, guessed 24 things that were the owner's call, and stopped for 20 approvals ([every guess, with evidence](docs/baseline/run-3-bakery/GUESSES.md)).</sub>

## How I got here
Here's the story, one slide at a time.

![Slide 2, the problem: coding agents ask about everything; AI app builders assume everything](docs/readme/slides/02-the-problem.jpg)
Building with AI today pulls me away from my craft. Coding agents ask about everything, so the busywork lands on
me: approvals, "continue?", questions nobody signed up for. AI app builders assume everything, so my judgement never
gets in. Both get it backwards: they hand me the busywork and take away the judgement.

![Slide 3, the shift: AI takes the busywork, so we choose what we love](docs/readme/slides/03-the-shift.jpg)
It doesn't have to be that way. AI will be more productive than us at much of the work. Built the right way, it
takes the busywork we dislike and leaves the judgement with us.

![Slide 4, our answer: your judgement, your joy](docs/readme/slides/04-our-answer.jpg)
And once the busywork is gone, we get to choose. We can spend our time on what we love. What we keep is our
judgement (taste, expertise, craft) and our joy, the part of the work we'd do even if nobody asked.

![Slide 5, the vision: 90% of your time on the craft you love, over the painted studio](docs/readme/slides/05-the-vision.jpg)
So I built a team that works that way. You take the seat of your craft; agents take every other seat, do their own
work, and bring you only the few big questions about what you love, your craft among them. The result is what I wanted all along: 90% of
your time on the craft you love, in flow.

![Slide 6, how it feels: four real clips of the product, and only the decisions you love reach you](docs/readme/slides/06-how-it-feels.jpg)
Here's how that feels, in real clips from the product. The team gets to know you. When you speak, your words are
kept and the team builds on them. You only see the decisions that matter, and when one reaches you, the room goes
quiet: just you and the question.

![Slide 7, built the way it works: one human with an idea, a team of agents](docs/readme/slides/07-built-the-way-it-works.jpg)
The proof: I built it the same way. One human with an idea and a team of agents: I stuck to the
decisions I'm good at, and agents did the rest, as builders, designers, reviewers and a merger. That's over 1,000
commits in about 23 hours.

![Slide 8, the future: a table with room for everyone, people and agents side by side](docs/readme/slides/08-the-future.jpg)
Next, the table gets bigger. Today the other seats are agents; next, real people join them: a real engineer takes
the Engineering seat and brings their own team of agents. A table with room for everyone, each doing what they're
best at.

See the deck: `npm run local` → `/slides/talk.html` (or double-click `talk.html` at the repo root).

![The studio: Priya's seat at a round table, her five agent teammates at work around her](docs/readme/studio.webp)
<sub>The studio mid-run: five agent teammates at work round the table, her stool in front.</sub>

## What I built
**Bring Your Own Craft** is a hand-painted studio where you take the seat of your craft, and a team of AI agents fills every other seat: **Mika** (Design), **Wren** (Research), **Theo** (Data), **Ines** (Strategy) and **Bo** (Engineering).

You say your idea in one rough sentence and meet your team. They get to know you, handle their own work, and bring you **only the few big questions about what you love**. Your app builds as you decide.

What it feels like:
- **You stay in your craft.** Whatever sits outside it, the team settles itself, so your time goes to what you care about.
- **You're asked about what you love.** The questions that reach you are the parts of the work you love, your craft
  among them, with the work in front of you, so you react instead of starting from a blank page.
- **Your words are kept.** Say it out loud, ums and all; the team tidies it without changing what you meant, and
  builds on it.
- **You watch your app take shape**, a new version each time you decide something.

## How it works
In short: a team of agents works on its own, a selector decides what's big enough to bring you, and your answers
shape the app.

<details>
<summary>The details</summary>

- **Only the big questions.** The team proposes decisions as it works. A selector ranks every one and brings you only
  what's big and about what you love (your craft is part of that); the team settles the rest itself and says why, citing what it knows about you.
  Wren's research is found live with Linkup.
- **A real meeting.** You speak in pieces, and a careful tidy removes the ums but keeps your words. **Send** starts a
  round where the teammates your words touch reply live; **End meeting** writes your takeaways.
- **Your app builds as you decide.** It starts on "Team, go", and each later decision builds the next version with a
  line on what changed. It fills one of three designed templates (bakery, café, yoga); the model never writes code.
  Its emblem is painted live with fal.
- **Any seat.** Pick your craft on the name tag, and the teammate who held that seat steps aside.
- **The live bakery.** Pressing **Open the app** shows a QR card for The Usual, a live bakery Bo's agent drafted and
  our builders finished (source in [`deploy/`](deploy/README.md)). Customers reserve a loaf from their phones;
  **Deliver** flips every phone at once to *"Delivered: your sourdough is here."*
- **One model function.** Every call goes through `callModel` (`lib/model.js`) and returns JSON checked against a
  schema. Each teammate is its own call; in a discussion each turn reads the thread so far.
- **Honest labels.** Every number about a run is counted from its event log.

</details>

## How I built it
**One human with an idea and a team of agents.** I acted as product owner, and Claude Code agents worked as builders, designers, reviewers and a merger, each on its own branch, with every change reviewed before it reached `main`. That's over **1,000 commits in about 23 hours**.

- **Claude Sonnet, Haiku and Opus via fal** run the teammates
- **Linkup** powers Wren's live web search
- **ElevenLabs Scribe** handles speech, and **ElevenLabs Music** makes the soundtrack
- **fal** paints the studio art and each page's emblem
- **Figma** and **taste-skill** shape the look
- **Railway** hosts the live bakery site

## See it
**The door opens on the studio.**

![The studio door opening onto the room](docs/readme/door.webp)

**Her name tag, and meeting the team.**

<p>
<img src="docs/readme/nametag.webp" alt="Priya's name tag: the Regular Maker" width="38%">
<img src="docs/readme/meet.webp" alt="Meeting Mika, the Design teammate" width="50%">
</p>

**The tidy: her spoken sentence, cleaned up in her own words.**

<img src="docs/readme/tidy.webp" alt="A pen strikes 'um so basically' from her spoken idea" width="45%">

**A focus moment: she answers, and the team builds on her.**

![Wren's question, with Priya's answer and her teammates' replies](docs/readme/meeting.webp)

**When a teammate is blocked: one tap in her inbox, and the room carries on.**

<img src="docs/readme/unblock.webp" alt="Bo is blocked on when orders close; she taps Yes to the suggested 8pm, and the room carries on" width="80%">

**The Usual, the live bakery:**
[bring-your-own-craft-production.up.railway.app](https://bring-your-own-craft-production.up.railway.app). No real
bread and nothing to pay: just your first name.

<img src="docs/readme/delivered.webp" alt="On a phone: she puts her name down for a sourdough, it proves in the oven, then flips to Delivered: your sourdough is here" width="30%">

## APIs, models and datasets used
- **fal**, OpenRouter router: the models behind the room. Claude Sonnet 4.5 for the teammates, the selector, her
  profile, the sketch and the page fill; Claude Haiku 4.5 for the fast calls (the tidy, her name tag, the team's
  replies and discussion); Claude Opus for her takeaways and revisiting decisions (`lib/model.js`, `FAL_MODELS` and
  each `*_MODEL` default).
- **fal**, flux/schnell: her page's emblem, painted live; the live bakery's photos. The studio's painted cast, clips
  and music were made on fal.
- **Claude via Claude Code**, headless: the alternative route for the same calls (`MODEL_BACKEND=claude-code`).
- **ElevenLabs**: Scribe speech-to-text, live, for her voice; ElevenLabs Music (through fal) for the record player's
  soundtrack.
- **Linkup**: Wren's live web search.
- **taste-skill** (MIT, third-party, vendored in `vendor/taste-skill/`): the Design teammate's rules and the page's
  palette and type.
- **Anthropic product-management skills** (Apache-2.0, vendored): `write-spec`, in the Product teammate's prompt.
- **Playwright**: end-to-end tests.
- **Photographs**: the bakery and café templates use Wikimedia Commons photos under CC BY and CC BY-SA, credited per
  photo on each template's `credits.html` (the bakery: Johann Jaritz, CC BY-SA 3.0 AT; Chmee2, CC BY 3.0;
  Wald1siedel, CC BY-SA 4.0).
- **Datasets**: none. Wren's prepared finding is one public web page, cited in `data/research-finding-bakery.json`.

The full table, with fonts and libraries, is under [Credits and licence](#credits-and-licence).

## Built during the hackathon
All project code was written during the hackathon (14–15 Nov 2026). The third-party pieces are open source and
credited: taste-skill (MIT) and Anthropic's product-management skills (Apache-2.0), vendored with their licences, plus
the fonts, `motion` and Playwright listed below. The models are used through their APIs.

## Figma
We went from code to Figma. The running room was measured in the browser and rebuilt as editable Figma frames, with
its colours and spacing as a Figma variable collection ("Room tokens"), its type and its seat glyphs, so a designer
can pick it up and tweak it: [the Figma file](https://www.figma.com/design/EwqOeVqbMUWXHEzM6pqOvB). How it was done,
frame by frame: [`design/FIGMA.md`](design/FIGMA.md). The frames show the room's early look, before the painted one.

## Built with our sponsors
fal, ElevenLabs, Linkup, Figma and Anthropic, as above. Built 14–15 Nov 2026 at the Imperial AI hackathon, Autonomous
Agents track.

## What's next
*Where I'm heading, not what's built yet.*

**A new way of working.** A lot of work will stop being economically productive for people to do. I want to build a
way of working with AI agents that preserves our craft and imagination, and lets us spend more than 90% of our time
doing what we love.

**A team that keeps what it learns about you.** Every tool today starts from zero, so you explain yourself again on
every project. Your team should keep its own picture of you: your customers, your taste, your philosophy as it
emerges from what you say. It uses that to decide the way you would, and asks you less as it gets to know you.

**Every craft gets a seat.** I'm starting with product managers like Priya, because they know customers and journeys
inside out and have more ideas than people to build them. The same shape fits a designer, a researcher, or a baker
with a business idea: you take the seat of your craft, and the team fills the rest.

**A table with room for everyone.** Next, real people join the table: invite a real engineer to the Engineering seat,
and they bring their own team of agents. People and agents side by side, everyone doing what they're best at.

## Run it yourself
You need Node 22. There is nothing to install.

1. Create `.env.local` with your fal key: `FAL_KEY=...` and `MODEL_BACKEND=fal`. Add `ELEVENLABS_API_KEY=...` for
   voice; without it, she types and everything still works.
2. `npm run doctor` checks the machine is ready.
3. `npm run local` starts the studio and prints its address.

Tests: `npm test` (offline, no model calls) and `npm run e2e` (the whole journey, walked through in a real browser; it needs
Playwright: `npm i -g playwright && npx playwright install chromium`). The room listens on this machine only (loopback);
`HOST=0.0.0.0` opens it to the network on purpose. The full guide is [`docs/RUN-LOCALLY.md`](docs/RUN-LOCALLY.md).

## Credits and licence
- [taste-skill](https://github.com/Leonxlnx/taste-skill) by Leonxlnx (MIT), vendored with its licence in
  `vendor/taste-skill/`.
- Anthropic's [product-management skills](https://github.com/anthropics/knowledge-work-plugins) (Apache-2.0),
  vendored unchanged with their licence in `vendor/product-management/`.
- Licence: [PolyForm Noncommercial 1.0.0](LICENSE).

<details>
<summary>Every API, model and open-source piece we used</summary>

| What | Used for | Licence |
|---|---|---|
| Claude Code, headless (`claude -p`) | the alternative model route (fal is the default): teammates and the selector on Claude Sonnet (Claude Code's `sonnet` alias), the quick speech tidy on Claude Haiku (`haiku`) | Anthropic commercial terms; not redistributed |
| [ElevenLabs](https://elevenlabs.io) speech-to-text and ElevenLabs Music | her spoken intro, idea and answers; the record player's soundtrack (made through fal) | ElevenLabs terms; API only |
| [taste-skill](https://github.com/Leonxlnx/taste-skill) (© Leonxlnx) | the Design teammate and the built page: Design deals the page's palette and type live when the skill's scripts are installed on the machine (otherwise the template's own type stays); its rules guide the studio's look. Vendored in `vendor/taste-skill/` with its licence; never installed as a plugin in this repo | MIT |
| Anthropic [product-management plugin](https://github.com/anthropics/knowledge-work-plugins), `write-spec` skill | the Product teammate's instructions. Vendored unchanged in `vendor/product-management/` (commit `e91a134`) with its licence | Apache-2.0 |
| [`motion`](https://motion.dev) 14.14.0 | springs for the studio's animation; copied to `public/vendor/motion/` for offline use | MIT |
| Archivo Black, via [@fontsource](https://fontsource.org) | display type | SIL OFL 1.1 (`public/fonts/LICENSE-archivo-black.txt`) |
| IBM Plex Sans and IBM Plex Mono, via @fontsource | UI type | SIL OFL 1.1 (`public/fonts/LICENSE-ibm-plex.txt`) |
| The typefaces taste-skill can deal for a place page (Fraunces, Figtree, Besley, Albert Sans and others), via @fontsource | the built page's type, dealt live by Design and served locally | SIL OFL 1.1 (each `vendor/fonts/<face>/LICENSE`) |
| Bakery photographs (Wikimedia Commons) | the bakery page | CC BY / CC BY-SA, credited on the page's `credits.html` |
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) skills: `verification-loop`, `e2e-testing`, `frontend-design-direction`, `ui-demo` | agent skills used while building, unmodified; not shipped in this repo | MIT |
| [Playwright](https://playwright.dev) | end-to-end tests in Chromium | Apache-2.0 |
| [fal](https://fal.ai) | the default model backend (Claude via OpenRouter); flux/schnell for her page's emblem (live) and the live bakery site's photos; the cast portraits, room clips and music | fal terms; API only |
| Node.js 22 (`node:http`, `node:test`) | the server and unit tests | MIT |

</details>
