# Implement Dry-Run Review Checklist

Use this checklist when reviewing changes to task decomposition, dependency annotations, or implementation prompt contracts.

## Task Format

- [ ] The source-of-truth task format in `task-generation/SKILL.md` matches the examples and the WBS Generator instructions.
- [ ] `artifact-conventions/SKILL.md` reflects the same task grammar.
- [ ] `tasks-template.md` and `tasks-annotation-fixture.md` use only supported syntax.

## Parser Contract

- [ ] `TaskTracker` documents `filePath`, `dependencies`, `imports`, `exports`, and `completesRequirement` consistently.
- [ ] `imports[].filePath` is resolvable from referenced source tasks when those tasks exist in the same `tasks.md`.
- [ ] Example JSON stays aligned with the documented parse rules.

## Execution Contract

- [ ] Resume checks happen only after `TASK_LIST` and `REMAINING_TASKS` exist.
- [ ] Completion-point tasks are validated before they are marked `[X]`.
- [ ] Developer inputs are sufficient to locate imported producer files without re-deriving task IDs manually.
- [ ] Parallel batch safety checks only run when annotation data exists.

## Micro-QC (Work-Item Phases)

- [ ] Micro-QC runs only after Phase Review on `[US#]`/`[OBJ#]` phases; Setup/Foundational/Polish skip it.
- [ ] `PHASE_START_FILES` is captured at phase sync; `PHASE_CHANGED_FILES` = end minus start, with task `filePath`/`exports` fallback when git is unavailable.
- [ ] QC Auditor is delegated in differential mode with `changedFiles` scoped to the phase; test commands filter to the work item's test files.
- [ ] Export/contract conformance grep runs for tasks with `→ exports:` annotations and against `contracts/` when present.
- [ ] Failures route into the existing per-task error-recovery loop (auto-fix + one retry); the implement run never halts on a micro-QC failure.
- [ ] Unrecovered failures are tracked for the final summary and re-surface at full `/sddp-qc`; micro-QC does not replace full QC.

## Self-Healing Artifact Amendments

- [ ] Developer Section 3.6 reports a `Divergence` block only when the implementation is correct but differs from the plan; divergences never set `Status: FAILURE`.
- [ ] Divergence `Category` is one of `file-path` | `symbol` | `api-shape` | `architecture`; the block carries `TaskID`, `ReqID`, `Original`, `Actual`, `AffectedArtifact`, `Rationale`.
- [ ] On SUCCESS, the orchestrator amends the affected artifact before the next task: `file-path`/`symbol` update Requirement Coverage Map cells (+ `data-model.md` for `symbol`, `## Project Structure` for `ReqID = —`); `api-shape` updates `contracts/` + `## API Surface Summary`; `architecture` adds a feature-local `AD-###` row or delegates to `_adr-author.md` for project-wide scope.
- [ ] `COVERAGE_MATRIX` is re-parsed from the amended `plan.md` so the next task's `ExpectedEvidence` and the Phase Review Requirement Coverage Diff use fresh values.
- [ ] Cross-referenced IDs (Req IDs, task IDs, existing `AD-###` IDs, `ADR-NNNN`) are never changed by self-healing; only cell values and newly appended `AD-###` rows may change.
- [ ] Every amendment appends one row to `FEATURE_DIR/divergence-log.md` (schema: `| Timestamp | TaskID | ReqID | Category | Original | Actual | AffectedArtifact | Rationale |`); the log is append-only.
- [ ] `AUTOPILOT = true` logs each amendment to `autopilot-log.md`; the implement run never halts on a divergence.
- [ ] The artifact-conventions `plan.md` self-healing allowance and the `divergence-log.md` section are honored; `/sddp-analyze` will not flag in-scope self-healing edits.

## Annotation Sources

- [ ] Import/export annotations are allowed when symbol detail comes from `data-model.md`, `contracts/`, or a Requirement Coverage Map row with a populated `Function(s)/Symbol(s)` column.
- [ ] Annotation gating in the WBS Generator matches the rule in `task-generation/SKILL.md`.

## Sanity Checks

- [ ] `git diff --check` is clean.
- [ ] Edited markdown files report no diagnostics.
- [ ] A reviewer can walk the fixture in `tasks-annotation-fixture.md` and explain how `/sddp-tasks` and `/sddp-implement` should behave without guessing.