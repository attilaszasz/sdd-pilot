---
name: project-planning
description: "Analyzes bootstrap artifacts (PRD, SAD, optionally DOD) and decomposes the product into a prioritized, dependency-ordered sequence of epics — coarse-grained deliverable increments, each intended to be implemented as a standalone pipeline run starting at `/sddp-specify`. Use when running /sddp-projectplan or when project-level epic planning is needed after `/sddp-systemdesign`, optionally after `/sddp-devops`, and before `/sddp-init`."
---

# Project Planner — Project Planning Workflow

<rules>
- This is an optional **project bootstrap** phase. It typically runs after `/sddp-systemdesign`, optionally after `/sddp-devops`, and before `/sddp-init`.
- Work at project level, not feature level.
- Primary output is `specs/project-plan.md`.
- The Product Document (PRD) and Technical Context Document (SAD) are **mandatory** inputs. Halt if either is unresolvable.
- The Deployment & Operations Document (DOD) is optional. When absent, skip operational epic extraction but continue.
- This is a **self-contained analysis workflow** — no external research delegation. All information comes from the bootstrap artifacts.
- Read all available inputs before performing any analysis.
- Each epic must be independently deliverable — completing it produces a working increment.
- P1 epics alone (across all waves) must yield a working, demonstrable MVP.
- Every epic must have at least one traceability tag linking back to a PRD capability, SAD ADR, or DOD DDR.
- Epic titles must be suitable as `$ARGUMENTS` to `/sddp-specify` — human-readable, descriptive, self-contained, and capped at 5 words.
- The epic checklist format must remain machine-parseable.
- Use standard Mermaid `graph LR` syntax for dependency diagrams. Use `<br>` for line breaks in labels — never `\n`.
- Keep dependency diagrams to ≤30 nodes for readability. For large projects, use a summary diagram plus per-wave detail diagrams.
- Reuse the existing registration flow in `.github/sddp-config.md`. Do not create a parallel registry.
- When refining an existing `specs/project-plan.md`, preserve manually checked `[X]` epics and their completion state.
- Treat the planning-ready PRD validator's capability list and digest as authoritative. Never infer or invent `CAP-###` identifiers in this workflow.
- Do not mention SDD command names, phase names, or workflow references in the generated `specs/project-plan.md`. Use generic terms like "implementation pipeline" or "feature delivery" instead.
- Avoid filler or obvious meta statements. Prefer concrete project-specific content.
</rules>

<workflow>

## 0. Acquire Baselines

Read before proceeding:
- `.github/skills/spec-authoring/SKILL.md` — spec types and epic-to-spec mapping
- `.github/sddp/workflows/init-project/WORKFLOW.md` — config creation/preservation patterns

## 1. Gate Check — Resolve Input Documents

Read `.github/sddp-config.md` if it exists.

For each document: (1) parse `**Path**:` from config, (2) when registration is empty fall back to the default path, (3) halt or skip. Never bypass a non-empty broken registration.

### 1.1 Resolve Product Document
- Config first: parse `## Product Document` → `**Path**:`. A non-empty registered path must exist and be readable; set it as `PRODUCT_DOC`.
- Fallback second: only when the registration is empty, use readable `specs/prd.md` as `PRODUCT_DOC`.
- A non-empty registered path that is missing or unreadable is a configuration error; do not silently fall back.
- A readable registered custom path remains authoritative even when a legacy `specs/prd.md` also exists. Read and write only the registered path; do not infer a conflict from file existence alone or consume the unregistered file.
- Unresolved → **HALT**: "Run `/sddp-prd` first or register in `.github/sddp-config.md`."

### 1.2 Resolve Technical Context Document
- Config: `## Technical Context Document` → `**Path**:` → set `TECH_CONTEXT_DOC`
- Fallback: `specs/sad.md`
- Unresolved → **HALT**: "Run `/sddp-systemdesign` first or register in `.github/sddp-config.md`."

### 1.3 Resolve Deployment & Operations Document
- Config: `## Deployment & Operations Document` → `**Path**:` → set `DEPLOY_OPS_DOC`, `HAS_DOD = true`
- Fallback: `specs/dod.md`
- Unresolved → `HAS_DOD = false`, continue.

### 1.4 Validate Planning-Ready Product Document

After `PRODUCT_DOC` is resolved and before parsing or planning, run this repository-root command, substituting the shell-safe resolved path for `<prd>`:

`node scripts/validate-prd.mjs <prd> --profile planning-ready --config .github/sddp-config.md --discovery specs/prd-discovery.md`

The discovery path is optional: the validator treats a missing `specs/prd-discovery.md` as the normal QUICK-path state. Any unreadable existing ledger fails closed.

Parse the validator's JSON output as `PRD_VALIDATION`; a non-zero exit, malformed output, or non-passing planning-ready verdict blocks Project Planning without writing or modifying `specs/project-plan.md` or `specs/plan/`.

- An `errors` entry with `code="active-prd-discovery"` → **HALT**: "Product discovery is incomplete. Run `/sddp-prd --resume`, then re-run `/sddp-projectplan`."
- Any other invalid, incomplete, or legacy PRD result → **HALT** with every validator diagnostic: "Run `/sddp-prd` to create or upgrade the registered Product Document, then re-run `/sddp-projectplan`."
- PASS → set `PRD_CAPABILITIES` from the validator's ordered `capabilities` and `PRD_CAPABILITY_DIGEST` from its `capabilityDigest`. Require a non-empty capability list with valid stable IDs and a 64-character lowercase SHA-256 digest; missing or malformed fields are a blocking validator-contract failure.

### 1.5 Validate Planning-Ready Technical Context Document

Run `node scripts/validate-sad.mjs <sad> --profile planning-ready --config .github/sddp-config.md` from the repository root, substituting the shell-safe `TECH_CONTEXT_DOC` path for `<sad>`.

Parse the JSON output as `SAD_VALIDATION`. A non-zero exit, malformed output, `valid=false`, path mismatch, or unreadable input blocks Project Planning without writing or modifying `specs/project-plan.md` or `specs/plan/`. Report every diagnostic and **HALT**: "Run `/sddp-systemdesign` to create, upgrade, or re-register the Technical Context Document, then re-run `/sddp-projectplan`."

PASS requires all five downstream categories, at least one system boundary, one major flow, and one architecture traceability row. Retain the validator's `architectureDigest`, category verdicts, and counts as `SAD_VALIDATION`; never substitute keyword counting or inferred sufficiency.

## 2. Read and Parse All Inputs

### 2.1 Product Document (`PRODUCT_DOC`)
Extract product name/vision, scope boundaries, user needs, and success criteria from the document. Use only `PRD_CAPABILITIES` for capability IDs, priorities, and descriptions; do not derive capabilities or assign replacement `CAP-###` IDs from narrative sections.

### 2.2 Technical Context Document (`TECH_CONTEXT_DOC`)
Extract from the planning-ready validated document: tech stack, approved boundaries, major flows, quality attributes/constraints, integration architecture, cross-cutting concerns, and architecture traceability.
Extract ADRs: scan `specs/adrs/` for standalone MADR files first; fall back to the ADR catalog table in `TECH_CONTEXT_DOC` if `specs/adrs/` is empty. For each ADR, read `adr_id`, `status`, title, context, and rationale. Normalize all ADR IDs to four-digit `ADR-NNNN` form. Only `accepted` ADRs create mandatory technical epic candidates; `proposed`, `deprecated`, and `superseded` ADRs are reported separately as informational.

### 2.3 Deployment & Operations Document (if `HAS_DOD = true`)
Extract: DDRs (`DDR-###`) with status/context/rationale, environment strategy, CI/CD design, infrastructure, observability, reliability targets.

### 2.4 Additional Context
Read if present: `project-instructions.md`, `README.md`, `specs/prototype-epic-intelligence.md` (only present after `/sddp-regen` — per-epic prototype learnings keyed by source tags). Summarize all into `PROJECT_CONTEXT`.

## 3. Determine Mode

- `specs/project-plan.md` exists with ≥1 `E###` entry → `MODE = REFINE`
- Otherwise → `MODE = CREATE`

REFINE:
- Read the existing frontmatter `prd_capability_digest` as `PRIOR_PRD_CAPABILITY_DIGEST`; a missing value is a legacy/stale digest, not permission to infer capabilities.
- Compare `PRIOR_PRD_CAPABILITY_DIGEST` with `PRD_CAPABILITY_DIGEST`. When they differ, reconcile every unchecked product epic and the PRD Coverage Validation table against the validator-provided `PRD_CAPABILITIES`: retain mappings for unchanged IDs, add coverage for new IDs, and remove or explicitly justify obsolete unchecked mappings.
- Checked `[X]` epic checklist lines and their `specs/plan/{EPIC_ID}.md` files are immutable, including ID, state, priority, category, source tags, title, scope, and detail content. Represent any changed or removed capability affecting a checked epic in coverage reconciliation notes and add new unchecked epics when current capability coverage requires them; never rewrite completed history.
- Even when the digest matches, validate complete coverage against `PRD_CAPABILITIES` before writing.
- Maintain existing IDs for unchanged unchecked epics and append new IDs for additions. Preserve detail files for all unchanged epics; only create or overwrite detail files for new or explicitly modified unchecked epics.

## 4. Decompose into Epics

### 4.1 Product Epics (`[PRODUCT]`)

Decompose PRD capabilities into **demo-scoped** epics — one demo-able deliverable per epic.

- Apply **"one demo" test**: if demo covers two independent things → split.
- Single capability often yields 1–3 epics; tightly focused capabilities may stay as one.
- Title names the **specific capability**, ≤5 words. Extra nuance goes after ` — `.
- Tag: `{PRD:CAP-###}` (or `{PRD:CAP-###,CAP-###}` for multi-capability). Do not group unrelated capabilities.
- **Extract detail seeds** — from the PRD capability being addressed: the user need/pain point (→ Problem Statement), capability description (→ Draft User Scenarios), scope boundaries (→ Scope Included/Excluded), any applicable assumptions or constraints (→ Assumptions & Risks), and the demo scenario implied by the capability (→ Demo Plan).

### 4.2 Technical Epics (`[TECHNICAL]`)

- Only ADRs requiring dedicated implementation (framework setup, data layer, shared libraries, integration infra) become epics.
- ADRs absorbed by product epics → no separate epic.
- Tag: `{SAD:ADR-NNNN}` (four-digit canonical form, even when sourced from legacy three-digit references).
- **Extract detail seeds** — from the ADR(s) addressed: the problem context (→ Problem Statement), the rationale and required deliverables (→ Draft Objectives rationale/deliverables), any technical constraints (→ Constraints), and the architectural signal implied (→ Implementation Signals).

### 4.3 Operational Epics (`[OPERATIONAL]`)

Only when `HAS_DOD = true`:
- Identify DDRs requiring setup work (CI/CD, environment provisioning, monitoring, IaC).
- Group related DDRs delivered together. Tag: `{DOD:DDR-N}` or `{DOD:DDR-N,DDR-M}`.
- **Extract detail seeds** — from the DDR(s) addressed: the operational gap/pain (→ Problem Statement), environment/infra requirements (→ Draft Objectives deliverables), any compliance or reliability constraints (→ Constraints / Assumptions & Risks), and the architectural signal implied (→ Implementation Signals).

### 4.4 Epic Sizing Guidance

- **Product**: 2–5 acceptance criteria. >5 → split; 1 trivial → merge.
- **Technical**: 2–4 deliverables. Single substantial OK; single trivial → merge.
- **Operational**: 2–4 deliverables. Same heuristics.
- Recommendations for Step 8 review — do not block creation.

### 4.5 Cross-Cutting Epics

- Multi-document epic → primary category from dominant scope; include all source tags (e.g., `{PRD:CAP-005}{SAD:ADR-003}`); note cross-cutting nature in the epic detail file at `specs/plan/{EPIC_ID}.md`.
- No direct PRD/SAD/DOD reference → tag closest related item; note derivation in the epic detail file.

## 5. Build Dependency Graph

1. Identify dependencies: data model, API contract, shared infrastructure, framework.
2. Assign waves:
   - **Wave 1** = no dependencies (foundation)
   - **Wave N+1** = all dependencies in Wave N or earlier
   - Minimize total waves.
3. Mark `[P]` within waves: no same-wave dependencies; shared mutable resources → NOT `[P]`.
4. Integration risks: parallel epics touching same data models/APIs, schema migration conflicts, shared config race conditions.
5. **Dependency contracts** — specify *what* is needed per dependency:
   - Data: entity + source epic (e.g., "E003 needs `User` from E001")
   - API: endpoint + source epic (e.g., "E004 calls `/api/v1/auth` from E002")
   - Library: export + source epic (e.g., "E005 imports `auth` middleware from E002")
    - Record in Dependency Diagram annotations and in each epic's `specs/plan/{EPIC_ID}.md` detail file.
6. **Integration Point formalization** — for each dependency contract, derive an Integration Point (IP-###) for the epic detail file: which consumer depends on which deliverable via which interface type. Cross-cutting risks from shared mutable resources → note in Assumptions & Risks.

## 6. Assign Priorities

- **P1 product epics** ← P1 PRD capabilities. Split capabilities → all epics inherit P1 unless PRD explicitly assigns lower.
- **Prerequisites** of P1 epics inherit P1.
- **Transitive**: P2 epic depends on tech epic → tech epic gets ≥P2.
- **Validate MVP**: P1 epics alone must yield a working product. Fails → promote prerequisites to P1, flag in Step 8.
- **Demo validation**: Review each epic's Demo Plan against its priority — every P1 epic must have a clear, demonstrable demo that proves MVP value. Gaps → revisit epic decomposition.

## 7. Validate Coverage

- **PRD**: every capability in validator-provided `PRD_CAPABILITIES` → ≥1 epic. Missing → create or justify exclusion. Do not discover additional capability IDs by scanning PRD prose.
- **SAD**: every implementation-requiring `ADR-NNNN` with `accepted` status → ≥1 epic. Absorbed ADRs count as covered. Read from standalone files under `specs/adrs/` (preferred) or `sad.md` catalog table.
- **DOD** (if `HAS_DOD`): every setup-requiring `DDR-###` → ≥1 epic.
- Document exclusions with rationale in **Uncovered items** section.

## 8. Present for Review

Display: epic checklist (by wave), Mermaid dependency diagram, execution wave summary, coverage results.

Confirm with user:
- Epic granularity (too coarse/fine?)
- Priority distribution (P1/P2/P3)
- Wave groupings and parallel safety
- Pipeline hints for TECHNICAL/OPERATIONAL epics (≤3 deliverables → `skip_clarify`, `skip_checklist`, `lightweight`?)
- Missing epics or scope items?
- Per-epic detail quality: Problem Statement grounded, Scope boundaries crisp, Draft Scenarios/Objectives accurate to PRD/SAD/DOD, Demo Plan clear, Integration Points traceable, Implementation Signals appropriate
- Draft Success Criteria and Assumptions/Risks completeness

Iterate until confirmed.

## 9. Write `specs/project-plan.md` and Epic Detail Files

Ensure the `specs/` and `specs/plan/` directories exist before writing.

### Main Project Plan (`specs/project-plan.md`) Structure

Frontmatter: `created`, `prd_source`, `prd_capability_digest`, `sad_source`, `dod_source`. Write the current validator-provided `PRD_CAPABILITY_DIGEST` exactly as `prd_capability_digest` on CREATE and every REFINE.
Header: `# Project Implementation Plan` — inline stats (Product, Created, Status, Total Epics by priority, Waves).

Required sections in order:

| Section | Content |
|---------|---------|
| Epic Checklist | Waves with `### Wave N — [title]` + blockquote notes + epic checklist lines |
| Dependency Diagram | Mermaid `graph LR` AoA style (nodes=milestones, arrows=epics, `<br>` for breaks, ≤30 nodes) |
| Execution Wave Summary | Table: Wave, Epics, All Parallel?, Notes |
| Parallel Execution Guidance | Independent Epics, Integration Risks, Shared Resource Conflicts |
| Coverage Validation | 3 tables: PRD `CAP-###→E###`, SAD `ADR-NNNN→E###`, DOD `DDR-###→E###`. Uncovered items with rationale. |
| Shared Artifact Surface | 3 tables: Shared Data Entities, API Surfaces, Libraries/Modules — Introduced by + Consumed by |
| Wave Transition Protocol | Verify: all Wave N passed QC, tech context updated, shared artifacts produced, dependency contracts satisfiable |

### Epic Detail Files (`specs/plan/{EPIC_ID}.md`)

For each epic, write a dedicated Markdown file containing its detailed breakdown, structured exactly according to this template:

```markdown
# Epic Details: {EPIC_ID} — {Epic Title}

- **Category**: [PRODUCT/TECHNICAL/OPERATIONAL]
- **Priority**: [P1/P2/P3]
- **Source**: {source-tags}
- **Wave**: [N] [P?]

## Problem Statement
[2-4 sentences grounded in the PRD need / ADR context this epic addresses — pain point, trigger, who's affected, consequences of inaction]

## Scope
### Included
- [core capability or flow in scope]
### Excluded
- [deferred or out-of-scope item] — [rationale]
### Edge Cases & Boundaries
- [boundary condition, error scenario, or failure mode]

## Demo Plan
[The one demo that proves this epic is working: who demonstrates what action to whom, with what expected outcome]

## Traceability & Dependencies
- **Actors**: [list of actors or None]
- **Key Entities**: [list of key entities with attributes/relationships, or None]
- **Depends on**: [list of E### IDs or None]
- **Dependency Contracts**: [data entity + source epic / API endpoint + source epic / library export + source epic, or None]
- **Depended on by**: [list of E### IDs or None]
- **Produces (shared)**: [shared artifacts produced or None]
- **Constraints**: [list of constraints or None]

## Integration Points
- **IP-001**: [consumer] depends on [deliverable] via [interface type]

## Draft User Scenarios   *(product epics only — use ## Draft Objectives for technical/operational)*
### User Story 1 - [Brief Title] (Priority: P1)
[plain-language journey]
**Why this priority**: [one-line rationale]
**Independent Test**: [one sentence — what to demo/test to prove this story works]
**Acceptance Scenarios**:
1. **Given** [initial state], **When** [action], **Then** [expected outcome]

## Draft Objectives   *(technical/operational epics only — use instead of ## Draft User Scenarios)*
### Objective 1 - [Brief Title] (Priority: P1)
[concrete description of what this component/capability must achieve]
**Why this priority**: [one-line rationale]
**Rationale**: [why this is needed]
**Deliverables**:
- [concrete artifact: module, config, schema, migration, pipeline, etc.]
**Validation/Verification Criteria**:
1. **Given** [precondition], **When** [action], **Then** [expected outcome]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Implementation Signals
- [`NEW-ENTITY`|`NEW-API`|`NEW-UI`|`MIGRATION`|`EXTERNAL-SERVICE`|`BREAKING-CHANGE`|`NEW-WORKER`|`NEW-CONFIG`] — [brief description of what the plan phase should architect]

## Assumptions & Risks
### Assumptions
- [something taken as true without confirmation; max 5]
### Risks
- **[Risk label]** *(likelihood: low/medium/high, impact: low/medium/high)*: [brief description and potential mitigation; max 3]

## Draft Success Criteria
- [prose outcome, no IDs — the specify phase will formalize these as SC-###]

## Glossary *(include when epic introduces 2+ domain-specific terms)*
| Term | Definition |
|------|------------|
| [Domain term] | [Precise definition] |

## Specify Input
- **Description**: [detailed description to be used as normalized arguments for the specify phase]
- **Actors**: [authoritative actors for specify step]
- **Key Entities**: [authoritative key entities]
- **Depends on Artifacts**: [artifacts from prior epics]
- **Constraints**: [authoritative constraints]

## Pipeline Hints
- [Optional hints: skip_clarify, skip_checklist, lightweight]
```

### Epic Detail Enrichment from Prototype Intelligence

When `specs/prototype-epic-intelligence.md` was read in Step 2.4 (post-`/sddp-regen` regeneration), enrich each V2 epic detail file from the corresponding prototype epic intelligence **before** finalizing it:

1. **Match by source tags** — for the V2 epic's `{PRD:CAP-###}` / `{SAD:ADR-NNNN}` / `{DOD:DDR-N}` tags, locate prototype epic intelligence sections carrying the same tags. A V2 epic may match multiple prototype epics (merge case) or none (genuinely new capability/ADR/DDR).
2. **Synthesize enrichment** — for each matched prototype epic, pull its pre-digested field seeds (Problem Statement, Scope, Demo Plan, Draft Scenarios/Objectives, Integration Points, Implementation Signals, Assumptions & Risks, Draft Success Criteria, Pipeline Hints recommendation) and merge them into the V2 epic detail file's corresponding sections:
   - **Merged V2 epic** (multiple prototype epics match) → synthesize from all matching sources; reconcile conflicts; note the merge in the V2 epic's Scope.
   - **Split V2 epic** (one prototype epic matches multiple V2 epics) → each V2 epic pulls only the relevant slice of the prototype intelligence.
   - **Genuinely new V2 epic** (no tag match) → generate from PRD/SAD/DOD as usual; no enrichment.
3. **Pipeline Hints** — adopt the prototype's hint recommendation when the prototype epic ran via autopilot and the V2 epic covers the same scope; otherwise derive from Step 8 sizing guidance as usual.
4. Enrichment is additive — it seeds and strengthens the V2 epic detail fields. The planner still validates against the regenerated PRD/SAD/DOD and may override stale prototype material.

### Epic Checklist Format

`- [ ] E### [P#] [CATEGORY] [P?] {source-tags} Epic title (max 5 words) — brief scope [→ Details](plan/E###.md)`

Regex: `^- \[([ X])\] (E\d{3}) \[(P[123])\] \[(PRODUCT|TECHNICAL|OPERATIONAL)\] (\[P\] )?(\{[^}]+\})+ (.+?)(?: \[→ Details\]\(.*\))?$`

Fields: `E###` sequential | `[P#]` P1=MVP/P2=important/P3=nice-to-have | `[CATEGORY]` PRODUCT/TECHNICAL/OPERATIONAL | `[P]` parallelizable | `{source-tags}` `{PRD:CAP-###}`, `{SAD:ADR-NNNN}`, `{DOD:DDR-N}` or combos.

### Mermaid Rules

AoA style, `graph LR`, `<br>` for breaks (never `\n`), parallel epics from same source node, ≤30 nodes, per-wave details if >15 epics.

### Pipeline Hints

`skip_clarify` (epic fully specified) | `skip_checklist` (low-risk infra; suppresses only a new checklist queue and halts on existing incomplete or malformed checklist state) | `lightweight` (reuse existing research). Opt-in, combinable, absence=no change.

## 10. Register in Config

Ensure `.github/sddp-config.md` exists.

**New config** — create with:
- Document paths: preserved if known, else defaults (`specs/prd.md`, `specs/sad.md`, `specs/dod.md`) if they exist, else blank
- Project Plan: `specs/project-plan.md`
- `MaxChecklistCount`: `1`, Autopilot: `false`

**Existing config** — preserve all unrelated sections and existing document paths. Add/update:

```markdown
## Project Plan

<!-- A high-level decomposition of the project into epics with dependency ordering and execution waves. -->
<!-- Registered by /sddp-projectplan when specs/project-plan.md is created. -->

**Path**: specs/project-plan.md
```

Place after `## Deployment & Operations Document`, before `## Checklist Settings`.

## 11. Report

Output: Mode (CREATE/REFINE), inputs read (paths + extractions), total epics (by category and priority), wave count + parallel opportunities, coverage gaps, epic detail files written (list of `specs/plan/{EPIC_ID}.md` paths), registration confirmation, suggested next step (`/sddp-init` with prompt).

</workflow>
