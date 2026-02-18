# SDD Quality Dimensions

## Requirements Quality Framework

Every requirement and specification should be evaluated across these dimensions:

### 1. Completeness
Are all necessary requirements present?
- All user journeys documented
- Edge cases identified
- Error scenarios covered
- Non-functional requirements specified
- Dependencies and assumptions documented

### 2. Clarity
Are requirements specific and unambiguous?
- No vague adjectives ("fast", "scalable", "robust") without measurable criteria
- Precise terminology used consistently
- Success criteria quantified with specific metrics
- Boundary conditions explicitly defined

### 3. Consistency
Do requirements align without conflicts?
- No contradictory requirements across sections
- Terminology used uniformly (same concept = same name)
- Cross-references between spec, plan, and tasks aligned
- Priority assignments logically ordered

### 4. Measurability
Can requirements be objectively verified?
- Success criteria include specific metrics (time, percentage, count)
- Acceptance scenarios use Given/When/Then format
- Technology-agnostic verification methods
- No subjective evaluation criteria

### 5. Coverage
Are all scenarios and edge cases addressed?
- Primary flows documented
- Alternate flows identified
- Exception/error flows specified
- Recovery flows defined (where state mutation occurs)
- Non-functional domains addressed (performance, security, accessibility)

### 6. Traceability
Can requirements be traced to implementation?
- Requirements have stable IDs (FR-001, SC-001)
- Tasks reference requirement IDs or user stories
- Checklist items reference spec sections (`[Spec §X.Y]`)
- Coverage gaps marked with `[Gap]`

## Checklist Item Format

```
- [ ] CHK### <question about requirement quality> [Quality Dimension, Spec §X.Y]
```

### Correct Patterns (testing requirements quality):
- "Are visual hierarchy requirements defined for all card types?" [Completeness]
- "Is 'prominent display' quantified with specific sizing/positioning?" [Clarity]
- "Are hover state requirements consistent across all interactive elements?" [Consistency]
- "Can 'balanced visual weight' be objectively verified?" [Measurability]
- "Are loading state requirements defined for asynchronous data?" [Coverage, Gap]

### Wrong Patterns (testing implementation — NEVER use):
- "Verify the button clicks correctly"
- "Test error handling works"
- "Confirm the API returns 200"

## Analysis Severity Levels

| Severity | Criteria |
|----------|----------|
| **CRITICAL** | Violates project instructions MUST, missing core artifact, requirement with zero coverage blocking baseline functionality |
| **HIGH** | Duplicate/conflicting requirement, ambiguous security/performance attribute, untestable acceptance criterion |
| **MEDIUM** | Terminology drift, missing non-functional task coverage, underspecified edge case |
| **LOW** | Style/wording improvements, minor redundancy not affecting execution |
