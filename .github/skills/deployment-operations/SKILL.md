---
name: deployment-operations
description: "Create/refine project `specs/dod.md` as the canonical Deployment & Operations Document."
---

# DevOps Strategist — Deployment & Operations Workflow

<rules>
- Project bootstrap, project scope. Output: `specs/dod.md`.
- Works with or without `.github/sddp-config.md`.
- Read local context first.
- DOD complements SAD; reference architecture without repeating it.
- Ask only unresolved high-impact questions, max two batches: blocking before research, follow-up after.
- Each question: decision, recommended answer, brief rationale, main tradeoff.
- Delegate all external research to **Technical Researcher**; do not browse directly.
- Reuse only `.github/sddp-config.md` → `## Deployment & Operations Document`.
- Registered Deployment & Operations Document conflicts with `specs/dod.md` → ask which stays canonical; recommend synthesizing into `specs/dod.md` unless repo context strongly favors another path.
- Preserve valid hand-authored narrative in existing `specs/dod.md`.
- Standard Mermaid only. Use `<br>`, never `\n`, in labels.
- Keep DOD deployment/operations-specific, free of SDD/internal workflow terms.
</rules>

<workflow>

## 0. Shared Patterns

Read for reusable patterns only:
- `.github/skills/plan-authoring/SKILL.md` — planning expectations for technical/deployment context
- `.github/skills/clarify-spec/SKILL.md` — batched questions and recommended answers
- `.github/skills/init-project/SKILL.md` — shared config creation and preservation

## 1. Gather Inputs

Read when present: `README.md`, `project-instructions.md`, `.github/sddp-config.md`, `specs/prd.md`, `specs/sad.md`, `specs/dod.md`.

If `.github/sddp-config.md` exists:
1. Read `## Product Document` → `**Path**:` when non-empty and readable
2. Read `## Technical Context Document` → `**Path**:` when non-empty and readable
3. Read `## Deployment & Operations Document` → `**Path**:` when non-empty and different from `specs/dod.md`

Treat SAD as primary architecture input. Extract deployment model, hosting, cross-cutting concerns, quality targets, architecture decisions affecting operations.

Search most relevant extra deployment/operations inputs:
- Top-level and `docs/` files mentioning deployment, infrastructure, DevOps, CI/CD, monitoring, observability, SRE, operations, environments, Docker, Kubernetes, Terraform, or cloud providers
- `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `Makefile`, `Procfile`, `Jenkinsfile`, or IaC files when present
- Attached files or explicit user paths

Summarize as `PROJECT_CONTEXT` before asking questions.

## 2. Mode and Source of Truth

- `specs/dod.md` exists with substantive content → `MODE = REFINE`; else `CREATE`
- `DOD_CONFLICT = true` when registered Deployment & Operations Document differs from `specs/dod.md` and both exist

## 3. Identify Decisions

Infer deployment complexity from repo context and available docs.

- `BLOCKING_CHOICES`: cloud/provider or hosting choice, deployment model, environment ladder, packaging model, IaC approach, canonical document handling
- `FOLLOW_UP_DECISIONS`: CI/CD design, observability stack, SLI/SLO targets, incident management, security/compliance posture, ownership/process, cost optimization

Skip anything already resolved.

## 4. Blocking Batch

`BLOCKING_CHOICES` non-empty → ask one batch before research.
- 1-5 questions; prefer multiple choice; allow short freeform when needed
- Include `DOD_CONFLICT` handling when present
- Each question: decision, recommended answer, local-context rationale, main tradeoff

## 5. Research

Run only after Step 4 answers (unless no blocking choices).

Report: `Researching deployment patterns, operational best practices, and reliability engineering.`

**Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
- **Topics**: (1) Deployment strategy/environment management for detected model (2) CI/CD pipeline patterns, IaC approaches, progressive delivery for chosen stack (3) Observability: structured logging, metrics, distributed tracing, SLI/SLO frameworks, alerting (4) SRE: operational readiness reviews, incident management, disaster recovery, chaos engineering
- **Context**: `PROJECT_CONTEXT`, deployment complexity, constraints, SAD decisions, Step 4 answers, unresolved `FOLLOW_UP_DECISIONS`
- **Purpose**: "Inform the canonical project-level `specs/dod.md` and remaining deployment/operations decisions."
- **File Paths**: every project document read in Step 1

Use research only for unresolved follow-up decisions and final DOD content.

## 6. Follow-Up Batch

Unresolved `FOLLOW_UP_DECISIONS` remain → ask one batch.
- 3-7 questions; prefer multiple choice; allow short freeform when needed
- Each question: decision, recommended answer, rationale from repo/research, main tradeoff
- No high-impact questions remain → skip

## 7. Write and Register

Use `.github/skills/deployment-operations/assets/dod-template.md` as starting structure. Ensure `specs/` exists.

The DOD must contain:
- Deployment summary/context
- Environment strategy with table and Mermaid flow
- Feature flags/progressive rollout
- Deployment targets/packaging
- CI/CD design with Mermaid pipeline flow
- Infrastructure/hosting with Mermaid diagram
- Observability: logging, metrics (including DORA), tracing, alerting, SLI/SLO table
- Reliability: availability, RPO/RTO, disaster recovery, capacity, incident management, production readiness
- Operational security/compliance: supply chain, runtime, secrets, compliance, audit logging
- Operational ownership/processes, cost considerations, `DDR-###` decisions, risks, assumptions, constraints, open questions

Writing rules:
- System-specific, operations-focused; reference SAD instead of duplicating architecture choices
- No internal workflow/canonical-document filler
- Preserve valid sections/diagrams when refining; remove contradictions instead of duplicating
- Update decision records when choices change
- Omit fully inapplicable sections instead of adding explanatory prose

Registration:
- Ensure `.github/sddp-config.md` exists (current shared config structure if missing)
- Preserve existing Product Document and Technical Context Document paths
- Adopt `specs/dod.md` as `## Deployment & Operations Document` → `**Path**:` unless user explicitly keeps another document
- Preserve unrelated config sections
- Another document stays canonical → still write/refine `specs/dod.md`; report downstream phases keep using registered path

## 8. Validate and Report

Verify:
- `specs/dod.md` exists
- Document covers major deployment and operations areas
- All diagrams use standard Mermaid syntax
- Deployment decisions use `DDR-###` identifiers
- `.github/sddp-config.md` exists; registered paths match chosen canonical sources

Output:
- `MODE`
- Inputs read
- Conflicts and resolution
- Research topics delegated
- `specs/dod.md` path and registration outcome
- Remaining open questions or assumptions
- Next steps:
  1. `/sddp-projectplan` — suggested prompt using registered Product Document, Technical Context Document, and `specs/dod.md`
  2. `/sddp-init` — suggested prompt preserving or adopting `specs/dod.md`

</workflow>
