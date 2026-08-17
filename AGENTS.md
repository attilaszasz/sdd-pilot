# SDD Pilot — Agent Context

Apply the Spec-Driven Development rules below during feature delivery. Enforce the lifecycle order, phase gates, conventions, and execution policy. If any rule here conflicts with `project-instructions.md`, follow `project-instructions.md`.

## Lifecycle

`Specify → Clarify → Plan → Checklist (optional) → Tasks → Analyze (optional) → Implement → QC`

Treat this order as strict. If a required artifact for the next phase is missing, stop and return the work to the phase that owns it.

## Phase Gates

Each phase boundary runs a mandatory structural validator before the next phase may start. A FAIL blocks the next phase: in autopilot the pipeline halts; interactively the user may override with "Proceed anyway" (the bypass is recorded in the conversation only — no persistent marker is written).

- `spec.md` must exist before Clarify or Plan.
- **Spec → Plan gate**: `/sddp-plan` delegates the **Spec Validator** (`_spec-validator.md`) — allows 0–3 unresolved `[NEEDS CLARIFICATION: ...]` markers and fails at 4+, independently fails any unresolved CRITICAL/HIGH stress-test finding, and enforces concrete acceptance criteria for all P1 stories and frontmatter completeness. FAIL blocks Plan.
- `plan.md` must exist before Tasks.
- **Plan → Tasks gate**: `/sddp-tasks` delegates the **Plan Validator** (`_plan-validator.md`) — enforces 100% P1 requirement coverage in the Requirement Coverage Map, no orphaned Architecture Decisions, and all declared dependencies installable. FAIL blocks Tasks.
- `tasks.md` must exist before Implement.
- **Tasks → Implement gate**: `/sddp-implement` (via `references/gates.md`) delegates the **Tasks Validator** (`_tasks-validator.md`) — enforces complete task parsing, ≤40 tasks, every P1 requirement has ≥1 task, no circular `after:` chains, `tasks.md` ≤ 6 KB, valid phase structure, and semantic reconciliation of checked task provenance against current spec/plan requirements, coverage, imports/exports, and dependencies. FAIL blocks Implement.
- If `checklists/` exists, all checklist items must be complete before Implement unless the user explicitly overrides.
- `.completed` must exist before QC.
- Do not treat a feature as release-ready until `.qc-passed` exists and its report/evidence SHA-256 digests validate.
- Any `project-instructions.md` violation is CRITICAL severity.

## Core Conventions

- Store Feature Workspace artifacts in `specs/<feature-folder>/`.
- New Feature Workspaces use `00001-feature-name` folder names.
- If the active branch matches `#####-feature-name`, use `specs/<branch-name>/`.
- Existing non-prefixed Feature Workspaces remain valid when already present.
- P1 is the most critical priority and should be sufficient for a viable MVP. Each user story or objective must be independently testable.

Markers:

- `.completed` means implementation is complete with no unresolved CRITICAL/ERROR bugs.
- `qc-report.md` records QC results.
- `.qc-passed` means current QC has passed only when its report/evidence SHA-256 digests validate; pending manual verification and deferred CRITICAL/ERROR bugs block it.

## Artifact Conventions

The rules below are the ambient runtime primer for feature artifacts. The expanded canonical reference is `.github/skills/artifact-conventions/SKILL.md`; read it only for rationale, exceptions, or remediation details not covered here. `scripts/drift-report.mjs --strict` checks that this primer retains the required contract sentinels.

These rules apply to `specs/<feature-folder>/` feature artifacts and standalone ADRs under `specs/adrs/`. They do not apply to project context specs such as `specs/prd.md`, `specs/sad.md`, `specs/dod.md`, `specs/project-plan.md`, or epic detail files under `specs/plan/`.

### Preservation

- Do not reorder product story or non-product objective priorities (`P1`, `P2`, `P3`) without explicit user approval.
- Do not change `T###`, `CHK###`, `FR-###`, `TR-###`, `OR-###`, `RR-###`, `SC-###`, `AD-###`, `ADR-NNNN`, or `STF-###` IDs.
- Do not rename, renumber, or delete standalone ADR files; do not write them outside the ADR Author subagent.
- `[VERIFY: <command>]` text is executable and may be corrected; it is not a cross-referenced ID.
- Resolve `[NEEDS CLARIFICATION]` only with user-approved answers.
- Feature reruns default to refinement: preserve existing IDs, checkbox lines/state, phase headers, checklist paths, BUG history, and downstream references. Autopilot never authorizes destructive regeneration.
- Destructive regeneration is an interactive-only migration: require explicit user approval, snapshot affected artifacts, provide a complete old-ID → new-ID mapping, update every downstream reference atomically, and validate that no checked line or unmapped ID was lost. Otherwise halt without writes.

### Checkbox State

- The only valid implementation transition is `- [ ]` → `- [X]`.
- Never reverse `- [X]` → `- [ ]` or delete a checkbox line without explicit user approval.

### Format Grammars

- Task: `- [ ] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} [COMPLETES req?] Description [after:T###?] [← T###:Symbol?] [→ exports: Symbol?] [VERIFY: <command>]?*`
- Requirement: `- **(FR|TR|OR|RR)-###** [US#|OBJ#]: ...` (owner determines priority)
- Success criterion: `SC-### [US#|OBJ#]: [Measurable, technology-agnostic outcome]`
- Checklist item: `- [ ] CHK### <question> [Quality Dimension, Spec §X.Y]`
- Bug task: `- [ ] T### [BUG:severity] [RECURRING?] [ESCALATED?] [DEFERRED?] {(FR|TR|OR|RR)-###} [category] Description — file:line`
- Stress-test finding: `STF-###: [Category] (Severity) — Affected: [IDs] — [summary]`
- Bug severities are `CRITICAL` | `ERROR` | `WARNING`; categories are `test-failure` | `lint-error` | `security-vuln` | `coverage-gap` | `requirement-gap` | `pi-violation` | `runtime-error`.

### Required Structure

- `spec.md`: honor `spec_type` (default `product`), keep its type-specific mandatory top-level sections, and do not add unauthorized top-level sections.
- Product specs require `Problem Statement`, `Scope`, `User Scenarios & Testing`, `Requirements`, `Assumptions & Risks`, `Implementation Signals`, and `Success Criteria`; technical specs use `Technical Objectives` and `Integration Points`; operational specs use `Operational Objectives` and `Integration Points`.
- `plan.md`: preserve `Instructions Check`, `Technical Context`, `Requirement Coverage Map`, and `Acceptance Test Stubs`; populate coverage paths and symbols. Size limit: ≤ **10KB**.
- `tasks.md`: preserve `Dependencies` and existing phase headers. Size limit: ≤ **6KB** and 40 tasks.
- Checklist files: preserve `CHK###` IDs and quality-dimension tags.
- Checklist output paths are immutable. Every new checklist uses a unique path; never overwrite an existing checklist file.
- `qc-report.md` is generated only by `/sddp-qc`; `.completed` and `.qc-passed` are managed only by `/sddp-implement` and `/sddp-qc`.
- `divergence-log.md` and `autopilot-log.md` are append-only; self-healing artifact edits are limited to `/sddp-implement`.

Violations are **CRITICAL** for changed cross-referenced IDs, unauthorized priority changes, removed required sections, or ADR file mutations; **HIGH** for ADR writes outside the ADR Author, removed clarification markers, or reversed checkboxes; **MEDIUM** for unauthorized spec sections or format deviations.

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
