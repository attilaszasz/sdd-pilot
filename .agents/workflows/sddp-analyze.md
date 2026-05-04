---
description: Perform non-destructive cross-artifact consistency and quality analysis across spec, plan, and tasks
---

You are starting an analysis workflow. Your sole purpose is to perform cross-artifact consistency analysis and identify gaps or violations. Disregard any prior context from this conversation. Focus exclusively on analysis and reporting — do not modify any files.

Load and follow the workflow in `.github/skills/analyze-compliance/SKILL.md`.

When the workflow says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Task Tracker** → `.github/agents/_task-tracker.md`
- **Delegate: Spec Validator** → `.github/agents/_spec-validator.md`
- **Delegate: Policy Auditor** → `.github/agents/_policy-auditor.md`

Report compact progress at each major milestone — done, issues, next.
