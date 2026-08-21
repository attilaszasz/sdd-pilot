---
description: "Create or refine the canonical software architecture document."
agent: build
subtask: false
---
Argument hint: `[project description, docs, constraints, or architecture inputs]`
Command category: `project-bootstrap`
Prerequisites: none

Start the project system-design workflow. Create or refine the canonical project-level technical context and ignore feature-level implementation detail.

`$ARGUMENTS` = the user's message for this command. If none was provided, set `$ARGUMENTS` to empty.

Follow `.github/sddp/workflows/system-design/WORKFLOW.md`.

Do not do ad hoc external browsing. Delegate external research only when the workflow says **Delegate: Technical Researcher**:
- Technical Researcher → invoke `sddp-technical-researcher`
- ADR Author → invoke `sddp-adr-author`

Report compact progress at major milestones — done, issues, next.
