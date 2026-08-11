---
name: quality-control
description: "Executes Quality Control checks. It evaluates requirements, runs static analysis, executes tests, and feeds bug tasks back into the implementation loop if any check fails."
---

# Quality Assurance — Quality Control Workflow

<rules>
- Report compact progress at each major milestone: outcome, key delta, next step.
- Require `.completed` marker in `FEATURE_DIR` → halt with gate failure error template if missing.
- Execute QC for real. Never simulate outcomes, invent evidence, or create `.qc-passed` for estimated/simulated success.
- If QC actions cannot run for real → follow FAIL/SKIPPED/manual-test paths. Never claim success.
- Never install missing dependencies without user confirmation (unless `AUTOPILOT = true`). If declined → mark checks skipped.
- After `FEATURE_DIR` resolves, invalidate `.qc-passed` before every gate or check. Every FAIL or BLOCKED exit must leave it absent.
- PASS → atomically generate `.qc-passed` bound to the current QC evidence, yield control.
- FAIL → log `[BUG]` tasks in `tasks.md`, remove `.completed` and `.qc-passed`, yield control, suggest `/sddp-implement`.
- BLOCKED (including pending manual verification) → write the blocked report when possible, remove `.qc-passed`, and halt without claiming release readiness.
- **Artifact conventions** in `AGENTS.md` §Artifact Conventions: Preserve all existing IDs, phase headers, Dependencies section. Increment from highest T### for new BUG tasks.
- **Browser runtime**: Prefer built-in browser tools over Playwright/Cypress for interactive validation when available.
- **Browser probe**: At the start of Step 6, actively probe for browser tools (integration-native `web` tool AND MCP browser servers). Set `BROWSER_RUNTIME_AVAILABLE` based on probe results — do not rely solely on static integration-adapter declarations. Do not skip browser scenarios when the probe succeeds.
- **Manual fallback**: Generate `manual-test.md` if all automated/browser tools insufficient.
- Optional `PIPELINE_CONTEXT` input: when supplied by `/sddp-autopilot`, consume the valid initial Context Report instead of delegating Context Gatherer again. Re-read QC gate artifacts from disk.
</rules>

<workflow>

## 0. Acquire Skills

## 1. Context Check & Re-run Detection

If `PIPELINE_CONTEXT` is supplied, reports `CONTEXT_BLOCKED` as `false`, has a non-empty `FEATURE_DIR`, and its `BRANCH` still matches the current branch when Git is available, consume its stable `FEATURE_DIR` and `AUTOPILOT` fields without delegating Context Gatherer. Re-check `.completed` and current task completion state from disk.

If `PIPELINE_CONTEXT` is absent or invalid, **Delegate: Context Gatherer** in **quick mode** → resolve `FEATURE_DIR`.

### Invalidate prior QC evidence

Immediately after `FEATURE_DIR` resolves, read any prior `qc-report.md` needed for re-run detection, then delete `FEATURE_DIR/.qc-passed` if present. Do this before the `.completed` and task gates so a prior PASS cannot survive a failed or blocked re-run. Re-check that the marker is absent on every FAIL or BLOCKED exit.

### Gate: `.completed` marker

If `FEATURE_DIR/.completed` missing → halt with gate failure error:
1. **What**: "Missing `.completed` marker at `FEATURE_DIR/.completed`"
2. **Cause**: "Implementation phase not finished. Marker created by `/sddp-implement`."
3. **Fix**: "`/sddp-implement`"

### Gate: tasks complete

Read `FEATURE_DIR/tasks.md` → if any `- [ ]` remain (excluding only `[BUG:WARNING] [DEFERRED]` tasks), or any CRITICAL/ERROR bug has `[DEFERRED]`, halt with gate failure error:
1. **What**: "Unchecked tasks in `FEATURE_DIR/tasks.md` despite `.completed` present"
2. **Cause**: "Implementation incomplete or `.completed` marker stale."
3. **Fix**: "`/sddp-implement`"

### Re-run Scoping

Prior `qc-report.md` exists:
1. Read the prior verdict, section statuses, `QC Scope Baseline`, and `QC Evidence Manifest`.
2. Accept `BASELINE_COMMIT` only when it is exactly a 40-character Git SHA, Git is available in the repository, `git cat-file -e BASELINE_COMMIT^{commit}` succeeds, and `git merge-base --is-ancestor BASELINE_COMMIT HEAD` proves it is reachable from the current `HEAD`. A shallow clone may use the baseline only when both proofs succeed; missing history or an indeterminate ancestry check forces a full run.
3. Validate the prior evidence snapshot: manifest paths must be unique, sorted, repository-relative paths with 64-character lowercase SHA-256 digests. Compare current exact-byte digests to detect modified or deleted evidence files. A malformed or internally inconsistent baseline forces a full run.
4. Build `CHANGED_FILES` as the union of:
   - committed paths from `git diff --name-only --diff-filter=ACDMRTUXB BASELINE_COMMIT...HEAD`
   - staged and unstaged tracked paths from `git diff --name-only HEAD`
   - untracked paths from `git ls-files --others --exclude-standard`
   - paths whose current digest differs from the prior Evidence Manifest
   - file paths from newly checked `[BUG]` tasks
5. **Full re-run** when the baseline is missing, malformed, unreachable, or inconsistent; Git or required history is unavailable; `spec.md` or `plan.md` changed; `tasks.md` has any change other than `- [ ]` to `- [X]` for an existing `[BUG]` task; a dependency manifest, lockfile, build configuration, test configuration, or test bootstrap changed; or the user requests full QC. Treat uncertain file classification as a full-run reason.
6. **Scoped re-run** only after every safety check passes:
   - Tests: previously failed tests plus tests selected from `BASELINE_COMMIT` by a runner that follows the changed files' transitive dependency graph. If that guarantee is unavailable, run the full test suite.
   - Lint/security: applicable existing files in `CHANGED_FILES`; use a full category run when its tool cannot safely accept the scope.
   - Story Verifier: previously FAILED/PARTIAL work items plus work items mapped to `CHANGED_FILES`.
   - Pass `baselineCommit`, `changedFiles`, and `previouslyFailedTests` to QC Auditor.
7. Report: "Scoped re-run: [N] changed files, [M] prior failures; baseline [SHA]; dependency-aware selection [tool]" or "Full re-run: [reason]". Never describe a scoped run as safe solely because only prior failures passed.

No prior report → full run.

## 2. Load QC Context

Read from `FEATURE_DIR`:
- **Required**: `plan.md`, `spec.md`, `tasks.md`
- **Optional**: `.review-findings`
- **Required from root**: `project-instructions.md`

### Load review findings

If `.review-findings` exists:
1. Run `node .github/skills/quality-control/scripts/parse-review-findings.mjs "FEATURE_DIR/.review-findings"` from the repository root. Require exit zero, `valid: true`, `version: 1`, and an empty `errors` array.
2. On parser failure, malformed JSON, unsupported version/type, or invalid fields: report the parser errors and stop with **BLOCKED** before Story Verifier delegation, report generation, or BUG task generation. Never reinterpret unversioned pipe records or partially use valid lines from an invalid file.
3. Pass the parser's structured `findings` array to Story Verifier as `priorityChecks` — mandatory re-verification. Preserve each finding's `task`, `requirements`, `type`, `evidence`, and `paths` arrays without positional pairing.
4. Include `## Implementation Review Findings` in the report. Include `.review-findings` in the QC Evidence Manifest and keep it through QC reruns; cleanup occurs only when the Feature Workspace is archived or deleted.
5. For each unresolved finding, generate BUG tasks only from Story Verifier `bugTargets` entries. Each target explicitly names one `requirement`, one `path`, and one `description`; never infer a requirement/path pair from array positions. No confirmed target means BLOCKED for manual triage, not a guessed BUG task.

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

### Detect browser availability (preliminary)

Set `BROWSER_RUNTIME_HINT = true` if the current integration declares built-in browser tools; otherwise `false`. This is a preliminary signal only — the authoritative `BROWSER_RUNTIME_AVAILABLE` flag is determined by the active probe in Step 6.0.

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
- `baselineCommit`, `changedFiles`, `previouslyFailedTests` — from Re-run Scoping (Step 1). Empty on full run.

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
- `priorityChecks`: validated version 1 `.review-findings` objects from Step 2 (if loaded)

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

### 6.0. Active browser tool probe

Before deciding on 6a/6b/6c, probe for browser tools at runtime:

1. **Scope the probe to exposed tools**: Only probe browser-capable tools that are actually exposed by the current harness/adapter. If the adapter exposes no native browser tool and no discoverable MCP browser tools, skip probing for those sources.
2. **Integration-native tool**: Attempt a trivial browser operation (e.g., open `about:blank` or read the current page) via the integration's browser tool when one is exposed (VS Code `web`, Antigravity browser, etc.). Success → mark `NATIVE_BROWSER = true`.
3. **MCP browser server**: If the harness exposes discoverable MCP tools, scan available tools for names or descriptions matching the pattern `browser|navigate|puppeteer|playwright|web_browse|browse_url|screenshot`. If one or more matching tools are found, attempt a lightweight probe (e.g., list capabilities or open `about:blank`). Success → mark `MCP_BROWSER = true`; record the tool name for use in 6a.
4. **Set flag**: `BROWSER_RUNTIME_AVAILABLE = NATIVE_BROWSER OR MCP_BROWSER`. Log which source was detected (native, MCP, or both).
5. **No-skip rule**: When `BROWSER_RUNTIME_AVAILABLE = true`, browser scenarios MUST be executed via 6a. Do not fall through to 6b or 6c.

If both probes fail → `BROWSER_RUNTIME_AVAILABLE = false` → continue to 6b/6c.

### 6a. Browser validation (native or MCP)

If required and `BROWSER_RUNTIME_AVAILABLE = true`:
1. Start app with `APP_START_COMMAND` in background terminal if not running.
2. Wait for readiness via `APP_READINESS_CHECK` / terminal output / successful load at `APP_URL`.
3. Open `APP_URL` using the detected browser tool (integration-native `web` tool or MCP browser server tool).
4. Exercise highest-priority browser scenarios from `spec.md` — main happy path + at least one edge/error path per major workflow.
5. Inspect rendered output, navigation, forms, dialogs, browser/runtime errors.
6. Store results as `RUNTIME_VALIDATION_REPORT` (start command, URL, browser tool used, scenarios, failures, evidence).
7. Stop background processes started by QC.

If app fails to start/load → **FAILED** runtime validation + BUG task (don't downgrade to manual).

### 6b. Terminal/headless supplements

If required but `BROWSER_RUNTIME_AVAILABLE = false` → check if Step 3 tests covered browser scenarios. If gaps remain → run targeted CLI/headless commands (Playwright, Lighthouse, axe, pa11y). Don't re-run full test suite.

### 6c. Manual fallback

If tooling still insufficient → generate `FEATURE_DIR/manual-test.md`:
- Startup steps and readiness checks
- Target local URL or entry file
- Browser scenarios needing validation
- `MANUAL VERIFICATION NEEDED` items from Step 5
- Cleanup steps
- An attestation block with `Status: PENDING`, scenario results, verifier identity, UTC timestamp, and evidence references

Preserve an existing attestation block when updating `manual-test.md`; never reset or overwrite human evidence. Manual verification is a **BLOCKED** QC state, not a warning or PASS. Do not create `.qc-passed`. On a later QC run, accept the manual result only when a human has changed the attestation to `Status: ATTESTED`, every required scenario records `PASS`, and verifier identity, UTC timestamp, and evidence references are non-empty. Autopilot must never create or infer this attestation. Missing, partial, malformed, or failed attestation remains BLOCKED.

If `manual-test.md` becomes verbose, you may run `.github/skills/markdown-compression/SKILL.md` as a post-pass on `manual-test.md` only.

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

Required sections: QC Scope Baseline (current full commit SHA or unavailable reason, mode, safety explanation) | Test Results (runner, counts, failures) | Static Analysis (tool, issues) | Security Audit (tool, vulns) | PI Compliance (violations or "No violations") | Requirements Traceability (per work-item + SC status) | Traceability Gaps | Implementation Review Findings (if `.review-findings` loaded) | Code Coverage (%, threshold, uncovered) | Checklist Fulfillment (spot-checked PASSED/GAP) | Performance (automated or MANUAL VERIFICATION NEEDED) | Accessibility (same) | Browser Runtime Validation (mode, app start, target, scenarios) | Manual Testing (ref to manual-test.md and attestation state) | QC Evidence Manifest | Tool Recommendations (SKIPPED tools + install cmds) | Bug Tasks Generated (list or "None").

**QC Scope Baseline**: record the current `git rev-parse HEAD` as the exact 40-character `Baseline Commit` after QC inputs are stable. If Git is unavailable, record `Unavailable` and the reason; that report can never authorize a later scoped run. Record `Mode: Full | Scoped`, the prior baseline used for a scoped run, changed-file count, test-selection mechanism, and why the selected scope is conservative.

**QC Evidence Manifest**: after all checks and any manual attestation evaluation, list `path | SHA-256` rows sorted by repository-relative path. Include exact-byte digests for `spec.md`, `plan.md`, `tasks.md`, `project-instructions.md`, the current `qc-report.md` inputs, every checklist/manual-test file used, and every implementation, test, or configuration file actually inspected or executed by QC. The report itself is not a manifest row because its digest is stored separately in `.qc-passed`.

**Overall Verdict**: PASS, FAIL, or BLOCKED. Pending or invalid manual attestation is BLOCKED. Any unchecked or deferred `[BUG:CRITICAL]` or `[BUG:ERROR]` is FAIL. Marker/report/task/manifest inconsistency is BLOCKED and must halt.

### Verdict logic for SKIPPED escalations

- SKIPPED→FAIL (user chose "Fail QC"): → FAIL verdict.
- SKIPPED→WARNING (user-acknowledged or non-mandated): Does NOT block PASS.

### If ANY failures:

1. Delete `FEATURE_DIR/.completed` and `FEATURE_DIR/.qc-passed`.
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

### If BLOCKED:

1. Delete `FEATURE_DIR/.qc-passed` if present.
2. Write `Overall Verdict: BLOCKED` and the exact blocker to `qc-report.md` when report generation is possible.
3. Do not add a bug task solely for pending manual attestation and do not mark the feature release-ready.
4. Halt with the required attestation or inconsistency repair as the next action.

### If ALL checks pass:

1. Confirm `FEATURE_DIR/tasks.md` contains no unchecked tasks except deferred WARNING bugs, contains no deferred CRITICAL/ERROR bugs, and `FEATURE_DIR/qc-report.md` records `Overall Verdict: PASS` from this run. If manual verification was required, confirm its complete human attestation is recorded. Otherwise treat the run as FAIL or BLOCKED.
2. Re-read every QC Evidence Manifest file and verify its exact-byte SHA-256. A missing, changed, duplicate, or out-of-scope path is BLOCKED.
3. Compute `EVIDENCE_SHA256` as SHA-256 of the UTF-8 manifest rows exactly as persisted, including their terminating newlines. Write `qc-report.md` durably, re-read it, confirm its verdict and manifest, then compute `REPORT_SHA256` from its exact bytes.
4. Atomically create `.qc-passed` in the same directory: write and flush `.qc-passed.tmp`, containing exactly `QC Passed: <current ISO 8601 timestamp>`, `QC Report SHA-256: <REPORT_SHA256>`, and `QC Evidence SHA-256: <EVIDENCE_SHA256>` on separate lines; rename it to `.qc-passed`; remove the temp file on error. Never expose a partial marker.
5. Immediately validate the marker by recomputing the report and evidence digests. Any mismatch deletes `.qc-passed` and changes the outcome to BLOCKED.
6. Tell the user: "Quality Control passed! The feature is verified and ready for release or merge."
7. **Actionable next steps**: Generate specific next-step commands based on project context:
   - If `.git` exists: suggest `git add . && git commit -m "feat: [feature name]"` and `git push origin [branch]`
   - If GitHub remote detected: suggest creating a Pull Request
   - If `project-instructions.md` has deployment policies or CI/CD references, cite them
   - If no project context is available, suggest generic: "Commit your changes and open a PR for review."
8. Include a brief session guidance note: "**Same chat or new chat?** Both work — each SDDP command resets its context automatically."

</workflow>
