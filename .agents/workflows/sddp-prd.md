---
description: Create or refine the canonical project-level Product Requirements Document (`specs/prd.md`)
---

You are starting a project product-discovery workflow. Your sole purpose is to turn a rough product idea into the canonical project-level Product Requirements Document. Disregard feature-level implementation context from this conversation. Focus exclusively on product discovery, scope boundaries, validation, and stakeholder-facing clarity.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/product-document/SKILL.md`.

Do not perform ad hoc external browsing. When the workflow says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
