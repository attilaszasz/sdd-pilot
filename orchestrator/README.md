# SDD Orchestrator

This package runs the existing SDD autopilot pipeline across the epics listed in `specs/project-plan.md`.

It is a thin orchestration layer around the Copilot SDK and the repo's existing `/sddp-autopilot` workflow:

- One Copilot session per epic
- Waves processed in dependency order
- `[P]` epics can run in parallel within the same wave
- Completed epics are resumed/skipped by default
- Successful epics are checked off in `specs/project-plan.md`
- Epic success is determined by the presence of `.qc-passed` in the generated feature folder

## What It Does

The orchestrator reads the project-level SDD inputs:

- `specs/prd.md`
- `specs/sad.md`
- `specs/dod.md` (optional)
- `specs/project-plan.md`
- `.github/sddp-config.md`

For each epic in the project plan, it:

1. Creates a fresh Copilot SDK session
2. Sends the epic's `Specify input` text as the prompt
3. Runs the existing autopilot flow inside that session
4. Auto-answers prompts so the run can stay unattended
5. Detects completion by checking for `.qc-passed`
6. Marks the epic complete in the project plan if QC passed

This keeps context isolated at the epic level instead of trying to run the full multi-epic program in one long agent session.

## Prerequisites

- Node.js 18+
- A working local Copilot CLI / SDK environment
- A valid SDD project with these artifacts already present:
  - `specs/prd.md`
  - `specs/sad.md`
  - `specs/project-plan.md`
- Optional but supported:
  - `specs/dod.md`

The orchestrator reads paths from `.github/sddp-config.md` and falls back to the standard files above when needed.

## Install

From the repository root:

```bash
cd orchestrator
npm install
npm run build
```

## Usage

Run from the `orchestrator/` directory after building.

```bash
npm start -- --dry-run
```

Or run the compiled CLI directly:

```bash
node dist/index.js --dry-run
```

If installed as a package executable, the command name is:

```bash
sdd-orchestrate
```

## Common Commands

Print the parsed wave/epic execution plan without running anything:

```bash
npm start -- --dry-run
```

Run all epics with resume mode enabled:

```bash
npm start --
```

Run a single epic:

```bash
npm start -- --epic E001
```

Start from a later wave:

```bash
npm start -- --wave 3
```

Disable parallel execution of `[P]` epics:

```bash
npm start -- --sequential
```

Force re-running already completed epics:

```bash
npm start -- --no-resume
```

Use a different model:

```bash
npm start -- --model gpt-4o
```

Increase per-epic timeout:

```bash
npm start -- --timeout 7200000
```

## CLI Options

- `--model <model>`: model name passed to the Copilot SDK
- `--dry-run`: parse and print the execution plan only
- `--resume` / `--no-resume`: skip or re-run already completed epics
- `--epic <id>`: run only one epic, for example `E001`
- `--wave <number>`: start from a specific wave number
- `--sequential`: disable parallel execution within a wave
- `--timeout <ms>`: per-epic timeout in milliseconds

## How Completion Is Tracked

An epic is treated as complete when the generated feature directory contains `.qc-passed`.

When an epic passes QC, the orchestrator also updates the matching checklist line in `specs/project-plan.md` from `[ ]` to `[X]`.

By default, future runs skip epics that are already complete.

## Output

The orchestrator writes a run log to:

- `orchestrator-log.md` in the repository root

It also prints live progress to the console, including wave boundaries and per-epic outcomes.

## Notes

- This package does not reimplement the SDD phases. It delegates execution to the existing autopilot workflow already defined in this repository.
- Permission requests are auto-approved so unattended runs do not stall.
- User-input prompts are auto-answered with defaults for the same reason.
- If an epic requires manual verification and produces `manual-test.md`, the orchestrator reports that epic as needing manual follow-up instead of marking it complete.