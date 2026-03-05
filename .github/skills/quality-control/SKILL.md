---
name: quality-control
description: "Executes Quality Control checks. It evaluates requirements, runs static analysis, executes tests, and feeds bug tasks back into the implementation loop if any check fails."
---

# Quality Assurance — Quality Control Workflow

<rules>
- Report progress at each major milestone (Context Check, Static Analysis & Tests, Requirements Traceability, Report Generation).
- Execute only if a `.completed` marker exists in `FEATURE_DIR`. If not, report using the **gate failure error template** (see Step 1) and halt.
- **NEVER install missing test/analysis dependencies without asking the user**. If tools are missing, ask the user to confirm installation. If they decline, mark the respective checks as skipped.
- If checks **PASS**, generate `.qc-passed` marker and yield control.
- If checks **FAIL**, log the failures as new tasks in `tasks.md` marked explicitly as `[BUG]`, remove `.completed` marker, and yield control, suggesting a re-run of `/sddp-implement`.
- **Artifact conventions** (`.github/skills/artifact-conventions/SKILL.md`): When appending BUG tasks to `tasks.md`, preserve all existing IDs (T###, FR-###, SC-###), phase headers, and the Dependencies section. Read the highest existing T### number from `tasks.md` and increment sequentially for new BUG tasks.
- **Manual testing**: The agent should proactively execute commands or tools (like headless browser tools) if available. Alternatively, generate a `manual-test.md` for human execution.
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
- This is informational only — always re-run all checks to ensure accuracy against the current code.

## 2. Load QC Context

Read from `FEATURE_DIR`:
- **Required**: `plan.md`, `spec.md`, `tasks.md`
- **Required from root**: `project-instructions.md`

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

### Extract project instructions constraints

From `project-instructions.md`, identify any non-negotiable quality principles that must be checked (e.g., "Test-First", "100% coverage required", security mandates). Store as `PI_CONSTRAINTS` for use in Step 4.

> Note: If `project-instructions.md` is still a template (contains `[PLACEHOLDER]` or `[PRINCIPLE_` markers), set `PI_CONSTRAINTS` to empty and note it for Step 4.

## 3. Static Analysis, Security & Test Execution

**Delegate: QC Auditor** with these structured inputs:
- `featureDir`: `FEATURE_DIR`
- `techStack`: `TECH_STACK` (from Step 2)
- `testCommands`: `TEST_COMMANDS` (from Step 2, may be empty)
- `lintCommands`: `LINT_COMMANDS` (from Step 2, may be empty)
- `securityTools`: `SECURITY_TOOLS` (from Step 2, may be empty)

The QC Auditor will:
1. Run static analysis and linting (ask before installing missing tools)
2. Run security vulnerability scanning (ask before installing missing tools)
3. Execute the full test suite (unit and integration tests)
4. Return a structured report with PASSED/FAILED/SKIPPED per check category

Store the QC Auditor's output as `AUDITOR_REPORT` for inclusion in the final report.

## 4. Requirements & Project Instructions Verification

### 4a. Story and Requirements Verification

Load `spec.md`, `tasks.md`, and the current source code.

**Delegate: Story Verifier** with these structured inputs:
- `featureDir`: `FEATURE_DIR`
- `specPath`: `FEATURE_DIR/spec.md`
- `tasksPath`: `FEATURE_DIR/tasks.md`
- `planPath`: `FEATURE_DIR/plan.md`

The Story Verifier will:
1. Trace every P1/P2/P3 user story and its Given/When/Then acceptance criteria
2. Trace every Success Criteria (`SC-###`) independently of user stories
3. Use `{FR-###}` tags in `tasks.md` to map requirements → tasks → code files
4. Return a structured report with PASSED/FAILED per story and per SC

Store the Story Verifier's output as `STORY_REPORT` for inclusion in the final report.

### 4b. Project Instructions Compliance

Review the implementation against `PI_CONSTRAINTS` (extracted in Step 2). For each non-negotiable principle in `project-instructions.md`:
- Verify the implementation does not violate it
- If a violation is detected, classify it as **CRITICAL** severity and include it in the report

> Note: If `PI_CONSTRAINTS` is empty (project instructions not initialized), skip this check and note it as `SKIPPED — project instructions not initialized`.

## 5. Manual Testing Script

Scan for any User Story or Success Criteria that requires explicit manual validation or visual inspection (e.g., UI rendering, interactive CLI behavior, browser-based workflows).
- Proactively run available tools to test it (e.g., CLI interactions, headless browser calls).
- If tools are insufficient, generate `FEATURE_DIR/manual-test.md` containing a step-by-step test script for the human developer. Report to the user that this file was created.

## 6. QC Report Generation & Loop Feedback

Synthesize the findings from `AUDITOR_REPORT` (Step 3), `STORY_REPORT` (Step 4a), project instructions compliance (Step 4b), and manual testing (Step 5) into `FEATURE_DIR/qc-report.md` using this structure:

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

## Requirements Traceability — X/Y stories verified, X/Y SC verified
| ID | Type | Status | Notes |
|----|------|--------|-------|
| US1 | Story | PASSED/FAILED | [details] |
| SC-001 | Success Criteria | PASSED/FAILED | [details] |

## Traceability Gaps
- [Any FR-### with no corresponding task, or US# with no {FR-###} tagged tasks]

## Manual Testing — Required | Not Required
- [Reference to manual-test.md if generated]

## Bug Tasks Generated
- [List of tasks appended to tasks.md, or "None"]
```

### If there are ANY failures (bugs, failed tests, unfulfilled requirements, PI violations):

1. Delete the `FEATURE_DIR/.completed` marker.
2. **Determine next task number**: Read `FEATURE_DIR/tasks.md`, find the highest existing `T###` number (e.g., if the last task is T042, the next is T043). Increment sequentially for each new BUG task.
3. Edit `FEATURE_DIR/tasks.md`. If a "Phase: Bug Fixes" section already exists (from a prior QC run), append to it; otherwise create a new section at the end:
   ```
   ### Phase: Bug Fixes

   - [ ] T043 [BUG] {FR-001} Fix test failure in AuthService — src/services/auth.ts
   - [ ] T044 [BUG] {SC-003} Add missing input validation — src/handlers/user.ts
   ```
4. Tell the user: "Quality Control failed. I have added [N] actionable bug tasks to `tasks.md` and removed the `.completed` marker. Run `/sddp-implement` to fix these issues."

### If ALL checks pass:

1. **Staleness check**: Before writing, check if `FEATURE_DIR/.qc-passed` already exists. If it does, report: "⚠ A `.qc-passed` marker already exists (possibly from a prior run). Overwriting with current timestamp."
2. Create `FEATURE_DIR/.qc-passed` with content: `QC Passed: <current ISO 8601 timestamp>`
3. Tell the user: "Quality Control passed! The feature is verified and ready for release or merge."
4. Suggest next steps based on the project instructions (e.g., commit changes, push branch, create PR).
5. Include a brief session guidance note: "**Same chat or new chat?** Both work — each SDDP command resets its context automatically."

</workflow>
