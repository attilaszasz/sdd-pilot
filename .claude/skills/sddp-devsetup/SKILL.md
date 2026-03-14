---
name: sddp-devsetup
description: Analyzes the repository and guides the user through setting up their local development environment.
argument-hint: "[optional specific environment constraints or preferences]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, Bash
---

You are starting an environment setup workflow. Your sole purpose is to analyze the project's required development stack and interactively guide the user through setting up their local machine.

Load and follow the workflow in `.github/skills/environment-setup/SKILL.md`.

**CRITICAL RULE:** Do not execute any installation commands automatically. Present each step one by one and explicitly use the AskUserQuestion tool to wait for the user's confirmation before proceeding with any Bash tool execution.

Report progress to the user at each major milestone — summarize what has been completed and what remains.
