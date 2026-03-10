````skill
---
name: artifact-conventions
description: "Defines preservation, format, and section rules for SDD specification artifacts (spec.md, plan.md, tasks.md, checklists). Use when editing feature-artifact files under specs/<feature-folder>/ to prevent accidental corruption of cross-referenced IDs, priorities, and gating state."
---

# Artifact Convention Rules

These rules apply whenever an agent reads or modifies files under a feature's `specs/<feature-folder>/` directory. They protect the integrity of cross-referenced identifiers, gating state, and structural conventions that downstream phases depend on. They do not apply to project-level documents such as `specs/prd.md` or `specs/sad.md`.

## Preservation Rules

These are **non-negotiable guardrails** — violating them breaks cross-artifact traceability and phase gating.

| Rule | Rationale |
|------|-----------|
| Do NOT reorder product user story priorities or non-product objective priorities (P1, P2, P3) without explicit user approval | Priority order drives task phasing and MVP scope — reordering silently changes what ships first |
| Do NOT change task IDs (T001, T002…) | Task IDs are cross-referenced in coverage maps, dependency graphs, and issue trackers |
| Do NOT change checklist IDs (CHK001, CHK002…) | Checklist IDs are referenced externally by quality-assurance checks and test evaluators |
| Preserve checkbox state (`- [ ]` vs `- [X]`) | Checkbox state is a gating signal — flipping it can unblock or block downstream phases |
| Do NOT change requirement IDs (`FR-001`, `TR-001`, `OR-001`, `RR-001`) | Requirement IDs are mapped to tasks, coverage reports, and compliance checks |
| Do NOT change success criteria IDs (SC-001, SC-002…) | Success criteria IDs are referenced in phase reviews and validation |
| Respect `[NEEDS CLARIFICATION]` markers — only resolve with user-approved answers | Silently removing a marker hides unresolved ambiguity that may affect scope, security, or UX |

### Checkbox State Transitions

The only valid checkbox transitions during implementation are:

- `- [ ]` → `- [X]` (task completed, checklist item satisfied)
- Never `- [X]` → `- [ ]` (reverting completion state requires explicit user approval)
- Never delete a checkbox line entirely

## Format Rules

These formats are **structural contracts** consumed by parsers, trackers, and cross-reference tools.

| Artifact | Format | Example |
|----------|--------|---------|
| Task | `- [ ] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} Description with file path` | `- [ ] T012 [P] [OBJ1] {TR-005} Create migration harness in src/migrations/harness.py` |
| Requirement | `(FR|TR|OR|RR)-###: ...` | `TR-001: System MUST validate migration ordering before execution` |
| Success Criterion | `SC-###: [Measurable, technology-agnostic outcome]` | `SC-001: Users can complete checkout in under 3 minutes` |
| Checklist Item | `- [ ] CHK### <question> [Quality Dimension, Spec §X.Y]` | `- [ ] CHK001 Is the error handling strategy defined? [Completeness, Spec §3.2]` |

## Section Rules

These sections are **structurally required** — removing them breaks downstream tooling and gating.

### spec.md
- Determine `spec_type` from frontmatter. If it is absent, treat the spec as `product`.
- Allowed top-level sections vary by `spec_type`:
  - Product: `User Scenarios & Testing`, `Requirements`, `Success Criteria`, optional `Clarifications`
  - Technical: `Technical Objectives`, `Integration Points`, `Requirements`, `Success Criteria`, optional `Clarifications`
  - Operational: `Operational Objectives`, `Integration Points`, `Requirements`, `Success Criteria`, optional `Clarifications`
- Mandatory sections must remain even if empty for the active `spec_type`.

### plan.md
- Do NOT remove the **Instructions Check** section — it is a gating checkpoint that must be present and evaluated
- Do NOT remove the **Technical Context** metadata block

### tasks.md
- Do NOT remove the **Dependencies** section — it defines the phase graph that implementation agents traverse
- Do NOT remove phase headers that exist — they delineate execution boundaries. Optional empty phases may be omitted at generation time, but present phase headers must be preserved.

### checklist files
- Do NOT remove or renumber CHK### items — external references depend on stable IDs
- Do NOT change the quality dimension tags in square brackets

### qc-report.md
- On re-runs, the prior report is overwritten with the new report. If run history is needed, the agent should note the prior verdict in the "Re-run detection" step of the QC workflow.
- Do NOT manually edit `qc-report.md` — it is generated exclusively by `/sddp-qc`
- The report structure must follow the template at `.github/skills/quality-control/assets/qc-report-template.md`

### manual-test.md
- Generated conditionally by `/sddp-qc` when manual verification is required
- May be updated on re-runs if new manual test scenarios are detected
- Do NOT remove existing test scenarios on re-run — append new ones or update existing entries

### .completed / .qc-passed markers
- These are gating markers managed exclusively by `/sddp-implement` and `/sddp-qc`
- Do NOT manually create, delete, or edit these files
- `.completed` is deleted by QC on failure and recreated by a successful implementation re-run
- `.qc-passed` is created by QC on success and overwritten on subsequent passes

## When These Rules Apply

These rules are active whenever an agent:
1. Edits any `.md` file inside a `specs/` feature directory
2. Runs a workflow that modifies spec artifacts (specify, clarify, plan, tasks, implement, analyze)
3. Performs remediation on analysis findings

## Violation Severity

Violations of these rules during `/sddp-analyze` are classified as:

| Violation | Severity |
|-----------|----------|
| Changed or removed a cross-referenced ID (T###, FR-###, TR-###, OR-###, RR-###, SC-###, CHK###) | **CRITICAL** |
| Reordered user story or objective priorities without approval | **CRITICAL** |
| Removed a required section (Instructions Check, Dependencies) | **CRITICAL** |
| Silently removed `[NEEDS CLARIFICATION]` marker | **HIGH** |
| Reversed checkbox state (`[X]` → `[ ]`) without approval | **HIGH** |
| Added unauthorized top-level section to spec.md | **MEDIUM** |
| Format deviation from structural contracts | **MEDIUM** |
````
