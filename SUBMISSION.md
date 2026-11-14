# Bring your own craft: Devpost write-up

Paste each section into the matching Devpost field. Numbers in [brackets] are not measured yet; fill them from the
rehearsal runs or delete them before submitting.

**Track:** Autonomous Agents.

**Tagline:** Take the seat of the craft you love, and a team of agents fills the rest. They decide almost everything
your way, and ask you only what's worth your time.

## Inspiration
Building with AI today, you either get a tool that guesses everything or an agent that asks about everything. Both
take you out of your own craft. A product person ends up approving pop-ups, not deciding the journey. We wanted
agents autonomous enough to decide nearly everything, with a hard, coded limit on how often they interrupt you.

We checked the first half before writing any code. We gave a default coding agent one prompt: "Build me a booking
page for a small yoga studio." It asked 0 questions. It made 22 guesses about the studio: its name, four teachers,
the prices, a two-hour cancel rule, that you must sign in to book, that a full class has no waitlist. We listed every
guess with its evidence (`docs/baseline/GUESSES.md`). Every one of them was the owner's call.

## What it does
You take one of five seats at a table: Product, Design, Data, Research or Engineering. The other four are agents.

In the demo, Priya takes the Product seat. She writes the idea and her customer journey, one line a step, and each
line becomes a box on her flow. The four agents work in parallel, on their own, and raise every decision the build
needs. A counter shows how many came up and how many reach her.

At most three reach her. They arrive inside her own work, as a fork on her flow or a note pinned to a box, each with
a recommendation and a reason. Never a pop-up. She can take the recommendation or overrule it. The agents decide
everything else themselves, and each decision cites the line of her own file that decided it.

Her file is her product philosophy, a few lines long. She never writes it. She makes a call on her work and pins it
("Cut the phone field. Name's enough; regulars hate forms."), and the team names the principle behind it ("Sounds
like: never ask for what you could remember"). She rewords it, and it is written into her file. Then she presses
Build and gets her booking page, with a step she never touched following the rule she just wrote. [The Build step
and the page are in progress at the time of writing; update this once they run.]

A different idea gets different questions. At the close, a judge gives us an idea live, and the agents bring the
three questions they would ask a product person, in about 15 seconds.

## How we built it
- One Node 22 server, one HTML page, vanilla JavaScript, no build step and no dependencies.
- Every model call goes through one function, `callModel`, which returns JSON validated against a schema. The
  backend is Claude Code run headless, with our own system prompts and no tools.
- Five teammate agents, each a model call with its own stance, run in parallel. The Product teammate uses Anthropic's `write-spec` skill
  from the product-management plugin. Research cites only a finding gathered before the demo from a real source, with
  its URL.
- The selector: one model call scores each decision (in her seat? changes the build? does her file already say?).
  Code, not the model, applies the cap of three and the rest of the rules.
- An ask policy: one function is the only way to put a question in front of her, and it re-counts the log before it
  lets one through. A question in a teammate's plain text counts as a stamp.
- One event log per run. The counter, the reasons and the IN YOUR CRAFT % meter are computed from it.
- The page is a template built ahead of time with taste-skill, then filled live from her flow, answers and file.
  [In progress at the time of writing: the template and the live fill.]
- The room's look is a risograph print: paper, ink, one ink per seat, hard shadows. Springs from the `motion` library.
- We built it the same way: Vincent sat in the Product seat, and a lead agent and four builder agents built the
  pieces in parallel against a written contract, each change reviewed by an agent that didn't write it. Who decided
  what is logged in `docs/DECISIONS.md`.

## Challenges we ran into
- Making the cap real. A prompt that says "ask at most three" is a hope. We moved the rule into code with two locks,
  the selector and the door, and tested it over 500 random score sets.
- Picking good questions. Early runs asked two versions of the same question. We added duplicate grouping, one
  question per box, and a check for questions that say the same thing in other words.
- Speed. Scoring 25 decisions took 16.8 s at default effort and 7.2 s at low effort. A full run (five teammates, then
  the selector) now takes 17.8–20.1 s; the fast path for a judge's idea takes 11.4–15.1 s over six ideas
  (`docs/dry-runs/timings.md`).
- A fair baseline. Headless mode can't show questions, so we ran the default agent a second time, interactively, with
  a script answering every dialog. It still asked 0.
- We planned a second backend through fal on the user's own key. The key never reached our build sessions (401
  every time), so it is not the default, and not used on the day; we run on Claude Code.

## Accomplishments that we're proud of
- The cap of three is enforced in code and tested: a fourth never gets through.
- Every decision made for her shows its reason: a line of her file, or "team default". A citation to a line that
  doesn't exist is rejected.
- Across eight real dry runs on six different ideas, each brought exactly three questions out of 15 or 25 that came up
  (`docs/dry-runs/`).
- Asked 0, guessed 22 (the default agent) beside 3 asked, [M, TBD from rehearsal] decided from her file.

## What we learned
- The useful line is between craft and stamping, not between asking and not asking. A choice inside your own work
  feels like work you love; a yes/no pop-up feels like paperwork.
- People are better at reacting than at writing principles. Naming the principle behind a decision she just made gets
  a truer file than a questionnaire.
- Rules that matter belong in code, with a test. Models are good at ranking; they shouldn't be the ones counting.

## What's next
- Own modes for the other four seats, so a designer or an engineer can take the seat of their craft.
- More than one inference per run, and letting her drop a "Sounds like" line.
- Her file carried across projects.
- Builds that go beyond filling a prepared template.

## Built with
Node.js, JavaScript, HTML, CSS, Claude (via Claude Code, headless), Anthropic product-management plugin (`write-spec`),
taste-skill, motion, Archivo Black, IBM Plex, Playwright.

## Try it
Repo: [public repo URL]. Run `npm start`, open http://localhost:3000. Tests: `npm test`, `npm run e2e`.
Demo video: [TBD from rehearsal].
