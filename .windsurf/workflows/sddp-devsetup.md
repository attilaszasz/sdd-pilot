You are starting an environment setup workflow. Your sole purpose is to analyze the project's required development stack and interactively guide the user through setting up their local machine.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/environment-setup/SKILL.md`.

**CRITICAL RULE:** Do not execute any installation commands automatically. Present each step one by one and explicitly wait for the user's confirmation before proceeding.

Report compact progress at each major milestone — done, issues, next.
