# Task: select

She sits in the {{HER_SEAT}} seat and is building: {{IDEA}}

Her journey (box ids and labels):
{{FLOW}}

Her file of principles:
{{TASTE}}

Her team listed the decisions below. Only a few are worth her time; the rest will be decided for her. Score every
decision, by its id:
- `inSeat`: true if it is a call in her craft. For the product seat that is: the journey, who it serves first, what
  each step asks of the customer, what is in or out, what happens at the edges, the words. False if it belongs to
  another craft (visual style, layout, tracking, storage, infrastructure, tooling), even if it sounds important.
- `changes`: 0 to 3, how much her answer would change what her customers get. 3 = a different journey.
- `silent`: 0 to 3, how little her file already says about it. 3 = no line touches it; 0 = a line clearly decides it.
- `dupOf`: the id of an earlier decision in this list that is essentially the same choice, or null.
- `kind`: "fork" if it is a choice between paths in her flow, "pin" if it is a note about one box.

Score each one on its own merits; another step applies the limits.
