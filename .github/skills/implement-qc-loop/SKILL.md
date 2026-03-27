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

Initialize: `ITERATION = 0`, `MAX_ITERATIONS = 10`, `LOOP_END_REASON = ""`.

## 2. Implement → QC Loop

```
WHILE ITERATION < MAX_ITERATIONS:
    ITERATION += 1
    Report: "═══ Loop iteration [ITERATION]/[MAX_ITERATIONS] ═══"

    ── 2a. Run Implement ──────────────────────────────────
    Load+execute `.github/skills/implement-tasks/SKILL.md` (full workflow).

    Check result:
    - Implement halted by user → LOOP_END_REASON="halted by user" → BREAK
    - `.completed` not created → LOOP_END_REASON="no .completed" → BREAK
    - Re-read tasks.md; any `- [ ]` remains → delete stale `.completed`,
      LOOP_END_REASON="tasks incomplete" → BREAK

    ── 2b. Run QC ─────────────────────────────────────────
    Record pre-run state: existence/contents of `.qc-passed` and `manual-test.md`.

    Load+execute `.github/skills/quality-control/SKILL.md` (full workflow).

    Check result:
    - qc-report.md=PASS AND `.qc-passed` created/updated
      → LOOP_END_REASON="qc passed" → BREAK
    - `.qc-passed` created/changed BUT report≠PASS
      → LOOP_END_REASON="qc artifact inconsistency" → BREAK
    - `manual-test.md` created/changed OR report requires manual testing
      → LOOP_END_REASON="manual test needed" → BREAK
    - Only CRITICAL PI violations (no test/lint/requirement failures)
      → LOOP_END_REASON="PI violations" → BREAK
    - Otherwise (QC failed, bug tasks appended, .completed deleted)
      → count new [BUG] tasks, report, CONTINUE

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

**If manual-test.md generated** → also suggest: "Complete manual verification in `manual-test.md`, then re-run `/sddp-qc`."

</workflow>
