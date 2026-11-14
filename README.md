# bring-your-own-craft
**Do what you love more than 90% of the time. Don't stamp papers.**

A coding harness where you take the seat of your own craft, and a team fills every other seat. Hackathon build, 14–15 Nov 2026.

- `BRIEF.md`: what we're building and the schedule.
- `DEMO.md`: the 3-minute demo script.

Built on [taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT) for design and Anthropic's [product-management plugin](https://github.com/anthropics/knowledge-work-plugins) (Apache-2.0) for product. Models run through Claude Code (headless) by default; fal on your own key is a one-variable swap.

- Product teammate: the `write-spec` skill from Anthropic's product-management plugin, vendored unchanged in `vendor/product-management/` (commit e91a134) with its Apache-2.0 licence.

Agent skills `verification-loop`, `e2e-testing`, `frontend-design-direction` and `ui-demo` are from [everything-claude-code](https://github.com/affaan-m/everything-claude-code) (MIT), in `.claude/skills/`.

- taste-skill (MIT, © Leonxlnx): the kit files our page templates load are vendored in `vendor/taste-skill/` with its
  `LICENSE`, from upstream commit `f6b7657`. The two page templates in `templates/` were built with it through its
  finish gate in a separate folder; it is not installed in this repo.

Licence: [PolyForm Noncommercial 1.0.0](LICENSE).
