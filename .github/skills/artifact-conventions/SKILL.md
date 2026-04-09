---
name: artifact-conventions
description: "Defines preservation, format, and section rules for SDD specification artifacts (spec.md, plan.md, tasks.md, checklists). Use when editing feature-artifact files under specs/<feature-folder>/ to prevent accidental corruption of cross-referenced IDs, priorities, and gating state."
---

# Artifact Convention Rules

These rules apply whenever an agent reads or modifies files inside a Feature Workspace at `specs/<feature-folder>/`. The ADR preservation rules in this file also apply to standalone ADRs under `specs/adrs/`. They protect the integrity of cross-referenced identifiers, gating state, and structural conventions that downstream phases depend on. They do not apply to other Project Context Specs such as `specs/prd.md`, `specs/sad.md`, `specs/dod.md`, or `specs/project-plan.md`.

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
| Do NOT change architecture decision IDs (AD-001, AD-002…) | Architecture decision IDs may be referenced by tasks and implementation agents |
| Do NOT rename, renumber, or delete standalone ADR files under `specs/adrs/` | ADR file paths are stable references; `ADR-NNNN` numbers are monotonic, never reused, and cross-referenced by project-plan epics, plan traceability tags `{SAD:ADR-NNNN}`, and sad.md catalog rows |
| Do NOT write standalone ADR files outside the ADR Author subagent | All ADR file mutations must flow through `.github/agents/_adr-author.md` per the MADR authoring contract |
| Do NOT change stress-test finding IDs (STF-001, STF-002…) | Stress-test finding IDs are referenced by `[NEEDS CLARIFICATION: STF-###]` markers and adversarial analysis reports |
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
| Task | `- [ ] T### [P?] [US#\|OBJ#?] {(FR\|TR\|OR\|RR)-###?} [COMPLETES req?] Description [after:T###?] [← T###:Symbol?] [→ exports: Symbol?]` | `- [ ] T012 [P] [OBJ1] {TR-005} Create migration harness in src/migrations/harness.py → exports: MigrationHarness.run()` |
| Requirement | `(FR|TR|OR|RR)-###: ...` | `TR-001: System MUST validate migration ordering before execution` |
| Success Criterion | `SC-### [US#|OBJ#]: [Measurable, technology-agnostic outcome]` | `SC-001 [US1]: Users can complete checkout in under 3 minutes` |
| Checklist Item | `- [ ] CHK### <question> [Quality Dimension, Spec §X.Y]` | `- [ ] CHK001 Is the error handling strategy defined? [Completeness, Spec §3.2]` |
| Bug Task | `- [ ] T### [BUG:severity] [RECURRING?] [ESCALATED?] [DEFERRED?] {(FR|TR|OR|RR)-###} [category] Description — file:line` | `- [ ] T043 [BUG:ERROR] [RECURRING] {TR-001} [test-failure] Auth rejects valid JWT — src/auth.ts:42` |
| Stress-Test Finding | `STF-###: [Category] (Severity) — Affected: [IDs] — [summary]` | `STF-001: Cross-Requirement Contradiction (CRITICAL) — Affected: FR-002, TR-001 — Real-time sync vs 50ms latency cap at 10k items` |

Bug task severity: `CRITICAL` \| `ERROR` \| `WARNING`. Categories: `test-failure` \| `lint-error` \| `security-vuln` \| `coverage-gap` \| `requirement-gap` \| `pi-violation` \| `runtime-error`.

Bug task modifier tags are optional and only apply to QC-generated bug work:
- `[RECURRING]`: a previously resolved bug regressed
- `[ESCALATED]`: repeated fix attempts failed and the task needs higher attention
- `[DEFERRED]`: excluded from the active Implement → QC loop and tracked under `## Deferred Issues`

Bug tasks include blockquote context lines (not part of the task ID line):
```
  > Error: [actual error message, ≤200 chars]
  > Fix hint: [suggested approach]
```

## Section Rules

These sections are **structurally required** — removing them breaks downstream tooling and gating.

### spec.md
- Determine `spec_type` from frontmatter. If it is absent, treat the spec as `product`.
- Allowed top-level sections vary by `spec_type`:
  - Product: `Problem Statement`, `Scope`, `User Scenarios & Testing`, `Requirements`, `Assumptions & Risks`, `Implementation Signals`, `Success Criteria`, optional `Glossary`, optional `Clarifications`, optional `Compliance Check`, optional `Stress-Test Findings`
  - Technical: `Problem Statement`, `Scope`, `Technical Objectives`, `Integration Points`, `Requirements`, `Assumptions & Risks`, `Implementation Signals`, `Success Criteria`, optional `Glossary`, optional `Clarifications`, optional `Compliance Check`, optional `Stress-Test Findings`
  - Operational: `Problem Statement`, `Scope`, `Operational Objectives`, `Integration Points`, `Requirements`, `Assumptions & Risks`, `Implementation Signals`, `Success Criteria`, optional `Glossary`, optional `Clarifications`, optional `Compliance Check`, optional `Stress-Test Findings`
- Mandatory sections must remain even if empty for the active `spec_type`.

### plan.md
- Do NOT remove the **Instructions Check** section — it is a gating checkpoint that must be present and evaluated
- Do NOT remove the **Technical Context** metadata block
- Do NOT remove the **Requirement Coverage Map** section — it is the primary input for task generation
- Do NOT change Architecture Decision IDs (AD-###) — they may be referenced by tasks
- Size budget: ≤ **10KB**

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

### specs/adrs/*.md
- Apply only the ADR preservation rules from this file when editing standalone ADRs
- Do NOT apply feature-artifact section requirements (`spec.md`, `plan.md`, `tasks.md`, checklist, QC marker rules) to ADR files

## When These Rules Apply

These rules are active whenever an agent:
1. Edits any `.md` file inside a `specs/` feature directory
2. Runs a workflow that modifies spec artifacts (specify, clarify, plan, tasks, implement, analyze)
3. Performs remediation on analysis findings

## Violation Severity

Violations of these rules during `/sddp-analyze` are classified as:

| Violation | Severity |
|-----------|----------|
| Changed or removed a cross-referenced ID (T###, FR-###, TR-###, OR-###, RR-###, SC-###, CHK###, AD-###, ADR-NNNN, STF-###) | **CRITICAL** |
| Reordered user story or objective priorities without approval | **CRITICAL** |
| Removed a required section (Instructions Check, Dependencies) | **CRITICAL** |
| Renamed, renumbered, or deleted a standalone ADR file under `specs/adrs/` | **CRITICAL** |
| Wrote a standalone ADR file outside the ADR Author subagent | **HIGH** |
| Silently removed `[NEEDS CLARIFICATION]` marker | **HIGH** |
| Reversed checkbox state (`[X]` → `[ ]`) without approval | **HIGH** |
| Added unauthorized top-level section to spec.md | **MEDIUM** |
| Format deviation from structural contracts | **MEDIUM** |
