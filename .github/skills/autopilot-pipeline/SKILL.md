---
name: autopilot-pipeline
description: "Orchestrates the full feature-delivery SDD pipeline end-to-end without user interaction. Requires Autopilot enabled in config, a Product Document, and a Technical Context Document. Use when running /sddp-autopilot."
---

# Autopilot Pipeline Orchestrator

<rules>
- This workflow orchestrates ALL SDD phases in a single uninterrupted turn — it does **not** duplicate sub-skill logic. It loads and executes each sub-skill inline.
- **AUTOPILOT = true** is always set for every sub-skill invocation.
- **NEVER yield control to the user** between phases — this runs as one continuous turn until QC passes or a halt condition is reached.
- `$ARGUMENTS` MUST contain a feature description — cannot run without it.
- Both Product Document and Technical Context Document are mandatory prerequisites.
- This pipeline starts at feature delivery. It does **not** execute project-bootstrap phases like `/sddp-prd`, `/sddp-systemdesign`, or `/sddp-init`.
- Report progress at each phase boundary.
- **Halt conditions** are strictly defined below — no other conditions should stop the pipeline.
- **Artifact conventions** (`.github/skills/artifact-conventions/SKILL.md`): All artifact rules from all sub-skills apply.
- Write all automatic decisions to `FEATURE_DIR/autopilot-log.md`.
</rules>

<workflow>

## 1. Gate Check

### 1a. Config & Feature Setup

1. Read `.github/sddp-config.md` if it exists.
2. If the default project PRD exists at `specs/prd.md` and `.github/sddp-config.md` either does not exist or has an empty `## Product Document` → `**Path**:` field:
   - Create or update `.github/sddp-config.md` and set the Product Document path to `specs/prd.md`.
   - This preserves the canonical registration flow rather than introducing a parallel discovery mechanism.
3. If the default project SAD exists at `specs/sad.md` and `.github/sddp-config.md` either does not exist or has an empty `## Technical Context Document` → `**Path**:` field:
   - Create or update `.github/sddp-config.md` and set the Technical Context Document path to `specs/sad.md`.
   - This preserves the canonical registration flow rather than introducing a parallel discovery mechanism.
4. Parse `.github/sddp-config.md` → `## Autopilot` → `**Enabled**:` value.
5. If `false` or not found → **HALT**: "Autopilot is disabled. Set `**Enabled**: true` in `.github/sddp-config.md` under `## Autopilot`."
6. If `$ARGUMENTS` is empty → **HALT**: "A feature description is required. Usage: `/sddp-autopilot <feature description>`"
7. **Delegate: Context Gatherer** in **full mode** with `autopilot=true` and `naming_seed=$ARGUMENTS` — resolves `FEATURE_DIR`, `PRODUCT_DOC`, `TECH_CONTEXT_DOC`, and all context fields.
8. If `CONTEXT_BLOCKED = true` from Context Report → **HALT**: "[BLOCKING_REASON] Fix the issue, then re-run `/sddp-autopilot <feature description>`."

### 1b. Document Gate

Both documents are required. If either fails → **HALT**.

**Product Document:**
1. Check `HAS_PRODUCT_DOC` from Context Report.
2. If `false` → **HALT**: "Autopilot requires a Product Document. Run `/sddp-prd` to create the canonical `specs/prd.md`, or register an existing product document in `.github/sddp-config.md` under `## Product Document` → `**Path**:`."
3. If `true` → read file at `PRODUCT_DOC` path.
4. If unreadable → **HALT**: "Product Document at `[path]` cannot be read."
5. **Sufficiency check** — verify ≥3 of 5 content categories have substantive content (case-insensitive keyword search):
   - **Product vision/purpose**: `goal`, `vision`, `purpose`, `problem`, `objective`, `mission`
   - **Target audience/actors**: `user`, `customer`, `persona`, `actor`, `stakeholder`, `audience`, `role`
   - **Domain context**: ≥2 distinct domain-specific terms (terms that would not appear in a generic document)
   - **Scope/boundaries**: `scope`, `in scope`, `out of scope`, `boundary`, `constraint`, `limitation`
   - **Success measures**: `KPI`, `metric`, `success`, `measure`, `outcome`, `target`
6. If <3 categories pass → **HALT**: "Product Document insufficient for autopilot. Missing categories: [list]. Add content for at least 3 of 5 categories, or run `/sddp-prd` to generate a fuller canonical PRD at `specs/prd.md`."

**Technical Context Document:**
1. Check `HAS_TECH_CONTEXT_DOC` from Context Report.
2. If `false` → **HALT**: "Autopilot requires a Technical Context Document. Run `/sddp-systemdesign` to create the canonical `specs/sad.md`, or register an existing technical context document in `.github/sddp-config.md` under `## Technical Context Document` → `**Path**:`."
3. If `true` → read file at `TECH_CONTEXT_DOC` path.
4. If unreadable → **HALT**: "Technical Context Document at `[path]` cannot be read."
5. **Sufficiency check** — verify ≥3 of 5 content categories have substantive content (case-insensitive keyword search):
   - **Language/runtime**: `language`, `runtime`, `python`, `node`, `typescript`, `go`, `rust`, `java`, `C#`, `.net`, `ruby`, `version`
   - **Framework/libraries**: `framework`, `react`, `vue`, `angular`, `express`, `fastapi`, `django`, `spring`, `next`, `library`, `dependency`
   - **Storage/database**: `database`, `storage`, `postgres`, `mysql`, `mongo`, `redis`, `cosmos`, `sqlite`, `dynamodb`, `supabase`, `firebase`
   - **Infrastructure/deployment**: `deploy`, `hosting`, `cloud`, `aws`, `azure`, `gcp`, `docker`, `kubernetes`, `vercel`, `CI`, `CD`
   - **Architecture/patterns**: `architecture`, `monolith`, `microservice`, `serverless`, `REST`, `GraphQL`, `event-driven`, `MVC`, `pattern`, `layer`
6. If <3 categories pass → **HALT**: "Technical Context Document insufficient for autopilot. Missing categories: [list]. Add content for at least 3 of 5 categories, or run `/sddp-systemdesign` to generate a fuller project SAD at `specs/sad.md`."

### 1c. Feature Complete Check

If `FEATURE_COMPLETE = true` from Context Report → **HALT**: "Feature at `FEATURE_DIR` is already complete (`.qc-passed` exists). Create a new branch for a new feature."

### 1d. Initialize Audit Log

Create `FEATURE_DIR/autopilot-log.md`:

```markdown
# Autopilot Decision Log

> Auto-generated. Records every automatic decision made during autopilot execution.

| Timestamp | Phase | Decision Point | Chosen Value | Rationale |
|-----------|-------|---------------|--------------|-----------|
```

Log gate check results: config verified, documents validated, feature directory resolved.

## 2. Pipeline Execution

Execute phases sequentially. For each phase: report start → load and execute the phase's SKILL.md inline → verify expected output artifact exists → log phase summary to `autopilot-log.md` → continue.

**Phase pipeline:**

### Phase 1: Specify
- Report: "═══ Phase 1/7: Specify ═══"
- Load and execute `.github/skills/specify-feature/SKILL.md` with `$ARGUMENTS` as the feature description.
- **Verify**: `FEATURE_DIR/spec.md` exists after execution.
- If missing → **HALT**: "Specify phase did not produce spec.md."

### Phase 2: Clarify
- Report: "═══ Phase 2/7: Clarify ═══"
- Load and execute `.github/skills/clarify-spec/SKILL.md`.
- **Verify**: `FEATURE_DIR/spec.md` still exists (clarify updates it in-place).

### Phase 3: Plan
- Report: "═══ Phase 3/7: Plan ═══"
- Load and execute `.github/skills/plan-feature/SKILL.md`.
- **Verify**: `FEATURE_DIR/plan.md` exists after execution.
- If missing → **HALT**: "Plan phase did not produce plan.md."

### Phase 4: Checklist (loop)
- Report: "═══ Phase 4/7: Checklist ═══"
- If `FEATURE_DIR/checklists/.checklists` exists:
  - Loop: invoke `.github/skills/generate-checklist/SKILL.md` repeatedly.
  - Each invocation picks the next unchecked `CHL###` entry from `.checklists`.
  - Continue until the checklist skill reports `QUEUE_EXHAUSTED = true`.
  - Report after loop: "Generated and evaluated [N] checklists."
- If no `.checklists` file exists: Report "No checklist queue — skipping." and continue.

### Phase 5: Tasks
- Report: "═══ Phase 5/7: Tasks ═══"
- Load and execute `.github/skills/generate-tasks/SKILL.md`.
- **Verify**: `FEATURE_DIR/tasks.md` exists after execution.
- If missing → **HALT**: "Tasks phase did not produce tasks.md."

### Phase 6: Analyze
- Report: "═══ Phase 6/7: Analyze ═══"
- Load and execute `.github/skills/analyze-compliance/SKILL.md`.
- The A1 autopilot guard ensures analysis runs then auto-applies all remediations.
- **HALT check**: If any CRITICAL finding is a `project-instructions.md` violation → **HALT**: "CRITICAL project instructions violation found during analysis. Manual resolution required."
- **Verify**: `FEATURE_DIR/analysis-report.md` exists after execution.

### Phase 7: Implement + QC
- Report: "═══ Phase 7/7: Implement + QC ═══"
- Load and execute `.github/skills/implement-qc-loop/SKILL.md`.
- This runs the implement → QC loop (up to 10 iterations).
- **Verify**: `FEATURE_DIR/.qc-passed` exists after execution.
- If `.qc-passed` missing and loop exhausted (10 iterations) → record as HALTED.
- If `manual-test.md` was generated → record as HALTED (requires human verification).

## 3. Halt Conditions

The pipeline stops immediately for any of these:
1. **CRITICAL `project-instructions.md` violation** — at any phase, from any Policy Auditor check or Analyze phase.
2. **Implement-QC loop exhausted** — 10 iterations without QC passing.
3. **`manual-test.md` generated** — QC determined that manual verification is required.
4. **Gate artifact missing** — a phase that should produce an artifact did not.
5. **Feature already complete** — `.qc-passed` already existed at start.
6. **Document sufficiency failure** — Product or Technical Context Document didn't meet the threshold.
7. **Context resolution failure** — detached HEAD or another blocking git/repository error prevented feature directory resolution.

When halting:
- If `FEATURE_DIR` is available, log the halt reason to `autopilot-log.md`.
- If `FEATURE_DIR` is not available yet, skip log creation and report the halt directly to the user.
- Report the halt to the user with: phase where it halted, reason, and guidance for manual resolution.
- Proceed to the Final Report (Step 4).

## 4. Final Report

After the pipeline completes (all phases pass) or halts, generate and display:

```markdown
## Autopilot Run Summary

**Feature**: [FEATURE_DIR or unresolved]
**Status**: PASSED | HALTED at [phase]
**Phases completed**: [N]/7

| Phase | Status | Key Output |
|-------|--------|------------|
| Specify | ✓/✗ | spec.md |
| Clarify | ✓/✗ | spec.md updated ([N] questions auto-resolved) |
| Plan | ✓/✗ | plan.md [, data-model.md, contracts/] |
| Checklist | ✓/✗/⊘ | [N] checklists generated and evaluated |
| Tasks | ✓/✗ | tasks.md ([N] tasks) |
| Analyze | ✓/✗ | [N] findings, [N] auto-remediated |
| Implement+QC | ✓/✗ | [N] iterations, QC verdict: [PASS/FAIL] |

**Autopilot decisions**: [N] (see autopilot-log.md if created)
**Artifacts**: [list of generated artifacts with ✓/✗]
```

If HALTED: Include the halt reason, the phase where it occurred, and specific guidance for manual resolution (e.g., "Fix the CRITICAL PI violation in spec.md, then re-run `/sddp-autopilot`" or "Check out a branch, then re-run `/sddp-autopilot <feature description>`").

If PASSED: "Feature is verified and ready for release. Run `git add . && git commit -m 'feat: [feature]'` and open a PR."

</workflow>
