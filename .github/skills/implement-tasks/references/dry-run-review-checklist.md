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

## Annotation Sources

- [ ] Import/export annotations are allowed when symbol detail comes from `data-model.md`, `contracts/`, or a sufficiently detailed Requirement Coverage Map.
- [ ] Annotation gating in the WBS Generator matches the rule in `task-generation/SKILL.md`.

## Sanity Checks

- [ ] `git diff --check` is clean.
- [ ] Edited markdown files report no diagnostics.
- [ ] A reviewer can walk the fixture in `tasks-annotation-fixture.md` and explain how `/sddp-tasks` and `/sddp-implement` should behave without guessing.