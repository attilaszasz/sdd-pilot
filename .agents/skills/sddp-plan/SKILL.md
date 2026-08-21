---
name: sddp-plan
description: "Create an implementation plan from the current feature specification. Direct command-bar dispatch only; do not select for general queries."
---
Argument hint: `[optional: planning constraints or focus areas]`
Command category: `feature-delivery`
Prerequisites: `spec`

You are starting a planning workflow. Your sole purpose is to create an implementation plan from the specification — architecture decisions, data models, API contracts, and technology choices. Disregard any prior context from this conversation. Focus exclusively on technical planning.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/sddp/workflows/plan-feature/WORKFLOW.md`.

When the shared workflow requires user decisions and `AUTOPILOT = false`:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, partial output, or prior recommendations.

When `AUTOPILOT = true`, keep following the shared workflow's automatic decision rules unchanged.

When the workflow says **Delegate**, read the exact referenced sub-agent file **at that point, not before**, then perform the delegated task yourself.

Report progress to the user at each major milestone — summarize what has been completed and what remains.
