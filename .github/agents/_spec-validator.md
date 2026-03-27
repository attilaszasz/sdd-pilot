---
name: SpecValidator
description: Scores a feature specification against quality criteria and returns a structured pass/fail verdict with specific issues found.
user-invocable: false
tools: ['read/readFile', 'edit/createDirectory', 'edit/createFile']
agents: []
---

## Task
Evaluate `spec.md` against quality and readiness criteria.
## Inputs
Specification path and optional checklist output path.
## Execution Rules
Assess each criterion explicitly and avoid subjective scoring language.
## Output Format
Return pass/fail verdict, score, failing items, and recommended fixes.

<input>
You will receive:
- `SpecPath`: Path to the specification file to validate.
- `ChecklistPath`: Optional. If provided, write the validation checklist to this path. If null/empty, run in read-only mode and return the verdict only.
</input>

<workflow>

1. Read spec at `SpecPath`. Detect `spec_type` from frontmatter (default: `product`).
2. Evaluate each criterion as PASS or FAIL (quote specific issue if failing):

### Content Quality
- [ ] No implementation details belonging in `plan.md` or code
- [ ] Focused on intended value for active `spec_type`
- [ ] Written for stakeholders needing requirements clarity
- [ ] All mandatory sections completed for active `spec_type`
- [ ] Problem Statement present and covers: pain point, who's affected, consequences of inaction
- [ ] Scope section present with Included, Excluded, and Edge Cases & Boundaries

### Requirement Completeness
- [ ] No unresolved `[NEEDS CLARIFICATION]` markers (max 3 deferred to Clarify/Plan)
- [ ] Requirements testable and unambiguous
- [ ] Success criteria measurable
- [ ] Success criteria reference parent work items (`SC-### [US#|OBJ#]: ...`)
- [ ] Every P1 story or objective has at least one success criterion
- [ ] Success criteria align with `spec_type` (product: user-focused, tech-agnostic; technical/operational: measurable system/operational outcomes)
- [ ] Scenario-style criteria defined (`Acceptance Scenarios`, `Validation Criteria`, or `Verification Criteria`)
- [ ] Edge cases, constraints, failure modes identified
- [ ] Scope clearly bounded (Included and Excluded sections populated)
- [ ] Dependencies and assumptions identified (including `Integration Points` when required)
- [ ] Assumptions & Risks section present with reasonable entries
- [ ] Implementation Signals present with at least one tagged signal
- [ ] All priorities (including P1) have a "Why this priority" rationale

### Feature Readiness
- [ ] All requirements have acceptance/validation/verification coverage
- [ ] User scenarios or objectives cover primary flows/capabilities
- [ ] Each user story or objective independently testable/verifiable
- [ ] No implementation details leak into specification
- [ ] Glossary present when 2+ domain-specific terms are introduced

3. If `ChecklistPath` provided → write results using standard checklist format with `CHK###` IDs and `- [ ]`/`- [X]` states.
4. Return verdict:

```
## Spec Validation Verdict

**Result**: PASS / FAIL
**Score**: X/Y items passed

### Failing Items
| # | Item | Issue | Spec Quote |
|---|------|-------|------------|
| 1 | ... | ... | "..." |

### Recommendations
- [specific fix for each failing item]
```

</workflow>
