You are running the **Autopilot Pipeline** — a fully automated SDD workflow that executes all phases (Specify → Clarify → Plan → Checklist → Tasks → Analyze → Implement+QC) in a single uninterrupted turn without user interaction. Every decision point uses the recommended/default option and is logged to `autopilot-log.md`.

Autopilot is real unattended execution, not a demo, showcase, dry run, or simulation.
Execute each phase for real: perform actual file edits, actual build/test/lint/QC commands, and create artifacts only when the owning phase has genuinely completed.
Never simulate implementation, QC, test results, or marker creation. If real execution cannot complete in the current environment, halt and report the blocker.

Load and follow the workflow in `.github/skills/autopilot-pipeline/SKILL.md`.

The pipeline skill will instruct you to load and execute these sub-skills inline, in order:
1. **Specify** → `.github/skills/specify-feature/SKILL.md`
2. **Clarify** → `.github/skills/clarify-spec/SKILL.md`
3. **Plan** → `.github/skills/plan-feature/SKILL.md`
4. **Checklist** → `.github/skills/generate-checklist/SKILL.md` (looped until queue exhausted)
5. **Tasks** → `.github/skills/generate-tasks/SKILL.md`
6. **Analyze** → `.github/skills/analyze-compliance/SKILL.md`
7. **Implement+QC** → `.github/skills/implement-qc-loop/SKILL.md`

When any sub-skill says **Delegate**, read the referenced sub-agent file **at that point, not before** — then perform the task yourself:
- **Delegate: Context Gatherer** → `.github/agents/_context-gatherer.md`
- **Delegate: Task Tracker** → `.github/agents/_task-tracker.md`
- **Delegate: Developer** → `.github/agents/_developer.md`
- **Delegate: Checklist Reader** → `.github/agents/_checklist-reader.md`
- **Delegate: Test Evaluator** → `.github/agents/_test-evaluator.md`
- **Delegate: Technical Researcher** → `.github/agents/_technical-researcher.md`
- **Delegate: QC Auditor** → `.github/agents/_qc-auditor.md`
- **Delegate: Story Verifier** → `.github/agents/_story-verifier.md`
- **Delegate: Policy Auditor** → `.github/agents/_policy-auditor.md`
- **Delegate: Test Planner** → `.github/agents/_test-planner.md`

**AUTOPILOT = true** for all phases. At every user interaction point, choose the recommended default and log the decision — never prompt the user.

Report progress at each phase boundary. Only halt for the conditions defined in the pipeline skill.
