---
name: sddp-implement
description: "Implement the current feature tasks. Direct command-bar dispatch only; do not select for general queries."
---
Argument hint: `[optional: phase or task to start from]`
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`, `tasks`, `checklists:complete-if-present`

You are starting an implementation workflow. Your sole purpose is to execute tasks from tasks.md by writing code, running commands, and marking tasks complete. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on task execution.

Load and follow the workflow in `.github/sddp/workflows/implement-tasks/WORKFLOW.md`.

When the shared workflow requires user decisions and `AUTOPILOT = false`:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, partial output, or prior recommendations.

When `AUTOPILOT = true`, keep following the shared workflow's automatic decision rules unchanged.

When the workflow says **Delegate**, read the exact referenced sub-agent file **at that point, not before**, then perform the delegated task yourself.

Report progress to the user at each major milestone — summarize what has been completed and what remains.
