# SDD Pilot — Agent Context

This project uses **Spec-Driven Development**. Every feature moves through ordered phases before implementation begins.

## Phase Order (strict)

```
Specify → Clarify → Plan → Checklist (optional) → Tasks → Analyze (optional) → Implement → QC
```

**Gates — these are enforced, not suggested:**
- Never plan without `spec.md`
- Never generate tasks without `plan.md`
- Never implement without `tasks.md`
- Never mark a feature release-ready without `.qc-passed`
- `project-instructions.md` violations are always CRITICAL severity
- If checklists exist and any items are incomplete, implementation is blocked (override available)

## Conventions

### Feature folder naming
- New folders **must** use `00001-feature-name` format (5-digit prefix)
- Branch name `#####-feature-name` auto-resolves to `specs/<branch-name>/`

### Task format in `tasks.md`
```
- [ ] T### [P?] [US#?] {FR-###?} Description with file path
```
- `[P]` = parallelizable (safe to run in parallel with other `[P]` tasks)
- `[US#]` = maps to spec user story priorities P1, P2, P3
- `{FR-###}` = links task to functional requirement(s) from spec (e.g., `{FR-001}` or `{FR-001,FR-003}`)
- Phase order: Setup → Foundational → User Stories (by priority) → Polish
- Mark done: `- [ ]` → `- [X]`

### Priority system
- P1 = most critical, P1 alone should yield a viable MVP
- Each user story must be independently testable

### Project instructions (`project-instructions.md`)
- This is the **highest authority** in the SDD process
- Managed exclusively by `/sddp-init`

### QC artifacts
- `.completed` — set by `/sddp-implement` when all tasks are done
- `.qc-passed` — set by `/sddp-qc` when all quality checks pass
- `qc-report.md` — detailed results from the QC run
- `manual-test.md` — generated when manual verification is needed

### Implement + QC Loop (`/sddp-implement-qc-loop`)
- Optional convenience command — combines `/sddp-implement` and `/sddp-qc` into a single continuous run
- Loops: implement → QC → (if QC fails) implement bug fixes → QC → … until QC passes
- Safety limit: **10 iterations** — halts and reports if QC hasn't passed after 10 cycles
- Early halt triggers: user-chosen halt, `manual-test.md` generated, catastrophic implement failure, CRITICAL PI-only violations
- Does **not** change the phase order or gating rules — it orchestrates the existing sub-skills

### Architecture pattern
- Workflow logic lives in `.github/skills/<name>/SKILL.md` (tool-agnostic)
- Tool-specific wrappers load these skills — don't duplicate logic in wrappers

## Continuous Execution Policy

Execute all routine operations (file I/O, build/test/lint commands, git, task checkboxes, marker files, local package installs) **without pausing**. Only confirm: ambiguous requirements, system-level installs, destructive ops, or actions outside the project. Report at phase boundaries only.
