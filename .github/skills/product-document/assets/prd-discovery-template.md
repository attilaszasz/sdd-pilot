---
artifact: prd-discovery
product: "[PRODUCT]"
status: active
created: "[YYYY-MM-DD]"
updated: "[YYYY-MM-DD]"
target_prd: "[CANONICAL_PRD]"
awaiting_user: false
current_stage: framing
next_stage: framing
complexity_score: 0
routing: discovery
base_capability_digest: "[SHA-256 OR EMPTY]"
---

# PRD Discovery: [PRODUCT]

Valid `status`: `active`, `ready-to-synthesize`, `completed`, `abandoned`. Valid stages: `framing`, `evidence`, `research+stakeholders`, `scope-options`, `decision-checkpoints`, `readiness`, `synthesis`, `none`. A user pause keeps `status: active` and sets `awaiting_user: true`.

## Session Log

| Date | Path | Start Stage | Outcome |
|------|------|-------------|---------|
| [YYYY-MM-DD] | discover | framing | active |

## Framing

- **Intent**: [Desired product outcome]
- **Primary actors**: [Known actors]
- **Problem**: [Current problem]
- **Constraints**: [Known constraints]

## Complexity Profile

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Product framing | 0/1/2 | [User, problem, and value clarity] |
| Evidence | 0/1/2 | [Quality, novelty, or contradictions] |
| Stakeholders | 0/1/2 | [Authority, plurality, or disagreement] |
| Consequence | 0/1/2 | [Operational, regulatory, safety, or financial impact] |
| Scope coupling | 0/1/2 | [Workflow and capability coupling] |
| Existing impact | 0/1/2 | [PRD, CAP, plan, or completed-epic impact] |

- **Hard triggers**: [Contradictory evidence, required stakeholder input, unresolved framing, regulated/high-consequence scope, material referenced CAP changes, or none]
- **Discovery depth**: [Focused/full and rationale]

## Evidence Ledger

| Evidence ID | Type | Claim or Observation | Source | Date | Confidence | Relevance |
|-------------|------|----------------------|--------|------|------------|-----------|
| EVD-001 | observed/reported/external | [Evidence] | [Source] | [date] | low/medium/high | [Decision relevance] |

## Hypothesis Ledger

| Hypothesis ID | Hypothesis | Basis | Validation Needed | Status |
|---------------|------------|-------|-------------------|--------|
| HYP-001 | [Unverified belief] | [EVD refs or rationale] | [Test/evidence] | open/supported/rejected/inconclusive |

## Stakeholder Map

| Stakeholder | Role | View or Need | Evidence | Agreement Status |
|-------------|------|--------------|----------|------------------|
| [Stakeholder] | [user/buyer/operator/approver/other] | [View] | [EVD refs] | unknown/individual/disputed/explicit-consensus |

`explicit-consensus` requires recorded agreement from the relevant decision makers. Never infer it from silence or a single view.

## Scope Options

### Option A: [Name]

- **Outcome**: [Outcome]
- **Provisional capabilities**: [Plain-text labels only; never CAP IDs]
- **Excluded**: [Boundary]
- **Evidence**: [EVD/HYP refs]
- **Tradeoffs and risks**: [Tradeoffs]

## Decision Ledger

| Decision ID | Decision | State | Outcome | Decision Maker | Evidence / Rationale | Date |
|-------------|----------|-------|---------|----------------|----------------------|------|
| PDD-001 | [Decision] | proposed/accepted/rejected/deferred | [Explicit answer] | [User/role] | [EVD/HYP/PDQ refs] | [date] |

## Question Ledger

| Question ID | Question | Why It Matters | Owner | Status | Resolution |
|-------------|----------|----------------|-------|--------|------------|
| PDQ-001 | [Question] | [Impact] | [Owner] | open/answered/waived | [PDD ref or accepted risk] |

## Readiness

| Area | Status | Evidence or Gap |
|------|--------|-----------------|
| Vision and problem | ready/gap | [Refs or gap] |
| Primary users and stakeholders | ready/gap | [Refs or gap] |
| Evidence and hypotheses | ready/gap | [Refs or gap] |
| Scope and exclusions | ready/gap | [Refs or gap] |
| Outcomes and measures | ready/gap | [Refs or gap] |
| Constraints, dissent, and open decisions | ready/gap | [Refs or gap] |

## Synthesis Record

- **Canonical candidate**: [PATH]
- **Final scope decisions**: [PDD refs]
- **Assigned capabilities**: [CAP IDs assigned only after scope decision]
- **Validator result**: [pending/PASS]
- **Registration result**: [pending/registered]
