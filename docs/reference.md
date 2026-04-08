# SDD Pilot — Reference

This document contains detailed reference material for SDD Pilot internals, agent mappings, configuration, and conventions. For an overview and getting started guide, see [README.md](../README.md).

## Artifact Taxonomy

SDD Pilot organizes repository artifacts into five layers:

- **Workspace Control Plane**: repo-root governance and coordination files such as `project-instructions.md`, `.github/sddp-config.md`, `AGENTS.md`, `GEMINI.md`, and `CLAUDE.md`
- **Project Context Specs**: canonical product, technical, operational, and planning specs at the root of `specs/`
- **Feature Workspaces**: per-feature delivery artifacts under `specs/<feature-folder>/`
- **Framework Internals**: agent, skill, rule, and wrapper directories such as `.github/agents/`, `.github/skills/`, `.github/instructions/`, `.claude/`, `.agents/`, `.windsurf/`, `.opencode/`, and `.codex/`
- **Runtime and Distribution**: packaging and release assets in `scripts/`, `gemini-extension/`, and the release workflows

## Project Context Specs

Project bootstrap keeps these canonical specs at the root of `specs/`:

```text
specs/prd.md             # Product Requirements Document / Product Document
specs/sad.md             # Software Architecture Document / Technical Context Document
specs/dod.md             # Deployment & Operations Document
specs/project-plan.md    # Project Implementation Plan
```

## Feature Workspace Structure

Each feature produces artifacts under `specs/<feature-folder>/`:

```
specs/<feature-folder>/
├── spec.md          # Feature specification (user stories, requirements, success criteria)
├── plan.md          # Implementation plan (tech context, architecture, instructions check)
├── tasks.md         # Phased task list (setup → foundational → user stories → polish)
├── research.md      # Technology research and decisions
├── data-model.md    # Entity definitions and relationships (conditional)
├── contracts/       # API contracts (conditional)
├── checklists/      # Requirements quality checklists (*.md)
├── qc-report.md     # Quality control results (test, lint, security, coverage, traceability)
├── manual-test.md   # Manual test script (conditional — when visual/interactive testing needed)
├── .completed       # Implementation complete marker (set by /sddp-implement)
├── autopilot-log.md # Autopilot decision audit log (when autopilot is used)
└── .qc-passed       # QC passed marker (set by /sddp-qc)
```

## Phase Artifacts

### Project bootstrap phases

| Phase | Command | Produces | Gate |
|-------|---------|----------|------|
| **Product Strategist** | `/sddp-prd` | `specs/prd.md`, config update | None |
| **Solution Architect** | `/sddp-systemdesign` | `specs/sad.md`, config update | None |
| **DevOps Strategist** | `/sddp-devops` | `specs/dod.md`, config update | None |
| **Project Planner** | `/sddp-projectplan` | `specs/project-plan.md`, config update | None |
| **Project Amender** | `/sddp-amend` | Coordinated bootstrap artifact updates, config-preserving inline workflow execution | `project-instructions.md` + PRD + SAD + project plan exist; DOD optional |
| **Project Initializer** | `/sddp-init` | `project-instructions.md`, config update | None |

### Feature-delivery phases

| Phase | Command | Produces | Gate |
|-------|---------|----------|------|
| **Specify** | `/sddp-specify` | `spec.md` | Feature description provided |
| **Clarify** | `/sddp-clarify` | Updated `spec.md` (clarifications + stress-test findings) | `spec.md` exists |
| **Plan** | `/sddp-plan` | `plan.md`, `research.md`, conditionally `data-model.md`, `contracts/` | `spec.md` exists |
| **Checklist** *(optional)* | `/sddp-checklist` | `checklists/*.md` | `spec.md` + `plan.md` exist |
| **Tasks** | `/sddp-tasks` | `tasks.md` | `spec.md` + `plan.md` exist |
| **Analyze** *(optional)* | `/sddp-analyze` | Markdown report (no files modified) | `spec.md` + `plan.md` + `tasks.md` exist |
| **Implement** | `/sddp-implement` | Source code, marked tasks | `spec.md` + `plan.md` + `tasks.md` exist |
| **QC** | `/sddp-qc` | `qc-report.md`, `.qc-passed`, conditionally `manual-test.md` | `.completed` marker exists |
| **Implement+QC Loop** *(optional)* | `/sddp-implement-qc-loop` | All implement + QC artifacts | `spec.md` + `plan.md` + `tasks.md` exist |

## Agent Role Mapping

| Command | Role | Shared Skill | Copilot | Antigravity | Windsurf | OpenCode | Codex | Claude Code |
|---|---|---|---|---|---|---|---|---|
| `/sddp-prd` | Product Strategist | `product-document` | `product-strategist.md` | `sddp-prd.md` | `sddp-prd.md` | `sddp-product-strategist.md` | `sddp-prd/SKILL.md` | `sddp-prd/SKILL.md` |
| `/sddp-systemdesign` | Solution Architect | `system-design` | `solution-architect.md` | `sddp-systemdesign.md` | `sddp-systemdesign.md` | `sddp-solution-architect.md` | `sddp-systemdesign/SKILL.md` | `system-design/SKILL.md` |
| `/sddp-devops` | DevOps Strategist | `deployment-operations` | `devops-strategist.md` | `sddp-devops.md` | `sddp-devops.md` | `sddp-devops-strategist.md` | `sddp-devops/SKILL.md` | `deployment-operations/SKILL.md` |
| `/sddp-projectplan` | Project Planner | `project-planning` | `project-planner.md` | `sddp-projectplan.md` | `sddp-projectplan.md` | `sddp-project-planner.md` | `sddp-projectplan/SKILL.md` | `project-planning/SKILL.md` |
| `/sddp-amend` | Project Amender | `amend-project` | `project-amender.md` | `sddp-amend.md` | `sddp-amend.md` | `sddp-project-amender.md` | `sddp-amend/SKILL.md` | `sddp-amend/SKILL.md` |
| `/sddp-init` | Project Initializer | `init-project` | `project-initializer.md` | `sddp-init.md` | `sddp-init.md` | `sddp-project-initializer.md` | `sddp-init/SKILL.md` | `sddp-init/SKILL.md` |
| `/sddp-specify` | Product Manager | `specify-feature` | `product-manager.md` | `sddp-specify.md` | `sddp-specify.md` | `sddp-product-manager.md` | `sddp-specify/SKILL.md` | `sddp-specify/SKILL.md` |
| `/sddp-clarify` | Business Analyst | `clarify-spec` | `business-analyst.md` | `sddp-clarify.md` | `sddp-clarify.md` | `sddp-business-analyst.md` | `sddp-clarify/SKILL.md` | `sddp-clarify/SKILL.md` |
| `/sddp-plan` | Software Architect | `plan-feature` | `software-architect.md` | `sddp-plan.md` | `sddp-plan.md` | `sddp-software-architect.md` | `sddp-plan/SKILL.md` | `sddp-plan/SKILL.md` |
| `/sddp-checklist` | QA Engineer | `generate-checklist` | `qa-engineer.md` | `sddp-checklist.md` | `sddp-checklist.md` | `sddp-qa-engineer.md` | `sddp-checklist/SKILL.md` | `sddp-checklist/SKILL.md` |
| `/sddp-tasks` | Project Manager | `generate-tasks` | `project-manager.md` | `sddp-tasks.md` | `sddp-tasks.md` | `sddp-project-manager.md` | `sddp-tasks/SKILL.md` | `sddp-tasks/SKILL.md` |
| `/sddp-analyze` | Compliance Auditor | `analyze-compliance` | `compliance-auditor.md` | `sddp-analyze.md` | `sddp-analyze.md` | `sddp-compliance-auditor.md` | `sddp-analyze/SKILL.md` | `sddp-analyze/SKILL.md` |
| `/sddp-implement` | Software Engineer | `implement-tasks` | `software-engineer.md` | `sddp-implement.md` | `sddp-implement.md` | `sddp-software-engineer.md` | `sddp-implement/SKILL.md` | `sddp-implement/SKILL.md` |
| `/sddp-qc` | Quality Controller | `quality-control` | `qc-agent.md` | `sddp-qc.md` | `sddp-qc.md` | `sddp-qc-agent.md` | `sddp-qc/SKILL.md` | `sddp-qc/SKILL.md` |
| `/sddp-implement-qc-loop` | Software Engineer | `implement-qc-loop` | `sddp-implement-qc-loop.prompt.md` | `sddp-implement-qc-loop.md` | `sddp-implement-qc-loop.md` | `sddp-implement-qc-loop.md` | `sddp-implement-qc-loop/SKILL.md` | `sddp-implement-qc-loop/SKILL.md` |
| `/sddp-devsetup` | Environment Setup Analyst | `environment-setup` | `environment-setup.md` | `sddp-devsetup.md` | `sddp-devsetup.md` | `sddp-devsetup.md` | `sddp-devsetup/SKILL.md` | `sddp-devsetup/SKILL.md` |
| `/sddp-autopilot` | Autopilot Runner | `autopilot-pipeline` | `sddp-autopilot.prompt.md` | `sddp-autopilot.md` | `sddp-autopilot.md` | `sddp-autopilot-pipeline.md` | `sddp-autopilot/SKILL.md` | `sddp-autopilot/SKILL.md` |

### Framework Internals by tool

- **Shared Skills** live in `.github/skills/<name>/SKILL.md` — tool-agnostic workflow logic
- **Copilot Wrappers** live in `.github/agents/` — tool mapping + sub-agent delegation
- **Antigravity Workflows** live in `.agents/workflows/` — loads shared skill and handles delegation inline
- **Windsurf Workflows** live in `.windsurf/workflows/` — loads shared skill and handles delegation inline
- **OpenCode Agents** live in `.opencode/agents/` — primary agents with sub-agent delegation + commands in `.opencode/commands/`
- **Codex Skills** live in `.agents/skills/` — Codex-native skill entry points with inline delegation + custom agents in `.codex/agents/`. Interactive Codex wrappers explicitly ask in chat and wait for user answers instead of inferring the recommended option.
- **Claude Code Skills** live in `.claude/skills/` — skill entry points with Task-based sub-agent delegation + agents in `.claude/agents/`

### Prompt-contract review aids

- `.github/skills/task-generation/assets/tasks-annotation-fixture.md` — minimal annotated `tasks.md` sample for parser and dependency dry-runs
- `.github/skills/implement-tasks/references/dry-run-review-checklist.md` — review checklist for task-format and implement-contract changes

### QC sub-agents

- **QC Auditor** — executes tests, linters, security scans, and collects coverage. Recommends missing tools based on detected tech stack.
- **Story Verifier** — traces user stories and success criteria to implementation code via `{FR-###}` tags. Reports PASSED, PARTIAL, or FAILED per story.

### Clarify sub-agents

- **Adversarial Scanner** — scans a resolved spec for cross-requirement contradictions, constraint impossibilities, concurrent-trigger ambiguity, and boundary/scale stress. Returns ranked `STF-###` findings. Delegated by `/sddp-clarify` after collaborative clarification.

### Deterministic prompt format

Agent files follow the same instruction layout to reduce ambiguity:

1. `Role`
2. `Task`
3. `Inputs`
4. `Execution Rules`
5. `Output Format`

## Feature Workspace Convention

Feature Workspaces are resolved as follows:

- If your current branch matches `#####-feature-name`, the Specify phase uses `specs/<current-branch>/`.
- If a git repository is active but your branch does not match that pattern, the Specify phase prompts you to enter the Feature Workspace name under `specs/` and validates new names in `00001-feature-name` format.
- If no git repository is active, the Specify phase derives a suggested folder name from your feature description and prompts you to confirm or override it.
- If git is in detached HEAD, the workflow stops and tells you to fix the repository state before running it again.

### Resolution examples

```text
Current branch: 00007-payment-flow
/sddp-specify Add one-click checkout
→ Uses specs/00007-payment-flow/
```

```text
Current branch: feature/payment-flow
/sddp-specify Add one-click checkout
→ Prompts for Feature Workspace name (e.g. 00007-payment-flow)
→ Uses specs/00007-payment-flow/
```

```text
No active git repo
/sddp-specify Add one-click checkout
→ Suggests 00007-add-one-click-checkout
→ Uses specs/00007-add-one-click-checkout/ after confirmation
```

### Naming policy

- New Feature Workspaces must use `00001-feature-name` format.
- Existing non-prefixed Feature Workspaces are grandfathered and remain valid.
- No bulk rename is required for existing non-prefixed folders.

## Understanding `.github/sddp-config.md`

`.github/sddp-config.md` stores document registration and pipeline settings shared across SDDP agents.

| Setting | Purpose | Preferred source |
|---------|---------|-----------------|
| **Product Document** | Enriches feature specification context | `specs/prd.md` via `/sddp-prd` |
| **Technical Context Document** | Architecture/stack constraints for planning | `specs/sad.md` via `/sddp-systemdesign` |
| **Deployment & Operations Document** | Environments, CI/CD, infrastructure context | `specs/dod.md` via `/sddp-devops` |
| **Project Plan** | Maps project epics to `/sddp-specify` inputs | `specs/project-plan.md` via `/sddp-projectplan` |
| **Autopilot** (`true`/`false`) | Enables `/sddp-autopilot` unattended pipeline | Set manually |
| **Derived QC Policy** | Pre-parsed coverage target and required QC categories | Auto-generated by `/sddp-init` from `project-instructions.md` |

This file is managed by `/sddp-prd`, `/sddp-systemdesign`, `/sddp-devops`, `/sddp-projectplan`, `/sddp-amend`, `/sddp-init`, and `/sddp-plan`. When referenced files are supplied, agents use their content to build `spec.md` and `plan.md`. Empty paths are normal when starting a new project. If referenced files are moved or missing, agents continue best-effort and may warn.

For Codex wrappers, interactive workflows rely on explicit wrapper instructions to ask and wait. `/sddp-autopilot` remains the dedicated unattended Codex workflow.

## Autopilot Halt Conditions

The autopilot pipeline stops immediately when any of these conditions occur:

1. CRITICAL `project-instructions.md` violation
2. Implement → QC loop exhausted (10 iterations)
3. `manual-test.md` generated (requires human verification)
4. Expected gate artifact missing after a phase
5. Feature already complete (`.qc-passed` exists)
6. Document sufficiency check failure
7. Real execution blocked (required implementation or QC action could not be completed for real)
8. Context resolution failure (detached HEAD or repository error prevented feature directory resolution)

Every automatic decision is logged to `autopilot-log.md` in the active Feature Workspace.
