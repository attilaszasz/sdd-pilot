---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `specs/[feature-folder]/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`

**Tests**: Include test tasks only when explicitly requested in the spec or when the user asks for TDD.

**Organization**: Keep tasks grouped by user story. Only lift work into shared phases when it truly affects the repository/workspace or blocks multiple stories.

**Phase numbering**: Renumber phases sequentially based on the sections you actually include. If Setup and/or Foundational are omitted, the first user story phase should use the next sequential phase number. Example: if Setup is omitted → Phase 1: Foundational → Phase 2: US1 → Phase 3: US2 → Phase 4: Polish.

## Project Mode

`[Greenfield | Brownfield | Mixed]`

- `Greenfield`: The feature introduces initial project/workspace setup.
- `Brownfield`: The feature extends an existing codebase and should avoid generic bootstrap tasks.
- `Mixed`: The feature adds targeted repo/workspace changes plus enhancement work in existing code.

## Epic / Capability Map *(OPTIONAL)*

- `[US1]` → [Capability or epic slice]
- `[US2]` → [Capability or epic slice]

## Brownfield Notes *(OPTIONAL)*

- Existing flows touched: [paths / modules / systems]
- Compatibility or migration concerns: [backfill, rollout, adapters, feature flags]
- Regression focus: [existing journeys that must keep working]

## Phase 1: Setup (Repository / Workspace Delta) *(OPTIONAL)*

**Include only when this feature changes repository-root tooling, workspace config, shared project wiring, or cross-cutting scaffolding. Omit when empty.**

- [ ] T001 Update workspace scripts in package.json
- [ ] T002 [P] Add shared feature flag config in config/feature-flags.[ext]

---

## Phase 2: Foundational (Cross-Story Blockers) *(OPTIONAL)*

**Include only for true blockers shared by multiple stories. Omit when empty. Story-local setup belongs inside the relevant story phase.**

- [ ] T003 Create shared domain event schema in src/domain/[shared_entity].[ext]
- [ ] T004 [P] Implement shared policy middleware in src/middleware/[shared_policy].[ext]

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

- [ ] T005 [P] [US1] {FR-001} Create [Entity] model in src/models/[entity].[ext]
- [ ] T006 [US1] {FR-002} Implement [Service] in src/services/[service].[ext]
- [ ] T007 [US1] {FR-003} Implement [endpoint/feature] in src/[location]/[file].[ext]
- [ ] T008 [US1] {FR-003} Add validation and error handling in src/[location]/[file].[ext]

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

- [ ] T009 [P] [US2] {FR-004} Create [Entity] model in src/models/[entity_two].[ext]
- [ ] T010 [US2] {FR-005} Implement integration/update flow in src/services/[service_two].[ext]
- [ ] T011 [US2] {FR-006} Add compatibility or migration handling in src/[location]/[migration_file].[ext]

---

## Phase N: Polish & Cross-Cutting Concerns *(OPTIONAL)*

**Include only for work that affects multiple stories after story delivery is in place. Omit when empty.**

- [ ] T012 [P] Update feature documentation in docs/[feature].md
- [ ] T013 [P] Harden shared monitoring or security checks in src/[cross_cutting]/[file].[ext]

---

## Dependencies

Setup (if present) → Foundational (if present) → User Stories (by priority) → Polish (if present)

- If **Setup** is omitted, start with **Foundational** or the first User Story phase.
- If **Foundational** is omitted, User Stories depend only on **Setup** (if present) or can start immediately.
- Tasks marked `[P]` can run in parallel within their phase.
- Shared work should appear in Setup/Foundational only when it truly affects multiple stories; otherwise place it in the earliest story that needs it.
