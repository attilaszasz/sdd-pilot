---
name: sddp-analyze
description: "Audit spec, plan, and tasks for consistency and quality. Direct command-bar dispatch only; do not select for general queries."
argument-hint: "[optional: analysis focus or remediation request]"
disable-model-invocation: true
---
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`, `tasks`

Mutation policy: Analysis is read-only. Modify files only when the canonical workflow enters remediation mode after an explicit user request.

Read and follow `.github/sddp/copilot-cli.md` before executing this command.
Command instructions: `.github/prompts/sddp-analyze.prompt.md`.
Canonical workflow: `.github/sddp/workflows/analyze-compliance/WORKFLOW.md`.
