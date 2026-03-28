---
name: quality-control
description: "Executes Quality Control checks. It evaluates requirements, runs static analysis, executes tests, and feeds bug tasks back into the implementation loop if any check fails."
---

# Quality Assurance — Quality Control Workflow

<rules>
- Report progress at each major milestone.
- Require `.completed` marker in `FEATURE_DIR` → halt with gate failure error template if missing.
- Execute QC for real. Never simulate outcomes, invent evidence, or create `.qc-passed` for estimated/simulated success.
- If QC actions cannot run for real → follow FAIL/SKIPPED/manual-test paths. Never claim success.
- Never install missing dependencies without user confirmation (unless `AUTOPILOT = true`). If declined → mark checks skipped.
- PASS → generate `.qc-passed`, yield control.
- FAIL → log `[BUG]` tasks in `tasks.md`, remove `.completed`, yield control, suggest `/sddp-implement`.
- **Artifact conventions** (`.github/skills/artifact-conventions/SKILL.md`): Preserve all existing IDs, phase headers, Dependencies section. Increment from highest T### for new BUG tasks.
- **Browser runtime**: Prefer built-in browser tools over Playwright/Cypress for interactive validation when available.
- **Manual fallback**: Generate `manual-test.md` if all automated/browser tools insufficient.
</rules>

<workflow>

## 1. Context Check & Re-run Detection

**Delegate: Context Gatherer** in **quick mode** → resolve `FEATURE_DIR`.

### Gate: `.completed` marker

If `FEATURE_DIR/.completed` missing → halt with gate failure error:
1. **What**: "Missing `.completed` marker at `FEATURE_DIR/.completed`"
2. **Cause**: "Implementation phase not finished. Marker created by `/sddp-implement`."
3. **Fix**: "`/sddp-implement`"

### Gate: tasks complete

Read `FEATURE_DIR/tasks.md` → if any `- [ ]` remain (excluding `[DEFERRED]` tasks) → halt with gate failure error:
1. **What**: "Unchecked tasks in `FEATURE_DIR/tasks.md` despite `.completed` present"
2. **Cause**: "Implementation incomplete or `.completed` marker stale."
3. **Fix**: "`/sddp-implement`"

### Re-run Scoping

Prior `qc-report.md` exists:
1. Read prior verdict + section statuses
2. `CHANGED_FILES`: `git diff --name-only` since prior `.completed` timestamp, OR file paths from newly-checked `[BUG]` tasks
3. **Scoped re-run** (default):
   - Tests: changed files + previously-failed
   - Lint/security: `CHANGED_FILES` only
   - Story Verifier: only FAILED/PARTIAL work items
   - Pass `changedFiles` to QC Auditor
4. **Full re-run** when: (a) non-BUG tasks changed, (b) spec.md/plan.md modified, (c) prior report malformed, (d) user requests full
5. Report: "Scoped re-run: [N] changed files, [M] prior failures" or "Full re-run: [reason]"

No prior report → full run.

## 2. Load QC Context

Read from `FEATURE_DIR`:
- **Required**: `plan.md`, `spec.md`, `tasks.md`
- **Optional**: `.review-findings`
- **Required from root**: `project-instructions.md`

### Load review findings

If `.review-findings` exists:
1. Parse entries: `T### | Requirement ID | gap | file path`
2. Pass to Story Verifier as `priorityChecks` — mandatory re-verification
3. Include `## Implementation Review Findings` in report
4. Unresolved findings → BUG tasks

### Extract test commands

Search `plan.md` for test sections ("Test Strategy", "Testing", "Quality Gates", "Commands", "Scripts") and inline commands (`npm test`, `pytest`, `cargo test`, etc.). If none → `TEST_COMMANDS = empty` (QC Auditor auto-detects).

### Extract tech stack

From `plan.md` extract:
- `TECH_STACK`: Primary language/framework
- `LINT_COMMANDS`: Linting/static analysis commands
- `SECURITY_TOOLS`: Security scanning tools

### Extract QC tooling from plan

Search `plan.md` for `## Testing Strategy` first → extract `QC_TOOLING` map from the tier rows (`Unit`, `Integration`, `Security`, `Coverage`) using tool + install columns.

If `## Testing Strategy` missing, fall back to legacy `## QC Tooling` extraction. If both are missing → `QC_TOOLING = empty` (backward-compatible auto-detection).

### Extract runtime validation hints

Search `plan.md`, `spec.md`, and project files for:
- `APP_START_COMMAND`: Local start command
- `APP_URL`: Local URL or entry HTML
- `APP_READINESS_CHECK`: Readiness signal (health endpoint, log line, page load)
- `APP_STOP_COMMAND`: Cleanup command (only if explicitly documented)
- `BROWSER_RUNTIME_REQUIRED`: `true` when work items depend on real browser behavior (rendered UI, navigation, forms, dialogs, responsive layout, browser integrations)

Infer from common scripts if not documented; leave uncertain values empty.

### Detect built-in browser availability

Set `BROWSER_RUNTIME_AVAILABLE = true` if current integration has built-in browser tools; otherwise `false`. If unclear → `false` (terminal/headless/manual fallback in Step 6).

### Extract project instructions constraints

From `project-instructions.md` → extract non-negotiable quality principles as `PI_CONSTRAINTS`.

### Extract coverage threshold

**Fast path**: Read `.github/sddp-config.md` → `## Derived QC Policy` → `**Coverage Target**:`. If present and non-empty → use directly as `COVERAGE_THRESHOLD`.

**Fallback**: From `PI_CONSTRAINTS` → extract numeric `COVERAGE_THRESHOLD` (e.g., `100`, `80`). If none → empty (report but don't enforce).

### Extract QC strictness policy

**Primary**: Read `.github/sddp-config.md` → `## QC Strictness`:
- `**Profile**:` → `standard` (default) | `strict` (all categories required) | `minimal` (only PI-mandated)
  - `strict`: set all categories in `REQUIRED_QC_CATEGORIES` to `true`
  - `minimal`: set all to `false` (only categories found via PI keyword scan are required)
  - `standard`: use Fallback / Fallback 2 logic below
- `**Override Categories**:` → comma-separated `category:required|optional` → override profile defaults

**Fallback** (profile = `standard`, OR config section missing/empty): Read `.github/sddp-config.md` → `## Derived QC Policy` → `**Required Categories**:`. If present and non-empty → parse comma-separated list to set `REQUIRED_QC_CATEGORIES` map entries to `true`.

**Fallback 2** (Fallback yielded nothing): Scan `project-instructions.md` → build `REQUIRED_QC_CATEGORIES` map:

| Category | PI Keyword Signals |
|---|---|
| Static Analysis / Linting | `lint`, `static analysis`, `code quality`, `strict` |
| Security | `security`, `vulnerability`, `audit`, `OWASP`, `scanning` |
| Coverage | `coverage`, `code coverage`, `minimum coverage` |
| Accessibility | `WCAG`, `accessibility`, `a11y` |
| Performance | `benchmark`, `latency`, `throughput`, `performance` |

Category = `required` if keywords appear in non-negotiable principles. Default = `false`.

> If `project-instructions.md` is a template (`[PLACEHOLDER]` or `[PRINCIPLE_` markers) → set `PI_CONSTRAINTS`, `COVERAGE_THRESHOLD` to empty, `REQUIRED_QC_CATEGORIES` to all-false.

## 3. Static Analysis, Security & Test Execution

**Delegate: QC Auditor** with inputs:
- `featureDir`, `techStack`, `testCommands`, `lintCommands`, `securityTools`, `coverageThreshold`, `qcTooling`, `requiredCategories`, `autopilot` — all from Step 2 / Context Report.
- `changedFiles` — from Re-run Scoping (Step 1). Empty on full run.

QC Auditor performs: build check → static analysis/linting → security scanning → test suite with coverage → tool recommendations. Returns structured PASSED/FAILED/SKIPPED per category with coverage percentage.

Store output as `AUDITOR_REPORT`.

## 3.5. SKIPPED Check Escalation

For each SKIPPED category in `AUDITOR_REPORT`:

1. **PI-mandated** (`REQUIRED_QC_CATEGORIES[category] = true`):
   - `AUTOPILOT = true` → default to **Fail QC (BUG task)**. Log: "Autopilot: [Category] SKIPPED but PI-mandated — generating BUG task".
   - `AUTOPILOT = false` → prompt: "[Category] required by PI but skipped." Options: Accept risk (WARNING) | Fail QC (BUG task).
   - Accept risk → **WARNING (user-acknowledged)**: `"[Category]: SKIPPED (user-acknowledged — PI mandate waived at [ISO 8601])"`. Does NOT block PASS.
   - Fail → **FAIL** + BUG task: `"Install and run [tool] for [category]"`.

2. **Non-mandated** (`REQUIRED_QC_CATEGORIES[category] = false`):
   - Escalate to **WARNING** with actionable install command. No prompt needed.

3. **Plan-configured but missing** (in `QC_TOOLING` but not installed):
   - Escalate to **WARNING** with install command: "Tool configured during planning but not available."

> SKIPPED checks always surface as at least WARNING. User retains final authority.

## 4. Requirements & Project Instructions Verification

### 4a. Work Item and Requirements Verification

**Delegate: Story Verifier** with inputs:
- `featureDir`, `specPath` (`FEATURE_DIR/spec.md`), `tasksPath` (`FEATURE_DIR/tasks.md`), `planPath` (`FEATURE_DIR/plan.md`)
- `auditorTestResults`: parsed test results from Step 3 `AUDITOR_REPORT`
- `priorityChecks`: parsed `.review-findings` entries from Step 2 (if loaded)

Story Verifier: traces P1/P2/P3 work items + scenario criteria, traces SC-### independently, maps requirement tags → tasks → code files. Returns PASSED/FAILED per work item and SC.

Store output as `STORY_REPORT`.

### 4b. Project Instructions Compliance

Verify implementation against `PI_CONSTRAINTS`. Violations → **CRITICAL** severity.

> If `PI_CONSTRAINTS` empty → `SKIPPED — project instructions not initialized`.

### 4c. Checklist Fulfillment Spot-Check

If `FEATURE_DIR/checklists/` exists:
1. Load `[Security]` and `[Testing]` category items.
2. Verify implementation satisfies intent of each item.
3. Report PASSED or GAP per item. Gaps = **WARNING** severity (don't fail QC alone).

> No checklists → `SKIPPED — no checklists found`. Only spot-checks `[Security]`/`[Testing]` categories.

## 5. Performance & Accessibility Checks (Conditional)

Scan `spec.md` for NFRs:
- **Performance**: "response time", "latency", "throughput", "load", "concurrent", "benchmark"
- **Accessibility**: "WCAG", "accessibility", "a11y", "screen reader", "aria"

### 5a. Performance (if detected)
- CLI tools → `hyperfine` or time-based benchmarks from `plan.md`
- Web apps → `lighthouse` CLI headless if available
- APIs → basic response-time checks against local server
- No tooling → `MANUAL VERIFICATION NEEDED` in report + `manual-test.md`

### 5b. Accessibility (if detected)
- Web apps → `axe-core` CLI or `pa11y` if available
- No tooling → `MANUAL VERIFICATION NEEDED` in report + `manual-test.md`

> No NFRs found → skip entirely. Don't prompt for tool installation unless NFRs exist.

## 6. Browser Runtime Validation & Manual Testing

Determine if runtime validation required from `BROWSER_RUNTIME_REQUIRED`, work items, SC, and Step 5 checks.

### 6a. Built-in browser validation

If required and `BROWSER_RUNTIME_AVAILABLE = true`:
1. Start app with `APP_START_COMMAND` in background terminal if not running.
2. Wait for readiness via `APP_READINESS_CHECK` / terminal output / successful load at `APP_URL`.
3. Open `APP_URL` in built-in browser.
4. Exercise highest-priority browser scenarios from `spec.md` — main happy path + at least one edge/error path per major workflow.
5. Inspect rendered output, navigation, forms, dialogs, browser/runtime errors.
6. Store results as `RUNTIME_VALIDATION_REPORT` (start command, URL, scenarios, failures, evidence).
7. Stop background processes started by QC.

If app fails to start/load → **FAILED** runtime validation + BUG task (don't downgrade to manual).

### 6b. Terminal/headless supplements

If required but no built-in browser → check if Step 3 tests covered browser scenarios. If gaps remain → run targeted CLI/headless commands (Playwright, Lighthouse, axe, pa11y). Don't re-run full test suite.

### 6c. Manual fallback

If tooling still insufficient → generate `FEATURE_DIR/manual-test.md`:
- Startup steps and readiness checks
- Target local URL or entry file
- Browser scenarios needing validation
- `MANUAL VERIFICATION NEEDED` items from Step 5
- Cleanup steps

If no runtime validation needed → `RUNTIME_VALIDATION_REPORT = SKIPPED — not required`.

## 7. QC Report Generation & Loop Feedback

### Prior Report Comparison

Prior `qc-report.md` existed → extract metrics, prepend to report:
```
## Changes from Prior Run
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|
```
Flag regressions (current worse) as `⚠ REGRESSION`.

Write `FEATURE_DIR/qc-report.md` using [assets/qc-report-template.md](assets/qc-report-template.md).

Required sections: Test Results (runner, counts, failures) | Static Analysis (tool, issues) | Security Audit (tool, vulns) | PI Compliance (violations or "No violations") | Requirements Traceability (per work-item + SC status) | Traceability Gaps | Implementation Review Findings (if `.review-findings` loaded) | Code Coverage (%, threshold, uncovered) | Checklist Fulfillment (spot-checked PASSED/GAP) | Performance (automated or MANUAL VERIFICATION NEEDED) | Accessibility (same) | Browser Runtime Validation (mode, app start, target, scenarios) | Manual Testing (ref to manual-test.md) | Tool Recommendations (SKIPPED tools + install cmds) | Bug Tasks Generated (list or "None").

**Overall Verdict**: PASS or FAIL.

### Verdict logic for SKIPPED escalations

- SKIPPED→FAIL (user chose "Fail QC"): → FAIL verdict.
- SKIPPED→WARNING (user-acknowledged or non-mandated): Does NOT block PASS.

### If ANY failures:

1. Delete the `FEATURE_DIR/.completed` marker.
2. `NEXT_T` = highest existing `T###` + 1.
3. **Dedup**: Scan `## Phase: Bug Fixes` **unchecked (`- [ ]`)** tasks for matching `{REQ-ID}` + file path, or matching error signature → skip duplicates. Match against **checked (`- [X]`)** task = regression → create new bug task with `[RECURRING]` tag.
4. **Recurring tag**: Deduped unchecked match → append `[RECURRING]` if not already tagged.
5. **Severity order**: `CRITICAL` (compilation/build) → `ERROR` (tests, security) → `WARNING` (lint, coverage, traceability).
6. Append to / create `## Phase: Bug Fixes`:
   ```
   - [ ] T043 [BUG:ERROR] {TR-001} [test-failure] Auth rejects valid JWT — src/auth.ts:42
     > Error: expected 200, received 401 — auth.test.ts:15
     > Fix hint: Token validation skips 'iss' claim check
   ```
7. Write `## Bug Context` in `qc-report.md`: bug task ID → full error output, stack trace frames, related test.
8. Report: "QC failed. Added [N] bug tasks ([X] CRITICAL, [Y] ERROR, [Z] WARNING). Removed `.completed`."

### If ALL checks pass:

1. Confirm `FEATURE_DIR/tasks.md` contains no unchecked tasks (excluding `[DEFERRED]`) and `FEATURE_DIR/qc-report.md` records `Overall Verdict: PASS` from the QC evidence gathered in this run. If either condition is false, do **not** create `.qc-passed`; treat the run as failed or blocked instead.
2. **Staleness check**: Before writing, check if `FEATURE_DIR/.qc-passed` already exists. If it does, report: "⚠ A `.qc-passed` marker already exists (possibly from a prior run). Overwriting with current timestamp."
3. Create `FEATURE_DIR/.qc-passed` with content: `QC Passed: <current ISO 8601 timestamp>`
4. Tell the user: "Quality Control passed! The feature is verified and ready for release or merge."
5. **Actionable next steps**: Generate specific next-step commands based on project context:
   - If `.git` exists: suggest `git add . && git commit -m "feat: [feature name]"` and `git push origin [branch]`
   - If GitHub remote detected: suggest creating a Pull Request
   - If `project-instructions.md` has deployment policies or CI/CD references, cite them
   - If no project context is available, suggest generic: "Commit your changes and open a PR for review."
6. Include a brief session guidance note: "**Same chat or new chat?** Both work — each SDDP command resets its context automatically."

</workflow>
