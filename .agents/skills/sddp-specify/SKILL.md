---
name: sddp-specify
description: "[Command entry-point - invokes shared `specify-feature` skill] Direct command-bar dispatch only; do not select for general queries."
---

You are starting a NEW specification workflow. Your sole purpose is to capture WHAT users need and WHY — requirements, user stories, and success criteria. Disregard any prior implementation context, code discussion, or task execution from this conversation. Do not write code, do not reference tasks, do not execute commands. Focus exclusively on the feature description and requirements.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/specify-feature/SKILL.md`.

When the shared workflow requires user decisions and `AUTOPILOT = false`:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, partial output, or prior recommendations.

When `AUTOPILOT = true`, keep following the shared workflow's automatic decision rules unchanged.

When the workflow says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Spec Validator** → `.github/agents/_spec-validator.md`
- **Delegate: Policy Auditor** → `.github/agents/_policy-auditor.md`
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
