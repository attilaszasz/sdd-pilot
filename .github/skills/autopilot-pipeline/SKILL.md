---
name: autopilot-pipeline
description: "Runs the full feature-delivery SDD pipeline end-to-end without user interaction. When called without arguments, auto-selects the first unchecked epic from specs/project-plan.md. Requires Autopilot enabled in config, a Product Document, and a Technical Context Document. Use when running /sddp-autopilot."
---

# Autopilot Pipeline

<rules>
- Runs ALL SDD phases in one uninterrupted turn — loads and executes each sub-skill inline. Does not duplicate sub-skill logic.
- Execute every phase for real. Not a demo, showcase, dry run, or simulation.
- Loading a sub-skill = performing its real work: file edits, installs, builds, tests, validations, retries, QC checks.
- Never invent progress, test results, QC verdicts, or artifact state. Never manually create `.completed`, `.qc-passed`, or `qc-report.md` as stand-ins.
- If any phase action cannot complete for real → **HALT** and report blocker. Never simulate success.
- `AUTOPILOT = true` for every sub-skill invocation.
- Never yield control to user between phases — one continuous turn until QC passes or halt.
- `$ARGUMENTS` is optional. When empty and `specs/project-plan.md` exists with unchecked epics, the first unchecked epic is auto-selected.
- Both Product Document and Technical Context Document are mandatory.
- The Product Document must pass `validate-prd.mjs` with the `planning-ready` profile. When a Project Plan exists, that same gate must validate its capability-digest freshness before any epic is selected or feature work begins.
- Does not execute bootstrap phases (`/sddp-prd`, `/sddp-systemdesign`, `/sddp-init`).
- Report compact progress at each phase boundary: completed phase, blocker delta, next phase.
- Halt conditions strictly defined below — no other conditions stop the pipeline.
- **Artifact conventions**: All sub-skill artifact rules in `AGENTS.md` §Artifact Conventions apply.
- Write all automatic decisions **and phase lifecycle events** to `FEATURE_DIR/autopilot-log.md` using the schema defined in Step 1d.
- The initial full Context Gatherer report is the only context resolution for one autopilot run. Store the exact report as `PIPELINE_CONTEXT` and pass it unchanged to every inline phase and nested Implement/QC skill.
- A downstream skill must not re-delegate Context Gatherer when `PIPELINE_CONTEXT` is valid: `CONTEXT_BLOCKED` is `false`, `FEATURE_DIR` is non-empty, and the current branch still matches `BRANCH` when Git is available. Before any feature access, it must revalidate `FEATURE_DIR` with `node scripts/resolve-feature-dir.mjs "FEATURE_DIR"`; failure blocks the phase. It must still re-read mutable feature artifacts before applying its phase gates.
- After Clarify or its explicit skip, the pipeline may create the separate in-turn `P1_REQUIREMENT_SNAPSHOT` for validator input reuse. It is never added to `PIPELINE_CONTEXT`, persisted to a feature workspace, or treated as a validation verdict.
</rules>

<workflow>

## 0. Acquire Shared Skills

## 1. Gate Check

### 1a. Config & Feature Setup

1. Set `RUN_START` to the current `HH:MM:SS` and initialize an in-memory ordered `LOG_BUFFER`. Until `FEATURE_DIR` is resolved and its log is initialized, add each complete seven-column row to this buffer instead of writing a feature-local file.
   Before any halt while no usable `FEATURE_DIR` exists, buffer one `halt` row with Phase=`Gate` and the available repository-relative artifact link (or `—`).
2. Read `.github/sddp-config.md` if it exists.
3. Resolve the Product Document config-first and default-second:
   - Parse `## Product Document` → `**Path**:`. If non-empty, require that exact path to be readable and set `PRODUCT_DOC`; do not silently fall back from a missing registration.
   - If registration is empty and `specs/prd.md` is readable, set `PRODUCT_DOC=specs/prd.md` and register it in the empty config field.
   - If a readable custom Product Document is registered while `specs/prd.md` also exists, the registration is authoritative. Ignore the unregistered file; do not infer a conflict from file existence alone.
   - If unresolved, buffer a failed `gate_check` and **HALT**: "Run `/sddp-prd` or register the Product Document in `.github/sddp-config.md`."
4. If `specs/sad.md` exists and config has empty `## Technical Context Document` → `**Path**:` → set it to `specs/sad.md`.
5. If `specs/dod.md` exists and config has empty `## Deployment & Operations Document` → `**Path**:` → set it to `specs/dod.md` (optional enrichment, not a prerequisite).
6. Parse config `## Autopilot` → `**Enabled**:`. Buffer its `gate_check` result. If `false` or missing → **HALT**: "Autopilot is disabled. Set `**Enabled**: true` in `.github/sddp-config.md` under `## Autopilot`."
7. Resolve `PROJECT_PLAN_DOC` config-first from `## Project Plan` → `**Path**:`, then fall back to `specs/project-plan.md` only when registration is empty. A non-empty registered path that is missing or unreadable → **HALT** with `/sddp-projectplan` registration-repair guidance; do not treat it as no Project Plan. Set `HAS_PROJECT_PLAN=true` only when the resolved path exists and is readable.
8. Run the planning-ready PRD gate from the repository root before epic selection or Context Gatherer delegation. The canonical base command is:

   `node scripts/validate-prd.mjs <prd> --profile planning-ready --config .github/sddp-config.md --discovery specs/prd-discovery.md`

   The discovery path is optional: an absent ledger is the normal QUICK-path state; an unreadable existing ledger fails closed.

   Substitute the shell-safe `PRODUCT_DOC` path for `<prd>`. When `HAS_PROJECT_PLAN=true`, append `--project-plan "PROJECT_PLAN_DOC"` so the validator compares the plan's `prd_capability_digest` with the current capability digest. When no Project Plan exists and explicit `$ARGUMENTS` were supplied, run the base command without `--project-plan`; Project Plan freshness is not required for that case.

   Parse the JSON output as `PRD_VALIDATION`, buffer a `gate_check`, and fail closed on non-zero exit or malformed output:
   - An `errors` entry with `code="active-prd-discovery"` → **HALT**: "Product discovery is incomplete. Run `/sddp-prd --resume`, then re-run `/sddp-autopilot`."
   - Any other invalid, incomplete, or legacy PRD diagnostic, excluding the two Project Plan freshness codes below → **HALT** with every validator diagnostic: "Run `/sddp-prd` to create or upgrade the registered Product Document, then re-run `/sddp-autopilot`." If PRD and freshness diagnostics coexist, repair the PRD first and validate again.
   - When `--project-plan` is used, require `projectPlanFreshness.valid=true`. Any error inside `projectPlanFreshness`, including missing/mismatched `prd_source`, malformed duplicate frontmatter, or missing/mismatched `prd_capability_digest`, → **HALT** before epic selection. Direct ordinary PRD-to-plan reconciliation to `/sddp-projectplan`; direct a change that must propagate across bootstrap artifacts or preserve completed-epic history to `/sddp-amend <change>`.
   - `valid=true` → retain the validator's ordered `capabilities` and `capabilityDigest` as gate evidence for this run.
9. **Auto-select epic when no arguments provided:**
   - If `$ARGUMENTS` not empty → continue to step 10.
   - If `HAS_PROJECT_PLAN=true`:
      - Read `PROJECT_PLAN_DOC` and find the first line matching `^- \[ \] (E\d{3}) .+\} (.+?)(?: \[→ Details\].*)?$` (first unchecked epic in document order).
      - Found → extract `EPIC_ID` (capture group 1) and epic title (capture group 2, trimmed). Set `$ARGUMENTS = "{EPIC_ID} {epic_title}"`. Buffer an `epic_update` row: Phase=`Gate`, Detail="Auto-selected epic {EPIC_ID}", Outcome="{epic_title}", Rationale="first unchecked epic in document order", Artifacts=`[specs/project-plan.md](../project-plan.md)`.
      - No unchecked epic found → **HALT**: "All epics in `PROJECT_PLAN_DOC` are complete. No remaining work."
   - If `HAS_PROJECT_PLAN=false` → **HALT**: "Feature description required. Usage: `/sddp-autopilot <feature description>`. To enable automatic epic selection, run `/sddp-projectplan` first."
10. **Delegate: Context Gatherer** (`.github/agents/_context-gatherer.md`) in **full mode** with `autopilot=true`, `naming_seed=$ARGUMENTS` → resolves `FEATURE_DIR`, `PRODUCT_DOC`, `TECH_CONTEXT_DOC`, all context fields. Store the exact full Context Report as `PIPELINE_CONTEXT` for the rest of this run.
11. If `FEATURE_DIR` is non-empty, initialize the audit log per Step 1d, then flush `LOG_BUFFER` in original order before any new row. If context resolution halts without a usable `FEATURE_DIR`, do not attempt a feature-local write; include the buffered rows verbatim in the Final Report so no pre-context event is silently lost.
12. If `CONTEXT_BLOCKED = true` → append a `halt` row when the log is initialized, then **HALT**: "[BLOCKING_REASON] Fix and re-run `/sddp-autopilot`."

### 1b. Document Gate

Both documents required. Either fails → **HALT**.

Log each gate result as a `gate_check` row with the checked document linked in **Artifacts**.
- Config/autopilot enabled check → Artifacts=`[.github/sddp-config.md](../../.github/sddp-config.md)`
- Product Document existence/sufficiency → Artifacts=`[specs/prd.md](../prd.md)` or the registered product document path
- Technical Context Document existence/sufficiency → Artifacts=`[specs/sad.md](../sad.md)` or the registered technical context path
- Feature complete check → validate the marker's report/evidence SHA-256 digests and current task/manual state; Artifacts=`[.qc-passed](.qc-passed)` when present, else `—`

**Product Document:**
1. Require the Step 1a `PRD_VALIDATION` planning-ready PASS for the same resolved `PRODUCT_DOC`; never replace it with keyword counting or a second heuristic sufficiency check.
2. Require Context Gatherer to report the same readable canonical path with `HAS_PRODUCT_DOC=true`. A mismatch, conflict, or unreadable path → **HALT** with `/sddp-prd` guidance.
3. When `HAS_PROJECT_PLAN=true`, require the Step 1a verdict to include a fresh Project Plan result from `--project-plan`; missing freshness evidence fails closed.

**Technical Context Document:**
1. `HAS_TECH_CONTEXT_DOC = false` → **HALT**: "Run `/sddp-systemdesign` or register in `.github/sddp-config.md` under `## Technical Context Document` → `**Path**:`."
2. Run `node scripts/validate-sad.mjs "TECH_CONTEXT_DOC" --profile planning-ready --config .github/sddp-config.md` from the repository root.
3. Parse the JSON as `SAD_VALIDATION`; non-zero exit, malformed output, `valid=false`, path mismatch, or unreadable input fails closed. Buffer every diagnostic and **HALT**: "Technical Context Document is not planning-ready. Run `/sddp-systemdesign` to refine and validate it, then re-run `/sddp-autopilot`."
4. Require the validator to report all five downstream categories as `true`, at least one boundary, one major flow, one traceability row, and both C4 overview types through a passing verdict. Never replace this with keyword counting or a second heuristic sufficiency check.
5. `valid=true` → retain `architectureDigest`, category verdicts, and counts as gate evidence for this run.

### 1c. Feature Complete Check

Run `node scripts/derive-completion-state.mjs "FEATURE_DIR"` from the repository root as a live gate; do not trust the initial snapshot. Apply the first matching result:
- `COMPLETION_STATE = "inconsistent"` → **HALT** with every exact `COMPLETION_ISSUES` entry and instruct `/sddp-implement` for implementation inconsistencies or `/sddp-qc` for QC inconsistencies.
- `QC_COMPLETE = true` → **HALT**: "Feature at `FEATURE_DIR` already has current valid QC evidence. Create a new branch."
- `IMPLEMENTATION_COMPLETE = true` and `QC_COMPLETE = false` → run the QC-only Resume Lifecycle Gate below. Set `RESUME_AT_QC = true` only after it passes.
- Otherwise → set `RESUME_AT_QC = false` and run the full pipeline.

`QC_COMPLETE` requires `.qc-passed`, a matching PASS `qc-report.md`, valid report/evidence SHA-256 digests, a matching Git baseline and repository-state digest, complete tasks, and `.completed`; marker existence alone never proves completion.

### QC-only Resume Lifecycle Gate

This read-only gate is mandatory before setting or consuming `RESUME_AT_QC`. It never regenerates, repairs, evaluates, or rewrites upstream artifacts, and no prior verdict, completion marker, or cache substitutes for a fresh result.

1. Confirm current `FEATURE_DIR/spec.md`, `FEATURE_DIR/plan.md`, and `FEATURE_DIR/tasks.md` each exist and are readable. Missing or unreadable artifacts → **HALT**; do not enter QC.
2. **Delegate: Spec Validator** (`.github/agents/_spec-validator.md`) in read-only mode with `SpecPath: FEATURE_DIR/spec.md`. Any FAIL or malformed/no verdict → **HALT**; unattended Autopilot never overrides.
3. **Delegate: Plan Validator** (`.github/agents/_plan-validator.md`) with `PlanPath: FEATURE_DIR/plan.md` and `SpecPath: FEATURE_DIR/spec.md`. Any FAIL or malformed/no verdict → **HALT**; unattended Autopilot never overrides.
4. **Delegate: Tasks Validator** (`.github/agents/_tasks-validator.md`) with `TasksPath: FEATURE_DIR/tasks.md` and `SpecPath: FEATURE_DIR/spec.md`. Any FAIL or malformed/no verdict → **HALT**; unattended Autopilot never overrides.
5. **Delegate: Checklist Reader** (`.github/agents/_checklist-reader.md`) with `featureDir: FEATURE_DIR`. If `checklists/` exists, require a parseable report with `totalFiles > 0`, `totalItems > 0`, `totalIncomplete = 0`, `overallStatus = "PASS"`, and queue `null` or `status = "COMPLETE"`. A pending queue, empty checklist, failed checklist, malformed report, or reader failure → **HALT**. If `checklists/` does not exist, accept `overallStatus = "N/A"` only.
6. Re-run `node scripts/derive-completion-state.mjs "FEATURE_DIR"`. Require `IMPLEMENTATION_COMPLETE = true`, `QC_COMPLETE = false`, and `COMPLETION_STATE = "qc-pending"`; otherwise **HALT** with the exact `COMPLETION_ISSUES`. Only then set `RESUME_AT_QC = true`.

Log each validator and checklist result as a `gate_check` row. On any failure, log a `halt` row with the failing artifact and halt before Phase 7. Do not invoke Test Evaluator or any artifact-writing phase during this gate.

### 1d. Initialize Audit Log

Initialize only after `FEATURE_DIR` resolves. If `FEATURE_DIR/autopilot-log.md` is absent, create it once with:

```markdown
# Autopilot Execution Log

> Auto-generated. Records every automatic decision, phase event, and gate check during autopilot execution.

| Timestamp | Phase | Event | Detail | Outcome | Rationale | Artifacts |
|-----------|-------|-------|--------|---------|-----------|-----------|
```

If the file already exists, preserve every byte. For both first runs and reruns, append a run boundary before flushing or appending rows:

```markdown

## Run {YYYY-MM-DD HH:MM:SS}

| Timestamp | Phase | Event | Detail | Outcome | Rationale | Artifacts |
|-----------|-------|-------|--------|---------|-----------|-----------|
```

Never recreate, truncate, rewrite, or repair historical content. A rerun only appends its run boundary, rows, and summary.

**Event types** — use exactly one of these values in the **Event** column:

| Event | When to log |
|-------|-------------|
| `phase_start` | A phase begins execution (the "═══ Phase N/7 ═══" report). |
| `phase_complete` | A phase finishes and its output artifact is verified present. |
| `phase_skip` | A phase is skipped (pipeline hint, no checklist queue, etc.). |
| `gate_check` | Each gate verification in Steps 1a–1c (config, doc sufficiency, feature-complete). |
| `decision` | Autopilot auto-selects a recommended option at any interaction point. |
| `halt` | Pipeline halts — include the blocking reason and link the missing/blocking artifact. |
| `epic_update` | `specs/project-plan.md` is read or modified (epic auto-select, mark complete). |

**Column rules:**

- **Timestamp**: `HH:MM:SS` (24-hour local time).
- **Phase**: `Gate` · `Specify` · `Clarify` · `Plan` · `Checklist` · `Tasks` · `Analyze` · `Implement+QC` · `Post-Pipeline`.
- **Event**: One of the event types above.
- **Detail**: Concise description of the decision point, action, or check performed.
- **Outcome**: The chosen value, pass/fail result, or produced status.
- **Rationale**: Brief reason the outcome was chosen.
- **Artifacts**: Comma-separated **clickable relative Markdown links** to every document mentioned in this row. Use paths relative to `FEATURE_DIR`: feature artifacts stay local (e.g., `[spec.md](spec.md)`, `[plan.md](plan.md)`), project-level docs under `specs/` go up one level (e.g., `[specs/project-plan.md](../project-plan.md)`, `[specs/prd.md](../prd.md)`, `[specs/sad.md](../sad.md)`), and repo-root docs outside `specs/` go up two levels (e.g., `[.github/sddp-config.md](../../.github/sddp-config.md)`). If no artifact is relevant, write `—`.

Before appending a row, validate all of it: exactly seven cells; a declared Phase and Event; embedded `|` characters escaped; every mentioned artifact represented by a Markdown link; every link target relative, normalized from `FEATURE_DIR`, and contained within the repository root. A link may target a missing artifact when the row records that absence. Invalid rows halt logging and execution rather than corrupting history.

Append each validated row as one complete line in one write. Never hold initialized rows until phase end and never append a partial row. An interruption may omit the current row or Run Summary, but all prior runs and completed rows remain valid readable Markdown.

**Known artifact paths** (always link when mentioned):
`spec.md`, `plan.md`, `tasks.md`, `analysis-report.md`, `qc-report.md`, `manual-test.md`, `research.md`, `checklists/`, `autopilot-log.md`, `specs/project-plan.md`, `specs/plan/{EPIC_ID}.md`, `specs/prd.md`, `specs/sad.md`, `specs/dod.md`, `.github/sddp-config.md`.

Flush each buffered row exactly once, then clear `LOG_BUFFER`. Append only gate check results from Steps 1a–1c that were not already buffered, in execution order.

## 2. Pipeline Execution

Execute phases sequentially: log `phase_start` → report start → load and execute SKILL.md inline for real → verify output artifact → log `phase_complete` (with artifact link) or `phase_skip` → continue.

When `RESUME_AT_QC = true`, log `phase_skip` for Specify, Clarify, Plan, Checklist, Tasks, and Analyze with Detail="Implementation already complete; resume at QC", then continue directly to Phase 7. Do not rewrite or regenerate their artifacts.

### Phase 1: Specify
- Log `phase_start` row: Phase=`Specify`, Detail="Begin feature specification".
- Report: "═══ Phase 1/7: Specify ═══"
- Execute `.github/skills/specify-feature/SKILL.md` with `$ARGUMENTS`, `AUTOPILOT = true`, and `PIPELINE_CONTEXT = PIPELINE_CONTEXT`. A Policy Auditor `FAIL` halts here; autopilot may not supply or select a justification.
- **Verify**: `FEATURE_DIR/spec.md` exists. Missing → **HALT** (log `halt` row linking `[spec.md](spec.md)`).
- Log `phase_complete` row: Outcome="spec.md created", Artifacts=`[spec.md](spec.md)`.
- **Pipeline hints**: If `EPIC_ID` is resolved and `specs/plan/{EPIC_ID}.md` exists → read the epic detail file, parse **Pipeline hints** → store `HINT_SKIP_CLARIFY`, `HINT_SKIP_CHECKLIST`, `HINT_LIGHTWEIGHT` (default all `false`). Log each parsed hint as a `decision` row with Artifacts=`[specs/plan/{EPIC_ID}.md](../plan/{EPIC_ID}.md)`.

### Phase 2: Clarify
- `HINT_SKIP_CLARIFY = true` → log `phase_skip` row: Detail="Pipeline hint: skip_clarify", Rationale="Epic hint from epic detail file", Artifacts=`[spec.md](spec.md), [specs/plan/{EPIC_ID}.md](../plan/{EPIC_ID}.md)`. Report skipped. Continue to Step 2.5.
- Otherwise:
  - Log `phase_start` row: Phase=`Clarify`.
  - Report: "═══ Phase 2/7: Clarify ═══"
  - Execute `.github/skills/clarify-spec/SKILL.md` with `AUTOPILOT = true` and `PIPELINE_CONTEXT = PIPELINE_CONTEXT` → verify `spec.md` exists.
  - Log `phase_complete` row: Artifacts=`[spec.md](spec.md)`.

### 2.5 Capture P1 requirement snapshot

After Phase 2 completes or is skipped, and before Phase 3 starts:

1. Re-read the exact UTF-8 bytes of `FEATURE_DIR/spec.md` from disk.
2. Run `node scripts/parse-requirement-ownership.mjs "FEATURE_DIR/spec.md"` from the repository root. This is the same deterministic live parser used by Spec, Plan, and Tasks Validators. Use its ordered `p1RequirementIds`; never infer priority from proximity.
3. Use the parser's `specSha256`, computed from the exact file bytes without line-ending normalization.
4. Set the in-turn value:

   ```text
   P1_REQUIREMENT_SNAPSHOT = {
     specSha256: <64-character lowercase digest>,
     requirementIds: [<ordered P1 requirement IDs>]
   }
   ```

5. If `spec.md` is missing or unreadable, or the parser exits non-zero or returns `valid: false`, set `P1_REQUIREMENT_SNAPSHOT = null`. Do not halt; downstream gates must run the same live parser and fail safely on malformed ownership.

This value is not logged, persisted, or added to `PIPELINE_CONTEXT`. It is passed only to the Tasks and Implement+QC phases. Each consumer re-runs the parser and discards the snapshot on any checksum or ordered-ID mismatch.

### Phase 3: Plan
- Log `phase_start` row: Phase=`Plan`.
- `HINT_LIGHTWEIGHT = true` → log `decision` row: Detail="Lightweight mode enabled", Artifacts=`[specs/plan/{EPIC_ID}.md](../plan/{EPIC_ID}.md)`. Pass `LIGHTWEIGHT = true` to plan skill.
- Report: "═══ Phase 3/7: Plan ═══"
- Execute `.github/skills/plan-feature/SKILL.md` with `AUTOPILOT = true`, `PIPELINE_CONTEXT = PIPELINE_CONTEXT`, `LIGHTWEIGHT = [HINT_LIGHTWEIGHT]`, and `SKIP_CHECKLIST_QUEUE = [HINT_SKIP_CHECKLIST]` → the Spec → Plan gate (Step 1.6) runs the Spec Validator; a FAIL halts the pipeline here (autopilot guard P0). Plan checks live checklist state before honoring a skip hint: it suppresses a new risk-derived queue only when state is `N/A` or `PASS`; an existing pending or malformed state halts here. A Policy Auditor `FAIL` also halts here; autopilot may not supply or select a justification. Verify `FEATURE_DIR/plan.md` exists. Missing → **HALT** (log `halt` row linking `[plan.md](plan.md)`).
- Log `phase_complete` row: Artifacts=`[plan.md](plan.md)`.

### Phase 4: Checklist (loop)
- `HINT_SKIP_CHECKLIST = true` → run `node scripts/checklist-state.mjs "FEATURE_DIR"` from the repository root. `overallStatus = "N/A"` or `"PASS"` → log `phase_skip` row: Detail="Pipeline hint: skip_checklist", Outcome="No pending checklist state", Rationale="Plan suppressed new queue generation; live state is non-blocking", Artifacts=`[specs/plan/{EPIC_ID}.md](../plan/{EPIC_ID}.md)`. Report skipped. Skip to Phase 5. Any other, malformed, or unreadable result → log `halt` row: Detail="Checklist skip conflict: existing checklist state blocks", Outcome="Halt pipeline", Rationale="skip_checklist cannot bypass an existing pending or malformed checklist", Artifacts=`[checklists/](checklists/)`. **HALT** before Tasks.
- No `.checklists` file → log `phase_skip` row: Detail="No checklist queue found", Artifacts=`—`. Report "No checklist queue — skipping."
- Otherwise:
  - Log `phase_start` row: Phase=`Checklist`.
  - Report: "═══ Phase 4/7: Checklist ═══"
  - Loop: invoke `.github/skills/generate-checklist/SKILL.md` repeatedly with `AUTOPILOT = true` and `PIPELINE_CONTEXT = PIPELINE_CONTEXT`; each picks next unchecked `CHL###`, until `QUEUE_EXHAUSTED = true`. Any FAIL/BLOCKED result halts without a queue mutation or phase advance.
  - Before `phase_complete`, require the shared Checklist Reader aggregate to report `overallStatus = "PASS"` and queue `status = "COMPLETE"`. Otherwise log `halt` and halt. Report count.
  - Log `phase_complete` row: Outcome="[N] checklists evaluated", Artifacts=`[checklists/](checklists/)`.

### Phase 5: Tasks
- Log `phase_start` row: Phase=`Tasks`.
- Report: "═══ Phase 5/7: Tasks ═══"
- Execute `.github/skills/generate-tasks/SKILL.md` with `AUTOPILOT = true`, `PIPELINE_CONTEXT = PIPELINE_CONTEXT`, and `P1_REQUIREMENT_SNAPSHOT = P1_REQUIREMENT_SNAPSHOT` → the Plan → Tasks gate (Step 1.5) runs the Plan Validator; a FAIL halts the pipeline here (autopilot guard PM0). Verify `FEATURE_DIR/tasks.md` exists. Missing → **HALT** (log `halt` row linking `[tasks.md](tasks.md)`).
- Log `phase_complete` row: Artifacts=`[tasks.md](tasks.md)`.

### Phase 6: Analyze
- Log `phase_start` row: Phase=`Analyze`.
- Report: "═══ Phase 6/7: Analyze ═══"
- Execute `.github/skills/analyze-compliance/SKILL.md` with `AUTOPILOT = true` and `PIPELINE_CONTEXT = PIPELINE_CONTEXT`. A1 autopilot guard auto-applies remediations only after Policy Auditor `PASS`; Policy Auditor `FAIL` halts without remediation or justification.
- CRITICAL `project-instructions.md` violation → **HALT** (log `halt` row: Detail="CRITICAL project-instructions.md violation", Artifacts=`[analysis-report.md](analysis-report.md)`): "Manual resolution required."
- **Verify**: `FEATURE_DIR/analysis-report.md` exists.
- Log `phase_complete` row: Artifacts=`[analysis-report.md](analysis-report.md)`.

### Phase 7: Implement + QC
- Log `phase_start` row: Phase=`Implement+QC`.
- Report: "═══ Phase 7/7: Implement + QC ═══"
- If `RESUME_AT_QC = true`, execute `.github/skills/quality-control/SKILL.md` with `AUTOPILOT = true`, passing `PIPELINE_CONTEXT` unchanged. Otherwise execute `.github/skills/implement-qc-loop/SKILL.md` with `AUTOPILOT = true`, `PIPELINE_CONTEXT = PIPELINE_CONTEXT`, and `P1_REQUIREMENT_SNAPSHOT = P1_REQUIREMENT_SNAPSHOT` (up to 10 iterations). The Implement and QC Policy Auditor gates halt on `FAIL` without justification. The implement skill's `references/gates.md` runs the Tasks → Implement gate (Tasks Validator) on fresh runs; a FAIL halts the pipeline here (autopilot guard I0).
- **Verify**: `FEATURE_DIR/qc-report.md` exists with `Overall Verdict: PASS`; `.qc-passed` exists and both SHA-256 digests validate against current evidence; no pending manual attestation or unchecked/deferred CRITICAL/ERROR bug exists.
- If any condition fails → log `halt` row with the exact missing, stale, blocked, or inconsistent evidence and Artifacts=`[qc-report.md](qc-report.md)`. HALTED.
- If `manual-test.md` lacks complete human attestation → log `halt` row: Detail="Manual verification required", Artifacts=`[manual-test.md](manual-test.md)`. HALTED.
- Otherwise → log `phase_complete` row: Outcome="QC PASS", Artifacts=`[qc-report.md](qc-report.md)`.

### Post-Pipeline: Mark Epic Complete
- Re-run the Phase 7 current-evidence verification immediately before editing `specs/project-plan.md` by executing `node scripts/derive-completion-state.mjs "FEATURE_DIR"`. Unless `QC_COMPLETE = true` with no `COMPLETION_ISSUES`, halt; never mark an epic complete from marker existence alone.
- Guard: `EPIC_ID` resolved (from Phase 1 or `spec.md` frontmatter `epic_id`) AND `specs/project-plan.md` exists.
- If guard fails → skip silently (non-blocking).
- Read `specs/project-plan.md`, locate the line matching `^- \[ \] {EPIC_ID} \[P[123]\]`.
  - Found → replace `- [ ]` with `- [X]` on that line. Log `epic_update` row: Detail="Epic {EPIC_ID} marked complete", Artifacts=`[specs/project-plan.md](../project-plan.md)`.
  - Already `[X]` → skip, log `epic_update` row: Detail="Epic {EPIC_ID} already marked complete", Artifacts=`[specs/project-plan.md](../project-plan.md)`.
  - Not found → skip, log `epic_update` row: Detail="Epic {EPIC_ID} not found in project-plan.md", Artifacts=`[specs/project-plan.md](../project-plan.md)`.

## 3. Halt Conditions

Pipeline stops immediately for:
1. **CRITICAL `project-instructions.md` violation** — any phase, any Policy Auditor or Analyze check.
2. **Implement-QC loop exhausted** — 10 iterations without QC pass.
3. **Manual verification lacks complete human attestation** — pending, malformed, or failed manual evidence blocks completion.
4. **Gate artifact missing or phase-boundary validator FAIL** — phase did not produce expected artifact, or a mandatory Spec → Plan / Plan → Tasks / Tasks → Implement gate returned FAIL.
5. **Feature already complete** — current `.qc-passed` report/evidence digests validated at start; stale or inconsistent marker state halts separately.
6. **Document sufficiency or freshness failure** — Product Document fails planning-ready validation, its discovery is active, its Project Plan is stale when present, or the Technical Context Document is below threshold.
7. **Real execution blocked** — required action cannot complete in current environment.
8. **Context resolution failure** — detached HEAD or blocking git error.

When halting:
- If `FEATURE_DIR` available → log `halt` row to `autopilot-log.md` with: Detail=halt reason, Outcome=blocking condition, Artifacts=clickable link to the missing or blocking document (e.g., `[spec.md](spec.md)`, `[qc-report.md](qc-report.md)`, `[.github/sddp-config.md](../../.github/sddp-config.md)`).
- Report to user: halted phase, reason, manual resolution guidance.
- Proceed to Final Report (Step 4).

## 4. Final Report

After pipeline completes or halts, display a summary:

Content: Feature dir, Status (PASSED or HALTED at phase), Phases completed (N/7), per-phase status table (Specify/Clarify/Plan/Checklist/Tasks/Analyze/Implement+QC — each ✓/✗/⊘ + key output), autopilot decision count (ref autopilot-log.md), artifact list with ✓/✗.

If HALTED: Include halt reason, phase, and specific resolution guidance with commands.
If PASSED: "Feature is verified and ready for release. Run `git add . && git commit -m 'feat: [feature]'` and open a PR." If epic was marked complete → append: "Epic `{EPIC_ID}` marked complete in `specs/project-plan.md`."

## 5. Append Run Summary to Audit Log

After displaying the Final Report (Step 4), append a `## Run Summary` section for the current run to `FEATURE_DIR/autopilot-log.md` in one complete write:

```markdown

## Run Summary

| Phase | Status | Key Artifact |
|-------|--------|--------------|
| Gate | ✓ PASS | [.github/sddp-config.md](../../.github/sddp-config.md) |
| Specify | ✓ COMPLETE | [spec.md](spec.md) |
| Clarify | ✓ COMPLETE / ⊘ SKIPPED | [spec.md](spec.md) |
| Plan | ✓ COMPLETE | [plan.md](plan.md) |
| Checklist | ✓ COMPLETE / ⊘ SKIPPED | [checklists/](checklists/) |
| Tasks | ✓ COMPLETE | [tasks.md](tasks.md) |
| Analyze | ✓ COMPLETE | [analysis-report.md](analysis-report.md) |
| Implement+QC | ✓ PASS | [qc-report.md](qc-report.md) |

**Result**: PASSED / HALTED at {phase} — {reason}
**Epic**: {EPIC_ID} — {disposition} ([specs/project-plan.md](../project-plan.md))
**Duration**: {start_time} → {end_time}
```

Rules for the Run Summary:
- Use the **actual status** for each phase: `✓ COMPLETE`, `✓ PASS` (for Gate and Implement+QC), `⊘ SKIPPED`, or `✗ HALTED`.
- The **Key Artifact** column links the primary output of each phase. Use `—` if the phase did not produce an artifact (e.g., skipped phases with no output).
- If halted, include only phases up to and including the halted phase. Mark the halted phase as `✗ HALTED` and omit subsequent phases.
- **Result** line: `PASSED` or `HALTED at {phase} — {brief reason}`.
- **Epic** line: include only if `EPIC_ID` was resolved. Disposition is "marked complete", "already complete", or "not found".
- **Duration** line: `{HH:MM:SS start}` → `{HH:MM:SS end}`.

</workflow>
