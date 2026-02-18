---
name: clarification-strategies
description: "Strategies for auditing specifications and reducing ambiguity. Use when running `@sddp.clarify` or whenever an agent needs to critique a requirement."
---

# Clarification Strategies

## Ambiguity Audit Patterns

Use these patterns to identify weak requirements in `spec.md`.

### 1. The "Adverb Trap"
**Pattern**: Words like "quickly", "easily", "efficiently", "seamlessly".
**Critique**: "Define 'quickly'. Is it <200ms? <1s? Define 'easily'. How many clicks?"
**Goal**: Convert subjective adverbs into measurable metrics.

### 2. The Passive Voice
**Pattern**: "The user is notified..." or "The data is processed..."
**Critique**: "WHO notifies the user? Email? SMS? In-app toast? WHAT processes the data? A background job? A synchronous API call?"
**Goal**: Identify the specific actor and mechanism.

### 3. The "Unspecified Scale"
**Pattern**: "Handle user uploads" without size limits.
**Critique**: "What is the max file size? What are the allowed file types? What is the expected concurrency?"
**Goal**: Define boundary constraints for the Plan phase.

### 4. The "Missing Failure Mode"
**Pattern**: "User logs in successfully."
**Critique**: "What happens if the password is wrong? What if the account is locked? What if the database is down?"
**Goal**: Ensure error paths are defined in User Scenarios.

### 5. The "Scope Creep" Detector
**Pattern**: "Integration with 3rd party providers" (plural) when only one is needed for MVP.
**Critique**: "Which specific providers are required for V1? Can we limit to just one?"
**Goal**: Reduce complexity by narrowing scope.

## Questioning Protocol

When generating questions:
1.  **Group by Impact**: Security > Scope > UX > Technical.
2.  **Propose a Default**: "Should we default to JWT for auth, or do you have a specific requirement?"
3.  **Limit Volume**: Do not overwhelm the user. Max 8 critical questions at a time.
4.  **Reference Lines**: Always point to the specific line number in `spec.md` where the ambiguity exists.
