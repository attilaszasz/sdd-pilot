# QC Report: [Feature Name]

**Date**: [timestamp]  
**Feature Directory**: [FEATURE_DIR]  
**Overall Verdict**: PASS | FAIL | BLOCKED

## QC Scope Baseline
- Baseline Commit: [40-character current HEAD SHA | Unavailable — reason]
- Mode: Full | Scoped
- Prior Baseline: [40-character SHA used for scope | N/A]
- Changed Files: [count | N/A]
- Test Selection: [dependency-aware command | Full suite]
- Scope Safety: [why the scope is conservative, or why full QC was required]

## Changes from Prior Run
<!-- Omit on first run -->
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|

## Summary
| Check | Status | Details |
|-------|--------|---------|

## Test Results — PASSED | FAILED | SKIPPED
- Runner: [tool name], Total: X, Passed: X, Failed: X
- [test name — assertion error — file:line] (per failure)

## Failure Index
| ID | Category | Severity | File:Line | Description | Bug Task |
|----|----------|----------|-----------|-------------|----------|

## Code Coverage — [X]% | SKIPPED
- Threshold: [Y]% (from project instructions) | Not configured
- Status: PASSED (at or above threshold) | FAILED (below threshold) | SKIPPED
- Uncovered files: [top 10 lowest-coverage files with line counts]

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
| US1 or OBJ1 | Work Item | PASSED/FAILED/PARTIAL (X/Y criteria) | [details] |
| SC-001 | Success Criteria | PASSED/FAILED | [details] |

## Traceability Gaps
- [Any requirement ID with no corresponding task, or any US#/OBJ# with no tagged tasks]

## Implementation Review Findings — X resolved / Y unresolved | SKIPPED
<!-- Omit if no .review-findings loaded -->
| Task | Type | Requirements | Paths | Evidence | Status | Confirmed Bug Targets |
|------|------|--------------|-------|----------|--------|-----------------------|
| [T###] | [tentative] | [all REQ-IDs or None] | [all repository-relative paths or None] | [finding evidence] | Resolved / Unresolved | [{requirement, path, description} → BUG T###, or None] |

## Checklist Fulfillment — X/Y spot-checked | SKIPPED
- [CHK### — PASSED/GAP — details] (per checked item)

## Performance — PASSED | MANUAL VERIFICATION NEEDED | SKIPPED
- [Details of any automated checks or reference to manual-test.md]

## Accessibility — PASSED | MANUAL VERIFICATION NEEDED | SKIPPED
- [Details of any automated checks or reference to manual-test.md]

## Browser Runtime Validation — PASSED | FAILED | MANUAL VERIFICATION NEEDED | SKIPPED
- Mode: Native browser tool | MCP browser server | Headless CLI supplement | Manual fallback
- Browser tool: [tool name or "N/A"]
- App start: [command] | Already running | Not needed
- Target: [local URL or entry file]
- [Scenarios covered, console/runtime errors, screenshots, or reason skipped]

## Manual Testing — Required | Not Required
- [Reference to manual-test.md if generated]
- Attestation: PENDING | ATTESTED | N/A

## QC Evidence Manifest
| Path | SHA-256 |
|------|---------|
| [repository-relative evidence path] | [64-character lowercase digest] |

## Tool Recommendations
- [Any recommended tools that were SKIPPED, with install commands]

## Bug Context
| Bug Task | Error Output | Stack Trace | Related Test |
|----------|-------------|-------------|--------------|

## Bug Tasks Generated
- [List of tasks appended to tasks.md, or "None"]
