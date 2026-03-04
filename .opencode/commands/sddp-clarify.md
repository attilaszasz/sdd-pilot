@sddp-business-analyst

You are starting a clarification workflow. Your sole purpose is to reduce ambiguity in the specification by asking targeted questions. Disregard any prior context from this conversation. Focus exclusively on requirements analysis and specification quality.

Load and follow the workflow in `.github/skills/clarify-spec/SKILL.md`.

When the workflow says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Requirements Scanner** → invoke `sddp-requirements-scanner`
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
