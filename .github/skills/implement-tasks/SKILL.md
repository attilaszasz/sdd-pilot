---
name: implement-tasks
description: "Executes the implementation plan by processing and completing all tasks defined in tasks.md phase-by-phase. Use when running /sddp-implement or when code implementation from a task list is needed."
---

# Software Engineer — Implement Tasks Workflow

<rules>
- Report compact progress at major milestones: outcome, key delta, next step
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
- **Mandatory phase review** — structural verification of completed tasks (compilation, file existence, no stubs) plus a Requirement Coverage Diff against the Plan-phase traceability matrix. Behavioural/scenario verification remains deferred to `/sddp-qc`.
- **Micro-QC on work-item phases** — after the Phase Review on each `[US#]`/`[OBJ#]` phase, run a differential QC pass (filtered tests, lint changed files, security anti-pattern grep, export/contract conformance) scoped to that phase's changed files. Failures route into the per-task error-recovery loop (fix-now); the run never halts on a micro-QC failure. Complements, does not replace, full `/sddp-qc`.
- **Context budget**: After each phase completes, release full file contents read for that phase's tasks. Keep only key findings summary. Re-read only plan.md/spec.md sections relevant to next phase's work items. Mandatory per-phase checkpoint. **Exception**: retain a compact interface summary (symbol → file → signature) for all `→ exports:` annotated tasks from completed phases. This summary travels forward and is provided to the Developer agent as `PriorExports` context for subsequent phases.
- **Developer slices**: Every Developer dispatch uses the versioned `DeveloperSlice` v1 contract in Step 4.5. Construct it deterministically from the current task record, scoped artifact sections/paths, `Imports`, `Exports`, `PriorExports`, `ExpectedEvidence`, `AcceptanceStubs`, `Verify`, and loop/retry fields. Never put full plan/spec context into a repeat slice.
- **Safe Developer dispatch**: First and reset/full-bootstrap dispatches send the compact core in `.github/agents/_developer.md`; a same-live-context repeat sends only a fresh serialized slice because the core and procedure remain cached in that trusted live context. A changed task rebuilds only the slice; changed procedure/plan/spec/scoped artifacts use full bootstrap. Without identity, use the portable fallback. Never infer prompt state from durable `preamble_sent` or `.implement-state` alone.
- **State persistence**: Before every Developer delegation, checkpoint the serialized slice and its fingerprints in `FEATURE_DIR/.implement-state`; update it after each phase as well (see Step 5). On resume, read state first, but keep `tasks.md` as completion source of truth. Reuse a prior live procedure only when `contextId`, procedure, and scoped artifact fingerprints are valid; rebuild the slice for any changed task and use reset/full bootstrap after self-healing `COVERAGE_MATRIX` amendments.
- **Ephemeral implementation state**: `.implement-state` is a local, rebuildable checkpoint containing prompt context and run identity. It is intentionally gitignored, may be deleted safely, and never changes task completion state. A missing or invalid file causes deterministic reconstruction, not cached-agent-memory inference.
- **Self-healing artifact updates**: When the Developer reports a `Divergence` (Section 3.6 of `_developer.md`), amend the affected plan/data-model/contracts artifact immediately after the divergent task succeeds and before processing the next task, per the **Self-Healing Artifact Amendment** procedure. Re-parse `COVERAGE_MATRIX` from the amended `plan.md` so the next task's `ExpectedEvidence` and the Phase Review coverage diff use fresh values. Preserve all cross-referenced IDs (Req IDs, task IDs, `AD-###` IDs, `ADR-NNNN`); only cell values and new feature-local `AD-###` rows may change. Log every amendment to `FEATURE_DIR/divergence-log.md`. The Implement run never halts on a divergence — it is a SUCCESS signal, not a failure.
- Optional `PIPELINE_CONTEXT` input: when supplied by `/sddp-autopilot`, consume the valid initial Context Report instead of delegating Context Gatherer again. Re-read all implementation gate artifacts from disk.
- **Acceptance test stubs (P1)**: When `plan.md` has a populated `## Acceptance Test Stubs` section, parse it into `STUB_MAP` (reqID → `{testFile, stubBlocks, redStatus}`). For stub-creation tasks (`imports[].sourceTask == "plan"`) and for implementation tasks whose reqID is in `STUB_MAP`, pass the normalized `AcceptanceStubs` array to the Developer. Stub-creation tasks create the RED stub; implementation tasks make the linked stub GREEN before SUCCESS. This gives every P1 requirement a per-requirement pass/fail signal during Implement instead of relying on lint/compilation alone.
- **VERIFY assertions**: The Task Tracker parses `[VERIFY: <command>]` annotations into `task.verify` (a string array). Pass `Verify` to the Developer for any task with a non-empty `verify` array. The Developer runs each assertion from the repo root before reporting SUCCESS (Developer Section 3.7); the first non-zero exit / no-match is `errorType: verify-failure`. Route `verify-failure` into the existing **On FAILURE — Error Recovery** loop (auto-fix = analyze the failing command's output, fix the implementation, retry once). A task with VERIFY assertions may not be marked `[X]` until every assertion passes.
- **Export contract verification**: The Developer runs Section 3.8 after Section 3.7 for every task with a non-empty `exports` array — existence (grep the declared `Symbol` in `FilePath`, requiring an `export` keyword for JS/TS), importability (stack-aware one-liner with build/typecheck fallback for compiled languages), and signature match (param count for untyped stacks; param count + return type for typed stacks where statically determinable). The first failure is `errorType: export-contract`. Route `export-contract` into the existing **On FAILURE — Error Recovery** loop with the **consumer→producer trace-back** rule below. A task with `→ exports:` annotations may not be marked `[X]` until every declared export contract passes Section 3.8. Phase Review step 5 and Micro-QC export conformance remain as safety nets; Section 3.8 is the early-warning per-task layer.
</rules>

<workflow>

## 0. Acquire Skills

## 1. Gate Check & Resume Detection

If `PIPELINE_CONTEXT` is supplied, reports `CONTEXT_BLOCKED` as `false`, has a non-empty `FEATURE_DIR`, and its `BRANCH` still matches the current branch when Git is available, consume its stable `FEATURE_DIR` and `AUTOPILOT` fields without delegating Context Gatherer. Re-read `spec.md`, `plan.md`, and `tasks.md` now and derive `HAS_SPEC`, `HAS_PLAN`, and `HAS_TASKS` from their current contents.

If `PIPELINE_CONTEXT` is absent or invalid, resolve `FEATURE_DIR` from git branch (`specs/<branch>/`) or user context and **Delegate: Context Gatherer** in **quick mode** (`.github/agents/_context-gatherer.md`). Check `HAS_SPEC`, `HAS_PLAN`, and `HAS_TASKS`.

**Run mode:**
- **Resume**: All three `true` AND ≥1 task marked `[X]` → report "Resuming — skipping gate checks" → Step 2
- **Fresh**: Otherwise → execute `references/gates.md` → Step 2

## 2. Load Implementation Context

Read from `FEATURE_DIR`:
- **Load now**: plan.md, spec.md, research.md (if exists)
- **Lazy-load**: data-model.md, contracts/ — defer until task references them

**Parse the Requirement Coverage Map** from `plan.md` into `COVERAGE_MATRIX`: a list of `{reqID, components, filePaths, functions}` rows (one per `FR-###`/`TR-###`/`OR-###`/`RR-###`). The `Function(s)/Symbol(s)` column is the traceability matrix the Developer uses for per-task self-verification and the Phase Review uses for the requirement-coverage diff. Rows with empty `filePaths` or `functions` are recorded as `MATRIX_GAPS` and surfaced at Phase Review.

**Parse `## Acceptance Test Stubs`** from `plan.md` (when present and not `N/A — no P1 requirements`) into `STUB_MAP`: a map of `reqID → {testFile, stubBlocks, redStatus}` (one entry per P1 reqID row). Used to feed the Developer's normalized `AcceptanceStubs` array for stub-creation tasks and for implementation tasks whose reqID has a stub. Missing or `N/A` section → empty `STUB_MAP` and `AcceptanceStubs: []`.

**Delegate: Task Tracker** (`.github/agents/_task-tracker.md`) with `FEATURE_DIR` → store result as `TASK_LIST`.

**Parse state:**
1. Filter `TASK_LIST`: `completed_tasks` (`[X]`), `deferred_tasks` (`[ ]` + `deferred=true`), `incomplete_tasks` (`[ ]` + not deferred)
2. `REMAINING_TASKS` = `incomplete_tasks`
3. Calculate `total_tasks`, `completed_count`, `deferred_count`, `remaining_count`
4. Report: "Loaded [total_tasks] tasks: [completed_count] complete, [remaining_count] active remaining, [deferred_count] deferred"
5. If `remaining_count == 0` and `deferred_count == 0` → "✓ All tasks already complete" → skip to Step 6
6. If `remaining_count == 0` and `deferred_count > 0` → "✓ All non-deferred tasks already complete ([deferred_count] deferred)" → skip to Step 6
7. If partially complete → "Resuming from checkpoint — [completed_count] done, processing [remaining_count] active remaining"
8. **Resume dependency check**: For each task in `REMAINING_TASKS` with `dependencies` (`after:T###`) annotations, verify all referenced tasks are `[X]`. If a referenced task is `[ ]`, re-queue the dependency ahead of the dependent task and report the re-ordered tasks.

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

## 4.5. Developer Slice Construction and Dispatch

The parent implementation agent constructs a fresh, canonical `DeveloperSlice` v1 for each Developer delegation. The slice is data, not a replacement for the canonical core or a durable memory signal.

### DeveloperSlice v1 schema

The serialized object has `schema: developer-slice/v1` and `version: 1`:

```yaml
schema: developer-slice/v1
version: 1
DispatchMode: first | repeat | reset | retry
ContinuationID: <trusted live-context ID or null>
TaskID: T###
Description: <task description>
Phase: <phase name>
FilePath: <primary target file or null>
Context: <scoped Plan/Research summary>
ScopedContext:
  Summary: <task-scoped Plan/Research summary>
  SourceSections: [<relevant artifact sections only>]
ArtifactPaths:
  FeatureDir: <feature directory>
  SpecPath: <spec.md or null>
  PlanPath: <plan.md or null>
  ResearchPath: <research.md or null>
  DataModelPath: <data-model.md or null>
  ContractsPath: <contracts/ or null>
Imports: [<sourceTask, filePath, symbols entries>]
Exports: [<Symbol(params) entries>]
PriorExports: [<TaskID, Symbol, FilePath, Signature entries>]
ExpectedEvidence: [<reqID, components, filePaths, functions rows>]
AcceptanceStubs: []
Verify: [<commands in source order>]
LoopIteration: 0
PriorAttempts: <prior error/fix attempts or null>
BugContext: <qc-report Bug Context or null>
RetryOf: <prior dispatch ID or null>
RetryReason: <failure, Micro-QC, or resume reason or null>
```

### Canonical serialization and fingerprints

- Canonical JSON is UTF-8, has no insignificant whitespace or trailing newline, sorts object keys recursively by UTF-16 code unit, and preserves semantic array order.
- `PriorExports` is always an array of objects with exactly `{TaskID, Symbol, FilePath, Signature}`. Sort entries by `TaskID`, then `Symbol`, then `FilePath`; use `[]` when there are no completed exports. The same canonical array is stored in the slice and in state `priorExports`.
- `serializedSlice` is the canonical JSON string for the complete `DeveloperSlice`, including `AcceptanceStubs: []` when no stubs match. `sliceFingerprint` is `sha256` of its UTF-8 bytes.
- `sourceFingerprints` is a canonical JSON object with `procedure`, `artifacts`, `taskList`, `taskRecord`, and `coverageMatrix` entries. Each file digest is `sha256` of its exact UTF-8 bytes; `artifacts` is a path-keyed object with sorted keys. The procedure digest covers the compact core, detailed validation reference, and implementation standards used by the live Developer context.
- The state document itself is canonical JSON. `ContinuationID` is copied verbatim to state `contextId`; absent identity is serialized as `null`, never generated from `runId` or timestamps.

Construction is deterministic:

1. Read the current task record from `TASK_LIST` and `tasks.md`; copy `TaskID`, description, phase, target `FilePath`, annotations, and dependency metadata without inventing values.
2. Scope `Context` and `ScopedContext.Summary` to the task's Plan/Research sections. Put authoritative paths in `ArtifactPaths`; do not inline full artifact contents.
3. Copy `Imports` and `Exports` from Task Tracker in source order. Resolve producer paths when available. Build `PriorExports` in the canonical sorted shape from completed phases, refreshing it from completed tasks on resume when needed.
4. Parse the current `COVERAGE_MATRIX` into `ExpectedEvidence` and `STUB_MAP` into `AcceptanceStubs` immediately before construction. Always serialize `AcceptanceStubs: []` when no reqID matches. For each matching reqID, the Developer preserves RED stub creation, GREEN implementation, and the Step 3.5 happy-path skip.
5. Copy `Verify` in annotation order. Set `LoopIteration`, `PriorAttempts`, `BugContext`, `RetryOf`, and `RetryReason` from the current loop event; never carry a previous failure implicitly.
6. Serialize with the canonical JSON rules above, normalized `null`/`[]` values, and no timestamps in the slice. Compute `sliceFingerprint`; timestamps belong only to `.implement-state`.

### Dispatch rules

- **First invocation**: when the task has no valid checkpoint, construct the full slice, checkpoint it, and dispatch the core plus the detailed validation reference and scoped task context.
- **Same live context repeat**: only when the parent explicitly supplies the same trustworthy `ContinuationID` as state `contextId`, the live `procedure` fingerprint matches, and every scoped `artifacts` fingerprint matches. Do **not** require the current `activeTask`, task ID, task-record fingerprint, or expected slice fingerprint to match the previous dispatch. For T001 → T002, construct and checkpoint a fresh T002 slice, update `activeTask`/`taskRecord`, and send that serialized slice only; the cached core/procedure are not resent. A changed task list or task record rebuilds the slice without reloading the procedure.
- **Context reset**: when the continuation ID is absent, changed, untrusted, unsupported by the wrapper, the procedure fingerprint changes, or any plan/spec/scoped artifact fingerprint is stale/missing. Rebuild the slice from disk, checkpoint it, and dispatch the core plus detailed validation reference and scoped context. A changed task is not a reset when the trusted live procedure and scoped artifacts remain valid.
- **Retry**: treat every retry as a new dispatch event. Reconstruct the same v1 shape from current disk state, increment `LoopIteration`, set `RetryOf`/`RetryReason`, refresh `PriorAttempts` and `BugContext`, and re-read evidence, stubs, VERIFY commands, Imports, Exports, and PriorExports. Same-live-context retry uses the serialized slice only; otherwise it uses the reset/full-bootstrap form. Retry parity means no validation field is dropped merely because the event is a retry.
- **Producer trace-back**: for a consumer `import` or `export-contract` failure, construct and checkpoint a producer slice for each resolvable `Imports[].sourceTask` before retrying the consumer. Run the producer's Section 3.8 contract first; fix and confirm the producer before building the consumer retry. If the producer passes or is not resolvable, build the normal consumer retry slice.
- **Micro-QC**: after each delivery phase review, scope the changed files and construct the same v1 slice for any fix/retry. Set `RetryReason` to `Micro-QC`, refresh `ExpectedEvidence`/`AcceptanceStubs`/`Verify`, and checkpoint before delegation. Micro-QC does not receive a separate undocumented prompt contract.
- **Parallel retries**: each `[P]` task receives an independent slice and fingerprint set; never share mutable serialized slices or infer one task's continuation from another. Checkpoint each retry before its delegation in deterministic task-ID order. A producer/consumer dependency is serialized and follows producer trace-back before the consumer retry.
- **Resume**: read `.implement-state` before deciding what to dispatch, then read `tasks.md` and skip only `[X]` tasks. If trusted `contextId`, procedure, and scoped artifact fingerprints remain valid, a changed active task or task record rebuilds only the slice; otherwise use reset/full bootstrap. Task completion is never read from `.implement-state`.
- **Implement+QC iteration**: increment the loop/phase counters for each iteration, retain only current `PriorAttempts` and confirmed `PriorExports`, and rebuild when QC changes code or any plan-derived artifact. A new context ID is a reset even when the run ID is unchanged.

### Source fingerprints and invalidation

For each checkpoint, hash the exact UTF-8 bytes of the compact core, detailed validation reference, implementation standards, each referenced plan/spec/research/data-model/contracts artifact, `tasks.md`, the normalized current task record, and the current `COVERAGE_MATRIX` rows. Store them in the canonical `sourceFingerprints` shape. `procedure` plus `artifacts` determine whether the live Developer procedure is still valid. `taskList`/`taskRecord` plus derived `ExpectedEvidence`, `AcceptanceStubs`, `Verify`, `Imports`, and `Exports` determine the fresh slice and its `sliceFingerprint` only; normal `[X]` updates and T001 → T002 task changes must not reset a trusted live procedure.

After a self-healing `Divergence` amendment, especially an amended `COVERAGE_MATRIX` row, update the plan/artifact fingerprints, invalidate `serializedSlice`, and use reset/full bootstrap before the next Developer delegation. Never reuse stale `ExpectedEvidence`, `AcceptanceStubs`, or `Context` from before the amendment.

### `.implement-state` checkpoint schema

`FEATURE_DIR/.implement-state` is one local JSON checkpoint. It is written successfully before every Developer delegation and after each phase. The existing phase/counter keys remain readable while the new fields make prompt resume explicit:

```json
{
  "activeTask": "T###",
  "blocked": "none",
  "completed": 0,
  "contextId": "trusted-live-context-id-or-null",
  "featureDir": "specs/00001-feature/",
  "microqc": "SKIPPED",
  "phase": "<current phase name>",
  "phaseCounters": {
    "blocked": 0,
    "completed": 0,
    "iteration": 0,
    "microqc": 0,
    "phaseIndex": 0,
    "remaining": 0,
    "retry": 0
  },
  "priorExports": [],
  "remaining": 0,
  "runId": "opaque-implement-run-id",
  "schema": "implement-state/v1",
  "serializedSlice": "<canonical DeveloperSlice/v1 JSON>",
  "sliceFingerprint": "sha256:<digest>",
  "sourceFingerprints": {
    "artifacts": {
      "plan.md": "sha256:<digest>",
      "research.md": "sha256:<digest>",
      "spec.md": "sha256:<digest>"
    },
    "coverageMatrix": "sha256:<digest>",
    "procedure": "sha256:<digest>",
    "taskList": "sha256:<digest>",
    "taskRecord": "sha256:<digest>"
  },
  "timestamp": "<ISO 8601>",
  "timestamps": {
    "checkpointedAt": "<ISO 8601>",
    "createdAt": "<ISO 8601>",
    "delegatedAt": "<ISO 8601 or null>",
    "updatedAt": "<ISO 8601>"
  },
  "version": 1
}
```

`contextId` is the verbatim state copy of `DeveloperSlice.ContinuationID` and is trusted for repeat dispatch only when the current parent invocation supplies the same live continuation identity. `activeTask` and `taskRecord` identify the serialized slice, not the live procedure; T001 → T002 replaces them without a reset when `procedure` and scoped `artifacts` remain valid. `runId`, timestamps, a non-empty `serializedSlice`, and state-file presence never substitute for identity. The file is ephemeral and gitignored; deletion, corruption, or an interrupted write causes a full deterministic rebuild. A failed checkpoint blocks slice-only delegation and leaves `tasks.md` unchanged.

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
1. **Sync state** — re-invoke **Task Tracker** to refresh counts from disk (once per phase). Capture `PHASE_START_FILES` = `git diff --name-only HEAD` (empty if not a git repo) for Micro-QC scoping.
2. Report: "Starting Phase [N]: [Phase Name] ([task_count] active tasks)"
3. Process each incomplete task
4. Run **Phase Review** on completed tasks
5. Run **Micro-QC** (delivery work-item phases only — see below)
6. Continue to next phase (never stop/ask)

**Per incomplete task:**
- Skip if `[X]`
- Skip if `deferred=true`
- If task has `after:T###` dependencies: verify all referenced tasks are `[X]`. If not, skip and re-queue after the dependency completes.
- Use structured data: `id`, `description`, `parallel`, `story`, `objective`, `workItem`, `phase`, `filePath`, `dependencies`, `imports`, `exports`, `completesRequirement`
- Use `filePath` from Task Tracker when available; otherwise extract file path from description
- Report: "Implementing T### [Phase Name]: [brief description]"
- Before every delegation, apply Step 4.5: construct the current `DeveloperSlice` v1, validate procedure/artifact identity separately from the per-task `sliceFingerprint`, and write `.implement-state` successfully. Do not dispatch a slice-only repeat when the checkpoint or trusted live context is unavailable.

**Delegate: Developer** (`.github/agents/_developer.md`):
   - Pass one `DeveloperSlice` containing `TaskID`, `Description`, `Context`, `FilePath`, scoped `ArtifactPaths` (`PlanPath`, `DataModelPath`, `ContractsPath`, and available feature paths), and all fields defined in Step 4.5.
   - `Imports`: parsed `imports` array from Task Tracker (if present) — Developer should read source files to verify actual interfaces
   - `Exports`: parsed `exports` array from Task Tracker (if present) — Developer ensures these symbols are exported with compatible signatures and runs the Section 3.8 export-contract verification (existence, importability, signature match) before reporting SUCCESS
   - `PriorExports`: compact interface summary from completed phases (if any) — maps symbol → file → signature for cross-phase dependencies
   - `ExpectedEvidence`: the `COVERAGE_MATRIX` row(s) matching this task's `{(FR|TR|OR|RR)-###}` tags (each `{reqID, components, filePaths, functions}`). The Developer greps for the expected file(s) and function(s)/symbol(s) after implementing, then runs the happy-path test coverage sub-check (grep conventional test locations — co-located `*.test.*`/`*_test.*` plus `tests/`/`__tests__/` — for the reqID tag or any expected function symbol; skipped when an `AcceptanceStub` exists for the reqID) and reports a `requirement-gap` FAILURE on any miss. Omit when the task has no requirement tag or no matching matrix row.
   - `AcceptanceStubs`: always pass an array. When `STUB_MAP` has entries for this task's reqIDs, pass matching `{reqID, testFile, stubBlocks, redStatus}` entries. For stub-creation tasks (`imports[].sourceTask == "plan"`), the Developer creates the RED stub and confirms RED. For implementation tasks, the Developer runs the linked test file and confirms matching stub blocks are GREEN before SUCCESS. An empty array means no stub-specific Step 3 check; Step 3.5 still skips happy-path grep only for reqIDs with a matching entry.
   - `Verify`: when the Task Tracker parsed a non-empty `verify` array for this task, pass it (array of command strings). The Developer runs each assertion from the repo root before SUCCESS (Developer Section 3.7); the first failure is `errorType: verify-failure`. Omit when `verify` is empty or absent.
   - Loop context (when provided by autopilot or the implement-QC loop): `LoopIteration`, `PriorAttempts`, `BugContext`, `RetryOf`, `RetryReason`

**On SUCCESS:**
1. **Confidence routing** — parse the Developer's `Confidence` field and branch:
   - **CONFIDENT** → mark `[X]` with no extra verification (current behavior); continue to step 2.
   - **TENTATIVE** → mark `[X]`, run extra verification (re-run the task's test file; verify each `→ exports:` symbol against `FEATURE_DIR/contracts/` when present and grep the declared `filePath` for each exported symbol declaration), add the task ID + one-line evidence to `TENTATIVE_TASKS`, and do NOT re-delegate to the Developer. If the extra verification fails (test re-run fails or an export/contract conformance grep misses) → downgrade to FAILURE: remove the `[X]`, route into **On FAILURE — Error Recovery** with `errorType: verify-failure` and the failed check as the error, and continue. Otherwise continue to step 2.
   - **UNCERTAIN** → do NOT mark `[X]`; route into **On FAILURE — Error Recovery** with the Developer's one-line uncertainty evidence appended to `PriorAttempts` for the retry (so the retry gets richer context). The second UNCERTAIN follows the existing second-failure path (Autopilot→halt per guard I1, interactive→prompt).
2. If task has `[COMPLETES (FR|TR|OR|RR)-###]`: verify all other tasks tagged with that requirement are `[X]`. If any are not, report: "⚠ [REQ-ID] incomplete — dependent requirement tasks still pending." Skip completion handling for this task and continue.
3. Mark `- [ ]` → `- [X]` in tasks.md
4. Update counts: `completed_count += 1`, `remaining_count -= 1`
5. **Self-Healing Artifact Amendment** (only when the Developer reported one or more `Divergence` blocks for this task): apply the per-category procedure below, then re-parse `COVERAGE_MATRIX` from the amended `plan.md` so the next task's `ExpectedEvidence` and the Phase Review Requirement Coverage Diff use fresh values. Never halt on a divergence; an unrecoverable amendment problem (e.g., a referenced artifact is missing) is logged and reported but does not block the run.
   - `file-path` → in `plan.md` `## Requirement Coverage Map`, update the `File Path(s)` cell of the row whose `Req ID` matches the divergence `ReqID` from `Original` to `Actual`. When the divergence `ReqID` is `—`, update the matching `## Project Structure` Source Code entry instead. Do not change the `Req ID` column.
   - `symbol` → update the `Function(s)/Symbol(s)` cell of the matching Requirement Coverage Map row AND the corresponding entity/symbol name in `data-model.md` (when the entity exists). Both columns must stay populated.
   - `api-shape` → update the affected schema in `FEATURE_DIR/contracts/` (request/response types, status codes, paths) to match `Actual`. Also update the `## API Surface Summary` row in `plan.md` when the route/verb/types changed.
   - `architecture` → split by scope:
     - Feature-local divergence (affects only this feature's boundaries): append a new `AD-###` row to `plan.md` `## Architecture Decisions` with the divergence as the decision, `Actual` as the chosen option, and a one-line rationale. Do not reuse or renumber existing `AD-###` IDs.
     - Project-wide divergence (changes a cross-cutting boundary, integration, or quality attribute shared outside this feature): **Delegate: ADR Author** (`.github/agents/_adr-author.md`) with `Operation: create`, `DecisionScope: project-level`, and the divergence payload. After it returns, update the `specs/sad.md` ADR catalog table with the returned `SadCatalogRow` and reference the returned `ADR-NNNN` from `plan.md` instead of recording an `AD-###` row.
   - After all amendments for the task: append one row per divergence to `FEATURE_DIR/divergence-log.md` (create the file if absent) in this format:
     ```
     | Timestamp | TaskID | ReqID | Category | Original | Actual | AffectedArtifact | Rationale |
     | [ISO 8601] | T### | (FR\|TR\|OR\|RR)-### or — | [category] | [original] | [actual] | [artifact:section] | [rationale] |
     ```
   - `AUTOPILOT = true`: log each amendment as a `decision` row to `FEATURE_DIR/autopilot-log.md`: Timestamp=now, Phase=`Implement`, Event=`decision`, Detail="Self-healing amendment: [category] on [AffectedArtifact]", Outcome="Amended", Rationale="[Developer divergence rationale]", Artifacts=`[plan.md](plan.md),[divergence-log.md](divergence-log.md)`.
   - Report: "↺ T### diverged ([N] amendment[s]): [category:affectedArtifact; ...]"
6. Report: "✓ T### complete ([completed_count]/[total_tasks])"

**On FAILURE — Error Recovery:**
1. Report: "⚠ T### failed. Analyzing error..."
2. Parse error details (type, message, file, line, suggested fix)
3. Auto-fix by error type:
   - Missing dependencies → run package manager install
   - Import errors → add correct imports
   - Type errors → fix annotations
   - Test failures → analyze output, fix implementation
   - Lint errors → run linter `--fix`
   - `verify-failure` → analyze the failing VERIFY command's output (missing symbol, wrong path, failing test), fix the implementation so the assertion passes
   - `export-contract` → analyze the failing Section 3.8 sub-check (missing declaration, not importable, signature mismatch), fix the implementation so the declared `Symbol(params)` exports, imports, and matches
   - Unknown → skip auto-fix
4. **Consumer→producer trace-back** (applies when `errorType` is `import` or `export-contract`): before retrying the failing consumer task, inspect its `imports[]` for a `sourceTask` referencing a producer task. When a producer is referenced:
   1. Re-run the producer task's Section 3.8 export-contract check for the imported symbol (existence + importability + signature match against the consumer's expected usage).
   2. If the producer's export contract FAILS → fix the producer first (re-delegate the producer to the Developer with the failing sub-check as `PriorAttempts` context), mark the producer `[X]` only after its Section 3.8 passes, THEN retry the consumer. Do NOT retry the consumer in isolation when its producer is broken — that produces a second cryptic failure and wastes a retry.
   3. If the producer's export contract PASSES → the contract is intact; the bug is genuinely in the consumer (wrong import path, wrong symbol name, wrong usage). Proceed with the normal consumer auto-fix + retry.
   4. If the task has no `imports[]` or no resolvable producer (e.g. `sourceTask == "plan"`, or the producer is in an earlier phase already marked `[X]` and confirmed) → skip trace-back and proceed with normal auto-fix + retry.
   This generalizes the existing parallel-batch trace-back rule (Section 5, Parallel batch execution) to sequential tasks and single-task failures.
5. If auto-fix attempted → "Retrying T### after auto-fix..." → re-delegate to Developer
6. **Second failure:**
   - **Sequential tasks:**
     1. Report: "✗ T### blocked. Manual intervention required."
     2. **Autopilot guard (I1)**: `AUTOPILOT = true` → default "Halt implementation". Log a `halt` row to `FEATURE_DIR/autopilot-log.md`: Timestamp=now, Phase=`Implement+QC`, Event=`halt`, Detail="T### blocked after retry", Outcome="Halt implementation", Rationale="sequential task unrecoverable failure", Artifacts=`[tasks.md](tasks.md)`.
     3. `AUTOPILOT = false` → prompt: "Skip task and continue" / "Debug manually and retry" / "Halt implementation"
   - **Parallel tasks `[P]`:** mark skipped (not `[X]`), log failure, continue
7. Track all failures for final summary

**Phase Review (after all phase tasks processed):**

Structural verification + requirement-coverage diff. Requirement-level behavioural verification is still deferred to `/sddp-qc` Story Verifier, but the diff catches missing files/symbols before `.completed`.

1. Verify: files created/modified exist and are non-empty
2. Verify: no TODO/FIXME stubs in implemented code (grep)
3. Verify: compilation/type-check passes
4. Verify: exports and public API surface match `plan.md` structure
5. Behavioral spot-check (when tests are absent and `→ exports:` annotations exist in this phase): for each annotated task, verify the exported symbols are importable and have correct arity/type from a scratch validation (e.g., `import { UserModel } from './models/user'` compiles and resolves to a real class/function). Skip this check when no `→ exports:` annotations are present in the phase.
6. Verify all `[COMPLETES (FR|TR|OR|RR)-###]` tasks in this phase have their full requirement chain satisfied (all tasks tagged with the same requirement are `[X]`).
7. **Requirement Coverage Diff** (against `COVERAGE_MATRIX`): for each matrix row whose `reqID` is tagged on a task in this phase, verify every `filePaths` entry exists AND at least one `functions` symbol is present in the expected file (grep the symbol name). Report `requirement-gap` per miss with the `reqID`, missing file/symbol, and expected location. Surface `MATRIX_GAPS` (rows with empty `filePaths`/`functions`) as `requirement-gap` warnings. P1 phases (marked `🎯 MVP`) → treat misses as must-pass (report but do not halt); non-P1 phases → report and continue.
8. Report: "✓ Phase [N] structural review — [pass_count]/[total_in_phase] passed"
9. Failures → report file + issue, continue (never halt)

**Micro-QC (Work-Item Phases Only):**

Runs only when the phase is a delivery work item (`[US#]`/`[OBJ#]`). Skipped for Setup/Foundational/Polish — those keep the structural Phase Review only. This is a fast-feedback complement to `/sddp-qc`, not a replacement; full QC still runs at Step 6 and via `/sddp-qc`.

Purpose: catch bugs in the Nth work item's code while the agent is still contextually close to it, instead of discovering them only at end-of-implement or full QC.

**Scope changed files:**
- `PHASE_END_FILES` = `git diff --name-only HEAD` (empty if not a git repo)
- `PHASE_CHANGED_FILES` = `PHASE_END_FILES` minus `PHASE_START_FILES`
- Fallback (empty result or not a git repo): union of `filePath` and `exports` file paths from tasks completed in this phase (from Task Tracker)
- Still empty → skip Micro-QC: "✓ Micro-QC Phase [N]: SKIPPED (no changed files)"

**Delegate: QC Auditor** (`.github/agents/_qc-auditor.md`) in differential mode with:
- `featureDir`, `techStack`, `autopilot` — from Step 2 / run context
- `testCommands` — filtered to the work item's test files: prefer the plan's `## Testing Strategy` rows tagged to this phase's requirements; else co-located test files matching `PHASE_CHANGED_FILES` (`*.test.*`, `*_test.*`, `tests/` siblings); else empty (Auditor auto-detects and applies `--changed`/`--lf` differential filters)
- `lintCommands`, `securityTools`, `coverageThreshold`, `qcTooling`, `requiredCategories` — from Step 2 context
- `changedFiles` = `PHASE_CHANGED_FILES`

The Auditor runs: build check → lint (`eslint [files]` / `ruff check [files]` / stack equivalent) → security scan → tests with `--changed`/`--lf` differential filters. Returns PASSED/FAILED/SKIPPED per category. Security scanning includes grep for common anti-patterns (hardcoded secrets, unsanitized input) in `changedFiles`.

**Export/contract conformance check** (not covered by the Auditor):
For each task completed in this phase with `→ exports: Symbol(params)` annotations:
1. Grep the declared `filePath` for each exported `Symbol` declaration
2. If `FEATURE_DIR/contracts/` exists and the task's requirement tag maps to a contract schema → verify the export's signature (params, return shape) matches the contract
3. Missing symbol or signature mismatch → record `export-mismatch` failure with task ID, symbol, file

**Failure routing (fix-now, then continue):**
- Each failure (test, lint, security, or export-mismatch) routes into the existing **On FAILURE — Error Recovery** loop for the corresponding task: auto-fix by error type → one retry via **Delegate: Developer**.
- Never halt the implement run on a micro-QC failure. Unrecovered failures (after retry) are tracked in the phase's failure list, surfaced in the final summary (Step 6), and re-surface at full `/sddp-qc`.
- Second failure on the same task → mark skipped (sequential) per the existing sequential-task double-failure rule; do not escalate to a full implement halt.

**Report:**
"✓ Micro-QC Phase [N]: tests [PASS|FAIL|SKIPPED], lint [..], security [..], exports [..]" or per-check FAIL with `file:issue` and the task ID routed to recovery.

**State checkpoint**: After Micro-QC, update the single JSON document described in Step 4.5. Refresh `phase`, `phaseCounters`, `completed`, `remaining`, `blocked`, `microqc`, `priorExports`, all source fingerprints, and `timestamps`; retain the phase-boundary `timestamp` alias. This checkpoint is in addition to, not a replacement for, the mandatory pre-delegation checkpoint.

Report: "✓ Phase [N] complete — [completed_in_phase] tasks done, [completed_count]/[total_tasks] overall ([remaining_count] remaining)"

**Parallel batch execution** (`[P]` tasks):
1. Group consecutive `[P]` tasks in same phase into a batch
2. Execute all file edits in the batch without intermediate validation
3. Interface consistency check (only when batch contains tasks with `← T###:Symbol` or `→ exports:` annotations): for each annotated `[P]` task, verify referenced symbols exist in the producer's file with a compatible signature. If mismatch → split the batch at the dependency boundary and execute the mismatched tasks sequentially. Skip this check entirely when no annotations are present in the batch.
4. Run validation once per batch (compile + lint + test)
5. Mark all passing tasks `[X]`; retry failing tasks individually

**Execution rules:**
- Sequential tasks: complete in order, retry once
- Parallel `[P]`: batch execution as above, individual failures non-blocking
- When batch validation fails at a consumer file, trace the imported symbol to its producer task. If the producer is in the same batch, retry the producer first, then the consumer — do not retry consumer in isolation.
- Never stop between phases
- Progress counts reflect remaining tasks

## 6. Validate Implementation

Final validation after all phases complete (or halt):

1. Verify implementation matches spec requirements
2. Run tests (if defined in plan.md)
3. Report final summary:
   - Total: [total] / Completed: [completed] ✓ / Skipped: [skipped] (task IDs) / Failed: [failed] (task IDs + errors) / Tentative: [tentative_count] (task IDs + one-line evidence from `TENTATIVE_TASKS`)
4. If skipped/failed → guidance on next steps; `AUTOPILOT = true` → report blocked, do NOT suggest QC
5. **TENTATIVE_TASKS handoff to QC**: if `TENTATIVE_TASKS` is non-empty, write `FEATURE_DIR/.review-findings` (append if it exists) with one line per tentative task: `T### | <reqID(s)> | tentative | <one-line evidence>`. These become QC priority-review checks (Story Verifier `priorityChecks`). Report: "⚠ [N] tentative task(s) flagged for QC priority review: [task IDs]."
6. **Completion marker**: If ALL non-deferred tasks completed (0 skipped, 0 failed, `[DEFERRED]` excluded):
   - If `.completed` exists → warn "⚠ `.completed` already exists. Overwriting."
   - Create `FEATURE_DIR/.completed`: `Completed: <ISO 8601 timestamp>` — only after all tasks and reviews actually passed

**Yield control to user** — only natural end point.

- `.completed` created → inform user, suggest `/sddp-qc` with feature name, directory path, and areas needing attention
- `.completed` not created → report blockers; `AUTOPILOT = true` → treat as HALT

</workflow>
