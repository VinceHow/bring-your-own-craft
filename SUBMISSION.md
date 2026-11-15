# Bring your own craft: Devpost write-up

Paste each section into the matching Devpost field. Anything marked **TBD** is not measured yet: fill it from a real run
or delete it before submitting. Source of truth for the product: `VISION.md`.

**Track:** Autonomous Agents.

**Tagline:** Bring your own craft: do the part you love, and a team of agents gets your idea built.

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
You walk into a hand-painted studio and take the seat of the craft you love. Today that's Product; "Your own craft"
lets anyone bring theirs (a baker, a designer). You say what you love in one sentence, and the team turns it into a
playful character card. Then your team takes its seats: Mika (Design), Noor (Research), Theo (Data), Ines (Strategy)
and Bo (Engineering), each an agent with its own craft and tools.

In the demo, Priya, a product manager, wants an ordering website for a friend's small bakery. She says the idea in one
sentence, and within seconds Noor and Mika put a rough journey on the table: who the users are and the stages they go
through, no screens. She reacts in plain words ("it's really for the regulars"), and the journey redraws.

Then the team goes to work on its own. Teammates settle every small decision themselves (accounts, cut-off rules,
sold-out states), talk the joint ones out with each other, and land agreements on a shared team space. Nothing pings
her.

When something truly needs her (a big question that draws on what she knows best), a note waits in her tray. She opens
it when she's ready, and the room goes quiet: one document with the work to review, and one thoughtful question, such
as "Who walks into your friend's bakery most often, and what are they hoping to walk out with?" She says her piece. The
moment she submits, her teammates chime in, building on her and on each other, and the meeting's takeaways sum up what
she believes and her guidance to the team. Behind the scenes, the team keeps a private picture of her (her customers,
her taste, her philosophy) and decides everything else her way.

One press, and the bakery's ordering page appears, built from her answers: "Your loaf, held at the counter with your
name on it." Then a judge gives us an idea live, and the team sketches it and asks its first question in seconds.

## How we built it
- One Node 22 server, one HTML page, vanilla JavaScript, no build step.
- Every model call goes through one function that returns JSON validated against a schema. Models run through Claude
  Code headless, with our own system prompts and no tools.
- Each teammate is its own model call with its own craft and stance. They really talk to each other: in a joint
  decision or a chime-in, each turn is a separate call that reads the thread so far.
- The Product teammate uses Anthropic's `write-spec` skill from the product-management plugin. The Design teammate and
  the built page use taste-skill. Research cites a real, sourced finding.
- What reaches her is decided by a selector against a written bar (big, draws on what she's good at or loves, answerable
  on the page), and code, not the model, enforces a hard ceiling of three questions, with tests.
- A private profile, deduced from her one-sentence intro and her idea and updated after each answer, lets the team
  assume and keep moving.
- Voice: she can speak her intro, her idea and her answers (ElevenLabs speech-to-text).
- Two model routes behind one function: fal (Claude through fal's OpenRouter router, `MODEL_BACKEND=fal`) is what runs
  in the demo; Claude Code headless is the alternative route. fal was tested 9/9 schema-valid against Claude Code on 3
  real calls per step, and it runs the demo because on the demo laptop Claude Code's fast model, through a company
  gateway, took over 25 s a call while fal answered in about 1 s.
- Brand images for the bakery site: planned with fal flux/schnell (timed at a median 2.2 s, about 0.3¢ an image).
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
- **Speed.** The first journey draws in about 2.5 s, the first teammate replies about 1 s after she submits, the team's
  work plus selection takes about 18–20 s, and the page builds in about 22 s.
- **An honest baseline.** We re-ran the default agent on the exact bakery prompt and counted every guess by hand.

## Accomplishments that we're proud of
- One spoken sentence to a working ordering page, with three thoughtful questions in between. Full run: **TBD** s.
- The questions are about her craft, never about the stack.
- Teammates that genuinely build on her and on each other, in short, human lines.
- A default agent: 0 asked, 24 guessed, 20 approvals. Her team: 3 asked, **TBD** decided by the team, 0 approvals.
- A judge's own idea gets a journey and its first question in about 11 s.

## What we learned
- The useful line is between craft and stamping, not between asking and not asking.
- People are better at reacting than at writing from a blank page, so the team always brings something to react to.
- Rules that matter belong in code, with a test. Models are good at ranking; they shouldn't be the ones counting.

## What's next
- Every seat polished, so a designer or an engineer can take the seat of their craft.
- A team that remembers you across projects, and asks less as it learns you.
- Multiplayer: invite a real engineer to the Engineering seat, and they bring their own team of agents.
- Builds that go beyond a prepared template.

## Built with
Node.js, JavaScript, HTML, CSS, Claude (via fal's OpenRouter router in the demo, and Claude Code headless as the alternative route), Anthropic product-management plugin (`write-spec`),
taste-skill, ElevenLabs (speech-to-text), fal (Claude via OpenRouter, the model backend that runs in the demo; flux/schnell
planned for the bakery's brand images), motion, Playwright.

## Try it
Repo: **TBD** (public repo URL). Run `npm start`, open http://localhost:3000. Tests: `npm test`, `npm run e2e`.
Demo video: **TBD**.
