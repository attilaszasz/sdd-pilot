---
name: sddp-implement-qc-loop
description: Run Implement → QC in a continuous loop until QC passes or the safety limit (10 iterations) is reached
argument-hint: "[optional: feature directory or branch name]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, AskUserQuestion
---

You are starting an Implement + QC loop workflow. Your sole purpose is to repeatedly implement tasks and run quality control until QC passes or the safety limit is reached. Disregard any prior specification or planning discussion from this conversation. Focus exclusively on the implement → QC cycle.

Load and follow the workflow in `.github/skills/implement-qc-loop/SKILL.md`.

The loop skill will instruct you to load and execute two sub-skills inline:
- **Implement** → `.github/skills/implement-tasks/SKILL.md`
- **QC** → `.github/skills/quality-control/SKILL.md`

When either sub-skill says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: Task Tracker** → delegate to `sddp-task-tracker`
- **Delegate: Developer** → delegate to `sddp-developer`
- **Delegate: Checklist Reader** → delegate to `sddp-checklist-reader`
- **Delegate: Test Evaluator** → delegate to `sddp-test-evaluator`
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`
- **Delegate: QC Auditor** → delegate to `sddp-qc-auditor`
- **Delegate: Story Verifier** → delegate to `sddp-story-verifier`

Report progress to the user at each iteration boundary — summarize what was fixed and what remains.
