# Spec-Driven Development (SDD) — Methodology & Phases

This project follows **Spec-Driven Development** — a structured methodology where every feature moves through a defined lifecycle before implementation begins.

## SDD Lifecycle

```
Specify → Clarify → Plan → Checklist (optional) → Tasks → Analyze (optional) → Implement
```

| Phase | Role | Produces | Gate |
|-------|------|----------|------|
| **Specify** | Product Manager (`@sddp.specify`) | `specs/<feature-folder>/spec.md` | Feature description provided (enriched by product document when available) |
| **Clarify** | Business Analyst (`@sddp.clarify`) | Updated `spec.md` with clarifications | `spec.md` exists |
| **Plan** | Software Architect (`@sddp.plan`) | `plan.md`, `research.md`, `data-model.md` (conditional), `contracts/` (conditional), `quickstart.md` | `spec.md` exists (optionally accepts a tech context document as file input, persisted in `sddp-config.md`) |
| **Checklist (optional)** | QA Engineer (`@sddp.checklist`) | `specs/<feature-folder>/checklists/*.md` | `spec.md` + `plan.md` exist |
| **Tasks** | Project Manager (`@sddp.tasks`) | `tasks.md` | `spec.md` + `plan.md` exist |
| **Analyze (optional)** | Compliance Auditor (`@sddp.analyze`) | Markdown report (no files modified) | `spec.md` + `plan.md` + `tasks.md` exist |
| **Implement** | Software Engineer (`@sddp.implement`) | Source code, marked tasks | `spec.md` + `plan.md` + `tasks.md` exist |

Supporting roles: Project Initializer (`@sddp.init`, one-time project setup), Release Manager (`@sddp.taskstoissues`, GitHub issue creation).

## Agent Role Mapping

Main command routing now targets role-based agent files with deterministic naming.

| Command | Role | Agent File |
|--------|------|------------|
| `@sddp.init` | Project Initializer | `.github/agents/project-initializer.md` |
| `@sddp.specify` | Product Manager | `.github/agents/product-manager.md` |
| `@sddp.clarify` | Business Analyst | `.github/agents/business-analyst.md` |
| `@sddp.plan` | Software Architect | `.github/agents/software-architect.md` |
| `@sddp.checklist` | QA Engineer | `.github/agents/qa-engineer.md` |
| `@sddp.tasks` | Project Manager | `.github/agents/project-manager.md` |
| `@sddp.analyze` | Compliance Auditor | `.github/agents/compliance-auditor.md` |
| `@sddp.implement` | Software Engineer | `.github/agents/software-engineer.md` |
| `@sddp.taskstoissues` | Release Manager | `.github/agents/release-manager.md` |

## Deterministic Prompt Contract

All agent definitions use a strict structure for instruction parsing:

1. `Role`
2. `Task`
3. `Inputs`
4. `Execution Rules`
5. `Output Format`

This structure is used to minimize ambiguity and keep agent behavior consistent across phases.

## Directory Conventions

### Feature Artifacts

Each feature lives under `specs/<feature-folder>/`.

Folder selection rule in the Specify phase (`@sddp.specify`):
- If current branch matches `#####-feature-name`, it uses that branch name as `<feature-folder>`.
- Otherwise, it prompts for `<feature-folder>`.

```
specs/<feature-folder>/
├── spec.md          # Feature specification (user stories, requirements, success criteria)
├── plan.md          # Implementation plan (tech context, architecture, instructions check)
├── tasks.md         # Phased task list (setup → foundational → user stories → polish)
├── research.md      # Technology research and decisions
├── data-model.md    # Entity definitions and relationships (conditional — when spec has data signals)
├── quickstart.md    # Integration scenarios and quick-start guide
├── contracts/       # API contracts (conditional — when spec has API signals)
└── checklists/      # Requirements quality checklists (*.md)
```

### Project Configuration

```
.github/copilot-instructions.md    # Non-negotiable project principles (gates all decisions)
.github/sddp-config.md             # SDD project-level configuration (product document path, tech context document path; managed by @sddp.init and @sddp.plan)
.github/agents/                    # Phase/role prompt definitions (implemented as Copilot agents)
.github/skills/                    # Agent Skills (cross-tool, open standard)
.github/prompts/                   # Slash command routing
.github/instructions/              # Conditional instructions (auto-applied by file pattern)
```

## Project Instructions

The file at `.github/copilot-instructions.md` contains non-negotiable project principles. Run the Initialize phase (`@sddp.init`) once to fill in the placeholder template, or again when principles change. These are checked during planning (`@sddp.plan` runs an Instructions Check) and analysis (`@sddp.analyze` flags violations as CRITICAL).

## Task Format

Tasks in `tasks.md` follow this strict format:

```
- [ ] T### [P?] [US#?] Description with file path
```

- `[P]` = parallelizable (different files, no dependencies)
- `[US#]` = user story reference (maps to spec priorities P1, P2, P3)
- Phases: Setup → Foundational (blocks all stories) → User Stories (by priority) → Polish
- Completion: `- [ ]` → `- [X]` (marked during the Implement phase via `@sddp.implement`)

## Priority System

User stories in `spec.md` are prioritized P1 (most critical) through P3+. Each story must be independently testable — implementing just P1 should yield a viable MVP.

## Key Rules

- **Spec before Plan**: Never plan without a specification
- **Plan before Tasks**: Never decompose without a technical plan
- **Tasks before Implement**: Never implement without a task list
- **Project Instructions are law**: Violations are always CRITICAL severity
- **Checklists gate implementation**: Incomplete checklists block implementation (override available)

