---
name: system-design
description: "Creates or refines a project-level Software Architecture Document (`specs/sad.md`) as the canonical Technical Context Document for downstream SDD phases. Use when running /sddp-systemdesign or when establishing reusable project-level technical context after `/sddp-prd` and before `/sddp-devops` or `/sddp-init`."
---

# Solution Architect — System Design Workflow

<rules>
- This is an optional **project bootstrap** phase. It typically runs after `/sddp-prd` and before `/sddp-devops` or `/sddp-init` when a reusable technical baseline is needed.
- Work at project level, not feature level.
- Primary output is `specs/sad.md`.
- This workflow must work even when `.github/sddp-config.md` does not exist yet.
- Read available inputs first: `README.md`, `project-instructions.md`, `.github/sddp-config.md`, existing `specs/prd.md`, existing `specs/sad.md`, registered Product/Technical Context documents, attached docs, existing architecture docs, technical docs, constraints docs, mockups, and text-readable diagrams.
- Ask only high-impact unresolved questions. Batch questions into a single interaction when possible.
- Ask prerequisite architecture-choice questions before doing external research. Use repo context to frame those early recommendations, then use Technical Researcher findings only after the choice space is narrowed.
- For each major question, provide a recommended answer grounded in repo context or, for post-choice follow-up questions, Technical Researcher findings. Surface key tradeoffs explicitly before asking the user to choose.
- All external research and best-practice gathering must be delegated to **Technical Researcher**. The main agent must not browse directly.
- Reuse the existing `## Technical Context Document` registration flow in `.github/sddp-config.md`. Do not create a parallel registry.
- If an existing Technical Context Document conflicts with `specs/sad.md`, surface the conflict and ask the user to choose. Recommend **Synthesize into canonical `specs/sad.md`** unless repo context clearly indicates another path.
- Preserve hand-authored narrative content in existing `specs/sad.md`. Maintain `## Project Context Baseline Updates` as the managed section for downstream reusable additions.
- Use Mermaid C4 syntax only for C4 Level 1–3 architecture views: `C4Context`, `C4Container`, and `C4Component` where relevant. Use standard Mermaid syntax for runtime flows, deployment views, and any non-C4 diagrams.
- In Mermaid diagrams, use `<br>` for line breaks inside node labels — never use `\n`.
- Write `specs/sad.md` as a generic Software Architecture Document for engineers and stakeholders. Do not mention SDD, SDDP, downstream phases, workflow reuse, document registration, or explain what a SAD is.
- Ensure the architecture explicitly specifies that all project source code goes into the `/src` directory.
- Avoid filler or obvious meta statements. Prefer concrete system-specific content over prose that explains the document itself.
</rules>

<workflow>

## 0. Acquire Skills and Baselines

Read these files before proceeding:
- `.github/skills/plan-authoring/SKILL.md` — reuse the Technical Context fields required by planning
- `.github/skills/clarify-spec/SKILL.md` — reuse the question batching and recommended-answer pattern
- `.github/skills/init-project/SKILL.md` — reuse project-level config creation and preservation patterns

## 1. Read Available Inputs First

Read project-level baselines when present:
- `README.md`
- `project-instructions.md`
- `.github/sddp-config.md`
- `specs/prd.md`
- `specs/sad.md`

If `.github/sddp-config.md` exists:
1. Parse `## Product Document` → `**Path**:` and read the file if the path is non-empty and readable.
2. If the parsed Product Document path differs from `specs/prd.md` and `specs/prd.md` exists, read `specs/prd.md` too so product source-of-truth conflicts can be evaluated.
3. Parse `## Technical Context Document` → `**Path**:` and read the file if the path is non-empty and differs from `specs/sad.md`.

Search for additional text-readable architecture inputs and read only the most relevant matches:
- top-level docs and `docs/` files mentioning architecture, ADRs, technical context, tech stack, constraints, deployment, infrastructure, integrations, or product requirements
- attached files and explicit paths referenced by the user

Summarize the discovered inputs into `PROJECT_CONTEXT` before asking any questions.

## 2. Determine Starting Mode and Source-of-Truth Status

1. If `specs/sad.md` exists and contains substantive content, set `MODE = REFINE`.
2. Otherwise set `MODE = CREATE`.
3. If a different Technical Context Document is already registered in `.github/sddp-config.md` and differs from `specs/sad.md`, set `TECH_CONTEXT_CONFLICT = true`.
4. If the Product Document path is empty and `specs/prd.md` exists, treat `specs/prd.md` as the primary product and domain grounding context.
5. If a different Product Document is already registered in `.github/sddp-config.md`, `specs/prd.md` exists, and the two paths differ, set `PRODUCT_DOC_CONFLICT = true`.
6. If a Product Document is available, treat it as the primary product and domain grounding context, not as a replacement for architecture decisions.

## 3. Identify High-Impact Open Decisions

Infer the likely system type from repo context and available documents (for example: library, single service, web application, mobile + API, platform, data pipeline, automation tool).

Identify only unresolved decisions that materially affect the project architecture, such as:
- architecture style and boundary strategy
- runtime and deployment model
- primary storage and data ownership boundaries
- integration patterns and external dependencies
- security posture and trust boundaries
- observability and operations baseline
- performance, scale, and reliability targets
- immovable constraints and assumptions

Do not ask about decisions that are already answered clearly in the available inputs.

Partition unresolved decisions into two sets:
- `BLOCKING_CHOICES` — choices that determine the research space and should be clarified first, such as language/runtime, framework family, deployment target, storage model, or canonical source-of-truth handling
- `FOLLOW_UP_DECISIONS` — questions that benefit from targeted best-practice research after the blocking choices are known

## 4. Ask Blocking Choice Questions First

If `BLOCKING_CHOICES` is non-empty, ask the user a single batched set of only those questions before any external research.

Question rules for this pre-research batch:
- Keep the batch focused and finite; prefer 1–5 questions.
- Include only questions that materially change the research direction.
- Use multiple choice where possible; allow short free-form input when needed.
- For each question, include:
  - the decision to be made
  - a recommended answer grounded in repo context and currently available documents
  - 1–2 sentences of rationale using only local context and stated constraints
  - the main tradeoff if the user chooses another option

If `TECH_CONTEXT_CONFLICT = true`, include a question asking which technical context document should be treated as canonical for the rest of the workflow.

If `PRODUCT_DOC_CONFLICT = true`, include a question asking which product document should be treated as canonical:
- **Recommended**: Adopt `specs/prd.md` as canonical (the bootstrap PRD created by `/sddp-prd`).
- **Alternative**: Keep the currently registered path (`[registered path]`).
- **Rationale**: `specs/prd.md` is the default location managed by `/sddp-prd` and expected by downstream phases.

If `BLOCKING_CHOICES` is empty, skip this step.

## 5. Research Architecture Gaps

Run external research only after Step 4 answers are recorded, unless there were no blocking choices.

Before delegating, report to the user: "🔍 Researching architecture patterns, quality attributes, and technical-context best practices — this may take 15–30 seconds."

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
- **Topics**:
  1. SAD structure and common contents for the detected system type
  2. Architecture styles and tradeoffs for the detected system type
  3. Technology, deployment, and infrastructure best practices for the chosen or narrowed-down stack
  4. Quality attributes, constraints, and reference architectures relevant to the project
- **Context**: `PROJECT_CONTEXT`, the detected system type, known constraints, the recorded answers from Step 4, and any remaining `FOLLOW_UP_DECISIONS`
- **Purpose**: "Inform the canonical project-level `specs/sad.md`, remaining architecture tradeoff decisions, and the final document content."
- **File Paths**: Include every project document actually read in Step 1

Reuse the research findings to ground only the remaining follow-up decisions and the final SAD content. Do not perform any other external browsing in the main workflow.

## 6. Ask One Batched Follow-Up Question Set

If `FOLLOW_UP_DECISIONS` remain unresolved after Step 5, ask the user a single batched set of follow-up questions.

Question rules:
- Keep the batch focused and finite; prefer 3–7 questions.
- Use multiple choice where possible; allow short free-form input when needed.
- For each question, include:
  - the decision to be made
  - a recommended answer
  - 1–2 sentences of rationale grounded in repo context or Technical Researcher findings
  - the main tradeoff if the user chooses another option

If no high-impact questions remain, skip user prompting and continue.

## 7. Write or Refine `specs/sad.md`

Use `.github/skills/system-design/assets/sad-template.md` as the starting structure.

Ensure the `specs/` directory exists before writing.

The final `specs/sad.md` must contain:
- the planning Technical Context fields required by `.github/skills/plan-authoring/SKILL.md`:
  - Language/Version
  - Primary Dependencies
  - Storage
  - Testing
  - Target Platform
  - Project Type
  - Performance Goals
  - Constraints
  - Scale/Scope
- enough content to satisfy Technical Context sufficiency checks for downstream autopilot:
  - language/runtime
  - frameworks/libraries
  - storage/database
  - infrastructure/deployment
  - architecture/patterns
- project scope and context
- solution strategy and architecture style
- Mermaid C4 System Context and Container diagrams
- Mermaid C4 Component diagrams where the project has meaningful internal boundaries
- key runtime flows and failure paths using standard Mermaid syntax when diagrammed
- deployment and infrastructure view using standard Mermaid syntax when diagrammed
- cross-cutting concerns:
  - security
  - reliability
  - observability
  - data management
  - integration strategy
  - operations
- quality attributes with measurable targets where possible
- architecture decisions using `ADR-###` identifiers, with status, rationale, alternatives, tradeoffs, and consequences
- risks, assumptions, constraints, and open questions
- `## Project Context Baseline Updates` as the managed section for downstream reusable updates

Writing guidance for the document itself:
- Keep the prose specific to the system being described.
- Do not add introductory sentences about this document being canonical, reusable by phases, or intended for SDD workflows.
- Do not add obvious statements such as what an architecture document does; move directly into project-specific context.

When refining an existing `specs/sad.md`:
- preserve valid existing architecture sections and diagrams
- remove contradictions rather than duplicating competing statements
- keep the managed baseline-updates section distinct from the hand-authored architecture narrative

If the project is too small to justify a Component view, omit the entire Component View section rather than adding explanatory prose.

## 8. Register the Canonical Technical Context Document

Ensure `.github/sddp-config.md` exists. If it does not exist, create it using the current project config structure with:
- Product Document path preserved if known, otherwise `specs/prd.md` if it exists, otherwise blank
- Technical Context Document path set to `specs/sad.md`
- `MaxChecklistCount` defaulting to `1`
- Autopilot defaulting to `false`

If `.github/sddp-config.md` already exists:
- preserve all unrelated sections unchanged
- preserve the existing Product Document path unless it is empty and `specs/prd.md` exists, in which case adopt `specs/prd.md`
- update `## Technical Context Document` → `**Path**:` to `specs/sad.md` unless the user explicitly chose to keep another registered document as canonical

If the user chose to keep another registered document as canonical:
- do not change the registered path
- still write or refine `specs/sad.md`
- report clearly that downstream phases will continue using the existing registered document until `specs/sad.md` is adopted

## 9. Validate Before Reporting

Verify that:
- `specs/sad.md` exists
- the Technical Context fields required by planning are present
- the document covers the five sufficiency categories used by autopilot
- C4 Level 1–3 diagrams use Mermaid C4 syntax where included
- runtime, deployment, and other non-C4 diagrams use standard Mermaid syntax where included
- `## Project Context Baseline Updates` exists
- `.github/sddp-config.md` exists, the Technical Context Document path matches the chosen source of truth, and the Product Document path is preserved or adopted correctly when `specs/prd.md` exists

## 10. Report

Output:
- Mode used (`CREATE` or `REFINE`)
- Inputs read
- Conflicts found and how they were resolved
- Research topics delegated to Technical Researcher
- `specs/sad.md` path and registration outcome
- Remaining open questions or assumptions
- Brief next-step guidance: if deployment, infrastructure, observability, or reliability planning is still needed, continue with `/sddp-devops`; otherwise continue with `/sddp-init`
- Suggested next steps with explicit labels:
  1. `/sddp-devops` *(recommended when deployment and operations planning is needed)* — compose a suggested prompt that uses the generated `specs/sad.md` as the primary technical context document
  2. `/sddp-init` *(recommended when ready to finalize project governance)* — compose a suggested prompt that preserves or adopts the generated `specs/sad.md`

</workflow>