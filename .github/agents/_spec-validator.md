---
name: SpecValidator
description: Scores a feature specification against quality criteria and returns a structured pass/fail verdict with specific issues found.
user-invocable: false
tools: ['read/readFile', 'bash/runCommand', 'edit/createDirectory', 'edit/createFile']
required-capabilities: ['bash/runCommand']
agents: []
---

## Task
Evaluate `spec.md` against quality and readiness criteria.
## Inputs
Specification path and optional checklist output path.
## Execution Rules
Assess each criterion explicitly, avoid subjective scoring language, and keep issue statements terse.
## Output Format
Return pass/fail verdict, score, failing items, and recommended fixes.

<input>
You will receive:
- `SpecPath`: Path to the specification file to validate.
- `ChecklistPath`: Optional. If provided, write the validation checklist to this path. If null/empty, run in read-only mode and return the verdict only.
</input>

<workflow>

1. Run `node scripts/parse-requirement-ownership.mjs "SpecPath"` and the shared executable evaluator from the repository root: `node --input-type=module -e "import { readFileSync } from 'node:fs'; import { evaluateSpecGate } from './scripts/phase-gates.mjs'; console.log(JSON.stringify(evaluateSpecGate(readFileSync(process.argv[1]))))" "SpecPath"`. Its verdict is canonical for every deterministic criterion below; do not recreate rules by phrase matching. Count every literal unresolved `[NEEDS CLARIFICATION: ...]` marker and retain the exact count.
2. Evaluate each criterion as PASS or FAIL (quote specific issue if failing):

### Content Quality
- [ ] No implementation details belonging in `plan.md` or code
- [ ] Focused on intended value for active `spec_type`
- [ ] Written for stakeholders needing requirements clarity
- [ ] All mandatory sections completed for active `spec_type`
- [ ] Problem Statement present and covers: pain point, who's affected, consequences of inaction
- [ ] Scope section present with Included, Excluded, and Edge Cases & Boundaries

### Frontmatter Completeness
- [ ] YAML frontmatter present with `spec_type` (`product` | `technical` | `operational`; absent → treated as `product` and flagged)
- [ ] `spec_maturity` field present (`draft` | `clarified` | higher)
- [ ] `epic_id` field present when `specs/project-plan.md` exists (links spec to epic)
- [ ] No empty required frontmatter fields

### Requirement Completeness
- [ ] Unresolved ordinary marker count is at most 3: counts 0, 1, 2, and 3 PASS this criterion; count 4 or greater FAILS it. On failure, report `Found <count> unresolved [NEEDS CLARIFICATION] markers; maximum is 3.`
- [ ] Concrete acceptance criteria present for every P1 user story or objective (at least one measurable success criterion per P1 item, not a vague placeholder)
- [ ] Requirements testable and unambiguous
- [ ] Every requirement uses canonical bold-list ownership syntax, references exactly one existing `US#`/`OBJ#`, and derives priority from that owner; every P1 work item owns at least one requirement
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
- [ ] Stress-Test Findings section (if present) uses valid, unique `STF-###` IDs and contains no unresolved CRITICAL/HIGH findings. This criterion FAILS independently at every ordinary-marker count, including 0 through 3. `[NEEDS CLARIFICATION: STF-###]` markers and `[DEFERRED TO NEXT CLARIFY]` tags identify unresolved findings; neither is a waiver. Resolved findings retain their persisted IDs and traceability.

3. If `ChecklistPath` provided → write results using standard checklist format with `CHK###` IDs and `- [ ]`/`- [X]` states.
4. Return verdict:

```
## Spec Validation Verdict

**Result**: PASS / FAIL
**Score**: X/Y items passed
**Unresolved clarification markers**: <exact count> (maximum 3)

### Failing Items
| # | Item | Issue | Spec Quote |
|---|------|-------|------------|
| 1 | ... | ... | "..." |

### Recommendations
- [specific fix for each failing item]
```

</workflow>
