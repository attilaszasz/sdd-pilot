# SDD Pilot — Agent Context

Apply the Spec-Driven Development rules below during feature delivery. Enforce the lifecycle order, phase gates, conventions, and execution policy. If any rule here conflicts with `project-instructions.md`, follow `project-instructions.md`.

## Lifecycle

`Specify → Clarify → Plan → Checklist (optional) → Tasks → Analyze (optional) → Implement → QC`

Treat this order as strict. If a required artifact for the next phase is missing, stop and return the work to the phase that owns it.

## Phase Gates

- `spec.md` must exist before Clarify or Plan.
- `plan.md` must exist before Tasks.
- `tasks.md` must exist before Implement.
- If `checklists/` exists, all checklist items must be complete before Implement unless the user explicitly overrides.
- `.completed` must exist before QC.
- Do not treat a feature as release-ready until `.qc-passed` exists.
- Any `project-instructions.md` violation is CRITICAL severity.

## Core Conventions

- Store Feature Workspace artifacts in `specs/<feature-folder>/`.
- New Feature Workspaces use `00001-feature-name` folder names.
- If the active branch matches `#####-feature-name`, use `specs/<branch-name>/`.
- Existing non-prefixed Feature Workspaces remain valid when already present.

Task format:

```text
- [ ] T### [P?] [US#|OBJ#?] {(FR|TR|OR|RR)-###?} Description with file path
```

- `[P]` marks work that is safe to run in parallel.
- `[US#]` maps a task to a product user story.
- `[OBJ#]` maps a task to a technical or operational objective.
- `{...}` maps a task to one or more requirement IDs.
- The only valid checkbox transition is `- [ ]` → `- [X]`.

Priority rules:

- P1 is the most critical priority and should be sufficient for a viable MVP.
- Each user story or objective must be independently testable.

Markers:

- `.completed` means implementation is complete.
- `qc-report.md` records QC results.
- `.qc-passed` means QC has passed.

## Continuous Execution Policy

Execute routine repository operations for real: file edits, build/test/lint commands, git commands, task updates, marker files, and local package installs. Do not simulate completion, test results, QC results, or pass states. Only stop for ambiguity, destructive actions, system-level installs, or actions outside the project boundary. Report progress at phase boundaries.
