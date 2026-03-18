---
name: system-design
description: "Create or refine a project-level Software Architecture Document (`specs/sad.md`) as the canonical Technical Context Document."
---

# Solution Architect — System Design Workflow

<rules>
- This is a project-bootstrap workflow. Work at project scope, not feature scope.
- Primary output is `specs/sad.md`, and the workflow must still work if `.github/sddp-config.md` does not exist yet.
- Read local context first: repo docs, registered bootstrap docs, existing architecture inputs, and user-provided files.
- Ask only high-impact unresolved questions, in at most two batches: blocking choices before research and follow-up questions after research.
- Each question must include the decision, a recommended answer, a short rationale, and the main tradeoff.
- Delegate all external research and best-practice gathering to **Technical Researcher**. The main workflow must not browse directly.
- Reuse `.github/sddp-config.md` → `## Technical Context Document`; do not create a parallel registry.
- If a registered Technical Context Document conflicts with `specs/sad.md`, ask which should stay canonical. Recommend synthesizing into `specs/sad.md` unless repo context clearly favors another path.
- Preserve valid hand-authored narrative in existing `specs/sad.md`. Keep `## Project Context Baseline Updates` as the managed section for reusable additions.
- Use Mermaid `C4Context`, `C4Container`, and `C4Component` only for C4 views. Use standard Mermaid for runtime, deployment, and non-C4 diagrams. Use `<br>` in labels, never `\n`.
- Keep the SAD architecture-specific and free of SDD or internal workflow text. State that all project source code lives under `/src`.
</rules>

<workflow>

## 0. Acquire Shared Patterns

Read only for reusable patterns:
- `.github/skills/plan-authoring/SKILL.md` — planning-required Technical Context fields
- `.github/skills/clarify-spec/SKILL.md` — batched questions and recommended answers
- `.github/skills/init-project/SKILL.md` — shared config behavior

## 1. Read Available Inputs First

Read when present:
- `README.md`
- `project-instructions.md`
- `.github/sddp-config.md`
- `specs/prd.md`
- `specs/sad.md`

If `.github/sddp-config.md` exists:
1. Read `## Product Document` → `**Path**:` when non-empty and readable.
2. If that path differs from `specs/prd.md` and `specs/prd.md` exists, read `specs/prd.md` too.
3. Read `## Technical Context Document` → `**Path**:` when non-empty and different from `specs/sad.md`.

Search only the most relevant extra architecture inputs:
- top-level files and `docs/` files mentioning architecture, ADRs, technical context, tech stack, constraints, deployment, infrastructure, integrations, or product requirements
- attached files or explicit user paths

Summarize discovered inputs into `PROJECT_CONTEXT` before asking questions.

## 2. Determine Mode and Source of Truth

- `MODE = REFINE` if `specs/sad.md` exists with substantive content; else `CREATE`.
- `TECH_CONTEXT_CONFLICT = true` when a registered Technical Context Document differs from `specs/sad.md` and both exist.
- If the Product Document path is empty and `specs/prd.md` exists, treat `specs/prd.md` as the primary product/domain grounding context.
- `PRODUCT_DOC_CONFLICT = true` when a registered Product Document differs from `specs/prd.md` and both exist.
- Treat any available Product Document as grounding context, not as a replacement for architecture decisions.

## 3. Identify Open Decisions

Infer the likely system type from repo context and available documents.

Build two sets:
- `BLOCKING_CHOICES` — choices that determine the research space: architecture style and boundary strategy, runtime/deployment model, language/runtime, framework family, storage model, canonical source-of-truth handling
- `FOLLOW_UP_DECISIONS` — high-impact questions that benefit from research: integrations, security/trust boundaries, observability baseline, performance, scale, reliability targets, assumptions, and constraints

Skip anything already resolved in the available inputs.

## 4. Ask the Blocking Batch

If `BLOCKING_CHOICES` is non-empty, ask one batch before research.

Rules:
- 1-5 questions.
- Prefer multiple choice; allow short freeform when needed.
- Include `TECH_CONTEXT_CONFLICT` handling here when present.
- If `PRODUCT_DOC_CONFLICT` exists, include a product grounding choice and recommend `specs/prd.md` as canonical when it is the managed bootstrap PRD.
- Each question includes the decision, recommended answer, local-context rationale, and main tradeoff.

## 5. Delegate Research

Run research only after Step 4 answers, unless there were no blocking choices.

Before delegating, report: `Researching architecture patterns, quality attributes, and technical-context best practices.`

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md`):
- **Topics**:
  1. SAD structure and common contents for the detected system type
  2. Architecture styles and tradeoffs for the detected system type
  3. Technology, deployment, and infrastructure best practices for the chosen or narrowed-down stack
  4. Quality attributes, constraints, and reference architectures relevant to the project
- **Context**: `PROJECT_CONTEXT`, system type, constraints, Step 4 answers, unresolved `FOLLOW_UP_DECISIONS`
- **Purpose**: "Inform the canonical project-level `specs/sad.md` and remaining architecture tradeoff decisions."
- **File Paths**: include every project document actually read in Step 1

Use the findings only for unresolved follow-up decisions and final SAD content. Do not browse directly in the main workflow.

## 6. Ask the Follow-Up Batch

If unresolved `FOLLOW_UP_DECISIONS` remain, ask one batch.

Rules:
- 3-7 questions.
- Prefer multiple choice; allow short freeform when needed.
- Each question includes the decision, recommended answer, rationale grounded in repo context or research, and main tradeoff.

Skip this step if no high-impact questions remain.

## 7. Write and Register `specs/sad.md`

Use `.github/skills/system-design/assets/sad-template.md` as the starting structure. Ensure `specs/` exists before writing.

The SAD must contain:
- planning-required Technical Context fields: Language/Version, Primary Dependencies, Storage, Testing, Target Platform, Project Type, Performance Goals, Constraints, Scale/Scope
- downstream sufficiency categories: language/runtime, frameworks/libraries, storage/database, infrastructure/deployment, architecture/patterns
- project scope/context, solution strategy, and architecture style
- Mermaid C4 System Context and Container diagrams
- Mermaid C4 Component diagrams when internal boundaries justify them
- runtime flows, failure paths, and deployment or infrastructure views using standard Mermaid where useful
- cross-cutting concerns: security, reliability, observability, data management, integration strategy, operations
- measurable quality attributes where possible
- `ADR-###` decisions with status, rationale, alternatives, tradeoffs, and consequences
- risks, assumptions, constraints, open questions, and `## Project Context Baseline Updates`

Writing rules:
- Keep it system-specific and architecture-focused.
- No internal workflow filler.
- Preserve valid existing sections and diagrams when refining.
- Remove contradictions instead of duplicating them.
- Keep the managed baseline-updates section distinct from authored architecture narrative.
- Omit the Component View section entirely if the project is too small to justify it.

Registration:
- Ensure `.github/sddp-config.md` exists using the current shared config structure if missing.
- Preserve the Product Document path unless it is empty and `specs/prd.md` exists.
- Adopt `specs/sad.md` as `## Technical Context Document` → `**Path**:` unless the user explicitly keeps another canonical document.
- Preserve unrelated config sections.
- If another document stays canonical, still write/refine `specs/sad.md` and report that downstream phases keep using that path.

## 8. Validate and Report

Verify that:
- `specs/sad.md` exists.
- Planning-required Technical Context fields are present.
- The SAD covers the five downstream sufficiency categories.
- C4 diagrams use Mermaid C4 syntax where included.
- Runtime/deployment/non-C4 diagrams use standard Mermaid syntax where included.
- `## Project Context Baseline Updates` exists.
- `.github/sddp-config.md` exists and registered paths match the chosen canonical sources.

Output:
- `MODE`
- inputs read
- conflicts and resolution
- research topics delegated
- `specs/sad.md` path and registration outcome
- remaining open questions or assumptions
- next steps with explicit labels:
  1. `/sddp-devops` — suggested prompt grounded in `specs/sad.md`
  2. `/sddp-projectplan` — suggested prompt using the registered Product Document and `specs/sad.md`
  3. `/sddp-init` — suggested prompt that preserves/adopts `specs/sad.md`

</workflow>