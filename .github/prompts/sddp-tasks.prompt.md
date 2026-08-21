---
agent: Project Manager
---
Command description: Generate an actionable task list from the current plan.
Argument hint: `[optional: feature directory or task focus]`
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`

You are starting a task decomposition workflow. Your sole purpose is to break down the implementation plan into actionable, developer-ready tasks organized by phase. Disregard any prior context from this conversation. Focus exclusively on task generation.

Load and follow the workflow in `.github/sddp/workflows/generate-tasks/WORKFLOW.md`.

The selected agent dispatches each **Delegate** target through its declared `agents` allowlist:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Plan Validator** → `.github/agents/_plan-validator.md` *(only during Plan → Tasks gate, Step 1.5)*
- **Delegate: WBS Generator** → `.github/agents/_wbs-generator.md`
- **Delegate: Task Tracker** → `.github/agents/_task-tracker.md`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
