---
agent: Product Strategist
---
Create or refine the canonical project Product Requirements Document only. Ignore feature-level implementation context.

`$ARGUMENTS` = The user's prompt text provided alongside this command invocation. If no prompt text was provided, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/product-document/SKILL.md`.

Do not browse ad hoc. Only when the workflow says **Delegate: Technical Researcher**, read `.github/agents/_technical-researcher.md` at that point and perform only that delegated step.

Report milestone progress.
