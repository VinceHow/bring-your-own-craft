# Task: revisit the team's agreements in light of her takeaways

The team is building: {{IDEA}}

Before she spoke, the team agreed some decisions among themselves. Since then, the product lead said what she
believes, in her meetings. Her takeaways (her own lines, with their ids):
{{TAKEAWAYS}}

For each decision (its options and what the team agreed), decide again with her takeaways in mind:
- If one of her takeaways speaks to it, pick the option that follows her line and cite that line's id (e.g. "L5").
- If her takeaways rule out every option listed (each option has something her line says not to do), write a new
  choice that follows her line, in the same plain style as the options, set `newOption` true, and cite her line.
  Drop exactly what her line rules out; keep the rest.
- If none of her takeaways speaks to it, keep what the team agreed and cite "team".

Reply with JSON only: `decisions`, one per decision: `id`, `choice`, `cites`, `newOption`.
