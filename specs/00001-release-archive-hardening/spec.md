---
feature_branch: "00001-release-archive-hardening"
created: "2026-08-13"
input: "GitHub issue #103: Harden release archive layout and runtime dependency validation"
spec_type: "technical"
spec_maturity: "draft"
---

# Feature Specification: Release Archive Hardening

**Feature Branch**: `00001-release-archive-hardening`  
**Created**: 2026-08-13  
**Status**: Draft  
**Spec Type**: technical  
**Spec Maturity**: draft

## Problem Statement

Release validation can accept an archive that contains both valid discovery roots and an unwanted `sdd-pilot-<tool>/` wrapper. It also misses omitted local JavaScript dependencies, allowing an installed public command to fail only at runtime. Finally, a packaged root `.gitignore` can replace consumer rules during direct extraction, while omitting it leaves checkpoint state unprotected. Without hardening, all six distributable tool archives can appear valid while being unsafe or unusable for consumers.

## Scope

### Included

- Reject wrapper-shaped top-level archive entries even when required discovery roots are present.
- Validate the complete recursive local dependency closure of packaged `.mjs` runtime entries from extracted archive bytes.
- Provide non-destructive setup that ensures `.implement-state` is ignored before checkpointing.
- Add regression coverage for archive layout, runtime imports, extraction, consumer ignore files, unsafe ZIP paths, and symlink entries across all six tool archives.

### Excluded

- Packaging the entire repository — release bundles remain constrained to required runtime and tool-discovery content.
- Requiring consumers to move extracted directories manually — direct extraction remains the supported installation flow.
- Changing public command behavior unrelated to archive validation or installation setup — this issue addresses release integrity only.

### Edge Cases & Boundaries

- A wrapper-only archive and an archive containing both valid roots and a wrapper must both fail.
- Local static imports, string-literal dynamic imports, nested helpers, and import cycles must be resolved without infinite traversal.
- Missing, empty, existing, and read-only consumer `.gitignore` files must have deterministic behavior; existing content must not be replaced.
- Archives with absolute paths, traversal paths, or symlink entries must fail before unsafe extraction or validation succeeds.

## Technical Objectives

### Objective 1 - Validate Direct-Extraction Archive Layout (Priority: P1)

Release validation must prove that every tool archive is directly extractable into a consumer project root and contains no additional tool wrapper directory that masks an invalid layout.

**Why this priority**: Archive root integrity is required before any consumer can discover installed commands safely.

**Rationale**: Prior root checks verify presence but do not detect a duplicate wrapped delivery layout.

**Deliverables**:
- Archive-layout validation behavior for all supported tool archives.
- Regression fixtures for wrapper-only, mixed-wrapper, unsafe-path, and symlink-entry archives.

**Validation Criteria**:
1. **Given** each of the six valid tool archives, **When** its layout is validated, **Then** its required discovery roots are accepted at archive root.
2. **Given** a wrapper-only or mixed valid-root-plus-wrapper archive for any supported tool, **When** its layout is validated, **Then** validation fails.
3. **Given** an archive with an unsafe path or symlink entry, **When** validation is attempted, **Then** validation fails without accepting the archive.

### Objective 2 - Validate Packaged Runtime Dependency Closure (Priority: P1)

Release validation must establish that every packaged JavaScript runtime entry and its recursively referenced local dependencies exist in, and can be loaded from, the extracted archive.

**Why this priority**: A missing runtime helper makes installed public commands fail despite a successful release.

**Rationale**: Existing scanning covers selected document references but not JavaScript module imports or archive-byte integrity.

**Deliverables**:
- Runtime dependency validation for static and string-literal dynamic local imports.
- Archive-extracted dependency and importability checks with cycle-safe traversal.

**Validation Criteria**:
1. **Given** a packaged `.mjs` entry with static, dynamic, and nested local dependencies, **When** its extracted archive is validated, **Then** every dependency is present and importable.
2. **Given** a missing static or dynamic local dependency, **When** the archive is validated, **Then** validation fails and identifies the unresolved dependency.
3. **Given** a local-import cycle, **When** dependencies are traversed, **Then** validation terminates and accepts the archive when every cycle member is packaged and importable.

### Objective 3 - Preserve Consumer Ignore Rules During Setup (Priority: P1)

Installation setup must protect `.implement-state` before checkpointing without replacing consumer `.gitignore` content.

**Why this priority**: Consumer repository rules must not be lost during direct installation.

**Rationale**: A release-root ignore file can overwrite existing rules, while its absence leaves ephemeral checkpoint state visible to Git.

**Deliverables**:
- Non-destructive ignore-rule setup behavior.
- Regression fixtures for existing, missing, empty, and read-only `.gitignore` files.

**Validation Criteria**:
1. **Given** a consumer `.gitignore` with arbitrary existing bytes, **When** setup runs, **Then** those bytes remain unchanged and `.implement-state` occurs exactly once after setup.
2. **Given** a missing or empty consumer `.gitignore`, **When** setup runs, **Then** `.implement-state` is present exactly once before checkpointing.
3. **Given** a read-only consumer `.gitignore`, **When** setup cannot safely add the rule, **Then** setup fails without replacing or truncating the file.

### Objective 4 - Enforce Cross-Archive Release Regressions (Priority: P2)

The release test suite must exercise archive build, listing, extraction, layout, runtime-manifest, and installation behavior for each supported tool archive.

**Why this priority**: This extends the core safeguards with durable coverage for future release changes.

**Rationale**: Existing fixtures omit mixed-wrapper and JavaScript dependency failure cases.

**Deliverables**:
- Cross-tool regression coverage for Copilot, Antigravity, Windsurf, OpenCode, Claude Code, and Codex archives.
- Regression cases for missing static import, dynamic import, nested helper, and import cycle.

**Validation Criteria**:
1. **Given** the release test suite, **When** all six archives are built, listed, extracted, and validated, **Then** every archive passes required root discovery, runtime-manifest, and setup checks.
2. **Given** each required negative fixture, **When** its relevant validator runs, **Then** it fails closed.

### Technical Constraints

- Validation must inspect the archive-derived extracted content rather than treating source-tree validation as sufficient.
- Local ESM imports must use Node-compatible relative resolution; non-local package and built-in specifiers are outside the packaged-local closure.
- Archive validation must reject unsafe paths and symlink entries rather than relying on extraction behavior.
- The supported archive set remains Copilot, Antigravity, Windsurf, OpenCode, Claude Code, and Codex.

## Integration Points

- **IP-001**: Release workflow depends on archive layout and runtime-manifest validation to block publication of invalid archives.
- **IP-002**: Direct consumer installation depends on setup behavior to add `.implement-state` protection without overwriting `.gitignore`.
- **IP-003**: Packaged runtime entries depend on their recursive local `.mjs` import closure being included in each archive.

## Requirements

### Technical Requirements

- **TR-001** [OBJ1]: System MUST reject an archive containing a top-level `sdd-pilot-<tool>/` wrapper for the selected supported tool, including when that archive also contains every required root at archive root.
- **TR-002** [OBJ1]: System MUST accept each supported tool archive only when all of its required discovery roots are directly represented at archive root and no unsafe path or symlink entry is present.
- **TR-003** [OBJ2]: System MUST recursively discover relative static imports and string-literal dynamic imports reachable from every packaged `.mjs` runtime entry, including nested dependencies and cycles.
- **TR-004** [OBJ2]: System MUST fail extracted-archive validation when any discovered packaged-local JavaScript dependency is absent or cannot be imported from the extracted archive.
- **TR-005** [OBJ2]: System MUST validate runtime dependencies from archive-extracted content rather than source-tree content alone.
- **TR-006** [OBJ3]: System MUST add `.implement-state` exactly once before checkpointing without replacing, truncating, or altering existing consumer `.gitignore` bytes or rules.
- **TR-007** [OBJ3]: System MUST fail safely when it cannot add `.implement-state` to a read-only consumer `.gitignore`, leaving that file unchanged.
- **TR-008** [OBJ4]: System MUST provide automated regression coverage for wrapper-only and mixed-wrapper archives for all six supported tools; missing static and dynamic imports, nested helpers, and import cycles; existing, missing, empty, and read-only `.gitignore` cases; and archive build, listing, extraction, layout, runtime-manifest, unsafe-path, and symlink-entry behavior.

### Key Entities

- **Release archive**: A tool-specific distributable ZIP intended for direct extraction into a consumer project root.
- **Discovery root**: A required top-level hidden directory through which a supported tool locates SDD Pilot commands or configuration.
- **Runtime dependency closure**: Every packaged-local JavaScript module reachable through recursive static or string-literal dynamic imports from a runtime entry.
- **Consumer ignore rules**: Existing `.gitignore` bytes and rules in the project receiving the extracted archive.

## Assumptions & Risks

### Assumptions

- Supported release environments can enumerate ZIP entries and perform isolated extraction for validation.
- Runtime entries are `.mjs` files and relevant dynamic local imports use string literals.
- Direct extraction is performed into a consumer project where setup runs before implementation checkpointing.

### Risks

- **Unsupported dynamic import expression** *(likelihood: medium, impact: medium)*: Non-literal import expressions cannot be fully resolved statically; validation must report or constrain them rather than silently treating them as packaged-local dependencies.
- **Platform-specific ZIP metadata** *(likelihood: low, impact: high)*: Symlink and path representations can vary; fixtures must cover the archive tooling used in release validation.
- **Read-only ignore file handling** *(likelihood: medium, impact: medium)*: Setup may need an explicit failure path to preserve data when a rule cannot be appended.

## Implementation Signals

- `NEW-CONFIG` — Release packaging and validation configuration must enforce archive-root and runtime-closure integrity for all supported tools.
- `NEW-API` — Archive validation needs a reusable interface for entry inspection, local dependency closure, and extracted importability results.
- `BREAKING-CHANGE` — Invalid wrapper, unsafe-path, symlink, omitted-dependency, or non-writable ignore-file releases/installations will fail where they previously could proceed.

## Success Criteria

### Measurable Outcomes

SC-001 [OBJ1]: For each of the six supported tools, valid direct-root archives pass while wrapper-only and mixed valid-root-plus-wrapper fixtures fail.
SC-002 [OBJ1]: Archive validation rejects 100% of unsafe-path and symlink-entry regression fixtures before an archive is accepted.
SC-003 [OBJ2]: Every packaged `.mjs` runtime entry has a finite, fully resolved local dependency closure whose members are present and importable after extraction.
SC-004 [OBJ2]: Missing static imports, string-literal dynamic imports, and nested helpers each cause archive validation to fail; a complete import cycle passes without non-termination.
SC-005 [OBJ3]: For existing `.gitignore` fixtures, setup preserves every preexisting byte and results in exactly one `.implement-state` rule; missing and empty fixtures also contain that rule exactly once.
SC-006 [OBJ3]: Read-only `.gitignore` fixtures fail setup without any byte change.
SC-007 [OBJ4]: Automated release regression checks build, list, extract, validate layout, validate runtime dependencies, and exercise setup behavior for all six supported archives.

## Glossary

| Term | Definition |
|------|------------|
| Direct extraction | Unpacking an archive into the consumer project root without moving a wrapper directory afterward. |
| Mixed-wrapper archive | An archive containing valid required roots at its top level plus an additional `sdd-pilot-<tool>/` wrapper. |
| String-literal dynamic import | An `import()` expression whose module specifier is a fixed string and can be inspected during validation. |
