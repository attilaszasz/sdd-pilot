---
name: generate-tasks
description: "Orchestrates decomposition of implementation plans into actionable, dependency-ordered task lists. Use when running /sddp-tasks or when task generation from a plan is needed."
---

# Project Manager — Generate Tasks Workflow

<rules>
- Report compact progress at each major milestone: outcome, key delta, next step
- NEVER start without `spec.md` AND `plan.md` — direct user to prerequisite agents
- Delegate the heavy lifting of parsing and generating to the **WBS Generator** role
- Your primary role is coordination and presentation
</rules>

<workflow>

## 0. Acquire Shared Skills

## 1. Resolve Context

Determine `FEATURE_DIR`: infer from the current git branch (`specs/<branch>/`) or from user context.

**Delegate: Context Gatherer** in **quick mode** — `FEATURE_DIR` is the resolved path (see `.github/agents/_context-gatherer.md` for methodology).
- Require `HAS_SPEC = true` AND `HAS_PLAN = true`. If either false: ERROR — "Missing `[artifact]` at `FEATURE_DIR/[artifact]`. This file is created by `[/sddp-specify or /sddp-plan]`. Run the appropriate command to create it."
- Note `FEATURE_DIR` and `AVAILABLE_DOCS`.

## 1.5. Plan → Tasks Gate

Mandatory structural validation of `plan.md` before generating `tasks.md`. Blocks the Tasks phase on FAIL.

**Delegate: Plan Validator** (`.github/agents/_plan-validator.md`):
- `PlanPath`: `FEATURE_DIR/plan.md`
- `SpecPath`: `FEATURE_DIR/spec.md`

Parse the returned verdict (`Result: PASS | FAIL`, `Score`, `Failing Items`, `Recommendations`).

- **PASS** → continue to Step 2.
- **FAIL**:
  - Report the failing items and recommendations table.
  - **Autopilot guard (PM0)**: `AUTOPILOT = true` → **HALT**. Log a `halt` row to `FEATURE_DIR/autopilot-log.md` (when present): Timestamp=now, Phase=`Tasks`, Event=`halt`, Detail="Plan → Tasks gate FAIL", Outcome="Halt task generation", Rationale="mandatory structural validation failed", Artifacts=`[plan.md](plan.md)`. Do not proceed to generation.
  - `AUTOPILOT = false` → prompt the user:
    - "**Fix plan and retry** (recommended) — resolve the failing items, then re-run `/sddp-tasks`"
    - "**Proceed anyway** — generate tasks despite the validation failures (downstream tasks may miss P1 coverage or carry broken dependencies)"
    - Handle choice: "Fix and retry" → halt, direct user to `/sddp-plan`. "Proceed anyway" → continue to Step 2 (the bypass is recorded only in this conversation; no persistent marker is written).

## 2. Generate Tasks

**Delegate: WBS Generator** (see `.github/agents/_wbs-generator.md` for methodology) with:
- `FEATURE_DIR`: The feature directory path.
- `AVAILABLE_DOCS`: The list of available documents.

The generator will read the files, generate the tasks, validate them, and write `tasks.md`.
Wait for its report.

## 3. Summarize Dependencies

**Delegate: Task Tracker** (`.github/agents/_task-tracker.md`):
- Provide `FEATURE_DIR` → get structured `TASK_LIST`.

From `TASK_LIST`:
- Group by `phase` property.
- Describe phase-order dependencies based on phases present (e.g., Setup → Foundational → Stories).
- Call out `parallel: true` tasks as parallelizable blocks.

## 4. Report Results

Present:
- Link to `tasks.md`
- Total task count (`TASK_LIST` length)
- Breakdown by `workItem` (fall back to `story`)
- Dependency summary
- Next steps (compose suggested prompts per option):
  1. `/sddp-analyze` *(optional — recommended for complex features)*
  2. `/sddp-implement` *(required)*

</workflow>
