---
name: TaskTracker
description: Reads, parses, and returns the list of tasks from tasks.md in a structured format.
user-invocable: false
tools: ['read/readFile']
agents: []
---

## Task
Parse `tasks.md` into structured task objects with status metadata.
## Inputs
Feature directory containing `tasks.md`.
## Execution Rules
Preserve order, infer status consistently, and skip malformed lines safely.
## Output Format
Return a single JSON array of parsed task objects.

<inputs>
The calling agent will provide:
1. `FEATURE_DIR`: The directory containing `tasks.md`.
</inputs>

<workflow>

1. Read `FEATURE_DIR/tasks.md`. If missing or empty → return `[]`.
2. Parse task lines in two accepted forms:
  - Standard task: `- [ |X|x] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} Description`
  - QC bug task: `- [ |X|x] T### [BUG:severity] [RECURRING?] [ESCALATED?] [DEFERRED?] {(FR|TR|OR|RR)-###?} [category?] Description`
   - Checkbox: `[ ]`=pending, `[X]`/`[x]`=completed
   - ID: `T###`
   - Optional `[P]` → parallel=true
   - Optional `[US#]`/`[OBJ#]` → workItem, story, objective
  - Optional `[BUG:CRITICAL|ERROR|WARNING]` → `bugSeverity`
  - Optional modifier tags `[RECURRING]`, `[ESCALATED]`, `[DEFERRED]` → `modifiers` array and `deferred` boolean
  - Optional `[category]` after requirement tags on bug tasks → `bugCategory`
   - Optional `{FR-###}`, `{TR-###}`, `{OR-###}`, `{RR-###}` (comma-separated) → requirements array
   - Remaining text → description
   - Current heading → phase
   - Include completed tasks. Skip non-matching lines. Preserve order.
3. Return single JSON array:

```json
[
  {
    "id": "T001",
    "status": "pending",
    "parallel": true,
    "bugSeverity": null,
    "bugCategory": null,
    "modifiers": [],
    "deferred": false,
    "workItem": "US1",
    "story": "US1",
    "objective": null,
    "requirements": ["FR-001"],
    "phase": "Phase 1: User Story 1",
    "description": "Update auth middleware in src/middleware/auth.py"
  },
  {
    "id": "T005",
    "status": "pending",
    "parallel": false,
    "bugSeverity": "ERROR",
    "bugCategory": "test-failure",
    "modifiers": ["RECURRING", "DEFERRED"],
    "deferred": true,
    "workItem": null,
    "story": null,
    "objective": null,
    "requirements": ["TR-005"],
    "phase": "Phase: Bug Fixes",
    "description": "Fix migration harness retry handling — src/migrations/harness.py:42"
  }
]
```

</workflow>
