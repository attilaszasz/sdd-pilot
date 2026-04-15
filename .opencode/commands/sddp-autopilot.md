@sddp-autopilot-pipeline

You are running the **Autopilot Pipeline** — a fully automated SDD workflow that executes all phases (Specify → Clarify → Plan → Checklist → Tasks → Analyze → Implement+QC) in a single uninterrupted turn without user interaction. Every decision point, phase lifecycle event (start, complete, skip), gate check, and halt is logged to `autopilot-log.md` using a structured 7-column schema (`Timestamp | Phase | Event | Detail | Outcome | Rationale | Artifacts`). Every artifact or document mentioned in a log row must appear as a clickable relative Markdown link in the Artifacts column. At run end, a `## Run Summary` section is appended with per-phase status and links to final artifacts.

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

When any sub-skill says **Delegate**, invoke the corresponding subagent:
- **Delegate: Context Gatherer** → invoke `sddp-context-gatherer`
- **Delegate: Task Tracker** → invoke `sddp-task-tracker`
- **Delegate: Developer** → invoke `sddp-developer`
- **Delegate: Checklist Reader** → invoke `sddp-checklist-reader`
- **Delegate: Test Evaluator** → invoke `sddp-test-evaluator`
- **Delegate: Technical Researcher** → invoke `sddp-technical-researcher`
- **Delegate: QC Auditor** → invoke `sddp-qc-auditor`
- **Delegate: Story Verifier** → invoke `sddp-story-verifier`
- **Delegate: Policy Auditor** → invoke `sddp-policy-auditor`
- **Delegate: Test Planner** → invoke `sddp-test-planner`

**AUTOPILOT = true** for all phases. At every user interaction point, choose the recommended default and log the decision — never prompt the user.

Report progress at each phase boundary. Only halt for the conditions defined in the pipeline skill.
