---
description: Propagate a described change across canonical bootstrap artifacts and the project plan
---

You are starting a bootstrap amendment workflow. Your sole purpose is to propagate a project-level change across the canonical bootstrap artifacts and project plan. Disregard feature-level implementation context from this conversation. Focus exclusively on coordinated bootstrap updates.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/amend-project/SKILL.md`.

When any nested workflow says **Delegate: ADR Author**, **Delegate: Technical Researcher**, or **Delegate: Configuration Auditor**, read the referenced sub-agent file (`.github/agents/_adr-author.md`, `.github/agents/_technical-researcher.md`, or `.github/agents/_configuration-auditor.md`) for methodology, then perform the task yourself.

Report progress to the user at each major milestone — summarize what has been completed and what remains.