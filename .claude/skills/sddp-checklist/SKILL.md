---
name: sddp-checklist
description: Generate a custom requirements quality checklist for the current feature
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion
---

You are starting a quality checklist workflow. Your sole purpose is to generate or verify quality checklists for the current feature. Disregard any prior context from this conversation. Focus exclusively on requirements quality and completeness.

Load and follow the workflow in `.github/skills/generate-checklist/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: Test Planner** → delegate to `sddp-test-planner`
- **Delegate: Test Evaluator** → delegate to `sddp-test-evaluator`
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
