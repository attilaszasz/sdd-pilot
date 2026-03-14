---
name: environment-setup
description: "Analyzes the project repository and guides the user through setting up their local development environment. Use when running /sddp-devsetup."
---

# Onboarding & Environment Setup Analyst — Setup Workflow

<rules>
- This is an **onboarding and environment setup** phase. It helps a developer configure their local machine to run the project.
- Work at the project level.
- Read available inputs first: `README.md`, `project-instructions.md`, `specs/sad.md`, `specs/dod.md`.
- Search for and analyze package manager files (e.g., `package.json`, `requirements.txt`, `Gemfile`, `pom.xml`, `build.gradle`), `Dockerfile`, `docker-compose.yml`, and other configuration files.
- Determine the required development stack: programming languages, versions, package managers, databases, and other tools.
- Provide a comprehensive, step-by-step guide to setting up the local environment based on the analysis.
- Provide the CLI commands required to install each tool for the user's specific OS.
- **CRITICAL CONSTRAINT:** You MUST NOT execute any installation commands automatically.
- You must present each installation step one at a time.
- For each tool, explain what needs to be installed, show the command, and explicitly ask the user: "Would you like me to run this command for you? (y/n)".
- Wait for the user's explicit confirmation before proceeding to the next tool.
</rules>

<workflow>

## 1. Read Available Inputs First

Read project-level baselines when present:
- `README.md`
- `project-instructions.md`
- `specs/sad.md`
- `specs/dod.md`

Search for and read standard configuration and dependency files to understand the stack:
- `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `requirements.txt`, `Pipfile`, `pyproject.toml`
- `Gemfile`
- `pom.xml`, `build.gradle`
- `go.mod`
- `Dockerfile`, `docker-compose.yml`
- `.nvmrc`, `.ruby-version`, `.python-version`

Summarize the discovered inputs and determine the exact stack required.

## 2. Formulate Setup Strategy

Based on the analysis, create a mental list of the exact tools, programming languages, versions, and frameworks that need to be installed.

**Check what is already installed:**
For each tool required, run a non-destructive version or help command (e.g., `node -v`, `git --version`, `docker --version`, `brew --version`) to see if it is already present on the user's system.

1. Summarize to the user which tools were detected as already installed.
2. Filter the setup list to include **only** the missing tools or tools with significantly outdated versions.
3. Determine the exact CLI commands required to install each missing tool for the user's specific operating system.

## 3. Interactive Execution

Present the setup guide to the user **one step at a time** for each missing tool.

For each step:
1. Explain what needs to be installed and why (based on the project analysis).
2. Show the exact CLI command to perform the installation.
3. Explicitly ask the user: "Would you like me to run this command for you? (y/n)"
4. **STOP and wait for the user's response.**
5. If the user answers 'y' or yes, execute the command (or ask them to run it if you cannot), wait for it to complete successfully, and then proceed to the next step.
6. If the user answers 'n' or no, acknowledge and ask if they want to proceed to the next step or if they will handle it manually.

**Do not present the next step until the current step is resolved.**
**Do not execute any command without explicit confirmation.**

## 4. Final Review

Once all steps are completed, verify that the project can be built or started locally (e.g., suggest running `npm start`, `docker-compose up`, or the equivalent command) to confirm the setup was successful. Ask the user if they want to test the setup.

</workflow>
