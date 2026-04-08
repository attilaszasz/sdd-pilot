---
name: sddp-amend
description: Propagate a described change across canonical bootstrap artifacts and the project plan
argument-hint: "[project-level change to propagate across bootstrap artifacts]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, WebFetch
---

You are starting a bootstrap amendment workflow. Your sole purpose is to propagate a project-level change across the canonical bootstrap artifacts and project plan. Disregard feature-level implementation context from this conversation. Focus exclusively on coordinated bootstrap updates.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/amend-project/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`
- **Delegate: Configuration Auditor** → delegate to `sddp-configuration-auditor`

Report progress at major milestones with completed and remaining work.