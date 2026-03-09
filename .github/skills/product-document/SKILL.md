---
name: product-document
description: "Turns a rough product idea into a project-level Product Requirements Document (`docs/prd.md`) and registers it as the canonical Product Document. Use when running /sddp-prd or when a product needs structured discovery before system design."
---

# Product Strategist — Product Document Workflow

<rules>
- This is an optional **project bootstrap** phase. It is the preferred first bootstrap step before `/sddp-systemdesign` and `/sddp-init`.
- Work at project level, not feature level.
- Primary output is `docs/prd.md`.
- This workflow must work even when `.github/sddp-config.md` does not exist yet.
- Read available inputs first: `README.md`, `project-instructions.md`, `.github/sddp-config.md`, existing `docs/prd.md`, existing `docs/sad.md`, registered Product/Technical Context documents, attached docs, product briefs, user-research notes, strategy notes, and other text-readable project context.
- Ask only high-impact unresolved questions. Batch questions into a single interaction when possible.
- Ask blocking product-discovery questions before doing external research. Use repo context to frame those early recommendations, then use Technical Researcher findings only after the choice space is narrowed.
- For each major question, provide a recommended answer grounded in repo context or, for post-research follow-up questions, Technical Researcher findings. Surface key tradeoffs explicitly before asking the user to choose.
- All external research and best-practice gathering must be delegated to **Technical Researcher**. The main agent must not browse directly.
- Reuse the existing `## Product Document` registration flow in `.github/sddp-config.md`. Do not create a parallel registry.
- If an existing Product Document conflicts with `docs/prd.md`, surface the conflict and ask the user to choose. Recommend **Synthesize into canonical `docs/prd.md`** unless repo context clearly indicates another path.
- Preserve hand-authored narrative content in existing `docs/prd.md`. Maintain `## Project Context Baseline Updates` as the managed section for downstream reusable additions.
- Write `docs/prd.md` as a product-facing, problem-first document for stakeholders. Keep it mostly technology-agnostic.
- Do not include feature-story acceptance criteria, Given/When/Then scenarios, technical architecture decisions, sprint/backlog items, or implementation tasks.
- Use Technical Researcher findings to suggest users, capabilities, risks, dependencies, and differentiators the user may not have considered. Unconfirmed suggestions must remain explicit options, open questions, risks, or out-of-scope items rather than silent scope expansion.
- Avoid filler or obvious meta statements. Prefer concrete product-specific content over prose that explains what a PRD is.
</rules>

<workflow>

## 0. Acquire Skills and Baselines

Read these files before proceeding:
- `.github/skills/clarify-spec/SKILL.md` — reuse the question batching and recommended-answer pattern
- `.github/skills/system-design/SKILL.md` — reuse downstream architecture handoff expectations
- `.github/skills/init-project/SKILL.md` — reuse project-level config creation and preservation patterns

## 1. Read Available Inputs First

Read project-level baselines when present:
- `README.md`
- `project-instructions.md`
- `.github/sddp-config.md`
- `docs/prd.md`
- `docs/sad.md`

If `.github/sddp-config.md` exists:
1. Parse `## Product Document` → `**Path**:` and read the file if the path is non-empty and readable.
2. If the parsed Product Document path differs from `docs/prd.md` and `docs/prd.md` exists, read `docs/prd.md` too so source-of-truth conflicts can be evaluated.
3. Parse `## Technical Context Document` → `**Path**:` and read the file if the path is non-empty and readable.

Search for additional text-readable product inputs and read only the most relevant matches:
- top-level docs and `docs/` files mentioning product, strategy, requirements, vision, market, domain, customer, user research, personas, scope, validation, or roadmap
- attached files and explicit paths referenced by the user

Summarize the discovered inputs into `PROJECT_CONTEXT` before asking any questions.

## 2. Determine Starting Mode and Source-of-Truth Status

1. If `docs/prd.md` exists and contains substantive content, set `MODE = REFINE`.
2. Otherwise set `MODE = CREATE`.
3. If the Product Document path in `.github/sddp-config.md` is empty and `docs/prd.md` exists, treat `docs/prd.md` as the default canonical Product Document.
4. If a different Product Document is already registered in `.github/sddp-config.md` and differs from `docs/prd.md` while `docs/prd.md` exists, set `PRODUCT_DOC_CONFLICT = true`.
5. If a registered Technical Context Document exists or `docs/sad.md` exists, treat it as downstream architecture context, not as a replacement for product discovery.

## 3. Identify High-Impact Open Decisions

Infer the likely product category and maturity from repo context and available documents (for example: internal workflow tool, SaaS application, vertical platform, developer tool, marketplace, data product, automation product).

Identify only unresolved decisions that materially affect the project-level product document, such as:
- product vision and why now
- primary target users or buyers
- top problems or jobs to be done
- domain context and evidence quality
- scope boundaries and release shape
- success measures and validation approach
- immovable assumptions, constraints, dependencies, and risks

Do not ask about decisions that are already answered clearly in the available inputs.

Partition unresolved decisions into two sets:
- `BLOCKING_CHOICES` — choices that determine the research space and should be clarified first, such as target audience, primary problem, product category, scope boundary, validation goal, or canonical source-of-truth handling
- `FOLLOW_UP_DECISIONS` — questions that benefit from targeted product research after the blocking choices are known, such as overlooked personas, capability clusters, differentiators, dependencies, risks, or KPI patterns

## 4. Ask Blocking Product Questions First

If `BLOCKING_CHOICES` is non-empty, ask the user a single batched set of only those questions before any external research.

Question rules for this pre-research batch:
- Keep the batch focused and finite; prefer 1–6 questions.
- Include only questions that materially change the research direction or the PRD structure.
- Use multiple choice where possible; allow short free-form input when needed.
- For each question, include:
  - the decision to be made
  - a recommended answer grounded in repo context and currently available documents
  - 1–2 sentences of rationale using only local context and stated constraints
  - the main tradeoff if the user chooses another option

If `PRODUCT_DOC_CONFLICT = true`, include the source-of-truth question in this batch because it affects what should ground the rest of the workflow.

If `BLOCKING_CHOICES` is empty, skip this step.

## 5. Research Discovery Gaps and Hidden Opportunities

Run external research only after Step 4 answers are recorded, unless there were no blocking choices.

Before delegating, report to the user: "🔍 Researching product patterns, domain expectations, and PRD best practices — this may take 15–30 seconds."

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
- **Topics**:
  1. Modern PRD structure and product-discovery patterns for the detected product category
  2. Domain, user, and workflow patterns relevant to the product idea, including likely personas and common pain points
  3. High-value capability areas, differentiators, adjacent risks, dependencies, and compliance or operational expectations the user may not have considered
  4. Success metrics and release-validation approaches used by similar products
- **Context**: `PROJECT_CONTEXT`, the detected product category, known constraints, the recorded answers from Step 4, and any remaining `FOLLOW_UP_DECISIONS`
- **Purpose**: "Inform the canonical project-level `docs/prd.md`, enrich discovery with overlooked users, capabilities, risks, and validation ideas, and ground recommended additions without turning the PRD into a feature backlog."
- **File Paths**: Include every project document actually read in Step 1

Reuse the research findings to ground only the remaining follow-up decisions and the final PRD content. Do not perform any other external browsing in the main workflow.

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
- Research-suggested additions may include overlooked personas, capability areas, risks, constraints, dependencies, or validation ideas the user may not have considered.
- For each research-suggested addition, recommend one disposition: **include in scope**, **record as out of scope**, **record as open question**, or **reject**.
- Keep the discussion at project scope. Do not decompose suggestions into story-level requirements or acceptance criteria.

If no high-impact questions remain, skip user prompting and continue.

## 7. Write or Refine `docs/prd.md`

Use `.github/skills/product-document/assets/prd-template.md` as the starting structure.

Ensure the `docs/` directory exists before writing.

The final `docs/prd.md` must contain:
- enough content to satisfy Product Document sufficiency checks for downstream autopilot:
  - product vision or purpose
  - target audience or actors
  - domain context
  - scope or boundaries
  - success measures
- these sections or their clear equivalents:
  - Product overview
  - Vision and why now
  - Problem statement
  - Background and evidence
  - Target users, stakeholders, and core personas
  - User needs / jobs to be done
  - Product principles or UX principles
  - Scope summary
  - In-scope capabilities
  - Out-of-scope items
  - Success metrics / KPIs / desired outcomes
  - Assumptions
  - Constraints
  - Dependencies
  - Risks
  - Open questions
  - Release or validation approach
  - Domain glossary / terminology when useful
  - Handoff guidance for the next bootstrap phase
  - `## Project Context Baseline Updates` as the managed section for downstream reusable updates

Writing guidance for the document itself:
- Keep the prose specific to the product being described.
- Keep the document product-facing, problem-first, and mostly technology-agnostic.
- Express scope as capability clusters and product boundaries rather than story-level scenarios.
- Do not add feature-story acceptance criteria, Given/When/Then scenarios, architecture design, implementation plans, or backlog tasks.
- If research surfaced high-value opportunities that were not accepted, capture them under Out-of-Scope, Risks, or Open Questions rather than silently promoting them to scope.

When refining an existing `docs/prd.md`:
- preserve valid existing narrative sections
- remove contradictions rather than duplicating competing statements
- keep the managed baseline-updates section distinct from the hand-authored product narrative

If the glossary is not useful for the project, omit the entire section rather than leaving placeholders.

## 8. Register the Canonical Product Document

Ensure `.github/sddp-config.md` exists. If it does not exist, create it using the current project config structure with:
- Product Document path set to `docs/prd.md`
- Technical Context Document path preserved if known, otherwise `docs/sad.md` if it exists, otherwise blank
- `MaxChecklistCount` defaulting to `1`
- Autopilot defaulting to `false`

If `.github/sddp-config.md` already exists:
- preserve all unrelated sections unchanged
- update `## Product Document` → `**Path**:` to `docs/prd.md` unless the user explicitly chose to keep another registered document as canonical
- if the Product Document path is empty and `docs/prd.md` was written, adopt `docs/prd.md`

If the user chose to keep another registered document as canonical:
- do not change the registered path
- still write or refine `docs/prd.md`
- report clearly that downstream phases will continue using the existing registered document until `docs/prd.md` is adopted

## 9. Validate Before Reporting

Verify that:
- `docs/prd.md` exists
- the document covers the five sufficiency categories used by autopilot
- the required sections are present or intentionally omitted only where marked optional
- the document does not include feature-story acceptance criteria or Given/When/Then sections
- research-suggested opportunities are either accepted explicitly or parked explicitly as out-of-scope items, risks, or open questions
- `.github/sddp-config.md` exists and the Product Document path matches the chosen source of truth

## 10. Report

Output:
- Mode used (`CREATE` or `REFINE`)
- Inputs read
- Conflicts found and how they were resolved
- Research topics delegated to Technical Researcher
- `docs/prd.md` path and registration outcome
- Remaining open questions or assumptions
- Suggested next steps with explicit labels:
  1. `/sddp-systemdesign` *(recommended after PRD)* — compose a suggested prompt that uses the generated `docs/prd.md` as the primary product grounding document
  2. `/sddp-init` *(recommended after system design)* — compose a suggested prompt that preserves `docs/prd.md` and adopts `docs/sad.md` when available

</workflow>
