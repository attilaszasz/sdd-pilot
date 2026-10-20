---
name: sddp-autopilot
description: "Run the full SDD feature-delivery pipeline. Direct command-bar dispatch only; do not select for general queries."
argument-hint: "[optional: feature description; omit to select the first unchecked epic]"
disable-model-invocation: true
---
Command category: `orchestration`
Prerequisites: `autopilot:enabled`, `product-document:planning-ready`, `technical-context:planning-ready`

Read and follow `.github/sddp/copilot-cli.md` before executing this command.
Command instructions: `.github/prompts/sddp-autopilot.prompt.md`.
Canonical workflow: `.github/sddp/workflows/autopilot-pipeline/WORKFLOW.md`.
