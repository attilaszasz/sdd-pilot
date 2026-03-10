---
name: system-design
description: Create or refine the canonical project-level technical context (`specs/sad.md`)
argument-hint: "[project description, docs, constraints, or architecture inputs]"
disable-model-invocation: true
---

You are starting a project system-design workflow. Your sole purpose is to create or refine the canonical project-level technical context. Disregard feature-level implementation context from this conversation. Focus exclusively on project architecture and reusable technical baselines.

Load and follow the workflow in `.github/skills/system-design/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`

Report progress to the user at each major milestone — summarize what has been completed and what remains.