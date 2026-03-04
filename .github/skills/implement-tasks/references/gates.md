# Implementation Gates & Project Setup

> **Load condition**: Read this file on **fresh runs only** (no tasks marked `[X]` in tasks.md). Resume runs skip this file — gates passed on the initial run.

---

## Gate Check: Artifact Validation

After the Context Gatherer returns `HAS_SPEC`, `HAS_PLAN`, `HAS_TASKS`:

- **If any are `false`: Attempt Auto-Resolution**
  1. Report: "Gate failed: Missing `[artifact]` at `FEATURE_DIR/[artifact]`. Attempting auto-resolution..."
  2. Suggest the appropriate command to the user with context:
     - Missing `spec.md`: "`/sddp-specify` — this file is created by the specify phase. It does not exist yet at `FEATURE_DIR/spec.md`."
     - Missing `plan.md`: "`/sddp-plan` — this file is created by the plan phase. It does not exist yet at `FEATURE_DIR/plan.md`."
     - Missing `tasks.md`: "`/sddp-tasks` — this file is created by the tasks phase. It does not exist yet at `FEATURE_DIR/tasks.md`."
  3. Re-check context to verify resolution
  4. If still failing after auto-resolution attempt, halt with enriched error:
     - "Missing `[artifact]` at `FEATURE_DIR/[artifact]`."
     - "This file is created by `[command]`. Most likely cause: the prior phase has not been run, or you are on the wrong branch/feature directory."
     - "Run `[command]` to create it." — compose a useful suggested prompt based on branch name and feature context
- **If all are `true`**: Continue to Checklist Gate.

## Checklist Gate

**Delegate: Checklist Reader** (see `.github/agents/_checklist-reader.md` for methodology) with `FEATURE_DIR`.

Parse the JSON report.

1. Display a summary table of the checklists (File | Total | Completed | Incomplete | Status).
2. **If `overallStatus` is "FAIL"**:
   - **Auto-evaluate (no user prompt on first attempt)**:
   1. **Delegate: Test Evaluator** (see `.github/agents/_test-evaluator.md` for methodology) with `featureDir` set to `FEATURE_DIR` for each checklist file with status `"FAIL"`.
     2. The evaluator will mark satisfied items `[X]`, amend artifacts to resolve gaps, and ask the user about ambiguous items.
   3. After evaluation completes, re-check with Checklist Reader.
     4. Display the updated summary table.
     5. If `overallStatus` is now `"PASS"`: Continue to Step 2.
   6. **If `overallStatus` is still `"FAIL"` (second attempt)**: Report "Some checklist items are still unchecked after automatic verification" and prompt the user:
        - "**Try verifying again** — the evaluator will re-check items against your spec and plan"
        - "**Proceed anyway** (recommended) — implement now and address remaining checklist items later"
        - "**Stop** — fix checklist items manually before implementing"
       - Handle user choice: If Stop, halt. If Try verifying again, repeat evaluation. If Proceed anyway, continue.
3. **If `overallStatus` is "PASS" or "N/A"**: Continue.

## Project Setup

Create/verify ignore files based on the tech stack detected in plan.md:

- Check if git repo → create/verify `.gitignore`
- Check for Docker usage → create/verify `.dockerignore`
- Check for linting tools → create/verify appropriate ignore files

Use technology-specific patterns:
- **Node.js**: `node_modules/`, `dist/`, `build/`, `*.log`, `.env*`
- **Python**: `__pycache__/`, `*.pyc`, `.venv/`, `dist/`
- **Java**: `target/`, `*.class`, `.gradle/`, `build/`
- **Go**: `*.exe`, `*.test`, `vendor/`
- **Rust**: `target/`, `debug/`, `release/`
- **Universal**: `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`

If ignore file already exists, append missing critical patterns only.
