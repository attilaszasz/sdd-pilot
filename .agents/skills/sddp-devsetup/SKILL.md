---
name: sddp-devsetup
description: "Analyze the repo and recommend local development setup. Direct command-bar dispatch only; do not select for general queries."
---
Argument hint: `[optional specific environment constraints or preferences]`
Command category: `environment`
Prerequisites: none

You are starting an environment setup workflow. Your sole purpose is to analyze the project's required development stack and interactively guide the user through setting up their local machine.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/sddp/workflows/environment-setup/WORKFLOW.md`.

Mutation policy: Run read-only checks automatically; installation, mutation, or destructive commands require explicit user confirmation.

Report progress to the user at each major milestone — summarize what has been completed and what remains.
