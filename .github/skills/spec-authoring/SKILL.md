---
name: spec-authoring
description: "Writes feature specifications with prioritized user scenarios, functional requirements, key entities, and success criteria. Use when creating a spec, writing requirements, defining user stories, authoring a PRD for a new feature, or when handling NEEDS CLARIFICATION markers in specifications."
---

# Spec Authoring Guide

## Spec Writing Process

### 1. Parse the Feature Description
- Extract key concepts: actors, actions, data, constraints
- If empty: ERROR "No feature description provided"

### 2. Fill the Template
Use the template at [assets/spec-template.md](assets/spec-template.md). Replace all placeholders with concrete, technology-agnostic details.

### 3. Prioritize User Stories
Assign priorities P1 (most critical) through P3+:
- Each story must be **independently testable** — implementing just P1 yields a viable MVP
- Use action-noun format for story titles
- Include Given/When/Then acceptance scenarios
- Document "Why this priority" rationale

### 4. Handle Unclear Aspects
- Make **informed guesses** based on context and industry standards
- Only use `[NEEDS CLARIFICATION: specific question]` when:
  - Uncertainty could materially affect feature scope, security/privacy outcomes, or core user experience
  - Multiple reasonable interpretations exist with different implications
  - No reasonable default exists
- **Maximum 3 markers total** — prioritize by: scope > security/privacy > UX > technical
- Use informed defaults only for low-impact details where industry-standard expectations are unlikely to change feature intent
- Present clarifications as tables with options and implications

### 5. Generate Functional Requirements
- Each requirement must be testable
- Format: `FR-###: System MUST [specific capability]`
- Use reasonable defaults for unspecified details

### 6. Define Success Criteria
Must be:
- **Measurable**: specific metrics (time, percentage, count, rate)
- **Technology-agnostic**: no languages, frameworks, databases
- **User-focused**: outcomes from user/business perspective
- **Verifiable**: testable without implementation details

Good: "Users can complete checkout in under 3 minutes"
Bad: "API response time is under 200ms" (too technical)

## Section Requirements
- **Mandatory**: User Scenarios & Testing, Requirements, Success Criteria
- **Optional**: Key Entities (if data involved) — remove if N/A, don't leave empty

## Quick Rules
- Focus on **WHAT** users need and **WHY**
- Avoid **HOW** to implement (no tech stack, APIs, code structure)
- Written for business stakeholders, not developers
- No embedded checklists (those are separate via `@sddp.checklist`)

## Reasonable Defaults (don't ask about these)
- Data retention: Industry-standard practices for the domain
- Performance: Standard web/mobile app expectations unless specified
- Error handling: User-friendly messages with appropriate fallbacks
- Auth: Standard session-based or OAuth2 for web apps
- Integration: RESTful APIs unless specified otherwise

## Ambiguity Scan Categories

See [references/ambiguity-categories.md](references/ambiguity-categories.md) for the full taxonomy used when scanning specs for underspecified areas.
