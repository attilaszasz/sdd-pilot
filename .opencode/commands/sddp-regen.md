---
description: "Archive a completed prototype and regenerate all canonical bootstrap artifacts from scratch."
agent: build
subtask: false
---
Argument hint: `[optional feedback, learnings, or guidelines for regeneration]`
Command category: `project-bootstrap`
Prerequisites: `project-instructions`, `product-document`, `technical-context`, `project-plan:complete`

You are starting a prototype retrospective workflow. Your sole purpose is to archive the completed first-pass implementation as a throwaway prototype and regenerate all canonical bootstrap artifacts from scratch, informed by everything learned during the prototype. Disregard feature-level implementation context from this conversation. Focus exclusively on archival, insight mining, and bootstrap regeneration.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/sddp/workflows/prototype-regen/WORKFLOW.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: ADR Author** → invoke `sddp-adr-author`
- **Delegate: Configuration Auditor** → invoke `sddp-configuration-auditor`
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`

Report compact progress at each major milestone — done, issues, next.
