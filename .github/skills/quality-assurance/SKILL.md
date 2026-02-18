---
name: quality-assurance
description: "Centralizes rules for quality checks, consistency analysis, and checklist management. Use when running `@sddp.analyze`, generating or verifying checklists, or defining what constitutes 'Done' for a phase."
---

# Quality Assurance Guide

## Analysis Heuristics (`@sddp.analyze`)

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
- **Critical Violation**: Any plan decision that contradicts `.github/copilot-instructions.md` is a CRITICAL error.
- **Reporting**: Flag these immediately with high severity.

## Checklist Management (`@sddp.checklist`)

Checklists are the primary gate for the implementation phase.

### Standard Categories
Every generated checklist should consider these categories if relevant:
1.  **Security**: Authz rules, input validation, secret handling.
2.  **Performance**: Indexing strategy, N+1 query checks, caching.
3.  **Observability**: Logging points, metric emission, error context.
4.  **Testing**: Unit test coverage, edge case handling.

### Template
Use the template at [assets/checklist-template.md](assets/checklist-template.md).

### Evaluation (`sddp.Checklist.Evaluator`)

After a checklist is generated, the `sddp.Checklist.Evaluator` sub-agent automatically evaluates every unchecked item against the feature artifacts. Each item receives one of three outcomes:

1. **PASS** — The question is clearly answered by existing artifacts. Item is marked `[X]` with an inline annotation citing the evidence source.
2. **RESOLVE** — The question reveals a genuine gap. The evaluator amends the relevant artifact(s) (e.g., adds missing `FR-###` to `spec.md`, adds task to `tasks.md`) then marks the item `[X]`.
3. **ASK** — The question is ambiguous or has multiple valid resolutions. The evaluator batches these and asks the user via `askQuestions`, then applies the chosen resolution.

Automated agents may change checkbox state from `- [ ]` to `- [X]` when supported by verified evidence or an explicit applied resolution.

It is invoked in two places:
- **`@sddp.checklist`**: Automatically after checklist generation (Step 5).
- **`@sddp.implement`**: As a third gate option ("Auto-evaluate checklists now") when checklists fail the gate.

## Definition of Done
A feature is "Implementation Ready" only when:
1.  Scale/Complexity risks are mitigated in `plan.md`.
2.  All P1 User Stories have Tasks.
3.  No "NEEDS CLARIFICATION" markers remain in Spec or Plan.
4.  Required checklists are generated in `specs/<branch>/checklists/`.
