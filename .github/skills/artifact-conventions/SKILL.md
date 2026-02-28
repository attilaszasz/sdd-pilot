````skill
---
name: artifact-conventions
description: "Defines preservation, format, and section rules for SDD specification artifacts (spec.md, plan.md, tasks.md, checklists). Use when editing any file under specs/ to prevent accidental corruption of cross-referenced IDs, priorities, and gating state."
---

# Artifact Convention Rules

These rules apply whenever an agent reads or modifies files under a feature's `specs/` directory. They protect the integrity of cross-referenced identifiers, gating state, and structural conventions that downstream phases depend on.

## Preservation Rules

These are **non-negotiable guardrails** — violating them breaks cross-artifact traceability and phase gating.

| Rule | Rationale |
|------|-----------|
| Do NOT reorder user story priorities (P1, P2, P3) without explicit user approval | Priority order drives task phasing and MVP scope — reordering silently changes what ships first |
| Do NOT change task IDs (T001, T002…) | Task IDs are cross-referenced in coverage maps, dependency graphs, and issue trackers |
| Do NOT change checklist IDs (CHK001, CHK002…) | Checklist IDs are referenced externally by quality-assurance checks and test evaluators |
| Preserve checkbox state (`- [ ]` vs `- [X]`) | Checkbox state is a gating signal — flipping it can unblock or block downstream phases |
| Do NOT change requirement IDs (FR-001, FR-002…) | Requirement IDs are mapped to tasks, coverage reports, and compliance checks |
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
| Task | `- [ ] T### [P?] [US#?] Description with file path` | `- [ ] T012 [P] [US1] Create User model in src/models/user.py` |
| Requirement | `FR-###: System MUST [specific capability]` | `FR-001: System MUST validate email format on registration` |
| Success Criterion | `SC-###: [Measurable, technology-agnostic outcome]` | `SC-001: Users can complete checkout in under 3 minutes` |
| Checklist Item | `- [ ] CHK### <question> [Quality Dimension, Spec §X.Y]` | `- [ ] CHK001 Is the error handling strategy defined? [Completeness, Spec §3.2]` |

## Section Rules

These sections are **structurally required** — removing them breaks downstream tooling and gating.

### spec.md
- Do NOT add new top-level sections (except `## Clarifications`)
- Mandatory sections must remain even if empty: User Scenarios & Testing, Requirements, Success Criteria

### plan.md
- Do NOT remove the **Instructions Check** section — it is a gating checkpoint that must be present and evaluated
- Do NOT remove the **Technical Context** metadata block

### tasks.md
- Do NOT remove the **Dependencies & Execution Order** section — it defines the phase graph that implementation agents traverse
- Do NOT remove phase headers — they delineate execution boundaries

### checklist files
- Do NOT remove or renumber CHK### items — external references depend on stable IDs
- Do NOT change the quality dimension tags in square brackets

## When These Rules Apply

These rules are active whenever an agent:
1. Edits any `.md` file inside a `specs/` feature directory
2. Runs a workflow that modifies spec artifacts (specify, clarify, plan, tasks, implement, analyze)
3. Performs remediation on analysis findings

## Violation Severity

Violations of these rules during `/sddp-analyze` are classified as:

| Violation | Severity |
|-----------|----------|
| Changed or removed a cross-referenced ID (T###, FR-###, SC-###, CHK###) | **CRITICAL** |
| Reordered user story priorities without approval | **CRITICAL** |
| Removed a required section (Instructions Check, Dependencies & Execution Order) | **CRITICAL** |
| Silently removed `[NEEDS CLARIFICATION]` marker | **HIGH** |
| Reversed checkbox state (`[X]` → `[ ]`) without approval | **HIGH** |
| Added unauthorized top-level section to spec.md | **MEDIUM** |
| Format deviation from structural contracts | **MEDIUM** |
````
