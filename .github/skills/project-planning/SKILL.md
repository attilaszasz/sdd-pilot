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
- Do not mention SDD command names, phase names, or workflow references in the generated `specs/project-plan.md`. Use generic terms like "implementation pipeline" or "feature delivery" instead.
- Avoid filler or obvious meta statements. Prefer concrete project-specific content.
</rules>

<workflow>

## 0. Acquire Baselines

Read before proceeding:
- `.github/skills/spec-authoring/SKILL.md` — spec types and epic-to-spec mapping
- `.github/skills/init-project/SKILL.md` — config creation/preservation patterns

## 1. Gate Check — Resolve Input Documents

Read `.github/sddp-config.md` if it exists.

For each document: (1) parse `**Path**:` from config, (2) fall back to default path, (3) halt or skip.

### 1.1 Resolve Product Document
- Config: `## Product Document` → `**Path**:` → set `PRODUCT_DOC`
- Fallback: `specs/prd.md`
- Unresolved → **HALT**: "Run `/sddp-prd` first or register in `.github/sddp-config.md`."

### 1.2 Resolve Technical Context Document
- Config: `## Technical Context Document` → `**Path**:` → set `TECH_CONTEXT_DOC`
- Fallback: `specs/sad.md`
- Unresolved → **HALT**: "Run `/sddp-systemdesign` first or register in `.github/sddp-config.md`."

### 1.3 Resolve Deployment & Operations Document
- Config: `## Deployment & Operations Document` → `**Path**:` → set `DEPLOY_OPS_DOC`, `HAS_DOD = true`
- Fallback: `specs/dod.md`
- Unresolved → `HAS_DOD = false`, continue.

## 2. Read and Parse All Inputs

### 2.1 Product Document (`PRODUCT_DOC`)
Extract: product name/vision, capability map (`CAP-###`, priorities), scope boundaries, user needs, success criteria.
- No explicit capability map → derive from `In-Scope Capabilities` + `User Needs`; note IDs should be promoted into PRD.

### 2.2 Technical Context Document (`TECH_CONTEXT_DOC`)
Extract: ADRs (`ADR-###`) with status/context/rationale, tech stack, quality attributes/constraints, integration architecture, cross-cutting concerns.

### 2.3 Deployment & Operations Document (if `HAS_DOD = true`)
Extract: DDRs (`DDR-###`) with status/context/rationale, environment strategy, CI/CD design, infrastructure, observability, reliability targets.

### 2.4 Additional Context
Read if present: `project-instructions.md`, `README.md`. Summarize all into `PROJECT_CONTEXT`.

## 3. Determine Mode

- `specs/project-plan.md` exists with ≥1 `E###` entry → `MODE = REFINE`
- Otherwise → `MODE = CREATE`

REFINE: preserve `[X]`-marked epics, maintain existing IDs for unchanged epics, append new IDs for additions.

## 4. Decompose into Epics

### 4.1 Product Epics (`[PRODUCT]`)

Decompose PRD capabilities into **demo-scoped** epics — one demo-able deliverable per epic.

- Apply **"one demo" test**: if demo covers two independent things → split.
- Single capability often yields 1–3 epics; tightly focused capabilities may stay as one.
- Title names the **specific capability**, ≤5 words. Extra nuance goes after ` — `.
- Tag: `{PRD:CAP-###}` (or `{PRD:CAP-###,CAP-###}` for multi-capability). Do not group unrelated capabilities.

### 4.2 Technical Epics (`[TECHNICAL]`)

- Only ADRs requiring dedicated implementation (framework setup, data layer, shared libraries, integration infra) become epics.
- ADRs absorbed by product epics → no separate epic.
- Tag: `{SAD:ADR-N}`.

### 4.3 Operational Epics (`[OPERATIONAL]`)

Only when `HAS_DOD = true`:
- Identify DDRs requiring setup work (CI/CD, environment provisioning, monitoring, IaC).
- Group related DDRs delivered together. Tag: `{DOD:DDR-N}` or `{DOD:DDR-N,DDR-M}`.

### 4.4 Epic Sizing Guidance

- **Product**: 2–5 acceptance criteria. >5 → split; 1 trivial → merge.
- **Technical**: 2–4 deliverables. Single substantial OK; single trivial → merge.
- **Operational**: 2–4 deliverables. Same heuristics.
- Recommendations for Step 8 review — do not block creation.

### 4.5 Cross-Cutting Epics

- Multi-document epic → primary category from dominant scope; include all source tags (e.g., `{PRD:CAP-005}{SAD:ADR-003}`); note cross-cutting nature in details.
- No direct PRD/SAD/DOD reference → tag closest related item; note derivation in details.

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
   - Record in Dependency Diagram annotations and Epic Details.

## 6. Assign Priorities

- **P1 product epics** ← P1 PRD capabilities. Split capabilities → all epics inherit P1 unless PRD explicitly assigns lower.
- **Prerequisites** of P1 epics inherit P1.
- **Transitive**: P2 epic depends on tech epic → tech epic gets ≥P2.
- **Validate MVP**: P1 epics alone must yield a working product. Fails → promote prerequisites to P1, flag in Step 8.

## 7. Validate Coverage

- **PRD**: every `CAP-###` → ≥1 epic. Missing → create or justify exclusion.
- **SAD**: every implementation-requiring `ADR-###` → ≥1 epic. Absorbed ADRs count as covered.
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

Iterate until confirmed.

## 9. Write `specs/project-plan.md`

Ensure the `specs/` directory exists before writing.

### Output Structure

Frontmatter: `created`, `prd_source`, `sad_source`, `dod_source`.
Header: `# Project Implementation Plan` — inline stats (Product, Created, Status, Total Epics by priority, Waves).

Required sections in order:

| Section | Content |
|---------|---------|
| Epic Checklist | Waves with `### Wave N — [title]` + blockquote notes + epic checklist lines |
| Dependency Diagram | Mermaid `graph LR` AoA style (nodes=milestones, arrows=epics, `<br>` for breaks, ≤30 nodes) |
| Execution Wave Summary | Table: Wave, Epics, All Parallel?, Notes |
| Parallel Execution Guidance | Independent Epics, Integration Risks, Shared Resource Conflicts |
| Epic Details | Per epic: Category, Priority, Source, Scope (2-3 sentences), Actors, Key entities, Depends on, Dependency contracts, Depended on by, Produces (shared), Constraints, Acceptance criteria (`- [ ]`), Specify input (Description, Actors, Key entities, Depends on artifacts, Constraints), Pipeline hints (optional) |
| Coverage Validation | 3 tables: PRD `CAP-###→E###`, SAD `ADR-###→E###`, DOD `DDR-###→E###`. Uncovered items with rationale. |
| Shared Artifact Surface | 3 tables: Shared Data Entities, API Surfaces, Libraries/Modules — Introduced by + Consumed by |
| Wave Transition Protocol | Verify: all Wave N passed QC, tech context updated, shared artifacts produced, dependency contracts satisfiable |

### Epic Checklist Format

`- [ ] E### [P#] [CATEGORY] [P?] {source-tags} Epic title (max 5 words) — brief scope`

Regex: `^- \[([ X])\] (E\d{3}) \[(P[123])\] \[(PRODUCT|TECHNICAL|OPERATIONAL)\] (\[P\] )?(\{[^}]+\})+ (.+)$`

Fields: `E###` sequential | `[P#]` P1=MVP/P2=important/P3=nice-to-have | `[CATEGORY]` PRODUCT/TECHNICAL/OPERATIONAL | `[P]` parallelizable | `{source-tags}` `{PRD:CAP-###}`, `{SAD:ADR-N}`, `{DOD:DDR-N}` or combos.

### Mermaid Rules

AoA style, `graph LR`, `<br>` for breaks (never `\n`), parallel epics from same source node, ≤30 nodes, per-wave details if >15 epics.

### Pipeline Hints

`skip_clarify` (epic fully specified) | `skip_checklist` (low-risk infra) | `lightweight` (reuse existing research). Opt-in, combinable, absence=no change.

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

Output: Mode (CREATE/REFINE), inputs read (paths + extractions), total epics (by category and priority), wave count + parallel opportunities, coverage gaps, registration confirmation, suggested next step (`/sddp-init` with prompt).

</workflow>
