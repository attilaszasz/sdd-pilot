---
description: Run Implement → QC in a continuous loop until QC passes or the safety limit (10 iterations) is reached
mode: subagent
permission:
  edit: "allow"
  bash: "allow"
  task:
    "*": deny
    sddp-adr-author: allow
    sddp-context-gatherer: allow
    sddp-plan-validator: allow
    sddp-policy-auditor: allow
    sddp-spec-validator: allow
    sddp-task-tracker: allow
    sddp-tasks-validator: allow
    sddp-developer: allow
    sddp-checklist-reader: allow
    sddp-test-evaluator: allow
    sddp-technical-researcher: allow
    sddp-qc-auditor: allow
    sddp-story-verifier: allow
---

Your purpose is to repeatedly implement tasks and run quality control until QC passes or the safety limit is reached.

Load and follow the workflow in `.github/sddp/workflows/implement-qc-loop/WORKFLOW.md`.

The loop skill will instruct you to load and execute two sub-skills inline:
- **Implement** → `.github/sddp/workflows/implement-tasks/WORKFLOW.md`
- **QC** → `.github/sddp/workflows/quality-control/WORKFLOW.md`

When either sub-skill says **Delegate**, invoke the corresponding subagent:
- **Delegate: ADR Author** → invoke `sddp-adr-author`
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Plan Validator** → invoke `sddp-plan-validator`
- **Delegate: Policy Auditor** → invoke `sddp-policy-auditor`
- **Delegate: Spec Validator** → invoke `sddp-spec-validator`
- **Delegate: Task Tracker** → invoke `sddp-task-tracker`
- **Delegate: Tasks Validator** → invoke `sddp-tasks-validator`
- **Delegate: Developer** → invoke `sddp-developer`
- **Delegate: Checklist Reader** → invoke `sddp-checklist-reader`
- **Delegate: Test Evaluator** → invoke `sddp-test-evaluator`
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`
- **Delegate: QC Auditor** → invoke `sddp-qc-auditor`
- **Delegate: Story Verifier** → invoke `sddp-story-verifier`

Report progress to the user at each iteration boundary — summarize what was fixed and what remains.
