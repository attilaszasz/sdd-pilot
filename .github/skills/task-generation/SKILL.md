---
name: task-generation
description: "Decomposes implementation plans into actionable, developer-ready task lists organized by phase and user story. Use when breaking down a plan into tasks, creating task lists, organizing implementation work into phases, or when generating dependency graphs for parallel execution."
---

# Task Generation Guide

## Task Format (REQUIRED)

Every task MUST strictly follow this format:

```
- [ ] T### [P?] [US#?] {FR-###?} Description with file path
```

### Format Components
1. **Checkbox**: Always `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential (T001, T002...) in execution order
3. **`[P]` marker**: Only if parallelizable (different files, no dependencies)
4. **`[US#]` label**: Required for user story phases only (e.g., `[US1]`, `[US2]`)
   - Setup/Foundational phases: NO story label
   - User Story phases: MUST have story label
   - Polish phase: NO story label
5. **`{FR-###}` tag**: Links task to the functional requirement(s) it implements
   - Use `{FR-001}` for a single requirement, `{FR-001,FR-003}` for multiple
   - Required for tasks that directly implement a functional requirement
   - Setup/infrastructure tasks with no direct FR mapping may omit this tag
6. **Description**: Clear action with exact file path

### Examples
- ✅ `- [ ] T001 Update workspace scripts in package.json`
- ✅ `- [ ] T005 [P] {FR-002} Implement auth middleware in src/middleware/auth.py`
- ✅ `- [ ] T012 [P] [US1] {FR-005} Create User model in src/models/user.py`
- ✅ `- [ ] T014 [US1] {FR-003,FR-004} Implement user registration in src/services/auth.py`
- ❌ `- [ ] Create User model` (missing ID)
- ❌ `T001 [US1] Create model` (missing checkbox)

## Phase Structure

Optional preamble sections (`Project Mode`, `Epic / Capability Map`, `Brownfield Notes`) may precede the first phase header — see the [template](assets/tasks-template.md) for details.

### Optional Phase 1: Setup (Repository / Workspace Delta)
- Include only when the feature changes repository-root tooling, workspace config, shared project wiring, or other repo-level scaffolding
- Omit when empty
- No story labels

### Optional Phase 2: Foundational (Cross-Story Blockers)
- Include only for true blockers shared by multiple stories
- Omit when empty
- If present, complete before dependent user stories
- No story labels

### Phase 3+: User Stories (One Phase Per Story, by Priority)
- Each phase = one complete user story
- Within each: Tests (if requested) → Models → Services → Endpoints → Integration
- Each phase independently testable
- Story-local setup, integration, compatibility, migration, and rollout tasks stay in-story unless they truly block multiple stories
- Story labels required: `[US1]`, `[US2]`, etc.
- Mark the first P1 story phase with `🎯 MVP`. If multiple stories share P1 priority, apply the emoji to each P1 phase.

### Optional Final Phase: Polish & Cross-Cutting Concerns
- Documentation, refactoring, optimization, security hardening, and other work spanning multiple stories
- Omit when empty
- No story labels

## Project Mode

Infer the task-generation mode from the plan and repository context:

- **Greenfield**: Initial project/workspace setup is part of this feature
- **Brownfield**: The feature extends an existing codebase and should avoid generic bootstrap tasks
- **Mixed**: The feature adds targeted repo/workspace changes plus enhancement work in existing code

Record the mode in `tasks.md` when helpful. Use it to guide whether Setup/Foundational phases are warranted.

Number phases sequentially based on the phases that are actually present. If Setup and/or Foundational are omitted, the first included User Story phase should use the next sequential phase number.

## Organization Rules

1. **From User Stories** (PRIMARY): Each P1/P2/P3 story gets its own phase
2. **From Contracts** (if generated): Map each endpoint to its user story
3. **From Data Model** (if generated): Map entities to stories; lift entities into Setup/Foundational only when they truly block multiple stories
4. **From Infrastructure**:
   - Repo/workspace delta → Setup
   - Cross-story blockers → Foundational
   - Story-specific setup/integration/migration/rollout → in-story
5. **Brownfield Heuristics**: Prefer integration, compatibility, migration/backfill, feature-flag, rollout, and regression-verification tasks over generic project initialization in mature repositories
6. **Just-in-Time Shared Work**: Create shared structures in the earliest story that needs them unless they are true cross-story blockers

## Dependency Rules
- Setup has no dependencies when present
- Foundational depends on Setup when both are present
- User stories depend on any present shared phases; if no shared phases exist, user stories can start immediately
- Within stories: tests before implementation, models before services, services before endpoints
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

**Size budget:** Keep `tasks.md` at or below **6KB**. Target 5–10 tasks per user story phase; if total tasks exceed 40, split the feature into sub-features.
