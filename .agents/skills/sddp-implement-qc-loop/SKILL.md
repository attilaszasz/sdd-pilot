---
name: sddp-implement-qc-loop
description: "Run implement and QC in a continuous loop. Direct command-bar dispatch only; do not select for general queries."
---
Argument hint: `[optional: feature directory or branch name]`
Command category: `orchestration`
Prerequisites: `spec`, `plan`, `tasks`

You are starting an Implement + QC loop workflow. Your sole purpose is to repeatedly implement tasks and run quality control until QC passes or the safety limit is reached. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on the implement → QC cycle.

Load and follow the workflow in `.github/sddp/workflows/implement-qc-loop/WORKFLOW.md`.

When either shared sub-skill requires user decisions and `AUTOPILOT = false`:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, partial output, or prior recommendations.

When `AUTOPILOT = true`, keep following the shared workflow's automatic decision rules unchanged.

The loop skill will instruct you to load and execute two sub-skills inline:
- **Implement** → `.github/sddp/workflows/implement-tasks/WORKFLOW.md`
- **QC** → `.github/sddp/workflows/quality-control/WORKFLOW.md`

When either sub-skill says **Delegate**, read the exact referenced sub-agent file **at that point, not before**, then perform the delegated task yourself.

Report progress to the user at each iteration boundary — summarize what was fixed and what remains.
