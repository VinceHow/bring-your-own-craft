# Bring your own craft: Devpost write-up

Paste each section into the matching Devpost field. There is no demo video: we present live. Source of truth for the product: `VISION.md`.

**Track:** Autonomous Agents (Imperial AI hackathon).

**Tagline:** Bring your own craft: spend 90% of your time on the craft you love, with a team that handles the rest
and brings you only the few big questions that need you.

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
I'm a builder at heart, and I love the craft: understanding people, deciding what's worth building, and writing some of the code too. But building with AI today pulls me away from it. **Coding agents ask about everything.** One prompt stopped for **20 approvals**, including which backend language to use. **AI app builders assume everything**, so it's hard to weave in my own craft and judgement. I wanted a way to spend 90% of my time on the part I love.

## What it does
**Bring Your Own Craft** is a hand-painted studio where you take the seat of your craft, and a team of AI agents fills every other seat: **Mika** (Design), **Wren** (Research), **Theo** (Data), **Ines** (Strategy) and **Bo** (Engineering).

You say your idea in one rough sentence and meet your team. They get to know you, handle their own work, and bring you **only the few big questions that need your expertise**. Your app builds as you decide.

In the demo, a product manager gets a bakery ordering site, and the audience reserves a real loaf on the live site from their own phones.

## How we built it
**One human with an idea and a team of agents.** I acted as product owner, and Claude Code agents worked as builders, designers, reviewers and a merger, each on its own branch, with every change reviewed before it reached `main`. That's over **1,000 commits in about 23 hours**.

- **Claude Sonnet, Haiku and Opus via fal** run the teammates
- **Linkup** powers Wren's live web search
- **ElevenLabs Scribe** handles speech, and **ElevenLabs Music** makes the soundtrack
- **fal** paints the studio art and each page's emblem
- **Figma** and **taste-skill** shape the look
- **Railway** hosts the live bakery site

## Challenges we ran into
The hardest balance was **asking fewer questions without guessing**. A selector ranks every decision the team proposes and brings you only what's big and in your craft; the team settles the rest itself and says why. The other challenge was keeping a painted, playful studio calm and readable while a lot happens at once.

## Accomplishments that we're proud of
**It's real.** Everything is wired up and works from beginning to end.

**It's built the way it works.** One person stuck to the decisions they're good at, while a team of agents did the rest.

## What we learned
AI will outdo us at a lot of work, and that means **we get to choose** what we do. The part we keep is **judgement**: taste, expertise, craft. The way we work has to change so that judgement is what we spend our time on.

## What's next for Bring Your Own Craft
**A new way of working.** A lot of work will stop being economically productive for people to do. I want to build a way of working with AI agents that preserves our craft and imagination, and lets us spend more than 90% of our time doing what we love.

## Built with
Node.js (`node:sqlite`), JavaScript, HTML, CSS, server-sent events, Railway, Claude (via fal's OpenRouter router in the
demo, and Claude Code headless as the fallback), Anthropic product-management plugin (`write-spec`),
taste-skill, ElevenLabs (live speech-to-text, and the studio's soundtrack with ElevenLabs Music), fal (Claude via OpenRouter; flux/schnell for her page's emblem, live, and
the live bakery's photos and logo, made ahead; the painted cast, clips and music), Linkup (Wren's live research), motion,
Playwright.

## Try it
Repo: https://github.com/VinceHow/bring-your-own-craft. Node 22, nothing to install: put `FAL_KEY` and `MODEL_BACKEND=fal` in `.env.local`,
run `npm run local` and open the address it prints (port 3000–3010). Tests: `npm test`; `npm run e2e` also needs
Playwright (`npm i -g playwright && npx playwright install chromium`).
