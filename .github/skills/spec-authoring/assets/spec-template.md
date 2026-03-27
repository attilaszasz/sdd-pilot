---
feature_branch: "[00001-feature-name]"
created: "[DATE]"
input: "$ARGUMENTS"
spec_type: "[product|technical|operational]"
spec_maturity: "draft"
epic_id: "[E### or empty]"
epic_sources: "[{source-tags} or empty]"
---

# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[00001-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Spec Type**: [product|technical|operational]  
**Spec Maturity**: draft  
**Epic ID**: [E### if available, otherwise remove this line]  
**Epic Sources**: [{source-tags} if available, otherwise remove this line]  
**Product Document**: [path if available, otherwise remove this line]

## Problem Statement *(mandatory)*

[What pain point or opportunity does this feature address? Who is affected and what happens if it isn't solved? 2-4 sentences max.]

## Scope *(mandatory)*

### Included

- [Core capability or flow that is in scope]
- [Core capability or flow that is in scope]

### Excluded

- [Explicitly deferred or out-of-scope item] — [brief rationale]
- [Explicitly deferred or out-of-scope item] — [brief rationale]

### Edge Cases & Boundaries

- [Boundary conditions relevant to the feature]
- [Error scenarios and failure modes]

## User Scenarios & Testing *(mandatory for product specs only)*

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [One-line rationale, e.g., "Core value proposition — without this the product has no utility"]

**Independent Test**: [One sentence: what to demo/test to prove this story works]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Brief rationale]

**Independent Test**: [One sentence: what to demo/test]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

## Technical Objectives *(mandatory for technical specs only)*

### Objective 1 - [Brief Title] (Priority: P1)

[Describe what this technical component must achieve in concrete system terms]

**Why this priority**: [One-line rationale]

**Rationale**: [Why this is needed]

**Deliverables**:
- [Concrete artifact: library, module, schema, configuration, migration asset]
- [Concrete artifact]

**Validation Criteria**:
1. **Given** [precondition], **When** [technical action], **Then** [expected system behavior]
2. **Given** [precondition], **When** [technical action], **Then** [expected system behavior]

### Objective 2 - [Brief Title] (Priority: P2)

[Describe the secondary technical capability]

**Why this priority**: [Brief rationale]

**Rationale**: [Why this is needed]

**Deliverables**:
- [Concrete artifact]

**Validation Criteria**:
1. **Given** [precondition], **When** [technical action], **Then** [expected system behavior]

### Technical Constraints

- [Performance budgets, compatibility requirements, resource limits]
- [Security or migration constraints]

## Operational Objectives *(mandatory for operational specs only)*

### Objective 1 - [Brief Title] (Priority: P1)

[Describe what operational capability must be established]

**Why this priority**: [One-line rationale]

**Rationale**: [Why this is needed]

**Deliverables**:
- [Concrete artifact: pipeline config, IaC template, dashboard, runbook]
- [Concrete artifact]

**Verification Criteria**:
1. **Given** [environment state], **When** [operational action], **Then** [expected outcome]
2. **Given** [environment state], **When** [operational action], **Then** [expected outcome]

### Objective 2 - [Brief Title] (Priority: P2)

[Describe the secondary operational capability]

**Why this priority**: [Brief rationale]

**Rationale**: [Why this is needed]

**Deliverables**:
- [Concrete artifact]

**Verification Criteria**:
1. **Given** [environment state], **When** [operational action], **Then** [expected outcome]

### Operational Constraints

- [SLA requirements, compliance mandates, cost budgets]
- [Environment restrictions, vendor constraints]

## Integration Points *(mandatory for technical and operational specs)*

- **IP-001**: [Component or epic] depends on [this deliverable] via [interface type]
- **IP-002**: [This capability] depends on [component or environment] for [what]

## Requirements *(mandatory)*

### Functional Requirements *(product specs only)*

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]
- **FR-003**: System MUST [action/data/behavior] [NEEDS CLARIFICATION: reason unclear — question?]

### Technical Requirements *(technical specs only)*

- **TR-001**: System MUST [specific technical capability]
- **TR-002**: System MUST [specific technical capability]

### Operational Requirements *(operational specs only)*

- **OR-001**: System MUST [specific operational capability]
- **OR-002**: System MUST [specific operational capability]

### Runbook Requirements *(include for operational specs if applicable)*

- **RR-001**: A runbook MUST exist for [operational scenario]
- **RR-002**: A runbook MUST exist for [operational scenario]

### Key Entities *(include for product or technical specs if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Assumptions & Risks *(mandatory)*

### Assumptions

- [Something taken as true without explicit confirmation, e.g., "Users have modern browsers with JavaScript enabled"]
- [Max 5 assumptions]

### Risks

- **[Risk 1]** *(likelihood: low/medium/high, impact: low/medium/high)*: [Brief description and potential mitigation]
- [Max 3 risks]

## Implementation Signals *(mandatory)*

- [Tag: `NEW-ENTITY`, `NEW-API`, `NEW-UI`, `MIGRATION`, `EXTERNAL-SERVICE`, `BREAKING-CHANGE`, `NEW-WORKER`, `NEW-CONFIG`] — [brief description of what the plan phase should architect]

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** [US1|OBJ1]: [User, technical, or operational metric appropriate to the chosen spec type]
- **SC-002** [US2|OBJ2]: [User, technical, or operational metric appropriate to the chosen spec type]

## Glossary *(include when spec introduces 2+ domain-specific terms)*

| Term | Definition |
|------|------------|
| [Domain term] | [Precise definition as used in this spec] |
