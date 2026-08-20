---
name: sddp-prd
description: "[Command entry-point - invokes shared `product-document` skill] Direct command-bar dispatch only; do not select for general queries."
---

Create or refine the canonical project Product Requirements Document only. Ignore feature-level implementation context.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the shared workflow handle it.

Pass `$ARGUMENTS` through to the shared workflow. No mode flag defaults to `--quick`. Supported controls are `--quick`, `--discover`, `--resume`, and `--skip-research`; the shared workflow owns their behavior.

Load and follow the workflow in `.github/skills/product-document/SKILL.md`.

When the shared workflow asks the user to choose, confirm, or answer:
- Ask the user explicitly in chat and wait for the reply before continuing.
- Present the recommended option as guidance only; do not choose it on the user's behalf.
- Allow free-form answers anywhere the shared workflow allows them.
- Do not infer an answer from silence, a partial response, or prior recommendations.

Do not browse ad hoc. Only when the workflow says **Delegate: Technical Researcher**, read `.github/agents/_technical-researcher.md` at that point and perform only that delegated step.

Report milestone progress.
