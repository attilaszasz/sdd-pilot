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
- Research industry quality standards — **Delegate: Technical Researcher** (`.github/agents/_technical-researcher.md`).
- Reuse `FEATURE_DIR/research.md`; refresh only domain-specific gaps.
- Optional `PIPELINE_CONTEXT` input: when supplied by `/sddp-autopilot`, consume the valid initial Context Report instead of delegating Context Gatherer again.
</rules>

<workflow>

## 0. Acquire Shared Skills

## 1. Resolve Context

If `PIPELINE_CONTEXT` is supplied, reports `CONTEXT_BLOCKED` as `false`, has a non-empty `FEATURE_DIR`, and its `BRANCH` still matches the current branch when Git is available, run `node scripts/resolve-feature-dir.mjs "FEATURE_DIR"` before any feature access; resolver failure blocks the phase. Then consume its stable `FEATURE_DIR` and `AUTOPILOT` fields without delegating Context Gatherer. Re-check `spec.md`, `plan.md`, and the current checklist queue on disk.

If `PIPELINE_CONTEXT` is absent or invalid, **Delegate: Context Gatherer** (`.github/agents/_context-gatherer.md`) in **quick mode** with `autopilot=false` → resolve `FEATURE_DIR`.

- Require `HAS_SPEC = true` AND `HAS_PLAN = true`. If either false → ERROR: "Missing `[artifact]` at `FEATURE_DIR/[artifact]`. Run `[/sddp-specify or /sddp-plan]`."

## 2. Resolve Domain

Priority order:

### 2a. Explicit Domain (Highest Priority)

`$ARGUMENTS` contains clear domain (e.g., "security", "ux", "api", "performance") → set `DOMAIN`, skip to 2c.

### 2b. Checklist Queue (Auto-Select)

If no explicit domain:
1. Check the current `FEATURE_DIR/checklists/.checklists` file on disk. This live check overrides any `HAS_CHECKLIST_QUEUE` snapshot from Context Report.
2. If the queue exists → read `FEATURE_DIR/checklists/.checklists`.
3. Find first `- [ ] CHL\d{3} (.+)` → set `DOMAIN`, `QUEUE_ENTRY_ID`, and `QUEUE_ENTRY_LINE`. A malformed queue entry or an existing file not uniquely associated with its `CHL###` → **HALT**. Report: "Checklist queue: using next queued domain — **[DOMAIN]**".
   - No unchecked entries → skip to Step 6 with `QUEUE_EXHAUSTED = true`.
4. No current queue → fall through to 2c.

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

Select an immutable unique output path before delegation:
- Queued domain → `FEATURE_DIR/checklists/<CHL###>-<normalized-domain>.md` using the queue entry ID.
- Explicit/non-queued domain → `FEATURE_DIR/checklists/<normalized-domain>-<NNN>.md`, where `NNN` is one above the highest existing suffix for that domain (start `001`).
- Re-read the directory immediately before delegation. If a queued path already exists, run `node scripts/checklist-state.mjs --file "[CHECKLIST_PATH]"` before choosing a resume path:
  - `status: "EMPTY"` → this is an interrupted reservation with no durable `CHK###` IDs. Delegate Test Planner to regenerate at the same reserved path, then continue at Step 5.
  - `status: "VALID"` → treat it as an interrupted evaluated run: skip Test Planner, preserve its `CHK###` IDs/state, continue at Step 5, then mark the same queue entry complete.
  - `status: "MALFORMED"` → **HALT** without changing the queue. Report: "Checklist reservation is malformed at `[CHECKLIST_PATH]`. Remove the incomplete reservation only after confirming it contains no durable checklist content, then rerun `/sddp-checklist`." Do not overwrite or reuse the path automatically.
- For an explicit path collision, recompute once; if it then appears concurrently, halt without writing. Never overwrite or reuse a path for new content.

**Delegate: Test Planner** (`.github/agents/_test-planner.md`) with:
- Feature Directory: `[FEATURE_DIR]`
- Domain: `[DOMAIN]`
- Focus Areas: `[FOCUS_AREAS]`
- Depth: `[DEPTH]`
- Audience: `[AUDIENCE]`
- Output Path: `[CHECKLIST_PATH]`

Unless resuming an existing queued path, Planner reads files and creates the checklist directly. Wait for JSON summary.

## 5. Auto-Evaluate Checklist

**Delegate: Test Evaluator** (`.github/agents/_test-evaluator.md`) with:
- `featureDir`: `[FEATURE_DIR]`
- `checklistPath`: File path from Step 4
- `autopilot`: `[AUTOPILOT]`

Evaluator: reads artifacts as evidence → evaluates each item → marks `[X]` for PASS → amends artifacts for RESOLVE → asks user for ASK. Wait for JSON summary. `status` must be `"success"`, `checklistStatus` must be `"PASS"`, and any amended artifact validation must pass; otherwise leave the queue unchanged. **Autopilot guard (K2)**: on failure, malformed summary, or blocked evaluator, halt immediately without advancing phase.

## 5.5. Mark Queue Entry Complete

If domain from queue (Step 2b), only after Step 5 succeeds → re-read `.checklists` and run `node scripts/checklist-state.mjs "FEATURE_DIR"`. Require the original unchecked `QUEUE_ENTRY_LINE` for `QUEUE_ENTRY_ID`, exactly one matching non-empty PASS checklist file with `validity.status: "VALID"`, and no evaluator or validator failure. Atomically replace that exact line with its checked equivalent, then re-run `checklist-state.mjs`; require `overallStatus: "PASS"` or a valid remaining `queue.status: "PENDING"` with no malformed/stale relationship. Any changed line, replacement race, failed assessment, or malformed queue → **HALT** without checking the entry.

If domain NOT from queue → skip.

## 6. Report

**If `QUEUE_EXHAUSTED = true`**:
- "All queued checklist domains completed." List completed entries.
- Next steps:
  1. `/sddp-checklist <domain>` *(optional — additional beyond queue)* — suggested prompt
  2. `/sddp-tasks` *(required)* — suggested prompt
- Skip remaining report sections.

**Otherwise**, parse Generator (Step 4), Evaluator (Step 5), and final checklist-state JSON summaries. A FAIL/BLOCKED state has already halted and must never report a completed queue entry.

Output:
- Checklist path, total items, focus areas, depth, audience
- **Evaluation**: auto-passed count, auto-resolved (list amended files), user-resolved, remaining unchecked
- List artifact amendments if any
- Remind: each invocation creates a new file
- Next steps:
  1. `/sddp-checklist` *(optional — different domain; queue auto-picks next if unchecked entries remain)* — suggested prompt
  2. `/sddp-tasks` *(required)* — suggested prompt

</workflow>
