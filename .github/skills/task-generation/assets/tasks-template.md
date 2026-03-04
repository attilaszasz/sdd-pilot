---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T004 Setup core data models/entities that all stories depend on
- [ ] T005 [P] Implement shared infrastructure (auth, routing, middleware)

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

- [ ] T008 [P] [US1] {FR-###} Create [Entity] model in src/models/[entity].py
- [ ] T009 [US1] {FR-###} Implement [Service] in src/services/[service].py
- [ ] T010 [US1] {FR-###} Implement [endpoint/feature] in src/[location]/[file].py
- [ ] T011 [US1] Add validation and error handling

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] TXXX [P] Documentation updates and code cleanup
- [ ] TXXX [P] Security hardening
- [ ] TXXX Run quickstart.md validation

---

## Dependencies

Setup → Foundational (blocks all stories) → User Stories (by priority) → Polish
Tasks marked [P] can run in parallel within their phase.
