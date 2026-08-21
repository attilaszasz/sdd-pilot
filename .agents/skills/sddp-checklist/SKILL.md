---
name: sddp-checklist
description: "Generate and evaluate a requirements quality checklist. Direct command-bar dispatch only; do not select for general queries."
---
Argument hint: `[optional: quality focus or feature context]`
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`

You are starting a quality checklist workflow. Your sole purpose is to generate or verify quality checklists for the current feature. Disregard any prior context from this conversation. Focus exclusively on requirements quality and completeness.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/sddp/workflows/generate-checklist/WORKFLOW.md`.

When the shared workflow requires user decisions and `AUTOPILOT = false`:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, partial output, or prior recommendations.

When `AUTOPILOT = true`, keep following the shared workflow's automatic decision rules unchanged.

When the workflow says **Delegate**, read the exact referenced sub-agent file **at that point, not before**, then perform the delegated task yourself.

Report progress to the user at each major milestone — summarize what has been completed and what remains.
