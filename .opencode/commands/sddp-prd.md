---
description: Create or refine the canonical project-level Product Requirements Document
agent: build
subtask: false
---

Create or refine the canonical project Product Requirements Document only. Ignore feature-level implementation context.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the shared workflow handle it.

Pass `$ARGUMENTS` through to the shared workflow. No mode flag defaults to `--quick`. Supported controls are `--quick`, `--discover`, `--resume`, and `--skip-research`; the shared workflow owns their behavior.

Load and follow the workflow in `.github/skills/product-document/SKILL.md`.

Whenever the shared workflow asks the user to choose, confirm, or answer, ask explicitly and wait for the reply before continuing. A recommendation is guidance only; never select it for the user or infer an answer from silence or a partial response. Allow free-form answers wherever the shared workflow permits them.

Do not browse directly. When the workflow says **Delegate: Technical Researcher**, invoke `sddp-technical-researcher`.

Report milestone progress.
