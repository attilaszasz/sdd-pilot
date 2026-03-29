---
name: autopilot-pipeline
description: "Runs the full feature-delivery SDD pipeline end-to-end without user interaction. Requires Autopilot enabled in config, a Product Document, and a Technical Context Document. Use when running /sddp-autopilot."
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
- `$ARGUMENTS` MUST contain a feature description.
- Both Product Document and Technical Context Document are mandatory.
- Does not execute bootstrap phases (`/sddp-prd`, `/sddp-systemdesign`, `/sddp-init`).
- Report progress at each phase boundary.
- Halt conditions strictly defined below — no other conditions stop the pipeline.
- **Artifact conventions** (`.github/skills/artifact-conventions/SKILL.md`): All sub-skill artifact rules apply.
- Write all automatic decisions to `FEATURE_DIR/autopilot-log.md`.
</rules>

<workflow>

## 1. Gate Check

### 1a. Config & Feature Setup

1. Read `.github/sddp-config.md` if it exists.
2. If `specs/prd.md` exists and config has empty `## Product Document` → `**Path**:` → set it to `specs/prd.md`.
3. If `specs/sad.md` exists and config has empty `## Technical Context Document` → `**Path**:` → set it to `specs/sad.md`.
4. If `specs/dod.md` exists and config has empty `## Deployment & Operations Document` → `**Path**:` → set it to `specs/dod.md` (optional enrichment, not a prerequisite).
5. Parse config `## Autopilot` → `**Enabled**:`. If `false` or missing → **HALT**: "Autopilot is disabled. Set `**Enabled**: true` in `.github/sddp-config.md` under `## Autopilot`."
6. If `$ARGUMENTS` empty → **HALT**: "Feature description required. Usage: `/sddp-autopilot <feature description>`"
7. **Delegate: Context Gatherer** in **full mode** with `autopilot=true`, `naming_seed=$ARGUMENTS` → resolves `FEATURE_DIR`, `PRODUCT_DOC`, `TECH_CONTEXT_DOC`, all context fields.
8. If `CONTEXT_BLOCKED = true` → **HALT**: "[BLOCKING_REASON] Fix and re-run `/sddp-autopilot <feature description>`."

### 1b. Document Gate

Both documents required. Either fails → **HALT**.

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
# Autopilot Decision Log

> Auto-generated. Records every automatic decision made during autopilot execution.

| Timestamp | Phase | Decision Point | Chosen Value | Rationale |
|-----------|-------|---------------|--------------|-----------|
```

Log gate check results.

## 2. Pipeline Execution

Execute phases sequentially: report start → load and execute SKILL.md inline for real → verify output artifact → log to `autopilot-log.md` → continue.

### Phase 1: Specify
- Report: "═══ Phase 1/7: Specify ═══"
- Execute `.github/skills/specify-feature/SKILL.md` with `$ARGUMENTS`.
- **Verify**: `FEATURE_DIR/spec.md` exists. Missing → **HALT**.
- **Pipeline hints**: If `specs/project-plan.md` exists and `EPIC_ID` resolved → read epic detail, parse **Pipeline hints** → store `HINT_SKIP_CLARIFY`, `HINT_SKIP_CHECKLIST`, `HINT_LIGHTWEIGHT` (default all `false`). Log to `autopilot-log.md`.

### Phase 2: Clarify
- `HINT_SKIP_CLARIFY = true` → report skipped (pipeline hint), log to `FEATURE_DIR/autopilot-log.md`: "Pipeline hint: skip_clarify — skipping Clarify phase", skip to Phase 3.
- Otherwise: report → execute `.github/skills/clarify-spec/SKILL.md` → verify `spec.md` exists.

### Phase 3: Plan
- `HINT_LIGHTWEIGHT = true` → log hint, pass `LIGHTWEIGHT = true` to plan skill.
- Report → execute `.github/skills/plan-feature/SKILL.md` → verify `FEATURE_DIR/plan.md` exists. Missing → **HALT**.

### Phase 4: Checklist (loop)
- `HINT_SKIP_CHECKLIST = true` → report skipped (pipeline hint), log to `FEATURE_DIR/autopilot-log.md`: "Pipeline hint: skip_checklist — skipping Checklist phase", skip to Phase 5.
- If `FEATURE_DIR/checklists/.checklists` exists → loop: invoke `.github/skills/generate-checklist/SKILL.md` repeatedly, each picks next unchecked `CHL###`, until `QUEUE_EXHAUSTED = true`. Report count.
- No `.checklists` file → report "No checklist queue — skipping."

### Phase 5: Tasks
- Report → execute `.github/skills/generate-tasks/SKILL.md` → verify `FEATURE_DIR/tasks.md` exists. Missing → **HALT**.

### Phase 6: Analyze
- Report → execute `.github/skills/analyze-compliance/SKILL.md`. A1 autopilot guard auto-applies remediations.
- CRITICAL `project-instructions.md` violation → **HALT**: "Manual resolution required."
- **Verify**: `FEATURE_DIR/analysis-report.md` exists.

### Phase 7: Implement + QC
- Report → execute `.github/skills/implement-qc-loop/SKILL.md` (up to 10 iterations).
- **Verify**: `FEATURE_DIR/qc-report.md` exists with `Overall Verdict: PASS` AND `.qc-passed` exists.
- If missing, verdict ≠ PASS, or `.qc-passed` missing → HALTED.
- If `manual-test.md` generated → HALTED (requires human verification).

### Post-Pipeline: Mark Epic Complete
- Guard: `EPIC_ID` resolved (from Phase 1 or `spec.md` frontmatter `epic_id`) AND `specs/project-plan.md` exists.
- If guard fails → skip silently (non-blocking).
- Read `specs/project-plan.md`, locate the line matching `^- \[ \] {EPIC_ID} \[P[123]\]`.
  - Found → replace `- [ ]` with `- [X]` on that line. Log to `FEATURE_DIR/autopilot-log.md`: "Epic {EPIC_ID} marked complete in project-plan.md".
  - Already `[X]` → skip, log: "Epic {EPIC_ID} already marked complete".
  - Not found → skip, log: "Epic {EPIC_ID} not found in project-plan.md".

## 3. Halt Conditions

Pipeline stops immediately for:
1. **CRITICAL `project-instructions.md` violation** — any phase, any Policy Auditor or Analyze check.
2. **Implement-QC loop exhausted** — 10 iterations without QC pass.
3. **`manual-test.md` generated** — manual verification required.
4. **Gate artifact missing** — phase did not produce expected artifact.
5. **Feature already complete** — `.qc-passed` existed at start.
6. **Document sufficiency failure** — Product or Technical Context Document below threshold.
7. **Real execution blocked** — required action cannot complete in current environment.
8. **Context resolution failure** — detached HEAD or blocking git error.

When halting:
- If `FEATURE_DIR` available → log halt reason to `autopilot-log.md`.
- Report to user: halted phase, reason, manual resolution guidance.
- Proceed to Final Report (Step 4).

## 4. Final Report

After pipeline completes or halts, display a summary:

Content: Feature dir, Status (PASSED or HALTED at phase), Phases completed (N/7), per-phase status table (Specify/Clarify/Plan/Checklist/Tasks/Analyze/Implement+QC — each ✓/✗/⊘ + key output), autopilot decision count (ref autopilot-log.md), artifact list with ✓/✗.

If HALTED: Include halt reason, phase, and specific resolution guidance with commands.
If PASSED: "Feature is verified and ready for release. Run `git add . && git commit -m 'feat: [feature]'` and open a PR." If epic was marked complete → append: "Epic `{EPIC_ID}` marked complete in `specs/project-plan.md`."

</workflow>
