---
name: analyze-compliance
description: "Performs non-destructive cross-artifact consistency and quality analysis across spec, plan, and tasks. Also supports remediation mode to apply fixes. Use when running /sddp-analyze or when compliance auditing is needed."
---

# Compliance Auditor — Analyze Compliance Workflow

<rules>
- Report progress at each major milestone
- **READ-ONLY during analysis**: Do NOT modify files during analysis passes (steps 0–6). Write actions are reserved exclusively for **remediation mode** (step 7).
- Project instructions conflicts are automatically CRITICAL severity
- Maximum 50 findings; aggregate remainder in overflow summary
- Offer remediation suggestions during analysis; apply them **only** in remediation mode
- This command MUST run only after `/sddp-tasks` has produced tasks.md
</rules>

<workflow>

## Mode Detection

Before starting, check if the user's prompt matches the remediation trigger (contains "Apply all suggested remediation changes from the analysis report").

- **If YES → Remediation Mode**: Skip steps 0–6 entirely. Jump directly to **Step 7 (Remediation Execution)**.
- **If NO → Analysis Mode**: Proceed with steps 0–6 as normal, then offer remediation in step 7.

## 0. Acquire Skills (Analysis Mode only)

This step is skipped in Remediation Mode (which jumps to Step 7).

Read `.github/skills/quality-assurance/SKILL.md` to understand the Analysis Heuristics and Definition of Done.
Read `.github/skills/artifact-conventions/SKILL.md` to understand the preservation, format, and section rules for spec artifacts.
Adhere strictly to these heuristics and conventions when identifying inconsistencies.

## 1. Resolve Context

Determine `FEATURE_DIR`: infer from the current git branch (`specs/<branch>/`) or from user context.

**Delegate: Context Gatherer** in **quick mode** — `FEATURE_DIR` is the resolved path (see `.github/agents/_context-gatherer.md` for methodology).
- Require `HAS_SPEC`, `HAS_PLAN`, `HAS_TASKS` all `true`. If any false: ERROR — "Missing `[artifact]` at `FEATURE_DIR/[artifact]`. This file is created by `[/sddp-specify, /sddp-plan, or /sddp-tasks]`. Run the appropriate command to create it."
- Get the paths for `spec.md`, `plan.md`, and `tasks.md`.

## 2. Parallel Detection Passes

Use specialized roles to analyze specific quality dimensions.

### A. Spec Quality & Readiness

**Delegate: Spec Validator** (see `.github/agents/_spec-validator.md` for methodology):
- `SpecPath`: `FEATURE_DIR/spec.md`
- `ChecklistPath`: null (Run in **read-only mode**, do NOT generate a checklist file).
- Request a report on:
  - Duplication or near-duplicate requirements.
  - Ambiguity (vague adjectives, placeholders).
  - Underspecification.

### B. Instructions Compliance

**Delegate: Policy Auditor** (see `.github/agents/_policy-auditor.md` for methodology):
- `ArtifactPath`: `FEATURE_DIR/plan.md`
- (The auditor implicitly checks against `project-instructions.md`).
- Request a report on strict MUST/SHOULD principles compliance.

## 3. Local Cross-Artifact Analysis

While detection passes run (or after they return), perform the specific cross-artifact checks that only you can do.

Load `spec.md` (or use validation summary).

**Delegate: Task Tracker** (see `.github/agents/_task-tracker.md` for methodology):
- `FEATURE_DIR`: The feature directory path.
- Get structured `TASK_LIST`.

### C. Coverage Gaps
- **Requirement-to-Task**: Map every `FR-###` requirement in `spec.md` to tasks in `TASK_LIST` using the `{FR-###}` tags in each task.
  - Use `requirements` field from the Task Tracker's structured output for exact matching — do NOT rely on fuzzy description matching.
  - Flag any `FR-###` that has no task with a matching `{FR-###}` tag.
- **Task-to-Requirement**: Flag tasks that have no `{FR-###}` tag and are not in Setup/Foundational/Polish phases (potential gold-plating). Treat Setup/Foundational/Polish as optional phases that may be absent.
- **Non-Functional**: Verify NFRs have corresponding tasks (e.g., "Performance" -> "Load test task").

### D. Consistency Check
- **Terminology**: Check if `TASK_LIST` descriptions use different terms than `spec.md`.
- **Phasing**: Ensure `TASK_LIST` phases match `plan.md` architectural dependencies.
- **File Paths**: Verify that file paths in task descriptions match the project structure defined in `plan.md`'s Source Code section. Flag mismatches as MEDIUM severity.

### E. Artifact Convention Compliance

Read `.github/skills/artifact-conventions/SKILL.md` for the full rule set, then verify:

#### ID Integrity
- **Task IDs**: Verify all `T###` IDs in `tasks.md` are sequential and none are missing or duplicated
- **Requirement IDs**: Verify all `FR-###` IDs in `spec.md` are sequential and none are missing or duplicated
- **Success Criteria IDs**: Verify all `SC-###` IDs in `spec.md` are sequential and none are missing or duplicated
- **Checklist IDs**: If checklist files exist, verify all `CHK###` IDs are sequential and none are missing or duplicated

#### Priority Ordering
- **User story priorities**: Verify P1/P2/P3 assignments in `spec.md` appear in ascending order (P1 before P2 before P3) and have not been reordered from any prior version (if version history is available in context)

#### Marker Integrity
- **NEEDS CLARIFICATION**: Scan all artifacts for `[NEEDS CLARIFICATION]` markers. Flag any that appear to have been silently removed (marker referenced in one artifact but absent from another where it should still exist)

#### Required Sections
- **spec.md**: Verify mandatory sections exist: User Scenarios & Testing, Requirements, Success Criteria
- **plan.md**: Verify the **Instructions Check** section exists and the **Technical Context** metadata block is present
- **tasks.md**: Verify the **Dependencies** section exists and that any present phase headers follow the allowed order. Setup, Foundational, and Polish may be omitted when intentionally empty. A `Phase: Bug Fixes` section appended by `/sddp-qc` is also valid and always appears after the last existing phase.

#### Checkbox State
- Cross-reference checkbox states in `tasks.md` with task completion evidence. Flag any `[X]` tasks that lack corresponding implementation artifacts (files not found or empty)

#### Format Compliance
- Verify tasks follow the format: `- [ ] T### [P?] [US#?] {FR-###?} Description with file path`
- Verify requirements follow: `FR-###: System MUST [specific capability]`
- Verify success criteria follow: `SC-###: [Measurable, technology-agnostic outcome]`
- Verify checklist items follow: `- [ ] CHK### <question> [Quality Dimension, Spec §X.Y]`

#### Severity Classification
| Violation | Severity |
|-----------|----------|
| Changed or removed a cross-referenced ID (T###, FR-###, SC-###, CHK###) | **CRITICAL** |
| Reordered user story priorities without approval | **CRITICAL** |
| Removed a required section (Instructions Check, Dependencies) | **CRITICAL** |
| Silently removed `[NEEDS CLARIFICATION]` marker | **HIGH** |
| Reversed checkbox state (`[X]` → `[ ]`) without approval | **HIGH** |
| `[X]` task with no corresponding implementation artifact | **HIGH** |
| Added unauthorized top-level section to spec.md | **MEDIUM** |
| Format deviation from structural contracts | **MEDIUM** |

## 4. Severity Assignment

| Severity | Criteria |
|----------|----------|
| **CRITICAL** | Violates project instructions (from Auditor), missing core artifact, zero-coverage requirement blocking baseline, changed/removed cross-referenced ID (T###, FR-###, SC-###, CHK###), reordered priorities without approval, removed required section (Instructions Check, Dependencies) |
| **HIGH** | Duplicate/conflicting requirement (from Validator), ambiguous security/performance, untestable criterion, silently removed `[NEEDS CLARIFICATION]` marker, reversed checkbox state without approval, `[X]` task with no implementation artifact |
| **MEDIUM** | Terminology drift, missing non-functional coverage, underspecified edge case, unauthorized section added to spec.md, format deviation from structural contracts |
| **LOW** | Style/wording improvements, minor redundancy |

## 5. Produce Analysis Report

Synthesize the outputs from Spec Validator, Policy Auditor, and your own Coverage/Consistency checks into a single report.

Write the complete analysis report to `FEATURE_DIR/analysis-report.md`. Then output a summary Markdown report:

### Findings Table
| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
*(Combine findings from all sources)*

### Quality Summaries
- **Spec Quality**: Summary from Spec Validator (Score, key issues).
- **Compliance**: Summary from Auditor (Pass/Fail status).

### Coverage Summary
| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|

### Instructions Alignment Issues (if any)

### Unmapped Tasks (if any)

### Metrics
- Total Requirements, Total Tasks, Coverage %, Critical Issues Count

## 6. Next Actions

- CRITICAL issues: recommend resolving before `/sddp-implement`
- LOW/MEDIUM only: user may proceed with improvement suggestions
- Suggest specific commands: `/sddp-specify` for refinement, `/sddp-plan` for architecture changes, manual edits for tasks.md coverage
- Suggest next step: `/sddp-implement` *(required)* — compose a useful suggested prompt for the user based on the current context

## 7. Remediation

This step behaves differently depending on the detected mode.

### Autopilot guard (A1)

If `AUTOPILOT = true` and the current mode is **Analysis Mode** (not already a remediation re-invocation):
- After the analysis report is generated (Steps 0–6), **immediately enter Remediation Mode** without waiting for user re-invocation.
- Apply ALL recommended fixes regardless of severity (CRITICAL, HIGH, MEDIUM, LOW).
- Skip findings that require user judgment — log them to `FEATURE_DIR/autopilot-log.md`: "Autopilot: Analyze — [N] findings auto-remediated, [M] skipped (require user judgment)".
- Do NOT present the "re-invoke" prompt. Proceed directly to remediation execution below, then continue to next pipeline phase.

### Analysis Mode (default, when AUTOPILOT = false)

Present the analysis report (from step 5) and end with:

> "To automatically apply all suggested remediation changes, re-invoke this agent with the prompt: **Apply all suggested remediation changes from the analysis report**"

Do **NOT** modify any files in this mode.

### Remediation Mode (via specific prompt)

When invoked with the remediation prompt, the conversation already contains a prior analysis report.

1. **Acquire Conventions**: Read `.github/skills/artifact-conventions/SKILL.md` to understand preservation, format, and section rules before applying edits. (Step 0 was skipped in Remediation Mode, so this ensures convention awareness.)
2. **Resolve Context**: Use the Context Gatherer role to get `FEATURE_DIR` and artifact paths.
3. **Parse Prior Report**: Read `FEATURE_DIR/analysis-report.md` to extract all findings and their recommendations. If the file is missing, attempt to parse from conversation context as a fallback.
4. **Apply Fixes**: For each finding that has an actionable recommendation:
   - Read the target file(s) referenced in the finding's Location(s).
   - Apply the recommended edit.
   - Record what was changed.
   - Skip findings that are informational-only or require user judgment (flag them as skipped).
5. **Produce Remediation Summary**:

| # | Finding ID | Severity | File(s) Modified | Change Applied | Status |
|---|-----------|----------|-----------------|----------------|--------|
| 1 | ... | ... | ... | ... | Applied / Skipped |

6. **Report**: State how many findings were remediated vs. skipped, and why any were skipped.
7. **Next Step**: Suggest proceeding to `/sddp-implement` if all CRITICAL/HIGH issues are resolved — compose a useful suggested prompt for the user based on the current context.

</workflow>
