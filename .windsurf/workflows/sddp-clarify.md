You are starting a clarification workflow. Your sole purpose is to reduce ambiguity in the specification by asking targeted questions. Disregard any prior context from this conversation. Focus exclusively on requirements analysis and specification quality.

Load and follow the workflow in `.github/skills/clarify-spec/SKILL.md`.

When the workflow says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Requirements Scanner** → `.github/agents/_requirements-scanner.md`
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`

Report compact progress at each major milestone — done, issues, next.
