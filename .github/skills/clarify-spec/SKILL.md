---
name: clarify-spec
description: "Clarify product, technical, and operational specs with targeted questions and write accepted answers into spec.md."
---

# Business Analyst — Clarify Spec Workflow

<rules>
- Report progress at major milestones.
- Max 8 questions per session.
- Ask the user to choose `sequential` (default) or `batch` before the first question, unless `AUTOPILOT = true`.
- Sequential mode: ask exactly one question at a time and never reveal later questions.
- Batch mode: ask all selected questions in one numbered list and apply updates atomically after answers.
- Each question must be multiple-choice (2-5 options) or short answer (≤5 words), with a recommended answer and rationale.
- Use select-style prompts with free-text allowed.
- Write accepted answers into `spec.md` immediately in sequential mode or in one atomic pass in batch mode.
- NEVER create `spec.md`; if it is missing, direct the user to `/sddp-specify`.
- This runs before `/sddp-plan`; warn when skipping clarification increases rework risk.
- Reuse `FEATURE_DIR/research.md` when possible; refresh only unresolved or materially changed ambiguity areas.
- Delegate external best-practice research only to **Technical Researcher**.
</rules>

<workflow>

## 1. Resolve Context

Determine `FEATURE_DIR` from the current git branch (`specs/<branch>/`) or user context.

**Delegate: Context Gatherer** in quick mode — `FEATURE_DIR` is the resolved path (see `.github/agents/_context-gatherer.md` for methodology).

- Require `HAS_SPEC = true`. If false: ERROR — `Missing spec.md at FEATURE_DIR/spec.md. Run /sddp-specify [brief feature description].`
- Read `FEATURE_DIR/spec.md`.
- Read frontmatter; treat missing `spec_type` as `product`.

## 2. Scan for Ambiguities

**Delegate: Requirements Scanner** (see `.github/agents/_requirements-scanner.md` for methodology).
- Provide `SpecPath = FEATURE_DIR/spec.md`.
- Use the returned `coverage_status` and `questions` relative to the active `spec_type`.

## 3. Reuse or Refresh Research

If `FEATURE_DIR/research.md` exists:
- Read it.
- Map findings to the ambiguity categories returned by the scanner.
- Reuse covered categories.
- Refresh only unresolved, weakly supported, or materially changed categories.

If critical ambiguity areas still lack support:
- Report: `Researching industry standards for open questions.`

  **Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md`):
  - **Topics**: standards, common patterns, and best practices relevant only to unresolved ambiguity categories
  - **Context**: the feature spec, active `spec_type`, and detected ambiguities
  - **Purpose**: "Strengthen recommended answers for clarification questions with evidence-based reasoning."
  - **File Paths**: `FEATURE_DIR/spec.md`, `FEATURE_DIR/research.md` when present

Use findings to strengthen recommended answers.

When persisting refreshed findings:
- rewrite the full `FEATURE_DIR/research.md`
- merge by topic instead of appending
- follow the plan-authoring research format
- keep max 2 sources/topic
- keep the file at or below 4KB; consolidate first if it exceeds 3KB

## 4. Select Questions

From `questions`, select up to 8 highest-impact items. If fewer exist, use all of them.

## 5. Ask Questions

### 5.0 Mode Selection

If `AUTOPILOT = true`:
- force `CLARIFY_MODE = batch`
- log to `FEATURE_DIR/autopilot-log.md`: `Autopilot: Clarify mode -> batch (auto-selected)`

If `AUTOPILOT = false`, ask:
- **Header**: `Clarify Mode`
- **Question**: `I have [N] clarification questions. How would you like to proceed?`
- **Options**:
  - `One at a time` — update the spec after each answer (recommended for complex features)
  - `All at once` — present all questions together and update the spec in one pass
- Store `CLARIFY_MODE` as `sequential` or `batch`.

### 5.1 Sequential Mode

Ask one question at a time:
- mark the recommended option for multiple-choice questions
- allow free-form input
- if the user answers `yes` or `recommended`, apply the recommended option
- validate the answer against the options or stated constraints
- record it in working memory

Stop asking when:
- all critical ambiguities are resolved
- the user says `done` or `no more`
- 8 questions have been asked

### 5.2 Batch Mode

If `AUTOPILOT = true`:
- do not present the questions
- auto-select the recommended option for every question
- log each answer to `FEATURE_DIR/autopilot-log.md` as `Autopilot: Clarification Q[N] '[question]' -> recommended: [answer]`
- continue to Step 6

If `AUTOPILOT = false`:
- present all selected questions in one numbered list
- show options with the recommended one marked
- allow free-form input
- validate every answer
- record all answers, then continue to Step 6

## 6. Integrate Answers

- Sequential mode: update `spec.md` after each accepted answer.
- Batch mode: update `spec.md` once after all answers are collected.

For each answer, update `spec.md`:

1. Ensure `## Clarifications` exists.
2. Under `### Session YYYY-MM-DD` (today), append `- Q: <question> -> A: <answer>`.
3. Apply the clarification to the best section:
  - product functional or UX ambiguity -> `User Scenarios & Testing` or `Requirements`
  - technical capability ambiguity -> `Technical Objectives`, `Requirements`, or `Integration Points`
  - operational capability ambiguity -> `Operational Objectives`, `Requirements`, or `Integration Points`
  - data ambiguity -> `Key Entities` when present
  - non-functional ambiguity -> `Success Criteria` or the relevant subsection under `Requirements` with measurable targets
  - scenario ambiguity -> acceptance, validation, or verification criteria appropriate to `spec_type`
  - terminology ambiguity -> normalize terminology across the spec
4. Replace invalidated earlier statements; do not leave contradictions.
5. Save atomically after each integration pass.

## 7. Validate

After each write:
- the Clarifications section has one bullet per recorded answer
- total questions asked ≤ 8
- targeted vague placeholders are resolved
- no contradictory earlier statements remain
- terminology is consistent across updated sections

## 8. Report

Output:
- number of questions asked and answered
- path to the updated spec
- sections touched
- coverage summary table using updated `coverage_status`
- whether outstanding or deferred items justify another `/sddp-clarify` pass before `/sddp-plan`
- Suggest next steps with explicit labels:
  1. `/sddp-clarify` *(optional — only if outstanding or deferred items justify another pass)* — include a suggested prompt
  2. `/sddp-plan` *(required)* — include a suggested prompt grounded in the current spec

</workflow>
