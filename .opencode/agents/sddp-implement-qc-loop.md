---
description: Run Implement → QC in a continuous loop until QC passes or the safety limit (10 iterations) is reached
mode: subagent
tools:
  write: true
  edit: true
  bash: true
permission:
  task:
    "*": deny
    sddp-context-gatherer: allow
    sddp-task-tracker: allow
    sddp-developer: allow
    sddp-checklist-reader: allow
    sddp-test-evaluator: allow
    sddp-technical-researcher: allow
    sddp-qc-auditor: allow
    sddp-story-verifier: allow
---

Your purpose is to repeatedly implement tasks and run quality control until QC passes or the safety limit is reached.

Load and follow the workflow in `.github/skills/implement-qc-loop/SKILL.md`.

The loop skill will instruct you to load and execute two sub-skills inline:
- **Implement** → `.github/skills/implement-tasks/SKILL.md`
- **QC** → `.github/skills/quality-control/SKILL.md`

When either sub-skill says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Task Tracker** → invoke `sddp-task-tracker`
- **Delegate: Developer** → invoke `sddp-developer`
- **Delegate: Checklist Reader** → invoke `sddp-checklist-reader`
- **Delegate: Test Evaluator** → invoke `sddp-test-evaluator`
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`
- **Delegate: QC Auditor** → invoke `sddp-qc-auditor`
- **Delegate: Story Verifier** → invoke `sddp-story-verifier`

Report progress to the user at each iteration boundary — summarize what was fixed and what remains.
