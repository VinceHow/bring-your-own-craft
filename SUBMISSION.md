# Bring your own craft: Devpost write-up

Paste each section into the matching Devpost field. Anything marked **TBD** is not measured yet: fill it from a real run
or delete it before submitting. Source of truth for the product: `VISION.md`.

**Track:** Autonomous Agents (Imperial AI hackathon).

**Tagline:** Bring your own craft: spend 90% of your time on the craft you love, with a team that handles the rest
and brings you only the few big questions that need you.

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
love. Then you meet your team up close, each with a line tailored to your idea: Mika (Design), Noor (Research), Theo
(Data), Ines (Strategy) and Bo (Engineering), each an agent with its own craft and tools. The door opens on a
hand-painted studio, everyone already round the table, and your stool waiting.

In the demo, Priya, a product manager, wants an ordering website for a friend's small bakery. As she sits down, Noor
and Mika put a rough journey on her idea sheet: who the users are and the stages they go through, no screens. Then
the team gets going on its own: every small decision (accounts, cut-off rules, sold-out states) is theirs, joint ones
are talked out between them and land in a shared team space. Nothing pings her.

The team brings her only the big questions that need her craft. In this run, three things reached her, each a
different way a team needs its product person:
1. **Focus: who it's for.** Noor brings a real finding about who buys from neighbourhood bakeries, with its source,
   researched before the demo and labelled so. She reacts ("it's really for the regulars"), and that one answer
   unlocks a run of the team's decisions.
2. **A quick unblock.** An action card: "Bo's blocked: when do orders close? We suggest 8pm the night before." One
   tap on Yes, and Bo carries on.
3. **Focus: the customer experience.** Mika's rough journey in words for a regular's morning, and one question: what
   should this feel like for a regular?

Each focus moment is a short meeting with three modes: **Compose** (she speaks in pieces), **Send** (a round of live
team discussion, teammates building on her and on each other; only the relevant ones chime in), and **End meeting**
(the takeaways: what she believes, and her guidance to the team). Behind the scenes the team keeps a private picture
of her (her customers, her taste, her philosophy) and decides everything else her way.

One press, and her bakery's ordering page builds from her answers: regulars first, their usual loaf one tap away,
reserve by first name, no account, no payment, an 8pm cut-off. Every line traces to her or her team.

**The proof: the judges are the regulars.** Before the talk, the judges scan a QR code and reserve a loaf, by first
name only, from a live bakery deployed on Railway: three tiers (a rare drop of 3, 8 of a medium loaf, 40 of a
plentiful one), one of each per person. That bakery was built earlier by the same team of agents from a differently
worded brief, and we say so on stage. Vincent opens the baker's admin page (orders arriving live, what's sold out)
and taps **Deliver**, and every judge's open page flips at once to "Delivered: your sourdough is here." Real software
with a real database, rules and tests, not a page generator. (Demo bread: nothing real is delivered or paid.)

## How we built it
- One Node 22 server, one HTML page, vanilla JavaScript, no build step.
- Every model call goes through one function that returns JSON validated against a schema. Models run through Claude
  Code headless, with our own system prompts and no tools.
- Each teammate is its own model call with its own craft and stance. They really talk to each other: in a joint
  decision or a chime-in, each turn is a separate call that reads the thread so far.
- The Product teammate uses Anthropic's `write-spec` skill from the product-management plugin. The Design teammate and
  the built page use taste-skill. Research cites a real, sourced finding.
- What reaches her is decided by a selector against a written bar (big, draws on what she's good at or loves, answerable
  on the page). Everything else the team decides itself, citing what it knows about her.
- A private profile, deduced from her one-sentence intro and her idea and updated after each answer, lets the team
  assume and keep moving.
- Voice: she speaks her idea, her intro and her answers (ElevenLabs speech-to-text, live).
- Research: Noor's finding was searched and cited with Linkup before the demo, and is labelled "researched before the
  demo" on screen; there is no live search on stage.
- Two model routes behind one function: fal (Claude through fal's OpenRouter router, `MODEL_BACKEND=fal`) is what runs
  in the demo; Claude Code headless is the alternative route. fal was tested 9/9 schema-valid against Claude Code on 3
  real calls per step, and it runs the demo because on the demo laptop Claude Code's fast model, through a company
  gateway, took over 25 s a call while fal answered in about 1 s.
- The live bakery (`deploy/app/`): Bo's agent wrote it from the brief and a recorded run's decisions; our builders
  fixed what failed its 11-test acceptance suite (`deploy/ACCEPTANCE.md`), so its credit reads "Built by Bo, the
  team's engineer. Polished by our builders." Plain Node 22 with `node:sqlite` on a Railway volume, server-sent events
  for the Deliver flip, stock that can't go below zero, one of each per device per drop, a 15-minute hold, and an
  admin page locked behind a token. Its photos and logo were made ahead with fal flux/schnell
  (`deploy/make-images.mjs`; median 2.2 s, about 0.3¢ an image).
- The room's art: fal made the painted cast, the living-painting clips and the record-player music (ElevenLabs Music
  via fal); the ledger is in `design/FAL-SPEND.md`.
- One event log per run; every number on screen comes from it. Anything prepared ahead is labelled PREPARED or REPLAY.
- We built it the same way. Vincent sat in the Product seat; a product-owner agent shaped the experience with him; a
  lead agent split the work across up to eight builder agents in parallel; every change was reviewed by an agent that
  didn't write it. How the idea evolved, with timestamps: `docs/HOW-THE-IDEA-EVOLVED.md`.

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
  teammate replies 2.2 s after she sends, takeaways land in 3–4 s, the team's work plus selection takes 33 s (we
  planned for 20, so we cut a discussion round from the second focus moment to keep the talk inside 3 minutes), and
  her page builds in 22 s.
- **An honest baseline.** We re-ran the default agent on the exact bakery prompt and counted every guess by hand.

## Accomplishments that we're proud of
- One spoken sentence to a working ordering page, with only the big questions that need her in between (three, in
  our audited run). Full run, idea to her page: **TBD (Vincent's own timed run)**.
- The questions are about her craft, never about the stack.
- Teammates that genuinely build on her and on each other, in short, human lines.
- A default agent: 0 asked, 24 guessed, 20 approvals. Her team: 3 asked, 14 decided by the team, 0 approvals (audit fal run 05:00).
- A judge's own idea gets a rough journey in 2 s and its first check-in in 23 s (audit fal run 05:00).

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
demo, and Claude Code headless as the alternative route), Anthropic product-management plugin (`write-spec`),
taste-skill, ElevenLabs (live speech-to-text), fal (Claude via OpenRouter; flux/schnell for the live bakery's photos
and logo, made ahead; the painted cast, clips and music), Linkup (Noor's research, before the demo), motion,
Playwright.

## Try it
Repo: **TBD** (public repo URL). Run `npm start`, open http://localhost:3000. Tests: `npm test`, `npm run e2e`.
Demo video: **TBD**.
