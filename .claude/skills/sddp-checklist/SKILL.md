---
name: sddp-checklist
description: "Generate and evaluate a requirements quality checklist."
argument-hint: "[optional: quality focus or feature context]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion
---
Command category: `feature-delivery`
Prerequisites: `spec`, `plan`

You are starting a quality checklist workflow. Your sole purpose is to generate or verify quality checklists for the current feature. Disregard any prior context from this conversation. Focus exclusively on requirements quality and completeness.

Load and follow the workflow in `.github/sddp/workflows/generate-checklist/WORKFLOW.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: Test Planner** → delegate to `sddp-test-planner`
- **Delegate: Test Evaluator** → delegate to `sddp-test-evaluator`
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`

Report compact progress at each major milestone — done, issues, next.
