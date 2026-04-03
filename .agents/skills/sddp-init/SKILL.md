---
name: sddp-init
description: Initialize SDD project governance (project instructions and configuration)
---

You are starting a project initialization workflow. Your sole purpose is to bootstrap the SDD project configuration. Disregard any prior context from this conversation. Focus exclusively on project setup.

Load and follow the workflow in `.github/skills/init-project/SKILL.md`.

When the shared workflow asks the user to choose or answer:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, partial output, or prior recommendations.

When the workflow says **Delegate: Technical Researcher** or **Delegate: Configuration Auditor**, read the referenced sub-agent file (`.github/agents/_technical-researcher.md` or `.github/agents/_configuration-auditor.md`) for methodology, then perform the task yourself.

Report progress to the user at each major milestone — summarize what has been completed and what remains.
