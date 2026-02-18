---
name: task-generation
description: "Decomposes implementation plans into actionable, developer-ready task lists organized by phase and user story. Use when breaking down a plan into tasks, creating task lists, organizing implementation work into phases, or when generating dependency graphs for parallel execution."
---

# Task Generation Guide

## Task Format (REQUIRED)

Every task MUST strictly follow this format:

```
- [ ] T### [P?] [US#?] Description with file path
```

### Format Components
1. **Checkbox**: Always `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential (T001, T002...) in execution order
3. **`[P]` marker**: Only if parallelizable (different files, no dependencies)
4. **`[US#]` label**: Required for user story phases only (e.g., `[US1]`, `[US2]`)
   - Setup/Foundational phases: NO story label
   - User Story phases: MUST have story label
   - Polish phase: NO story label
5. **Description**: Clear action with exact file path

### Examples
- ✅ `- [ ] T001 Create project structure per implementation plan`
- ✅ `- [ ] T005 [P] Implement auth middleware in src/middleware/auth.py`
- ✅ `- [ ] T012 [P] [US1] Create User model in src/models/user.py`
- ❌ `- [ ] Create User model` (missing ID)
- ❌ `T001 [US1] Create model` (missing checkbox)

## Phase Structure

### Phase 1: Setup (Project Initialization)
- Project structure, dependencies, config
- No story labels

### Phase 2: Foundational (Blocking Prerequisites)
- ⚠️ MUST complete before ANY user story
- Core infrastructure all stories depend on
- No story labels

### Phase 3+: User Stories (One Phase Per Story, by Priority)
- Each phase = one complete user story
- Within each: Tests (if requested) → Models → Services → Endpoints → Integration
- Each phase independently testable
- Story labels required: `[US1]`, `[US2]`, etc.

### Final Phase: Polish & Cross-Cutting Concerns
- Documentation, refactoring, optimization, security hardening
- No story labels

## Organization Rules

1. **From User Stories** (PRIMARY): Each P1/P2/P3 story gets its own phase
2. **From Contracts** (if generated): Map each endpoint to its user story
3. **From Data Model** (if generated): Map entities to stories; shared entities go to Setup/Foundational
4. **From Infrastructure**: Shared → Setup; blocking → Foundational; story-specific → in-story

## Dependency Rules
- Setup has no dependencies
- Foundational depends on Setup — blocks all user stories
- User stories depend on Foundational — can then proceed in parallel
- Within stories: tests before implementation, models before services, services before endpoints
- Polish depends on all desired stories being complete

## Tests
Tests are **OPTIONAL** — only include if explicitly requested in the spec or user asks for TDD.
If included, tests MUST be written and FAIL before implementation.

## Template

Use the template at [assets/tasks-template.md](assets/tasks-template.md).
