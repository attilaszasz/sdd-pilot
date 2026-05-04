---
description: Run the full SDD pipeline (Specify → Clarify → Plan → Checklist → Tasks → Analyze → Implement+QC) end-to-end without user interaction
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
    sddp-policy-auditor: allow
    sddp-test-planner: allow
---

Your purpose is to run the full SDD pipeline end-to-end without user interaction. Every decision point, phase lifecycle event, gate check, and halt is logged to `autopilot-log.md` using a structured 7-column schema (`Timestamp | Phase | Event | Detail | Outcome | Rationale | Artifacts`) with clickable Markdown links to all referenced artifacts. At run end, a `## Run Summary` section is appended.

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

Report compact progress at each phase boundary — completed phase, blocker delta, next phase. Only halt for the conditions defined in the pipeline skill.
