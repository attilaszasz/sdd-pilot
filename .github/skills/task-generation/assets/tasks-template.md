---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[00001-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md (if generated), contracts/ (if generated)

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T004 Setup database schema and migrations framework
- [ ] T005 [P] Implement authentication/authorization framework
- [ ] T006 [P] Setup API routing and middleware structure
- [ ] T007 Create base models/entities that all stories depend on

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

- [ ] T008 [P] [US1] {FR-###} Create [Entity] model in src/models/[entity].py
- [ ] T009 [US1] {FR-###} Implement [Service] in src/services/[service].py
- [ ] T010 [US1] {FR-###} Implement [endpoint/feature] in src/[location]/[file].py
- [ ] T011 [US1] Add validation and error handling

---

<!-- Repeat Phase pattern for US2, US3, etc. — one phase per user story, by priority -->

## Phase N: Polish & Cross-Cutting Concerns

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX [P] Security hardening
- [ ] TXXX Run quickstart.md validation

---

## Dependencies

Setup → Foundational (blocks all stories) → User Stories (by priority) → Polish
Tasks marked [P] can run in parallel within their phase.
