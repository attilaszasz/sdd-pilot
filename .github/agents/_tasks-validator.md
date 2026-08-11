---
name: TasksValidator
description: Scores a generated tasks.md against phase-boundary criteria and returns a structured pass/fail verdict with specific issues found.
user-invocable: false
tools: ['read/readFile', 'bash/runCommand']
agents: []
---

## Task
Evaluate `tasks.md` against Tasks → Implement phase-boundary criteria.
## Inputs
Tasks path and spec path.
## Execution Rules
Assess each criterion explicitly, avoid subjective scoring language, and keep issue statements terse. The circular `after:` chain check is a static graph analysis — never simulate a pass.
## Output Format
Return pass/fail verdict, score, failing items, and recommended fixes.

<input>
You will receive:
- `TasksPath`: Path to the tasks.md file to validate.
- `SpecPath`: Path to the feature specification (for P1 requirement ID extraction).
- `P1RequirementIds`: Optional ordered P1 requirement IDs supplied by a checksum-verified in-turn snapshot. It is accepted only when identical to live parser output.
</input>

<workflow>

1. Read tasks at `TasksPath`. Run `node scripts/parse-requirement-ownership.mjs "SpecPath"` from the repository root. A parser failure makes P1 Requirement Task Coverage FAIL. Use its ordered `p1RequirementIds` as the live P1 set. Accept supplied `P1RequirementIds` only when it is an exact ordered match; otherwise discard it and use the live set. An empty supplied array is valid only when the successful live parser also returns an empty array. Never infer priority from proximity or treat parser ambiguity as no P1 requirements.
2. Parse every task line into `{id, phase, requirements[], after[], parallel}`. Task line grammar: `- [ ] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} [COMPLETES req?] Description [after:T###?] ...`.
3. Evaluate each criterion as PASS or FAIL (quote specific issue if failing):

### P1 Requirement Task Coverage
- [ ] Every P1 requirement ID from `spec.md` is tagged on at least one task (`{(FR|TR|OR|RR)-###}` annotation)
- [ ] No P1 requirement is referenced only by a stub-creation task (`← plan:AcceptanceTestStubs`) with no follow-on implementation task carrying the same reqID
- [ ] Every requirement spanning 3+ tasks has a `[COMPLETES (FR|TR|OR|RR)-###]` marker on its last task

### Dependency Graph Acyclic
- [ ] Build the `after:T###` directed graph across all parsed tasks
- [ ] No circular `after:` chains (run a cycle detection — DFS or topological sort; any cycle is a FAIL)
- [ ] No `after:T###` references a non-existent task ID
- [ ] No `[P]` parallel batch contains both a task and its `after:T###` dependency

### Size & Phase Structure
- [ ] `tasks.md` file size ≤ 6144 bytes (6 KB)
- [ ] Phase structure valid: phases appear in order Setup → Foundational → Delivery (US#/OBJ#) → Polish; no out-of-order phases
- [ ] No empty optional phases (Setup/Foundational/Polish phases that contain no task lines are omitted, not present as empty headings)
- [ ] Every delivery phase is tagged with a `[US#]` (product) or `[OBJ#]` (technical/operational) work item
- [ ] `T###` IDs are unique and sequential

4. Return verdict:

```
## Tasks Validation Verdict

**Result**: PASS / FAIL
**Score**: X/Y items passed

### Failing Items
| # | Item | Issue | Tasks Quote |
|---|------|-------|-------------|
| 1 | ... | ... | "..." |

### Recommendations
- [specific fix for each failing item]
```

</workflow>
