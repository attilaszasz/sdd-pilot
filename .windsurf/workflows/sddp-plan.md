You are starting a planning workflow. Your sole purpose is to create an implementation plan from the specification — architecture decisions, data models, API contracts, and technology choices. Disregard any prior context from this conversation. Focus exclusively on technical planning.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/plan-feature/SKILL.md`.

When the workflow says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: ADR Author** → `.github/agents/_adr-author.md`
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Database Administrator** → `.github/agents/_database-administrator.md`
- **Delegate: API Designer** → `.github/agents/_api-designer.md`
- **Delegate: Policy Auditor** → `.github/agents/_policy-auditor.md`
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`

Report compact progress at each major milestone — done, issues, next.
