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
Read `.github/skills/compact-communication/SKILL.md` first. Preserve order, infer status consistently, skip malformed lines safely, and return machine-readable output only.
## Output Format
Return a single JSON array of parsed task objects.

<inputs>
The calling agent will provide:
1. `FEATURE_DIR`: The directory containing `tasks.md`.
</inputs>

<workflow>

1. Read `FEATURE_DIR/tasks.md`. If missing or empty → return `[]`.
2. Parse task lines in two accepted forms:
  - Standard task: `- [ |X|x] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} [COMPLETES req?] Description [after:T###?] [← T###:Symbol?] [→ exports: Symbol?]`
  - QC bug task: `- [ |X|x] T### [BUG:severity] [RECURRING?] [ESCALATED?] [DEFERRED?] {(FR|TR|OR|RR)-###?} [category?] Description`
   - Checkbox: `[ ]`=pending, `[X]`/`[x]`=completed
   - ID: `T###`
   - Optional `[P]` → parallel=true
   - Optional `[US#]`/`[OBJ#]` → workItem, story, objective
  - Optional `[BUG:CRITICAL|ERROR|WARNING]` → `bugSeverity`
  - Optional modifier tags `[RECURRING]`, `[ESCALATED]`, `[DEFERRED]` → `modifiers` array and `deferred` boolean
  - Optional `[category]` after requirement tags on bug tasks → `bugCategory`
     - Optional `{FR-###}`, `{TR-###}`, `{OR-###}`, `{RR-###}` (comma-separated) → requirements array
     - Extract `filePath` from the task description when a path is present
   - Optional `[COMPLETES (FR|TR|OR|RR)-###]` → `completesRequirement` string (e.g. `"FR-003"`)
   - Optional `after:T###` (comma-separated for multiple) → `dependencies` array (e.g. `["T005", "T008"]`)
     - Optional `← T###:Symbol,Symbol` → `imports` array of `{"sourceTask": "T###", "filePath": "src/example.ts", "symbols": ["Symbol"]}` objects when the source task can be resolved from the parsed task list
   - Optional `→ exports: Symbol(params),Symbol` → `exports` array of symbol strings
   - Remaining text (after removing parsed annotations) → description
   - Current heading → phase
     - After parsing all tasks, resolve `dependencies` and `imports[].filePath` by matching referenced task IDs to parsed tasks in the same `tasks.md`
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
    "filePath": "src/models/user.py",
    "requirements": ["FR-001"],
    "completesRequirement": null,
    "dependencies": [],
    "imports": [],
    "exports": ["UserModel(id,email,role)"],
    "phase": "Phase 1: User Story 1",
    "description": "Create User model in src/models/user.py"
  },
  {
    "id": "T002",
    "status": "pending",
    "parallel": false,
    "bugSeverity": null,
    "bugCategory": null,
    "modifiers": [],
    "deferred": false,
    "workItem": "US1",
    "story": "US1",
    "objective": null,
    "filePath": "src/services/user.py",
    "requirements": ["FR-002"],
    "completesRequirement": null,
    "dependencies": ["T001"],
    "imports": [{"sourceTask": "T001", "filePath": "src/models/user.py", "symbols": ["UserModel"]}],
    "exports": ["UserService.register()"],
    "phase": "Phase 1: User Story 1",
    "description": "Implement user service in src/services/user.py"
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
    "filePath": "src/migrations/harness.py",
    "requirements": ["TR-005"],
    "completesRequirement": null,
    "dependencies": [],
    "imports": [],
    "exports": [],
    "phase": "Phase: Bug Fixes",
    "description": "Fix migration harness retry handling — src/migrations/harness.py:42"
  }
]
```

</workflow>
