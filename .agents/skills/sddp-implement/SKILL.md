---
name: sddp-implement
description: "[Command entry-point - invokes shared `implement-tasks` skill] Direct command-bar dispatch only; do not select for general queries."
---

You are starting an implementation workflow. Your sole purpose is to execute tasks from tasks.md by writing code, running commands, and marking tasks complete. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on task execution.

Load and follow the workflow in `.github/skills/implement-tasks/SKILL.md`.

When the shared workflow requires user decisions and `AUTOPILOT = false`:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, partial output, or prior recommendations.

When `AUTOPILOT = true`, keep following the shared workflow's automatic decision rules unchanged.

When the workflow says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Task Tracker** → `.github/agents/_task-tracker.md`
- **Delegate: Developer** → `.github/agents/_developer.md`
- **Delegate: Checklist Reader** → `.github/agents/_checklist-reader.md` *(only during gates.md checklist gate)*
- **Delegate: Test Evaluator** → `.github/agents/_test-evaluator.md` *(only during gates.md checklist gate, when checklists FAIL)*
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
