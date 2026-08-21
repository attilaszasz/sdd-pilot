---
name: sddp-clarify
description: "Reduce ambiguity in the current feature specification."
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion
argument-hint: "[optional: ambiguity focus or feature directory]"
---
Command category: `feature-delivery`
Prerequisites: `spec`

You are starting a clarification workflow. Your sole purpose is to reduce ambiguity in the specification by asking targeted questions. Disregard any prior context from this conversation. Focus exclusively on requirements analysis and specification quality.

Load and follow the workflow in `.github/sddp/workflows/clarify-spec/WORKFLOW.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: Requirements Scanner** → delegate to `sddp-requirements-scanner`
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`
- **Delegate: Adversarial Scanner** → delegate to `sddp-adversarial-scanner`

Report compact progress at each major milestone — done, issues, next.
