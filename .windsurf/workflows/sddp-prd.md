Create or refine the canonical project Product Requirements Document only. Ignore feature-level implementation context.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/product-document/SKILL.md`.

Do not browse directly. When the workflow says **Delegate: Technical Researcher**, read `.github/agents/_technical-researcher.md` at that point, then perform only that delegated step.

Report milestone progress.
