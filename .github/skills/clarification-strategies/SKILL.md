---
name: clarification-strategies
description: "Reference material with ambiguity-audit patterns and critique strategies for requirements. Loaded on demand by `clarify-spec`; not directly invokable."
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

## Adversarial Stress-Test Patterns

Patterns to detect internal contradictions and constraint violations in *resolved* specs. Run after collaborative ambiguity questions are answered — the goal shifts from "what did you mean?" to "what breaks if you meant exactly that?"

### 1. Cross-Requirement Contradiction
**Signal**: Two requirement or success-criteria IDs impose mutually exclusive constraints.
**Heuristic**: Pair-wise comparison of quantified constraints across all `FR-###`, `TR-###`, `OR-###`, `SC-###` entries — flag pairs whose stated bounds conflict at any scale within the spec's defined scope.
**Example**: "FR-002 mandates real-time sync, but TR-001 caps round-trip latency at 50 ms — under a 10,000-item payload, one of these must yield. Which one relaxes, and under what threshold?"

### 2. Constraint Impossibility
**Signal**: An acceptance, validation, or verification criterion is unachievable given stated constraints.
**Heuristic**: For each SC, check that the combined constraint set (performance, uptime, scope exclusions, deployment model) has a feasible solution.
**Example**: "SC-003 requires 99.99% uptime (US3), but OR-001 specifies zero-downtime deploys with no blue/green or canary strategy in scope — how is the 4.3 min/year error budget preserved during releases?"

### 3. Concurrent-Trigger Ambiguity
**Signal**: Two or more work items can fire simultaneously with no defined priority or conflict resolution.
**Heuristic**: Identify US/OBJ pairs sharing an actor or trigger context; flag when the spec defines no ordering, mutual exclusion, or conflict-resolution rule.
**Example**: "If a user triggers FR-001 (bulk import) and FR-004 (real-time validation) on the same dataset at the same instant, which operation wins? Is the import atomic or row-level?"

### 4. Boundary/Scale Stress
**Signal**: Stated limits are never tested at their extremes, or no limit is stated at all.
**Heuristic**: For every quantified constraint, check for 0, max, and max+1 test scenarios; for every unconstrained resource (file size, concurrency, payload count), flag the absence of a bound.
**Example**: "US-002 says 'handle user uploads' — what happens at 0 bytes? At the max-size boundary? At max-size + 1 byte? What is the max concurrency?"

## Adversarial Scoring Protocol

When scoring adversarial findings:
1. **Severity**: Use the same definitions as `artifact-conventions/SKILL.md` violation severity — CRITICAL (blocks baseline, violates instructions), HIGH (conflicting requirements, untestable criteria), MEDIUM (missing edge case, underspecified boundary).
2. **Blast Radius**: Count the number of distinct IDs (FR-###, TR-###, OR-###, SC-###, US#, OBJ#) affected by the finding.
3. **Rank**: Sort by `severity × blast_radius` (CRITICAL=3, HIGH=2, MEDIUM=1).
4. **Cap**: Return at most **5 findings** per pass. Drop lowest-ranked findings beyond the cap.
