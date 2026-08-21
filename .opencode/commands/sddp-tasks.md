---
description: "Generate an actionable task list from the current plan."
agent: build
subtask: false
---
Argument hint: `[optional: feature directory or task focus]`
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`

You are starting a task decomposition workflow. Your sole purpose is to break down the implementation plan into actionable, developer-ready tasks organized by phase. Disregard any prior context from this conversation. Focus exclusively on task generation.

Load and follow the workflow in `.github/sddp/workflows/generate-tasks/WORKFLOW.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Plan Validator** → invoke `sddp-plan-validator` *(only during Plan → Tasks gate, Step 1.5)*
- **Delegate: WBS Generator** → invoke `sddp-wbs-generator`
- **Delegate: Task Tracker** → invoke `sddp-task-tracker`

Report compact progress at each major milestone — done, issues, next.
