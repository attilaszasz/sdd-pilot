---
name: quality-assurance
description: "Centralizes rules for quality checks, consistency analysis, and checklist management. Use when running `/sddp-analyze`, generating or verifying checklists, or defining what constitutes 'Done' for a phase."
---

# Quality Assurance Guide

## Analysis Heuristics (`/sddp-analyze`)

When performing consistency analysis, verify the following relationships:

### 1. Spec vs. Plan Alignment
- **Requirement Coverage**: Does every P1/P2/P3 user story in `spec.md` have a corresponding section in `plan.md`?
- **Entity Matching**: Do entities defined in `spec.md` (Data Requirements) match the `data-model.md`?
- **Complexity Check**: If the spec marked a feature as "high complexity", does the plan include specific architectural mitigations?

### 2. Plan vs. Tasks Alignment
- **Task Completeness**: Does every section of the implementation plan have at least one corresponding task in `tasks.md`?
- **Phase Ordering**: Do tasks respect the strict phase order (Setup → Foundational → Story Phases)?
- **Missing Chunks**: Are there major components in the architecture diagram that are absent from the task list?

### 3. Instructions Compliance
- **Critical Violation**: Any plan decision that contradicts `project-instructions.md` is a CRITICAL error.
- **Reporting**: Flag these immediately with high severity.

## Checklist Management (`/sddp-checklist`)

Checklists are the primary gate for the implementation phase.

### Standard Categories
Every generated checklist should consider these categories if relevant:
1.  **Security**: Authz rules, input validation, secret handling.
2.  **Performance**: Indexing strategy, N+1 query checks, caching.
3.  **Observability**: Logging points, metric emission, error context.
4.  **Testing**: Unit test coverage, edge case handling.

### Template
Use the template at [assets/checklist-template.md](assets/checklist-template.md).

### Evaluation (`TestEvaluator`)

After a checklist is generated, the `TestEvaluator` sub-agent automatically evaluates every unchecked item against the feature artifacts. Each item receives one of three outcomes:

1. **PASS** — The question is clearly answered by existing artifacts. Item is marked `[X]` with an inline annotation citing the evidence source.
2. **RESOLVE** — The question reveals a genuine gap. The evaluator amends the relevant artifact(s) (e.g., adds missing `FR-###` to `spec.md`, adds task to `tasks.md`) then marks the item `[X]`.
3. **ASK** — The question is ambiguous or has multiple valid resolutions. The evaluator batches these, asks the user, then applies the chosen resolution.

Automated agents may change checkbox state from `- [ ]` to `- [X]` when supported by verified evidence or an explicit applied resolution.

It is invoked in two places:
- **`/sddp-checklist`**: Automatically after checklist generation (Step 5).
- **`/sddp-implement`**: As a third gate option ("Auto-evaluate checklists now") when checklists fail the gate.

## Definition of Done

### Implementation Ready
A feature is "Implementation Ready" only when:
1.  Scale/Complexity risks are mitigated in `plan.md`.
2.  All P1 User Stories have Tasks.
3.  No "NEEDS CLARIFICATION" markers remain in Spec or Plan.
4.  If checklists exist in `specs/<feature-folder>/checklists/`, all must pass (or be explicitly overridden).

### Release Ready
A feature is "Release Ready" (eligible for `.qc-passed`) only when ALL of the following are true:
1.  **All tests pass** — unit and integration test suites report 0 failures.
2.  **Coverage meets threshold** — if `project-instructions.md` defines a coverage mandate, the measured coverage percentage meets or exceeds it. If no threshold is defined, coverage is reported but not enforced.
3.  **No CRITICAL or ERROR static analysis findings** — linting and compilation issues at error severity are resolved.
4.  **No CRITICAL security vulnerabilities** — security scan findings classified as CRITICAL are resolved.
5.  **All P1 user stories PASSED** — every P1 story's acceptance criteria are verified in the implementation.
6.  **All Success Criteria (SC-###) PASSED** — every success criterion is achievable by the current implementation.
7.  **PI compliance: no violations** — no `project-instructions.md` principles are violated.
8.  **No unresolved `[BUG]` tasks** — all BUG tasks in `tasks.md` are marked `[X]`.
9.  **No unacknowledged SKIPPED checks for PI-mandated categories** — if `project-instructions.md` mandates any QC category (linting, security, coverage, accessibility, performance), that check must either pass, be explicitly acknowledged by the user as a risk-accepted waiver (WARNING), or generate FAIL with BUG tasks. Silent skips for PI-mandated categories do not satisfy Release Ready.

> **Note on criteria 2–4**: These criteria apply when the respective tool ran. If a tool was SKIPPED and the category is PI-mandated, criterion 9 governs the outcome. If the category is not PI-mandated, a SKIPPED check does not block Release Ready but is reported as a WARNING recommendation.

This definition is enforced by `/sddp-qc` (Step 7) when determining the Overall Verdict.
