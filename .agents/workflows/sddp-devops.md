---
description: "Create or refine the deployment and operations document."
---
Argument hint: `[project description, infrastructure context, deployment constraints, or operations inputs]`
Command category: `project-bootstrap`
Prerequisites: none

Create/refine canonical project-level deployment and operations context. Ignore feature-level implementation detail; focus on deployment, infrastructure, observability, reliability, and operations.

## Input
`$ARGUMENTS` = the user's message for this workflow. If none was provided, set `$ARGUMENTS` to empty and let the skill handle it.

Follow `.github/sddp/workflows/deployment-operations/WORKFLOW.md`.

No ad hoc browsing. Only when the workflow says **Delegate: Technical Researcher**, read `.github/agents/_technical-researcher.md` and do only that delegated step.

Report compact progress at major milestones — done, issues, next.
