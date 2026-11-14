# Task: select

She sits in the {{HER_SEAT}} seat and is building: {{IDEA}}

Her journey (box ids and labels):
{{FLOW}}

Her file of principles:
{{TASTE}}

Her team listed the decisions below. Only a few are worth her time; the rest will be decided for her. Score every
decision, by its id:
- `changes`: 0 to 3, how much her answer would change what her customers get. 3 = a different journey.
- `silent`: 0 to 3, how open her file leaves her answer. Ask: from her file alone, could you say what she would
  choose here, with no reasonable doubt? 0 = yes, a line settles this very choice. 1 = a line points one way but
  she might well disagree. 2 = a general line touches it without settling it. 3 = nothing in her file bears on it.
  A line whose own condition is met by the decision no longer settles it: if a line says to wait for evidence and
  the decision comes with a source, her answer is open again.
- `expertise`: 0 to 3, how much the answer needs her craft as a {{HER_SEAT}} lead, rather than a sensible default any
  teammate could pick. 3 = only someone who knows these customers and this journey can call it. 0 = a convention, a
  technical detail or a matter of taste the team can settle. Bring her only what changes what gets built and needs
  her expertise.
- `dupOf`: the id of an earlier decision in this list that is essentially the same choice, or null.
- `kind`: "fork" if it is a choice between paths in her flow, "pin" if it is a note about one box.

Score each one on its own merits; another step applies the limits.
