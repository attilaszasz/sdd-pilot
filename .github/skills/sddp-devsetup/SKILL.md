---
name: sddp-devsetup
description: "Analyze the repo and recommend local development setup. Direct command-bar dispatch only; do not select for general queries."
argument-hint: "[optional specific environment constraints or preferences]"
disable-model-invocation: true
---
Command category: `environment`
Prerequisites: none

Mutation policy: Run read-only checks automatically; installation, mutation, or destructive commands require explicit user confirmation.

Read and follow `.github/sddp/copilot-cli.md` before executing this command.
Command instructions: `.github/prompts/sddp-devsetup.prompt.md`.
Canonical workflow: `.github/sddp/workflows/environment-setup/WORKFLOW.md`.
