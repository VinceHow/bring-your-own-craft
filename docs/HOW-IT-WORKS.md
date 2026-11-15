# How it works

One page for judges who want to check the claims in the code. It describes what's on `main`; anything behind a flag
or agreed but not yet built is marked. Every step writes to one event log per run, `runs/<id>/events.jsonl`, and every
number on screen is computed from that log.

## 1. The setup
The room stays hidden until the reveal (`public/room.js`, "the setup"):
- **Her name tag, on paper** (`public/room.js`, `lib/tag.js`). Her name, her role (Product, or her own craft: "Your
  own craft" puts her in the DIY seat, `diy` on the run; there is no seventh seat), and, spoken in her own words, what
  she loves and brings. The sentence goes through the shared speech tidy (`BYOC.tidy`, `lib/tidy.js`), then one fast
  call gives the team's own fun read (a playful title, two or three traits), every word editable. Her words become
  her intro.
- **Meet the team**, one by one, up close: Mika (Design), Wren (Research), Theo (Data), Ines (Strategy) and Bo
  (Engineering), each with a line in its own voice and what it brings (the clicker's forward goes to the next).
- **The reveal**: the studio appears for the first time, everyone already seated, and she takes her seat. Replays
  jump straight past the setup.
- **Her private profile** (`lib/profile.js`). One call after her intro and her idea deduces her business, customers,
  brand feel, strengths and her domains (the areas that are hers), each with a confidence. It's never shown; every
  teammate and the selector read it, and it is updated after each of her answers. The log records only that it was
  built or updated, never what it says.

## 2. The first sketch and her reshape
`lib/sketch.js`, `routes/sketch.js`.
- **First sketch:** one fast call turns her one-sentence idea into who the users are and the stages they go through
  (no screens). Research's prepared, sourced finding for the idea feeds it (`data/research-finding-bakery.json`), and
  the sketch logs whether it used it. Over `SKETCH_LIMIT_MS`, or on an error, a prepared sketch is shown instead,
  labelled **PREPARED** (`data/prepared-sketch-bakery.json`).
- **Reshape:** she reacts in plain words ("it's really for the regulars"); one call redraws the shape, replacing the
  journey. She can also edit a box directly, with no model call.

## 3. The team works, and what reaches her
**Propose** (`lib/teammates.js`). Each teammate is its own model call, in parallel, with its own craft prompt
(`prompts/`): it raises the decisions its craft needs, as candidates. The Product teammate's instructions come from
Anthropic's `write-spec` skill; Design's from taste-skill; Research may cite only its prepared finding.

**Select** (`lib/select.js`). One model call scores every candidate against the question bar: `big` (does her answer
change the shape of the product), `hers` (does it draw on what she's especially good at or loves), `domain` (which of
her domains it sits in), `granular` (a detail the team settles with a default: logins, fields, a colour, a technical
choice), `showable`, `silent` (how open her file leaves it) and `dupOf`. For the few that clear the bar it writes one
open question in the asking teammate's voice. Then **code** applies the rules (`clearsBar`, `pickAsks`):
- a question reaches her only if it's big and hers, in one of her domains, not granular, and answerable on the page;
- granular decisions are never asked, and never folded into an ask;
- a question must be natural (open, one sentence, one breath, no options offered), else it is refused;
- duplicates are asked once; picks spread across her work (one per box, one per finding, never the same question in
  other words);
- the result is cut to the hidden ceiling (`MAX_ASKS`), whatever `max` a caller passes: a safety net, not a target.

**The hidden safety ceiling** (`lib/policy.js`). What reaches her is decided by the bar above; this is only a backstop. The only code that writes an `ask` event. It opens only with a grant the
selector made (the selector claims the grantor once, as it loads, and a grant refuses more than 3 ids), and before
letting an ask through it re-counts the run's log, so nothing past the ceiling gets through even if a caller gets it wrong.
`MAX_ASKS` lives here (a safety net, never shown or promised). Anything else that tries to ask is refused (`ask.refused`, with the reason) and decided, so
nothing is dropped. No number is promised on screen: the ceiling is hidden.

**Everything else is decided by the team** (`decideCore`, `decideRest`), in the background, without waiting on her.
What she settles in a focus moment is never re-decided.

**Tests** (`npm test`, offline, fake models): `test/select.test.js` (the safety ceiling holds, with 10 strong
candidates, with any `max`, over random scores and across two selector runs on the same run; granular is never asked;
an unnatural question is never asked; a different idea changes the picks) and `test/policy.test.js` (an ask without
the selector's grant is refused, decided and logged; only `lib/policy.js` writes `ask` events).

## 4. Focus moments
When a question is ready, a note waits in her tray (`public/room.js`). She opens it when she's ready, and the room
goes quiet: one document (`public/focus-doc.js`) with the work the question sits on (her journey, Wren's finding or
Mika's wireframes) and one open question.
- **Capture** (`lib/tidy.js`, `routes/tidy.js`). She speaks (or types) her answer in pieces. Each piece shows raw at
  once, then a quick tidy (one small background call per piece) turns it into her own composed note, with "See what
  you said" and "Use mine". The swap animates by a word-level diff (`public/word-diff.js`). A tidy that is slow (over
  about 3 s), fails, or adds words she didn't say leaves her raw words, silently. While she captures, the team is out
  of view and makes no model calls. Send gathers the pieces (the tidy where ready, raw where not) and never waits.
- **Routing** (`lib/thread.js`, `speakers`). Only the teammates her words touch reply, picked by a keyword match on
  each craft, with no model call: the best one starts at once, a second or third joins only above a threshold, and if
  nothing matches, the teammate nearest the work replies. Each reply is its own call reading the thread so far, so
  they build on her and on each other. The first reply arrives about 1 s after she sends. A reply never ends on a
  question to her: code checks, retries once, then cuts the trailing question.
- **Pins** (`public/focus-doc.js`). After Send she stays on her page: each reply appears beside its pin on the work
  for 4–8 s (by its length), then folds into the pin; clicking the pin shows it again. The full thread opens only
  with "Read the conversation".
- **Takeaways** (`lib/interpret.js`). One call maps her words onto the decisions the question settles and writes the
  meeting's takeaways in her voice: what she believes about this, and her guidance to the team. She can reword them.
  They are kept (her hidden file and her profile's philosophy grow), and the team decides the rest her way.

## 5. The team space
`lib/joint.js`, `lib/chatter.js`. After the team proposes, the few biggest decisions that touch several teammates and
weren't brought to her are talked out: a real short exchange of 3–4 turns, each turn its own fast call by one of the
teammates involved, reading the thread so far. The lines appear as room chatter; the agreement lands as a one-line
card in the team space in the middle of the table, and a tap shows how they got there. It runs in the background,
never blocks her and never asks her anything (`JOINT_OFF=1` turns it off). The rest of the room's light chatter is
written by code from real run events, with no model call, and is never addressed to her.

## 6. The build
`routes/build.js`, `lib/fill.js`, `lib/design.js`. One press: the rest is re-decided against what she said, then one
model call turns her journey, her answers, her takeaways and the team's decisions into the template's slot JSON,
checked against `templates/<t>/slots.schema.json`. Our code, not the model, writes the page. The templates
(`templates/bakery`, `yoga`, `cafe`) are prepared ahead. Design deals the page's palette and type through taste-skill
when its scripts are installed on the machine. Progress shows as build steps, never a spinner. In the DIY seat, an idea
no template fits gets her sketch and questions, and says plainly that there's no page for it.

## 7. Replays and labels
`public/replay.js`, `routes/room.js`. **R** replays a recorded run from its own log, with its own timings, under a
**REPLAY** label for as long as it's on screen. A recorded run is the fallback if a live beat fails. A prepared
journey is labelled **PREPARED**. Off by default: a guest chair, a stand-in for the main user type who reacts to the
first sketch (`lib/guest.js`, only with `GUEST_CHAIR=1`).

## 8. Models and the key
Every model call goes through one function, `callModel` in `lib/model.js`, and returns JSON validated against a schema.
- `claude-code` (the default when `MODEL_BACKEND` is unset; the alternative route): Claude Code headless (`claude -p`), with our own system prompt, no tools
  and no project files loaded, using the machine's own login. Teammates and the selector use Sonnet at low effort; the
  quick tidy uses Haiku.
- `fal` (what runs in the demo, `MODEL_BACKEND=fal`): Claude through fal's OpenRouter router, on `FAL_KEY`.

The fal key:
- is read from `FAL_KEY` and held in server memory, never written to disk, logs, `runs/`, the browser or the repo;
- is stripped from error messages by `scrub()` in `lib/model.js`, and `sendJson` in `lib/http.js` scrubs every HTTP
  response;
- never reaches the Claude Code backend, which runs with `FAL_KEY` blanked, in `/tmp`;
- in cloud sessions is injected by the network proxy, so the code never sees it there.

The **leak test** (`test/leak.test.js`, offline) makes a full run through the HTTP API with `MODEL_BACKEND=fal`, a
sentinel key and a hostile fake fal that echoes the key back. It asserts the sentinel appears nowhere in `runs/`, the
console, or any HTTP response, SSE included.

Voice is ElevenLabs speech-to-text on the server (`routes/voice.js`, key in `ELEVENLABS_API_KEY` or injected by the
proxy). Without a key the mic hides and she types.
