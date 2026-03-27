---
name: clarify-spec
description: "Clarify product, technical, and operational specs with targeted questions and write accepted answers into spec.md."
---

# Business Analyst — Clarify Spec Workflow

<rules>
- Report progress at major milestones.
- Max 8 questions per session.
- Mode choice (`sequential` default / `batch`) before first question, unless `AUTOPILOT = true`.
- Sequential: one question at a time; never reveal later questions.
- Batch: all questions in one numbered list; apply updates atomically.
- Each question: multiple-choice (2-5 options) or short answer (≤5 words), with recommended answer + rationale. Select-style prompts with free-text allowed.
- Write answers into `spec.md` immediately (sequential) or atomically (batch).
- Never create `spec.md` — if missing, direct to `/sddp-specify`.
- Runs before `/sddp-plan`; warn when skipping increases rework risk.
- Reuse `FEATURE_DIR/research.md`; refresh only unresolved or materially changed areas.
- Delegate external research only to **Technical Researcher**.
</rules>

<workflow>

## 1. Resolve Context

**Delegate: Context Gatherer** in **quick mode** → resolve `FEATURE_DIR`.

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

### 5.0 Mode Selection

- `AUTOPILOT = true` → force `CLARIFY_MODE = batch`, log to `FEATURE_DIR/autopilot-log.md`.
- `AUTOPILOT = false` → ask: "I have [N] clarification questions. How would you like to proceed?" Options: `One at a time` (recommended for complex) | `All at once`. Store as `sequential` or `batch`.

### 5.1 Sequential Mode

Ask one question at a time:
- Mark recommended option; allow free-form input.
- `yes` or `recommended` → apply recommended option.
- Validate answer; record in working memory.

Stop when: all critical ambiguities resolved, user says `done`/`no more`, or 8 questions asked.

### 5.2 Batch Mode

- `AUTOPILOT = true` → auto-select recommended for every question, log each to `autopilot-log.md`: "Autopilot: Clarification Q[N] '[question]' -> recommended: [answer]". Continue to Step 6.
- `AUTOPILOT = false` → present all questions with marked recommendations, allow free-form, validate all, record, continue to Step 6.

## 6. Integrate Answers

- Sequential → update `spec.md` after each answer.
- Batch → update `spec.md` once after all collected.

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

## 7. Validate

After each write verify:
- Clarifications section has one bullet per recorded answer
- Total questions ≤ 8
- Targeted vague placeholders resolved
- No contradictory statements remain
- Terminology consistent across updated sections

## 8. Report

Output:
- Questions asked/answered count
- Path to updated spec
- Sections touched
- Coverage summary table from updated `coverage_status`
- Whether outstanding items justify another `/sddp-clarify` pass
- Next steps:
  1. `/sddp-clarify` *(optional — only if deferred items justify another pass)* — suggested prompt
  2. `/sddp-plan` *(required)* — suggested prompt

</workflow>
