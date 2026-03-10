---
name: spec-authoring
description: "Writes product, technical, and operational specifications with prioritized work items, requirement families, and success criteria. Use when creating a spec, writing requirements, defining user stories or objectives, authoring a PRD for a new feature, or when handling NEEDS CLARIFICATION markers in specifications."
---

# Spec Authoring Guide

## Spec Writing Process

### 1. Parse the Feature Description
- Determine `spec_type` from workflow context or spec frontmatter. If it is absent, treat it as `product`.
- Extract key concepts: actors, actions, data, constraints, dependencies, and deliverables.
- If the normalized feature description is empty: ERROR "No feature description provided".

### 2. Fill the Template
Use the template at [assets/spec-template.md](assets/spec-template.md). Replace all placeholders with concrete details and remove every section that does not apply to the chosen `spec_type`.

### 3. Product Specs (`spec_type: product`)
Assign priorities P1 (most critical) through P3+:
- Each user story must be **independently testable** — implementing just P1 yields a viable MVP.
- Use action-noun format for story titles.
- Include Given/When/Then acceptance scenarios.
- **"Why this priority"**: Include only for P2+ stories where the ranking is non-obvious.
- **"Independent Test"**: One sentence only — describe what to demo/test, not a full paragraph.
- Keep each user story under **200 words** excluding acceptance scenarios.

### 4. Technical Specs (`spec_type: technical`)
Assign priorities P1 through P3+ to **Technical Objectives**:
- Each objective must describe a system capability, framework capability, schema capability, or integration capability that can be validated independently.
- State the **Rationale** in terms of architecture, migration, platform, or integration needs.
- Include **Deliverables** as concrete artifacts such as libraries, modules, schemas, configurations, or migration assets.
- Include **Validation Criteria** using scenario-style statements that define precondition, technical action, and expected system behavior.
- Keep each objective concise and focused on one capability boundary.

### 5. Operational Specs (`spec_type: operational`)
Assign priorities P1 through P3+ to **Operational Objectives**:
- Each objective must describe an operational capability such as deployment, observability, environment setup, recovery, or runtime governance.
- State the **Rationale** in terms of deployment, reliability, compliance, or operations needs.
- Include **Deliverables** as concrete artifacts such as pipeline config, infrastructure code, dashboards, alerts, or runbooks.
- Include **Verification Criteria** using scenario-style statements that define environment state, operational action, and expected outcome.
- Keep each objective concise and focused on one operational capability boundary.

### 6. Handle Unclear Aspects
- Make **informed guesses** based on context and industry standards.
- Only use `[NEEDS CLARIFICATION: specific question]` when:
  - Uncertainty could materially affect scope, security/privacy outcomes, or critical behavior.
  - Multiple reasonable interpretations exist with different implications.
  - No reasonable default exists.
- **Maximum 3 markers total** — prioritize by: scope > security/privacy > UX or operator flow > technical detail.
- Use informed defaults only for low-impact details where industry-standard expectations are unlikely to change feature intent.
- Present clarifications as tables with options and implications.

### 7. Generate Requirements
- Each requirement must be testable.
- Use the requirement family that matches `spec_type`:
  - Product: `FR-###: System MUST [specific capability]`
  - Technical: `TR-###: System MUST [specific technical capability]`
  - Operational: `OR-###: System MUST [specific operational capability]`
- Operational specs may also include `RR-###: A runbook MUST exist for [scenario]` when recovery or operator guidance is part of scope.
- Use reasonable defaults for unspecified low-impact details.

### 8. Define Success Criteria
All success criteria must be measurable and verifiable.

- Product specs:
  - Technology-agnostic.
  - User-focused or business-outcome-focused.
  - Good: "Users can complete checkout in under 3 minutes".
  - Bad: "API response time is under 200ms".
- Technical specs:
  - Technical metrics are valid when they measure capability, reliability, migration safety, performance budget, or coverage of the technical deliverable.
  - Avoid vendor-specific or tool-specific trivia unless the spec explicitly depends on it.
- Operational specs:
  - Operational metrics are valid when they measure deploy speed, recovery, alerting, observability, uptime, or compliance outcomes.
  - Avoid purely implementation-level detail that belongs in the plan.

## Epic-Type-Aware Authoring

When `spec_type` is set in the frontmatter, adapt the writing process:

### Product specs (`spec_type: product`)
- Default behavior — no changes from current process.
- Focus: WHAT users need and WHY.
- Success criteria: user-focused, technology-agnostic.

### Technical specs (`spec_type: technical`)
- Replace user stories with **Technical Objectives**.
- Focus: WHAT the system must be capable of and WHY.
- Actors are systems and developers, not end users.
- Success criteria: technical metrics ARE valid.
- Requirements use `TR-###` prefix.
- Must include Integration Points.
- Reasonable defaults shift toward standard engineering practices for the detected tech stack.

### Operational specs (`spec_type: operational`)
- Replace user stories with **Operational Objectives**.
- Focus: WHAT operational infrastructure must exist and WHY.
- Actors are operators, SREs, CI/CD systems, and environment owners.
- Success criteria: operational metrics ARE valid.
- Requirements use `OR-###` prefix.
- Runbook requirements use `RR-###` prefix.
- Must include Integration Points.
- Reasonable defaults shift toward the deployment model and observability baseline implied by the project context.

## Section Requirements

Based on `spec_type`:

| Section | Product | Technical | Operational |
|---|---|---|---|
| User Scenarios & Testing | Mandatory | N/A | N/A |
| Technical Objectives | N/A | Mandatory | N/A |
| Operational Objectives | N/A | N/A | Mandatory |
| Integration Points | N/A | Mandatory | Mandatory |
| Requirements | Mandatory (`FR-`) | Mandatory (`TR-`) | Mandatory (`OR-`) |
| Runbook Requirements | N/A | N/A | If applicable (`RR-`) |
| Key Entities | If applicable | If applicable | N/A |
| Success Criteria | Mandatory | Mandatory | Mandatory |

## Size Budget
Keep `spec.md` at or below **6KB**. If a spec grows beyond this, consolidate overlapping requirements, tighten prose, and defer low-impact detail to clarification.

## Artifact Conventions

Key rules for spec authoring (full preservation rules are in `.github/skills/artifact-conventions/SKILL.md` — read only during edit/remediation phases like `/sddp-implement`, `/sddp-analyze`, `/sddp-clarify`):

- Do NOT reorder user story priorities or objective priorities without explicit user approval.
- Do NOT change requirement IDs (`FR-###`, `TR-###`, `OR-###`, `RR-###`) or success criteria IDs (`SC-###`).
- Do NOT add top-level sections outside the allowed set for the active `spec_type`.
- Respect `[NEEDS CLARIFICATION]` markers — only resolve with user-approved answers; never silently remove them.
- Preserve checkbox state (`- [ ]` vs `- [X]`) when touching derived artifacts.

## Quick Rules
- Product specs focus on **WHAT users need and WHY**.
- Technical specs focus on **WHAT the system must be capable of and WHY**.
- Operational specs focus on **WHAT operational capability must exist and WHY**.
- Avoid implementation detail that belongs in `plan.md`, but name concrete deliverables when the spec type requires them.
- No embedded checklists (those are separate via `/sddp-checklist`).

## Reasonable Defaults (don't ask about these)
- Product: industry-standard retention, performance, and error handling for the domain.
- Technical: standard engineering practices for framework layout, migration safety, and compatibility when no project-specific constraint is known.
- Operational: standard CI/CD, environment promotion, and observability baselines when no project-specific operating model is known.
- Integration: default to well-documented interfaces and explicit ownership boundaries unless the input says otherwise.

## Ambiguity Scan Categories

The full ambiguity taxonomy is in [references/ambiguity-categories.md](references/ambiguity-categories.md) — read it only when scanning for ambiguities (during `/sddp-clarify` or `/sddp-analyze`), not during initial spec generation. Interpret the categories relative to `spec_type`: user journeys for product specs, system/developer flows for technical specs, and operator/environment flows for operational specs.
