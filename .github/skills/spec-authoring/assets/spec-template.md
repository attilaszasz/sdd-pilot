---
feature_branch: "[00001-feature-name]"
created: "[DATE]"
input: "$ARGUMENTS"
spec_type: "[product|technical|operational]"
epic_id: "[E### or empty]"
epic_sources: "[{source-tags} or empty]"
---

# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[00001-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Spec Type**: [product|technical|operational]  
**Epic ID**: [E### if available, otherwise remove this line]  
**Epic Sources**: [{source-tags} if available, otherwise remove this line]  
**Product Document**: [path if available, otherwise remove this line]

## User Scenarios & Testing *(mandatory for product specs only)*

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Independent Test**: [One sentence: what to demo/test to prove this story works]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority** *(include only if priority reasoning is non-obvious)*: [Brief rationale]

**Independent Test**: [One sentence: what to demo/test]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

### Edge Cases

- [Boundary conditions relevant to the feature]
- [Error scenarios and failure modes]

## Technical Objectives *(mandatory for technical specs only)*

### Objective 1 - [Brief Title] (Priority: P1)

[Describe what this technical component must achieve in concrete system terms]

**Rationale**: [Why this is needed]

**Deliverables**:
- [Concrete artifact: library, module, schema, configuration, migration asset]
- [Concrete artifact]

**Validation Criteria**:
1. **Given** [precondition], **When** [technical action], **Then** [expected system behavior]
2. **Given** [precondition], **When** [technical action], **Then** [expected system behavior]

### Objective 2 - [Brief Title] (Priority: P2)

[Describe the secondary technical capability]

**Why this priority** *(include only if non-obvious)*: [Brief rationale]

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

**Rationale**: [Why this is needed]

**Deliverables**:
- [Concrete artifact: pipeline config, IaC template, dashboard, runbook]
- [Concrete artifact]

**Verification Criteria**:
1. **Given** [environment state], **When** [operational action], **Then** [expected outcome]
2. **Given** [environment state], **When** [operational action], **Then** [expected outcome]

### Objective 2 - [Brief Title] (Priority: P2)

[Describe the secondary operational capability]

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

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [User, technical, or operational metric appropriate to the chosen spec type]
- **SC-002**: [User, technical, or operational metric appropriate to the chosen spec type]
