---
name: clarification-strategies
description: "Strategies for auditing specifications and reducing ambiguity. Use when running `/sddp-clarify` or whenever an agent needs to critique a requirement."
---

# Clarification Strategies

## Ambiguity Audit Patterns

Patterns to identify weak requirements in `spec.md`:

### 1. The "Adverb Trap"
**Pattern**: "quickly", "easily", "efficiently", "seamlessly".
**Critique**: "Define 'quickly'. <200ms? <1s? Define 'easily'. How many clicks?"
**Goal**: Convert subjective adverbs to measurable metrics.

### 2. The Passive Voice
**Pattern**: "The user is notified..." / "The data is processed..."
**Critique**: "WHO notifies? Email? SMS? Toast? WHAT processes? Background job? Synchronous call?"
**Goal**: Identify specific actor and mechanism.

### 3. The "Unspecified Scale"
**Pattern**: "Handle user uploads" without size limits.
**Critique**: "Max file size? Allowed types? Expected concurrency?"
**Goal**: Define boundary constraints for Plan phase.

### 4. The "Missing Failure Mode"
**Pattern**: "User logs in successfully."
**Critique**: "Wrong password? Locked account? DB down?"
**Goal**: Ensure error paths defined in User Scenarios.

### 5. The "Scope Creep" Detector
**Pattern**: "Integration with 3rd party providers" (plural) when one suffices for MVP.
**Critique**: "Which specific providers for V1? Can we limit to one?"
**Goal**: Narrow scope, reduce complexity.

## Questioning Protocol

When generating questions:
1. **Group by Impact**: Security > Scope > UX > Technical.
2. **Propose a Default**: "Should we default to JWT for auth, or do you have a specific requirement?"
3. **Limit Volume**: Max 8 critical questions at a time.
4. **Reference Lines**: Point to specific line in `spec.md` where ambiguity exists.
