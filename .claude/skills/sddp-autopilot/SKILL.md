---
name: sddp-autopilot
description: Run the full SDD pipeline (Specify → Clarify → Plan → Checklist → Tasks → Analyze → Implement+QC) end-to-end without user interaction
argument-hint: "<feature description>"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, WebFetch
---

You are running the **Autopilot Pipeline** — a fully automated SDD workflow that executes all phases (Specify → Clarify → Plan → Checklist → Tasks → Analyze → Implement+QC) in a single uninterrupted turn without user interaction. Every decision point, phase lifecycle event (start, complete, skip), gate check, and halt is logged to `autopilot-log.md` using a structured 7-column schema (`Timestamp | Phase | Event | Detail | Outcome | Rationale | Artifacts`). Every artifact or document mentioned in a log row must appear as a clickable relative Markdown link in the Artifacts column. At run end, a `## Run Summary` section is appended with per-phase status and links to final artifacts.

Load and follow the workflow in `.github/skills/autopilot-pipeline/SKILL.md`.

The pipeline skill will instruct you to load and execute these sub-skills inline, in order:
1. **Specify** → `.github/skills/specify-feature/SKILL.md`
2. **Clarify** → `.github/skills/clarify-spec/SKILL.md`
3. **Plan** → `.github/skills/plan-feature/SKILL.md`
4. **Checklist** → `.github/skills/generate-checklist/SKILL.md` (looped until queue exhausted)
5. **Tasks** → `.github/skills/generate-tasks/SKILL.md`
6. **Analyze** → `.github/skills/analyze-compliance/SKILL.md`
7. **Implement+QC** → `.github/skills/implement-qc-loop/SKILL.md`

When any sub-skill says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Context Gatherer** → delegate to `sddp-context-gatherer`
- **Delegate: Task Tracker** → delegate to `sddp-task-tracker`
- **Delegate: Developer** → delegate to `sddp-developer`
- **Delegate: Checklist Reader** → delegate to `sddp-checklist-reader`
- **Delegate: Test Evaluator** → delegate to `sddp-test-evaluator`
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`
- **Delegate: QC Auditor** → delegate to `sddp-qc-auditor`
- **Delegate: Story Verifier** → delegate to `sddp-story-verifier`
- **Delegate: Policy Auditor** → delegate to `sddp-policy-auditor`
- **Delegate: Test Planner** → delegate to `sddp-test-planner`

**AUTOPILOT = true** for all phases. At every user interaction point, choose the recommended default and log the decision — never prompt the user.

Report compact progress at each phase boundary — completed phase, blocker delta, next phase. Only halt for the conditions defined in the pipeline skill.
