---
name: clarify-spec
description: "Clarify product, technical, and operational specs with targeted questions and write accepted answers into spec.md."
---

# Business Analyst — Clarify Spec Workflow

<rules>
- Report compact progress at major milestones: outcome, key delta, next step.
- Max 8 questions per session.
- Always use batch mode: present all questions in one numbered list; apply updates atomically.
- Each question: multiple-choice (2-5 options) or short answer (≤5 words), with recommended answer + rationale. Select-style prompts with free-text allowed.
- Write answers into `spec.md` atomically after all answers are collected.
- Never create `spec.md` — if missing, direct to `/sddp-specify`.
- Runs before `/sddp-plan`; warn when skipping increases rework risk.
- Reuse `FEATURE_DIR/research.md`; refresh only unresolved or materially changed areas.
- Delegate external research only to **Technical Researcher**.
- Optional `PIPELINE_CONTEXT` input: when supplied by `/sddp-autopilot`, consume the valid initial Context Report instead of delegating Context Gatherer again.
</rules>

<workflow>

## 0. Acquire Shared Skills

Use full prose when compression could weaken question meaning.

## 1. Resolve Context

If `PIPELINE_CONTEXT` is supplied, reports `CONTEXT_BLOCKED` as `false`, has a non-empty `FEATURE_DIR`, and its `BRANCH` still matches the current branch when Git is available, run `node scripts/resolve-feature-dir.mjs "FEATURE_DIR"` before any feature access; resolver failure blocks the phase. Then consume its stable `FEATURE_DIR` and `AUTOPILOT` fields without delegating Context Gatherer. Treat `HAS_SPEC` as a snapshot and re-check `FEATURE_DIR/spec.md` now.

If `PIPELINE_CONTEXT` is absent or invalid, **Delegate: Context Gatherer** (`.github/agents/_context-gatherer.md`) in **quick mode** with `autopilot=false` → resolve `FEATURE_DIR`.

- Require `HAS_SPEC = true`. If false → ERROR: "Missing spec.md at `FEATURE_DIR/spec.md`. Run `/sddp-specify`."
- Read `FEATURE_DIR/spec.md`. Read frontmatter; treat missing `spec_type` as `product`.

## 2. Scan for Ambiguities

**Delegate: Requirements Scanner** (`.github/agents/_requirements-scanner.md`):
- Provide `SpecPath = FEATURE_DIR/spec.md`.
- Use returned `coverage_status` and `questions` for active `spec_type`.

## 3. Reuse or Refresh Research

If `FEATURE_DIR/research.md` exists → read, map findings to ambiguity categories, reuse covered categories, refresh only unresolved/weak/changed ones.

If critical areas still lack support:

**Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
- **Topics**: Standards/patterns for unresolved ambiguity categories only
- **Context**: Feature spec, `spec_type`, detected ambiguities
- **Purpose**: "Strengthen recommended answers with evidence-based reasoning."
- **File Paths**: `FEATURE_DIR/spec.md`, `FEATURE_DIR/research.md` when present

Use findings to strengthen recommended answers.

When persisting: rewrite full `FEATURE_DIR/research.md`, merge by topic, plan-authoring research format, max 2 sources/topic, ≤4KB (consolidate if >3KB).

## 4. Select Questions

From `questions` → select up to 8 highest-impact items.

## 5. Ask Questions

### 5.0 Present Questions

- `AUTOPILOT = true` → auto-select recommended for every question. Log each as a `decision` row to `autopilot-log.md`: Timestamp=now, Phase=`Clarify`, Event=`decision`, Detail="Clarification Q[N]: '[question]'", Outcome="[answer]", Rationale="recommended default", Artifacts=`[spec.md](spec.md)`. Continue to Step 6.
- `AUTOPILOT = false` → present all questions in a single numbered list with marked recommendations. Allow free-form answers. Validate all responses, record, and continue to Step 6.

## 6. Integrate Answers

Update `spec.md` once after all answers are collected.

Per answer:
1. Ensure `## Clarifications` section exists.
2. Under `### Session YYYY-MM-DD`, append `- Q: <question> -> A: <answer>`.
3. Apply to best section:
   - Product functional/UX → `User Scenarios & Testing` or `Requirements`
   - Technical → `Technical Objectives`, `Requirements`, or `Integration Points`
   - Operational → `Operational Objectives`, `Requirements`, or `Integration Points`
   - Data → `Key Entities` when present
   - Non-functional → `Success Criteria` or relevant `Requirements` subsection with measurable targets
   - Scenario → acceptance/validation/verification criteria per `spec_type`
   - Terminology → normalize across spec
4. Replace invalidated statements; no contradictions.
5. Save atomically after each integration pass.

## 6.5. Adversarial Stress-Test

After collaborative answers are integrated, attack the resolved spec for internal contradictions.

**Delegate: Adversarial Scanner** (`.github/agents/_adversarial-scanner.md`):
- Provide `SpecPath = FEATURE_DIR/spec.md`.
- Extract every persisted `STF-###` ID from the live spec without changing or deduplicating it. Provide the ordered IDs as `ExistingFindingIds` and their maximum numeric suffix as `HighestFindingNumber` (`0` when empty); gaps are not reusable.
- Use returned `findings` array.
- If the scanner returns an error, any returned ID duplicates another returned ID, or any returned ID exists in `ExistingFindingIds`, halt without writing findings and report the collision. Never renumber or overwrite a persisted finding.

If `findings` is empty → skip to Step 7.

### 6.5.1 Present Findings

- `AUTOPILOT = true` → auto-accept recommended resolution for every finding.
  Log each as a `decision` row to `autopilot-log.md`: Timestamp=now, Phase=`Clarify`, Event=`decision`, Detail="Stress-test STF-### '[summary]'", Outcome="[resolution]", Rationale="recommended default", Artifacts=`[spec.md](spec.md)`.
  Apply resolutions inline. Continue to 6.5.2.
- `AUTOPILOT = false` → present all findings in a single numbered list.
  Each finding shows: ID, summary, category, severity, affected IDs, Given/When/Then scenario, recommended resolution.
  Allow user to accept, override, or defer each finding.

### 6.5.2 Write Findings

1. Ensure `## Stress-Test Findings` section exists in `spec.md` (after `## Clarifications` if present, else after `## Success Criteria`).
2. Under `### Session YYYY-MM-DD`, add each finding in `STF-###` format per the ambient `AGENTS.md` §Artifact Conventions rules, using the scanner-provided `summary` as the persisted summary text.
   Before writing, re-read the live spec and recheck all proposed IDs against every persisted `STF-###` ID and each other. Any collision halts the write atomically. A resolved prior finding keeps its existing ID and entry; a later session never recreates or renumbers it.
3. For each CRITICAL or HIGH finding the user did not resolve:
   - Count every literal unresolved `[NEEDS CLARIFICATION: ...]` marker in spec before each addition.
   - At counts 0, 1, or 2: add `[NEEDS CLARIFICATION: STF-###]` to the first affected spec entry in this priority order: requirement, success criterion, then user story/objective heading. If no affected ID maps cleanly to a concrete spec entry, append the marker to the finding entry itself.
   - At count 3 or greater: do NOT add another marker. Append `[DEFERRED TO NEXT CLARIFY]` to the finding entry for question management, warn with the exact marker count that another `/sddp-clarify` pass is required, and keep the finding unresolved. The maximum is 3; the marker cap never resolves, waives, or lowers its severity.
4. For accepted/overridden findings: apply resolution to the affected spec entries inline, same integration rules as Step 6 (replace invalidated statements, no contradictions).
5. Save atomically.

## 7. Validate

After each write verify:
- Clarifications section has one bullet per recorded answer
- Total questions ≤ 8
- Targeted vague placeholders resolved
- No contradictory statements remain
- Terminology consistent across updated sections
- Stress-Test Findings section (if present) has one entry per recorded finding
- Every CRITICAL/HIGH finding has an inline resolution. `[NEEDS CLARIFICATION: STF-###]` and `[DEFERRED TO NEXT CLARIFY]` only route unresolved work and never satisfy validation.
- Exact unresolved clarification-marker count is reported; counts 0 through 3 satisfy the ordinary-marker cap and count 4 or greater requires another clarification pass.

## 7.5. Update Spec Maturity

After successful clarification (at least one answer integrated):
- Update `spec_maturity` in frontmatter from `draft` to `clarified`
- Update the `**Spec Maturity**:` header field to match

## 8. Report

Output:
- Questions asked/answered count
- Stress-test findings count (resolved / deferred / total)
- Exact unresolved clarification-marker count and reason when it exceeds the maximum of 3
- Path to updated spec
- Sections touched
- Coverage summary table from updated `coverage_status`
- Whether outstanding items justify another `/sddp-clarify` pass
- Next steps:
  1. `/sddp-clarify` *(optional — if deferred items or stress-test findings justify another pass)* — suggested prompt. If deferred stress-test findings exist, suggest: "Focus on deferred stress-test findings STF-###, STF-###."
  2. `/sddp-plan` *(required)* — suggested prompt

</workflow>
