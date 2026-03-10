---
name: quality-control
description: "Executes Quality Control checks. It evaluates requirements, runs static analysis, executes tests, and feeds bug tasks back into the implementation loop if any check fails."
---

# Quality Assurance — Quality Control Workflow

<rules>
- Report progress at each major milestone (Context Check, Static Analysis & Tests, Requirements Traceability, Report Generation).
- Execute only if a `.completed` marker exists in `FEATURE_DIR`. If not, report using the **gate failure error template** (see Step 1) and halt.
- **NEVER install missing test/analysis dependencies without asking the user** (unless `AUTOPILOT = true` — see QC Auditor autopilot guards). If tools are missing, ask the user to confirm installation. If they decline, mark the respective checks as skipped.
- If checks **PASS**, generate `.qc-passed` marker and yield control.
- If checks **FAIL**, log the failures as new tasks in `tasks.md` marked explicitly as `[BUG]`, remove `.completed` marker, and yield control, suggesting a re-run of `/sddp-implement`.
- **Artifact conventions** (`.github/skills/artifact-conventions/SKILL.md`): When appending BUG tasks to `tasks.md`, preserve all existing IDs (T###, FR-###, TR-###, OR-###, RR-###, SC-###), phase headers, and the Dependencies section. Read the highest existing T### number from `tasks.md` and increment sequentially for new BUG tasks.
- **Browser runtime validation**: When UI or browser-based workflows must be verified and the current integration exposes built-in browser tools, prefer those tools to open the local app, exercise critical flows, inspect rendered output, and review browser/runtime errors. Terminal-run frameworks like Playwright or Cypress are supplemental automated checks; when built-in browser tools are available, prefer them for interactive validation scenarios that benefit from agent-controlled browser inspection.
- **Manual testing fallback**: If built-in browser tools and terminal/headless tools are still insufficient, generate a `manual-test.md` for human execution.
</rules>

<workflow>

## 1. Context Check & Re-run Detection

Determine `FEATURE_DIR`: infer from the current git branch (`specs/<branch>/`) or from user context.

**Delegate: Context Gatherer** in **quick mode** to resolve `FEATURE_DIR`.

### Gate: `.completed` marker

Check for the `FEATURE_DIR/.completed` marker. If it does not exist, report using the gate failure error template and halt:
1. **What is missing and where**: "Missing `.completed` marker at `FEATURE_DIR/.completed`"
2. **Most likely cause**: "The implementation phase has not finished. This marker is created by `/sddp-implement` when all tasks are completed."
3. **Copy-pasteable fix command**: "`/sddp-implement`"

### Re-run detection

Check if `FEATURE_DIR/qc-report.md` already exists from a prior QC run.
- If it exists, read its **Overall Verdict** and the status of each section.
- Report: "Previous QC report found (verdict: [PASS/FAIL]). Re-running all checks with current codebase state."

**Optimized re-run**: If a prior QC report exists with verdict FAIL, check whether only `[BUG]` tasks were completed since the last run (i.e., the `## Phase: Bug Fixes` section in `tasks.md` has newly checked tasks, and no other phases changed). If so, optimize by:
  1. Re-running only the specific failed tests from the prior report (if test names are recorded)
  2. Running lint/security only on files touched by bug-fix tasks
  3. Re-verifying only FAILED stories/SC from the prior report
  4. If scope is unclear or the prior report lacks detail, fall back to a full re-run

Full re-runs are always the default — optimized re-runs are an efficiency enhancement when conditions are clearly met.

## 2. Load QC Context

Read from `FEATURE_DIR`:
- **Required**: `plan.md`, `spec.md`, `tasks.md`
- **Optional**: `.review-findings` (implementation review findings from `/sddp-implement`)
- **Required from root**: `project-instructions.md`

### Load review findings

If `FEATURE_DIR/.review-findings` exists, read it to load `REVIEW_FINDINGS` — a list of known issues from the implementation phase review. These areas should receive **priority attention** during QC to avoid re-discovering known problems and to verify whether they were adequately addressed.

### Extract test commands

Search `plan.md` for test-related sections. Look for any of these section headers or keywords:
- "Test Strategy", "Testing", "Quality Gates", "Commands", "Scripts"
- Inline commands like `npm test`, `pytest`, `cargo test`, `go test`, `dotnet test`

If no explicit test commands are found in `plan.md`, set `TEST_COMMANDS` to empty and let the QC Auditor auto-detect from project files.

### Extract tech stack

From `plan.md`, identify:
- `TECH_STACK`: Primary language/framework (e.g., "TypeScript/Node.js", "Python/FastAPI")
- `LINT_COMMANDS`: Any linting or static analysis commands specified
- `SECURITY_TOOLS`: Any security scanning tools specified

### Extract QC tooling from plan

Search `plan.md` for a `## QC Tooling` section. If found, extract:
- `QC_TOOLING`: A structured map of category → tool name + install command for each configured QC tool (test runner, linter, security scanner, coverage tool).

If the `## QC Tooling` section is missing (e.g., plan was generated before this feature existed), set `QC_TOOLING` to empty. The QC Auditor will fall back to auto-detection from project files — this preserves backward compatibility.

### Extract runtime validation hints

Search `plan.md`, `spec.md`, and common project files for local runtime details. Capture:
- `APP_START_COMMAND`: preferred command to start the implemented app locally (for example `npm run dev`, `npm start`, `pnpm dev`, `python -m http.server`)
- `APP_URL`: preferred local URL or entry HTML file to open in the browser
- `APP_READINESS_CHECK`: the strongest documented readiness signal (for example a health endpoint, server log line, or successful local page load)
- `APP_STOP_COMMAND`: cleanup command only if the project explicitly documents one
- `BROWSER_RUNTIME_REQUIRED`: `true` when user stories, objectives, or success criteria depend on real browser behavior such as rendered UI, navigation, form entry, dialogs, drag/drop, responsive layout, or browser-only integrations

If no explicit values are documented, infer them from common scripts (`package.json`, framework config, or documented local run commands) and leave any uncertain value empty rather than guessing.

### Detect built-in browser availability

From the current integration and wrapper instructions, determine `BROWSER_RUNTIME_AVAILABLE`:
- `true` when the current QC agent can open and interact with a local page using built-in browser tools
- `false` otherwise

If availability is unclear, set `BROWSER_RUNTIME_AVAILABLE = false` and follow the terminal/headless/manual fallback path in Step 6.

### Extract project instructions constraints

From `project-instructions.md`, identify any non-negotiable quality principles that must be checked (e.g., "Test-First", "100% coverage required", security mandates). Store as `PI_CONSTRAINTS` for use in Step 4.

### Extract coverage threshold

From `project-instructions.md` and `PI_CONSTRAINTS`, look for coverage-related mandates (e.g., "100% coverage required", "minimum 80% code coverage"). If found, extract the numeric threshold as `COVERAGE_THRESHOLD` (e.g., `100`, `80`). If no coverage mandate exists, set `COVERAGE_THRESHOLD` to empty — coverage will be collected and reported but not enforced.

### Extract QC strictness policy

Scan `project-instructions.md` for quality mandates across all QC categories. Build a `REQUIRED_QC_CATEGORIES` map (category → required boolean) using these keyword signals:

| Category | PI Keyword Signals |
|---|---|
| Static Analysis / Linting | `lint`, `static analysis`, `code quality`, `strict` |
| Security | `security`, `vulnerability`, `audit`, `OWASP`, `scanning` |
| Coverage | `coverage`, `code coverage`, `minimum coverage` |
| Accessibility | `WCAG`, `accessibility`, `a11y` |
| Performance | `benchmark`, `latency`, `throughput`, `performance` |

A category is `required = true` if any of its keyword signals appear in a non-negotiable principle or quality mandate section of `project-instructions.md`. If no keywords match for a category, set it to `required = false`.

> Note: If `project-instructions.md` is still a template (contains `[PLACEHOLDER]` or `[PRINCIPLE_` markers), set `PI_CONSTRAINTS` to empty, `COVERAGE_THRESHOLD` to empty, `REQUIRED_QC_CATEGORIES` to all-false, and note it for Step 4.

## 3. Static Analysis, Security & Test Execution

**Delegate: QC Auditor** with these structured inputs:
- `featureDir`: `FEATURE_DIR`
- `techStack`: `TECH_STACK` (from Step 2)
- `testCommands`: `TEST_COMMANDS` (from Step 2, may be empty)
- `lintCommands`: `LINT_COMMANDS` (from Step 2, may be empty)
- `securityTools`: `SECURITY_TOOLS` (from Step 2, may be empty)
- `coverageThreshold`: `COVERAGE_THRESHOLD` (from Step 2, may be empty)
- `qcTooling`: `QC_TOOLING` (from Step 2, may be empty — plan-configured tools take priority over auto-detection)
- `requiredCategories`: `REQUIRED_QC_CATEGORIES` (from Step 2 — map of category → boolean indicating PI mandate)
- `autopilot`: `AUTOPILOT` — pass through from Context Report

The QC Auditor will:
1. Verify compilation (build check)
2. Run static analysis and linting (batch-prompt before installing missing tools)
3. Run security vulnerability scanning (batch-prompt before installing missing tools)
4. Execute the full test suite with coverage collection (unit and integration tests)
5. Recommend missing tools based on the detected tech stack
6. Return a structured report with PASSED/FAILED/SKIPPED per check category, including coverage percentage

Store the QC Auditor's output as `AUDITOR_REPORT` for inclusion in the final report.

## 3.5. SKIPPED Check Escalation

After receiving `AUDITOR_REPORT`, review each QC category that was reported as `SKIPPED`. Apply the following escalation rules:

### For each SKIPPED category:

1. **PI-mandated category** (`REQUIRED_QC_CATEGORIES[category] = true`):
   - **Autopilot guard (Q2)**: If `AUTOPILOT = true`, default to **"Fail QC (generate BUG task)"**. Log to `FEATURE_DIR/autopilot-log.md`: "Autopilot: [Category] SKIPPED but PI-mandated — generating BUG task (safer default)". Skip the user prompt below.
   - If `AUTOPILOT = false`: Prompt the user: "[Category] is required by project instructions but was skipped. How do you want to proceed?"
   - Options: **"Accept risk (continue with WARNING)"**, **"Fail QC (generate BUG task)"**
   - If user accepts risk → Record as **WARNING (user-acknowledged)** in the report. Include a timestamped note: `"[Category]: SKIPPED (user-acknowledged — PI mandate waived at [ISO 8601 timestamp])"`. QC continues — this does **not** block a PASS verdict.
   - If user chooses to fail → Record as **FAIL**. Generate a BUG task: `"Install and run [tool] for [category]"`.

2. **Non-mandated category** (`REQUIRED_QC_CATEGORIES[category] = false`):
   - Escalate from silent skip to **WARNING** in the report. Include actionable install command from `QC_TOOLING` or the QC Auditor's recommendation.
   - No user prompt needed — this is informational.

3. **Plan-configured but missing** (tool listed in `QC_TOOLING` but not installed, regardless of PI mandate):
   - Escalate to **WARNING** with the install command from `QC_TOOLING`. Note: "Tool was configured during planning but is not available in the current environment."

> **Key principle**: SKIPPED checks are never silently ignored. They always surface as at least a WARNING in the QC report. The user retains final authority — PI mandates prompt for acknowledgment but do not force automatic failure.

## 4. Requirements & Project Instructions Verification

### 4a. Work Item and Requirements Verification

Load `spec.md`, `tasks.md`, and the current source code.

**Delegate: Story Verifier** with these structured inputs:
- `featureDir`: `FEATURE_DIR`
- `specPath`: `FEATURE_DIR/spec.md`
- `tasksPath`: `FEATURE_DIR/tasks.md`
- `planPath`: `FEATURE_DIR/plan.md`

The Story Verifier will:
1. Trace every P1/P2/P3 user story or objective and its applicable scenario-style criteria
2. Trace every Success Criteria (`SC-###`) independently of the work items
3. Use requirement tags in `tasks.md` (`FR-###`, `TR-###`, `OR-###`, `RR-###`) to map requirements → tasks → code files
4. Return a structured report with PASSED/FAILED per work item and per SC

Store the Story Verifier's output as `STORY_REPORT` for inclusion in the final report.

### 4b. Project Instructions Compliance

Review the implementation against `PI_CONSTRAINTS` (extracted in Step 2). For each non-negotiable principle in `project-instructions.md`:
- Verify the implementation does not violate it
- If a violation is detected, classify it as **CRITICAL** severity and include it in the report

> Note: If `PI_CONSTRAINTS` is empty (project instructions not initialized), skip this check and note it as `SKIPPED — project instructions not initialized`.

### 4c. Checklist Fulfillment Spot-Check

If `FEATURE_DIR/checklists/` exists and contains checklist files:
1. Load checklist items tagged with `[Security]` or `[Testing]` categories
2. For each, verify the implementation satisfies the *intent* of the checklist question — e.g., if a checklist asks "Are error handling requirements defined for all API failure modes?", verify that the code actually implements error handling for those modes
3. Report as `PASSED` (fulfilled in code) or `GAP` (checklist concern not addressed in implementation) per item
4. Checklist gaps are **WARNING** severity — they don't fail QC on their own but are reported for developer awareness

> Note: This is a spot-check, not full re-evaluation. Only `[Security]` and `[Testing]` category items are verified. If no checklists exist, skip with `SKIPPED — no checklists found`.

## 5. Performance & Accessibility Checks (Conditional)

Scan `spec.md` for non-functional requirements related to performance or accessibility:
- **Performance keywords**: "response time", "latency", "throughput", "load", "concurrent", "benchmark"
- **Accessibility keywords**: "WCAG", "accessibility", "a11y", "screen reader", "aria"

### 5a. Performance (if NFRs detected)
- For CLI tools: run `hyperfine` or time-based benchmarks if commands are specified in `plan.md`
- For web apps: run `lighthouse` CLI in headless mode if available
- For APIs: run basic response-time checks against local server if test commands are available
- If no performance tooling is available, note the NFRs in the report as `MANUAL VERIFICATION NEEDED` and include them in `manual-test.md`

### 5b. Accessibility (if NFRs detected)
- For web apps: run `axe-core` CLI or `pa11y` if available
- If no accessibility tooling is available, note the NFRs as `MANUAL VERIFICATION NEEDED` and include them in `manual-test.md`

> Note: If no performance or accessibility NFRs are found in `spec.md`, skip both sub-steps entirely. Do not prompt for tool installation unless NFRs exist.

## 6. Browser Runtime Validation & Manual Testing

Determine whether explicit runtime validation is required by reviewing `BROWSER_RUNTIME_REQUIRED`, the work items in `spec.md`, the Success Criteria, and any Step 5 performance/accessibility checks that depend on a live local app.

### 6a. Built-in browser runtime validation

If runtime validation is required and `BROWSER_RUNTIME_AVAILABLE = true`:
1. Start the local app with `APP_START_COMMAND` in a background terminal if it is not already running.
2. Wait for readiness using `APP_READINESS_CHECK`, terminal output, or a successful local load at `APP_URL`.
3. Open `APP_URL` or the local HTML entry point in the integration's built-in browser.
4. Exercise the highest-priority browser scenarios from `spec.md` and the relevant acceptance, validation, or verification criteria. Cover the main happy path and at least one meaningful edge or error path for each major browser workflow.
5. Inspect rendered output, navigation, forms, dialogs, browser/runtime errors, and screenshots or page reads when useful.
6. Store the results as `RUNTIME_VALIDATION_REPORT`, including the start command, target URL, scenarios covered, failures, and any browser evidence captured.
7. Stop any background process started by QC when validation completes.

If `APP_START_COMMAND` is available but the app fails to start or load locally, record this as **FAILED** runtime validation and generate a BUG task rather than downgrading it to manual verification.

### 6b. Terminal/headless browser supplements

If runtime validation is required but built-in browser tools are unavailable or disabled, review whether the automated tests executed in Step 3 already covered the browser-based acceptance scenarios from `spec.md`. If coverage gaps remain, run targeted CLI or headless commands (for example `npx playwright test --grep "scenario"`, Lighthouse, axe, or pa11y) as supplemental runtime evidence. Do not re-run the full test suite already executed in Step 3.

### 6c. Manual fallback

If startup, browser access, or available tooling is still insufficient to confidently validate the scenario, generate `FEATURE_DIR/manual-test.md` containing a step-by-step script for the human developer. Include:
- Startup steps and readiness checks
- The target local URL or entry file
- The browser scenarios that still need validation
- Any `MANUAL VERIFICATION NEEDED` items from Step 5
- Cleanup steps if QC started local processes

If no runtime validation is needed beyond prior automated checks, set `RUNTIME_VALIDATION_REPORT` to `SKIPPED — not required`.

## 7. QC Report Generation & Loop Feedback

Synthesize the findings from `AUDITOR_REPORT` (Step 3), `STORY_REPORT` (Step 4a), project instructions compliance (Step 4b), checklist spot-check (Step 4c), performance/accessibility checks (Step 5), `RUNTIME_VALIDATION_REPORT` (Step 6), and any manual testing follow-up into `FEATURE_DIR/qc-report.md`.

Use the report template at [assets/qc-report-template.md](assets/qc-report-template.md). The template defines the structure:

```markdown
# QC Report: [Feature Name]

**Date**: [timestamp]  
**Feature Directory**: [FEATURE_DIR]  
**Overall Verdict**: PASS | FAIL

## Test Results — PASSED | FAILED | SKIPPED
- Runner: [tool name], Total: X, Passed: X, Failed: X
- [test name — assertion error — file:line] (per failure)

## Static Analysis — PASSED | FAILED | SKIPPED
- Tool: [tool name]
- Critical issues: X, Warnings: X
- [file:line — description] (per critical issue)

## Security Audit — PASSED | FAILED | SKIPPED
- Tool: [tool name]
- Vulnerabilities found: X
- [file:line — severity — description] (per finding)

## Project Instructions Compliance — PASSED | FAILED | SKIPPED
- [List any violations with CRITICAL severity, or "No violations"]

## Requirements Traceability — X/Y work items verified, X/Y SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 or OBJ1 | Work Item | PASSED/FAILED | [details] |
| SC-001 | Success Criteria | PASSED/FAILED | [details] |

## Traceability Gaps
- [Any requirement ID with no corresponding task, or any US#/OBJ# with no tagged tasks]

## Code Coverage — [X]% | SKIPPED
- Threshold: [Y]% (from project instructions) | Not configured
- Status: PASSED | FAILED | SKIPPED
- Uncovered files: [top 10 lowest-coverage files with line counts]

## Checklist Fulfillment — X/Y spot-checked | SKIPPED
- [CHK### — PASSED/GAP — details] (per checked item)

## Performance — PASSED | MANUAL VERIFICATION NEEDED | SKIPPED
- [Details of any automated checks or reference to manual-test.md]

## Accessibility — PASSED | MANUAL VERIFICATION NEEDED | SKIPPED
- [Details of any automated checks or reference to manual-test.md]

## Browser Runtime Validation — PASSED | FAILED | MANUAL VERIFICATION NEEDED | SKIPPED
- Mode: Built-in browser tools | Headless CLI supplement | Manual fallback
- App start: [command] | Already running | Not needed
- Target: [local URL or entry file]
- [Scenarios covered, console/runtime errors, screenshots, or reason skipped]

## Manual Testing — Required | Not Required
- [Reference to manual-test.md if generated]

## Tool Recommendations
- [Any recommended tools that were SKIPPED, with install commands]

## Bug Tasks Generated
- [List of tasks appended to tasks.md, or "None"]
```

### Verdict logic for SKIPPED escalations

- **SKIPPED → FAIL** (user chose "Fail QC" in Step 3.5): Contributes to overall FAIL verdict.
- **SKIPPED → WARNING (user-acknowledged)**: Does **not** block a PASS verdict. The waiver is recorded in the report with a timestamp for audit traceability.
- **SKIPPED → WARNING** (non-mandated): Does **not** block a PASS verdict. Recorded as a recommendation.

### If there are ANY failures (bugs, failed tests, unfulfilled requirements, PI violations):

1. Delete the `FEATURE_DIR/.completed` marker.
2. **Determine next task number**: Read `FEATURE_DIR/tasks.md`, find the highest existing `T###` number (e.g., if the last task is T042, the next is T043). Increment sequentially for each new BUG task.
3. Edit `FEATURE_DIR/tasks.md`. If a "Phase: Bug Fixes" section already exists (from a prior QC run), append to it; otherwise create a new section at the end:
   ```
   ## Phase: Bug Fixes

   - [ ] T043 [BUG] {TR-001} Fix failed requirement traceability gap — src/services/example.ts
   - [ ] T044 [BUG] {SC-003} Add missing validation or verification coverage — src/handlers/example.ts
   ```
   Use the applicable requirement family tag (`FR-###`, `TR-###`, `OR-###`, or `RR-###`) for each requirement-linked bug task.
   Use `##` (h2) to match the heading level of other phase headers.
4. Tell the user: "Quality Control failed. I have added [N] actionable bug tasks to `tasks.md` and removed the `.completed` marker. Run `/sddp-implement` to fix these issues."

### If ALL checks pass:

1. **Staleness check**: Before writing, check if `FEATURE_DIR/.qc-passed` already exists. If it does, report: "⚠ A `.qc-passed` marker already exists (possibly from a prior run). Overwriting with current timestamp."
2. Create `FEATURE_DIR/.qc-passed` with content: `QC Passed: <current ISO 8601 timestamp>`
3. Tell the user: "Quality Control passed! The feature is verified and ready for release or merge."
4. **Actionable next steps**: Generate specific next-step commands based on project context:
   - If `.git` exists: suggest `git add . && git commit -m "feat: [feature name]"` and `git push origin [branch]`
   - If GitHub remote detected: suggest creating a Pull Request
   - If `project-instructions.md` has deployment policies or CI/CD references, cite them
   - If no project context is available, suggest generic: "Commit your changes and open a PR for review."
5. Include a brief session guidance note: "**Same chat or new chat?** Both work — each SDDP command resets its context automatically."

</workflow>
