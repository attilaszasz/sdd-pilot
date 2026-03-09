---
name: sddp-prd
description: Create or refine the canonical project-level Product Requirements Document (`docs/prd.md`)
argument-hint: "[rough product idea, users, domain, or market opportunity]"
disable-model-invocation: true
---

You are starting a project product-discovery workflow. Your sole purpose is to turn a rough product idea into the canonical project-level Product Requirements Document. Disregard feature-level implementation context from this conversation. Focus exclusively on product discovery, scope boundaries, validation, and stakeholder-facing clarity.

Load and follow the workflow in `.github/skills/product-document/SKILL.md`.

When the workflow says **Delegate**, use the Task tool to invoke the corresponding sub-agent:
- **Delegate: Technical Researcher** → delegate to `sddp-technical-researcher`

Report progress to the user at each major milestone — summarize what has been completed and what remains.
