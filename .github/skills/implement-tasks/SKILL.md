---
name: implement-tasks
description: "Executes the implementation plan by processing and completing all tasks defined in tasks.md phase-by-phase. Use when running /sddp-implement or when code implementation from a task list is needed."
---

# Software Engineer — Implement Tasks Workflow

<rules>
- Report progress at each major milestone
- **tasks.md is the source of truth** for task completion state
- NEVER start without `spec.md`, `plan.md`, AND `tasks.md`
- Attempt auto-resolution of missing gate artifacts before halting (see `references/gates.md` for gate logic)
- Checklist gate failures trigger auto-evaluation (no user prompt unless evaluation fails twice)
- **Artifact conventions** (`.github/skills/artifact-conventions/SKILL.md`): When marking tasks complete, the ONLY valid checkbox transition is `- [ ]` → `- [X]`. Never reverse (`[X]` → `[ ]`), never delete checkbox lines, never change task IDs (T###), requirement IDs (FR-###), or success criteria IDs (SC-###). Do NOT remove the Dependencies section or phase headers from tasks.md.
- **Execute ALL phases in ONE CONTINUOUS TURN** — this is a single uninterrupted run through all phases (Setup → Foundational → User Stories → Polish)
- **NEVER yield control to user between phases** — do not stop, ask "what next?", or present options after completing a phase
- **Ask the user for input when**: (1) Gate artifact resolution failure, (2) Checklist override decision (second failure only), (3) Sequential task failure requiring manual fix, (4) Final summary guidance if there are any skipped/failed tasks or review issues
- Resume from checkpoint: skip completed tasks (marked `[X]`), process only incomplete tasks (marked `[ ]`)
- Mark each completed task: `- [ ]` → `- [X]` in tasks.md
- Attempt automatic error recovery before requesting user intervention
- Only halt for: (1) Gate auto-resolution failed, (2) Sequential task failed after retry and user chooses 'Halt', (3) All tasks already complete
- Research library documentation and coding patterns before implementing — **Delegate: Technical Researcher**
- Reuse existing `FEATURE_DIR/research.md` for implementation context; perform fresh research only for unfamiliar, critical, or uncovered technologies
- **NEVER provide time estimates, effort estimates, hour counts, or remaining work projections** — report only task counts and statuses
- **Every phase ends with a mandatory review** — all tasks completed in that phase are verified against spec requirements (`FR-###`, `SC-###`, user stories with Given/When/Then acceptance criteria)
- Review failures trigger one re-implementation attempt; persistent issues are logged in `REVIEW_FINDINGS`, not blocking
</rules>

<workflow>

## 1. Gate Check & Resume Detection

Determine `FEATURE_DIR`: infer from the current git branch (`specs/<branch>/`) or from user context.

**Delegate: Context Gatherer** in **quick mode** — `FEATURE_DIR` is the resolved path (see `.github/agents/_context-gatherer.md` for methodology).

Check `HAS_SPEC`, `HAS_PLAN`, `HAS_TASKS` in the response.

**Determine run mode:**
- **Resume run**: All three flags are `true` AND at least one task in `FEATURE_DIR/tasks.md` is marked `[X]`.
- **Fresh run**: No tasks are marked `[X]`, OR any gate artifact is missing.

**If resume run:**
- Report: "Resuming — gates previously validated, skipping gate checks and project setup."
- Proceed directly to Step 2.

**If fresh run:**
- Read and execute `references/gates.md` (artifact validation, checklist gate, and project setup).
- After gates.md completes successfully, proceed to Step 2.

## 2. Load Implementation Context

Read from `FEATURE_DIR`:
- **Required (load now)**: plan.md, spec.md
- **Required if available (load now)**: research.md
- **Lazy-load (defer until needed)**: data-model.md, contracts/ — read these only when a task in the current phase references data models or API contracts. quickstart.md — read only during the Polish phase. This reduces upfront context-window consumption.

**Delegate: Task Tracker** (see `.github/agents/_task-tracker.md` for methodology):
- Provide `FEATURE_DIR`.
- Store the returned JSON task list as `TASK_LIST`.

**Parse Task Completion State:**
1. From `TASK_LIST`, filter tasks by status:
   - `completed_tasks`: Tasks with `status: "completed"` or checkbox `[X]`
   - `incomplete_tasks`: Tasks with `status: "pending"` or checkbox `[ ]`
2. Store `incomplete_tasks` as `REMAINING_TASKS`
3. Calculate counts:
   - `total_tasks`: Length of `TASK_LIST`
   - `completed_count`: Length of `completed_tasks`
   - `remaining_count`: Length of `REMAINING_TASKS`
4. Report: "Loaded [total_tasks] tasks: [completed_count] complete, [remaining_count] remaining"
5. **If `remaining_count` is 0**: Report "✓ All tasks already complete", then skip to Step 6 (Validate Implementation)
6. **If partially complete**: Note the last completed phase for context. Inform the user: "Resuming from checkpoint — [completed_count] tasks already done, processing [remaining_count] remaining. Completed tasks (marked `[X]` in `tasks.md`) are automatically skipped."

Extract tech stack, architecture, and file structure from `plan.md`.

## 3. Research Tech Stack

If `FEATURE_DIR/research.md` exists:
- Read it first and extract implementation-relevant guidance.
- Skip fresh research when the required libraries/patterns for current tasks are already covered.
- Refresh only for unfamiliar libraries, complex integrations, or gaps tied to active tasks.

Before delegating, report to the user: "🔍 Researching library documentation for upcoming tasks — this may take 15–30 seconds."

**Delegate: Technical Researcher** (see `.github/agents/_technical-researcher.md` for methodology):
- **Topics**: Official docs and API references only for unfamiliar, complex, critical, or currently uncovered technologies needed by active tasks.
- **Context**: The tech stack and architecture from `plan.md`.
- **Purpose**: "Write idiomatic, best-practice code that follows library conventions."
- **File Paths**: `FEATURE_DIR/plan.md`, `FEATURE_DIR/research.md` (if available)

If no high-risk gaps are detected, skip delegation and proceed.

Use the research findings to guide implementation.

## 4. Project Setup

> Executed via `references/gates.md` on fresh runs (Step 1 routing). Skipped on resume runs.

## 5. Execute Tasks

**CRITICAL: This is a SINGLE CONTINUOUS LOOP — process ALL phases without stopping or asking for user input between phases.**

Iterate through `REMAINING_TASKS` (from Step 2). Process phase-by-phase in one uninterrupted execution:

1. **Setup first**: Tasks in "Phase 1: Setup" (or similar)
2. **Foundational next**: Tasks in "Phase 2: Foundational"
3. **User Stories in priority order**: Tasks for US1, then US2, etc. - Tasks in "Phase 3+"
4. **Polish last**: Tasks in "Phase: Polish"
   - At the start of Polish phase, load `quickstart.md` (if available) and validate it against the implementation. Update quickstart content if it references outdated setup steps or integration scenarios.

**Stopping conditions (only halt for these):**
- Gate auto-resolution failed (caught earlier in Step 1)
- Sequential task failed after retry AND user chooses 'Halt' when prompted
- Critical system error preventing continuation

**For each phase:**
1. **Sync state** — Re-invoke **Task Tracker** to refresh `TASK_LIST`, `completed_tasks`, `REMAINING_TASKS`, and counts from `tasks.md` on disk. This catches any external changes and reconciles in-memory counts once per phase (not per task).
2. Count tasks in phase (from `REMAINING_TASKS` only)
3. Report: "Starting Phase [N]: [Phase Name] ([task_count] tasks)"
4. Process each incomplete task in the phase
5. Run **Phase Review** on every task completed in this phase (see below)
6. After phase completes and review is done, continue to the next phase (do NOT stop or ask for input)

**For each incomplete task in the current phase:**

- **Skip if already completed**: If task is marked `[X]` in tasks.md, skip to next task
- Use the structured data: `id`, `description`, `parallel`, `story`, `phase`.
- Extract file path from description or context

- Report: "Implementing T### [Phase Name]: [brief description]"

- **Delegate: Developer** (see `.github/agents/_developer.md` for methodology):
  - `TaskID`: Task ID
  - `Description`: Task description
  - `Context`: Relevant technical context from Plan/Research
  - `FilePath`: Target file path (extracted from description)
  - `PlanPath`: `FEATURE_DIR/plan.md`
  - `DataModelPath`: `FEATURE_DIR/data-model.md` (if file exists)
  - `ContractsPath`: `FEATURE_DIR/contracts/` (if directory exists)

- **Handle Result**:
  - If **SUCCESS**: 
    1. Mark completed in tasks.md (`- [ ]` → `- [X]`)
      2. Update in-memory counts: `completed_count += 1`, `remaining_count -= 1`
      3. Report: "✓ T### complete ([completed_count]/[total_tasks] overall)"
  - If **FAILURE**: Attempt intelligent recovery

**Intelligent Error Recovery (on FAILURE):**

1. Report: "⚠ T### failed. Analyzing error..."
2. Parse error details from worker response (error type, message, file, line, suggested fix)
3. Attempt automatic fix based on error type:
   - **Missing dependencies**: Run package manager install command
   - **Import errors**: Add correct import statements to file
   - **Type errors**: Fix type annotations
   - **Test failures**: Analyze test output, fix implementation
   - **Lint errors**: Run linter with `--fix` flag
   - **Unknown**: Skip auto-fix
4. If auto-fix attempted:
   - Report: "Retrying T### after auto-fix..."
   - Re-delegate to the Developer role with same parameters
5. **If second attempt still fails:**
   - **For sequential tasks**:
     1. Report: "✗ T### blocked. Manual intervention required."
   2. Prompt the user with options:
        - "Skip task and continue" (mark as skipped, proceed)
        - "Debug manually and retry" (wait for user fix, then retry)
        - "Halt implementation" (stop and report failure)
     3. Handle user choice accordingly
   - **For parallel tasks (`[P]`)**:
     1. Mark task as skipped in tracking (don't mark `[X]` in tasks.md)
     2. Log failure for final summary
     3. Continue with remaining parallel tasks
6. Track all failures for final summary report

**Phase Review (after all tasks in the phase are processed):**

After processing every task in the current phase, review each task completed during this phase against spec requirements. This ensures code correctness and requirement coverage before moving to the next phase.

> **Guard**: If `spec.md` was not loaded (missing despite being required), log a WARNING: "⚠ spec.md not available — skipping requirement-level review for this phase." Skip steps 3b–3e below, report this gap in the final summary (Step 6), and continue to the next phase.

1. Report: "Reviewing Phase [N]: [Phase Name]..."
2. Collect all tasks that were completed in this phase (tasks that transitioned from `[ ]` to `[X]` during this run, not tasks already `[X]` from a previous run)
3. **For each completed task in the phase:**
   a. Read the implemented file(s) referenced by the task
   b. Identify the corresponding requirements from `spec.md`:
      - Match the task's `{FR-###}` tag to the corresponding functional requirements in `spec.md`
      - Match the task's `[US#]` tag to the user story and its Given/When/Then acceptance scenarios
      - Match the task to relevant `SC-###` (success criteria) that the implementation should satisfy
   c. Cross-reference against `plan.md`:
      - Verify the implementation follows the architecture decisions documented in the plan
      - Check data model adherence (if `data-model.md` exists)
      - Check API contract compliance (if `contracts/` exists)
   d. Evaluate:
      - Does the code satisfy the linked functional requirements?
      - Are the acceptance criteria (Given/When/Then) from the user story met?
      - Are edge cases described in the spec handled?
      - Does the code follow the architecture and patterns from the plan?
   e. **Verdict**: **PASS** (requirements met) or **FAIL** (specific gap identified with the exact requirement ID that is not satisfied)
4. **Handle review results:**
   - If **all tasks PASS**: Report: "✓ Phase [N] review complete — all tasks verified"
   - If **any task FAILs**:
     1. Report: "⚠ T### review failed: [brief gap description, e.g., 'FR-003 not satisfied — missing input validation']"
   2. **Re-implement**: Re-delegate to the Developer role with:
        - `TaskID`: Same task ID
        - `Description`: Original task description
        - `Context`: Original context PLUS the specific review finding — include the exact requirement text from spec (e.g., "FR-003: System MUST validate all user inputs") and what is missing/wrong in the current implementation
        - `FilePath`: Same target file path
        - `PlanPath`: `FEATURE_DIR/plan.md`
        - `DataModelPath`: `FEATURE_DIR/data-model.md` (if file exists)
        - `ContractsPath`: `FEATURE_DIR/contracts/` (if directory exists)
     3. **Re-review** (single re-review only):
        - Read the updated file(s) again
        - Check only the previously-failed requirements for this task
        - If **PASS**: Report: "✓ T### review passed after fix"
        - If still **FAIL**: Report: "✗ T### review issue persists: [gap]", append to `REVIEW_FINDINGS` list: `{ taskId, requirementId, gap, filePath }`
     4. **Continue to next task** regardless of re-review outcome — do NOT halt or ask user
5. After reviewing all tasks in the phase, report the phase-completion progress summary:
   - Report: "✓ Phase [N] complete — [completed_in_phase] tasks done, [completed_count]/[total_tasks] overall ([remaining_count] remaining)"
   - Then proceed to the next phase

Execution rules:
- Sequential tasks: complete in order, retry once on failure
- Parallel tasks `[P]`: can be implemented together (different files, no conflicts), failures don't block others
- **Never stop between phases** — continue through all phases in one continuous run until all phases complete or a stopping condition is met
- Progress counts reflect remaining tasks, not absolute task positions
- Do NOT yield control or present options after completing a phase — immediately proceed to the next phase

## 6. Validate Implementation

**This is the END of the implementation run.** After completing all phases (or halting due to a blocker), perform final validation:

1. Verify implementation matches spec requirements
2. Run tests (if test commands are defined in plan.md)
3. Report final summary:
   - Total tasks: [total]
   - Completed: [completed] ✓
   - Skipped: [skipped] (list task IDs)
   - Failed: [failed] (list task IDs with errors)
   - Review issues: [count] (list each: T### — [requirement ID] — [gap description])
4. If `REVIEW_FINDINGS` is non-empty, list each finding with:
   - Task ID and description
   - The unmet requirement (`FR-###` / `SC-###` / user story ID)
   - What is missing or incorrect in the implementation
   - The file path where the issue exists
5. If any tasks skipped, failed, or have review issues, provide guidance on next steps
6. **Write completion marker**: If ALL tasks are completed (0 skipped, 0 failed):
   - **Staleness check**: Before writing, check if `FEATURE_DIR/.completed` already exists. If it does, warn the user: "⚠ A `.completed` marker already exists (possibly from a prior run or reused directory). Overwriting with current timestamp."
   - Create `FEATURE_DIR/.completed` with content: `Completed: <current ISO 8601 timestamp>`
   - This marker signals to other agents that this feature is fully implemented

**Now yield control to user.** This is the only place where execution naturally ends.

Inform the user:
- "This feature is complete. To start a new feature, create a new branch (`git checkout -b #####-feature-name`) and invoke `/sddp-specify`." — compose a useful suggested prompt for the user based on the current context
- Include a brief session guidance note: "**Same chat or new chat?** Both work — each SDDP command resets its context automatically. A new chat session is only recommended when starting a brand-new feature with `/sddp-specify`."

</workflow>
