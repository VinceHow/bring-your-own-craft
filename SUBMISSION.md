# Bring your own craft: Devpost write-up

Paste each section into the matching Devpost field. Anything marked **TBD** is not measured yet: fill it from a real run
or delete it before submitting. There is no demo video: we present live. Source of truth for the product: `VISION.md`.

**Track:** Autonomous Agents (Imperial AI hackathon).

**Tagline:** Bring your own craft: spend 90% of your time on the craft you love, with a team that handles the rest
and brings you only the few big questions that need you.

## Short description (problem · what we built · how it works)
**Problem.** Most projects die in the questions nobody signed up for. AI app builders guess everything, so a product
person's expertise never gets in; coding agents ask about everything. A default coding agent given one bakery prompt
asked 0 questions, guessed 24 things that were the owner's call, and stopped for 20 approvals.

**What we built.** A hand-painted studio where you take the seat of your craft and a team of AI agents fills the rest.
Priya, a product manager, says her bakery idea in one sentence; the team handles everything else and brings her only
three moments that need her: who it's for (research found live with Linkup), when orders close (a one-tap unblock),
and how it should feel. One press fills her ordering page. Then the judges scan a QR code and reserve a real loaf
from The Usual, a live bakery the same team built ahead.

**How it works.** Every model call goes through one function and returns schema-checked JSON. Each teammate is its own
call; discussions are turn by turn, each reading the thread. Off the demo path a selector brings her only what's big
and in her craft (on stage the three moments are set; everything inside them is live). Her words are tidied without
changing them; replies come from the teammates her words touch; takeaways sum up what she believes. The build fills
one of three designed templates with her decisions, with an emblem painted live on fal. Every number comes from the
run's log.

## APIs, models and datasets used
- **fal**, OpenRouter router: the models behind the demo. Claude Sonnet 4.5 for the teammates, the selector, her
  profile, the sketch and the page fill; Claude Haiku 4.5 for the fast calls (the tidy, her name tag, the team's
  replies and discussion); Claude Opus for her takeaways and revisiting decisions (`lib/model.js`, `FAL_MODELS` and
  each `*_MODEL` default).
- **fal**, flux/schnell: her page's emblem, painted live; the live bakery's photos, made ahead. The studio's painted
  cast, clips and music were made ahead on fal.
- **Claude via Claude Code**, headless: the fallback route for the same calls (`MODEL_BACKEND=claude-code`).
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

## Built during the hackathon
All project code was written during the hackathon (14–15 Nov 2026). The third-party pieces are open source and
credited: taste-skill (MIT) and Anthropic's product-management skills (Apache-2.0), vendored with their licences, plus
the fonts, `motion` and Playwright listed below. The models are used through their APIs.

## Figma
We went from code to Figma. The running room was measured in the browser and rebuilt as editable Figma frames, with
its colours and spacing as a Figma variable collection ("Room tokens"), its type and its seat glyphs, so a designer
can pick it up and tweak it: [the Figma file](https://www.figma.com/design/EwqOeVqbMUWXHEzM6pqOvB). How it was done,
frame by frame: [`design/FIGMA.md`](design/FIGMA.md). The frames show the room's early look, before the painted one.

## Inspiration
Most projects don't die from bad ideas. They die in the questions nobody signed up for. A product manager with a great
idea opens an AI builder and is asked which language, which database, which framework, or gets a generic product that
guessed everything she knows. Either way she leaves her craft, loses momentum, and the project stalls.

We measured the guessing before writing any code. We gave a default coding agent one prompt: "Build me an ordering
website for a small bakery, so customers can order bread ahead." It asked **0 questions**, made **24 guesses** about
the bakery (its name, address, opening hours, the whole menu and its prices, a 6 pm cut-off, pay at pickup, a password
staff page…) and stopped for **20 approvals**. Every guess was the owner's call. The full list, with evidence, is in
`docs/baseline/run-3-bakery/GUESSES.md`.

We wanted the opposite: a team that handles everything it can, and brings you only the few questions that need you,
so you stay in what you love and actually reach the end.

## What it does
You start with your idea, rough as you'd say it, on a blank sheet: "What do you want to build today?" Then your name
tag: your craft (today that's Product; "Your own craft" lets anyone bring theirs) and, in your own words, what you
love. Then you meet your team up close, each with a line tailored to your idea: Mika (Design), Wren (Research), Theo
(Data), Ines (Strategy) and Bo (Engineering), each an agent with its own craft and tools (Wren: Linkup search;
Mika: taste-skill, fal images and an ElevenLabs soundtrack; Bo: the build). The door opens on a
hand-painted studio, everyone already round the table, and your stool waiting.

In the demo, Priya, a product manager, wants an ordering website for a friend's small bakery. As she sits down, Wren
and Mika put a rough journey on her idea sheet: who the users are and the stages they go through, no screens. Then
the team gets going on its own: every small decision (accounts, cut-off rules, sold-out states) is theirs, joint ones
are talked out between them and land in a shared team space. Nothing pings her.

On stage, the demo fixes which three moments reach her; everything inside them (research, replies, takeaways, the
decisions, the build) is live. Off-stage, the team's selector decides what's big enough to bring her. The three, each
a different way a team needs its product person:
1. **Focus: who it's for.** Wren looks up who buys from neighbourhood bakeries, live with Linkup, and quotes her
   source; the finding is labelled "found just now with Linkup". She reacts ("it's really for the regulars"), and that one answer
   unlocks a run of the team's decisions.
2. **A quick unblock.** A scripted unblock card, fixed for the demo: "Bo's blocked: when do orders close? We suggest
   8pm the night before." One tap on Yes, and Bo carries on; her answer is decided and logged like any other.
3. **Focus: the customer experience.** Mika's rough journey in words for a regular's morning, and one question: what
   should this feel like for a regular?

Each focus moment is a short meeting with three modes: **Compose** (she speaks in pieces), **Send** (a round of live
team discussion: one or two teammates, picked by which crafts her words touch, reply live and build on her and on
each other), and **End meeting**
(the takeaways: what she believes, and her guidance to the team). Behind the scenes the team keeps a private picture
of her (her customers, her taste, her philosophy) and decides everything else her way.

One press, and the team fills one of three designed templates (bakery, café, yoga) with her decisions: regulars
first, their usual loaf one tap away, reserve by first name, no account, no payment, an 8pm cut-off. The model never
writes code; other ideas get the yoga layout. Every filled slot traces to her or her team; the layout is prepared.
The page's emblem is painted live with fal during the build (symbol only; the name is real text).

Two more things you can see happen: **sit in any seat** (pick your craft on the name tag; the teammate who held it
steps aside; Product is the default and the demo seat), and **your app starts building the moment you say Team, go**;
each later decision builds the next version, with a line on what changed.

**The proof: the judges are the regulars.** When she presses **Open the app** on stage, a QR card appears for The
Usual, a live bakery deployed on Railway. The judges scan it and reserve a real loaf, by first name only: three tiers
(a rare drop of 3, 8 of a medium loaf, 40 of a plentiful one), one of each per phone. The Usual was built ahead,
not in the room: drafted earlier by Bo's agent, from a differently worded brief, and
finished by our builders to pass the acceptance suite in `deploy/ACCEPTANCE.md`; its source is in `deploy/app/`,
and we say so on stage. Vincent opens the baker's admin page (orders arriving live, what's sold out)
and taps **Deliver**, and every judge's open page flips at once to "Delivered: your sourdough is here." Real software
with a database, rules and tests. (Demo bread: nothing real is delivered or paid.)

## How we built it
- One Node 22 server, one HTML page, vanilla JavaScript, no build step.
- Every model call goes through one function that returns JSON validated against a schema, on fal (the demo) or
  headless Claude Code (the fallback), with our own system prompts and no tools.
- Each teammate is its own model call with its own craft and stance. They really talk to each other: in a joint
  decision or a chime-in, each turn is a separate call that reads the thread so far.
- The Product teammate uses Anthropic's `write-spec` skill from the product-management plugin. The Design teammate and
  the built page use taste-skill.
- Off the demo path, what reaches her is decided by a selector against a written bar (big, draws on what she's good
  at or loves, answerable on the page). On the demo path the three moments are set. Everything else the team decides
  itself, citing her file where it can, its own defaults where it can't.
- A private profile, deduced from her one-sentence intro and her idea and updated after each answer, lets the team
  assume and keep moving.
- Voice: she speaks her idea, her intro and her answers (ElevenLabs speech-to-text, live).
- Research: Wren searches live with Linkup and quotes a finding only when the quote verifies against the source page;
  otherwise she shows a prepared finding, labelled "researched before the demo".
- Two model routes behind one function: fal (Claude through fal's OpenRouter router, `MODEL_BACKEND=fal`) is what runs
  in the demo; Claude Code headless is the fallback. fal was tested 9/9 schema-valid against Claude Code on 3
  real calls per step, and it runs the demo because, in our tests on the demo laptop, Claude Code's fast model through a
  company gateway took over 25 s a call while fal answered in about 1 s.
- The live bakery, The Usual (`deploy/app/`, with Bo's own account in `deploy/app/BUILT.md`): Bo's agent drafted it from the
  brief and a recorded run's decisions (`deploy/run/`; his prompt is `deploy/bo/PROMPT.md`); our builders finished what
  failed its 13-test acceptance suite (`deploy/ACCEPTANCE.md`, with the black-box tests beside it), so its credit reads "Built by Bo, the
  team's engineer. Polished by our builders." Plain Node 22 with `node:sqlite` on a Railway volume, server-sent events
  for the Deliver flip, stock that can't go below zero, one of each per device per drop, a 15-minute hold, and an
  admin page locked behind a token. Its photos and logo were made ahead with fal flux/schnell
  (`deploy/make-images.mjs`; median 2.2 s, about 0.3¢ an image).
- The room's art: fal made the painted cast, the living-painting clips and the record-player music (ElevenLabs Music
  via fal); the ledger is in `design/FAL-SPEND.md`.
- One event log per run; every number about her run comes from it (the baseline's are a hand count, linked). Anything
  prepared ahead is labelled where it's shown as hers: PREPARED, REPLAY, or "researched before the demo".
- We built it the same way. Vincent sat in the Product seat; a product-owner agent shaped the experience with him; a
  lead agent split the work across builder agents in parallel; each merge got an independent agent review
  (`docs/DECISIONS.md`, `docs/AUDIT.md`). How the idea evolved, with timestamps: `docs/HOW-THE-IDEA-EVOLVED.md`.

## Challenges we ran into
- **Asking the right questions.** Our first version asked about logins and form fields. The fix was a better bar, not a
  smaller number: only big questions that draw on what the person is best at, with everything granular decided by the
  team.
- **Feeling like a team, not a form.** Early feedback was "it feels like walking into a work meeting." We rebuilt the
  room as a cozy studio with two states: a busy room, and a quiet focus moment that's just her and one document.
- **Making the team's talk real.** Teammates reacting to each other only counts if each one actually reads the others'
  lines, so every turn is its own call.
- **Speed.** On the audit fal run 05:00 (15 Nov, run `run-2026-11-15T05-06-42-808Z-xhzk`, the full
  stage path, counted from its log): her name tag is read in 2.1 s, the first
  teammate replies 2.2 s after she sends, takeaways land in 3–4 s, the team's work takes 33 s (we
  planned for 20, so we cut a discussion round from the second focus moment to keep the talk inside 3 minutes), and
  her page builds in 22 s.
- **An honest baseline.** We re-ran the default agent on the exact bakery prompt and counted every guess by hand.

## Accomplishments that we're proud of
- One spoken sentence to her own ordering page, filled live into a prepared template, with three set moments for her
  in between. Full run, idea to her page: **TBD (Vincent's own timed run)**.
- The questions are about her craft, never about the stack.
- Teammates that genuinely build on her and on each other, in short, human lines.
- A default agent: 0 asked, 24 guessed, 20 approvals. Her team (demo path, three set moments): 3 asked, 14 decisions citing her file (her own lines plus one
  prepared seed line), 0 approvals (audit fal run 05:00).

## What we learned
- The useful line is between craft and stamping, not between asking and not asking.
- People are better at reacting than at writing from a blank page, so the team always brings something to react to.
- The team should assume and keep moving. Waiting on her for anything it could reasonably assume breaks her flow.

## What's next
- Every seat polished, so a designer or an engineer can take the seat of their craft.
- A team that remembers you across projects, and asks less as it learns you.
- Multiplayer: invite a real engineer to the Engineering seat, and they bring their own team of agents.
- Builds that go beyond a prepared template.

## Built with
Node.js (`node:sqlite`), JavaScript, HTML, CSS, server-sent events, Railway, Claude (via fal's OpenRouter router in the
demo, and Claude Code headless as the fallback), Anthropic product-management plugin (`write-spec`),
taste-skill, ElevenLabs (live speech-to-text, and the studio's soundtrack with ElevenLabs Music), fal (Claude via OpenRouter; flux/schnell for her page's emblem, live, and
the live bakery's photos and logo, made ahead; the painted cast, clips and music), Linkup (Wren's live research), motion,
Playwright.

## Try it
Repo: **TBD** (public repo URL). Node 22, nothing to install: put `FAL_KEY` and `MODEL_BACKEND=fal` in `.env.local`,
run `npm run local` and open the address it prints (port 3000–3010). Tests: `npm test`; `npm run e2e` also needs
Playwright (`npm i -g playwright && npx playwright install chromium`).
