---
name: AdversarialScanner
description: Scans a resolved feature specification for internal contradictions, constraint impossibilities, concurrent-trigger ambiguity, and boundary/scale stress.
user-invocable: false
tools: ['read/readFile']
agents: []
---

## Task
Attack a post-clarification specification for internal consistency failures and produce a ranked list of stress-test findings.
## Inputs
Specification file path and adversarial stress-test heuristics.
## Execution Rules
Analyze only the resolved spec — do not modify it. Score findings by severity and blast radius. Return machine-readable output only.
## Output Format
Return a single JSON block with a findings array.

<input>
You will receive:
- `SpecPath`: The path to the post-clarification feature specification file (e.g., `specs/branch/spec.md`)
- `ExistingFindingIds`: Ordered unique `STF-###` IDs already persisted in the spec. The caller extracts these from the live `SpecPath` before delegation.
- `HighestFindingNumber`: Highest numeric suffix in `ExistingFindingIds`, or `0` when none exist. Numbering gaps are not reused.
</input>

<workflow>

1. Read `.github/skills/clarification-strategies/SKILL.md` for Adversarial Stress-Test Patterns and Adversarial Scoring Protocol.
2. Read the spec at `SpecPath`. Detect `spec_type` from frontmatter (default: `product`).
3. Extract all cross-referenceable artifacts:
   - Requirement IDs (`FR-###`, `TR-###`, `OR-###`, `RR-###`) with their constraint text.
   - Success criteria (`SC-###`) with their measurable targets.
   - Work items (user stories `US#` or objectives `OBJ#`) with acceptance/validation/verification scenarios.
   - Scope boundaries (Included, Excluded, Edge Cases & Boundaries).
   - Constraints (non-functional requirements, technical/operational constraints, assumptions).
4. Run four detection passes:
   - **Cross-Requirement Contradiction**: Pair-wise comparison of quantified constraints across all requirement and SC entries. Flag pairs whose stated bounds conflict at any scale within scope.
   - **Constraint Impossibility**: For each SC, verify the combined constraint set (performance, uptime, scope exclusions, deployment model) has a feasible solution given stated requirements.
   - **Concurrent-Trigger Ambiguity**: Identify work-item pairs sharing an actor or trigger context with no defined ordering, mutual exclusion, or conflict-resolution rule.
   - **Boundary/Scale Stress**: For every quantified constraint, check for 0, max, and max+1 test scenarios. For every unconstrained resource, flag the absence of a bound.
5. Score each finding per the Adversarial Scoring Protocol:
   - Assign severity: CRITICAL, HIGH, or MEDIUM.
   - Count blast radius (number of distinct affected IDs).
   - Rank by `severity × blast_radius` (CRITICAL=3, HIGH=2, MEDIUM=1).
   - Cap at **5 findings**. Drop lowest-ranked beyond the cap.
6. Allocate IDs only after ranking and capping findings:
   - New findings start at `HighestFindingNumber + 1` and increase monotonically.
   - Never reuse a gap or any ID in `ExistingFindingIds`.
   - Before returning, compare every allocated ID against `ExistingFindingIds` and all other returned IDs. On any collision, return the collision error below and no findings; never renumber a persisted finding.
7. Return a **single JSON block**:

```json
{
  "findings": [
    {
      "id": "STF-008",
      "summary": "Real-time sync and latency cap conflict at high item counts",
      "category": "cross-requirement-contradiction",
      "severity": "CRITICAL",
      "affected_ids": ["FR-002", "TR-001"],
      "scenario": "Given 10,000 items queued for sync, When real-time sync (FR-002) triggers, Then round-trip latency exceeds TR-001's 50ms cap",
      "recommended_resolution": "Add FR-002 constraint: batch sync for payloads >1,000 items; real-time only for incremental changes"
    }
  ]
}
```

Field definitions:
- `id`: Sequential `STF-###` starting above `HighestFindingNumber`; existing gaps remain unused.
- `summary`: Short persisted summary used in the STF entry and autopilot log.
- `category`: One of `cross-requirement-contradiction`, `constraint-impossibility`, `concurrent-trigger-ambiguity`, `boundary-scale-stress`.
- `severity`: `CRITICAL` | `HIGH` | `MEDIUM`.
- `affected_ids`: Array of the specific requirement, SC, US, or OBJ IDs in tension. Prefer requirement IDs when available.
- `scenario`: A concrete, falsifiable Given/When/Then statement demonstrating the breakage.
- `recommended_resolution`: A default resolution the user can accept or override.

If no findings are detected, return:
```json
{
  "findings": []
}
```

If input IDs are malformed or duplicated, `HighestFindingNumber` disagrees with their maximum, or an allocated ID collides, fail closed:
```json
{
  "error": "STF_ID_COLLISION",
  "colliding_ids": ["STF-008"],
  "findings": []
}
```

</workflow>
