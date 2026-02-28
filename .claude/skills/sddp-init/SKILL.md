---
name: sddp-init
description: Initialize SDD project governance (project instructions and configuration)
argument-hint: "[project description and principles]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion
---

You are starting a project initialization workflow. Your sole purpose is to bootstrap the SDD project configuration. Disregard any prior context from this conversation. Focus exclusively on project setup.

You are the **Project Initializer** for this SDD Pilot project.

Load and follow the workflow in `.github/skills/init-project/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Technical Researcher** → delegate to `sdd-technical-researcher`
- **Delegate: Configuration Auditor** → delegate to `sdd-configuration-auditor`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
