---
name: generate-checklist
description: "Generates requirements quality checklists ('Unit Tests for English') that validate quality, clarity, and completeness in a given domain. Use when running /sddp-checklist or when quality verification of requirements is needed."
---

# QA Engineer — Generate Checklist Workflow

<rules>
- Report compact progress at each major milestone: outcome, key delta, next step.
- Checklists test REQUIREMENTS QUALITY, not implementation behavior.
  - ✅ "Are error handling requirements defined for all API failure modes?" [Completeness]
  - ❌ "Verify the API returns proper error codes"
- Format: `- [ ] CHK### <question> [Quality Dimension, Spec §X.Y]`
- Each invocation creates a NEW checklist file (never overwrite).
- Soft cap: 40 items; merge near-duplicates. ≥80% must include traceability refs.
- Research industry quality standards — **Delegate: Technical Researcher**.
- Reuse `FEATURE_DIR/research.md`; refresh only domain-specific gaps.
</rules>

<workflow>

## 0. Acquire Shared Skills

Read `.github/skills/compact-communication/SKILL.md` for terse runtime communication rules, exact-preservation boundaries, and auto-clarity exceptions.

## 1. Resolve Context

**Delegate: Context Gatherer** in **quick mode** → resolve `FEATURE_DIR`.

- Require `HAS_SPEC = true` AND `HAS_PLAN = true`. If either false → ERROR: "Missing `[artifact]` at `FEATURE_DIR/[artifact]`. Run `[/sddp-specify or /sddp-plan]`."

## 2. Resolve Domain

Priority order:

### 2a. Explicit Domain (Highest Priority)

`$ARGUMENTS` contains clear domain (e.g., "security", "ux", "api", "performance") → set `DOMAIN`, skip to 2c.

### 2b. Checklist Queue (Auto-Select)

If no explicit domain:
1. Check `HAS_CHECKLIST_QUEUE` from Context Report.
2. If `true` → read `FEATURE_DIR/checklists/.checklists`.
3. Find first `- [ ] CHL\d{3} (.+)` → set `DOMAIN`, set `QUEUE_ENTRY_LINE`. Report: "Checklist queue: using next queued domain — **[DOMAIN]**".
   - No unchecked entries → skip to Step 6 with `QUEUE_EXHAUSTED = true`.
4. `HAS_CHECKLIST_QUEUE = false` → fall through to 2c.

### 2c. Interactive Clarification (Fallback)

**Autopilot guard (K1)**: `AUTOPILOT = true` and no domain resolved → use defaults without prompting. Log: "Autopilot: Checklist domain — using defaults". Skip to Step 3.

`AUTOPILOT = false` → ask up to 6 contextual questions (scope, risk, depth, audience, exclusions). Mark recommended options. Skip questions already unambiguous from `$ARGUMENTS`/`DOMAIN`.

Defaults (also autopilot defaults): Depth: Standard | Audience: Reviewer (PR) if code-related, Author otherwise | Focus: Top 2 relevance clusters.

## 3. Research Quality Standards

If `FEATURE_DIR/research.md` exists → reuse relevant standards, refresh only missing/weak/outdated domain guidance.

**Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`):
- **Topics**: Industry quality frameworks for domain (OWASP, WCAG, ISO 25010, etc.)
- **Context**: Feature spec, domain/focus areas from Step 2
- **Purpose**: "Ensure checklist items align with industry standards."
- **File Paths**: `FEATURE_DIR/spec.md`, `FEATURE_DIR/research.md` (if available)

Skip delegation if existing research fully covers domain/focus. When persisting: merge by topic into `FEATURE_DIR/research.md`, rewrite full file, plan-authoring format, max 2 sources/topic, ≤4KB (consolidate if >3KB).

## 4. Generate Checklist

**Delegate: Test Planner** (`.github/agents/_test-planner.md`) with:
- Feature Directory: `[FEATURE_DIR]`
- Domain: `[DOMAIN]`
- Focus Areas: `[FOCUS_AREAS]`
- Depth: `[DEPTH]`
- Audience: `[AUDIENCE]`

Planner reads files and creates checklist directly. Wait for JSON summary.

## 5. Auto-Evaluate Checklist

**Delegate: Test Evaluator** (`.github/agents/_test-evaluator.md`) with:
- `featureDir`: `[FEATURE_DIR]`
- `checklistPath`: File path from Step 4
- `autopilot`: `[AUTOPILOT]`

Evaluator: reads artifacts as evidence → evaluates each item → marks `[X]` for PASS → amends artifacts for RESOLVE → asks user for ASK. Wait for JSON summary.

## 5.5. Mark Queue Entry Complete

If domain from queue (Step 2b) → read `.checklists` → replace `QUEUE_ENTRY_LINE` with checked equivalent. Replacement fails → warn but don't fail workflow.

If domain NOT from queue → skip.

## 6. Report

**If `QUEUE_EXHAUSTED = true`**:
- "All queued checklist domains completed." List completed entries.
- Next steps:
  1. `/sddp-checklist <domain>` *(optional — additional beyond queue)* — suggested prompt
  2. `/sddp-tasks` *(required)* — suggested prompt
- Skip remaining report sections.

**Otherwise**, parse Generator (Step 4) and Evaluator (Step 5) JSON summaries.

Output:
- Checklist path, total items, focus areas, depth, audience
- **Evaluation**: auto-passed count, auto-resolved (list amended files), user-resolved, remaining unchecked
- List artifact amendments if any
- Remind: each invocation creates a new file
- Next steps:
  1. `/sddp-checklist` *(optional — different domain; queue auto-picks next if unchecked entries remain)* — suggested prompt
  2. `/sddp-tasks` *(required)* — suggested prompt

</workflow>
