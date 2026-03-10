---
name: sddp-analyze
description: Perform non-destructive cross-artifact consistency and quality analysis across spec, plan, and tasks
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion
---

You are starting an analysis workflow. Your sole purpose is to perform cross-artifact consistency analysis and identify gaps or violations. Disregard any prior context from this conversation. Focus exclusively on analysis and reporting — do not modify any files.

Load and follow the workflow in `.github/skills/analyze-compliance/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: Task Tracker** → delegate to `sddp-task-tracker`
- **Delegate: Spec Validator** → delegate to `sddp-spec-validator`
- **Delegate: Policy Auditor** → delegate to `sddp-policy-auditor`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
