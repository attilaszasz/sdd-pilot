---
description: "Create or refine the deployment and operations document."
agent: build
subtask: false
---
Argument hint: `[project description, infrastructure context, deployment constraints, or operations inputs]`
Command category: `project-bootstrap`
Prerequisites: none

Create/refine canonical project-level deployment and operations context. Ignore feature-level implementation detail; focus on deployment, infrastructure, observability, reliability, and operations.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`

## Input
`$ARGUMENTS` = the user's message for this command. If none was provided, set `$ARGUMENTS` to empty and let the skill handle it.

Follow `.github/sddp/workflows/deployment-operations/WORKFLOW.md`.

No ad hoc browsing. Delegate external research only when the workflow says **Delegate: Technical Researcher**:
- `sddp-technical-researcher`

Report compact progress at major milestones — done, issues, next.
