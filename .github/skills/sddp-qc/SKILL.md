---
name: sddp-qc
description: "Run quality control against the implemented feature. Direct command-bar dispatch only; do not select for general queries."
argument-hint: "[optional: testing focus such as unit tests, security audit, requirements sync]"
disable-model-invocation: true
---
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`, `tasks`, `implementation:complete`

Read and follow `.github/sddp/copilot-cli.md` before executing this command.
Command instructions: `.github/prompts/sddp-qc.prompt.md`.
Canonical workflow: `.github/sddp/workflows/quality-control/WORKFLOW.md`.
