---
name: sddp-devops
description: Create or refine the canonical project-level deployment and operations context (`specs/dod.md`)
---

Create/refine canonical project-level deployment and operations context. Ignore feature-level implementation detail; focus on deployment, infrastructure, observability, reliability, and operations.

## Input
`$ARGUMENTS` = the user's message for this workflow. If none was provided, set `$ARGUMENTS` to empty and let the skill handle it.

Follow `.github/skills/deployment-operations/SKILL.md`.

No ad hoc browsing. Only when the workflow says **Delegate: Technical Researcher**, read `.github/agents/_technical-researcher.md` and do only that delegated step.

Report progress at major milestones with completed and remaining work.
