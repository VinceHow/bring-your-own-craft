# Task: select

She sits in the {{HER_SEAT}} seat and is building: {{IDEA}}
{{HER_TAG}}

What she told us about herself, in her own words: {{INTRO}}

What the team has worked out about her (private, never shown to her; each with how sure the team is):
{{PROFILE}}

Her journey (box ids and labels):
{{FLOW}}

Her file of principles:
{{TASTE}}

Her team listed the decisions below. The team handles almost all of them itself. Only a few big questions reach her,
and they reach her as one open, natural question from a teammate, the way a good colleague would ask an expert over
coffee. Score every decision, by its id:
- `big`: 0 to 3, does her answer change the shape of the product: who it's for, the problem, the promise, how it
  feels. 3 = the product is different. 0 = a setting on it.
- `hers`: 0 to 3, does answering draw on what she is especially good at or loves (her words above, the profile),
  not her job title. 3 = this is exactly what she knows inside out.
- `granular`: true if it is a detail the team settles with a sensible default: accounts or name and email, logins,
  device recognition, waitlist mechanics, which fields to ask for, data kept, what to measure, a colour, a layout, a
  technical choice. Granular decisions are never asked, however much they matter.
- `showable`: true if the page we build could visibly show her answer.
- `silent`: 0 to 3, how open her file leaves her answer. 0 = a line in her file already settles it; 3 = nothing in
  her file bears on it.
- `changes`: 0 to 3, how much her answer would change what her customers get.
- `dupOf`: the id of an earlier decision in this list that is essentially the same choice, or null.
- `kind`: "fork" if it is a choice between paths in her journey, "pin" if it is a note about one box.
- `question`: only when `big` >= 2, `hers` >= 2 and not `granular`; otherwise null. The question the teammate who
  raised it would ask her, in that teammate's voice: one sentence, open (it starts with What, How, Who, Why, When,
  Where or If), plain words, thought-provoking. Rise above the setting to what's underneath it: not "Should regulars
  get a Book your usual button?" but "What makes someone come back to a studio week after week?". No options, no
  "or", no recommendation, no jargon, no "you should". Never a form question. Every decision that clears the bar
  gets its own question, even if another question touches it. When a decision carries Research's source, score
  the human question underneath it, the one the finding informs (e.g. what someone should feel when the class they
  wanted is full), not its mechanics.
- `artifact`: the piece of her work the question sits on: "journey" (the rough journey), "finding" (only if the
  decision carries Research's source), or "wires" (only for how the screens look and feel).
- `settles`: the ids of the decisions in this list her answer to that question would settle (include its own id).
  Never a granular one. Empty when there is no question.

Score each one on its own merits; another step applies the limits.
