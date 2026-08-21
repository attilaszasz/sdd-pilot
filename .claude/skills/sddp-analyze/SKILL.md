---
name: sddp-analyze
description: "Audit spec, plan, and tasks for consistency and quality."
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion
argument-hint: "[optional: analysis focus or remediation request]"
---
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`, `tasks`

You are starting an analysis workflow. Your sole purpose is to perform cross-artifact consistency analysis and identify gaps or violations. Disregard any prior context from this conversation.

Mutation policy: Analysis is read-only. Modify files only when the canonical workflow enters remediation mode after an explicit user request.

Load and follow the workflow in `.github/sddp/workflows/analyze-compliance/WORKFLOW.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: Task Tracker** → delegate to `sddp-task-tracker`
- **Delegate: Spec Validator** → delegate to `sddp-spec-validator`
- **Delegate: Policy Auditor** → delegate to `sddp-policy-auditor`

Report compact progress at each major milestone — done, issues, next.
