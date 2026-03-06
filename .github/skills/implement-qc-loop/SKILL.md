---
name: implement-qc-loop
description: "Runs Implement → QC in a continuous loop until QC passes or a safety limit is reached. Combines /sddp-implement and /sddp-qc into a single uninterrupted workflow."
---

# Software Engineer — Implement + QC Loop Workflow

<rules>
- This workflow orchestrates `/sddp-implement` and `/sddp-qc` in a single turn — it does **not** duplicate their logic. It loads and executes each sub-skill inline.
- **Safety limit**: Maximum **10** iterations. After 10 failed cycles, halt and present the latest `qc-report.md` to the user.
- Report a brief status at each iteration boundary: iteration number, bug tasks added, remaining failures.
- Follow the same gating rules as the sub-skills: `spec.md`, `plan.md`, `tasks.md` are required.
- **NEVER yield control between iterations** — this runs as one continuous turn until QC passes or the safety limit is reached.
- **Halt the loop early** (yield to user) if any of these occur:
  1. Implement halts due to a sequential task double-failure and user chooses "Halt"
  2. QC generates `manual-test.md` — automated looping cannot resolve manual verification needs
  3. Implement cannot produce `.completed` (catastrophic failure — 0 tasks completed)
  4. QC finds only CRITICAL `project-instructions.md` violations (these likely need human judgment)
- **Artifact conventions** (`.github/skills/artifact-conventions/SKILL.md`): All artifact rules from both sub-skills apply. Never reverse checkboxes, delete task lines, or modify IDs.
- Pass through all user confirmation requests from sub-skills (e.g., tool installation prompts from QC)
</rules>

<workflow>

## 1. Gate Check

Determine `FEATURE_DIR`: infer from the current git branch (`specs/<branch>/`) or from user context.

**Delegate: Context Gatherer** in **quick mode** — resolve `FEATURE_DIR`.

Verify the following exist in `FEATURE_DIR`:
- `spec.md` — if missing, halt: "Missing `spec.md`. Run `/sddp-specify` first."
- `plan.md` — if missing, halt: "Missing `plan.md`. Run `/sddp-plan` first."
- `tasks.md` — if missing, halt: "Missing `tasks.md`. Run `/sddp-tasks` first."

Initialize loop state:
- `ITERATION = 0`
- `MAX_ITERATIONS = 10`
- `LOOP_END_REASON = ""`

## 2. Implement → QC Loop

```
WHILE ITERATION < MAX_ITERATIONS:
    ITERATION += 1
    Report: "═══ Loop iteration [ITERATION]/[MAX_ITERATIONS] ═══"

    ── 2a. Run Implement ──────────────────────────────────
    Load and execute `.github/skills/implement-tasks/SKILL.md`
    (full workflow — gate check, context load, task execution, validation)

    Check result:
    - If implement halted due to user choosing "Halt" on a task failure:
        → Report: "Implementation halted by user at iteration [ITERATION]."
        → Set `LOOP_END_REASON = "halted by user"`
        → BREAK loop, go to Step 3
    - If `.completed` marker does NOT exist after implement finishes:
        → Report: "⚠ Implementation did not produce `.completed` — cannot proceed to QC."
        → Set `LOOP_END_REASON = "no .completed"`
        → BREAK loop, go to Step 3

    ── 2b. Run QC ─────────────────────────────────────────
    Before running QC, record the pre-run QC artifact state:
    - Whether `FEATURE_DIR/.qc-passed` exists and, if it exists, its current contents
    - Whether `FEATURE_DIR/manual-test.md` exists and, if it exists, its current contents

    Load and execute `.github/skills/quality-control/SKILL.md`
    (full workflow — context check, static analysis, requirements verification, report)

    Check result:
    - If `FEATURE_DIR/qc-report.md` reports `Overall Verdict: PASS`, OR `FEATURE_DIR/.qc-passed` now exists with contents different from the pre-run state:
        → Report: "✓ QC PASSED on iteration [ITERATION]!"
        → Set `LOOP_END_REASON = "qc passed"`
        → BREAK loop, go to Step 3
    - If `manual-test.md` was created or changed during this QC run, OR `qc-report.md` says manual testing is required:
        → Report: "⚠ QC generated manual-test.md — manual verification required. Pausing loop at iteration [ITERATION]."
        → Set `LOOP_END_REASON = "manual test needed"`
        → BREAK loop, go to Step 3
    - If QC failed with ONLY critical PI violations (no test/lint/requirement failures):
        → Report: "⚠ QC found only CRITICAL project-instructions.md violations — these likely need human judgment. Pausing loop at iteration [ITERATION]."
        → Set `LOOP_END_REASON = "PI violations"`
        → BREAK loop, go to Step 3
    - Otherwise (QC failed, bug tasks appended to tasks.md, .completed deleted):
        → Count new [BUG] tasks added to tasks.md
        → Report: "QC failed — [N] bug tasks added. Looping back to implement..."
        → CONTINUE loop

END WHILE
```

If the loop exited because `ITERATION == MAX_ITERATIONS` and QC has not passed:
- Report: "⚠ Safety limit reached ([MAX_ITERATIONS] iterations) without QC passing."
- Set `LOOP_END_REASON = "safety limit"`

## 3. Final Status Report

Summarize the loop outcome:

**If QC passed:**
```
✓ Feature QC passed after [ITERATION] iteration(s).
  - Total bug-fix cycles: [ITERATION - 1]
  - Final artifacts: .completed ✓, .qc-passed ✓, qc-report.md ✓
```
Suggest next steps (same as QC skill — commit, push, PR).

**If QC did NOT pass:**
```
✗ Loop ended after [ITERATION] iteration(s) without QC passing.
  - Reason: [LOOP_END_REASON]
  - Latest QC report: FEATURE_DIR/qc-report.md
  - Remaining bug tasks in: FEATURE_DIR/tasks.md
```
Suggest: "Review `qc-report.md` for details. You can run `/sddp-implement` and `/sddp-qc` manually, or re-run `/sddp-implement-qc-loop` to resume."

**If manual-test.md was generated:**
- Additionally suggest: "Complete the manual verification steps in `manual-test.md`, then re-run `/sddp-qc` to finalize."

</workflow>
