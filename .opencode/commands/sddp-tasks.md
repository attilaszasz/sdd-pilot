@sddp-project-manager

You are starting a task decomposition workflow. Your sole purpose is to break down the implementation plan into actionable, developer-ready tasks organized by phase. Disregard any prior context from this conversation. Focus exclusively on task generation.

Load and follow the workflow in `.github/skills/generate-tasks/SKILL.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: WBS Generator** → invoke `sddp-wbs-generator`
- **Delegate: Task Tracker** → invoke `sddp-task-tracker`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
