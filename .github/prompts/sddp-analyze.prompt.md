---
agent: Compliance Auditor
---
You are starting an analysis workflow. Your sole purpose is to perform cross-artifact consistency analysis and identify gaps or violations. Disregard any prior context from this conversation. Focus exclusively on analysis and reporting — do not modify any files.

Load and follow the workflow in `.github/skills/analyze-compliance/SKILL.md`.

The selected agent dispatches each **Delegate** target through its declared `agents` allowlist:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Task Tracker** → `.github/agents/_task-tracker.md`
- **Delegate: Spec Validator** → `.github/agents/_spec-validator.md`
- **Delegate: Policy Auditor** → `.github/agents/_policy-auditor.md`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
