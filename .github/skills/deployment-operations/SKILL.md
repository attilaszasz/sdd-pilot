---
name: deployment-operations
description: "Creates or refines a project-level Deployment & Operations Document (`specs/dod.md`) covering environments, CI/CD, infrastructure, observability, reliability, security, and operational ownership. Use when running /sddp-devops or when establishing reusable deployment and operations context after `/sddp-systemdesign` and before `/sddp-projectplan` or `/sddp-init`."
---

# DevOps Strategist — Deployment & Operations Workflow

<rules>
- This is an optional **project bootstrap** phase. It typically runs after `/sddp-systemdesign` and before `/sddp-projectplan` or `/sddp-init` when deployment and operational planning is needed.
- Work at project level, not feature level.
- Primary output is `specs/dod.md`.
- This workflow must work even when `.github/sddp-config.md` does not exist yet.
- Read available inputs first: `README.md`, `project-instructions.md`, `.github/sddp-config.md`, existing `specs/prd.md`, existing `specs/sad.md`, existing `specs/dod.md`, registered Product/Technical Context/Deployment & Operations documents, attached docs, infrastructure docs, runbooks, and text-readable deployment or operations artifacts.
- **Complement, do not duplicate** — the SAD covers architecture decisions. This document covers how the system is deployed, operated, and kept reliable. Reference the SAD for architecture context but do not repeat architecture choices.
- Ask only high-impact unresolved questions. Batch questions into a single interaction when possible.
- Ask prerequisite deployment-choice questions before doing external research. Use repo context and SAD content to frame those early recommendations, then use Technical Researcher findings only after the choice space is narrowed.
- For each major question, provide a recommended answer grounded in repo context or, for post-choice follow-up questions, Technical Researcher findings. Surface key tradeoffs explicitly before asking the user to choose.
- All external research and best-practice gathering must be delegated to **Technical Researcher**. The main agent must not browse directly.
- Reuse the existing registration flow in `.github/sddp-config.md`. Do not create a parallel registry.
- If an existing Deployment & Operations Document conflicts with `specs/dod.md`, surface the conflict and ask the user to choose. Recommend **Synthesize into canonical `specs/dod.md`** unless repo context clearly indicates another path.
- Preserve hand-authored narrative content in existing `specs/dod.md`.
- Use standard Mermaid syntax for all diagrams (flowchart, sequence). Do not use C4 syntax — C4 diagrams belong in the SAD.
- In Mermaid diagrams, use `<br>` for line breaks inside node labels — never use `\n`.
- Write `specs/dod.md` as a deployment and operations document for engineers and SREs. Do not mention SDD, SDDP, downstream phases, workflow reuse, document registration, or explain what a DOD is.
- Avoid filler or obvious meta statements. Prefer concrete system-specific content over prose that explains the document itself.
</rules>

<workflow>

## 0. Acquire Skills and Baselines

Read these files before proceeding:
- `.github/skills/plan-authoring/SKILL.md` — understand the Technical Context fields that planning needs
- `.github/skills/clarify-spec/SKILL.md` — reuse the question batching and recommended-answer pattern
- `.github/skills/init-project/SKILL.md` — reuse project-level config creation and preservation patterns

## 1. Read Available Inputs First

Read project-level baselines when present:
- `README.md`
- `project-instructions.md`
- `.github/sddp-config.md`
- `specs/prd.md`
- `specs/sad.md`
- `specs/dod.md`

If `.github/sddp-config.md` exists:
1. Parse `## Product Document` → `**Path**:` and read the file if the path is non-empty and readable.
2. Parse `## Technical Context Document` → `**Path**:` and read the file if the path is non-empty and readable.
3. Parse `## Deployment & Operations Document` → `**Path**:` and read the file if the path is non-empty and differs from `specs/dod.md`.

The Technical Context Document (SAD) is the primary architecture input. Extract from it:
- Target platform and deployment model
- Infrastructure and hosting mentions
- Cross-cutting concerns (security, reliability, observability, operations)
- Quality attribute targets
- Architecture decisions that affect deployment

Search for additional text-readable deployment and operations inputs and read only the most relevant matches:
- top-level docs and `docs/` files mentioning deployment, infrastructure, DevOps, CI/CD, monitoring, observability, SRE, operations, environments, Docker, Kubernetes, Terraform, or cloud providers
- existing `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `Makefile`, `Procfile`, `Jenkinsfile`, or IaC files
- attached files and explicit paths referenced by the user

Summarize the discovered inputs into `PROJECT_CONTEXT` before asking any questions.

## 2. Determine Starting Mode and Source-of-Truth Status

1. If `specs/dod.md` exists and contains substantive content, set `MODE = REFINE`.
2. Otherwise set `MODE = CREATE`.
3. If a different Deployment & Operations Document is already registered in `.github/sddp-config.md` and differs from `specs/dod.md`, set `DOD_CONFLICT = true`.

## 3. Identify High-Impact Open Decisions

Infer the likely deployment complexity from repo context and available documents (for example: simple single-server app, containerized microservices, serverless, mobile app with backend, static site, data pipeline, multi-region platform).

Identify only unresolved decisions that materially affect deployment and operations, organized across these areas:
- environment strategy and promotion flow
- deployment targets and packaging model
- CI/CD pipeline design and tooling
- infrastructure and hosting choices
- observability and monitoring stack
- reliability targets and SRE practices
- operational security and compliance posture
- operational ownership and processes

Do not ask about decisions that are already answered clearly in the available inputs, especially the SAD.

Partition unresolved decisions into two sets:
- `BLOCKING_CHOICES` — choices that determine the research space and should be clarified first, such as cloud provider, deployment model (containers vs. serverless vs. PaaS), environment ladder, and IaC approach
- `FOLLOW_UP_DECISIONS` — questions that benefit from targeted best-practice research after the blocking choices are known, such as observability stack, SLI/SLO targets, incident management process, and cost optimization

## 4. Ask Blocking Choice Questions First

If `BLOCKING_CHOICES` is non-empty, ask the user a single batched set of only those questions before any external research.

Question rules for this pre-research batch:
- Keep the batch focused and finite; prefer 1–5 questions.
- Include only questions that materially change the research direction.
- Use multiple choice where possible; allow short free-form input when needed.
- For each question, include:
  - the decision to be made
  - a recommended answer grounded in repo context, SAD content, and currently available documents
  - 1–2 sentences of rationale using only local context and stated constraints
  - the main tradeoff if the user chooses another option

If `DOD_CONFLICT = true`, include a question asking which deployment & operations document should be treated as canonical.

If `BLOCKING_CHOICES` is empty, skip this step.

## 5. Research Deployment & Operations Gaps

Run external research only after Step 4 answers are recorded, unless there were no blocking choices.

Before delegating, report to the user: "🔍 Researching deployment patterns, operational best practices, and reliability engineering — this may take 15–30 seconds."

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
- **Topics**:
  1. Deployment strategy and environment management best practices for the detected deployment model
  2. CI/CD pipeline patterns, IaC approaches, and progressive delivery for the chosen stack
  3. Observability best practices: structured logging, metrics, distributed tracing, SLI/SLO frameworks, and alerting
  4. Site reliability engineering: operational readiness reviews, incident management, disaster recovery, and chaos engineering
- **Context**: `PROJECT_CONTEXT`, the detected deployment complexity, known constraints, SAD architecture decisions, the recorded answers from Step 4, and any remaining `FOLLOW_UP_DECISIONS`
- **Purpose**: "Inform the canonical project-level `specs/dod.md`, remaining deployment and operations decisions, and the final document content."
- **File Paths**: Include every project document actually read in Step 1

Reuse the research findings to ground only the remaining follow-up decisions and the final DOD content. Do not perform any other external browsing in the main workflow.

## 6. Ask One Batched Follow-Up Question Set

If `FOLLOW_UP_DECISIONS` remain unresolved after Step 5, ask the user a single batched set of follow-up questions.

Question rules:
- Keep the batch focused and finite; prefer 3–7 questions.
- Use multiple choice where possible; allow short free-form input when needed.
- For each question, include:
  - the decision to be made
  - a recommended answer
  - 1–2 sentences of rationale grounded in repo context, SAD content, or Technical Researcher findings
  - the main tradeoff if the user chooses another option

If no high-impact questions remain, skip user prompting and continue.

## 7. Write or Refine `specs/dod.md`

Use `.github/skills/deployment-operations/assets/dod-template.md` as the starting structure.

Ensure the `specs/` directory exists before writing.

The final `specs/dod.md` must contain:
- deployment summary and context
- environment strategy with table and Mermaid environment flow diagram
- feature flag and progressive rollout approach
- deployment targets and packaging
- CI/CD pipeline design with Mermaid pipeline flow diagram
- infrastructure and hosting details with Mermaid infrastructure diagram
- observability and monitoring: logging, metrics (including DORA), tracing, alerting, and SLI/SLO table
- reliability engineering: availability targets, RPO/RTO, disaster recovery, capacity planning, incident management, production readiness criteria
- security and compliance in operations: supply chain, runtime, secrets management, compliance frameworks, audit logging
- operational ownership and processes: ownership model, on-call, change management, maturity roadmap
- cost considerations
- deployment decisions using `DDR-###` identifiers with status, context, decision, rationale, alternatives, tradeoffs, and consequences
- risks, assumptions, constraints, and open questions

Writing guidance for the document itself:
- Keep the prose specific to the system being described.
- Reference the SAD for architecture context rather than duplicating it.
- Do not add introductory sentences about this document being canonical, reusable by phases, or intended for workflows.
- Do not add obvious statements about what a deployment document does; move directly into project-specific context.

When refining an existing `specs/dod.md`:
- preserve valid existing sections and diagrams
- remove contradictions rather than duplicating competing statements
- update decision records when choices change

If a section is not applicable (e.g., no mobile app store distribution), omit the entire section rather than adding explanatory prose.

## 8. Register the Canonical Deployment & Operations Document

Ensure `.github/sddp-config.md` exists. If it does not exist, create it using the current project config structure with:
- Product Document path preserved if known, otherwise `specs/prd.md` if it exists, otherwise blank
- Technical Context Document path preserved if known, otherwise `specs/sad.md` if it exists, otherwise blank
- Deployment & Operations Document path set to `specs/dod.md`
- `MaxChecklistCount` defaulting to `1`
- Autopilot defaulting to `false`

If `.github/sddp-config.md` already exists:
- preserve all unrelated sections unchanged
- preserve existing Product Document and Technical Context Document paths
- update `## Deployment & Operations Document` → `**Path**:` to `specs/dod.md` unless the user explicitly chose to keep another registered document as canonical

If the user chose to keep another registered document as canonical:
- do not change the registered path
- still write or refine `specs/dod.md`
- report clearly that downstream phases will continue using the existing registered document until `specs/dod.md` is adopted

## 9. Validate Before Reporting

Verify that:
- `specs/dod.md` exists
- the document covers the major deployment and operations areas
- all diagrams use standard Mermaid syntax (not C4)
- deployment decisions use `DDR-###` identifiers
- `.github/sddp-config.md` exists and the Deployment & Operations Document path matches the chosen source of truth
- existing Product Document and Technical Context Document paths are preserved

## 10. Report

Output:
- Mode used (`CREATE` or `REFINE`)
- Inputs read
- Conflicts found and how they were resolved
- Research topics delegated to Technical Researcher
- `specs/dod.md` path and registration outcome
- Remaining open questions or assumptions
- Suggested next steps with explicit labels:
  1. `/sddp-projectplan` *(recommended when product, technical, and operational context are ready for epic decomposition)* — compose a suggested prompt that uses the registered Product Document, Technical Context Document, and generated `specs/dod.md` as the primary planning inputs
  2. `/sddp-init` *(recommended when ready to finalize project governance)* — compose a suggested prompt that preserves or adopts the generated `specs/dod.md`

</workflow>
