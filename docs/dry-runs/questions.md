# The question bar, real runs (Sat 14 Nov, build/questions)

Each run: her intro sentence (DEMO.md 0:22), Design's live first sketch, six teammates, the selector. Backend
claude-code; team and select on sonnet at low effort. Run one at a time (running four at once inflates every timing).

| Idea | Per seat | Sketch | Team | Select | Total | Asked |
|---|---|---|---|---|---|---|
| Yoga (`questions-yoga.md`) | 4 | 2.9 s, used Wren's finding | 8.2 s | 16.7 s | 25.0 s | 3 of 24 |
| Café (`questions-cafe.md`) | 4 | 2.6 s | 8.6 s | 20.4 s | 28.9 s | 3 of 24 |
| Tattoo studio, the close's fast path (`questions-tattoo-close.md`) | 2 | 2.5 s | 6.3 s | 12.0 s | 18.3 s | 3 of 12 |

Select is slower than before (13 s for 24 at 4 per seat, ~5 s at 2) because the scorer now writes the questions.
Haiku for the scorer was slower still (29.2 s on the tattoo close), so it stays on sonnet.

**Yoga**
- Wren (journey): "Who is the person you picture opening this booking page, and what is getting in their way today?"
- Wren (finding): "What should someone feel when the class they wanted is already full?"
- Mika (wires): "How should booking a class feel for someone squeezing it into a busy day?"

**Café**
- Wren (journey): "Who is the person you most want this page to make a morning easier for?"
- Wren (journey): "What should someone feel when the pastry they were looking forward to is gone?"
- Mika (wires): "What should ordering breakfast feel like for someone who is half-awake and in a hurry?"

**Tattoo studio (2 per seat)**
- Product's teammate (journey): "What worries someone most at the moment they're asked to put money down for a tattoo?"
- Product's teammate (journey): "What does someone need to feel they've been heard about their tattoo idea before they pick a time?"
- Mika (wires): "How should it feel for someone booking a permanent piece of art for the first time?"

Never asked in any run (decided by the team): accounts, device recognition, waitlist mechanics, fields, what to
measure, colour, density, data stored. Her private profile was empty in these runs (lib/profile.js not merged yet).
