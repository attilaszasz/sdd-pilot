---
name: product-document
description: "Turns a rough product idea into a project-level Product Requirements Document (`specs/prd.md`) and registers it as the canonical Product Document. Use when running /sddp-prd or when a product needs structured discovery before system design."
---

# Product Strategist — Product Document Workflow

<rules>
- Project bootstrap, project scope only. Primary output: `specs/prd.md`.
- Must work with or without `.github/sddp-config.md`.
- Read local context before asking questions.
- Ask only unresolved high-impact questions. Use at most two user batches: blocking before research, follow-up after research.
- Every question must include: decision, recommended answer, 1-2 sentence rationale, main tradeoff.
- Delegate all external research to **Technical Researcher**.
- Use only the existing `.github/sddp-config.md` `## Product Document` registration flow.
- If a registered Product Document conflicts with `specs/prd.md`, ask the user which stays canonical. Recommend synthesizing into canonical `specs/prd.md` unless repo context strongly favors another path.
- Preserve valid hand-authored narrative in existing `specs/prd.md`. Keep `## Project Context Baseline Updates` as the managed section.
- The PRD must stay product-facing, problem-first, and mostly technology-agnostic.
- Exclude feature-level acceptance criteria, Given/When/Then, architecture decisions, implementation plans, backlog items, and SDD/internal workflow terms.
- Research-suggested additions must remain explicit as in-scope, out-of-scope, open question, or risk. Never expand scope silently.
</rules>

<workflow>

## 0. Shared Patterns

Read these only for reusable patterns:
- `.github/skills/clarify-spec/SKILL.md` — batched questions and recommended answers
- `.github/skills/system-design/SKILL.md` — downstream architecture handoff expectations
- `.github/skills/init-project/SKILL.md` — shared config creation and preservation behavior

## 1. Gather Inputs

Read when present:
- `README.md`
- `project-instructions.md`
- `.github/sddp-config.md`
- `specs/prd.md`
- `specs/sad.md`

If `.github/sddp-config.md` exists:
1. Parse `## Product Document` → `**Path**:` and read it when non-empty and readable.
2. If that path differs from `specs/prd.md` and `specs/prd.md` exists, read `specs/prd.md` too.
3. Parse `## Technical Context Document` → `**Path**:` and read it when non-empty and readable.

Search only the most relevant extra product inputs:
- top-level files and `docs/` files mentioning product, strategy, requirements, vision, market, domain, customer, research, personas, scope, validation, or roadmap
- attached files or explicit paths from the user

Summarize the result as `PROJECT_CONTEXT`.

## 2. Mode and Source of Truth

- `MODE = REFINE` if `specs/prd.md` exists with substantive content; else `CREATE`.
- If the config Product Document path is empty and `specs/prd.md` exists, treat `specs/prd.md` as the default canonical Product Document.
- `PRODUCT_DOC_CONFLICT = true` when a registered Product Document differs from `specs/prd.md` and both exist.
- Treat any registered/default Technical Context Document only as downstream architecture context.

## 3. Identify Decisions

Infer product category and maturity from repo context.

Build two sets:
- `BLOCKING_CHOICES`: vision/why now, target user or buyer, primary problem/JTBD, evidence quality, scope boundary or release shape, success measures, missing product name in `CREATE`, canonical source-of-truth handling.
- `FOLLOW_UP_DECISIONS`: overlooked personas, capability clusters, differentiators, dependencies, risks, KPI patterns.

### Product Naming (`CREATE` mode only)

When `MODE = CREATE`:
- If the prompt or inputs already provide a clear product name, adopt it.
- Otherwise add one Product Name question to `BLOCKING_CHOICES` with 3-4 candidates, one-line naming angles, and a custom-answer option.

Skip anything already clear in the inputs.

## 4. Blocking Batch

If `BLOCKING_CHOICES` is non-empty, ask one batch before research.

Rules:
- 1-6 questions.
- Prefer multiple choice; allow short freeform when needed.
- Include `PRODUCT_DOC_CONFLICT` handling here when present.
- Each question includes the decision, recommended answer, local-context rationale, and main tradeoff.

## 5. Research

Research only after Step 4 answers, unless there were no blocking choices.

Before delegating, report: `Researching product patterns, domain expectations, and PRD best practices.`

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
- **Topics**:
  1. PRD structure and discovery patterns for the detected product category
  2. Domain, user, and workflow patterns for the product idea
  3. High-value capabilities, differentiators, risks, dependencies, and compliance or operational expectations
  4. Success metrics and release-validation approaches for similar products
- **Context**: `PROJECT_CONTEXT`, product category, constraints, Step 4 answers, and unresolved `FOLLOW_UP_DECISIONS`
- **Purpose**: "Inform the canonical project-level `specs/prd.md` without turning it into a feature backlog."
- **File Paths**: Include every project document actually read in Step 1

Use research only for follow-up decisions and final content.

## 6. Follow-Up Batch

If unresolved `FOLLOW_UP_DECISIONS` remain, ask one batch.

Rules:
- 3-7 questions.
- Prefer multiple choice; allow short freeform when needed.
- Each question includes the decision, recommended answer, rationale from repo/research, and main tradeoff.
- For research-suggested additions, recommend one of: **include in scope**, **record as out of scope**, **record as open question**, or **reject**.

## 7. Write and Register

Use `.github/skills/product-document/assets/prd-template.md` as the starting structure.

Ensure the `specs/` directory exists before writing.

The PRD must cover the downstream sufficiency categories:
- product vision/purpose
- target audience/actors
- domain context
- scope/boundaries
- success measures

Required sections or clear equivalents:
- Product Overview
- Vision and Why Now
- Problem Statement
- Background and Evidence
- Target Users, Stakeholders, and Core Personas
- User Needs / Jobs To Be Done
- Product Principles or UX Principles
- Scope Summary
- In-Scope Capabilities
- Out-of-Scope Items
- Success Metrics / KPIs / Desired Outcomes
- Assumptions
- Constraints
- Dependencies
- Risks
- Open Questions
- Release or Validation Approach
- Handoff Guidance
- `## Project Context Baseline Updates`
- Glossary only when useful

Writing rules:
- Keep it product-specific, problem-first, and mostly technology-agnostic.
- Express scope as capability clusters and boundaries, not story-level scenarios.
- No acceptance criteria, Given/When/Then, architecture design, implementation plan, or backlog tasks.
- Park rejected research-suggested ideas explicitly under out of scope, risks, or open questions.

When refining:
- Preserve valid narrative.
- Remove contradictions instead of duplicating them.
- Keep the managed baseline-updates section distinct from authored narrative.

Registration:
- Ensure `.github/sddp-config.md` exists using the current shared config structure if missing.
- Adopt `specs/prd.md` as `## Product Document` → `**Path**:` unless the user explicitly keeps another canonical document.
- Preserve unrelated config sections.
- If another document stays canonical, still write/refine `specs/prd.md` and report that downstream phases keep using the existing registered path.

## 8. Validate and Report

Verify that:
- `specs/prd.md` exists.
- The PRD covers the five downstream sufficiency categories.
- Required sections are present or intentionally omitted only when optional.
- No feature-level acceptance criteria or Given/When/Then blocks.
- Research-suggested additions are either accepted or explicitly parked.
- `.github/sddp-config.md` exists and the Product Document path matches the chosen canonical source.

Output:
- `MODE`
- inputs read
- conflicts and resolution
- research topics delegated
- `specs/prd.md` path and registration outcome
- remaining open questions or assumptions
- next steps with explicit labels:
  1. `/sddp-systemdesign` — suggested prompt grounded in `specs/prd.md`
  2. `/sddp-init` — suggested prompt that preserves `specs/prd.md` and adopts `specs/sad.md` when available

</workflow>
