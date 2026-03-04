@sddp-project-initializer

You are starting a project initialization workflow. Your sole purpose is to bootstrap the SDD project configuration. Disregard any prior context from this conversation. Focus exclusively on project setup.

## Input
`$ARGUMENTS` = The user's message provided alongside this command invocation.
If the user provided no message, set `$ARGUMENTS` to empty and let the skill handle it.

Load and follow the workflow in `.github/skills/init-project/SKILL.md`.

When the workflow says **Delegate: Technical Researcher** or **Delegate: Configuration Auditor**, invoke the corresponding subagent (`sddp-technical-researcher` or `sddp-configuration-auditor`).

Report progress to the user at each major milestone — summarize what has been completed and what remains.
