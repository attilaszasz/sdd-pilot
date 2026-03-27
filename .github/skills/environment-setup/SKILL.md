---
name: environment-setup
description: "Analyzes the project repository and guides the user through setting up their local development environment. Use when running /sddp-devsetup."
---

# Onboarding & Environment Setup Analyst — Setup Workflow

<rules>
- Onboarding and environment setup phase. Helps configure local machine to run the project.
- Work at project level.
- Read available inputs first: `README.md`, `project-instructions.md`, `specs/sad.md`, `specs/dod.md`.
- Search/analyze package manager files (`package.json`, `requirements.txt`, `Gemfile`, `pom.xml`, `build.gradle`), `Dockerfile`, `docker-compose.yml`, and other config files.
- Determine required dev stack: languages, versions, package managers, databases, tools.
- **CRITICAL:** For each tool, first run a check command (e.g. `node -v`) to verify if installed. Already installed and meets requirements → DO NOT offer to install again.
- Provide step-by-step local setup guide based on analysis.
- Provide CLI commands for each missing tool for user's specific OS.
- **CRITICAL:** NEVER execute installation commands automatically.
- Present each step one at a time.
- For each tool: explain what needs installing, show command, ask "Would you like me to run this command for you? (y/n)".
- Wait for explicit confirmation before proceeding to next tool.
</rules>

<workflow>

## 1. Read Available Inputs First

Read when present: `README.md`, `project-instructions.md`, `specs/sad.md`, `specs/dod.md`.

Search for and read dependency/config files:
- `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `requirements.txt`, `Pipfile`, `pyproject.toml`
- `Gemfile`, `pom.xml`, `build.gradle`, `go.mod`
- `Dockerfile`, `docker-compose.yml`
- `.nvmrc`, `.ruby-version`, `.python-version`

Summarize discovered inputs; determine exact stack required.

## 2. Formulate Setup Strategy

Build list of required tools, languages, versions, frameworks.

For each required tool → run non-destructive version/help command (`node -v`, `git --version`, `docker --version`, `brew --version`) to check presence. Do not skip.

1. Summarize which tools detected as already installed
2. Filter list to missing tools or significantly outdated versions only
3. Determine exact CLI install commands for user's OS

## 3. Interactive Execution

Present setup guide one step at a time for each missing tool.

Per step:
1. Explain what needs installing (based on project analysis)
2. Show exact CLI command
3. Ask: "Would you like me to run this command for you? (y/n)"
4. **STOP and wait for response**
5. User says yes → execute, wait for completion, proceed to next step
6. User says no → acknowledge, ask if they want next step or will handle manually

Do not present next step until current step resolved. Do not execute without confirmation.

## 4. Final Review

All steps complete → suggest running build/start command (`npm start`, `docker-compose up`, or equivalent) to confirm setup. Ask user if they want to test.

</workflow>
