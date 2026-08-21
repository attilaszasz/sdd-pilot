---
description: "Implement the current feature tasks."
agent: build
subtask: false
---
Argument hint: `[optional: phase or task to start from]`
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`, `tasks`, `checklists:complete-if-present`

You are starting an implementation workflow. Your sole purpose is to execute tasks from tasks.md by writing code, running commands, and marking tasks complete. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on task execution.

Load and follow the workflow in `.github/sddp/workflows/implement-tasks/WORKFLOW.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Spec Validator** → invoke `sddp-spec-validator`
- **Delegate: Plan Validator** → invoke `sddp-plan-validator`
- **Delegate: Task Tracker** → invoke `sddp-task-tracker`
- **Delegate: Developer** → invoke `sddp-developer`
- **Delegate: Tasks Validator** → invoke `sddp-tasks-validator` *(only during Tasks → Implement gate in gates.md)*
- **Delegate: Checklist Reader** → invoke `sddp-checklist-reader` *(only during gates.md checklist gate)*
- **Delegate: Test Evaluator** → invoke `sddp-test-evaluator` *(only during gates.md checklist gate, when checklists FAIL)*
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`
- **Delegate: ADR Author** → invoke `sddp-adr-author` *(only for project-wide architecture divergence)*
- **Delegate: QC Auditor** → invoke `sddp-qc-auditor` *(only during work-item Micro-QC)*
- **Delegate: Policy Auditor** → invoke `sddp-policy-auditor`

Report compact progress at each major milestone — done, issues, next.
