---
name: task-generation
description: "Decomposes implementation plans into actionable, developer-ready task lists organized by phase and prioritized work item. Use when breaking down a plan into tasks, creating task lists, organizing implementation work into phases, or when generating dependency graphs for parallel execution."
---

# Task Generation Guide

## Task Format (REQUIRED)

Every task MUST strictly follow this format:

```
- [ ] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} [COMPLETES (FR|TR|OR|RR)-###?] Description with file path [after:T###?] [← T###:Symbol?] [→ exports: Symbol?]
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
7. **`after:T###` clause** *(optional)*: Explicit task-level dependency when a task depends on artifacts from a different phase or a non-adjacent task within the same phase. Omit when sequential T### ordering within a phase already implies the dependency.
8. **`← T###:Symbol` import hint** *(optional)*: Lists specific symbols consumed from another task's output file, by source task ID. Use when `data-model.md`, `contracts/`, or the Requirement Coverage Map provide enough detail to name the symbols. Omit for leaf tasks with no cross-file coupling.
9. **`→ exports: Symbol(params)` export hint** *(optional)*: Lists the 1–3 most important symbols this task's file will export, with key parameter or field hints. Source from `data-model.md` entities, `contracts/` schemas, or the Requirement Coverage Map. Omit when no downstream task depends on this file.
10. **`[COMPLETES (FR|TR|OR|RR)-###]` marker** *(optional)*: Placed on the last task implementing a requirement that spans 3+ tasks. Signals the implementing agent to verify the full requirement chain at this task's completion.

### Annotation Constraints
- Only emit `← T###:` and `→ exports:` annotations when at least one annotation source is available: `data-model.md`, `contracts/`, or a Requirement Coverage Map row with enough symbol-level detail. When none are available, fall back to description-only tasks.
- The full task line (checkbox + ID + markers + description + all annotations) must stay under **200 characters**.
- When a task has >3 imports: replace inline `← T###:Symbol` with `← contracts/[endpoint].yaml`.
- When a task has >3 exports: replace inline list with `→ see data-model.md#EntityName`.
- When both overflow: keep only `after:T###` and omit symbol-level detail.

### Examples
- ✅ `- [ ] T001 Update workspace scripts in package.json`
- ✅ `- [ ] T005 [P] {FR-002} Implement auth middleware in src/middleware/auth.py`
- ✅ `- [ ] T012 [P] [US1] {FR-005} Create User model in src/models/user.py → exports: UserModel(id,email,role)`
- ✅ `- [ ] T013 [US1] {FR-006} Implement user service in src/services/user.py ← T012:UserModel → exports: UserService.register()`
- ✅ `- [ ] T014 [OBJ1] {TR-003,TR-004} Implement migration orchestration in src/services/migrations.py`
- ✅ `- [ ] T018 [US2] {FR-003} [COMPLETES FR-003] Add order endpoint in src/api/orders.py after:T015 ← T015:OrderService`
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

1. **From Requirement Coverage Map** (PRIMARY): If `plan.md` has a `## Requirement Coverage Map` table, use it as the authoritative source for mapping requirements to components and file paths. Each row provides `Req ID → Component(s) → File Path(s)` — use this to assign tasks to the correct work-item phases.
2. **From Product User Stories or Non-Product Objectives**: Each P1/P2/P3 work item gets its own phase
3. **From Contracts** (if generated): Map each endpoint to the relevant story or objective
4. **From Data Model** (if generated): Map entities to work items; lift entities into Setup/Foundational only when they truly block multiple work items
5. **From Infrastructure**:
   - Repo/workspace delta → Setup
   - Cross-work-item blockers → Foundational
   - Work-item-specific setup/integration/migration/rollout → in-phase
5. **Brownfield Heuristics**: Prefer integration, compatibility, migration/backfill, feature-flag, rollout, and regression-verification tasks over generic project initialization in mature repositories
6. **Just-in-Time Shared Work**: Create shared structures in the earliest work item that needs them unless they are true cross-work-item blockers
7. **Requirement Completion Point**: When a requirement `{FR-###}` (or `TR-###`/`OR-###`/`RR-###`) is implemented across 3+ tasks, the LAST task carrying that tag MUST include the suffix `[COMPLETES (FR|TR|OR|RR)-###]`. This signals the implementing agent to verify the full requirement at that task's completion rather than deferring to QC.

## Dependency Rules
- Setup has no dependencies when present
- Foundational depends on Setup when both are present
- Delivery work items depend on any present shared phases; if no shared phases exist, they can start immediately
- Within work items: tests before implementation, models before services, services before endpoints
- Polish depends on all desired stories being complete when present
- **Cross-phase task edges**: When a task in one work-item phase depends on artifacts from a prior work-item phase, add `after:T###` referencing the producing task. This makes the dependency explicit for resume and parallel-safety checks.
- **Parallel safety**: A task with `after:T###` or `← T###:Symbol` MUST NOT be marked `[P]` in the same batch as the referenced task. The WBS Generator must validate this in its self-correction step.

## Tests
Tests are **OPTIONAL** — only include if explicitly requested in the spec or user asks for TDD.
If included, tests MUST be written and FAIL before implementation.

## Artifact Conventions

Preservation rules: see `.github/skills/artifact-conventions/SKILL.md` (read during edit/remediation phases).

## Template

Use the template at [assets/tasks-template.md](assets/tasks-template.md).

Use the fixture at [assets/tasks-annotation-fixture.md](assets/tasks-annotation-fixture.md) to dry-run parser behavior, dependency edges, and completion-point examples before changing task format rules.

When generating `tasks.md`, omit empty optional sections rather than leaving placeholder phases with filler tasks.

**Size budget:** Keep `tasks.md` at or below **6KB**. Target 5–10 tasks per work-item phase; if total tasks exceed 40, split the feature into sub-features.
