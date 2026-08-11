# Micro-QC For Work-Item Phases

> **Load condition**: Read this file only after Phase Review for a delivery work-item phase identified as `[US#]` or `[OBJ#]`. Never load it for Setup, Foundational, or Polish phases; those retain structural Phase Review only.

This is a fast-feedback complement to `/sddp-qc`, not a replacement. Full QC still runs at Step 6 and via `/sddp-qc`.

## Scope Changed Files

- `PHASE_END_FILES` = `git diff --name-only HEAD` (empty if not a git repo)
- `PHASE_CHANGED_FILES` = `PHASE_END_FILES` minus `PHASE_START_FILES`
- Fallback (empty result or not a git repo): union of `filePath` and `exports` file paths from tasks completed in this phase (from Task Tracker)
- Still empty -> skip Micro-QC: "✓ Micro-QC Phase [N]: SKIPPED (no changed files)"

## Differential Audit

**Delegate: QC Auditor** (`.github/agents/_qc-auditor.md`) in differential mode with:

- `featureDir`, `techStack`, `autopilot` from Step 2 / run context
- `testCommands` filtered to the work item's test files: prefer the plan's `## Testing Strategy` rows tagged to this phase's requirements; else co-located test files matching `PHASE_CHANGED_FILES` (`*.test.*`, `*_test.*`, `tests/` siblings); else empty (Auditor auto-detects and applies `--changed`/`--lf` differential filters)
- `lintCommands`, `securityTools`, `coverageThreshold`, `qcTooling`, `requiredCategories` from Step 2 context
- `changedFiles = PHASE_CHANGED_FILES`

The Auditor runs build check -> lint (`eslint [files]` / `ruff check [files]` / stack equivalent) -> security scan -> tests with `--changed`/`--lf` differential filters. It returns PASSED/FAILED/SKIPPED per category. Security scanning includes grep for common anti-patterns (hardcoded secrets, unsanitized input) in `changedFiles`.

## Export And Contract Conformance

For each task completed in this phase with `→ exports: Symbol(params)` annotations:

1. Grep the declared `filePath` for each exported `Symbol` declaration.
2. If `FEATURE_DIR/contracts/` exists and the task's requirement tag maps to a contract schema, verify the export's signature (params, return shape) matches the contract.
3. Missing symbol or signature mismatch -> record `export-mismatch` failure with task ID, symbol, and file.

## Failure Routing

- Route each test, lint, security, or export-mismatch failure into the existing **On FAILURE — Error Recovery** loop for the corresponding task: auto-fix by error type, then one retry via **Delegate: Developer**.
- Never halt the Implement run on a Micro-QC failure. Track unrecovered failures after retry in the phase failure list, surface them in the final summary, and let them re-surface at full `/sddp-qc`.
- Second failure on the same task -> mark skipped per the existing sequential-task double-failure rule; do not escalate to a full Implement halt.

Report "✓ Micro-QC Phase [N]: tests [PASS|FAIL|SKIPPED], lint [..], security [..], exports [..]" or report each failure as `file:issue` with the task ID routed to recovery.

After Micro-QC, update the single JSON state document described in Step 4.5. Refresh `phase`, `phaseCounters`, `completed`, `remaining`, `blocked`, `microqc`, `priorExports`, all source fingerprints, and `timestamps`; retain the phase-boundary `timestamp` alias. This checkpoint supplements the mandatory pre-delegation checkpoint.
