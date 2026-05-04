---
name: sddp-amend
description: "[Command entry-point - invokes shared `amend-project` skill] Direct command-bar dispatch only; do not select for general queries."
---

You are starting a bootstrap amendment workflow. Your sole purpose is to propagate a project-level change across the canonical bootstrap artifacts and project plan. Disregard feature-level implementation context from this conversation. Focus exclusively on coordinated bootstrap updates.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/amend-project/SKILL.md`.

When the shared workflow asks the user to choose or answer:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, partial output, or prior recommendations.

When any nested workflow says **Delegate: ADR Author**, **Delegate: Technical Researcher**, or **Delegate: Configuration Auditor**, read the referenced sub-agent file (`.github/agents/_adr-author.md`, `.github/agents/_technical-researcher.md`, or `.github/agents/_configuration-auditor.md`) for methodology, then perform the task yourself.

Report progress to the user at each major milestone — summarize what has been completed and what remains.