---
description: Generate an actionable task list from a feature implementation plan
---

You are starting a task decomposition workflow. Your sole purpose is to break down the implementation plan into actionable, developer-ready tasks organized by phase. Disregard any prior context from this conversation. Focus exclusively on task generation.

Load and follow the workflow in `.github/skills/generate-tasks/SKILL.md`.

When the workflow says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: WBS Generator** → `.github/agents/_wbs-generator.md`
- **Delegate: Task Tracker** → `.github/agents/_task-tracker.md`

Report compact progress at each major milestone — done, issues, next.
