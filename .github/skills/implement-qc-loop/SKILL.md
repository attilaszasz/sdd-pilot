---
name: implement-qc-loop
description: "Runs Implement → QC in a continuous loop until QC passes or a safety limit is reached. Combines /sddp-implement and /sddp-qc into a single uninterrupted workflow."
---

# Software Engineer — Implement + QC Loop Workflow

<rules>
- Orchestrates `/sddp-implement` + `/sddp-qc` in a single turn. Loads and executes each sub-skill inline — does not duplicate their logic.
- Executes for real. Not a demo, dry run, or simulation.
- Never treat marker creation alone as success. `.completed`/`.qc-passed` valid only when backed by actual work and report state.
- Artifacts inconsistent with `tasks.md` or `qc-report.md` → halt and surface.
- **Safety limit**: Max **10** iterations → halt with latest `qc-report.md`.
- Report brief status at each iteration boundary: iteration number, bug tasks added, remaining failures.
- Same gating rules as sub-skills: `spec.md`, `plan.md`, `tasks.md` required.
- **NEVER yield between iterations** — continuous turn until QC passes or safety limit.
- **Halt early** (yield to user) if:
  1. Implement halts due to sequential task double-failure (autopilot: automatic halt; interactive: user chooses "Halt")
  2. QC generates `manual-test.md`
  3. Implement cannot produce `.completed` (catastrophic failure)
  4. QC finds only CRITICAL `project-instructions.md` violations
  5. Marker/report state inconsistent with actual evidence
- **Artifact conventions** (`.github/skills/artifact-conventions/SKILL.md`): All sub-skill rules apply. Never reverse checkboxes, delete task lines, or modify IDs.
- Pass through user confirmation requests from sub-skills.
</rules>

<workflow>

## 1. Gate Check

**Delegate: Context Gatherer** (quick mode) → resolve `FEATURE_DIR`.

Verify in `FEATURE_DIR`:
- `spec.md` — missing → halt: "Missing `spec.md`. Run `/sddp-specify` first."
- `plan.md` — missing → halt: "Missing `plan.md`. Run `/sddp-plan` first."
- `tasks.md` — missing → halt: "Missing `tasks.md`. Run `/sddp-tasks` first."

Initialize: `ITERATION = 0`, `LOOP_END_REASON = ""`.

Read `.github/sddp-config.md` → `## Loop Settings` → `**MaxIterations**:`. Valid positive int → `MAX_ITERATIONS`. Missing → `10`.

Initialize: `ZERO_PROGRESS_COUNT = 0`, `ITERATION_LOG = {}`.

## 2. Implement → QC Loop

```
WHILE ITERATION < MAX_ITERATIONS:
    ITERATION += 1
    Report: "═══ Loop iteration [ITERATION]/[MAX_ITERATIONS] ═══"

    ── 2a. Run Implement ──────────────────────────────────
    Build `PRIOR_BUG_ATTEMPTS` from `ITERATION_LOG`: per remaining BUG task, count prior iterations + prior error from `## Bug Context`.
    Extract `BUG_CONTEXT` from latest `qc-report.md § Bug Context` (per-task error output, stack traces).
    Pass `LOOP_ITERATION = ITERATION`, `PRIOR_BUG_ATTEMPTS`, `BUG_CONTEXT` to implement → Developer sub-agent.

    **Escalation rules** (per BUG task):
    - Attempt 1-2: Normal fix
    - Attempt 3: Append `[ESCALATED]` tag (preserving existing `[BUG:severity]`). Developer receives full prior attempt log.
    - Attempt 4+: Move to `## Deferred Issues`. Append `[DEFERRED]` tag. Exclude from further iterations.

    Load+execute `.github/skills/implement-tasks/SKILL.md` (full workflow).

    Check result:
    - Implement halted by user → LOOP_END_REASON="halted by user" → BREAK
    - `.completed` not created → LOOP_END_REASON="no .completed" → BREAK
    - Re-read tasks.md; any non-`[DEFERRED]` `- [ ]` remains → delete stale `.completed`,
      LOOP_END_REASON="tasks incomplete" → BREAK

    ── 2b. Run QC ─────────────────────────────────────────
    Record pre-run state: existence/contents of `.qc-passed` and `manual-test.md`.

    Load+execute `.github/skills/quality-control/SKILL.md` (full workflow).

    Check result:
    - qc-report.md=PASS AND `.qc-passed` created/updated:
      - `[DEFERRED]` tasks exist in tasks.md → LOOP_END_REASON="partial pass (deferred remain)" → BREAK
      - No deferred tasks → LOOP_END_REASON="qc passed" → BREAK
    - `.qc-passed` created/changed BUT report≠PASS
      → LOOP_END_REASON="qc artifact inconsistency" → BREAK
    - `manual-test.md` created/changed OR report requires manual testing
      → LOOP_END_REASON="manual test needed" → BREAK
    - Only CRITICAL PI violations (no test/lint/requirement failures)
      → LOOP_END_REASON="PI violations" → BREAK
    - Otherwise (QC failed, bug tasks appended, .completed deleted)
      → count new [BUG] tasks, report, CONTINUE

    ── 2c. Iteration Bookkeeping ──────────────────────────
    1. **Context reset**: Compress to:
       ITERATION_LOG[ITERATION] = {
         bugs_entering: [IDs], bugs_resolved: [IDs], bugs_remaining: [IDs],
         regressions: [IDs], tests: "X/Y", coverage: "Z%"
       }
       `regressions` = new `[RECURRING]` bug tasks first appearing this iteration (previously-resolved bugs that regressed).
       Release detailed implement/QC output.

    2. **Telemetry**: Append to `FEATURE_DIR/loop-log.md`:
       ## Iteration [N]/[MAX]
       - Entering: [IDs] | Resolved: [IDs] | Remaining: [IDs]
       - Regressions: [IDs] | Tests: [X/Y] (was [X'/Y']) | Coverage: [Z%] (was [Z'%])

    3. **Zero-progress**: `bugs_resolved` empty AND no regressions fixed AND no bugs newly escalated or deferred this iteration → `ZERO_PROGRESS_COUNT += 1`. Else reset `ZERO_PROGRESS_COUNT = 0`.
       `ZERO_PROGRESS_COUNT >= 2` → LOOP_END_REASON="zero progress" → BREAK.

    ── 2d. Deferred Issues ────────────────────────────────
    - `[DEFERRED]` tasks excluded from bug counts for QC pass/fail.
    - QC evaluates only non-deferred tasks.

END WHILE
```

`ITERATION == MAX_ITERATIONS` without QC pass → `LOOP_END_REASON = "safety limit"`.

## 3. Final Status Report

**QC passed:**
```
✓ Feature QC passed after [ITERATION] iteration(s).
  - Total bug-fix cycles: [ITERATION - 1]
  - Final artifacts: .completed ✓, .qc-passed ✓, qc-report.md ✓
```
Suggest next steps (commit, push, PR).

**QC did NOT pass:**
```
✗ Loop ended after [ITERATION] iteration(s) without QC passing.
  - Reason: [LOOP_END_REASON]
  - Latest QC report: FEATURE_DIR/qc-report.md
  - Remaining bug tasks in: FEATURE_DIR/tasks.md
```
Suggest: "Review `qc-report.md`. Run `/sddp-implement` + `/sddp-qc` manually, or re-run `/sddp-implement-qc-loop`."

**Partial pass (deferred remain):**
```
✓~ QC passed with deferred issues after [ITERATION] iteration(s).
  - Deferred: [count] (see ## Deferred Issues in tasks.md)
  - Artifacts: .completed ✓, .qc-passed ✓, qc-report.md ✓
```
Suggest: "Review deferred issues in `tasks.md § Deferred Issues`. Fix and re-run `/sddp-qc`, or accept as-is."

**If manual-test.md generated** → also suggest: "Complete manual verification in `manual-test.md`, then re-run `/sddp-qc`."

</workflow>
