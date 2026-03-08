---
name: generate-checklist
description: "Generates requirements quality checklists ('Unit Tests for English') that validate quality, clarity, and completeness in a given domain. Use when running /sddp-checklist or when quality verification of requirements is needed."
---

# QA Engineer — Generate Checklist Workflow

<rules>
- Report progress at each major milestone
- Checklists test REQUIREMENTS QUALITY, not implementation behavior
- ✅ "Are error handling requirements defined for all API failure modes?" [Completeness]
- ❌ "Verify the API returns proper error codes"
- Each item: question format, quality dimension in brackets, spec reference
- Format: `- [ ] CHK### <question> [Quality Dimension, Spec §X.Y]`
- Each invocation creates a NEW checklist file (never overwrite existing)
- Soft cap: 40 items per checklist; merge near-duplicates
- ≥80% of items must include traceability references
- Research industry quality standards for the domain — **Delegate: Technical Researcher**
- Reuse existing `FEATURE_DIR/research.md` evidence where sufficient; refresh only domain-specific gaps
</rules>

<workflow>

## 1. Resolve Context

Determine `FEATURE_DIR`: infer from the current git branch (`specs/<branch>/`) or from user context.

**Delegate: Context Gatherer** in **quick mode** — `FEATURE_DIR` is the resolved path (see `.github/agents/_context-gatherer.md` for methodology).

- Require `HAS_SPEC = true` AND `HAS_PLAN = true`. If either false: ERROR — "Missing `[artifact]` at `FEATURE_DIR/[artifact]`. This file is created by `[/sddp-specify or /sddp-plan]`. Run the appropriate command to create it."

## 2. Resolve Domain

Determine the checklist domain using the following priority order:

### 2a. Explicit Domain (Highest Priority)

If `$ARGUMENTS` contains a clear domain indication (e.g., "security", "ux", "api", "performance"), use it as `DOMAIN` and skip to Step 2c.

### 2b. Checklist Queue (Auto-Select)

If no explicit domain was provided in `$ARGUMENTS`:
1. Check `HAS_CHECKLIST_QUEUE` from the Context Report.
2. If `true`: read `FEATURE_DIR/checklists/.checklists`.
3. Find the first line matching `- [ ] CHL\d{3} (.+)` (first unchecked entry).
   - If found: extract the domain name from the match group. Set `DOMAIN` to this value. Set `QUEUE_ENTRY_LINE` to the matched line (for marking in Step 5.5). Report to the user: "Checklist queue: using next queued domain — **[DOMAIN]**".
   - If no unchecked entries remain: skip directly to Step 6 (Report) with `QUEUE_EXHAUSTED = true`. The report will note that all queued domains are complete and suggest next steps.
4. If `HAS_CHECKLIST_QUEUE = false` (no queue file exists): fall through to Step 2c.

### 2c. Interactive Clarification (Fallback)

**Autopilot guard (K1)**: If `AUTOPILOT = true` and no domain was resolved from Steps 2a or 2b: Use the defaults below without prompting. Log to `FEATURE_DIR/autopilot-log.md`: "Autopilot: Checklist domain — using defaults (Depth: Standard, Audience: auto-detected, Focus: Top 2 clusters)". Skip the questions and proceed to Step 3.

If `AUTOPILOT = false` and no domain was resolved from Steps 2a or 2b, ask the user up to 6 contextual questions derived from the user's request and spec signals. Question archetypes:
- **Scope refinement**: include integration touchpoints or stay local?
- **Risk prioritization**: which risk areas need mandatory gating?
- **Depth calibration**: lightweight pre-commit or formal release gate?
- **Audience framing**: author-only or peer review during PR?
- **Boundary exclusion**: explicitly exclude certain areas?

Mark a **recommended** option for each question. Skip questions that are already unambiguous from `$ARGUMENTS` or the resolved `DOMAIN`.

Defaults if interaction impossible (also used as autopilot defaults):
- Depth: Standard
- Audience: Reviewer (PR) if code-related; Author otherwise
- Focus: Top 2 relevance clusters

## 3. Research Quality Standards

If `FEATURE_DIR/research.md` exists:
- Read and reuse standards already relevant to selected domain/focus areas.
- Refresh only missing, weak, or outdated domain guidance.

Before delegating, report to the user: "🔍 Researching quality standards for the selected domain — this may take 15–30 seconds."

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
- **Topics**: Industry-standard quality frameworks and checklists for the domain (e.g., OWASP Top 10 for security, WCAG for accessibility, ISO 25010 for general quality).
- **Context**: The feature spec and the domain/focus areas from Step 2.
- **Purpose**: "Ensure generated checklist items align with industry standards and cover domain-specific quality dimensions."
- **File Paths**: `FEATURE_DIR/spec.md`, `FEATURE_DIR/research.md` (if available)

If existing research fully covers the selected domain and focus areas, skip the delegation.

Pass the research findings to the checklist generator to inform item creation.
When persisting refreshed findings, merge by topic into `FEATURE_DIR/research.md` and rewrite the full file (do not append blindly). Enforce the plan-authoring research format, keep at most 2 sources per topic, and keep the file at or below 4KB (consolidate first if existing content is above 3KB).

## 4. Generate Checklist

**Delegate: Test Planner** (see `.github/agents/_test-planner.md` for methodology) with the following inputs:
- Feature Directory: `[FEATURE_DIR]`
- Domain: `[DOMAIN from arguments/questions]`
- Focus Areas: `[FOCUS_AREAS from questions]`
- Depth: `[DEPTH]`
- Audience: `[AUDIENCE]`

The planner will read the necessary files and create the checklist file directly.
Wait for the planner to return the JSON summary.

## 5. Auto-Evaluate Checklist

Immediately after generation, **Delegate: Test Evaluator** (see `.github/agents/_test-evaluator.md` for methodology) with:
- `featureDir`: `[FEATURE_DIR]`
- `checklistPath`: The file path returned by the Generator in Step 4
- `autopilot`: `[AUTOPILOT]` — pass through from Context Report

The evaluator will:
1. Read all feature artifacts as evidence.
2. Evaluate each checklist item against the evidence.
3. Mark items `[X]` that are already covered (PASS).
4. Amend artifacts (spec.md, plan.md, tasks.md, etc.) to resolve genuine gaps (RESOLVE).
5. Ask the user about items with ambiguous resolutions (ASK).

Wait for the evaluator to return its JSON summary.

## 5.5. Mark Queue Entry Complete

If the domain was resolved from the checklist queue (Step 2b):
1. Read `FEATURE_DIR/checklists/.checklists`.
2. Replace the `QUEUE_ENTRY_LINE` (e.g., `- [ ] CHL001 Security`) with its checked equivalent (`- [X] CHL001 Security`).
3. If the replacement fails (line not found or file changed), warn the user but do not fail the workflow.

If the domain was NOT from the queue (Steps 2a or 2c), skip this step.

## 6. Report

**If `QUEUE_EXHAUSTED = true`** (all queued checklist domains already completed):
- Output: "All queued checklist domains have been completed."
- List the completed queue entries from `.checklists` (all marked `[X]`).
- Suggest next steps with explicit labels:
  1. `/sddp-checklist <domain>` *(optional — specify an explicit domain to generate an additional checklist beyond the queue)* — compose a suggested prompt
  2. `/sddp-tasks` *(required — proceed to task generation)* — compose a suggested prompt
- Skip all other report sections below.

**Otherwise**, parse the JSON summaries from both the Generator (Step 4) and the Evaluator (Step 5).

Output:
- Full path to created checklist
- Total items generated (from Generator)
- Focus areas, depth level, audience
- **Evaluation results**:
  - Items auto-passed (already covered by artifacts)
  - Items auto-resolved (gaps fixed — list amended files)
  - Items resolved with user input
  - Items remaining unchecked (if any — explain what still needs attention)
- If any artifacts were amended, list the changes briefly
- Remind user each invocation creates a new file
- Suggest next steps with explicit labels — for each option, compose a useful suggested prompt for the user based on the current context:
  1. `/sddp-checklist` *(optional — run again for a different domain or focus area; if checklist queue has remaining unchecked entries, simply running `/sddp-checklist` will pick the next one automatically)* — compose a suggested prompt
  2. `/sddp-tasks` *(required)* — compose a suggested prompt

</workflow>
