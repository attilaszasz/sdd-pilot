# Tasks: Release Archive Hardening

**Project Mode**: Brownfield

## Dependencies

- Objective 1 admission validation precedes extracted runtime validation in Objective 2.
- Objective 3 setup protection is exercised by Objective 4 release regressions.

## Phase 1: Delivery — Objective 1 [OBJ1] 🎯 MVP

- [X] T001 [OBJ1] {TR-001,TR-002} Create acceptance test stubs in tests/release-archive-layout.test.mjs ← plan:AcceptanceTestStubs [VERIFY: grep -q "TR-001 rejects wrapper" tests/release-archive-layout.test.mjs]
- [X] T002 [OBJ1] {TR-001,TR-002} Implement ZIP entry admission in scripts/assert-release-archive-layout.mjs → exports: inspectArchiveEntries(archivePath),assertSafeArchiveEntries(tool,entries) [VERIFY: node --test tests/release-archive-layout.test.mjs]
- [X] T003 [OBJ1] {TR-001} [COMPLETES TR-001] Add wrapper-only and mixed-wrapper fixtures for six tools in tests/release-archive-layout.test.mjs after:T002 [VERIFY: node --test tests/release-archive-layout.test.mjs]
- [X] T004 [OBJ1] {TR-002} [COMPLETES TR-002] Enforce direct roots and unsafe-path and symlink rejection in scripts/assert-release-archive-layout.mjs after:T002 [VERIFY: node --test tests/release-archive-layout.test.mjs]

## Phase 2: Delivery — Objective 2 [OBJ2] 🎯 MVP

- [X] T005 [OBJ2] {TR-003,TR-004,TR-005} Create acceptance test stubs in tests/release-runtime-manifest.test.mjs ← plan:AcceptanceTestStubs [VERIFY: grep -q "TR-003 resolves" tests/release-runtime-manifest.test.mjs]
- [X] T006 [OBJ2] {TR-003} Implement cycle-safe local ESM closure discovery in scripts/release-runtime-manifest.mjs → exports: discoverLocalModuleClosure(directory,entries) [VERIFY: node --test tests/release-runtime-manifest.test.mjs]
- [X] T007 [OBJ2] {TR-004,TR-005} Validate extracted archive modules and cleanup in scripts/release-runtime-manifest.mjs after:T006 → exports: validateExtractedRelease(directory),validateReleaseArchive(archivePath) [VERIFY: node --test tests/release-runtime-manifest.test.mjs]
- [X] T008 [OBJ2] {TR-003} [COMPLETES TR-003] Add static, dynamic, nested, and cycle regressions in tests/release-runtime-manifest.test.mjs after:T007 [VERIFY: node --test tests/release-runtime-manifest.test.mjs]
- [X] T009 [OBJ2] {TR-004} [COMPLETES TR-004] Add missing and unimportable extracted-module regressions in tests/release-runtime-manifest.test.mjs after:T007 [VERIFY: node --test tests/release-runtime-manifest.test.mjs]

## Phase 3: Delivery — Objective 3 [OBJ3] 🎯 MVP

- [X] T010 [OBJ3] {TR-006,TR-007} Create acceptance test stubs in tests/release-runtime-manifest.test.mjs ← plan:AcceptanceTestStubs [VERIFY: grep -q "TR-006 preserves" tests/release-runtime-manifest.test.mjs]
- [X] T011 [OBJ3] {TR-006,TR-007} Implement idempotent ignore setup in .github/skills/implement-tasks/references/gates.md → exports: ensureImplementStateIgnored(projectRoot) [VERIFY: node --test tests/release-runtime-manifest.test.mjs]
- [X] T012 [OBJ3] {TR-006} [COMPLETES TR-006] Add existing, missing, and empty ignore fixtures in tests/release-runtime-manifest.test.mjs after:T011 [VERIFY: node --test tests/release-runtime-manifest.test.mjs]
- [X] T013 [OBJ3] {TR-007} [COMPLETES TR-007] Add read-only ignore preservation regression in tests/release-runtime-manifest.test.mjs after:T011 [VERIFY: node --test tests/release-runtime-manifest.test.mjs]

## Phase 4: Delivery — Objective 4 [OBJ4]

- [X] T014 [OBJ4] {TR-008} Run layout and runtime validators after each build in .github/workflows/release.yml ← T002:assertReleaseArchiveLayout,T007:validateReleaseArchive [VERIFY: node --test tests/release-archive-layout.test.mjs tests/release-runtime-manifest.test.mjs]
- [X] T015 [OBJ4] {TR-008} Add six-archive build, list, extract, setup E2E coverage in tests/lifecycle-release-e2e.test.mjs after:T014 [VERIFY: node --test tests/lifecycle-release-e2e.test.mjs]
