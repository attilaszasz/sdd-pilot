---
name: deployment-operations
description: "Create/refine project `specs/dod.md` as the canonical Deployment & Operations Document."
---

# DevOps Strategist — Deployment & Operations Workflow

<rules>
- Project bootstrap, project scope. Output: registered canonical DOD, default `specs/dod.md`.
- Works with or without `.github/sddp-config.md`.
- Read local context first.
- DOD complements SAD; reference architecture without repeating it.
- Ask only unresolved high-impact questions, max two batches: blocking before research, follow-up after.
- Each question: decision, recommended answer, brief rationale, main tradeoff.
- Delegate all external research to **Technical Researcher**; do not browse directly.
- Reuse only `.github/sddp-config.md` → `## Deployment & Operations Document`.
- Resolve `CANONICAL_DOD` config-first/default-second before reads or questions. A nonempty broken registration blocks the target; never silently fall back. A custom registered path is the sole write target; an unregistered default's mere existence is not a conflict. Conflicting substantive canonical claims require an explicit decision.
- Preserve valid hand-authored narrative in existing `specs/dod.md`.
- Standard Mermaid only. Use `<br>`, never `\n`, in labels.
- Keep DOD deployment/operations-specific, free of SDD/internal workflow terms.
</rules>

<workflow>

## Evidence-led entry

Read `.github/skills/evidence-led-authoring/SKILL.md` when internal `EVIDENCE_INPUT` is supplied or the DOD has onboarding provenance. In evidence mode use its DOD synthesis/validation branch and return only a staged candidate, without ordinary research/new-practice defaults, live writes, or registration. Ordinary refinement preserves provenance, observed-versus-reported certainty, and unanswered questions, and runs the target-scoped onboarding write gate before publication.

## 0. Shared Patterns

Read for reusable patterns only:
- `.github/skills/plan-authoring/SKILL.md` — planning expectations for technical/deployment context
- `.github/sddp/workflows/clarify-spec/WORKFLOW.md` — batched questions and recommended answers
- `.github/sddp/workflows/init-project/WORKFLOW.md` — shared config creation and preservation

## 1. Gather Inputs

Read when present: `README.md`, `project-instructions.md`, `.github/sddp-config.md`, `specs/prd.md`, `specs/sad.md`, `specs/dod.md`.

If `.github/sddp-config.md` exists:
1. Read `## Product Document` → `**Path**:` when non-empty and readable
2. Read `## Technical Context Document` → `**Path**:` when non-empty and readable
3. Read `## Deployment & Operations Document` → `**Path**:` when non-empty and different from `specs/dod.md`

Treat SAD as primary architecture input. Extract deployment model, hosting, cross-cutting concerns, quality targets, and architecture decisions affecting operations. For detailed ADR content, read standalone MADR files under `specs/adrs/` linked from the SAD's ADR catalog table.

Search most relevant extra deployment/operations inputs:
- Top-level and `docs/` files mentioning deployment, infrastructure, DevOps, CI/CD, monitoring, observability, SRE, operations, environments, Docker, Kubernetes, Terraform, or cloud providers
- `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `Makefile`, `Procfile`, `Jenkinsfile`, or IaC files when present
- Attached files or explicit user paths

Summarize as `PROJECT_CONTEXT` before asking questions.

## 2. Mode and Source of Truth

- `CANONICAL_DOD` exists with substantive content → `MODE = REFINE`; else `CREATE`
- `DOD_CONFLICT = true` only for conflicting substantive claims of canonical authority, not file existence alone.
- Normalize every candidate/context path as repository-relative and symlink-free before access; traversal, absolute, drive-qualified or mixed-separator paths halt without writes.

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

Use `.github/sddp/workflows/deployment-operations/assets/dod-template.md` as starting structure. Write a temporary sibling candidate of `CANONICAL_DOD`, not the live document. Template examples are not defaults or evidence; unknown operational practices remain explicit.

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

Validate and register:
- Run `node scripts/onboarding-state.mjs gate --write CANONICAL_DOD`; a pending overlapping publication blocks writes.
- Run `node scripts/validate-dod.mjs <candidate>`. Nonzero, malformed JSON, or invalid → leave live DOD/config untouched.
- After explicit confirmation of material changes, retain prior live/config bytes, publish the exact validated candidate, and register only `CANONICAL_DOD` under Deployment & Operations Document. Preserve unrelated config, including Product/Technical Context paths. Never write a shadow `specs/dod.md`.
- Run `node scripts/validate-dod.mjs CANONICAL_DOD --config .github/sddp-config.md`; failure restores prior bytes only if no intervening user edit occurred, otherwise stop for reconciliation. Onboarding-provenance refinements use its checkpoint/journaled publication path instead of untracked live writes.

## 8. Validate and Report

Verify:
- `CANONICAL_DOD` exists and candidate/live structural validation passed
- Document covers major deployment and operations areas
- All diagrams use standard Mermaid syntax
- Deployment decisions use `DDR-###` identifiers
- `.github/sddp-config.md` exists; registered paths match chosen canonical sources

Output:
- `MODE`
- Inputs read
- Conflicts and resolution
- Research topics delegated
- `CANONICAL_DOD` path and registration outcome; reference usability is not production certification
- Remaining open questions or assumptions
- Next steps:
  1. `/sddp-projectplan` — suggested prompt using registered Product Document, Technical Context Document, and `specs/dod.md`
  2. `/sddp-init` — suggested prompt preserving or adopting `specs/dod.md`

</workflow>
