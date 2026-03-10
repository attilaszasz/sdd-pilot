---
name: task-generation
description: "Decomposes implementation plans into actionable, developer-ready task lists organized by phase and prioritized work item. Use when breaking down a plan into tasks, creating task lists, organizing implementation work into phases, or when generating dependency graphs for parallel execution."
---

# Task Generation Guide

## Task Format (REQUIRED)

Every task MUST strictly follow this format:

```
- [ ] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} Description with file path
```

### Format Components
1. **Checkbox**: Always `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential (T001, T002...) in execution order
3. **`[P]` marker**: Only if parallelizable (different files, no dependencies)
4. **`[US#|OBJ#]` label**: Required for delivery phases only
   - Product specs use `[US#]` for user story phases
   - Technical and operational specs use `[OBJ#]` for objective phases
   - Setup/Foundational phases: NO work-item label
   - Polish phase: NO story label
5. **`{(FR|TR|OR|RR)-###}` tag**: Links task to the requirement(s) it implements
   - Use `{FR-001}` or `{TR-001}` for a single requirement, `{FR-001,FR-003}` for multiple
   - Required for tasks that directly implement a requirement
   - Setup/infrastructure tasks with no direct requirement mapping may omit this tag
6. **Description**: Clear action with exact file path

### Examples
- ✅ `- [ ] T001 Update workspace scripts in package.json`
- ✅ `- [ ] T005 [P] {FR-002} Implement auth middleware in src/middleware/auth.py`
- ✅ `- [ ] T012 [P] [US1] {FR-005} Create User model in src/models/user.py`
- ✅ `- [ ] T014 [OBJ1] {TR-003,TR-004} Implement migration orchestration in src/services/migrations.py`
- ❌ `- [ ] Create User model` (missing ID)
- ❌ `T001 [US1] Create model` (missing checkbox)

## Phase Structure

Optional preamble sections (`Project Mode`, `Epic / Capability Map`, `Brownfield Notes`) may precede the first phase header — see the [template](assets/tasks-template.md) for details.

### Optional Phase 1: Setup (Repository / Workspace Delta)
- Include only when the feature changes repository-root tooling, workspace config, shared project wiring, or other repo-level scaffolding
- Omit when empty
- No story labels

### Optional Phase 2: Foundational (Cross-Work-Item Blockers)
- Include only for true blockers shared by multiple work items
- Omit when empty
- If present, complete before dependent work items
- No story labels

### Phase 3+: Delivery Work Items (One Phase Per Story or Objective, by Priority)
- Each phase = one complete user story or objective
- Within each: Tests (if requested) → Models → Services → Endpoints → Integration
- Each phase independently testable
- Work-item-local setup, integration, compatibility, migration, and rollout tasks stay in-phase unless they truly block multiple work items
- Product phases use `[US#]`; technical and operational phases use `[OBJ#]`
- Mark the first P1 work-item phase with `🎯 MVP`. If multiple work items share P1 priority, apply the emoji to each P1 phase.

### Optional Final Phase: Polish & Cross-Cutting Concerns
- Documentation, refactoring, optimization, security hardening, and other work spanning multiple work items
- Omit when empty
- No story labels

## Project Mode

Infer the task-generation mode from the plan and repository context:

- **Greenfield**: Initial project/workspace setup is part of this feature
- **Brownfield**: The feature extends an existing codebase and should avoid generic bootstrap tasks
- **Mixed**: The feature adds targeted repo/workspace changes plus enhancement work in existing code

Record the mode in `tasks.md` when helpful. Use it to guide whether Setup/Foundational phases are warranted.

Number phases sequentially based on the phases that are actually present. If Setup and/or Foundational are omitted, the first included delivery phase should use the next sequential phase number.

## Organization Rules

1. **From Product User Stories or Non-Product Objectives** (PRIMARY): Each P1/P2/P3 work item gets its own phase
2. **From Contracts** (if generated): Map each endpoint to the relevant story or objective
3. **From Data Model** (if generated): Map entities to work items; lift entities into Setup/Foundational only when they truly block multiple work items
4. **From Infrastructure**:
   - Repo/workspace delta → Setup
   - Cross-work-item blockers → Foundational
   - Work-item-specific setup/integration/migration/rollout → in-phase
5. **Brownfield Heuristics**: Prefer integration, compatibility, migration/backfill, feature-flag, rollout, and regression-verification tasks over generic project initialization in mature repositories
6. **Just-in-Time Shared Work**: Create shared structures in the earliest work item that needs them unless they are true cross-work-item blockers

## Dependency Rules
- Setup has no dependencies when present
- Foundational depends on Setup when both are present
- Delivery work items depend on any present shared phases; if no shared phases exist, they can start immediately
- Within work items: tests before implementation, models before services, services before endpoints
- Polish depends on all desired stories being complete when present

## Tests
Tests are **OPTIONAL** — only include if explicitly requested in the spec or user asks for TDD.
If included, tests MUST be written and FAIL before implementation.

## Artifact Conventions

Key rules for task generation (full preservation rules are in `.github/skills/artifact-conventions/SKILL.md` — read only during edit/remediation phases like `/sddp-implement`, `/sddp-analyze`, `/sddp-clarify`):

- Do NOT remove the **Dependencies** section — it defines the phase graph that implementation agents traverse
- Do NOT remove present phase headers — they delineate execution boundaries
- Do NOT change existing task IDs (T###) — they are cross-referenced in coverage maps, dependency graphs, and issue trackers
- Preserve checkbox state (`- [ ]` vs `- [X]`) — the only valid transition is `[ ]` → `[X]` (task completed)
- Never reverse completion: `[X]` → `[ ]` requires explicit user approval

## Template

Use the template at [assets/tasks-template.md](assets/tasks-template.md).

When generating `tasks.md`, omit empty optional sections rather than leaving placeholder phases with filler tasks.

**Size budget:** Keep `tasks.md` at or below **6KB**. Target 5–10 tasks per work-item phase; if total tasks exceed 40, split the feature into sub-features.
