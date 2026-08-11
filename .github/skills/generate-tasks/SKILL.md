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
- Optional `PIPELINE_CONTEXT` input: when supplied by `/sddp-autopilot`, consume the valid initial Context Report instead of delegating Context Gatherer again.
- Optional `P1_REQUIREMENT_SNAPSHOT` input: an ephemeral post-Clarify snapshot used only to avoid reparsing P1 IDs at the Plan → Tasks gate. It is never persisted or folded into `PIPELINE_CONTEXT`.
</rules>

<workflow>

## 0. Acquire Shared Skills

## 1. Resolve Context

If `PIPELINE_CONTEXT` is supplied, reports `CONTEXT_BLOCKED` as `false`, has a non-empty `FEATURE_DIR`, and its `BRANCH` still matches the current branch when Git is available, consume its stable `FEATURE_DIR` and `AUTOPILOT` fields without delegating Context Gatherer. Re-check `spec.md`, `plan.md`, and the optional document list on disk.

If `PIPELINE_CONTEXT` is absent or invalid, determine `FEATURE_DIR` from the current git branch (`specs/<branch>/`) or from user context and **Delegate: Context Gatherer** in **quick mode** — `FEATURE_DIR` is the resolved path (see `.github/agents/_context-gatherer.md` for methodology).
- Require `HAS_SPEC = true` AND `HAS_PLAN = true`. If either false: ERROR — "Missing `[artifact]` at `FEATURE_DIR/[artifact]`. This file is created by `[/sddp-specify or /sddp-plan]`. Run the appropriate command to create it."
- Note `FEATURE_DIR` and recompute `AVAILABLE_DOCS` from the current feature workspace; never rely on an initial snapshot for optional artifacts.
- Run `node scripts/parse-requirement-ownership.mjs "FEATURE_DIR/spec.md"` before using `P1_REQUIREMENT_SNAPSHOT`. Require valid parser output, a lowercase 64-character `specSha256` matching the parser's exact-byte digest, and `requirementIds` exactly equal to the parser's ordered `p1RequirementIds`. On absent, malformed, unreadable, checksum-mismatched, empty-when-P1, or partial snapshots, omit `P1RequirementIds`; Plan Validator runs the same live parser. An empty list is accepted only when the successful parser also returns an empty list.

## 1.5. Plan → Tasks Gate

Mandatory structural validation of `plan.md` before generating `tasks.md`. Blocks the Tasks phase on FAIL.

**Delegate: Plan Validator** (`.github/agents/_plan-validator.md`):
- `PlanPath`: `FEATURE_DIR/plan.md`
- `SpecPath`: `FEATURE_DIR/spec.md`
- `P1RequirementIds`: pass snapshot IDs only when checksum and ordered IDs exactly match successful live parser output; omit this optional input on any mismatch so mandatory live validation remains active.

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
