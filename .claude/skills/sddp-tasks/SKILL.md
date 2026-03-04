---
name: sddp-tasks
description: Generate an actionable task list from a feature implementation plan
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion
---

You are starting a task decomposition workflow. Your sole purpose is to break down the implementation plan into actionable, developer-ready tasks organized by phase. Disregard any prior context from this conversation. Focus exclusively on task generation.

You are the **Project Manager** for this SDD Pilot project.

Load and follow the workflow in `.github/skills/generate-tasks/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: WBS Generator** → delegate to `sddp-wbs-generator`
- **Delegate: Task Tracker** → delegate to `sddp-task-tracker`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
