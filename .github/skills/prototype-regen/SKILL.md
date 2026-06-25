---
name: prototype-regen
description: "Archive a completed first-pass implementation as a throwaway prototype, mine it for discovered requirements and architectural learnings, then regenerate all canonical bootstrap artifacts from scratch informed by prototype insights. Use when running /sddp-regen after all epics have been implemented."
---

# Prototype Retrospective Analyst — Regeneration Workflow

<rules>
- Project-bootstrap scope. This is a one-shot regeneration workflow, not a feature-delivery phase.
- Primary outputs: archived `prototype/` directory, `specs/prototype-retrospective.md`, `specs/prototype-epic-intelligence.md`, and regenerated `specs/prd.md`, `specs/sad.md`, `specs/dod.md`, `specs/project-plan.md`.
- Must work with or without `.github/sddp-config.md`.
- Read local context first: all canonical bootstrap documents, all feature workspaces, implemented source code.
- `prototype/` already exists → **HALT**: "A prototype archive already exists. This is a one-shot operation."
- Everything is archived — not a single line of implementation code remains at root after archival.
- V2 starts from blank `src/` and `specs/00001-*` numbering.
- `README.md` is regenerated, not preserved.
- `project-instructions.md` stays at root and is never archived.
- `.github/` (skills, agents, workflows) stays at root and is never archived.
- `.gitignore` and other git/editor config files stay at root.
- `prototype/` is read-only after archival — never modify archived files.
- Each regenerated canonical document must reference prototype learnings and explain what changed.
- Preserve valid `CAP-###`, `ADR-NNNN`, and `DDR-###` identifiers where the underlying decisions still hold; assign new IDs for genuinely new items.
- Interactive mode: present retrospective findings for user review before regenerating. Autopilot mode (`AUTOPILOT = true`): accept recommended defaults, log decisions.
- Delegate all external research to **Technical Researcher** (`.github/agents/_technical-researcher.md`).
- Do not run feature-delivery phases.
</rules>

<workflow>

## 0. Shared Patterns

Read for reusable patterns only:
- `.github/skills/init-project/SKILL.md` — shared config creation and preservation
- `.github/skills/artifact-conventions/SKILL.md` — artifact structure and ID conventions

## 1. Gate Check

### 1.1 Prototype Guard

- `prototype/` directory exists → **HALT**: "A prototype archive already exists at `prototype/`. This is a one-shot operation. Use git to manage previous archives if you need to run again."

### 1.2 Resolve Canonical Documents

Read `.github/sddp-config.md` if it exists.

For each document: (1) parse `**Path**:` from config, (2) fall back to default path, (3) halt or skip.

#### Product Document
- Config: `## Product Document` → `**Path**:` → set `PRODUCT_DOC`
- Fallback: `specs/prd.md`
- Unresolved → **HALT**: "No Product Document found. Run `/sddp-prd` first."

#### Technical Context Document
- Config: `## Technical Context Document` → `**Path**:` → set `TECH_CONTEXT_DOC`
- Fallback: `specs/sad.md`
- Unresolved → **HALT**: "No Technical Context Document found. Run `/sddp-systemdesign` first."

#### Deployment & Operations Document
- Config: `## Deployment & Operations Document` → `**Path**:` → set `DEPLOY_OPS_DOC`
- Fallback: `specs/dod.md`
- Unresolved → `HAS_DOD = false`, continue.

#### Project Plan
- Config: `## Project Plan` → `**Path**:` → set `PROJECT_PLAN_DOC`
- Fallback: `specs/project-plan.md`
- Unresolved → **HALT**: "No Project Plan found. Run `/sddp-projectplan` first."

### 1.3 Completion Gate

Read `PROJECT_PLAN_DOC`. Count `[X]` and `[ ]` epics.

- All epics `[X]` → proceed.
- At least one `[X]` and some `[ ]` → ask user: "Not all epics are complete ([completed]/[total]). Archive the prototype anyway?" Interactive: wait for confirmation. `AUTOPILOT = true`: **HALT** — "Not all epics complete. Complete remaining epics or explicitly confirm partial archival."
- Zero `[X]` epics → **HALT** in Autopilot. In interactive mode, warn the user: "No completed epics found in the project plan. Do you still want to archive the current repository as a prototype and regenerate canonical documents?" and proceed if confirmed.

### 1.4 Resolve Source Root

Read `project-instructions.md` → `## Source Code Layout` → extract source root convention.
- `ENFORCE_SRC_ROOT` or mentions `/src` → `SOURCE_ROOT = src`
- Otherwise → scan for common source directories (`src/`, `app/`, `lib/`) → set `SOURCE_ROOT`
- No source directory found → **HALT**: "Cannot determine source code location. Specify the source root."

### 1.5 Identify Feature Workspaces

Scan `specs/` for feature workspace directories matching `#####-*` pattern (e.g., `00001-feature-name`).
Store as `FEATURE_WORKSPACES` list.

Report: "Gate check passed. [N] completed epics, [M] feature workspaces, source root at `[SOURCE_ROOT]/`."

## 2. Archive the Prototype

### 2.1 Create Archive Directory

Create `prototype/` at the project root.

### 2.2 Move Artifacts into `prototype/`

Move the following into `prototype/`:

**Canonical bootstrap documents:**
- `specs/prd.md` (or `PRODUCT_DOC` if different)
- `specs/sad.md` (or `TECH_CONTEXT_DOC` if different)
- `specs/dod.md` (or `DEPLOY_OPS_DOC` if different and `HAS_DOD = true`)
- `specs/project-plan.md` (or `PROJECT_PLAN_DOC` if different)
- `specs/adrs/` (entire directory)
- `specs/plan/` (entire directory — epic detail files)

**Feature workspaces:**
- All `specs/#####-*/` directories (feature specs, plans, tasks, QC reports, autopilot logs)

**Implementation artifacts:**
- `SOURCE_ROOT/` (entire source directory)
- Build manifests at root: `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Cargo.toml`, `Cargo.lock`, `go.mod`, `go.sum`, `pyproject.toml`, `requirements.txt`, `Gemfile`, `Gemfile.lock`, `composer.json`, `composer.lock`, `*.csproj`, `*.sln`, `pom.xml`, `build.gradle`, `build.gradle.kts` — only when present
- Configuration files: `tsconfig.json`, `tsconfig.*.json`, `jest.config.*`, `vitest.config.*`, `.eslintrc*`, `eslint.config.*`, `biome.json`, `.prettierrc*`, `Dockerfile`, `docker-compose.yml`, `docker-compose.yaml`, `.env.example` — only when present
- IaC files: `terraform/`, `infrastructure/`, `cdk/`, `pulumi/` — only when present
- Test directories: `tests/`, `test/`, `__tests__/`, `e2e/`, `cypress/`, `playwright/` — only when present at root level
- `README.md` — will be regenerated

**Do NOT move:**
- `project-instructions.md`
- `.github/` (skills, agents, workflows, `sddp-config.md`)
- `.agents/`
- `.git/`
- `.gitignore`, `.gitattributes`
- Editor/IDE config: `.vscode/`, `.idea/`, `.editorconfig`
- `prototype/` itself
- `node_modules/`, `vendor/`, `target/`, `dist/`, `build/`, `.build/` (build outputs — exclude from archive)
- Local environment files containing configurations or secrets at root: `.env`, `.env.local`, `.env.development`, `.env.test`, `.env.production`, `.env.staging`, `.env.local.db` (to prevent accidental credential leaks in Git)

### 2.3 Create Prototype Manifest

Create `prototype/PROTOTYPE.md`:

```markdown
# Prototype Archive

> This directory contains the first-pass implementation archived by `/sddp-regen`.
> All contents are read-only reference material for the V2 regeneration.

- **Archived**: [ISO date]
- **Git SHA**: [current HEAD SHA]
- **Completed Epics**: [count]/[total]
- **Feature Workspaces**: [list of workspace directory names]
- **Source Root**: [SOURCE_ROOT]

## Epic Summary

| Epic | Status | Feature Workspace |
|------|--------|-------------------|
| E001 | ✓ | 00001-feature-name |
| ... | ... | ... |

## Archive Contents

[tree listing of prototype/ contents, 2 levels deep]
```

### 2.4 Create Empty Source Root

Create an empty `SOURCE_ROOT/` directory with a `.gitkeep` file.

### 2.5 Create Empty Specs Directory

Recreate `specs/` at root (it was moved into `prototype/`). Create `specs/adrs/` and `specs/plan/` and ensure they are empty.

### 2.6 Update Configuration

Read `.github/sddp-config.md` and clear all document paths:
- `## Product Document` → `**Path**:` → set to empty
- `## Technical Context Document` → `**Path**:` → set to empty
- `## Deployment & Operations Document` → `**Path**:` → set to empty (if section exists)
- `## Project Plan` → `**Path**:` → set to empty (if section exists)

Preserve all other config sections (`## Checklist Settings`, `## Autopilot`, `## Derived QC Policy`, etc.) unchanged.

Report: "Prototype archived to `prototype/`. Config paths cleared. Ready to mine insights."

## 3. Mine the Prototype for Insights

Systematically extract lessons from each artifact category. Build a structured findings record.

### 3.1 From Canonical Bootstrap Documents

Read `prototype/specs/prd.md`:
- Extract `## Product Capability Map` — all `CAP-###` entries with priorities
- Extract scope boundaries, success metrics, assumptions, open questions
- Note any `## Project Context Baseline Updates` entries

Read `prototype/specs/sad.md`:
- Extract architecture style, tech stack, quality attributes
- Read standalone ADRs from `prototype/specs/adrs/` — extract `ADR-NNNN`, status, context, rationale
- Extract C4 diagrams, integration patterns, cross-cutting concerns

Read `prototype/specs/dod.md` (if present):
- Extract `DDR-###` decisions, environment strategy, CI/CD design, observability targets, reliability targets

Read `prototype/specs/project-plan.md`:
- Extract dependency graph (planned wave structure)
- Note which epics were `[P]` (parallelizable) — did parallel execution actually work?
- Extract `## Shared Artifact Surface` — what was planned vs. what emerged

### 3.2 From Feature Workspaces

For each workspace in `FEATURE_WORKSPACES`:

**Epic mapping** — read `spec.md` frontmatter `epic_id` to map the workspace to its prototype epic. Read `epic_sources` (traceability tags like `{PRD:CAP-###}`, `{SAD:ADR-NNNN}`) — these tags are the lookup key linking this prototype epic to V2 epic intelligence in Phase 3.4.1. Read the original epic detail file at `prototype/specs/plan/{EPIC_ID}.md` for the planned baseline.

**spec.md:**
- Extract resolved `[NEEDS CLARIFICATION]` markers — these are now confirmed requirements
- Extract `## Stress-Test Findings` (`STF-###`) — edge cases discovered
- Extract `## Clarifications` — decisions made during clarify phase
- Extract scope changes relative to original epic detail file
- Extract requirements (`FR-###`, `TR-###`, `OR-###`, `RR-###`)
- Extract `## Problem Statement` and `## Scope` — what the feature actually addressed (vs. what was planned)

**plan.md:**
- Extract architecture decisions (`AD-###`) — candidates for promotion to project-level ADRs
- Extract `## Instructions Check` findings
- Extract `## Technical Context` refinements
- Extract `## Requirement Coverage Map` — any gaps noted

**tasks.md:**
- Extract bug tasks (`[BUG:*]`) — patterns of recurring issues
- Extract `## Deferred Issues` — work that was pushed back
- Extract actual dependency patterns vs. planned dependencies
- Extract implementation complexity signals (many sub-tasks, phase bloat)
- Extract export annotations (`→ exports: Symbol?`) — actual shared artifact surface produced

**qc-report.md:**
- Extract `Overall Verdict` and category results
- Extract failure patterns across features
- Extract requirement-gap findings
- Extract security findings
- Extract coverage metrics

**manual-test.md** (when present):
- Extract demo scenarios and manual verification steps — these are proven demo plans
- Extract any user-facing flows that proved effective for validation

**research.md** (when present):
- Extract domain best practices and patterns that informed the implementation
- Extract any sources or findings worth carrying into V2

**data-model.md / contracts/** (when present):
- Extract actual entity schemas, relationships, and attributes as implemented
- Extract API contract definitions, endpoint signatures, and request/response shapes
- These represent the real shared artifact surface, not the planned one

**checklists/** (when present):
- Extract checklist outcomes per quality dimension — which dimensions passed clean vs. needed remediation
- Extract any flagged items that revealed systemic quality gaps

**autopilot-log.md** (when present):
- Extract `halt` events — what blocked automation
- Extract `decision` events — what the agent chose automatically
- Extract phase durations from `## Run Summary`
- Extract pipeline hint effectiveness — did `skip_clarify` / `skip_checklist` / `lightweight` hints pay off?

**Compile Prototype Epic Intelligence record** — for each workspace, build a structured record containing:
- Prototype epic ID + source tags (the lookup key)
- Feature workspace path
- V2 disposition recommendation: `KEPT` (carry forward as-is), `MERGED` (combine with another epic), `SPLIT` (break into smaller epics), or `DROPPED` (work proved unnecessary) — with rationale from the scope refinements analysis
- Resolved requirements, clarifications, and stress-test findings
- Architecture decisions (AD-###) with promotion recommendation
- Actual integration points, data models, and API surfaces (from data-model.md/contracts/)
- Bug patterns, deferred issues, and actual complexity signals
- QC results and quality dimension outcomes
- Automation experience (halts, decision patterns, hint effectiveness)
- **Pre-digested enrichment material** mapped to the V2 epic detail template fields:
  - Problem Statement seed (from spec.md Problem Statement + retrospective pain points)
  - Scope seed: Included/Excluded/Edge (from spec.md Scope + stress-test findings as edge cases)
  - Demo Plan seed (from manual-test.md scenarios)
  - Draft Scenarios/Objectives seed (from spec.md user stories/objectives, refined by QC evidence)
  - Integration Points seed (from data-model.md/contracts/ actual surfaces + plan.md AD-###)
  - Implementation Signals seed (from actual code patterns + tasks.md export annotations)
  - Assumptions & Risks seed (from resolved clarifications as confirmed assumptions; from bug patterns and deferred issues as risks)
  - Draft Success Criteria seed (from QC verdicts and coverage metrics — what actually proved measurable)
  - Pipeline Hints recommendation (from autopilot-log.md hint effectiveness)

### 3.3 From Implemented Code

Scan `prototype/[SOURCE_ROOT]/`:
- Extract actual module/directory structure (compare to SAD container/component views)
- Extract API surface: route definitions, endpoint handlers, exported interfaces
- Extract data models: schema definitions, entity types, database migrations
- Extract third-party dependencies from build manifests in `prototype/`
- Extract configuration surface: environment variables, config files, feature flags
- Extract test structure: test file locations, test utilities, fixtures
- Note patterns: error handling approach, logging approach, authentication/authorization patterns

### 3.4 Write Retrospective

Create `specs/prototype-retrospective.md`:

```markdown
# Prototype Retrospective

> Structured analysis of the first-pass implementation, used as input for V2 bootstrap regeneration.
> Generated by `/sddp-regen` on [ISO date].

- **Prototype Location**: `prototype/`
- **Prototype Git SHA**: [SHA]

## Discovered Requirements

Requirements that emerged during implementation but were not in the original PRD.

| Source | ID | Discovery | Description |
|--------|-----|-----------|-------------|
| [workspace] | STF-### / FR-### | Clarification / QC / Implementation | ... |

## Architectural Learnings

What the implementation revealed about the architecture.

### Validated Decisions
ADRs and architecture choices that proved correct.

### Revised Decisions
Architecture assumptions that implementation disproved or refined.

### Emergent Patterns
Patterns that emerged organically and should be formalized.

### Actual vs. Planned Structure
Comparison of SAD container/component views to actual module structure.

## Scope Refinements

### Over-Scoped
Capabilities or requirements that were more complex than necessary.

### Under-Scoped
Areas that needed more attention than originally planned.

### Missing Capabilities
New capabilities discovered that should be first-class in V2.

## Quality Insights

### Recurring Bug Patterns
Common bug categories from QC across features.

### Coverage Analysis
Test coverage patterns — what was well-tested, what was fragile.

### Security Findings
Security issues discovered during QC.

## Dependency Graph Accuracy

### Planned vs. Actual
How well the project plan's wave structure and dependency ordering matched reality.

### Shared Artifact Surface
Planned shared entities/APIs/modules vs. what actually emerged.

## Operational Learnings

Deployment, CI/CD, and operational insights (when DOD was present).

## Risk Reductions

Risks and assumptions from the original specs that are now resolved or confirmed.

## Open Questions

Questions that remain unresolved and should inform V2 planning.
```

### 3.4.1 Write Prototype Epic Intelligence

Create `specs/prototype-epic-intelligence.md` — a companion to the retrospective, organized by prototype epic ID. This document is the structured input that project-planning consumes in Phase 4.4 to enrich V2 epic detail files via source-tag matching.

```markdown
# Prototype Epic Intelligence

> Per-epic learnings mined from feature workspaces, structured for V2 epic detail enrichment.
> Generated by `/sddp-regen` on [ISO date].
> Lookup key: source tags (`{PRD:CAP-###}`, `{SAD:ADR-NNNN}`, `{DOD:DDR-N}`) match V2 epic tags.

## Prototype Epic E001 — [Epic Title]

- **Source Tags**: {PRD:CAP-###} (and/or {SAD:ADR-NNNN}, {DOD:DDR-N})
- **Feature Workspace**: `00001-feature-name`
- **V2 Disposition**: [KEPT|MERGED with E###|SPLIT into E###/E###|DROPPED] — [rationale from scope refinements]

### Resolved Requirements
- [FR-###/TR-###/OR-###: final requirement as implemented, with any clarifications folded in]

### Architecture Decisions
- [AD-###: decision] — [promotion recommendation: promote to project ADR / keep feature-level / supersede]

### Actual Integration Points & Shared Surface
- [Entity/API/library actually produced, with consumer epics]

### Quality & Complexity Signals
- QC verdict: [PASS/FAIL with category breakdown]
- Recurring bug patterns: [categories and counts]
- Deferred issues: [what was pushed back and why]
- Actual complexity vs. planned: [signal]

### Automation Experience
- Halt events: [what blocked autopilot]
- Pipeline hint effectiveness: [which hints paid off / backfired]

### V2 Epic Detail Enrichment Seeds
- **Problem Statement seed**: [from spec.md Problem Statement + retrospective pain points]
- **Scope seed**: Included [..] / Excluded [..] / Edge Cases [from STF-### findings]
- **Demo Plan seed**: [from manual-test.md proven scenarios]
- **Draft Scenarios/Objectives seed**: [from spec.md stories/objectives, refined by QC evidence]
- **Integration Points seed**: [from data-model.md/contracts/ actual surfaces]
- **Implementation Signals seed**: [from actual code patterns + tasks.md exports]
- **Assumptions & Risks seed**: Assumptions [from resolved clarifications] / Risks [from bug patterns and deferred issues]
- **Draft Success Criteria seed**: [from QC verdicts and coverage metrics]
- **Pipeline Hints recommendation**: [skip_clarify / skip_checklist / lightweight — with rationale from autopilot experience, or "none" if no automation data]

## Prototype Epic E002 — [Epic Title]
[repeat the structure above for each prototype epic]
```

### 3.5 Present Findings

Interactive mode: present a summary of the retrospective findings organized by category count, ask the user to review `specs/prototype-retrospective.md` and `specs/prototype-epic-intelligence.md` and confirm before proceeding to regeneration.

`AUTOPILOT = true`: proceed directly to Phase 4.

## 4. Regenerate Canonical Bootstrap Artifacts

Execute the bootstrap workflows inline, in order. Each receives the full retrospective context plus the original prototype document as baseline.

**Answer Retrieval Rule**: Do not ask the user for information that is already resolved in the prototype context (e.g. product name, technology stack, runtime, frameworks, or database choices), unless a change is explicitly proposed in the retrospective. Pre-populate all choices from the archived files under `prototype/` and the compiled retrospective.

### 4.1 Regenerate Product Document

Report: "Regenerating `specs/prd.md` from prototype learnings."

**Execute `.github/skills/product-document/SKILL.md` inline** with enriched context:

Provide as workflow input:
- "Regenerate the Product Document informed by the prototype retrospective at `specs/prototype-retrospective.md` and the original PRD at `prototype/specs/prd.md`. Incorporate discovered requirements, scope refinements, missing capabilities, and resolved open questions. Preserve `CAP-###` identifiers where the underlying capability still holds. Add new capabilities with new IDs. Remove capabilities that proved unnecessary. Update success metrics based on actual QC and implementation evidence."

The workflow will detect `MODE = CREATE` (since `specs/prd.md` does not exist) and produce a fresh document.

### 4.2 Regenerate Technical Context Document

Report: "Regenerating `specs/sad.md` from prototype learnings."

**Execute `.github/skills/system-design/SKILL.md` inline** with enriched context:

Provide as workflow input:
- "Regenerate the Technical Context Document informed by the prototype retrospective at `specs/prototype-retrospective.md` and the original SAD at `prototype/specs/sad.md`. The actual implementation is archived at `prototype/[SOURCE_ROOT]/`. Promote validated feature-level architecture decisions (`AD-###`) to project-level ADRs. Revise or supersede ADRs that implementation disproved. Update C4 diagrams to reflect the actual module structure discovered. Incorporate emergent patterns as formalized architecture guidance. Preserve `ADR-NNNN` identifiers where decisions still hold."

### 4.3 Regenerate Deployment & Operations Document

Skip if original prototype had no DOD (`HAS_DOD = false`). Ask user: "The prototype had no Deployment & Operations Document. Create one for V2?" Interactive: wait for answer. `AUTOPILOT = true`: skip.

When proceeding:

Report: "Regenerating `specs/dod.md` from prototype learnings."

**Execute `.github/skills/deployment-operations/SKILL.md` inline** with enriched context:

Provide as workflow input:
- "Regenerate the Deployment & Operations Document informed by the prototype retrospective at `specs/prototype-retrospective.md` and the original DOD at `prototype/specs/dod.md`. Incorporate operational learnings, actual CI/CD patterns that emerged, and deployment insights from the prototype. Preserve `DDR-###` identifiers where decisions still hold."

### 4.4 Regenerate Project Plan

Report: "Regenerating `specs/project-plan.md` from prototype learnings."

**Execute `.github/skills/project-planning/SKILL.md` inline** with enriched context:

Provide as workflow input:
- "Regenerate the Project Plan informed by the prototype retrospective at `specs/prototype-retrospective.md`, the prototype epic intelligence at `specs/prototype-epic-intelligence.md`, and the original project plan at `prototype/specs/project-plan.md`. The V2 plan is a clean decomposition — it may have fewer, more, or completely different epics than the prototype. Merge prototype epics that implementation proved belong together, split epics that were too coarse, add new epics for capabilities or infrastructure the prototype uncovered, and drop epics for work that proved unnecessary. Use the corrected dependency ordering based on actual build experience. Epic numbering starts fresh from E001. Feature workspace numbering starts fresh from 00001. Do not carry over prototype epic IDs or structure — treat the regenerated PRD as the sole source of capability decomposition, informed by the retrospective's scope refinements and dependency graph accuracy analysis. Read `specs/prototype-epic-intelligence.md` and enrich each V2 epic detail file by matching its source tags (`{PRD:CAP-###}` / `{SAD:ADR-NNNN}` / `{DOD:DDR-N}`) to the prototype epic intelligence sections — synthesize from all matching sources for merged epics, pull only the relevant slice for split epics, and generate from PRD/SAD/DOD as usual for genuinely new epics with no tag match. Adopt prototype Pipeline Hints recommendations when the V2 epic covers the same scope and the prototype ran via autopilot."

### 4.5 Regenerate README

Regenerate `README.md` at the project root, informed by the new `specs/prd.md`. The README should reflect V2, not the prototype. Include a note that `prototype/` contains the archived first-pass implementation.

## 5. Reconcile and Report

### 5.1 Run Init in Amend Mode

**Execute `.github/skills/init-project/SKILL.md` inline** in `AMEND` mode:

Provide as workflow input:
- "Amend project instructions to reflect any technology stack, testing policy, or source layout changes discovered during the prototype. Reference `specs/prototype-retrospective.md` for learnings. Preserve all existing principles unless implementation evidence contradicts them."

### 5.2 Register All Documents

Update `.github/sddp-config.md` with the regenerated document paths:
- `## Product Document` → `**Path**: specs/prd.md`
- `## Technical Context Document` → `**Path**: specs/sad.md`
- `## Deployment & Operations Document` → `**Path**: specs/dod.md` (when regenerated)
- `## Project Plan` → `**Path**: specs/project-plan.md`

Preserve all other config sections unchanged.

### 5.3 Diff Summary

For each canonical document, produce a structured comparison:

```markdown
## Regeneration Diff Summary

### Product Document (prd.md)
- **Capabilities**: [N original] → [M regenerated] ([added], [removed], [refined])
- **Key changes**: [bullet list of major differences]

### Technical Context Document (sad.md)
- **ADRs**: [N original] → [M regenerated] ([new], [superseded], [preserved])
- **Key changes**: [bullet list]

### Deployment & Operations Document (dod.md)
- **DDRs**: [N original] → [M regenerated]
- **Key changes**: [bullet list]

### Project Plan (project-plan.md)
- **Epics**: [N original] → [M regenerated]
- **Waves**: [N original] → [M regenerated]
- **Epic detail enrichment**: [N] V2 epics enriched from prototype intelligence ([merged], [split], [new], [dropped])
- **Key changes**: [bullet list]
```

### 5.4 Final Report

Output:
- Prototype archive location and manifest path
- Insights mined: count per category (discovered requirements, architectural learnings, scope refinements, quality insights, operational learnings, epic intelligence records)
- Intelligence document: `specs/prototype-epic-intelligence.md` ([N] prototype epic records with V2 disposition and enrichment seeds)
- Documents regenerated: list with paths
- Key differences from prototype (top 5)
- Registration confirmation
- Next step: commit the regeneration, then `/sddp-autopilot` for the first V2 epic
- Suggested commit message: `docs: regenerate V2 bootstrap from prototype learnings`

</workflow>
