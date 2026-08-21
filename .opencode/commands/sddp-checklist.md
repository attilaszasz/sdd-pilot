---
description: "Generate and evaluate a requirements quality checklist."
agent: build
subtask: false
---
Argument hint: `[optional: quality focus or feature context]`
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`

You are starting a quality checklist workflow. Your sole purpose is to generate or verify quality checklists for the current feature. Disregard any prior context from this conversation. Focus exclusively on requirements quality and completeness.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/sddp/workflows/generate-checklist/WORKFLOW.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Test Planner** → invoke `sddp-test-planner`
- **Delegate: Test Evaluator** → invoke `sddp-test-evaluator`
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`

Report compact progress at each major milestone — done, issues, next.
