# Implementation Gates & Project Setup

> **Load condition**: Read this file on every Implement invocation, including resumes and runs where every task is checked. Checkbox state, `.implement-state`, and prior verdicts never substitute for validation of current inputs.

---

## Gate Check: Artifact Validation

After the context handoff or Context Gatherer returns, re-read `spec.md`, `plan.md`, and `tasks.md` and derive `HAS_SPEC`, `HAS_PLAN`, and `HAS_TASKS` from the current files:

- **If any are `false`: Attempt Auto-Resolution**
  1. Report: "Gate failed: Missing `[artifact]` at `FEATURE_DIR/[artifact]`. Attempting auto-resolution..."
  2. Suggest the appropriate command to the user with context:
     - Missing `spec.md`: "`/sddp-specify` — this file is created by the specify phase. It does not exist yet at `FEATURE_DIR/spec.md`."
     - Missing `plan.md`: "`/sddp-plan` — this file is created by the plan phase. It does not exist yet at `FEATURE_DIR/plan.md`."
     - Missing `tasks.md`: "`/sddp-tasks` — this file is created by the tasks phase. It does not exist yet at `FEATURE_DIR/tasks.md`."
  3. Re-check context to verify resolution
  4. If still failing after auto-resolution attempt, halt with enriched error:
     - "Missing `[artifact]` at `FEATURE_DIR/[artifact]`."
     - "This file is created by `[command]`. Most likely cause: the prior phase has not been run, or you are on the wrong branch/feature directory."
     - "Run `[command]` to create it." — compose a useful suggested prompt based on branch name and feature context
- **If all are `true`**: Continue to Checklist Gate.

When an optional `P1_REQUIREMENT_SNAPSHOT` is supplied, validate it before the Tasks → Implement delegation:

1. Run `node scripts/parse-requirement-ownership.mjs "FEATURE_DIR/spec.md"`, the same deterministic parser used by snapshot generation and both coverage validators. Require successful output.
2. Require an object with a lowercase 64-character `specSha256` equal to the parser's exact-byte digest and a unique `requirementIds` array exactly equal to the parser's ordered `p1RequirementIds`.
3. If checksum and IDs match, set `P1RequirementIds` to the supplied ordered IDs. On absent, malformed, unreadable, checksum-mismatched, empty-when-P1, partial, or parser-invalid input, omit `P1RequirementIds`; Tasks Validator runs the same live parser. An empty array is accepted only when successful live parser output is empty.

This is an in-turn parsed-input reuse only. It does not skip the validator, cache its verdict, or create a feature-workspace marker.

## Project Instructions Gate

Before structural revalidation, **Delegate: Policy Auditor** (`.github/agents/_policy-auditor.md`) for each current phase artifact: `FEATURE_DIR/spec.md`, `FEATURE_DIR/plan.md`, and `FEATURE_DIR/tasks.md`.

- All `PASS` → continue to Spec → Plan Revalidation.
- Any `FAIL` → apply the Policy Auditor blocking contract before project setup or task execution. `AUTOPILOT = true` halts immediately and logs a `halt` row to `FEATURE_DIR/autopilot-log.md` with the failing artifact and violations. Otherwise show the violations and request an explicit, non-empty justification; halt unless the user provides one and chooses to proceed. Record a valid override in the conversation only, never in a marker or artifact.

## Spec → Plan Revalidation

Validate the current upstream input before trusting any downstream artifact.

**Delegate: Spec Validator** (`.github/agents/_spec-validator.md`) with `SpecPath: FEATURE_DIR/spec.md` and read-only mode. Parse its PASS/FAIL verdict. PASS continues to Plan revalidation. FAIL uses the same blocking behavior as the Tasks gate below: autopilot halts; interactive execution may continue only after an explicit "Proceed anyway" choice recorded in the conversation.

## Plan → Tasks Revalidation

After Spec Validator passes or an interactive bypass is chosen, **Delegate: Plan Validator** (`.github/agents/_plan-validator.md`) with `PlanPath: FEATURE_DIR/plan.md`, `SpecPath: FEATURE_DIR/spec.md`, and only checksum-verified `P1RequirementIds` when available. Parse its PASS/FAIL verdict. PASS continues to the Tasks gate. FAIL blocks with the same autopilot halt and explicit interactive bypass behavior.

These validators and the Tasks Validator below run in order on every invocation. A changed `spec.md` therefore reruns Spec, Plan, and Tasks validation; a changed `plan.md` cannot retain an earlier Plan or Tasks verdict. No verdict is persisted or cached.

## Tasks → Implement Gate

Mandatory structural validation of `tasks.md` before executing any task. Runs after the Artifact Validation block confirms `HAS_SPEC`, `HAS_PLAN`, `HAS_TASKS` are all `true` (or were auto-resolved) and before the Checklist Gate. Blocks implementation on FAIL.

**Delegate: Tasks Validator** (`.github/agents/_tasks-validator.md`):
- `TasksPath`: `FEATURE_DIR/tasks.md`
- `SpecPath`: `FEATURE_DIR/spec.md`
- `P1RequirementIds`: pass only IDs from a snapshot whose checksum and ordered IDs exactly match successful live parser output; omit it to retain mandatory live parsing.

Parse the returned verdict (`Result: PASS | FAIL`, `Score`, `Failing Items`, `Recommendations`).

Task parsing must be complete. Any parser failure, malformed task candidate, or task count above 40 produces `FAIL`; the validator may not score a partial task list as passing.

- **PASS** → continue to the Checklist Gate.
- **FAIL**:
  - Report the failing items and recommendations table.
  - **Autopilot guard (I0)**: `AUTOPILOT = true` → **HALT**. Log a `halt` row to `FEATURE_DIR/autopilot-log.md`: Timestamp=now, Phase=`Implement+QC`, Event=`halt`, Detail="Tasks → Implement gate FAIL", Outcome="Halt implementation", Rationale="mandatory structural validation failed", Artifacts=`[tasks.md](tasks.md)`. Do not proceed to the Checklist Gate or task execution.
  - `AUTOPILOT = false` → prompt the user:
    - "**Fix tasks and retry** (recommended) — resolve the failing items, then re-run `/sddp-implement`"
    - "**Proceed anyway** — implement despite the validation failures (downstream execution may hit missing P1 task coverage, circular dependencies, or oversize task lists)"
    - Handle choice: "Fix and retry" → halt, direct user to `/sddp-tasks`. "Proceed anyway" → continue to the Checklist Gate (the bypass is recorded only in this conversation; no persistent marker is written).

## Checklist Gate

**Delegate: Checklist Reader** (see `.github/agents/_checklist-reader.md` for methodology) with `FEATURE_DIR`.

Require a parseable Checklist Reader report from the shared `checklist-state.mjs` aggregate. `overallStatus: "PASS"` is the only continuing state when `checklists/` exists; `"N/A"` continues only when `checklists/` does not exist. `blocking: true`, a pending/malformed queue, empty file, stale relationship, or malformed report is FAIL.

1. Display a summary table of the checklists (File | Total | Completed | Incomplete | Status).
2. **If `overallStatus` is "FAIL"**:
   - **Auto-evaluate (no user prompt on first attempt)**:
   1. **Delegate: Test Evaluator** (see `.github/agents/_test-evaluator.md` for methodology) with `featureDir` set to `FEATURE_DIR` and `autopilot` set to `AUTOPILOT` for each checklist file with status `"FAIL"`.
     2. The evaluator will mark satisfied items `[X]`, amend artifacts to resolve gaps, and ask the user about ambiguous items.
    3. After evaluation completes, inspect its `amendedFiles`. Before re-checking the checklist, rerun the owning and every downstream structural validator in lifecycle order: `spec.md` amendment → Spec, Plan, Tasks; `plan.md` amendment → Plan, Tasks; `tasks.md` amendment → Tasks. Any validator FAIL follows its normal blocking behavior. A checklist-only checkbox amendment reruns Checklist Reader and does not bypass Tasks validation already completed in this invocation.
    4. Re-check with Checklist Reader.
      5. Display the updated summary table.
      6. If `overallStatus` is now `"PASS"`: Continue to Step 2.
    7. **If `overallStatus` is still `"FAIL"` (second attempt)**: Report "Some checklist items are still unchecked after automatic verification":
      - **Autopilot guard (I2)**: If `AUTOPILOT = true`, **HALT**. Log a `halt` row to `FEATURE_DIR/autopilot-log.md`: Timestamp=now, Phase=`Implement+QC`, Event=`halt`, Detail="Checklist gate still FAIL after automatic evaluation", Outcome="Halt implementation", Rationale="unresolved checklist items require explicit interactive resolution or override", Artifacts=`[checklists/](checklists/)`. Do not execute tasks and do not infer a bypass from defaults, recommendations, prior choices, or unattended mode.
      - If `AUTOPILOT = false`: prompt the user:
        - "**Try verifying again** — the evaluator will re-check items against your spec and plan"
        - "**Proceed anyway** — implement now and address remaining checklist items later"
        - "**Stop** — fix checklist items manually before implementing"
       - Handle user choice: If Stop, halt. If Try verifying again, repeat evaluation. Continue only when the user explicitly selects Proceed anyway in the current conversation; silence, an empty response, or any other response halts.
3. **If `overallStatus` is "PASS" or (it is "N/A" and `checklists/` does not exist)**: Continue.

## Project Setup

Create/verify ignore files based on the tech stack detected in plan.md:

- Check if git repo → run `node scripts/release-runtime-manifest.mjs ensure-ignore "$PROJECT_ROOT"` before any `.implement-state` checkpoint. This appends `.implement-state` once without replacing existing ignore bytes; failure blocks checkpointing.
- Check for Docker usage → create/verify `.dockerignore`
- Check for linting tools → create/verify appropriate ignore files

Use technology-specific ignore patterns appropriate for the detected stack (e.g., `node_modules/` for Node.js, `__pycache__/` for Python, `target/` for Java/Rust). Always include universal patterns: `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`.

If ignore file already exists, append missing critical patterns only.

## Dependency Installation

After ignore files verified, install project dependencies:
- `package.json` → `npm install` (or `yarn`/`pnpm`/`bun` per lockfile)
- `requirements.txt` / `pyproject.toml` → `pip install -r requirements.txt` or `pip install -e .`
- `Cargo.toml` → `cargo fetch`
- `go.mod` → `go mod download`
- `.csproj` / `.sln` → `dotnet restore`

Skip if no package manifest found. Report installed count.
