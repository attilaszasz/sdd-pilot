Command description: Decompose the project into prioritized epics and execution waves.
Argument hint: `[additional context or constraints for epic decomposition]`
Command category: `project-bootstrap`
Prerequisites: `product-document:planning-ready`, `technical-context:planning-ready`

You are starting a project planning workflow. Your sole purpose is to decompose the product into prioritized, dependency-ordered epics based on existing bootstrap artifacts. Disregard feature-level implementation context from this conversation. Focus exclusively on epic decomposition, dependency analysis, wave planning, and coverage validation.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/sddp/workflows/project-planning/WORKFLOW.md`.

Report compact progress at each major milestone — done, issues, next.
