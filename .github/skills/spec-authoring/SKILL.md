---
name: spec-authoring
description: "Writes product, technical, and operational specifications with prioritized work items, requirement families, and success criteria. Use when creating a spec, writing requirements, defining user stories or objectives, authoring a PRD for a new feature, or when handling NEEDS CLARIFICATION markers in specifications."
---

# Spec Authoring Guide

## Spec Writing Process

### 1. Parse the Feature Description
- Determine `spec_type` from workflow context or spec frontmatter; default to `product` if absent.
- Extract: actors, actions, data, constraints, dependencies, deliverables.
- Empty normalized description → ERROR "No feature description provided".

### 2. Fill the Template
Use [assets/spec-template.md](assets/spec-template.md). Replace all placeholders; remove sections that don't apply to the chosen `spec_type`.

### 3. Product Specs (`spec_type: product`)
- Assign P1–P3+. Each user story independently testable; P1 alone yields viable MVP.
- Action-noun format for story titles.
- Include Given/When/Then acceptance scenarios.
- **"Why this priority"**: required for ALL priorities including P1. One-line rationale. Use priority criteria: P1 = core value proposition / blocks everything else / security-critical; P2 = significant value but MVP works without / enhances P1 flows; P3 = nice-to-have / future foundation / polish.
- "Independent Test": one sentence — what to demo/test.
- Max **200 words** per story excluding acceptance scenarios.

### 4. Technical Specs (`spec_type: technical`)
- Assign P1–P3+ to **Technical Objectives**.
- Each objective: one independently-validatable system/framework/schema/integration capability.
- **"Why this priority"**: required for ALL priorities including P1. Same criteria as product specs.
- Include **Rationale** (architecture, migration, platform, integration needs).
- Include **Deliverables** (libraries, modules, schemas, configs, migration assets).
- Include **Validation Criteria** (precondition → technical action → expected behavior).

### 5. Operational Specs (`spec_type: operational`)
- Assign P1–P3+ to **Operational Objectives**.
- Each objective: one operational capability (deployment, observability, recovery, governance).
- **"Why this priority"**: required for ALL priorities including P1. Same criteria as product specs.
- Include **Rationale** (deployment, reliability, compliance, operations needs).
- Include **Deliverables** (pipeline config, IaC, dashboards, alerts, runbooks).
- Include **Verification Criteria** (environment state → operational action → expected outcome).

### 6. Handle Unclear Aspects
- Make informed guesses from context and industry standards.
- Use `[NEEDS CLARIFICATION: specific question]` only when:
  - Uncertainty materially affects scope, security/privacy, or critical behavior.
  - Multiple reasonable interpretations with different implications exist.
  - No reasonable default exists.
- **Max 3 markers**. Priority: scope > security/privacy > UX/operator flow > technical detail.
- Present clarifications as tables with options and implications.

### 7. Generate Requirements
- Each requirement must be testable.
- Family by `spec_type`:
  - Product: `FR-###: System MUST [specific capability]`
  - Technical: `TR-###: System MUST [specific technical capability]`
  - Operational: `OR-###: System MUST [specific operational capability]`
- Operational specs may include `RR-###: A runbook MUST exist for [scenario]`.
- Use reasonable defaults for unspecified low-impact details.

### 8. Define Success Criteria
All success criteria: measurable and verifiable. Each SC-### must reference its parent work item: `SC-001 [US1]: ...` (product) or `SC-001 [OBJ1]: ...` (technical/operational). Every P1 story or objective must have at least one SC.

- **Product**: technology-agnostic, user/business-outcome focused.
  - Good: `SC-001 [US1]: Users can complete checkout in under 3 minutes`
  - Bad: `SC-001: API response time is under 200ms`
- **Technical**: metrics measuring capability, reliability, migration safety, performance, or coverage. Avoid vendor-specific trivia unless spec depends on it.
- **Operational**: metrics measuring deploy speed, recovery, alerting, observability, uptime, or compliance. Avoid implementation detail belonging in plan.

### 9. Write Problem Statement
Mandatory for all spec types. 2-4 sentences covering: current pain point or opportunity, trigger/motivation, who is affected, consequences of inaction. Place at the top of the spec, before work items.

### 10. Define Scope
Mandatory for all spec types.
- **Included**: Bullet list of what is in scope for this feature.
- **Excluded**: Bullet list of items explicitly deferred or out of scope, each with a brief rationale.
- **Edge Cases & Boundaries**: Boundary conditions, error scenarios, failure modes.

### 11. Document Assumptions & Risks
Mandatory for all spec types.
- **Assumptions**: Things taken as true without explicit confirmation (max 5). Example: "Users have modern browsers with JavaScript enabled."
- **Risks**: Identified threats to delivery with likelihood/impact indication (max 3). Example: "Third-party API rate limits may throttle bulk operations (likelihood: medium, impact: high)."

### 12. Tag Implementation Signals
Mandatory for all spec types. Lightweight tags that tell the plan phase what to architect without prescribing how. Valid tags: `NEW-ENTITY`, `NEW-API`, `NEW-UI`, `MIGRATION`, `EXTERNAL-SERVICE`, `BREAKING-CHANGE`, `NEW-WORKER`, `NEW-CONFIG`. Each tag gets a brief description.

### 13. Add Glossary (Conditional)
Include when the spec introduces 2+ domain-specific terms. Table format: `| Term | Definition |`. Keep definitions precise and consistent with usage throughout the spec.

## Epic-Type-Aware Authoring

Adapt writing process based on `spec_type` frontmatter:

### Product specs (`spec_type: product`)
- Default behavior. Focus: WHAT users need and WHY.
- Success criteria: user-focused, technology-agnostic.

### Technical specs (`spec_type: technical`)
- Replace user stories with **Technical Objectives**.
- Actors: systems and developers. Success criteria: technical metrics valid.
- Requirements: `TR-###`. Must include Integration Points.
- Defaults shift toward standard engineering practices for detected stack.

### Operational specs (`spec_type: operational`)
- Replace user stories with **Operational Objectives**.
- Actors: operators, SREs, CI/CD systems, environment owners.
- Requirements: `OR-###`. Runbooks: `RR-###`. Must include Integration Points.
- Defaults shift toward deployment model and observability baseline from project context.

## Section Requirements

| Section | Product | Technical | Operational |
|---|---|---|---|
| Problem Statement | Mandatory | Mandatory | Mandatory |
| Scope | Mandatory | Mandatory | Mandatory |
| User Scenarios & Testing | Mandatory | N/A | N/A |
| Technical Objectives | N/A | Mandatory | N/A |
| Operational Objectives | N/A | N/A | Mandatory |
| Integration Points | N/A | Mandatory | Mandatory |
| Requirements | Mandatory (`FR-`) | Mandatory (`TR-`) | Mandatory (`OR-`) |
| Runbook Requirements | N/A | N/A | If applicable (`RR-`) |
| Key Entities | If applicable | If applicable | N/A |
| Assumptions & Risks | Mandatory | Mandatory | Mandatory |
| Implementation Signals | Mandatory | Mandatory | Mandatory |
| Success Criteria | Mandatory | Mandatory | Mandatory |
| Glossary | If applicable | If applicable | If applicable |

## Size Budget
Keep `spec.md` ≤ **10KB**. If exceeded: consolidate overlapping requirements, tighten prose, defer low-impact detail to clarification. For specs approaching the limit, consider whether the feature should be decomposed into multiple epics first.

## Artifact Conventions

Preservation rules: see `.github/skills/artifact-conventions/SKILL.md` (read during edit/remediation phases).

**Spec-specific rule**: Do NOT add top-level sections outside the allowed set for the active `spec_type`.

## Quick Rules
- Product specs: **WHAT users need and WHY**.
- Technical specs: **WHAT the system must be capable of and WHY**.
- Operational specs: **WHAT operational capability must exist and WHY**.
- Avoid implementation detail belonging in `plan.md`; name concrete deliverables when spec type requires them.
- No embedded checklists (separate via `/sddp-checklist`).

## Reasonable Defaults (don't ask about these)
- Product: industry-standard retention, performance, error handling for domain.
- Technical: standard engineering practices for framework layout, migration safety, compatibility.
- Operational: standard CI/CD, environment promotion, observability baselines.
- Integration: well-documented interfaces, explicit ownership boundaries unless input says otherwise.

## Ambiguity Scan Categories

Full taxonomy in [references/ambiguity-categories.md](references/ambiguity-categories.md) — read only when scanning for ambiguities (during `/sddp-clarify` or `/sddp-analyze`), not during initial spec generation. Interpret categories relative to `spec_type`: user journeys (product), system/developer flows (technical), operator/environment flows (operational).
