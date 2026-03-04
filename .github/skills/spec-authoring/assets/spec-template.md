---
feature_branch: "[00001-feature-name]"
created: "[DATE]"
input: "$ARGUMENTS"
---

# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[00001-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Product Document**: [path if available, otherwise remove this line]

## User Scenarios & Testing *(mandatory)*

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

<!-- Add more stories (P3+) following the same pattern — adjust priority labels accordingly -->

### Edge Cases

- [REPLACE: boundary conditions relevant to the feature]
- [REPLACE: error scenarios and failure modes]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]
- **FR-003**: System MUST [action/data/behavior] [NEEDS CLARIFICATION: reason unclear — question?]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
