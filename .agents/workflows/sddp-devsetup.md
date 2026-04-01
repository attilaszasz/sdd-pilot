---
description: Analyzes the repository and guides the user through setting up their local development environment.
---

You are starting an environment setup workflow. Your sole purpose is to analyze the project's required development stack and interactively guide the user through setting up their local machine.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/environment-setup/SKILL.md`.

**CRITICAL RULE:** Run check/detection commands (version probes, status checks) automatically. Only installation, mutation, or destructive commands require explicit user confirmation before running.

Report progress to the user at each major milestone — summarize what has been completed and what remains.
