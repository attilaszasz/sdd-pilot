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

## Annotation Sources

- [ ] Import/export annotations are allowed when symbol detail comes from `data-model.md`, `contracts/`, or a Requirement Coverage Map row with a populated `Function(s)/Symbol(s)` column.
- [ ] Annotation gating in the WBS Generator matches the rule in `task-generation/SKILL.md`.

## Sanity Checks

- [ ] `git diff --check` is clean.
- [ ] Edited markdown files report no diagnostics.
- [ ] A reviewer can walk the fixture in `tasks-annotation-fixture.md` and explain how `/sddp-tasks` and `/sddp-implement` should behave without guessing.