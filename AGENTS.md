# SDD Pilot — Agent Context

Apply the Spec-Driven Development rules below during feature delivery. Enforce the lifecycle order, phase gates, conventions, and execution policy. If any rule here conflicts with `project-instructions.md`, follow `project-instructions.md`.

## Lifecycle

`Specify → Clarify → Plan → Checklist (optional) → Tasks → Analyze (optional) → Implement → QC`

Treat this order as strict. If a required artifact for the next phase is missing, stop and return the work to the phase that owns it.

## Phase Gates

Each phase boundary runs a mandatory structural validator before the next phase may start. A FAIL blocks the next phase: in autopilot the pipeline halts; interactively the user may override with "Proceed anyway" (the bypass is recorded in the conversation only — no persistent marker is written).

- `spec.md` must exist before Clarify or Plan.
- **Spec → Plan gate**: `/sddp-plan` delegates the **Spec Validator** (`_spec-validator.md`) — enforces ≤3 unresolved `[NEEDS CLARIFICATION]` markers, concrete acceptance criteria for all P1 stories, and frontmatter completeness. FAIL blocks Plan.
- `plan.md` must exist before Tasks.
- **Plan → Tasks gate**: `/sddp-tasks` delegates the **Plan Validator** (`_plan-validator.md`) — enforces 100% P1 requirement coverage in the Requirement Coverage Map, no orphaned Architecture Decisions, and all declared dependencies installable. FAIL blocks Tasks.
- `tasks.md` must exist before Implement.
- **Tasks → Implement gate**: `/sddp-implement` (via `references/gates.md`) delegates the **Tasks Validator** (`_tasks-validator.md`) — enforces every P1 requirement has ≥1 task, no circular `after:` chains, `tasks.md` ≤ 6 KB, and valid phase structure. FAIL blocks Implement.
- If `checklists/` exists, all checklist items must be complete before Implement unless the user explicitly overrides.
- `.completed` must exist before QC.
- Do not treat a feature as release-ready until `.qc-passed` exists.
- Any `project-instructions.md` violation is CRITICAL severity.

## Core Conventions

- Store Feature Workspace artifacts in `specs/<feature-folder>/`.
- New Feature Workspaces use `00001-feature-name` folder names.
- If the active branch matches `#####-feature-name`, use `specs/<branch-name>/`.
- Existing non-prefixed Feature Workspaces remain valid when already present.
- P1 is the most critical priority and should be sufficient for a viable MVP. Each user story or objective must be independently testable.

Markers:

- `.completed` means implementation is complete.
- `qc-report.md` records QC results.
- `.qc-passed` means QC has passed.

Artifact preservation, format grammars (task / requirement / success-criterion / checklist / bug-task / stress-test-finding), and section rules live in `.github/skills/artifact-conventions/SKILL.md`. Do not duplicate them here.

## Communication Style

Follow `project-instructions.md` section IV (Agent Output Style). That section is authoritative; do not duplicate or paraphrase its rules elsewhere.

Runtime communication from any skill or sub-agent MUST also follow the contract below. These rules are ambient — they apply without re-reading any file.

### Default Rules

- Lead with outcome, verdict, or delta.
- Prefer short sentences, fragments, and flat bullets.
- Report only changed state, counts, blockers, and next action.
- Do not restate workflow steps unless status changed.
- Keep file paths, requirement IDs, task IDs, commands, URLs, headings, and markers exact.
- Keep fenced code blocks and inline code exact.
- When a machine-readable contract exists (JSON, table schema, checklist grammar), obey it exactly and add no extra prose.

### Preferred Output Patterns

- Progress update: done, issue, next.
- Validation or audit: PASS/FAIL first, then only failing or risky items.
- Research: recommendation, avoid, sources.
- Review finding: location, severity, problem, fix.
- Summary: counts, deltas, blockers, next step.

### Auto-Clarity

Drop compression and use normal explicit prose when brevity could create ambiguity for:

- security warnings
- destructive or irreversible actions
- ordered multi-step instructions
- user questions showing confusion or repetition
- policy, compliance, or safety-sensitive nuance

Resume compact mode after the risky section is clear.

### Boundaries

- Never compress or mutate artifact grammars, IDs, checkbox state, or required section headers.
- For parser-sensitive files under `specs/`, write concise normal prose; do not rewrite them into stylized shorthand.
- Readability beats maximum compression for persisted artifacts.
- For allowlisted narrative Markdown, prefer validator-backed compression via `.github/skills/markdown-compression/SKILL.md` instead of ad hoc rewrites.

## Continuous Execution Policy

Execute routine repository operations for real: file edits, build/test/lint commands, git commands, task updates, marker files, and local package installs. Do not simulate completion, test results, QC results, or pass states. Stop only for ambiguity, destructive actions, system-level installs, or actions outside the project boundary. Report progress at phase boundaries.
