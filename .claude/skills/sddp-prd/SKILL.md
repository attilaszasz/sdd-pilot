---
name: sddp-prd
description: Create or refine the canonical project-level Product Requirements Document (`specs/prd.md`)
argument-hint: "[rough product idea, users, domain, or market opportunity]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task, AskUserQuestion, WebFetch
---

Create or refine the canonical project Product Requirements Document only. Ignore feature-level implementation context.

## Input and controls
`$ARGUMENTS` = The user's message provided alongside this command invocation. If no message was provided, set `$ARGUMENTS` to empty and let the shared workflow handle it.

Pass `$ARGUMENTS` through to the shared workflow. No mode flag defaults to `--quick`. Supported controls are `--quick`, `--discover`, `--resume`, and `--skip-research`; the shared workflow owns their behavior.

Load and follow the workflow in `.github/skills/product-document/SKILL.md`.

Whenever the shared workflow asks the user to choose, confirm, or answer, ask explicitly and wait for the reply before continuing. A recommendation is guidance only; never select it for the user or infer an answer from silence or a partial response. Allow free-form answers wherever the shared workflow permits them.

Delegate external research only when the workflow says **Delegate**, using the Task tool:
- **Delegate: Technical Researcher** → `sddp-technical-researcher` via Task

Report milestone progress.
