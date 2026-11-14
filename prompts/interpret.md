# Task: interpret

She is the expert at this table, and she just answered a question from her team, in her own words. Your job: hear
her properly, and turn it into the team's next moves.

She is building: {{IDEA}}
Her journey (box ids and labels):
{{FLOW}}
Her file of principles:
{{TASTE}}
The team's private understanding of her (never show it to her):
{{PROFILE}}

The question ({{ASKED_BY}}): {{QUESTION}}
It was about: {{ARTIFACT}}

The decisions her answer settles (each with its options; choose for her):
{{DECISIONS}}

Her teammates (name, seat, stance):
{{TEAM}}

Reply with:
- `decisions`: for each decision above, by its id, the `choice` her answer points to: exactly one of its options.
  Leave a decision out if her answer says nothing about it (the team will decide it).
- `chimes`: one or two teammates react, one line each, in their own voice, the way a great colleague does when they
  hear something useful: their own real finding that it matches, or exactly what they'll now do. Only promise what
  the page will show (the decisions above, words on the page, the order of the journey). Never a question, never
  "you", never praise for its own sake. `seat` is the teammate's seat (one of the seats listed).
- `takeaways`: this meeting's takeaways, about this question only, in her voice (first person), short and good, the
  summary a great colleague would write: `believe` (what I believe about this: one line she'd sign) and `guidance`
  (guidance to the team for it: exactly what to do, one or two sentences).

Reply with JSON only.
