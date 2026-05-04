---
name: product-document
description: "Turns a rough product idea into a project-level Product Requirements Document (`specs/prd.md`) and registers it as the canonical Product Document. Use when running /sddp-prd or when a product needs structured discovery before system design."
---

# Product Strategist — Product Document Workflow

<rules>
- Project bootstrap, project scope only. Primary output: `specs/prd.md`.
- Must work with or without `.github/sddp-config.md`.
- Read local context before asking questions.
- Ask only unresolved high-impact questions. Max two user batches: blocking before research, follow-up after.
- Every question must include: decision, recommended answer, 1-2 sentence rationale, main tradeoff.
- Delegate all external research to **Technical Researcher**.
- Use only `.github/sddp-config.md` `## Product Document` registration flow.
- Registered Product Document conflicts with `specs/prd.md` → ask user which stays canonical; recommend synthesizing into `specs/prd.md` unless repo context strongly favors another path.
- Preserve valid hand-authored narrative in existing `specs/prd.md`. Keep `## Project Context Baseline Updates` as managed section.
- Preserve existing `CAP-###` identifiers in `## Product Capability Map` when refining. Do not renumber capabilities referenced by `specs/project-plan.md`.
- PRD must stay product-facing, problem-first, mostly technology-agnostic.
- Exclude: feature-level acceptance criteria, Given/When/Then, architecture decisions, implementation plans, backlog items, SDD/internal workflow terms.
- Research-suggested additions must be explicit as in-scope, out-of-scope, open question, or risk. Never expand scope silently.
</rules>

<workflow>

## 0. Shared Patterns

Read for reusable patterns only:
- `.github/skills/compact-communication/SKILL.md` — terse runtime communication rules and auto-clarity exceptions
- `.github/skills/clarify-spec/SKILL.md` — batched questions and recommended answers
- `.github/skills/system-design/SKILL.md` — downstream architecture handoff expectations
- `.github/skills/init-project/SKILL.md` — shared config creation and preservation

## 1. Gather Inputs

Read when present: `README.md`, `project-instructions.md`, `.github/sddp-config.md`, `specs/prd.md`, `specs/sad.md`.

If `.github/sddp-config.md` exists:
1. Parse `## Product Document` → `**Path**:` → read when non-empty and readable
2. Path differs from `specs/prd.md` and `specs/prd.md` exists → read both
3. Parse `## Technical Context Document` → `**Path**:` → read when non-empty and readable

Search most relevant extra product inputs:
- Top-level and `docs/` files mentioning product, strategy, requirements, vision, market, domain, customer, research, personas, scope, validation, or roadmap
- Attached files or explicit user paths

Summarize as `PROJECT_CONTEXT`.

## 2. Mode and Source of Truth

- `specs/prd.md` exists with substantive content → `MODE = REFINE`; else `CREATE`
- Config Product Document path empty and `specs/prd.md` exists → treat as default canonical
- `PRODUCT_DOC_CONFLICT = true` when registered path differs from `specs/prd.md` and both exist
- Registered/default Technical Context Document → downstream architecture context only

## 3. Identify Decisions

Infer product category and maturity from repo context.

- `BLOCKING_CHOICES`: vision/why now, target user/buyer, primary problem/JTBD, evidence quality, scope boundary/release shape, success measures, missing product name in `CREATE`, canonical source-of-truth handling
- `FOLLOW_UP_DECISIONS`: overlooked personas, capability clusters, differentiators, dependencies, risks, KPI patterns

### Product Naming (`CREATE` mode only)

- Prompt/inputs provide clear product name → adopt it
- Otherwise add Product Name question to `BLOCKING_CHOICES` with 3-4 candidates, one-line naming angles, custom-answer option

Skip anything already clear in inputs.

## 4. Blocking Batch

`BLOCKING_CHOICES` non-empty → ask one batch before research.
- 1-6 questions; prefer multiple choice; allow short freeform when needed
- Include `PRODUCT_DOC_CONFLICT` handling when present
- Each question: decision, recommended answer, local-context rationale, main tradeoff

## 5. Research

Run only after Step 4 answers (unless no blocking choices).

Report: `Researching product patterns, domain expectations, and PRD best practices.`

**Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
- **Topics**: (1) PRD structure/discovery patterns for detected category (2) Domain/user/workflow patterns (3) High-value capabilities, differentiators, risks, dependencies, compliance/operational expectations (4) Success metrics and release-validation approaches
- **Context**: `PROJECT_CONTEXT`, product category, constraints, Step 4 answers, unresolved `FOLLOW_UP_DECISIONS`
- **Purpose**: "Inform the canonical project-level `specs/prd.md` without turning it into a feature backlog."
- **File Paths**: every project document read in Step 1

Use research only for follow-up decisions and final content.

## 6. Follow-Up Batch

Unresolved `FOLLOW_UP_DECISIONS` remain → ask one batch.
- 3-7 questions; prefer multiple choice; allow short freeform when needed
- Each question: decision, recommended answer, rationale from repo/research, main tradeoff
- Research-suggested additions → recommend: **include in scope**, **record as out of scope**, **record as open question**, or **reject**

## 7. Write and Register

Use `.github/skills/product-document/assets/prd-template.md` as starting structure. Ensure `specs/` exists.

Downstream sufficiency categories: product vision/purpose, target audience/actors, domain context, scope/boundaries, success measures.

`## Product Capability Map` requirements:
- Stable `CAP-###` identifiers; one row per in-scope capability cluster
- Priority (`P1`/`P2`/`P3`) for MVP planning
- Short outcome-oriented descriptions, not feature-level stories/backlog tasks

Required sections or clear equivalents:
Product Overview, Vision and Why Now, Problem Statement, Background and Evidence, Target Users/Stakeholders/Core Personas, User Needs/JTBD, Product Principles/UX Principles, Scope Summary, In-Scope Capabilities, Product Capability Map, Out-of-Scope Items, Success Metrics/KPIs/Desired Outcomes, Assumptions, Constraints, Dependencies, Risks, Open Questions, Release/Validation Approach, Handoff Guidance, `## Project Context Baseline Updates`, Glossary (when useful).

Writing rules:
- Product-specific, problem-first, mostly technology-agnostic
- Scope as capability clusters and boundaries, not story-level scenarios
- Capability map lightweight and project-scoped; each `CAP-###` is a stable traceability anchor
- No acceptance criteria, Given/When/Then, architecture design, implementation plans, or backlog tasks
- Park rejected research ideas under out of scope, risks, or open questions

Refining:
- Preserve valid narrative; remove contradictions instead of duplicating
- Preserve existing capability IDs; update wording in place
- Keep managed baseline-updates section distinct from authored narrative

Registration:
- Ensure `.github/sddp-config.md` exists (current shared config structure if missing)
- Adopt `specs/prd.md` as `## Product Document` → `**Path**:` unless user explicitly keeps another document
- Preserve unrelated config sections
- Another document stays canonical → still write/refine `specs/prd.md`; report downstream phases keep using registered path

## 8. Validate and Report

Verify:
- `specs/prd.md` exists
- PRD covers five downstream sufficiency categories
- `## Product Capability Map` exists with stable `CAP-###` identifiers and priorities
- Required sections present or intentionally omitted only when optional
- No feature-level acceptance criteria or Given/When/Then
- Research-suggested additions accepted or explicitly parked
- `.github/sddp-config.md` exists; Product Document path matches chosen canonical source

Output:
- `MODE`
- Inputs read
- Conflicts and resolution
- Research topics delegated
- `specs/prd.md` path and registration outcome
- Remaining open questions or assumptions
- Next steps:
  1. `/sddp-systemdesign` — suggested prompt grounded in `specs/prd.md`
  2. `/sddp-init` — suggested prompt preserving `specs/prd.md` and adopting `specs/sad.md` when available

</workflow>
