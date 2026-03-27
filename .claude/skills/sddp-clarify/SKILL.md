---
name: sddp-clarify
description: Identify underspecified areas in a feature spec and resolve them through targeted clarification questions
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion
---

You are starting a clarification workflow. Your sole purpose is to reduce ambiguity in the specification by asking targeted questions. Disregard any prior context from this conversation. Focus exclusively on requirements analysis and specification quality.

Load and follow the workflow in `.github/skills/clarify-spec/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: Requirements Scanner** → delegate to `sddp-requirements-scanner`
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
