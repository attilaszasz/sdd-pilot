# SDD Pilot — Reference

This document contains detailed reference material for SDD Pilot internals, agent mappings, configuration, and conventions. For an overview and getting started guide, see [README.md](../README.md).

## Artifact Taxonomy

SDD Pilot organizes repository artifacts into five layers:

- **Workspace Control Plane**: repo-root governance and coordination files such as `project-instructions.md`, `.github/sddp-config.md`, `AGENTS.md`, and `CLAUDE.md`
- **Project Context Specs**: canonical product, technical, operational, and planning specs at the root of `specs/`
- **Feature Workspaces**: per-feature delivery artifacts under `specs/<feature-folder>/`
- **Framework Internals**: agent, skill, rule, and wrapper directories such as `.github/agents/`, `.github/skills/`, `.github/instructions/`, `.claude/`, `.agents/`, `.windsurf/`, `.opencode/`, and `.codex/`
- **Runtime and Distribution**: packaging and release assets in `scripts/` and the release workflows

## Project Context Specs

Project bootstrap keeps these canonical specs at the root of `specs/`:

```text
specs/prd.md             # Product Requirements Document / Product Document
specs/sad.md             # Software Architecture Document / Technical Context Document (index + topology)
specs/dod.md             # Deployment & Operations Document
specs/project-plan.md    # Project Implementation Plan
specs/adrs/              # Standalone MADR Architecture Decision Records (source of truth for project-level decisions)
```

`specs/sad.md` is the registered Technical Context Document and serves as a lightweight index: system overview, technical context fields, C4 diagrams, and an ADR catalog table linking to standalone files. Full decision records live exclusively under `specs/adrs/` as MADR files (e.g., `specs/adrs/0001-decision-title.md`). All ADR file mutations flow through the ADR Author subagent (`.github/agents/_adr-author.md`).

## Feature Workspace Structure

Each feature produces artifacts under `specs/<feature-folder>/`:

```
specs/<feature-folder>/
├── spec.md          # Feature specification (user stories, requirements, success criteria)
├── plan.md          # Implementation plan (tech context, architecture, instructions check, acceptance test stubs)
├── tasks.md         # Phased task list (setup → foundational → user stories → polish)
├── research.md      # Technology research and decisions
├── data-model.md    # Entity definitions and relationships (conditional)
├── contracts/       # API contracts (conditional)
├── checklists/      # Requirements quality checklists (*.md)
├── qc-report.md     # Quality control results (test, lint, security, coverage, traceability)
├── manual-test.md   # Manual test script (conditional — when visual/interactive testing needed)
├── .completed       # Implementation complete marker (set by /sddp-implement)
├── autopilot-log.md # Autopilot decision audit log (when autopilot is used)
├── divergence-log.md # Self-healing amendment audit log (set by /sddp-implement when the Developer diverges from plan)
└── .qc-passed       # QC passed marker (set by /sddp-qc)
```

### Acceptance test stubs (P1)

When `plan.md` has a populated `## Acceptance Test Stubs` section, `/sddp-tasks` emits a stub-creation task per P1 requirement as the first task of that requirement's work-item phase, and `/sddp-implement` parses the section into `STUB_MAP` and passes an `AcceptanceStub` input to the Developer. The Developer creates the stub test file in RED state (pending/skip/failing-assertion), then implements the requirement until the linked stub blocks turn GREEN — giving every P1 requirement a per-requirement pass/fail signal during Implement instead of relying on lint/compilation alone. Stub test files live at the `Test File` paths declared in the plan section, following the `## Testing Strategy` Unit tier convention (co-located or `tests/` sibling). Scope is P1 only.

### Requirement self-verification (Step 3.5)

When a task carries a requirement tag (`FR-###`/`TR-###`/`OR-###`/`RR-###`) and `plan.md` has a matching `## Requirement Coverage Map` row, `/sddp-implement` passes an `ExpectedEvidence` input (`{reqID, filePaths, functions}`) to the Developer. After implementing, the Developer greps each expected file for its expected symbol(s) and reports a `requirement-gap` FAILURE on any miss. For reqIDs without an `AcceptanceStub`, the Developer also runs a happy-path test coverage sub-check: it greps conventional test locations (co-located `*.test.*`/`*_test.*` siblings of each expected file plus repo `tests/` and `__tests__/` directories) for the reqID tag or any expected function symbol, and reports `requirement-gap` when no test references the requirement. The happy-path grep is skipped when an `AcceptanceStub` exists for the reqID (the Step 3 GREEN check is authoritative for stubbed P1 requirements), avoiding double-gating. On pass, the Developer Report notes "requirement evidence verified for [reqID(s)]" plus "happy-path test verified for [reqID(s)]" (the happy-path note is omitted when every reqID was stubbed). This couples the per-task definition of done to the spec, not just code health — a stub that compiles and declares the right symbols can no longer pass without a test exercising the requirement.

### Developer confidence scoring

The Developer Report (`_developer.md` Step 4) includes a required `Confidence: CONFIDENT | TENTATIVE | UNCERTAIN` field with a one-line evidence statement on every SUCCESS (omitted on FAILURE, since FAILURE is already the escalation). The level is chosen from the Step 3/3.5/3.7/3.8 outcomes: `CONFIDENT` is the default when all objective checks pass (validation/lint/stub-GREEN, requirement + happy-path evidence, VERIFY assertions, export contracts when `Exports` present); `TENTATIVE` when objective checks pass but the agent is unsure the behavior is correct; `UNCERTAIN` when the agent doubts the implementation is correct. `/sddp-implement` parses the field and auto-escalates without user interaction: CONFIDENT is accepted as-is; TENTATIVE is marked complete, gets extra orchestrator verification (re-run the task's test file, verify `→ exports:` against `contracts/` when present), and is added to `TENTATIVE_TASKS` — no Developer retry; UNCERTAIN is routed into the existing On FAILURE error-recovery loop with the one-line uncertainty evidence appended to `PriorAttempts` so the retry gets richer context (a second UNCERTAIN follows the existing second-failure path). At the Step 6 final summary, `TENTATIVE_TASKS` are listed and written to `FEATURE_DIR/.review-findings` as QC priority-review checks, so low-confidence completions surface to QC automatically instead of passing silently. This is orthogonal to #31's objective `requirement-gap` check: #31 catches missing evidence, #33 captures subjective uncertainty — a task can pass every objective check and still be TENTATIVE or UNCERTAIN.

### Export contract verification (Step 3.8)

The `→ exports: Symbol(params)` annotations in `tasks.md` create an implicit contract between a producer task and its downstream consumers. Before #32, nothing verified this contract at task-completion time — a consumer's import error would surface phases later as a cryptic failure, with no trace-back to the producer. Now the Developer runs Section 3.8 after Section 3.7 for every task with a non-empty `exports` array, catching a broken export at the producer before any consumer depends on it. Three sub-checks per declared `Symbol(params)`: **existence** (grep the declared `FilePath` for the symbol declaration; for JS/TS require an `export` keyword so a symbol declared but not exported fails); **importability** (stack-aware one-liner — `python -c "from <module> import <Symbol>"` for Python, `node --input-type=module -e "import('<module>').then(…)"` for JS ESM, `tsc --noEmit` on a scratch import / `tsx`/`ts-node` for TypeScript, `go build ./<pkg>` for Go, `cargo check` for Rust, project build/typecheck for other compiled languages); **signature match** (parse the declared parameter count from `Symbol(params)` and compare against the actual declaration — param count only for untyped stacks, param count + return type for typed stacks where the actual return type is statically determinable). The first failure is `errorType: export-contract` and routes into the existing per-task error-recovery loop. On pass, the Developer Report notes "export contracts verified for [symbol(s)]" and the Step 4 CONFIDENT guidance counts Section 3.8 among its objective checks.

When a consumer task fails with `errorType: import` or `export-contract`, `/sddp-implement` applies a **consumer→producer trace-back** before retrying the consumer: it inspects the failing task's `imports[]` for a `sourceTask` referencing a producer, re-runs the producer's Section 3.8 check for the imported symbol, and — if the producer fails — fixes the producer first, marks it `[X]`, and only then retries the consumer. This avoids wasting a consumer retry on an intact consumer with a broken producer, and generalizes the existing parallel-batch trace-back rule to sequential tasks. When the task has no resolvable producer (no `imports[]`, `sourceTask == "plan"`, or the producer is already `[X]` and confirmed), trace-back is skipped and normal auto-fix + retry proceeds. Phase Review step 5 (behavioral spot-check) and Micro-QC export/contract conformance remain as safety nets; Section 3.8 is the early-warning per-task layer.

### Task VERIFY annotations

Tasks may carry one or more `[VERIFY: <command>]` annotations — machine-checkable acceptance assertions the Developer runs from the repo root before marking the task `[X]`. `/sddp-tasks` auto-emits them when a deterministic check is derivable: a `plan.md` `## Testing Strategy` test command scoped to the task's file/requirement, a `grep` for an `→ exports:` symbol declaration, or a build/typecheck targeting the task's file. `/sddp-implement` parses them via the Task Tracker (`task.verify`) and passes a `Verify` array to the Developer; the first non-zero exit (or no-match for `grep`) is `errorType: verify-failure` and routes into the existing per-task error-recovery loop (analyze output, fix, retry once). `/sddp-analyze` flags malformed annotations (empty / contains a literal `]`) as LOW. Lines with `[VERIFY:]` may extend to 300 characters (200 otherwise); commands MUST NOT contain a literal `]`.

## Phase Artifacts

### Project bootstrap phases

| Phase | Command | Produces | Gate |
|-------|---------|----------|------|
| **Product Strategist** | `/sddp-prd` | `specs/prd.md`, config update | None |
| **Solution Architect** | `/sddp-systemdesign` | `specs/sad.md`, `specs/adrs/*.md`, config update | None |
| **DevOps Strategist** | `/sddp-devops` | `specs/dod.md`, config update | None |
| **Project Planner** | `/sddp-projectplan` | `specs/project-plan.md`, config update | None |
| **Project Amender** | `/sddp-amend` | Coordinated bootstrap artifact updates, config-preserving inline workflow execution | `project-instructions.md` + PRD + SAD + project plan exist; DOD optional |
| **Project Initializer** | `/sddp-init` | `project-instructions.md`, config update | None |
| **Prototype Retrospective Analyst** | `/sddp-regen` | Archived prototype (`prototype/`), retrospective (`specs/prototype-retrospective.md`), and regenerated canonical documents | `prototype/` must not exist; completed epics exist |

### Feature-delivery phases

| Phase | Command | Produces | Gate |
|-------|---------|----------|------|
| **Specify** | `/sddp-specify` | `spec.md` | Feature description provided |
| **Clarify** | `/sddp-clarify` | Updated `spec.md` (clarifications + stress-test findings) | `spec.md` exists |
| **Plan** | `/sddp-plan` | `plan.md`, `research.md`, conditionally `data-model.md`, `contracts/` | `spec.md` exists + **Spec Validator** PASS (≤3 unresolved markers, concrete P1 acceptance criteria, frontmatter complete) |
| **Checklist** *(optional)* | `/sddp-checklist` | `checklists/*.md` | `spec.md` + `plan.md` exist |
| **Tasks** | `/sddp-tasks` | `tasks.md` | `spec.md` + `plan.md` exist + **Plan Validator** PASS (100% P1 coverage in Requirement Coverage Map, no orphaned Architecture Decisions, declared dependencies installable) |
| **Analyze** *(optional)* | `/sddp-analyze` | Markdown report (no files modified) | `spec.md` + `plan.md` + `tasks.md` exist |
| **Implement** | `/sddp-implement` | Source code, marked tasks | `spec.md` + `plan.md` + `tasks.md` exist + **Tasks Validator** PASS (every P1 req has ≥1 task, no circular `after:` chains, `tasks.md` ≤ 6 KB, valid phase structure) |
| **QC** | `/sddp-qc` | `qc-report.md`, `.qc-passed`, conditionally `manual-test.md` | `.completed` marker exists |
| **Implement+QC Loop** *(optional)* | `/sddp-implement-qc-loop` | All implement + QC artifacts | `spec.md` + `plan.md` + `tasks.md` exist |

### Phase-Boundary Validators

Three phase boundaries run a mandatory structural validator (in addition to the artifact-exists check) before the next phase may start. A FAIL blocks the next phase: in autopilot the pipeline halts; interactively the user may override with "Proceed anyway" (the bypass is recorded in the conversation only — no persistent marker is written). Each validator is a read-only sub-agent that returns a PASS/FAIL verdict with a failing-items table.

- **Spec → Plan** — `/sddp-plan` Step 1.6 delegates the Spec Validator (`_spec-validator.md`) against `spec.md`: enforces ≤3 unresolved `[NEEDS CLARIFICATION]` markers, concrete acceptance criteria for every P1 user story or objective, and frontmatter completeness (`spec_type`, `spec_maturity`).
- **Plan → Tasks** — `/sddp-tasks` Step 1.5 delegates the Plan Validator (`_plan-validator.md`) against `plan.md` (with `spec.md` for P1 IDs): enforces 100% P1 requirement coverage in the Requirement Coverage Map (every P1 `FR/TR/OR/RR` row has non-empty `File Path(s)` and `Function(s)/Symbol(s)`), no orphaned Architecture Decisions (every `AD-###` is referenced by a coverage-map row or marked `N/A`), and all declared dependencies installable (runs the package-manager installability check for real).
- **Tasks → Implement** — `/sddp-implement` (via `references/gates.md`) delegates the Tasks Validator (`_tasks-validator.md`) against `tasks.md` (with `spec.md` for P1 IDs): enforces every P1 requirement has ≥1 task, no circular `after:T###` chains (static graph cycle check), `tasks.md` ≤ 6 KB, and valid phase structure (Setup → Foundational → Delivery → Polish, no empty optional phases, unique sequential `T###` IDs).

The Analyze phase remains optional and is not made mandatory by a gate bypass in this revision.

## Agent Role Mapping

| Command | Role | Shared Skill | Copilot | Antigravity | Windsurf | OpenCode | Codex | Claude Code |
|---|---|---|---|---|---|---|---|---|
| `/sddp-prd` | Product Strategist | `product-document` | `product-strategist.md` | `sddp-prd.md` | `sddp-prd.md` | `sddp-product-strategist.md` | `sddp-prd/SKILL.md` | `sddp-prd/SKILL.md` |
| `/sddp-systemdesign` | Solution Architect | `system-design` | `solution-architect.md` | `sddp-systemdesign.md` | `sddp-systemdesign.md` | `sddp-solution-architect.md` | `sddp-systemdesign/SKILL.md` | `system-design/SKILL.md` |
| `/sddp-devops` | DevOps Strategist | `deployment-operations` | `devops-strategist.md` | `sddp-devops.md` | `sddp-devops.md` | `sddp-devops-strategist.md` | `sddp-devops/SKILL.md` | `deployment-operations/SKILL.md` |
| `/sddp-projectplan` | Project Planner | `project-planning` | `project-planner.md` | `sddp-projectplan.md` | `sddp-projectplan.md` | `sddp-project-planner.md` | `sddp-projectplan/SKILL.md` | `project-planning/SKILL.md` |
| `/sddp-amend` | Project Amender | `amend-project` | `project-amender.md` | `sddp-amend.md` | `sddp-amend.md` | `sddp-project-amender.md` | `sddp-amend/SKILL.md` | `sddp-amend/SKILL.md` |
| `/sddp-init` | Project Initializer | `init-project` | `project-initializer.md` | `sddp-init.md` | `sddp-init.md` | `sddp-project-initializer.md` | `sddp-init/SKILL.md` | `sddp-init/SKILL.md` |
| `/sddp-regen` | Prototype Retrospective Analyst | `prototype-regen` | `prototype-retrospective-analyst.md` | `sddp-regen.md` | `sddp-regen.md` | `sddp-prototype-retrospective-analyst.md` | `sddp-regen/SKILL.md` | `sddp-regen/SKILL.md` |
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

- **Shared Runtime Output Contract** lives in `AGENTS.md` §Communication Style — shared terse-communication rules, exact-preservation boundaries, and auto-clarity exceptions used by workflow skills and sub-agents. The original `.github/skills/compact-communication/SKILL.md` is kept as a deprecation shim.
- **Shared Markdown Compression Contract** lives in `.github/skills/markdown-compression/SKILL.md` — allowlist, blocked targets, validation guarantees, and CLI usage for safe narrative-markdown compression.
- **Shared Skills** live in `.github/skills/<name>/SKILL.md` — tool-agnostic workflow logic
- **Copilot Wrappers** live in `.github/agents/` — tool mapping + sub-agent delegation
- **Antigravity Workflows** live in `.agents/workflows/` — loads shared skill and handles delegation inline
- **Windsurf Workflows** live in `.windsurf/workflows/` — loads shared skill and handles delegation inline
- **OpenCode Agents** live in `.opencode/agents/` — primary agents with sub-agent delegation + commands in `.opencode/commands/`
- **Codex Skills** live in `.agents/skills/` — Codex-native skill entry points with inline delegation + custom agents in `.codex/agents/`. Interactive Codex wrappers explicitly ask in chat and wait for user answers instead of inferring the recommended option.
- **Claude Code Skills** live in `.claude/skills/` — skill entry points with Task-based sub-agent delegation + agents in `.claude/agents/`

### Markdown Compression Utility

- `scripts/compress-markdown.mjs` — CLI for safe narrative-markdown compression. Supports `--check`, `--stdout`, and in-place rewrite with one-time `.original.md` backup.
- `scripts/lib/markdown-compression.mjs` — allowlist policy, deterministic compaction, and validation helpers.
- Safe targets: `README.md`, `docs/**/*.md`, `specs/<feature>/research.md`, `specs/<feature>/analysis-report.md`, `specs/<feature>/manual-test.md`.
- Blocked targets: project instructions, workspace control-plane docs, workflow/instruction Markdown, project-level specs, ADRs, and parser-sensitive feature artifacts such as `spec.md`, `plan.md`, `tasks.md`, `qc-report.md`, `checklists/*.md`, and `autopilot-log.md`.

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
