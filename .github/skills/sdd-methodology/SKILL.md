---
name: sdd-methodology
description: "Guides agents through the Spec-Driven Development (SDD) lifecycle: specification authoring, technical planning, task decomposition, and implementation execution. Use when working on features that follow a structured development process, when creating specs, plans, or tasks, when the user mentions SDD, spec-driven, specification workflow, or when gating rules between phases need enforcement."
---

# Spec-Driven Development Methodology

## Lifecycle Phases

SDD enforces a strict phase order. Each phase produces artifacts that gate the next:

1. **Specify** — Capture WHAT users need and WHY. Output: `spec.md`
2. **Clarify** — Reduce ambiguity via targeted questions. Output: updated `spec.md`
3. **Plan** — Design HOW to build it. Output: `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`
4. **Tasks** — Decompose into actionable work items. Output: `tasks.md`
5. **Implement** — Execute tasks phase-by-phase. Output: source code + marked tasks

### Phase Gating Rules

- **Specify → Clarify**: `spec.md` must exist
- **Clarify → Plan**: `spec.md` must exist (clarify is optional but recommended)
- **Plan → Tasks**: `spec.md` + `plan.md` must exist
- **Tasks → Implement**: `spec.md` + `plan.md` + `tasks.md` must exist
- **Implement**: All checklists in `checklists/` must pass (or user explicitly overrides)
- **Checklist**: After generation, the `sddp.Checklist.Evaluator` auto-evaluates items against artifacts, resolves gaps, and asks the user about ambiguous items

If a required artifact is missing, stop and direct the user to the correct prior phase.

## Feature Directory Convention

Every feature's artifacts live at `specs/<branch-name>/` where `<branch-name>` is the current git branch (pattern: `#####-feature-name`, e.g., `00001-user-auth`).

Detect the branch via: `git rev-parse --abbrev-ref HEAD`

Standard layout:
```
specs/<branch>/
├── spec.md, plan.md, tasks.md
├── research.md, data-model.md, quickstart.md
├── contracts/
└── checklists/
```

## Project Instructions

The file `.github/copilot-instructions.md` contains non-negotiable project principles.

- **During Planning**: Run an Instructions Check — verify the plan aligns with every principle
- **During Analysis**: Project instructions violations are always CRITICAL severity
- **Project instructions changes**: Must go through `@sddp.init` with semantic versioning
- Project instructions supersede all other practices

## Quality Philosophy: "Unit Tests for English"

Checklists validate the QUALITY of requirements, not implementation behavior:
- ✅ "Are error handling requirements defined for all API failure modes?"
- ❌ "Verify the API returns proper error codes"

See [references/quality-dimensions.md](references/quality-dimensions.md) for the full quality framework.

## Priority System

User stories in specs use priorities P1 (most critical) through P3+:
- Each story must be **independently testable** — implementing just P1 yields a viable MVP
- Prioritize clarifications by impact: scope > security/privacy > UX > technical details
- Maximum 3 `[NEEDS CLARIFICATION]` markers in any spec

## Task Format

```
- [ ] T### [P?] [US#?] Description with file path
```

- `[P]` = parallelizable (different files, no dependencies)
- `[US#]` = user story reference
- Phases: Setup → Foundational (blocks all) → User Stories (by priority) → Polish
- Mark completed: `- [ ]` → `- [X]`
