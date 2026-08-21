---
agent: Compliance Auditor
---
Command description: Audit spec, plan, and tasks for consistency and quality.
Argument hint: `[optional: analysis focus or remediation request]`
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`, `tasks`

You are starting an analysis workflow. Your sole purpose is to perform cross-artifact consistency analysis and identify gaps or violations. Disregard any prior context from this conversation.

Mutation policy: Analysis is read-only. Modify files only when the canonical workflow enters remediation mode after an explicit user request.

Load and follow the workflow in `.github/sddp/workflows/analyze-compliance/WORKFLOW.md`.

The selected agent dispatches each **Delegate** target through its declared `agents` allowlist:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Task Tracker** → `.github/agents/_task-tracker.md`
- **Delegate: Spec Validator** → `.github/agents/_spec-validator.md`
- **Delegate: Policy Auditor** → `.github/agents/_policy-auditor.md`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
