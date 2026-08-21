---
name: sddp-analyze
description: "Audit spec, plan, and tasks for consistency and quality. Direct command-bar dispatch only; do not select for general queries."
---
Argument hint: `[optional: analysis focus or remediation request]`
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`, `tasks`

You are starting an analysis workflow. Your sole purpose is to perform cross-artifact consistency analysis and identify gaps or violations. Disregard any prior context from this conversation.

Mutation policy: Analysis is read-only. Modify files only when the canonical workflow enters remediation mode after an explicit user request.

Load and follow the workflow in `.github/sddp/workflows/analyze-compliance/WORKFLOW.md`.

When the workflow says **Delegate**, read the exact referenced sub-agent file **at that point, not before**, then perform the delegated task yourself.

Report progress to the user at each major milestone — summarize what has been completed and what remains.
