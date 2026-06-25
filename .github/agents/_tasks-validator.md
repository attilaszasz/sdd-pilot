---
name: TasksValidator
description: Scores a generated tasks.md against phase-boundary criteria and returns a structured pass/fail verdict with specific issues found.
user-invocable: false
tools: ['read/readFile']
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
</input>

<workflow>

1. Read tasks at `TasksPath` and spec at `SpecPath`. Collect the set of P1 requirement IDs (`FR-###`/`TR-###`/`OR-###`/`RR-###`) from `spec.md` (priorities P1 only).
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
