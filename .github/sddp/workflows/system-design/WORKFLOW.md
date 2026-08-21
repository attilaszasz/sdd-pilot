---
name: system-design
description: "Create or refine a project-level Software Architecture Document (`specs/sad.md`) as the canonical Technical Context Document."
---

# Solution Architect — System Design Workflow

<rules>
- Project-bootstrap workflow. Work at project scope, not feature scope.
- Primary output: the registered Technical Context Document, default `specs/sad.md`; must work without `.github/sddp-config.md`.
- Read local context first: repo docs, registered bootstrap docs, existing architecture inputs, user-provided files.
- Adapt collaboration depth to detected complexity. Simple systems stay fast; compound and complex systems require decomposition and critical-flow approval checkpoints.
- At each checkpoint show a recommended answer, local-context rationale, main tradeoff, and a free-form override. Never infer approval from silence.
- Delegate all external research to **Technical Researcher**; do not browse directly.
- Reuse `.github/sddp-config.md` → `## Technical Context Document`; no parallel registry or duplicate SAD.
- Preserve valid hand-authored narrative in an existing canonical SAD. Keep `## Project Context Baseline Updates` as a managed section.
- Use C4 Context and Container views for the static overview. Select standard Mermaid diagrams by concern for runtime, data, state, trust, and deployment views. Use `<br>` in labels, never `\n`.
- Keep diagrams scoped: short labels, one concern per view, target 6-10 nodes and hard cap 15 nodes per view. Split complex views by domain, trust zone, runtime, or region.
- Keep the SAD architecture-specific and free of SDD/internal workflow text. Do not impose `/src` on brownfield repositories; record the adopted source layout.
</rules>

<workflow>

## 0. Acquire Shared Patterns

Read for reusable patterns only:
- `.github/skills/plan-authoring/SKILL.md` — planning-required Technical Context fields
- `.github/sddp/workflows/clarify-spec/WORKFLOW.md` — batched questions and recommended answers
- `.github/sddp/workflows/init-project/WORKFLOW.md` — shared config and source-layout behavior
- `.github/skills/adr-authoring/SKILL.md` — MADR format, numbering, lifecycle rules, and SAD catalog contract

## 1. Resolve Inputs and Canonical SAD

Read when present: `README.md`, `project-instructions.md`, `.github/sddp-config.md`, `specs/prd.md`, and the registered/default Technical Context Document.

Resolve `CANONICAL_SAD` before questions or drafting:
1. A non-empty readable `.github/sddp-config.md` → `## Technical Context Document` → `**Path**:` wins.
2. Empty registration → use readable `specs/sad.md`; otherwise adopt `specs/sad.md` as the default.
3. A non-empty unreadable registration → **HALT** and ask the user to repair or explicitly replace it. Do not silently fall back.
4. A readable registered custom path remains authoritative when `specs/sad.md` also exists. Do not create or update a parallel `specs/sad.md`.
5. Every candidate path must be normalized, repository-relative, free of `..` traversal, and symlink-free before any read or write. Unsafe path → **HALT**.

Resolve product grounding config-first using `## Product Document`; when registration is empty, use readable `specs/prd.md`. Read relevant top-level and `docs/` files mentioning architecture, ADRs, technical context, stack, constraints, deployment, infrastructure, integrations, data, security, or product requirements, plus user-provided paths.

Set `MODE = REFINE` when `CANONICAL_SAD` has substantive content; otherwise `CREATE`. Summarize inputs as `PROJECT_CONTEXT` before asking questions.

## 2. Profile System Complexity

Build a `COMPLEXITY_PROFILE` from evidence, not project size adjectives. Score one point for each present signal:
- Multiple business domains or independently owned bounded contexts
- More than two deployable/runtime units
- Multiple storage technologies or materially different data owners
- Three or more consequential external integrations
- Asynchronous messaging, streaming, scheduled pipelines, or offline synchronization
- Sensitive/regulated data, material trust boundaries, tenancy isolation, or data residency
- Multi-region, edge, offline-first, or active failover requirements
- Strict reliability/performance targets, legacy migration, or long-lived compatibility constraints

Classification:
- `0-2` → `SIMPLE`
- `3-4` → `COMPOUND`
- `5+` → `COMPLEX`
- Any explicit safety-critical design, regulated cross-region data movement, or multi-region active failover → at least `COMPLEX`

Report the classification and evidence. Use `COLLABORATIVE_PATH = true` for `COMPOUND` or `COMPLEX`; otherwise `false`. When evidence is insufficient to classify safely, ask one blocking question rather than defaulting to SIMPLE.

## 3. Propose and Approve Decomposition

Infer an initial decomposition from product capabilities, domain language, ownership, data boundaries, trust boundaries, and runtime constraints before selecting technologies.

Prepare a decomposition table with: Boundary, Responsibilities, Data Ownership, Exposed Interfaces, Dependencies, Deployment Independence. Avoid equating every domain boundary with a service.

When `COLLABORATIVE_PATH = true`, present:
1. The recommended decomposition
2. One credible alternative with its main tradeoff
3. Material uncertainties or ownership conflicts

Ask the user to approve, revise, or replace it. Do not continue until explicitly answered. Integrate the answer as `APPROVED_DECOMPOSITION`.

When `COLLABORATIVE_PATH = false`, include the inferred decomposition in the later blocking batch only if a material boundary remains uncertain; otherwise retain it as `APPROVED_DECOMPOSITION`.

## 4. Resolve Blocking Architecture Choices

Identify unresolved decisions against `APPROVED_DECOMPOSITION`:
- Boundary and communication strategy; synchronous versus asynchronous edges
- Runtime/deployment model; language/runtime and framework families
- Data ownership, storage, consistency, transaction, retention, and migration model
- Identity propagation, authorization, tenancy, and trust boundaries
- Canonical source handling and source-code layout

Skip resolved items. Ask one blocking batch before research:
- `SIMPLE`: 1-5 high-impact questions
- `COMPOUND`/`COMPLEX`: all unresolved choices that would invalidate research or flow design; group related choices and avoid low-level technology trivia

Each question includes the decision, recommendation, rationale, tradeoff, and free-form option.

## 5. Delegate Focused Research

Run only after blocking choices are answered, unless none exist.

Report: `Researching unresolved architecture patterns, quality attributes, and stack constraints.`

**Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
- **Topics**: up to four unresolved consequential topics selected from architecture patterns, technology/deployment constraints, data/consistency, security/trust, reliability, and reference architectures
- **Context**: `PROJECT_CONTEXT`, `COMPLEXITY_PROFILE`, `APPROVED_DECOMPOSITION`, blocking answers, unresolved decisions
- **Purpose**: "Inform the canonical project-level Technical Context Document without selecting product scope or inventing stakeholder agreement."
- **File Paths**: every project document read in Step 1

Use findings only to inform unresolved decisions and SAD content.

## 6. Inventory and Approve Major Flows

Derive the minimum set of major flows needed to explain the architecture. Cover every P1 capability or primary system objective, but combine capabilities that share the same material path.

For each flow capture: Flow ID (`FLOW-###`), trigger, source/actor, processing boundaries, stores, egress, trust/data classification, consistency/transaction boundary, and failure/recovery behavior.

Include where applicable:
- Critical synchronous request/response journeys
- Asynchronous producer → transport → consumer paths, including ordering, deduplication, retry, dead-letter, replay, and backpressure
- Ingestion, transformation, storage, export, retention, and deletion paths
- Identity/token propagation and trust-boundary crossings
- Timeout, partial failure, fallback, compensation, and disaster-recovery paths

When `COLLABORATIVE_PATH = true`, present the proposed flow inventory and ask the user to approve, add, remove, or reprioritize flows. Do not draft diagrams until explicitly answered. For `SIMPLE`, ask only when a primary path or failure expectation remains uncertain.

## 7. Select Architecture Views and Resolve Follow-Ups

Create a view catalog before drawing. Select the fewest views that answer material questions:
- C4 System Context: always; actors, system boundary, external systems, trust boundaries
- C4 Container: always; one overview for SIMPLE, multiple scoped views for COMPOUND/COMPLEX when one view would exceed 15 nodes or mix concerns
- C4 Component: only for a materially complex container whose internals affect project-wide decisions
- Sequence diagram: critical synchronous journeys and temporal failure behavior
- Flowchart: asynchronous/event/data pipelines, trust-zone crossings, migration/coexistence, and deployment topology
- State diagram: meaningful lifecycle or orchestration state machines
- ER diagram: project-level conceptual ownership/relationship questions; never duplicate feature-level physical schemas

Do not use C4 Dynamic or Deployment syntax; standard Mermaid is more portable for those concerns.

Ask one follow-up batch for unresolved integrations, security, observability, performance, scale, reliability, recovery, migration, and operational ownership. `SIMPLE`: 1-5 questions. `COMPOUND`/`COMPLEX`: include every unresolved item that affects a selected view, major flow, quality target, or ADR.

## 8. Preview the Architecture

Before creating ADRs or writing the canonical SAD, present a compact candidate preview:
- Complexity classification and approved decomposition
- Major flows and selected diagrams
- Architecture style and source layout
- Accepted project-level decisions that warrant ADRs
- Measurable quality targets
- Remaining assumptions/open questions and proposed `sad_maturity`

Ask the user to approve or revise the candidate when `COLLABORATIVE_PATH = true`, when refining substantive existing content, or when any new ADR will be created. Silence is not approval.

ADR threshold: create an ADR only for a consequential, durable project-level decision with credible alternatives. Do not create ADRs for defaults, reversible implementation details, or facts already dictated by constraints.

## 9. Author ADRs and Build the SAD Candidate

For each approved ADR-worthy decision, **delegate** to the **ADR Author** subagent (`.github/agents/_adr-author.md`) with a fully resolved payload. Call it once per accepted decision and collect the returned SAD catalog rows. Full decision bodies live only in standalone files under `specs/adrs/`.

Use `.github/sddp/workflows/system-design/assets/sad-template.md`. Required Technical Context fields remain: Language/Version, Primary Dependencies, Storage, Testing, Target Platform, Project Type, Performance Goals, Constraints, Scale/Scope.

The candidate must contain:
- Frontmatter with `sad_schema`, `sad_maturity`, `created`, and `updated`
- Purpose/scope, approved decomposition, solution strategy, architecture style, and adopted source layout
- View catalog plus C4 System Context and Container views
- Major Data Flow Catalog and one standard Mermaid diagram per `FLOW-###`
- Failure/recovery paths in each major-flow diagram or immediately adjacent text
- Conditional component, state, conceptual data, trust, migration, and deployment views selected in Step 7
- Security, reliability, observability, data management, integration, and operations concerns
- Measurable quality attributes
- ADR catalog linking to standalone MADR files
- Risks, assumptions, constraints, open questions, and `## Project Context Baseline Updates`

Set `sad_maturity: planning-ready` only when decomposition, major flows, trust/data ownership, quality targets, and ADR-worthy decisions are resolved. Otherwise use `draft` and keep unresolved items explicit.

Writing rules:
- Preserve valid existing sections and diagrams when refining; replace contradictions instead of duplicating
- Keep C4 names 1-3 words, short type fields, optional descriptions up to 4 words, and short relationship labels
- Keep each view at 15 nodes or fewer; split rather than shrink labels into unreadability
- Use stable existing `FLOW-###` IDs on refinement; append new IDs monotonically and never reuse an ID for a different flow
- Omit commodity tooling and low-value internals unless they define a critical boundary
- Record `/src` only when adopted by the project; preserve established brownfield layouts
- Keep the managed baseline-updates section distinct from authored narrative

Write the complete candidate to a temporary sibling of `CANONICAL_SAD`; do not modify the live SAD or registration yet.

## 10. Validate, Publish, and Register

1. Run `node scripts/validate-sad.mjs "<candidate-path>" --profile "SAD_MATURITY"`. Non-zero, malformed JSON, or `valid=false` → fix the candidate and rerun; do not change live SAD/config.
2. Preserve the prior live SAD and config bytes in memory, then replace `CANONICAL_SAD` with the exact validated candidate bytes.
3. Create/update `.github/sddp-config.md` `## Technical Context Document` → `**Path**: CANONICAL_SAD`, preserving unrelated sections and the Product Document registration.
4. Run `node scripts/validate-sad.mjs "CANONICAL_SAD" --profile "SAD_MATURITY" --config .github/sddp-config.md`.
5. Any live validation or registration failure → restore the prior SAD/config bytes (or remove newly created files), report the failure, and **HALT**. Never report the candidate as canonical.
6. Remove the temporary candidate after live PASS.

Validation must confirm:
- Required Technical Context fields and all five downstream sufficiency categories
- System decomposition, view catalog, C4 overview, and per-view node limits
- Major flow catalog, unique `FLOW-###` IDs, matching diagrams, and failure/recovery coverage
- Cross-cutting concerns and measurable quality targets
- ADR catalog shape and links; no embedded full ADR prose
- `## Project Context Baseline Updates` and canonical config registration

## 11. Report

Report only:
- `MODE`, `COMPLEXITY_PROFILE`, and collaboration checkpoints completed
- Inputs read and canonical SAD path
- Decomposition/flow counts and selected view types
- Research topics delegated and ADRs created
- Candidate/live validator results and registration outcome
- Remaining open questions or assumptions
- Next command: `/sddp-devops`, `/sddp-projectplan`, or `/sddp-init`, with one grounded suggested prompt

</workflow>
