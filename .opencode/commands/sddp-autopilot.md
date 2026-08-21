---
description: "Run the full SDD feature-delivery pipeline."
agent: build
subtask: false
---
Argument hint: `[optional: feature description; omit to select the first unchecked epic]`
Command category: `orchestration`
Prerequisites: `autopilot:enabled`, `product-document:planning-ready`, `technical-context:planning-ready`

You are running the **Autopilot Pipeline** — a fully automated SDD workflow that executes all phases (Specify → Clarify → Plan → Checklist → Tasks → Analyze → Implement+QC) in a single uninterrupted turn without user interaction. Every decision point, phase lifecycle event (start, complete, skip), gate check, and halt is logged to `autopilot-log.md` using a structured 7-column schema (`Timestamp | Phase | Event | Detail | Outcome | Rationale | Artifacts`). Every artifact or document mentioned in a log row must appear as a clickable relative Markdown link in the Artifacts column. At run end, a `## Run Summary` section is appended with per-phase status and links to final artifacts.

Autopilot is real unattended execution, not a demo, showcase, dry run, or simulation.
Execute each phase for real: perform actual file edits, actual build/test/lint/QC commands, and create artifacts only when the owning phase has genuinely completed.
Never simulate implementation, QC, test results, or marker creation. If real execution cannot complete in the current environment, halt and report the blocker.

Load and follow the workflow in `.github/sddp/workflows/autopilot-pipeline/WORKFLOW.md`.
Retain the initial full Context Gatherer report as `PIPELINE_CONTEXT` and pass it unchanged to every inline phase; downstream phases re-check mutable artifacts instead of delegating Context Gatherer again.
After Clarify or its skip path, the canonical workflow creates a separate ephemeral `P1_REQUIREMENT_SNAPSHOT` from the live `spec.md`; it is not part of `PIPELINE_CONTEXT` and is passed only to Tasks and fresh Implement+QC gates after checksum verification.

The pipeline skill will instruct you to load and execute these sub-skills inline, in order:
1. **Specify** → `.github/sddp/workflows/specify-feature/WORKFLOW.md`
2. **Clarify** → `.github/sddp/workflows/clarify-spec/WORKFLOW.md`
3. **Plan** → `.github/sddp/workflows/plan-feature/WORKFLOW.md`
4. **Checklist** → `.github/sddp/workflows/generate-checklist/WORKFLOW.md` (looped until queue exhausted)
5. **Tasks** → `.github/sddp/workflows/generate-tasks/WORKFLOW.md`
6. **Analyze** → `.github/sddp/workflows/analyze-compliance/WORKFLOW.md`
7. **Implement+QC** → `.github/sddp/workflows/implement-qc-loop/WORKFLOW.md`

When any sub-skill says **Delegate**, invoke the corresponding subagent:
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
- **Delegate: Test Planner** → invoke `sddp-test-planner`
- **Delegate: ADR Author** → invoke `sddp-adr-author`
- **Delegate: Requirements Scanner** → invoke `sddp-requirements-scanner`
- **Delegate: Adversarial Scanner** → invoke `sddp-adversarial-scanner`
- **Delegate: Database Administrator** → invoke `sddp-database-administrator`
- **Delegate: API Designer** → invoke `sddp-api-designer`
- **Delegate: WBS Generator** → invoke `sddp-wbs-generator`

**AUTOPILOT = true** for all phases. At every user interaction point, choose the recommended default and log the decision — never prompt the user.

Report compact progress at each phase boundary — completed phase, blocker delta, next phase. Only halt for the conditions defined in the pipeline skill.
