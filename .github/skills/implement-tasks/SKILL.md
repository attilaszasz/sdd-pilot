---
name: implement-tasks
description: "Executes the implementation plan by processing and completing all tasks defined in tasks.md phase-by-phase. Use when running /sddp-implement or when code implementation from a task list is needed."
---

# Software Engineer — Implement Tasks Workflow

<rules>
- Report progress at major milestones
- **tasks.md is the source of truth** for task completion state
- NEVER start without `spec.md`, `plan.md`, AND `tasks.md`
- Auto-resolve missing gate artifacts before halting (see `references/gates.md`)
- Checklist gate failures → auto-evaluate (prompt user only on second failure)
- **Artifact conventions** (`.github/skills/artifact-conventions/SKILL.md`): Only valid transition: `- [ ]` → `- [X]`. Never reverse, delete checkbox lines, change task IDs (T###), requirement IDs (`FR-###`, `TR-###`, `OR-###`, `RR-###`), success criteria IDs (SC-###), or remove Dependencies/phase headers from tasks.md.
- **Execute ALL phases in ONE CONTINUOUS TURN** — shared phases → delivery work items → Polish
- **NEVER yield control between phases**
- **Prompt user only when**: (1) Gate resolution failure, (2) Checklist override (second failure), (3) Sequential task failure needing manual fix, (4) Final summary with skipped/failed/review issues
- Resume from checkpoint: skip `[X]` tasks, process only `[ ]` tasks
- Mark task complete: `- [ ]` → `- [X]` only after code changes made and validation succeeded. Never infer/simulate completion.
- Never create `.completed` for estimated/simulated/hypothetical success
- If work cannot complete for real → report blocked/failed
- Auto-recover errors before requesting user help
- Only halt for: (1) Gate auto-resolution failed, (2) Sequential task failed after retry + (`AUTOPILOT = true` or user chooses Halt), (3) All tasks already complete
- Research before implementing — **Delegate: Technical Researcher**; reuse `FEATURE_DIR/research.md` when sufficient
- **NEVER provide time/effort estimates** — report only task counts and statuses
- **Mandatory phase review** — structural verification of completed tasks (compilation, file existence, no stubs). Requirement-level verification deferred to `/sddp-qc`.
- **Context budget**: After each phase completes, release full file contents read for that phase's tasks. Keep only key findings summary. Re-read only plan.md/spec.md sections relevant to next phase's work items. Mandatory per-phase checkpoint.
- **State persistence**: After each phase, write/update `FEATURE_DIR/.implement-state` (see Step 5). On resume, read state file first to skip to correct phase.
</rules>

<workflow>

## 1. Gate Check & Resume Detection

Resolve `FEATURE_DIR` from git branch (`specs/<branch>/`) or user context.

**Delegate: Context Gatherer** in **quick mode** (`.github/agents/_context-gatherer.md`). Check `HAS_SPEC`, `HAS_PLAN`, `HAS_TASKS`.

**Run mode:**
- **Resume**: All three `true` AND ≥1 task marked `[X]` → report "Resuming — skipping gate checks" → Step 2
- **Fresh**: Otherwise → execute `references/gates.md` → Step 2

## 2. Load Implementation Context

Read from `FEATURE_DIR`:
- **Load now**: plan.md, spec.md, research.md (if exists)
- **Lazy-load**: data-model.md, contracts/ — defer until task references them

**Delegate: Task Tracker** (`.github/agents/_task-tracker.md`) with `FEATURE_DIR` → store result as `TASK_LIST`.

**Parse state:**
1. Filter `TASK_LIST`: `completed_tasks` (`[X]`), `deferred_tasks` (`[ ]` + `deferred=true`), `incomplete_tasks` (`[ ]` + not deferred)
2. `REMAINING_TASKS` = `incomplete_tasks`
3. Calculate `total_tasks`, `completed_count`, `deferred_count`, `remaining_count`
4. Report: "Loaded [total_tasks] tasks: [completed_count] complete, [remaining_count] active remaining, [deferred_count] deferred"
5. If `remaining_count == 0` and `deferred_count == 0` → "✓ All tasks already complete" → skip to Step 6
6. If `remaining_count == 0` and `deferred_count > 0` → "✓ All non-deferred tasks already complete ([deferred_count] deferred)" → skip to Step 6
7. If partially complete → "Resuming from checkpoint — [completed_count] done, processing [remaining_count] active remaining"

Extract tech stack, architecture, file structure from `plan.md`.

## 2.5. Dependency Verification

Scan `plan.md` for declared dependencies. Per package manager detected:
- `package.json` → verify `node_modules/` populated → `npm install` if missing
- `requirements.txt` / `pyproject.toml` → `pip install -r requirements.txt` if deps missing
- `Cargo.toml` → `cargo fetch` if needed
- `go.mod` → `go mod download` if needed
- `.csproj` / `.sln` → `dotnet restore` if needed

Skip if plan.md declares no dependencies or project has no package manifest.

## 3. Research Tech Stack

- If `FEATURE_DIR/research.md` exists → read and extract guidance; skip fresh research when coverage is sufficient; refresh only for unfamiliar/critical/uncovered libraries
- Report: "🔍 Researching library documentation for upcoming tasks..."

**Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
- **Topics**: Official docs/API refs for unfamiliar, critical, or uncovered technologies needed by active tasks
- **Context**: Tech stack and architecture from `plan.md`
- **Purpose**: "Write idiomatic, best-practice code following library conventions"
- **File Paths**: `FEATURE_DIR/plan.md`, `FEATURE_DIR/research.md` (if available)

No high-risk gaps detected → skip delegation.

## 4. Project Setup

> Executed via `references/gates.md` on fresh runs (Step 1). Skipped on resume.

## 5. Execute Tasks

**SINGLE CONTINUOUS LOOP — ALL phases without stopping.**

Process `REMAINING_TASKS` phase-by-phase:
1. **Setup** (title contains "Setup")
2. **Foundational** (title contains "Foundational")
3. **Delivery work items** in priority order (US1/US2... or OBJ1/OBJ2...)
4. **Polish** (title contains "Polish")

> Identify phases by keyword, not fixed number.

**Halt only for:** gate failure, sequential task failed after retry + user chooses Halt, critical system error.

**Per phase:**
1. **Sync state** — re-invoke **Task Tracker** to refresh counts from disk (once per phase)
2. Report: "Starting Phase [N]: [Phase Name] ([task_count] active tasks)"
3. Process each incomplete task
4. Run **Phase Review** on completed tasks
5. Continue to next phase (never stop/ask)

**Per incomplete task:**
- Skip if `[X]`
- Skip if `deferred=true`
- Use structured data: `id`, `description`, `parallel`, `story`, `objective`, `workItem`, `phase`
- Extract file path from description
- Report: "Implementing T### [Phase Name]: [brief description]"

**Delegate: Developer** (`.github/agents/_developer.md`):
  - `TaskID`, `Description`, `Context` (from Plan/Research), `FilePath`, `PlanPath`: `FEATURE_DIR/plan.md`, `DataModelPath`: `FEATURE_DIR/data-model.md` (if exists), `ContractsPath`: `FEATURE_DIR/contracts/` (if exists)
   - Loop context (when provided by autopilot or the implement-QC loop): `LoopIteration`, `PriorAttempts`, `BugContext`

**On SUCCESS:**
1. Mark `- [ ]` → `- [X]` in tasks.md
2. Update counts: `completed_count += 1`, `remaining_count -= 1`
3. Report: "✓ T### complete ([completed_count]/[total_tasks])"

**On FAILURE — Error Recovery:**
1. Report: "⚠ T### failed. Analyzing error..."
2. Parse error details (type, message, file, line, suggested fix)
3. Auto-fix by error type:
   - Missing dependencies → run package manager install
   - Import errors → add correct imports
   - Type errors → fix annotations
   - Test failures → analyze output, fix implementation
   - Lint errors → run linter `--fix`
   - Unknown → skip auto-fix
4. If auto-fix attempted → "Retrying T### after auto-fix..." → re-delegate to Developer
5. **Second failure:**
   - **Sequential tasks:**
     1. Report: "✗ T### blocked. Manual intervention required."
     2. **Autopilot guard (I1)**: `AUTOPILOT = true` → default "Halt implementation", log to `FEATURE_DIR/autopilot-log.md`
     3. `AUTOPILOT = false` → prompt: "Skip task and continue" / "Debug manually and retry" / "Halt implementation"
   - **Parallel tasks `[P]`:** mark skipped (not `[X]`), log failure, continue
6. Track all failures for final summary

**Phase Review (after all phase tasks processed):**

Structural verification only — requirement-level verification deferred to `/sddp-qc` Story Verifier.

1. Verify: files created/modified exist and are non-empty
2. Verify: no TODO/FIXME stubs in implemented code (grep)
3. Verify: compilation/type-check passes
4. Verify: exports and public API surface match `plan.md` structure
5. Report: "✓ Phase [N] structural review — [pass_count]/[total_in_phase] passed"
6. Failures → report file + issue, continue (never halt)

**State checkpoint**: Write/update `FEATURE_DIR/.implement-state`:
```
phase: [current phase name]
completed: [completed_count]
remaining: [remaining_count]
blocked: [task IDs or "none"]
timestamp: [ISO 8601]
```

Report: "✓ Phase [N] complete — [completed_in_phase] tasks done, [completed_count]/[total_tasks] overall ([remaining_count] remaining)"

**Parallel batch execution** (`[P]` tasks):
1. Group consecutive `[P]` tasks in same phase into a batch
2. Execute all file edits in the batch without intermediate validation
3. Run validation once per batch (compile + lint + test)
4. Mark all passing tasks `[X]`; retry failing tasks individually

**Execution rules:**
- Sequential tasks: complete in order, retry once
- Parallel `[P]`: batch execution as above, individual failures non-blocking
- Never stop between phases
- Progress counts reflect remaining tasks

## 6. Validate Implementation

Final validation after all phases complete (or halt):

1. Verify implementation matches spec requirements
2. Run tests (if defined in plan.md)
3. Report final summary:
   - Total: [total] / Completed: [completed] ✓ / Skipped: [skipped] (task IDs) / Failed: [failed] (task IDs + errors)
4. If skipped/failed → guidance on next steps; `AUTOPILOT = true` → report blocked, do NOT suggest QC
5. **Completion marker**: If ALL non-deferred tasks completed (0 skipped, 0 failed, `[DEFERRED]` excluded):
   - If `.completed` exists → warn "⚠ `.completed` already exists. Overwriting."
   - Create `FEATURE_DIR/.completed`: `Completed: <ISO 8601 timestamp>` — only after all tasks and reviews actually passed

**Yield control to user** — only natural end point.

- `.completed` created → inform user, suggest `/sddp-qc` with feature name, directory path, and areas needing attention
- `.completed` not created → report blockers; `AUTOPILOT = true` → treat as HALT

</workflow>
