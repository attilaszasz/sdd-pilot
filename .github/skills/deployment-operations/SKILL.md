---
name: deployment-operations
description: "Create/refine project `specs/dod.md` as the canonical Deployment & Operations Document."
---

# DevOps Strategist — Deployment & Operations Workflow

<rules>
- Project bootstrap, project scope. Output: `specs/dod.md`.
- Works with or without `.github/sddp-config.md`.
- Read local context first.
- The DOD complements the SAD; reference architecture without repeating it.
- Ask only unresolved high-impact questions, in at most two batches: blocking before research and follow-up after research.
- Each question includes the decision, recommended answer, brief rationale, and main tradeoff.
- Delegate all external research to **Technical Researcher**; do not browse directly in this workflow.
- Reuse only `.github/sddp-config.md` → `## Deployment & Operations Document`.
- If a registered Deployment & Operations Document conflicts with `specs/dod.md`, ask which stays canonical; recommend synthesizing into `specs/dod.md` unless repo context strongly favors another path.
- Preserve valid hand-authored narrative in existing `specs/dod.md`.
- Use standard Mermaid only. Use `<br>`, never `\n`, in labels.
- Keep the DOD deployment/operations-specific and free of SDD/internal workflow terms.
</rules>

<workflow>

## 0. Shared Patterns

Read these only for reusable patterns:
- `.github/skills/plan-authoring/SKILL.md` — planning expectations for technical/deployment context
- `.github/skills/clarify-spec/SKILL.md` — batched questions and recommended answers
- `.github/skills/init-project/SKILL.md` — shared config creation and preservation behavior

## 1. Gather Inputs

Read when present:
- `README.md`
- `project-instructions.md`
- `.github/sddp-config.md`
- `specs/prd.md`
- `specs/sad.md`
- `specs/dod.md`

If `.github/sddp-config.md` exists:
1. Read `## Product Document` → `**Path**:` when non-empty and readable.
2. Read `## Technical Context Document` → `**Path**:` when non-empty and readable.
3. Read `## Deployment & Operations Document` → `**Path**:` when non-empty and different from `specs/dod.md`.

Treat the SAD as the primary architecture input. Extract deployment model, hosting, cross-cutting concerns, quality targets, and architecture decisions that affect operations.

Search only the most relevant extra deployment/operations inputs:
- top-level files and `docs/` files mentioning deployment, infrastructure, DevOps, CI/CD, monitoring, observability, SRE, operations, environments, Docker, Kubernetes, Terraform, or cloud providers
- `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `Makefile`, `Procfile`, `Jenkinsfile`, or IaC files when present
- attached files or explicit paths from the user

Summarize discovered inputs as `PROJECT_CONTEXT` before asking questions.

## 2. Mode and Source of Truth

- `MODE = REFINE` if `specs/dod.md` exists with substantive content; else `CREATE`.
- `DOD_CONFLICT = true` when a registered Deployment & Operations Document differs from `specs/dod.md` and both exist.

## 3. Identify Decisions

Infer deployment complexity from repo context and available docs.

Build two sets:
- `BLOCKING_CHOICES`: cloud/provider or hosting choice, deployment model, environment ladder, packaging model, IaC approach, canonical document handling.
- `FOLLOW_UP_DECISIONS`: CI/CD design, observability stack, SLI/SLO targets, incident management, security/compliance posture, ownership/process, cost optimization.

Skip anything already resolved in the inputs.

## 4. Blocking Batch

If `BLOCKING_CHOICES` is non-empty, ask one batch before research.

Rules:
- 1-5 questions.
- Prefer multiple choice; allow short freeform when needed.
- Include `DOD_CONFLICT` handling here when present.
- Each question includes the decision, recommended answer, local-context rationale, and main tradeoff.

## 5. Research

Research only after Step 4 answers, unless there were no blocking choices.

Before delegating, report: `Researching deployment patterns, operational best practices, and reliability engineering.`

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
- **Topics**:
  1. Deployment strategy and environment management best practices for the detected deployment model
  2. CI/CD pipeline patterns, IaC approaches, and progressive delivery for the chosen stack
  3. Observability best practices: structured logging, metrics, distributed tracing, SLI/SLO frameworks, and alerting
  4. Site reliability engineering: operational readiness reviews, incident management, disaster recovery, and chaos engineering
- **Context**: `PROJECT_CONTEXT`, deployment complexity, constraints, SAD decisions, Step 4 answers, unresolved `FOLLOW_UP_DECISIONS`
- **Purpose**: "Inform the canonical project-level `specs/dod.md` and remaining deployment/operations decisions."
- **File Paths**: Include every project document actually read in Step 1

Use research only for unresolved follow-up decisions and final DOD content.

## 6. Follow-Up Batch

If unresolved `FOLLOW_UP_DECISIONS` remain, ask one batch.

Rules:
- 3-7 questions.
- Prefer multiple choice; allow short freeform when needed.
- Each question includes the decision, recommended answer, rationale from repo/research, and main tradeoff.

Skip this step if no high-impact questions remain.

## 7. Write and Register

Use `.github/skills/deployment-operations/assets/dod-template.md` as the starting structure.

Ensure the `specs/` directory exists before writing.

The DOD must contain:
- deployment summary/context
- environment strategy with table and Mermaid flow
- feature flags/progressive rollout
- deployment targets/packaging
- CI/CD design with Mermaid pipeline flow
- infrastructure/hosting with Mermaid diagram
- observability: logging, metrics including DORA, tracing, alerting, SLI/SLO table
- reliability: availability, RPO/RTO, disaster recovery, capacity, incident management, production readiness
- operational security/compliance: supply chain, runtime, secrets, compliance, audit logging
- operational ownership/processes, cost considerations, `DDR-###` decisions, risks, assumptions, constraints, open questions

Writing rules:
- Keep it system-specific and operations-focused.
- Reference the SAD instead of duplicating architecture choices.
- No internal workflow/canonical-document filler.
- Preserve valid sections and diagrams when refining.
- Remove contradictions instead of duplicating them.
- Update decision records when choices change.
- Omit fully inapplicable sections instead of adding explanatory prose.

Registration:
- Ensure `.github/sddp-config.md` exists using the current shared config structure if missing.
- Preserve existing Product Document and Technical Context Document paths.
- Adopt `specs/dod.md` as `## Deployment & Operations Document` → `**Path**:` unless the user explicitly keeps another canonical document.
- Preserve unrelated config sections.
- If another document stays canonical, still write/refine `specs/dod.md` and report that downstream phases keep using the existing registered path.

## 8. Validate and Report

Verify that:
- `specs/dod.md` exists.
- The document covers the major deployment and operations areas.
- All diagrams use standard Mermaid syntax.
- Deployment decisions use `DDR-###` identifiers.
- `.github/sddp-config.md` exists and registered paths match the chosen canonical sources.

Output:
- `MODE`
- inputs read
- conflicts and resolution
- research topics delegated
- `specs/dod.md` path and registration outcome
- remaining open questions or assumptions
- next steps with explicit labels:
  1. `/sddp-projectplan` — suggested prompt using the registered Product Document, Technical Context Document, and generated `specs/dod.md`
  2. `/sddp-init` — suggested prompt that preserves or adopts `specs/dod.md`

</workflow>
