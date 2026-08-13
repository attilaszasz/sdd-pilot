---
name: sddp-implement
description: Execute the implementation plan by processing and completing all tasks defined in tasks.md
argument-hint: "[optional: phase or task to start from]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, AskUserQuestion
---

You are starting an implementation workflow. Your sole purpose is to execute tasks from tasks.md by writing code, running commands, and marking tasks complete. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on task execution.

Load and follow the workflow in `.github/skills/implement-tasks/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: Task Tracker** → delegate to `sddp-task-tracker`
- **Delegate: Developer** → delegate to `sddp-developer`
- **Delegate: Tasks Validator** → delegate to `sddp-tasks-validator` *(only during Tasks → Implement gate in gates.md)*
- **Delegate: Spec Validator** → delegate to `sddp-spec-validator` *(only during gate revalidation)*
- **Delegate: Plan Validator** → delegate to `sddp-plan-validator` *(only during gate revalidation)*
- **Delegate: Policy Auditor** → delegate to `sddp-policy-auditor`
- **Delegate: Checklist Reader** → delegate to `sddp-checklist-reader` *(only during gates.md checklist gate)*
- **Delegate: Test Evaluator** → delegate to `sddp-test-evaluator` *(only during gates.md checklist gate, when checklists FAIL)*
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`
- **Delegate: ADR Author** → delegate to `sddp-adr-author` *(only for project-wide architecture divergence)*
- **Delegate: QC Auditor** → delegate to `sddp-qc-auditor` *(only during work-item Micro-QC)*

Report compact progress at each major milestone — done, issues, next.
