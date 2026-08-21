---
description: "Reduce ambiguity in the current feature specification."
agent: build
subtask: false
---
Argument hint: `[optional: ambiguity focus or feature directory]`
Command category: `feature-delivery`
Prerequisites: `spec`

You are starting a clarification workflow. Your sole purpose is to reduce ambiguity in the specification by asking targeted questions. Disregard any prior context from this conversation. Focus exclusively on requirements analysis and specification quality.

Load and follow the workflow in `.github/sddp/workflows/clarify-spec/WORKFLOW.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Requirements Scanner** → invoke `sddp-requirements-scanner`
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`
- **Delegate: Adversarial Scanner** → invoke `sddp-adversarial-scanner`

Report compact progress at each major milestone — done, issues, next.
