---
description: "Run implement and QC in a continuous loop."
agent: build
subtask: false
---
Argument hint: `[optional: feature directory or branch name]`
Command category: `orchestration`
Prerequisites: `spec`, `plan`, `tasks`

You are starting an Implement + QC loop workflow. Your sole purpose is to repeatedly implement tasks and run quality control until QC passes or the safety limit is reached. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on the implement → QC cycle.

Load and follow the workflow in `.github/sddp/workflows/implement-qc-loop/WORKFLOW.md`.

The loop skill will instruct you to load and execute two sub-skills inline:
- **Implement** → `.github/sddp/workflows/implement-tasks/WORKFLOW.md`
- **QC** → `.github/sddp/workflows/quality-control/WORKFLOW.md`

When either sub-skill says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Spec Validator** → invoke `sddp-spec-validator`
- **Delegate: Plan Validator** → invoke `sddp-plan-validator`
- **Delegate: Tasks Validator** → invoke `sddp-tasks-validator`
- **Delegate: Task Tracker** → invoke `sddp-task-tracker`
- **Delegate: Developer** → invoke `sddp-developer`
- **Delegate: Checklist Reader** → invoke `sddp-checklist-reader`
- **Delegate: Test Evaluator** → invoke `sddp-test-evaluator`
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`
- **Delegate: QC Auditor** → invoke `sddp-qc-auditor`
- **Delegate: Story Verifier** → invoke `sddp-story-verifier`
- **Delegate: Policy Auditor** → invoke `sddp-policy-auditor`
- **Delegate: ADR Author** → invoke `sddp-adr-author`

Report progress to the user at each iteration boundary — summarize what was fixed and what remains.
