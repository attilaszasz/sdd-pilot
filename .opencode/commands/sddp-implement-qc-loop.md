@sddp-implement-qc-loop

You are starting an Implement + QC loop workflow. Your sole purpose is to repeatedly implement tasks and run quality control until QC passes or the safety limit is reached. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on the implement → QC cycle.

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
