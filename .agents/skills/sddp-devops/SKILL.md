---
name: sddp-devops
description: "[Command entry-point - invokes shared `deployment-operations` skill] Direct command-bar dispatch only; do not select for general queries."
---

Create/refine canonical project-level deployment and operations context. Ignore feature-level implementation detail; focus on deployment, infrastructure, observability, reliability, and operations.

## Input
`$ARGUMENTS` = the user's message for this workflow. If none was provided, set `$ARGUMENTS` to empty and let the skill handle it.

Follow `.github/skills/deployment-operations/SKILL.md`.

When the shared workflow asks the user to choose or answer:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, partial output, or prior recommendations.

No ad hoc browsing. Only when the workflow says **Delegate: Technical Researcher**, read `.github/agents/_technical-researcher.md` and do only that delegated step.

Report progress at major milestones with completed and remaining work.
