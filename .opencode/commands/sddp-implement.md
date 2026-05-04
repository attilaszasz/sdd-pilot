@sddp-software-engineer

You are starting an implementation workflow. Your sole purpose is to execute tasks from tasks.md by writing code, running commands, and marking tasks complete. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on task execution.

Load and follow the workflow in `.github/skills/implement-tasks/SKILL.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Task Tracker** → invoke `sddp-task-tracker`
- **Delegate: Developer** → invoke `sddp-developer`
- **Delegate: Checklist Reader** → invoke `sddp-checklist-reader` *(only during gates.md checklist gate)*
- **Delegate: Test Evaluator** → invoke `sddp-test-evaluator` *(only during gates.md checklist gate, when checklists FAIL)*
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`

Report compact progress at each major milestone — done, issues, next.
