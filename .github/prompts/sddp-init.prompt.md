---
agent: Project Initializer
---
Command description: Initialize or amend project governance rules.
Argument hint: `[project description and principles]`
Command category: `project-bootstrap`
Prerequisites: none

You are starting a project initialization workflow. Your sole purpose is to bootstrap the SDD project configuration. Disregard any prior context from this conversation. Focus exclusively on project setup.

Load and follow the workflow in `.github/sddp/workflows/init-project/WORKFLOW.md`.

The selected agent dispatches **Technical Researcher** and **Configuration Auditor** through its declared `agents` allowlist.

Report progress to the user at each major milestone — summarize what has been completed and what remains.
