You are starting a task-to-issues conversion workflow. Your sole purpose is to convert tasks from tasks.md into GitHub issues. Disregard any prior context from this conversation. Focus exclusively on issue creation.

Load and follow the workflow in `.github/skills/tasks-to-issues/SKILL.md`.

When the workflow says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Task Tracker** → `.github/agents/_task-tracker.md`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
