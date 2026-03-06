---
agent: Software Engineer
---
You are starting an Implement + QC loop workflow. Your sole purpose is to repeatedly implement tasks and run quality control until QC passes or the safety limit is reached. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on the implement → QC cycle.

Load and follow the workflow in `.github/skills/implement-qc-loop/SKILL.md`.

The loop skill will instruct you to load and execute two sub-skills inline:
- **Implement** → `.github/skills/implement-tasks/SKILL.md`
- **QC** → `.github/skills/quality-control/SKILL.md`

When either sub-skill says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Task Tracker** → `.github/agents/_task-tracker.md`
- **Delegate: Developer** → `.github/agents/_developer.md`
- **Delegate: Checklist Reader** → `.github/agents/_checklist-reader.md` *(only during gates.md checklist gate)*
- **Delegate: Test Evaluator** → `.github/agents/_test-evaluator.md` *(only during gates.md checklist gate, when checklists FAIL)*
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`
- **Delegate: QC Auditor** → `.github/agents/_qc-auditor.md`
- **Delegate: Story Verifier** → `.github/agents/_story-verifier.md`

Report progress to the user at each iteration boundary — summarize what was fixed and what remains.
