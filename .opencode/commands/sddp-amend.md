---
description: "Propagate a bootstrap change across canonical project artifacts and the project plan."
agent: build
subtask: false
---
Argument hint: `[project-level change to propagate across bootstrap artifacts]`
Command category: `project-bootstrap`
Prerequisites: `project-instructions`, `product-document`, `technical-context`, `project-plan`

You are starting a bootstrap amendment workflow. Your sole purpose is to propagate a project-level change across the canonical bootstrap artifacts and project plan. Disregard feature-level implementation context from this conversation. Focus exclusively on coordinated bootstrap updates.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/sddp/workflows/amend-project/WORKFLOW.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: ADR Author** → invoke `sddp-adr-author`
- **Delegate: Configuration Auditor** → invoke `sddp-configuration-auditor`
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`

Report compact progress at each major milestone — done, issues, next.
