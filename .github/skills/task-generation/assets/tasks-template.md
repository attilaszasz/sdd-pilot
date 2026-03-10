---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `specs/[feature-folder]/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`

**Tests**: Include test tasks only when explicitly requested in the spec or when the user asks for TDD.

**Organization**: Keep tasks grouped by the primary delivery work item. Product specs group by user story (`US#`). Technical and operational specs group by objective (`OBJ#`). Only lift work into shared phases when it truly affects the repository/workspace or blocks multiple work items.

**Phase numbering**: Renumber phases sequentially based on the sections you actually include. If Setup and/or Foundational are omitted, the first delivery phase should use the next sequential phase number. Example: if Setup is omitted → Phase 1: Foundational → Phase 2: US1 or OBJ1 → Phase 3: US2 or OBJ2 → Phase 4: Polish.

## Project Mode

`[Greenfield | Brownfield | Mixed]`

- `Greenfield`: The feature introduces initial project/workspace setup.
- `Brownfield`: The feature extends an existing codebase and should avoid generic bootstrap tasks.
- `Mixed`: The feature adds targeted repo/workspace changes plus enhancement work in existing code.

## Epic / Capability Map *(OPTIONAL)*

- `[US1]` → [Capability or epic slice]
- `[OBJ1]` → [Capability or epic slice for technical or operational specs]

## Brownfield Notes *(OPTIONAL)*

- Existing flows touched: [paths / modules / systems]
- Compatibility or migration concerns: [backfill, rollout, adapters, feature flags]
- Regression focus: [existing journeys that must keep working]

## Phase 1: Setup (Repository / Workspace Delta) *(OPTIONAL)*

**Include only when this feature changes repository-root tooling, workspace config, shared project wiring, or cross-cutting scaffolding. Omit when empty.**

- [ ] T001 Update workspace scripts in package.json
- [ ] T002 [P] Add shared feature flag config in config/feature-flags.[ext]

---

## Phase 2: Foundational (Cross-Work-Item Blockers) *(OPTIONAL)*

**Include only for true blockers shared by multiple work items. Omit when empty. Work-item-local setup belongs inside the relevant delivery phase.**

- [ ] T003 Create shared domain event schema in src/domain/[shared_entity].[ext]
- [ ] T004 [P] Implement shared policy middleware in src/middleware/[shared_policy].[ext]

---

## Phase 3: Work Item 1 - [Title] (Priority: P1) 🎯 MVP

Use `[US#]` with `FR-###` tags for product specs.

- [ ] T005 [P] [US1] {FR-001} Create [Entity or shared artifact] in src/[location]/[file].[ext]
- [ ] T006 [US1] {FR-002} Implement [Service or automation] in src/[location]/[file].[ext]
- [ ] T007 [US1] {FR-003} Implement [endpoint or feature flow] in src/[location]/[file].[ext]
- [ ] T008 [US1] {FR-003} Add validation and error handling in src/[location]/[file].[ext]

---

## Phase 4: Work Item 2 - [Title] (Priority: P2)

Use `[OBJ#]` with `TR-###` or `OR-###` tags for technical and operational specs.

- [ ] T009 [P] [OBJ2] {TR-004} Create [Artifact] in src/[location]/[file].[ext]
- [ ] T010 [OBJ2] {TR-005} Implement integration or automation flow in src/[location]/[file].[ext]
- [ ] T011 [OBJ2] {OR-006} Add compatibility, migration, rollback, or recovery handling in src/[location]/[file].[ext]

---

## Phase N: Polish & Cross-Cutting Concerns *(OPTIONAL)*

**Include only for work that affects multiple work items after delivery is in place. Omit when empty.**

- [ ] T012 [P] Update feature documentation in docs/[feature].md
- [ ] T013 [P] Harden shared monitoring or security checks in src/[cross_cutting]/[file].[ext]

---

## Dependencies

Setup (if present) → Foundational (if present) → Delivery Work Items (by priority) → Polish (if present)

- If **Setup** is omitted, start with **Foundational** or the first delivery phase.
- If **Foundational** is omitted, delivery phases depend only on **Setup** (if present) or can start immediately.
- Tasks marked `[P]` can run in parallel within their phase.
- Shared work should appear in Setup/Foundational only when it truly affects multiple work items; otherwise place it in the earliest work item that needs it.
