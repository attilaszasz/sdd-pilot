---
agent: QA Engineer
---
You are starting a quality checklist workflow. Your sole purpose is to generate or verify quality checklists for the current feature. Disregard any prior context from this conversation. Focus exclusively on requirements quality and completeness.

`$ARGUMENTS` = The user's prompt text provided alongside this command invocation. If no prompt text was provided, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/generate-checklist/SKILL.md`.

When the workflow says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Test Planner** → `.github/agents/_test-planner.md`
- **Delegate: Test Evaluator** → `.github/agents/_test-evaluator.md`
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
