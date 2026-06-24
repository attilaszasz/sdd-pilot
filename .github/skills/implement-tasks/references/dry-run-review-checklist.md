# Implement Dry-Run Review Checklist

Use this checklist when reviewing changes to task decomposition, dependency annotations, or implementation prompt contracts.

## Task Format

- [ ] The source-of-truth task format in `task-generation/SKILL.md` matches the examples and the WBS Generator instructions.
- [ ] `artifact-conventions/SKILL.md` reflects the same task grammar.
- [ ] `tasks-template.md` and `tasks-annotation-fixture.md` use only supported syntax.

## Parser Contract

- [ ] `TaskTracker` documents `filePath`, `dependencies`, `imports`, `exports`, `verify`, and `completesRequirement` consistently.
- [ ] `imports[].filePath` is resolvable from referenced source tasks when those tasks exist in the same `tasks.md`.
- [ ] `verify` is a string array; repeatable `[VERIFY: ...]` annotations preserve order; malformed entries (empty / contains `]`) are skipped with a warning.
- [ ] Example JSON stays aligned with the documented parse rules.

## Execution Contract

- [ ] Resume checks happen only after `TASK_LIST` and `REMAINING_TASKS` exist.
- [ ] Completion-point tasks are validated before they are marked `[X]`.
- [ ] Developer inputs are sufficient to locate imported producer files without re-deriving task IDs manually.
- [ ] Parallel batch safety checks only run when annotation data exists.

## VERIFY Annotations

- [ ] The task format in `task-generation/SKILL.md`, `artifact-conventions/SKILL.md`, `_wbs-generator.md`, and `_task-tracker.md` all include `[VERIFY: <command>]?*` in the grammar string and stay mutually consistent.
- [ ] `_wbs-generator.md` auto-emits `[VERIFY:]` only when a deterministic check is derivable (Testing Strategy test command > `grep` for an `→ exports:` symbol > build/typecheck targeting the file), caps at 3 per task, and omits when none is derivable.
- [ ] `_task-tracker.md` parses `[VERIFY: ...]` into `verify: string[]`; commands MUST NOT contain a literal `]`; malformed entries are skipped.
- [ ] `_developer.md` Section 3.7 runs each VERIFY command from the repo root after 3/3.5/3.6 pass; non-zero exit / no-match = `Status: FAILURE`, `errorType: verify-failure`; all pass = SUCCESS.
- [ ] `implement-tasks/SKILL.md` passes `Verify` to the Developer when `task.verify` is non-empty and routes `verify-failure` into the existing error-recovery loop (analyze output, fix, retry once).
- [ ] `analyze-compliance/SKILL.md` flags malformed `[VERIFY:]` (empty / contains `]`) as LOW.
- [ ] Character budget: lines with one or more `[VERIFY:]` may extend to 300 chars; non-VERIFY lines stay ≤ 200.

## Micro-QC (Work-Item Phases)

- [ ] Micro-QC runs only after Phase Review on `[US#]`/`[OBJ#]` phases; Setup/Foundational/Polish skip it.
- [ ] `PHASE_START_FILES` is captured at phase sync; `PHASE_CHANGED_FILES` = end minus start, with task `filePath`/`exports` fallback when git is unavailable.
- [ ] QC Auditor is delegated in differential mode with `changedFiles` scoped to the phase; test commands filter to the work item's test files.
- [ ] Export/contract conformance grep runs for tasks with `→ exports:` annotations and against `contracts/` when present.
- [ ] Failures route into the existing per-task error-recovery loop (auto-fix + one retry); the implement run never halts on a micro-QC failure.
- [ ] Unrecovered failures are tracked for the final summary and re-surface at full `/sddp-qc`; micro-QC does not replace full QC.

## Requirement Self-Verification (Step 3.5)

- [ ] `_developer.md` Section 3.5 runs only when `ExpectedEvidence` is provided; it verifies every `filePaths` entry exists and at least one `functions` symbol is present (grep of the declaration suffices for compiled languages).
- [ ] For non-stubbed reqIDs (no matching `AcceptanceStub`), Section 3.5 greps conventional test locations (co-located `*.test.*`/`*_test.*` plus `tests/`/`__tests__/`) for the reqID tag or any expected function symbol and reports `requirement-gap` on no match (suggestedFix points the author at adding a happy-path test).
- [ ] Section 3.5 skips the happy-path grep when an `AcceptanceStub` exists for the reqID — the Step 3 GREEN check is authoritative for stubbed requirements (no double-gating).
- [ ] On pass, the Report notes "requirement evidence verified for [reqID(s)]" plus "happy-path test verified for [reqID(s)]" (the happy-path note is omitted when every reqID was stubbed).
- [ ] `implement-tasks/SKILL.md` `ExpectedEvidence` description states the happy-path test check for non-stubbed requirements.

## Self-Healing Artifact Amendments

- [ ] Developer Section 3.6 reports a `Divergence` block only when the implementation is correct but differs from the plan; divergences never set `Status: FAILURE`.
- [ ] Divergence `Category` is one of `file-path` | `symbol` | `api-shape` | `architecture`; the block carries `TaskID`, `ReqID`, `Original`, `Actual`, `AffectedArtifact`, `Rationale`.
- [ ] On SUCCESS, the orchestrator amends the affected artifact before the next task: `file-path`/`symbol` update Requirement Coverage Map cells (+ `data-model.md` for `symbol`, `## Project Structure` for `ReqID = —`); `api-shape` updates `contracts/` + `## API Surface Summary`; `architecture` adds a feature-local `AD-###` row or delegates to `_adr-author.md` for project-wide scope.
- [ ] `COVERAGE_MATRIX` is re-parsed from the amended `plan.md` so the next task's `ExpectedEvidence` and the Phase Review Requirement Coverage Diff use fresh values.
- [ ] Cross-referenced IDs (Req IDs, task IDs, existing `AD-###` IDs, `ADR-NNNN`) are never changed by self-healing; only cell values and newly appended `AD-###` rows may change.
- [ ] Every amendment appends one row to `FEATURE_DIR/divergence-log.md` (schema: `| Timestamp | TaskID | ReqID | Category | Original | Actual | AffectedArtifact | Rationale |`); the log is append-only.
- [ ] `AUTOPILOT = true` logs each amendment to `autopilot-log.md`; the implement run never halts on a divergence.
- [ ] The artifact-conventions `plan.md` self-healing allowance and the `divergence-log.md` section are honored; `/sddp-analyze` will not flag in-scope self-healing edits.

## Confidence Scoring & Auto-Escalation

- [ ] `_developer.md` Step 4 declares a required `Confidence: CONFIDENT | TENTATIVE | UNCERTAIN` field with a one-line evidence statement on SUCCESS; the field is omitted on FAILURE.
- [ ] Step 4 level-selection guidance grounds the choice in Step 3/3.5/3.7 outcomes and names CONFIDENT as the default when all objective checks pass.
- [ ] `implement-tasks/SKILL.md` On SUCCESS parses the `Confidence` field and routes CONFIDENT to mark `[X]` with no extra verification (current behavior).
- [ ] TENTATIVE is routed to mark `[X]`, run extra verification (re-run the task's test file; verify `→ exports:` against `contracts/` when present), add to `TENTATIVE_TASKS`, and does NOT re-delegate to the Developer.
- [ ] A TENTATIVE task whose extra verification fails is downgraded to FAILURE and routed into error-recovery (no silent pass).
- [ ] UNCERTAIN is routed into the existing On FAILURE error-recovery loop with the one-line uncertainty evidence appended to `PriorAttempts`; the second UNCERTAIN follows the existing second-failure path (Autopilot guard I1 unchanged).
- [ ] Step 6 final summary lists `TENTATIVE_TASKS` (task IDs + one-line evidence) and, when non-empty, writes them to `FEATURE_DIR/.review-findings` as QC priority-review checks.

## Acceptance Test Stubs (P1)

- [ ] `plan-template.md` has a `## Acceptance Test Stubs` section between `## Testing Strategy` and `## Error Handling Strategy`; `plan-authoring/SKILL.md` documents the rules; `plan-feature/SKILL.md` Step 4.5.1 populates it and Step 5.0 includes a readiness check.
- [ ] When populated, every row is a P1 requirement (`FR-###`/`TR-###`/`OR-###`/`RR-###`); every P1 requirement from `spec.md` has a row; `Test File` follows the `## Testing Strategy` Unit tier convention; `Stub Blocks` embed the reqID and use framework-native syntax; `RED Status` is one of `pending`/`failing-assertion`/`skip`.
- [ ] When the spec has no P1 requirements, the section body is `N/A — no P1 requirements`.
- [ ] `task-generation/SKILL.md` `## Acceptance Test Stubs` rule and Phase 3+ ordering list stub tasks first; `tasks-template.md` and `tasks-annotation-fixture.md` show a stub task with `← plan:AcceptanceTestStubs` preceding implementation tasks.
- [ ] `_task-tracker.md` parses `← plan:AcceptanceTestStubs` into `imports[].sourceTask == "plan"` with `filePath = null`.
- [ ] `_wbs-generator.md` Step 2 emits one stub task per P1 reqID row as the first task of that requirement's work-item phase; Step 3 validates every P1 stub row has a preceding stub task and that no stub task is `[P]`-batched with a same-reqID implementation task.
- [ ] `_developer.md` documents the `AcceptanceStub` input and the two validation cases (stub-creation → confirm RED; implementation → confirm GREEN before SUCCESS).
- [ ] `implement-tasks/SKILL.md` parses `## Acceptance Test Stubs` into `STUB_MAP`, passes `AcceptanceStub` to the Developer for stub tasks and for implementation tasks whose reqID is in `STUB_MAP`, and states the rule.
- [ ] `artifact-conventions/SKILL.md` registers the `## Acceptance Test Stubs` section under `plan.md` rules; reqID links in `Stub Blocks` are stable.
- [ ] P2/P3 work items never get stub tasks (P1-only scope); the size budget for `tasks.md` (≤6KB, ≤40 tasks) is respected.

## Annotation Sources

- [ ] Import/export annotations are allowed when symbol detail comes from `data-model.md`, `contracts/`, or a Requirement Coverage Map row with a populated `Function(s)/Symbol(s)` column.
- [ ] Annotation gating in the WBS Generator matches the rule in `task-generation/SKILL.md`.

## Sanity Checks

- [ ] `git diff --check` is clean.
- [ ] Edited markdown files report no diagnostics.
- [ ] A reviewer can walk the fixture in `tasks-annotation-fixture.md` and explain how `/sddp-tasks` and `/sddp-implement` should behave without guessing.