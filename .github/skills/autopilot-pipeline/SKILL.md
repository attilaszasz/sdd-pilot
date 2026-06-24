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
- Does not execute bootstrap phases (`/sddp-prd`, `/sddp-systemdesign`, `/sddp-init`).
- Report compact progress at each phase boundary: completed phase, blocker delta, next phase.
- Halt conditions strictly defined below — no other conditions stop the pipeline.
- **Artifact conventions** (`.github/skills/artifact-conventions/SKILL.md`): All sub-skill artifact rules apply.
- Write all automatic decisions **and phase lifecycle events** to `FEATURE_DIR/autopilot-log.md` using the schema defined in Step 1d.
</rules>

<workflow>

## 0. Acquire Shared Skills

Read `.github/skills/compact-communication/SKILL.md` for terse runtime communication rules, exact-preservation boundaries, and auto-clarity exceptions.

## 1. Gate Check

### 1a. Config & Feature Setup

1. Read `.github/sddp-config.md` if it exists.
2. If `specs/prd.md` exists and config has empty `## Product Document` → `**Path**:` → set it to `specs/prd.md`.
3. If `specs/sad.md` exists and config has empty `## Technical Context Document` → `**Path**:` → set it to `specs/sad.md`.
4. If `specs/dod.md` exists and config has empty `## Deployment & Operations Document` → `**Path**:` → set it to `specs/dod.md` (optional enrichment, not a prerequisite).
5. Parse config `## Autopilot` → `**Enabled**:`. If `false` or missing → **HALT**: "Autopilot is disabled. Set `**Enabled**: true` in `.github/sddp-config.md` under `## Autopilot`."
6. **Auto-select epic when no arguments provided:**
   - If `$ARGUMENTS` not empty → continue to step 7.
   - If `specs/project-plan.md` exists:
     - Read the file and find the first line matching `^- \[ \] (E\d{3}) .+\} (.+?)(?: \[→ Details\].*)?$` (first unchecked epic in document order).
    - Found → extract `EPIC_ID` (capture group 1) and epic title (capture group 2, trimmed). Set `$ARGUMENTS = "{EPIC_ID} {epic_title}"`. Log an `epic_update` row: Phase=`Gate`, Detail="Auto-selected epic {EPIC_ID}", Outcome="{epic_title}", Rationale="first unchecked epic in document order", Artifacts=`[specs/project-plan.md](../project-plan.md)`.
     - No unchecked epic found → **HALT**: "All epics in `specs/project-plan.md` are complete. No remaining work."
   - If `specs/project-plan.md` does not exist → **HALT**: "Feature description required. Usage: `/sddp-autopilot <feature description>`. To enable automatic epic selection, run `/sddp-projectplan` first."
7. **Delegate: Context Gatherer** in **full mode** with `autopilot=true`, `naming_seed=$ARGUMENTS` → resolves `FEATURE_DIR`, `PRODUCT_DOC`, `TECH_CONTEXT_DOC`, all context fields.
8. If `CONTEXT_BLOCKED = true` → **HALT**: "[BLOCKING_REASON] Fix and re-run `/sddp-autopilot`."

### 1b. Document Gate

Both documents required. Either fails → **HALT**.

Log each gate result as a `gate_check` row with the checked document linked in **Artifacts**.
- Config/autopilot enabled check → Artifacts=`[.github/sddp-config.md](../../.github/sddp-config.md)`
- Product Document existence/sufficiency → Artifacts=`[specs/prd.md](../prd.md)` or the registered product document path
- Technical Context Document existence/sufficiency → Artifacts=`[specs/sad.md](../sad.md)` or the registered technical context path
- Feature complete check → Artifacts=`[.qc-passed](.qc-passed)` when present, else `—`

**Product Document:**
1. `HAS_PRODUCT_DOC = false` → **HALT**: "Run `/sddp-prd` or register in `.github/sddp-config.md` under `## Product Document` → `**Path**:`."
2. Read file at `PRODUCT_DOC` path. Unreadable → **HALT**.
3. **Sufficiency**: Verify ≥3 of 5 categories have substantive content:
   - **Product vision/purpose**: `goal`, `vision`, `purpose`, `problem`, `objective`, `mission`
   - **Target audience/actors**: `user`, `customer`, `persona`, `actor`, `stakeholder`, `audience`, `role`
   - **Domain context**: ≥2 distinct domain-specific terms
   - **Scope/boundaries**: `scope`, `in scope`, `out of scope`, `boundary`, `constraint`, `limitation`
   - **Success measures**: `KPI`, `metric`, `success`, `measure`, `outcome`, `target`
4. <3 categories → **HALT**: "Product Document insufficient. Missing: [list]. Need ≥3/5 categories. Run `/sddp-prd`."

**Technical Context Document:**
1. `HAS_TECH_CONTEXT_DOC = false` → **HALT**: "Run `/sddp-systemdesign` or register in `.github/sddp-config.md` under `## Technical Context Document` → `**Path**:`."
2. Read file at `TECH_CONTEXT_DOC` path. Unreadable → **HALT**.
3. **Sufficiency**: Verify ≥3 of 5 categories:
   - **Language/runtime**: `language`, `runtime`, `python`, `node`, `typescript`, `go`, `rust`, `java`, `C#`, `.net`, `ruby`, `version`
   - **Framework/libraries**: `framework`, `react`, `vue`, `angular`, `express`, `fastapi`, `django`, `spring`, `next`, `library`, `dependency`
   - **Storage/database**: `database`, `storage`, `postgres`, `mysql`, `mongo`, `redis`, `cosmos`, `sqlite`, `dynamodb`, `supabase`, `firebase`
   - **Infrastructure/deployment**: `deploy`, `hosting`, `cloud`, `aws`, `azure`, `gcp`, `docker`, `kubernetes`, `vercel`, `CI`, `CD`
   - **Architecture/patterns**: `architecture`, `monolith`, `microservice`, `serverless`, `REST`, `GraphQL`, `event-driven`, `MVC`, `pattern`, `layer`
4. <3 categories → **HALT**: "Technical Context Document insufficient. Missing: [list]. Need ≥3/5 categories. Run `/sddp-systemdesign`."

### 1c. Feature Complete Check

`FEATURE_COMPLETE = true` → **HALT**: "Feature at `FEATURE_DIR` already complete (`.qc-passed` exists). Create a new branch."

### 1d. Initialize Audit Log

Create `FEATURE_DIR/autopilot-log.md`:

```markdown
# Autopilot Execution Log

> Auto-generated. Records every automatic decision, phase event, and gate check during autopilot execution.

| Timestamp | Phase | Event | Detail | Outcome | Rationale | Artifacts |
|-----------|-------|-------|--------|---------|-----------|-----------|
```

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

**Known artifact paths** (always link when mentioned):
`spec.md`, `plan.md`, `tasks.md`, `analysis-report.md`, `qc-report.md`, `manual-test.md`, `research.md`, `checklists/`, `autopilot-log.md`, `specs/project-plan.md`, `specs/plan/{EPIC_ID}.md`, `specs/prd.md`, `specs/sad.md`, `specs/dod.md`, `.github/sddp-config.md`.

Log gate check results (Steps 1a–1c) as `gate_check` rows now.

## 2. Pipeline Execution

Execute phases sequentially: log `phase_start` → report start → load and execute SKILL.md inline for real → verify output artifact → log `phase_complete` (with artifact link) or `phase_skip` → continue.

### Phase 1: Specify
- Log `phase_start` row: Phase=`Specify`, Detail="Begin feature specification".
- Report: "═══ Phase 1/7: Specify ═══"
- Execute `.github/skills/specify-feature/SKILL.md` with `$ARGUMENTS`.
- **Verify**: `FEATURE_DIR/spec.md` exists. Missing → **HALT** (log `halt` row linking `[spec.md](spec.md)`).
- Log `phase_complete` row: Outcome="spec.md created", Artifacts=`[spec.md](spec.md)`.
- **Pipeline hints**: If `EPIC_ID` is resolved and `specs/plan/{EPIC_ID}.md` exists → read the epic detail file, parse **Pipeline hints** → store `HINT_SKIP_CLARIFY`, `HINT_SKIP_CHECKLIST`, `HINT_LIGHTWEIGHT` (default all `false`). Log each parsed hint as a `decision` row with Artifacts=`[specs/plan/{EPIC_ID}.md](../plan/{EPIC_ID}.md)`.

### Phase 2: Clarify
- `HINT_SKIP_CLARIFY = true` → log `phase_skip` row: Detail="Pipeline hint: skip_clarify", Rationale="Epic hint from epic detail file", Artifacts=`[spec.md](spec.md), [specs/plan/{EPIC_ID}.md](../plan/{EPIC_ID}.md)`. Report skipped. Skip to Phase 3.
- Otherwise:
  - Log `phase_start` row: Phase=`Clarify`.
  - Report: "═══ Phase 2/7: Clarify ═══"
  - Execute `.github/skills/clarify-spec/SKILL.md` → verify `spec.md` exists.
  - Log `phase_complete` row: Artifacts=`[spec.md](spec.md)`.

### Phase 3: Plan
- Log `phase_start` row: Phase=`Plan`.
- `HINT_LIGHTWEIGHT = true` → log `decision` row: Detail="Lightweight mode enabled", Artifacts=`[specs/plan/{EPIC_ID}.md](../plan/{EPIC_ID}.md)`. Pass `LIGHTWEIGHT = true` to plan skill.
- Report: "═══ Phase 3/7: Plan ═══"
- Execute `.github/skills/plan-feature/SKILL.md` → the Spec → Plan gate (Step 1.6) runs the Spec Validator; a FAIL halts the pipeline here (autopilot guard P0). Verify `FEATURE_DIR/plan.md` exists. Missing → **HALT** (log `halt` row linking `[plan.md](plan.md)`).
- Log `phase_complete` row: Artifacts=`[plan.md](plan.md)`.

### Phase 4: Checklist (loop)
- `HINT_SKIP_CHECKLIST = true` → log `phase_skip` row: Detail="Pipeline hint: skip_checklist", Artifacts=`[specs/plan/{EPIC_ID}.md](../plan/{EPIC_ID}.md)`. Report skipped. Skip to Phase 5.
- No `.checklists` file → log `phase_skip` row: Detail="No checklist queue found", Artifacts=`—`. Report "No checklist queue — skipping."
- Otherwise:
  - Log `phase_start` row: Phase=`Checklist`.
  - Report: "═══ Phase 4/7: Checklist ═══"
  - Loop: invoke `.github/skills/generate-checklist/SKILL.md` repeatedly, each picks next unchecked `CHL###`, until `QUEUE_EXHAUSTED = true`. Report count.
  - Log `phase_complete` row: Outcome="[N] checklists evaluated", Artifacts=`[checklists/](checklists/)`.

### Phase 5: Tasks
- Log `phase_start` row: Phase=`Tasks`.
- Report: "═══ Phase 5/7: Tasks ═══"
- Execute `.github/skills/generate-tasks/SKILL.md` → the Plan → Tasks gate (Step 1.5) runs the Plan Validator; a FAIL halts the pipeline here (autopilot guard PM0). Verify `FEATURE_DIR/tasks.md` exists. Missing → **HALT** (log `halt` row linking `[tasks.md](tasks.md)`).
- Log `phase_complete` row: Artifacts=`[tasks.md](tasks.md)`.

### Phase 6: Analyze
- Log `phase_start` row: Phase=`Analyze`.
- Report: "═══ Phase 6/7: Analyze ═══"
- Execute `.github/skills/analyze-compliance/SKILL.md`. A1 autopilot guard auto-applies remediations.
- CRITICAL `project-instructions.md` violation → **HALT** (log `halt` row: Detail="CRITICAL project-instructions.md violation", Artifacts=`[analysis-report.md](analysis-report.md)`): "Manual resolution required."
- **Verify**: `FEATURE_DIR/analysis-report.md` exists.
- Log `phase_complete` row: Artifacts=`[analysis-report.md](analysis-report.md)`.

### Phase 7: Implement + QC
- Log `phase_start` row: Phase=`Implement+QC`.
- Report: "═══ Phase 7/7: Implement + QC ═══"
- Execute `.github/skills/implement-qc-loop/SKILL.md` (up to 10 iterations). The implement skill's `references/gates.md` runs the Tasks → Implement gate (Tasks Validator) on fresh runs; a FAIL halts the pipeline here (autopilot guard I0).
- **Verify**: `FEATURE_DIR/qc-report.md` exists with `Overall Verdict: PASS` AND `.qc-passed` exists.
- If missing, verdict ≠ PASS, or `.qc-passed` missing → log `halt` row: Detail="QC did not pass", Artifacts=`[qc-report.md](qc-report.md)`. HALTED.
- If `manual-test.md` generated → log `halt` row: Detail="Manual verification required", Artifacts=`[manual-test.md](manual-test.md)`. HALTED.
- Otherwise → log `phase_complete` row: Outcome="QC PASS", Artifacts=`[qc-report.md](qc-report.md)`.

### Post-Pipeline: Mark Epic Complete
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
3. **`manual-test.md` generated** — manual verification required.
4. **Gate artifact missing or phase-boundary validator FAIL** — phase did not produce expected artifact, or a mandatory Spec → Plan / Plan → Tasks / Tasks → Implement gate returned FAIL.
5. **Feature already complete** — `.qc-passed` existed at start.
6. **Document sufficiency failure** — Product or Technical Context Document below threshold.
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

After displaying the Final Report (Step 4), append a `## Run Summary` section to `FEATURE_DIR/autopilot-log.md`:

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
