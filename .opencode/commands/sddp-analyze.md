---
description: "Audit spec, plan, and tasks for consistency and quality."
agent: build
subtask: false
---
Argument hint: `[optional: analysis focus or remediation request]`
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`, `tasks`

You are starting an analysis workflow. Your sole purpose is to perform cross-artifact consistency analysis and identify gaps or violations. Disregard any prior context from this conversation.

Mutation policy: Analysis is read-only. Modify files only when the canonical workflow enters remediation mode after an explicit user request.

Load and follow the workflow in `.github/sddp/workflows/analyze-compliance/WORKFLOW.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Task Tracker** → invoke `sddp-task-tracker`
- **Delegate: Spec Validator** → invoke `sddp-spec-validator`
- **Delegate: Policy Auditor** → invoke `sddp-policy-auditor`

Report compact progress at each major milestone — done, issues, next.
