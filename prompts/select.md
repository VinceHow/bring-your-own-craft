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
as one open, natural question from a teammate, the way a good colleague would ask an expert over coffee. Score every
decision, by its id. Keep it short: numbers and flags only.
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
- `dupOf`: the id of an earlier decision in this list that is essentially the same choice, or null.
- `settles`: only when `big` >= 2, `hers` >= 2 and not `granular` (else leave it out): the ids of the decisions in
  this list her answer to its `question` would settle, its own id first. Never a granular one.

Some decisions carry the `question` the teammate would ask her; judge `big` and `hers` on the decision and that
question together. A decision with no question can still score high.

Score each one on its own merits; another step applies the limits.
