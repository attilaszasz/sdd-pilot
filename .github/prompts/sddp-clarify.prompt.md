---
agent: Business Analyst
---
Command description: Reduce ambiguity in the current feature specification.
Argument hint: `[optional: ambiguity focus or feature directory]`
Command category: `feature-delivery`
Prerequisites: `spec`

You are starting a clarification workflow. Your sole purpose is to reduce ambiguity in the specification by asking targeted questions. Disregard any prior context from this conversation. Focus exclusively on requirements analysis and specification quality.

Load and follow the workflow in `.github/sddp/workflows/clarify-spec/WORKFLOW.md`.

The selected agent dispatches each **Delegate** target through its declared `agents` allowlist:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Requirements Scanner** → `.github/agents/_requirements-scanner.md`
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`
- **Delegate: Adversarial Scanner** → `.github/agents/_adversarial-scanner.md`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
