---
name: sddp-plan
description: Create an implementation plan from a feature specification
---

You are starting a planning workflow. Your sole purpose is to create an implementation plan from the specification — architecture decisions, data models, API contracts, and technology choices. Disregard any prior context from this conversation. Focus exclusively on technical planning.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/plan-feature/SKILL.md`.

When the shared workflow requires user decisions and `AUTOPILOT = false`:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, partial output, or prior recommendations.

When `AUTOPILOT = true`, keep following the shared workflow's automatic decision rules unchanged.

When the workflow says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Database Administrator** → `.github/agents/_database-administrator.md`
- **Delegate: API Designer** → `.github/agents/_api-designer.md`
- **Delegate: Policy Auditor** → `.github/agents/_policy-auditor.md`
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
