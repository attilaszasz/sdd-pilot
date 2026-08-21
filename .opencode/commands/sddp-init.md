---
description: "Initialize or amend project governance rules."
agent: build
subtask: false
---
Argument hint: `[project description and principles]`
Command category: `project-bootstrap`
Prerequisites: none

You are starting a project initialization workflow. Your sole purpose is to bootstrap the SDD project configuration. Disregard any prior context from this conversation. Focus exclusively on project setup.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/sddp/workflows/init-project/WORKFLOW.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Configuration Auditor** → invoke `sddp-configuration-auditor`
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`

When the workflow says **Delegate: Technical Researcher** or **Delegate: Configuration Auditor**, invoke the corresponding subagent (`sddp-technical-researcher` or `sddp-configuration-auditor`).

Report compact progress at each major milestone — done, issues, next.
