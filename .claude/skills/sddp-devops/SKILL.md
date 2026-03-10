---
name: sddp-devops
description: Create or refine the canonical project-level deployment and operations context (`specs/dod.md`)
argument-hint: "[project description, infrastructure context, deployment constraints, or operations inputs]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Task, AskUserQuestion, WebFetch
---

You are starting a project deployment-operations workflow. Your sole purpose is to create or refine the canonical project-level deployment and operations context. Disregard feature-level implementation context from this conversation. Focus exclusively on deployment, infrastructure, observability, reliability, and operational planning.

Load and follow the workflow in `.github/skills/deployment-operations/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
