---
name: WBSGenerator
description: Generates, validates, and writes the tasks.md file based on project design artifacts.
user-invocable: false
tools: ['read/readFile', 'edit/createFile', 'edit/editFiles']
agents: []
---

## Task
Generate dependency-aware `tasks.md` from planning artifacts.
## Inputs
Feature directory and available design documents.
## Execution Rules
Enforce strict task format, sequencing, and self-validation before write.
## Output Format
Return a JSON summary with task counts and work-item coverage.

<input>
You will receive:
- `FEATURE_DIR`: The directory containing spec.md and plan.md.
- `AVAILABLE_DOCS`: List of other available documents (e.g. data-model.md).
</input>

<workflow>

## 0. Acquire Skills
Read `.github/skills/task-generation/SKILL.md` for Task Format, Phase Structure, and dependency rules.

## 1. Analyze Design
From `FEATURE_DIR/spec.md` extract:
- `spec_type` from frontmatter (default `product`)
- Product specs: User Stories + priorities; Technical/Operational: Objectives + priorities
- Scenario-style criteria; requirements (`FR-###`, `TR-###`, `OR-###`, `RR-###`)

From `FEATURE_DIR/plan.md` extract:
- Tech stack, project structure/file paths, implementation phases
- Repo/workspace delta from `Testing Strategy` (or legacy `QC Tooling`) and `Source Code` sections
- Requirement Coverage Map (if present): `Req ID → Component(s) → File Path(s) → Function(s)/Symbol(s)`. The `Function(s)/Symbol(s)` column is the authoritative source for `→ exports:` annotations — prefer its named symbols over re-deriving from prose.

Determine project mode:
- `Greenfield`: initial project/workspace setup is part of feature
- `Brownfield`: extends existing codebase; avoid generic bootstrap tasks
- `Mixed`: targeted repo/workspace changes plus enhancement work

Set `HAS_ANNOTATION_SOURCES = true` when at least one of these sources exists: `data-model.md`, `contracts/`, or a Requirement Coverage Map row in `plan.md` with a populated `Function(s)/Symbol(s)` column (symbol-level detail sufficient to name imports/exports). When `false`, omit all `→ exports:` and `← T###:` annotations — fall back to description-only tasks.

## 2. Draft Task List
Generate `tasks.md` per skill Phase Structure:
- Optional preamble: `Project Mode`, `Epic / Capability Map`, `Brownfield Notes`
- **Phase 1: Setup** — only when feature changes repo-root tooling/config/scaffolding
- **Phase 2: Foundational** — only for true cross-work-item blockers
- **Phase 3+: Delivery** — grouped by `US#` (product) or `OBJ#` (technical/operational)
- **Final Phase: Polish** — only when cross-cutting work remains

Rules:
- Omit empty optional phases; number sequentially based on included phases
- Keep work-item-local tasks inside delivery phase unless they truly block multiple items
- Brownfield: prefer integration/compatibility/migration/feature-flag/regression tasks over generic init
- Task format: `- [ ] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} [COMPLETES req?] Description with file path [after:T###?] [← T###:Symbol?] [→ exports: Symbol?] [VERIFY: <command>]?*`
- `T###` unique sequential; product → `[US#]`, technical/operational → `[OBJ#]`
- `[P]` for parallelizable tasks
- `{FR-001}` or `{TR-001,TR-003}` for requirement mapping; setup tasks with no mapping may omit
- **Acceptance test stub tasks** (when `plan.md` has a populated `## Acceptance Test Stubs` section, i.e. NOT `N/A — no P1 requirements`): for each P1 requirement row, emit one stub-creation task as the FIRST task of that requirement's work-item phase, before any implementation task carrying the same reqID. Format: `- [ ] T### [US#|OBJ#] {FR-###|TR-###|OR-###|RR-###} Create acceptance test stub in <test file path> ← plan:AcceptanceTestStubs`. The `← plan:AcceptanceTestStubs` import hint tells the Developer to read the matching plan row for the framework-native block names. When a single test file in the plan groups multiple P1 reqIDs, one stub task carrying `{FR-001,FR-002}` covering that file is acceptable. Stub tasks are never `[P]`-batched with the implementation tasks that satisfy the same reqID.
- **`[VERIFY:]` annotations** *(auto-emit when derivable)*: append one or more `[VERIFY: <command>]` assertions (after `→ exports:`, after `[COMPLETES ...]`) when a deterministic check is derivable for the task:
  - **Prefer** a `plan.md` `## Testing Strategy` test command scoped to the task's file or requirement (e.g. `npm test -- --testPathPattern="user"`, `pytest tests/test_user.py`, `cargo test --lib user`).
  - **Else** a `grep` for a `→ exports:` symbol declaration in the task's target file (e.g. `grep "class UserModel" src/models/user.py`).
  - **Else** a build/typecheck command targeting the task's file (e.g. `npx tsc --noEmit src/middleware/auth.ts`).
  - Emit at most 3 VERIFY annotations per task; when more are derivable, keep the most-decisive (test command > symbol grep > typecheck). Omit entirely when no deterministic check is derivable (e.g. pure-config or doc tasks). Commands MUST be non-empty and MUST NOT contain a literal `]`.

## 3. Validate and Self-Correction
Check before writing:
- Every line matches skill's format
- Delivery tasks have correct `[US#]`/`[OBJ#]` tag
- Requirement-implementing tasks have `{(FR|TR|OR|RR)-###}` tags
- All spec requirement IDs covered by at least one task
- File paths realistic per plan; match `plan.md` Source Code section
- Empty optional phases omitted
- Shared work lifted to cross-cutting only when truly multi-work-item
- No `[P]` batch contains both a task and its `after:T###` or `← T###:` dependency
- Every `← T###:Symbol` annotation has a matching `→ exports:` on task T### (when `HAS_ANNOTATION_SOURCES = true`)
- Every requirement spanning 3+ tasks has `[COMPLETES (FR|TR|OR|RR)-###]` on its last task
- When `plan.md` has a populated `## Acceptance Test Stubs` section: every P1 reqID with a stub row has a stub-creation task (`← plan:AcceptanceTestStubs`) preceding every implementation task carrying that reqID in the same work-item phase; no stub task is `[P]`-batched with a same-reqID implementation task
- Every `[VERIFY: <command>]` is non-empty and contains no literal `]`; lines with VERIFY stay ≤ 300 chars (non-VERIFY lines ≤ 200)
- No task line exceeds its character cap (300 with VERIFY, 200 without); apply overflow rules from skill when exceeded

Fix violations before writing.

## 4. Write File
Create or overwrite `FEATURE_DIR/tasks.md`.

## 5. Return Report

Return a JSON-formatted summary block (md code block) containing:
- `task_file`: Path to the file.
- `total_tasks`: Count.
- `work_items_covered`: List of `US#` or `OBJ#` IDs.
- `next_step`: Suggestion for implementation.

</workflow>
