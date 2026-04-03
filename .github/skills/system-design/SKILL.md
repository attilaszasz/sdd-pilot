---
name: system-design
description: "Create or refine a project-level Software Architecture Document (`specs/sad.md`) as the canonical Technical Context Document."
---

# Solution Architect — System Design Workflow

<rules>
- Project-bootstrap workflow. Work at project scope, not feature scope.
- Primary output: `specs/sad.md`; must work without `.github/sddp-config.md`.
- Read local context first: repo docs, registered bootstrap docs, existing architecture inputs, user-provided files.
- Ask only high-impact unresolved questions, max two batches: blocking before research, follow-up after.
- Each question: decision, recommended answer, short rationale, main tradeoff.
- Delegate all external research to **Technical Researcher**; do not browse directly.
- Reuse `.github/sddp-config.md` → `## Technical Context Document`; no parallel registry.
- Registered Technical Context Document conflicts with `specs/sad.md` → ask which stays canonical; recommend synthesizing into `specs/sad.md` unless repo context clearly favors another path.
- Preserve valid hand-authored narrative in existing `specs/sad.md`. Keep `## Project Context Baseline Updates` as managed section.
- Use Mermaid `C4Context`/`C4Container`/`C4Component` only for C4 views. Standard Mermaid for runtime/deployment/non-C4. Use `<br>` in labels, never `\n`.
- C4 diagrams: short names, short type fields, optional short descriptions, short relationship labels.
- Keep SAD architecture-specific, free of SDD/internal workflow text. State all project source code lives under `/src`.
</rules>

<workflow>

## 0. Acquire Shared Patterns

Read for reusable patterns only:
- `.github/skills/plan-authoring/SKILL.md` — planning-required Technical Context fields
- `.github/skills/clarify-spec/SKILL.md` — batched questions and recommended answers
- `.github/skills/init-project/SKILL.md` — shared config behavior

## 1. Read Available Inputs First

Read when present: `README.md`, `project-instructions.md`, `.github/sddp-config.md`, `specs/prd.md`, `specs/sad.md`.

If `.github/sddp-config.md` exists:
1. Read `## Product Document` → `**Path**:` when non-empty and readable
2. Path differs from `specs/prd.md` and `specs/prd.md` exists → read both
3. Read `## Technical Context Document` → `**Path**:` when non-empty and different from `specs/sad.md`

Search most relevant extra architecture inputs:
- Top-level and `docs/` files mentioning architecture, ADRs, technical context, tech stack, constraints, deployment, infrastructure, integrations, or product requirements
- Attached files or explicit user paths

Summarize into `PROJECT_CONTEXT` before asking questions.

## 2. Determine Mode and Source of Truth

- `specs/sad.md` exists with substantive content → `MODE = REFINE`; else `CREATE`
- `TECH_CONTEXT_CONFLICT = true` when registered Technical Context Document differs from `specs/sad.md` and both exist
- Product Document path empty and `specs/prd.md` exists → treat as primary product/domain grounding
- `PRODUCT_DOC_CONFLICT = true` when registered Product Document differs from `specs/prd.md` and both exist
- Available Product Document = grounding context, not replacement for architecture decisions

## 3. Identify Open Decisions

Infer likely system type from repo context and available documents.

- `BLOCKING_CHOICES`: architecture style/boundary strategy, runtime/deployment model, language/runtime, framework family, storage model, canonical source-of-truth handling
- `FOLLOW_UP_DECISIONS`: integrations, security/trust boundaries, observability baseline, performance, scale, reliability targets, assumptions, constraints

Skip anything already resolved.

## 4. Ask the Blocking Batch

`BLOCKING_CHOICES` non-empty → ask one batch before research.
- 1-5 questions; prefer multiple choice; allow short freeform when needed
- Include `TECH_CONTEXT_CONFLICT` handling when present
- `PRODUCT_DOC_CONFLICT` exists → include product grounding choice; recommend `specs/prd.md` when it is the managed bootstrap PRD
- Each question: decision, recommended answer, local-context rationale, main tradeoff

## 5. Delegate Research

Run only after Step 4 answers (unless no blocking choices).

Report: `Researching architecture patterns, quality attributes, and technical-context best practices.`

**Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
- **Topics**: (1) SAD structure/common contents for detected system type (2) Architecture styles/tradeoffs (3) Technology/deployment/infrastructure best practices for chosen stack (4) Quality attributes, constraints, reference architectures
- **Context**: `PROJECT_CONTEXT`, system type, constraints, Step 4 answers, unresolved `FOLLOW_UP_DECISIONS`
- **Purpose**: "Inform the canonical project-level `specs/sad.md` and remaining architecture tradeoff decisions."
- **File Paths**: every project document read in Step 1

Use findings only for unresolved follow-up decisions and final SAD content.

## 6. Ask the Follow-Up Batch

Unresolved `FOLLOW_UP_DECISIONS` remain → ask one batch.
- 3-7 questions; prefer multiple choice; allow short freeform when needed
- Each question: decision, recommended answer, rationale from repo context/research, main tradeoff
- No high-impact questions remain → skip

## 7. Write and Register `specs/sad.md`

Use `.github/skills/system-design/assets/sad-template.md` as starting structure. Ensure `specs/` exists.

Required Technical Context fields: Language/Version, Primary Dependencies, Storage, Testing, Target Platform, Project Type, Performance Goals, Constraints, Scale/Scope.

Downstream sufficiency categories: language/runtime, frameworks/libraries, storage/database, infrastructure/deployment, architecture/patterns.

The SAD must contain:
- Project scope/context, solution strategy, architecture style
- Mermaid C4 System Context and Container diagrams; keep actors, trust boundaries, and core containers only
- C4 Component diagrams only when they materially improve understanding
- Runtime flows, failure paths, deployment/infrastructure views (standard Mermaid where useful)
- Cross-cutting concerns: security, reliability, observability, data management, integration strategy, operations
- Measurable quality attributes where possible
- `ADR-###` decisions with status, rationale, alternatives, tradeoffs, consequences
- Risks, assumptions, constraints, open questions, `## Project Context Baseline Updates`

Writing rules:
- System-specific and architecture-focused; no internal workflow filler
- Preserve valid existing sections/diagrams when refining; remove contradictions instead of duplicating
- Use short diagram titles: `System Context`, `Container View`, `Component View`
- Target 6-10 nodes per C4 view, hard cap 15
- C4 labels: names 1-3 words; short type fields; descriptions optional, max 4 words
- Relationship labels: short verbs only; omit obvious labels
- Omit commodity tooling, helpers, and low-value internals unless they define a critical boundary
- Keep managed baseline-updates section distinct from authored narrative
- Omit Component View if the project is too small or the view is crowded

Registration:
- Ensure `.github/sddp-config.md` exists (current shared config structure if missing)
- Preserve Product Document path unless empty and `specs/prd.md` exists
- Adopt `specs/sad.md` as `## Technical Context Document` → `**Path**:` unless user explicitly keeps another document
- Preserve unrelated config sections
- Another document stays canonical → still write/refine `specs/sad.md`; report downstream phases keep using that path

## 8. Validate and Report

Verify:
- `specs/sad.md` exists
- Planning-required Technical Context fields present
- SAD covers five downstream sufficiency categories
- C4 diagrams use Mermaid C4 syntax; runtime/deployment/non-C4 use standard Mermaid
- `## Project Context Baseline Updates` exists
- `.github/sddp-config.md` exists; registered paths match chosen canonical sources

Output:
- `MODE`
- Inputs read
- Conflicts and resolution
- Research topics delegated
- `specs/sad.md` path and registration outcome
- Remaining open questions or assumptions
- Next steps:
  1. `/sddp-devops` — suggested prompt grounded in `specs/sad.md`
  2. `/sddp-projectplan` — suggested prompt using registered Product Document and `specs/sad.md`
  3. `/sddp-init` — suggested prompt preserving/adopting `specs/sad.md`

</workflow>
