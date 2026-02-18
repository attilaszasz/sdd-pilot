# Ambiguity Scan Categories

When scanning a specification for underspecified areas, evaluate each of these 11 categories. Mark each as Clear / Partial / Missing.

## 1. Functional Scope & Behavior
- Core user goals & success criteria
- Explicit out-of-scope declarations
- User roles / personas differentiation

## 2. Domain & Data Model
- Entities, attributes, relationships
- Identity & uniqueness rules
- Lifecycle/state transitions
- Data volume / scale assumptions

## 3. Interaction & UX Flow
- Critical user journeys / sequences
- Error/empty/loading states
- Accessibility or localization notes

## 4. Non-Functional Quality Attributes
- Performance (latency, throughput targets)
- Scalability (horizontal/vertical, limits)
- Reliability & availability (uptime, recovery expectations)
- Observability (logging, metrics, tracing signals)
- Security & privacy (authN/Z, data protection, threat assumptions)
- Compliance / regulatory constraints (if any)

## 5. Integration & External Dependencies
- External services/APIs and failure modes
- Data import/export formats
- Protocol/versioning assumptions

## 6. Edge Cases & Failure Handling
- Negative scenarios
- Rate limiting / throttling
- Conflict resolution (e.g., concurrent edits)

## 7. Constraints & Tradeoffs
- Technical constraints (language, storage, hosting)
- Explicit tradeoffs or rejected alternatives

## 8. Terminology & Consistency
- Canonical glossary terms
- Avoided synonyms / deprecated terms

## 9. Completion Signals
- Acceptance criteria testability
- Measurable Definition of Done indicators

## 10. Misc / Placeholders
- TODO markers / unresolved decisions
- Ambiguous adjectives ("robust", "intuitive") lacking quantification

## 11. Cross-Artifact Alignment
- Consistency with project instructions principles
- Alignment with existing specs (if multi-feature)

## Prioritization Heuristic

When more than 5 categories remain unresolved, select the top 5 by `Impact × Uncertainty`:
- High impact: security, functional scope, data model
- Medium impact: non-functional, integration, edge cases
- Low impact: terminology, placeholders, completion signals

## Question Constraints
- Maximum 8 questions per session; no cumulative cap across sessions
- Each question: multiple-choice (2–5 options) OR short answer (≤5 words)
- Include a **recommended answer** with reasoning
- Only ask questions whose answers materially impact architecture, data modeling, task decomposition, test design, UX, or compliance
