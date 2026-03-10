# SDD Pilot

[![License: MIT](https://img.shields.io/github/license/attilaszasz/sdd-pilot)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/attilaszasz/sdd-pilot)](https://github.com/attilaszasz/sdd-pilot/releases/latest)
[![VS Code](https://img.shields.io/badge/VS%20Code-%E2%89%A5%201.109-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)
[![GitHub Copilot](https://img.shields.io/badge/GitHub%20Copilot-native-8957e5?logo=githubcopilot&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/attilaszasz/sdd-pilot/pulls)

Enhance your AI coding tool with a structured, spec-driven delivery workflow.

SDD Pilot helps you bootstrap project context and deliver features in phases instead of jumping straight to code. You can optionally turn a rough product idea into a canonical PRD, create a reusable system design, initialize project governance, then move through the feature-delivery phases with shared project context already in place.

```mermaid
flowchart LR
   subgraph Bootstrap["Project Bootstrap"]
      B((Bootstrap)) -.-> PRD["Product Strategist (/sddp-prd)"]
      PRD -.-> SA["Solution Architect (/sddp-systemdesign)"]
      B -.-> SA
      SA -.-> Init["Init (Project Initializer)"]
      B --> Init
   end

   Start((Feature Delivery)) --> S["Specify (Product Manager)"]
   S --> P["Plan (Software Architect)"]
   S --> C["Clarify (Business Analyst)"]
   C --> P
   P --> CH["Checklists (QA Engineer)"]
   CH --> T["Tasks (Project Manager)"]
   P --> T
   T --> A["Analyze (Compliance Auditor)"]
   A --> I["Implement (Software Engineer)"]
   T --> I
   I --> Code["Working Code"]
   Code --> QC["QC (Quality Controller)"]
   QC -->|FAIL| I
   QC -->|PASS| Release["Release Ready"]
   T -.->|optional| Loop["Implement+QC Loop"]
   Loop --> Release
   Init --> Start
   Start -.->|"/sddp-autopilot"| Auto["Autopilot (full pipeline)"]
   Auto --> Release
   Release --> Start

   %% Material Design Palette (Weight 700/800 for contrast)
   style PRD fill:#6D4C41,stroke:#3E2723,color:#fff   %% Brown Grey
   style SA fill:#5D4037,stroke:#3E2723,color:#fff    %% Brown
   style Init fill:#512DA8,stroke:#311B92,color:#fff  %% Deep Purple
   style Start fill:#455A64,stroke:#263238,color:#fff %% Blue Grey
   style S fill:#1976D2,stroke:#0D47A1,color:#fff     %% Blue
   style C fill:#F57C00,stroke:#E65100,color:#fff     %% Orange
   style P fill:#00796B,stroke:#004D40,color:#fff     %% Teal
   style CH fill:#7B1FA2,stroke:#4A148C,color:#fff    %% Purple
   style T fill:#D32F2F,stroke:#B71C1C,color:#fff     %% Red
   style A fill:#0288D1,stroke:#01579B,color:#fff     %% Light Blue
   style I fill:#37474F,stroke:#263238,color:#fff     %% Dark Blue Grey
   style Code fill:#388E3C,stroke:#1B5E20,color:#fff  %% Green
   style QC fill:#C62828,stroke:#B71C1C,color:#fff    %% Deep Red
   style Release fill:#2E7D32,stroke:#1B5E20,color:#fff %% Dark Green
   style Loop fill:#6A1B9A,stroke:#4A148C,color:#fff  %% Purple
   style Auto fill:#00695C,stroke:#004D40,color:#fff   %% Dark Teal
```

> **Heritage:** SDD Pilot evolved from [Spec Kit](https://github.com/github/spec-kit) ([0.0.90](https://github.com/github/spec-kit/releases/tag/v0.0.90)).

## What is it

To guide you through [spec-driven development](https://www.linkedin.com/pulse/ai-augmented-spec-driven-development-lifecycle-attila-szász-64e9f/), SDD Pilot gives you:
- A guided phase-by-phase process
- Built-in quality gates (so you do not skip critical steps)
- Structured artifacts under `specs/<feature-folder>/`
- Specialized agents for each phase

> **Compatibility:** SDDP supports **GitHub Copilot**, **Antigravity**, **Windsurf**, **OpenCode**, and **Claude Code**.

## Prerequisites

### GitHub Copilot
- VS Code `1.109.x` or newer
- GitHub Copilot Chat extension installed and enabled
- Active GitHub Copilot access (Free, Pro, or Business)

### Antigravity
- Antigravity coding tool installed

### Windsurf
- Windsurf IDE installed

### OpenCode
- OpenCode IDE or CLI installed

### Claude Code
- Claude Code CLI installed
- Active Anthropic API key or Claude Max subscription

## Model recommendation

You do **not** need the most expensive model tiers for this workflow.

At the time of writing, **GPT-5.3-Codex** is the recommended model for all SDDP phases (`/sddp-prd` through `/sddp-implement`).

## Getting Started

### 1) Add SDD Pilot to your repo

**Option A — Use the GitHub template** (includes files for all tools)

Click **Use this template** on the [SDD Pilot repository](https://github.com/attilaszasz/sdd-pilot) to create a new repo with all files included.

**Option B — Download the release for your AI tool**

1. Go to the [Releases page](https://github.com/attilaszasz/sdd-pilot/releases/latest).
2. Download the archive matching your tool:
   - **GitHub Copilot** → `sdd-pilot-copilot-vX.Y.Z.zip`
   - **Antigravity** → `sdd-pilot-antigravity-vX.Y.Z.zip`
   - **Windsurf** → `sdd-pilot-windsurf-vX.Y.Z.zip`
   - **OpenCode** → `sdd-pilot-opencode-vX.Y.Z.zip`
   - **Claude Code** → `sdd-pilot-claude-code-vX.Y.Z.zip`
3. Extract the contents to the root folder of your project.

### 2) Optional: discover the product and create the canonical PRD (`/sddp-prd`)

Before system design or governance, you can turn a rough product idea into `docs/prd.md`:

```text
/sddp-prd Turn this rough idea into a canonical PRD for a multi-tenant AI workspace that helps consultants capture client context, plan follow-up work, and generate reusable deliverables
```

This creates or refines `docs/prd.md`, registers it in `.github/sddp-config.md` as the **Product Document**, and gives downstream phases a canonical product-grounding document without copy/paste.

`/sddp-prd` is interactive by design: it reads available docs first, asks only high-impact unresolved product questions, delegates external research to the Technical Researcher flow, and uses that research to enrich the PRD with likely users, capability areas, risks, dependencies, and validation ideas you may not have considered. Unconfirmed suggestions stay explicit as out-of-scope items, risks, or open questions rather than becoming a hidden backlog.

### 3) Optional: create the canonical technical context (`/sddp-systemdesign`)

After product discovery and before governance or feature work, you can generate or refine `docs/sad.md`:

```text
/sddp-systemdesign Use the attached PRD, architecture notes, and deployment constraints to create the canonical docs/sad.md
```

This creates or refines `docs/sad.md`, registers it in `.github/sddp-config.md` as the **Technical Context Document**, and makes it reusable by downstream phases without copy/paste.

When a Product Document is registered, `/sddp-systemdesign` uses it as the primary product-grounding input for architecture decisions.

If you already have a similar architecture or technical-context document, `/sddp-systemdesign` reads it first, surfaces conflicts, and can synthesize it into canonical `docs/sad.md`.

Architecture diagrams produced by `/sddp-systemdesign` use **Mermaid C4 syntax** for C4 Level 1–3 views only. Runtime-flow and deployment diagrams use standard Mermaid syntax.

### 4) Initialize project laws (`/sddp-init`)

Before building features, define your non-negotiable rules:

```text
/sddp-init My project is a Node.js monorepo using TypeScript.
Principles:
1. Test-Driven Development is mandatory.
2. All APIs must be RESTful.
3. No direct database access from controllers.
```

This populates `project-instructions.md`, which acts as project governance. Planning and analysis workflows check these rules.

`/sddp-init` preserves or adopts the registered **Product Document** and **Technical Context Document**. If `docs/prd.md` exists, it becomes the default Product Document; if `docs/sad.md` exists, it becomes the default Technical Context Document.

If `/sddp-init` receives a different product document as input, it can keep or replace the registered **Product Document** after confirmation.

After `/sddp-init`, the final handoff guidance checks shared-config autopilot readiness: **Product Document** registered, **Technical Context Document** registered, and `## Autopilot` → `**Enabled**: true` in `.github/sddp-config.md`. If all three are satisfied, init recommends `/sddp-autopilot <feature description>` as the primary next step and generates a concrete feature-description example from the current project context. If any prerequisite is missing, init explains exactly what is missing, points to the correct bootstrap step, and falls back to `/sddp-specify`.

Example (attach/select your product doc when running the command):

```text
/sddp-init Initialize project governance using attached PRD
```

## Project Bootstrap

Use this optional project-level bootstrap flow when you want reusable product and technical baselines before governance and feature delivery:

```text
/sddp-prd → /sddp-systemdesign (optional) → /sddp-init
```

Project bootstrap artifacts live at project level:

```text
docs/prd.md              # Canonical Product Requirements Document / Product Document
docs/sad.md              # Canonical Software Architecture Document / Technical Context Document
project-instructions.md  # Project governance
.github/sddp-config.md   # Shared project context and document registration
```

`/sddp-prd` is interactive by design: it reads the available docs first, asks only high-impact unresolved questions, delegates external research to the Technical Researcher flow, and writes the canonical `docs/prd.md`.

`/sddp-systemdesign` is interactive by design: it reads the available docs first, asks only high-impact unresolved questions, delegates external research to the Technical Researcher flow, and writes the canonical `docs/sad.md`.

## Feature Delivery Lifecycle

Use this flow for each feature:

```text
Specify → Clarify → Plan → Checklist (optional) → Tasks → Analyze (optional) → Implement → QC
```

Copilot command mapping:

```text
/sddp-specify → /sddp-clarify → /sddp-plan → /sddp-checklist (optional) → /sddp-tasks → /sddp-analyze (optional) → /sddp-implement → /sddp-qc
```

Or use the combined loop for the last two phases:

```text
/sddp-specify → /sddp-clarify → /sddp-plan → /sddp-checklist (optional) → /sddp-tasks → /sddp-analyze (optional) → /sddp-implement-qc-loop
```

### Autopilot mode (`/sddp-autopilot`)

Run the entire **feature-delivery** pipeline unattended:

```text
/sddp-autopilot Build user authentication with email/password
```

**Prerequisites:**

- **Autopilot enabled** — set `**Enabled**: true` in `.github/sddp-config.md` under `## Autopilot`
- **Product Document** — registered in `sddp-config.md` (≥ 3/5 content categories). `docs/prd.md` created by `/sddp-prd` is the preferred source.
- **Technical Context Document** — registered in `sddp-config.md` (≥ 3/5 content categories). `docs/sad.md` created by `/sddp-systemdesign` is the preferred source.

**Halt conditions** (pipeline stops immediately when any occur):

1. CRITICAL `project-instructions.md` violation
2. Implement → QC loop exhausted (10 iterations)
3. `manual-test.md` generated (requires human verification)
4. Expected gate artifact missing after a phase
5. Feature already complete (`.qc-passed` exists)
6. Document sufficiency check failure

Every automatic decision is logged to `autopilot-log.md` in the feature folder.

`/sddp-autopilot` does **not** run project bootstrap phases like `/sddp-prd`, `/sddp-systemdesign`, or `/sddp-init`. If product grounding is missing or too thin, run `/sddp-prd` first. If technical context is missing or too thin, run `/sddp-systemdesign` first.

### What each phase produces

#### Project bootstrap phases

| Phase | Role | Produces | Gate |
|-------|------|----------|------|
| **Product Strategist** *(optional)* | Product Strategist | `docs/prd.md`, `.github/sddp-config.md` update | None |
| **Solution Architect** *(optional)* | Solution Architect | `docs/sad.md`, `.github/sddp-config.md` update | None |
| **Init** | Project Initializer | `project-instructions.md`, `.github/sddp-config.md` update | None |

#### Feature-delivery phases

| Phase | Role | Produces | Gate |
|-------|------|----------|------|
| **Specify** | Product Manager | `spec.md` | Feature description provided |
| **Clarify** | Business Analyst | Updated `spec.md` | `spec.md` exists |
| **Plan** | Software Architect | `plan.md`, `research.md`, conditionally `data-model.md`, `contracts/` | `spec.md` exists |
| **Checklist** *(optional)* | QA Engineer | `checklists/*.md` | `spec.md` + `plan.md` exist |
| **Tasks** | Project Manager | `tasks.md` | `spec.md` + `plan.md` exist |
| **Analyze** *(optional)* | Compliance Auditor | Markdown report (no files modified) | `spec.md` + `plan.md` + `tasks.md` exist |
| **Implement** | Software Engineer | Source code, marked tasks | `spec.md` + `plan.md` + `tasks.md` exist |
| **QC** | Quality Controller | `qc-report.md`, `.qc-passed`, conditionally `manual-test.md` | `.completed` marker exists |
| **Implement+QC Loop** *(optional)* | Software Engineer | All implement + QC artifacts | `spec.md` + `plan.md` + `tasks.md` exist |

All artifacts are written to `specs/<feature-folder>/`:

Project-level artifacts live outside feature folders:

```text
docs/prd.md
docs/sad.md
project-instructions.md
.github/sddp-config.md
```

Feature-delivery artifacts are written to `specs/<feature-folder>/`:

```
specs/<feature-folder>/
├── spec.md          # Feature specification (user stories, requirements, success criteria)
├── plan.md          # Implementation plan (tech context, architecture, instructions check)
├── tasks.md         # Phased task list (optional setup → optional foundational → user stories → optional polish)
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

### Agent role mapping

| Command | Role | Shared Skill | Copilot | Antigravity | Windsurf | OpenCode | Claude Code |
|---|---|---|---|---|---|---|---|
| `/sddp-prd` | Product Strategist | `product-document` | `product-strategist.md` | `sddp-prd.md` | `sddp-prd.md` | `sddp-product-strategist.md` | `sddp-prd/SKILL.md` |
| `/sddp-systemdesign` | Solution Architect | `system-design` | `solution-architect.md` | `sddp-systemdesign.md` | `sddp-systemdesign.md` | `sddp-solution-architect.md` | `system-design/SKILL.md` |
| `/sddp-init` | Project Initializer | `init-project` | `project-initializer.md` | `sddp-init.md` | `sddp-init.md` | `sddp-project-initializer.md` | `sddp-init/SKILL.md` |
| `/sddp-specify` | Product Manager | `specify-feature` | `product-manager.md` | `sddp-specify.md` | `sddp-specify.md` | `sddp-product-manager.md` | `sddp-specify/SKILL.md` |
| `/sddp-clarify` | Business Analyst | `clarify-spec` | `business-analyst.md` | `sddp-clarify.md` | `sddp-clarify.md` | `sddp-business-analyst.md` | `sddp-clarify/SKILL.md` |
| `/sddp-plan` | Software Architect | `plan-feature` | `software-architect.md` | `sddp-plan.md` | `sddp-plan.md` | `sddp-software-architect.md` | `sddp-plan/SKILL.md` |
| `/sddp-checklist` | QA Engineer | `generate-checklist` | `qa-engineer.md` | `sddp-checklist.md` | `sddp-checklist.md` | `sddp-qa-engineer.md` | `sddp-checklist/SKILL.md` |
| `/sddp-tasks` | Project Manager | `generate-tasks` | `project-manager.md` | `sddp-tasks.md` | `sddp-tasks.md` | `sddp-project-manager.md` | `sddp-tasks/SKILL.md` |
| `/sddp-analyze` | Compliance Auditor | `analyze-compliance` | `compliance-auditor.md` | `sddp-analyze.md` | `sddp-analyze.md` | `sddp-compliance-auditor.md` | `sddp-analyze/SKILL.md` |
| `/sddp-implement` | Software Engineer | `implement-tasks` | `software-engineer.md` | `sddp-implement.md` | `sddp-implement.md` | `sddp-software-engineer.md` | `sddp-implement/SKILL.md` |
| `/sddp-qc` | Quality Controller | `quality-control` | `qc-agent.md` | `sddp-qc.md` | `sddp-qc.md` | `sddp-qc-agent.md` | `sddp-qc/SKILL.md` |
| `/sddp-implement-qc-loop` | Software Engineer | `implement-qc-loop` | `sddp-implement-qc-loop.prompt.md` | `sddp-implement-qc-loop.md` | `sddp-implement-qc-loop.md` | `sddp-implement-qc-loop.md` | `sddp-implement-qc-loop/SKILL.md` |
| `/sddp-autopilot` | Pipeline Orchestrator | `autopilot-pipeline` | `sddp-autopilot.prompt.md` | `sddp-autopilot.md` | `sddp-autopilot.md` | `sddp-autopilot-pipeline.md` | `sddp-autopilot/SKILL.md` |

- **Shared Skills** live in `.github/skills/<name>/SKILL.md` — tool-agnostic workflow logic
- **Copilot Wrappers** live in `.github/agents/` — tool mapping + sub-agent delegation
- **Antigravity Workflows** live in `.agents/workflows/` — loads shared skill and handles delegation inline
- **Windsurf Workflows** live in `.windsurf/workflows/` — loads shared skill and handles delegation inline
- **OpenCode Agents** live in `.opencode/agents/` — primary agents with sub-agent delegation + commands in `.opencode/commands/`
- **Claude Code Skills** live in `.claude/skills/` — skill entry points with Task-based sub-agent delegation + agents in `.claude/agents/`

The QC phase uses two dedicated sub-agents:
- **QC Auditor** — executes tests, linters, security scans, and collects coverage. Recommends missing tools based on detected tech stack.
- **Story Verifier** — traces user stories and success criteria to implementation code via `{FR-###}` tags. Reports PASSED, PARTIAL, or FAILED per story.

### Deterministic prompt format

Agent files follow the same instruction layout to reduce ambiguity:

1. `Role`
2. `Task`
3. `Inputs`
4. `Execution Rules`
5. `Output Format`

## Feature folder convention

Feature folders are resolved as follows:

- If your current branch matches `#####-feature-name`, the Specify phase (`/sddp-specify`) uses `specs/<current-branch>/`.
- If your branch does not match that pattern, the Specify phase (`/sddp-specify`) prompts you to enter the feature folder name under `specs/` and validates new names in `00001-feature-name` format.

In both cases, artifacts are written to:

```text
specs/<feature-folder>/
```

Examples:

```text
Current branch: 00007-payment-flow
Run Specify phase: /sddp-specify Add one-click checkout
→ Uses specs/00007-payment-flow/
```

```text
Current branch: feature/payment-flow
Run Specify phase: /sddp-specify Add one-click checkout
→ Prompts for feature folder name (for example: 00007-payment-flow)
→ Uses specs/00007-payment-flow/
```

Expected branch pattern:

```text
#####-feature-name
```

Example:

```text
00001-user-auth
```

Feature folder naming policy:

- New feature folders must use `00001-feature-name` format.
- Existing non-prefixed folders are grandfathered and can still be selected when they already exist.

Migration note:

- No bulk rename is required for existing non-prefixed folders.
- Prefix enforcement applies to newly created feature folders.

## Gates (why this flow is reliable)

SDDP enforces order:

- You cannot run planning without `spec.md`
- You cannot generate tasks without `plan.md`
- You cannot implement without `tasks.md`
- You cannot run QC without `.completed` (set by `/sddp-implement` when all tasks pass)
- You cannot mark a feature release-ready without `.qc-passed`
- If QC fails, `.completed` is removed and `[BUG]` tasks are added to `tasks.md`
- Project instructions in `project-instructions.md` are treated as law
- If checklists exist and are incomplete, implementation can be gated

## Understanding `.github/sddp-config.md`

`.github/sddp-config.md` stores project-level context shared across SDDP agents.

Key references:

1. **Product Document path**
   - Used to enrich feature specification context
   - Preferred source: `docs/prd.md` created by `/sddp-prd`
2. **Technical Context Document path**
   - Used by planning and downstream agents for architecture/stack constraints
   - Preferred source: `docs/sad.md` created by `/sddp-systemdesign`
3. **Autopilot setting** (`true` / `false`, default `false`)
   - When enabled, `/sddp-autopilot` runs the full pipeline without user interaction

Important behavior:
- This file is managed by `/sddp-prd`, `/sddp-systemdesign`, `/sddp-init`, and `/sddp-plan`
- If `/sddp-prd` runs successfully, `docs/prd.md` is stored as the **Product Document** path
- If `/sddp-init` runs and `docs/prd.md` exists, it preserves or adopts that file as the **Product Document** path
- If `/sddp-systemdesign` runs successfully, `docs/sad.md` is stored as the **Technical Context Document** path
- If `/sddp-plan` receives a file, that file can also be stored as the **Technical Context Document** path
- When those files are supplied, agents use their content to build `spec.md` and `plan.md`
- Empty paths are normal when starting a new project
- If referenced files are moved or missing, agents continue best-effort and may warn

Example (attach/select your technical context doc when planning):

```text
/sddp-plan Create implementation plan using attached technical context
```

## Typical day-to-day command sequence

1. Optional project bootstrap:
   - `/sddp-prd Turn this rough product idea into a canonical PRD`
   - `/sddp-systemdesign Use the canonical PRD and attached architecture notes to create canonical sad.md`
   - `/sddp-init My project is a Node.js monorepo using TypeScript`
2. Create a feature branch: `git checkout -b 00001-user-auth`
3. Run:
   - `/sddp-specify Build user authentication with email/password`
   - `/sddp-clarify`
   - `/sddp-plan`
   - `/sddp-checklist` (optional but recommended)
   - `/sddp-tasks`
   - `/sddp-analyze` (optional but recommended)
   - `/sddp-implement`
   - `/sddp-qc`

> **QC feedback loop:** If `/sddp-qc` fails, it adds `[BUG]` tasks to `tasks.md` and removes the `.completed` marker.
> Run `/sddp-implement` to fix the bugs, then re-run `/sddp-qc`.
>
> **Automated loop:** Use `/sddp-implement-qc-loop` to combine implement and QC into a single continuous run.
> It loops automatically (up to 10 iterations) until QC passes or a safety limit is reached.

> **Interrupted?** Re-run `/sddp-implement` in a new chat session.
> Completed tasks (marked `[X]` in `tasks.md`) are automatically skipped.

> **Same chat or new chat?** Both work. Each SDDP command resets its context
> automatically — running `/sddp-plan` after `/sddp-specify` in the same chat
> is fine. A new chat session is only recommended for `/sddp-specify` when starting
> a brand-new feature.

> **Full autopilot:** Replace the feature-delivery sequence above with `/sddp-autopilot <description>`.
> Requires Autopilot enabled in `.github/sddp-config.md`, plus a Product Document and Technical Context Document. If you do not already have a strong Product Document, run `/sddp-prd` first. If you do not already have a strong Technical Context Document, run `/sddp-systemdesign` first.

## Troubleshooting

**“Agent not found”**
- Confirm VS Code and Copilot Chat extension are up to date
- Ensure `.github/agents/` exists in the workspace

**“Spec/Plan/Tasks not found”**
- Verify you are on the correct branch
- If branch is non-matching, re-run `/sddp-specify` and provide the intended feature folder name
- Confirm artifacts exist under the selected feature folder in `specs/`

**“No feature branch detected”**
- Check detached HEAD state: `git rev-parse --abbrev-ref HEAD`
- Confirm the active VS Code workspace matches your repository
- If branch remains non-matching, provide feature folder name when prompted by `/sddp-specify`


**Claude Code: "Skill not found"**
- Ensure `.claude/skills/` exists in the workspace root
- Verify `CLAUDE.md` is present at the repo root
- Run `claude` from the project directory (skills are discovered relative to CWD)

## Extra references

- Workflow and lifecycle reference: `AGENTS.md`
- Governance file: `project-instructions.md`
- Shared project context: `.github/sddp-config.md`
- Specs file conventions: `.github/instructions/sddp-specs.instructions.md`

