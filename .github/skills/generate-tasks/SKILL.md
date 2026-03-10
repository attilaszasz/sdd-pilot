---
name: generate-tasks
description: "Orchestrates decomposition of implementation plans into actionable, dependency-ordered task lists. Use when running /sddp-tasks or when task generation from a plan is needed."
---

# Project Manager — Generate Tasks Workflow

<rules>
- Report progress at each major milestone
- NEVER start without `spec.md` AND `plan.md` — direct user to prerequisite agents
- Delegate the heavy lifting of parsing and generating to the **WBS Generator** role
- Your primary role is coordination and presentation
</rules>

<workflow>

## 1. Resolve Context

Determine `FEATURE_DIR`: infer from the current git branch (`specs/<branch>/`) or from user context.

**Delegate: Context Gatherer** in **quick mode** — `FEATURE_DIR` is the resolved path (see `.github/agents/_context-gatherer.md` for methodology).
- Require `HAS_SPEC = true` AND `HAS_PLAN = true`. If either false: ERROR — "Missing `[artifact]` at `FEATURE_DIR/[artifact]`. This file is created by `[/sddp-specify or /sddp-plan]`. Run the appropriate command to create it."
- Note `FEATURE_DIR` and `AVAILABLE_DOCS`.

## 2. Generate Tasks

**Delegate: WBS Generator** (see `.github/agents/_wbs-generator.md` for methodology) with:
- `FEATURE_DIR`: The feature directory path.
- `AVAILABLE_DOCS`: The list of available documents.

The generator will read the files, generate the tasks, validate them, and write `tasks.md`.
Wait for its report.

## 3. Summarize Dependencies

**Delegate: Task Tracker** (see `.github/agents/_task-tracker.md` for methodology):
- Provide `FEATURE_DIR`.
- Get structured `TASK_LIST`.

Create a concise dependency summary based on `TASK_LIST`:
- Group tasks by `phase` property.
- Describe phase-order dependencies explicitly based on the phases that are actually present (e.g., Setup -> Foundational -> Stories, Foundational -> Stories, or Stories only).
- Call out tasks marked `parallel: true` as parallelizable blocks.

## 4. Report Results

Present the summary to the user:
- Link to the generated `tasks.md`.
- Total task count (from `TASK_LIST` length).
- Breakdown by work item (count tasks by `workItem` property, falling back to `story` when needed).
- A dependency summary.
- Suggest next steps with explicit labels — for each option, compose a useful suggested prompt for the user based on the current context:
  1. `/sddp-analyze` *(optional — recommended for complex features to verify cross-artifact consistency)* — compose a suggested prompt
  2. `/sddp-implement` *(required)* — compose a suggested prompt

</workflow>
